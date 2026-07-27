"""과업지시서 관리 서비스."""

from __future__ import annotations

from datetime import datetime
from pathlib import Path

import structlog
from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import TaskOrder
from app.schemas.task_order import ParsedResultUpdate, TaskOrderResponse, TaskOrderSummary
from app.services.object_storage import (
    ObjectStorageError,
    delete_task_order_file,
    read_task_order_file,
    save_task_order_file,
)

logger = structlog.get_logger()


async def upload_task_order(
    db: AsyncSession, file: UploadFile, user_id: str
) -> TaskOrderResponse:
    """과업지시서를 업로드하고 파싱합니다."""
    content = await file.read()
    file_name = Path(file.filename or "unknown").name or "document"
    file_ext = Path(file_name).suffix.lower()

    # 파일 저장
    try:
        saved_path = await save_task_order_file(content, file_name, file.content_type)
    except ObjectStorageError as error:
        logger.exception("file_storage_failed", file_name=file_name)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The original file could not be stored",
        ) from error

    logger.info("file_saved", file_name=file_name, size=len(content), path=saved_path)

    # 파싱 시도 (AI Agent 기반, 타임아웃 30초)
    qualifications_data: list[dict] = []
    evaluation_data: list[dict] = []
    overview_data: dict = {}
    raw_text: str | None = None
    parsed_at: datetime | None = None

    try:
        import asyncio
        from app.services.ai_agent import extract_overview_context, parse_document_with_ai

        try:
            ai_result = await asyncio.wait_for(
                parse_document_with_ai(content, file_name),
                timeout=90.0
            )
            raw_text = ai_result.get("raw_text", "")
            qualifications_data = ai_result.get("qualifications", [])
            evaluation_data = ai_result.get("evaluation_criteria", [])
            overview_data = ai_result.get("overview", {})
            if parse_error := ai_result.get("parse_error"):
                logger.warning("document_parse_unavailable", file_name=file_name, reason=parse_error)
        except asyncio.TimeoutError:
            logger.warning("ai_parsing_timeout", file_name=file_name)
            # 타임아웃 시 기본 파서로 폴백
            try:
                from matching_core import parse_and_extract
                from dataclasses import asdict
                requirements = parse_and_extract(content, file_name)
                raw_text = requirements.raw_text
                qualifications_data = [asdict(q) for q in requirements.qualifications]
                evaluation_data = [asdict(e) for e in requirements.evaluation_criteria]
                overview_data = extract_overview_context(raw_text)
            except:
                pass

        if qualifications_data or evaluation_data or overview_data or raw_text:
            parsed_at = datetime.utcnow()

        logger.info(
            "document_parsed",
            qualifications=len(qualifications_data),
            criteria=len(evaluation_data),
        )
    except Exception as e:
        logger.warning("parse_failed", error=str(e), file_name=file_name)
        # 파싱 실패해도 레코드는 생성 (parsed_at = None)

    # DB 저장
    task_order = TaskOrder(
        file_name=file_name,
        file_path=saved_path,
        file_type=file_ext.lstrip("."),
        raw_text=raw_text,
        qualifications=qualifications_data,
        evaluation_criteria=evaluation_data,
        overview=overview_data,
        parsed_at=parsed_at,
        uploaded_by=user_id,
    )
    db.add(task_order)
    await db.flush()

    return TaskOrderResponse.model_validate(task_order)


async def reparse_task_order(db: AsyncSession, task_order_id: str) -> TaskOrderResponse:
    """Retry extraction while retaining the current overview contract."""
    task_order = await db.get(TaskOrder, task_order_id)
    if not task_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task order was not found")

    import asyncio
    from app.services.ai_agent import parse_document_with_ai

    try:
        content = await read_task_order_file(task_order.file_path)
        result = await asyncio.wait_for(
            parse_document_with_ai(content, task_order.file_name), timeout=120.0
        )
    except ObjectStorageError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The original uploaded file is unavailable",
        ) from error
    except asyncio.TimeoutError as error:
        raise HTTPException(status_code=status.HTTP_408_REQUEST_TIMEOUT, detail="Parsing timed out") from error

    task_order.raw_text = result.get("raw_text", "")
    task_order.qualifications = result.get("qualifications", [])
    task_order.evaluation_criteria = result.get("evaluation_criteria", [])
    task_order.overview = result.get("overview") or task_order.overview or {}
    if task_order.raw_text or task_order.qualifications or task_order.evaluation_criteria or task_order.overview:
        task_order.parsed_at = datetime.utcnow()
    await db.flush()
    return TaskOrderResponse.model_validate(task_order)


async def get_task_order(db: AsyncSession, task_order_id: str) -> TaskOrderResponse:
    """과업지시서 상세 정보를 조회합니다."""
    task_order = await db.get(TaskOrder, task_order_id)
    if not task_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="과업지시서를 찾을 수 없습니다.")
    return TaskOrderResponse.model_validate(task_order)


async def delete_task_order(db: AsyncSession, task_order_id: str) -> None:
    """Remove the task-order record and its original file when available."""
    task_order = await db.get(TaskOrder, task_order_id)
    if not task_order:
        return

    try:
        await delete_task_order_file(task_order.file_path)
    except ObjectStorageError:
        # A stale DB record should still be removable if its object was already
        # removed outside the application.
        logger.warning("task_order_file_delete_failed", task_order_id=task_order_id)
    await db.delete(task_order)


async def list_task_orders(
    db: AsyncSession, offset: int = 0, limit: int = 20
) -> tuple[list[TaskOrderSummary], int]:
    """과업지시서 목록을 조회합니다."""
    from sqlalchemy import func

    count_result = await db.execute(select(func.count(TaskOrder.id)))
    total = count_result.scalar() or 0

    result = await db.execute(
        select(TaskOrder).order_by(TaskOrder.created_at.desc()).offset(offset).limit(limit)
    )
    task_orders = result.scalars().all()
    return [TaskOrderSummary.model_validate(to) for to in task_orders], total


async def update_parsed_result(
    db: AsyncSession, task_order_id: str, data: ParsedResultUpdate
) -> TaskOrderResponse:
    """파싱 결과를 수정합니다."""
    task_order = await db.get(TaskOrder, task_order_id)
    if not task_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="과업지시서를 찾을 수 없습니다.")

    task_order.qualifications = data.qualifications
    task_order.evaluation_criteria = data.evaluation_criteria
    if data.overview is not None:
        task_order.overview = data.overview
    await db.flush()

    return TaskOrderResponse.model_validate(task_order)
