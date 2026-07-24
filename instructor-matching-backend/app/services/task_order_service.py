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
    # 파일명에서 surrogate 및 특수문자 제거
    raw_name = file.filename or "unknown"
    file_name = raw_name.encode('utf-8', errors='surrogateescape').decode('utf-8', errors='ignore')
    if not file_name.strip() or not any(c.isalnum() for c in file_name):
        file_name = "document"
    file_ext = Path(file_name).suffix.lower()

    # 파일 저장 (파일명에 uuid 사용해서 인코딩 문제 방지)
    save_dir = Path(settings.UPLOAD_DIR) / datetime.now().strftime("%Y/%m")
    save_dir.mkdir(parents=True, exist_ok=True)
    safe_ext = file_ext if file_ext else '.bin'
    saved_name = f"{uuid.uuid4()}{safe_ext}"
    save_path = save_dir / saved_name

    with open(save_path, "wb") as f:
        f.write(content)

    logger.info("file_saved", file_name=file_name, size=len(content))

    # 파싱 시도 (AI Agent 기반, 타임아웃 90초)
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
                timeout=90.0
            )
            raw_text = ai_result.get("raw_text", "")
            qualifications_data = ai_result.get("qualifications", [])
            evaluation_data = ai_result.get("evaluation_criteria", [])
            if parse_error := ai_result.get("parse_error"):
                logger.warning("document_parse_unavailable", file_name=file_name, reason=parse_error)
        except asyncio.TimeoutError:
            logger.warning("ai_parsing_timeout", file_name=file_name)
            # 타임아웃 시 빈 결과 사용
            pass

        if qualifications_data or evaluation_data or raw_text:
            parsed_at = datetime.now()

        logger.info(
            "document_parsed",
            qualifications=len(qualifications_data),
            criteria=len(evaluation_data),
        )
    except Exception as e:
        logger.warning("parse_failed", error=str(e), file_name=file_name)
        # ?�싱 ?�패?�도 ?�코?�는 ?�성 (parsed_at = None)

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
    """과업지?�서 ?�세 ?�보�?조회?�니??"""
    task_order = await db.get(TaskOrder, task_order_id)
    if not task_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="과업지?�서�?찾을 ???�습?�다.")
    return TaskOrderResponse.model_validate(task_order)


async def list_task_orders(
    db: AsyncSession, offset: int = 0, limit: int = 20
) -> tuple[list[TaskOrderSummary], int]:
    """과업지?�서 목록??조회?�니??"""
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
    """?�싱 결과�??�정?�니??"""
    task_order = await db.get(TaskOrder, task_order_id)
    if not task_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="과업지?�서�?찾을 ???�습?�다.")

    task_order.qualifications = data.qualifications
    task_order.evaluation_criteria = data.evaluation_criteria
    await db.flush()

    return TaskOrderResponse.model_validate(task_order)
