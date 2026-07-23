"""과업지시서 관리 서비스."""

from __future__ import annotations

import os
import uuid
from dataclasses import asdict
from datetime import datetime
from pathlib import Path

import structlog
from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.models import TaskOrder
from app.schemas.task_order import ParsedResultUpdate, TaskOrderResponse, TaskOrderSummary

logger = structlog.get_logger()


async def upload_task_order(
    db: AsyncSession, file: UploadFile, user_id: str
) -> TaskOrderResponse:
    """과업지시서를 업로드하고 파싱합니다."""
    content = await file.read()
    file_name = file.filename or "unknown"
    file_ext = Path(file_name).suffix.lower()

    # 파일 저장
    save_dir = Path(settings.UPLOAD_DIR) / datetime.now().strftime("%Y/%m")
    save_dir.mkdir(parents=True, exist_ok=True)
    saved_name = f"{uuid.uuid4()}_{file_name}"
    save_path = save_dir / saved_name

    with open(save_path, "wb") as f:
        f.write(content)

    logger.info("file_saved", file_name=file_name, size=len(content))

    # 파싱 시도 (AI Agent 기반, 타임아웃 30초)
    qualifications_data: list[dict] = []
    evaluation_data: list[dict] = []
    raw_text: str | None = None
    parsed_at: datetime | None = None

    try:
        import asyncio
        from app.services.ai_agent import parse_document_with_ai

        try:
            ai_result = await asyncio.wait_for(
                parse_document_with_ai(content, file_name),
                timeout=45.0
            )
            raw_text = ai_result.get("raw_text", "")
            qualifications_data = ai_result.get("qualifications", [])
            evaluation_data = ai_result.get("evaluation_criteria", [])
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
            except:
                pass

        if qualifications_data or evaluation_data or raw_text:
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
        file_path=str(save_path),
        file_type=file_ext.lstrip("."),
        raw_text=raw_text,
        qualifications=qualifications_data,
        evaluation_criteria=evaluation_data,
        parsed_at=parsed_at,
        uploaded_by=user_id,
    )
    db.add(task_order)
    await db.flush()

    return TaskOrderResponse.model_validate(task_order)


async def get_task_order(db: AsyncSession, task_order_id: str) -> TaskOrderResponse:
    """과업지시서 상세 정보를 조회합니다."""
    task_order = await db.get(TaskOrder, task_order_id)
    if not task_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="과업지시서를 찾을 수 없습니다.")
    return TaskOrderResponse.model_validate(task_order)


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
    await db.flush()

    return TaskOrderResponse.model_validate(task_order)
