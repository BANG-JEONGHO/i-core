"""Matching service backed by the supplied agent_core workflow."""

from __future__ import annotations

import asyncio
import json
import re
import traceback
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

import structlog
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.models import InstructorSchedule, MatchingResult, TaskOrder
from app.schemas.matching import MatchingResultResponse, MatchingSummary, MatchScoreDTO
from app.services.external_instructor_db import list_all_instructor_profiles

logger = structlog.get_logger()


async def execute_matching(
    db: AsyncSession, task_order_id: str, user_id: str
) -> MatchingResultResponse:
    """Run agent-core ranking, A/B review, and grounding validation."""
    task_order = await db.get(TaskOrder, task_order_id)
    if not task_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task order was not found.",
        )
    if not task_order.qualifications and not task_order.evaluation_criteria:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No normalized requirements were extracted. Review the parsing result first.",
        )

    from app.services.agent_core_adapter import (
        AgentCoreConfigurationError,
        AgentCoreExecutionError,
        execute_agent_core_matching,
    )

    try:
        results_data, top_ids = await asyncio.to_thread(
            execute_agent_core_matching, task_order
        )
    except AgentCoreConfigurationError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
    except Exception as error:
        error_id = uuid4().hex[:8]
        stage = error.stage if isinstance(error, AgentCoreExecutionError) else "분석 실행"
        safe_message = _safe_error_message(
            str(error.cause) if isinstance(error, AgentCoreExecutionError) else str(error)
        )
        log_path = _write_matching_error_log(
            error_id=error_id,
            task_order_id=task_order_id,
            stage=stage,
            error=error,
        )
        # The complete traceback is already stored in the UTF-8 JSONL file.
        # Avoid printing it through a Windows cp949 console, which can turn a
        # handled agent error into a second 500 response.
        logger.error(
            "agent_core_matching_failed",
            task_order_id=task_order_id,
            error_id=error_id,
            stage=stage,
            error_type=type(error).__name__,
            error_log=str(log_path) if log_path else None,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                f"적합도 분석 실패 [{error_id}] — {stage} 단계에서 "
                f"{type(error.cause).__name__ if isinstance(error, AgentCoreExecutionError) else type(error).__name__}"
                f" 오류가 발생했습니다: {safe_message}"
            ),
        ) from error

    # Agent-core deliberately keeps private instructor data out of its prompts.
    # The API adds the display name afterwards from the existing read adapter.
    profiles = await list_all_instructor_profiles()
    names_by_id = {profile.id: profile.name for profile in profiles}
    for result in results_data:
        result["instructor_name"] = names_by_id.get(
            result["instructor_id"], "Unknown"
        )

    conflicting_ids = await _schedule_conflicts_for_task(db, task_order)
    if conflicting_ids:
        results_data = [item for item in results_data if item["instructor_id"] not in conflicting_ids]
        top_ids = [instructor_id for instructor_id in top_ids if instructor_id not in conflicting_ids]
        logger.info("scheduled_instructors_excluded", count=len(conflicting_ids))

    matching_result = MatchingResult(
        task_order_id=task_order_id,
        results=results_data,
        top_instructors=top_ids,
        executed_by=user_id,
    )
    db.add(matching_result)
    await db.flush()

    logger.info(
        "agent_core_matching_executed",
        task_order_id=task_order_id,
        instructor_count=len(results_data),
        reviewed_count=sum(item.get("agent_review") is not None for item in results_data),
        top_score=results_data[0]["total_score"] if results_data else 0,
    )
    return _as_response(matching_result)


async def get_matching_result(
    db: AsyncSession, matching_id: str
) -> MatchingResultResponse:
    matching_result = await db.get(MatchingResult, matching_id)
    if not matching_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Matching result was not found.",
        )
    return _as_response(matching_result)


async def list_matching_history(
    db: AsyncSession, offset: int = 0, limit: int = 10
) -> list[MatchingSummary]:
    result = await db.execute(
        select(MatchingResult)
        .order_by(MatchingResult.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    return [
        MatchingSummary(
            id=item.id,
            task_order_id=item.task_order_id,
            top_instructor_count=len(item.candidates or []),
            memo=item.memo,
            created_at=item.created_at,
        )
        for item in result.scalars().all()
    ]


def _as_response(matching_result: MatchingResult) -> MatchingResultResponse:
    return MatchingResultResponse(
        id=matching_result.id,
        task_order_id=matching_result.task_order_id,
        results=[MatchScoreDTO(**item) for item in matching_result.results],
        candidates=matching_result.candidates or [],
        created_at=matching_result.created_at,
    )


async def _schedule_conflicts_for_task(db: AsyncSession, task_order: TaskOrder) -> set[str]:
    """Exclude schedules only when the document contains an explicit date range."""
    raw_dates = re.findall(r"\b(20\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})\b", task_order.raw_text or "")
    if len(raw_dates) < 2:
        return set()
    dates = sorted(f"{year}-{int(month):02d}-{int(day):02d}" for year, month, day in raw_dates)
    start_date, end_date = dates[0], dates[-1]
    result = await db.execute(
        select(InstructorSchedule.instructor_id).where(
            InstructorSchedule.start_date <= end_date,
            InstructorSchedule.end_date >= start_date,
        )
    )
    return set(result.scalars().all())


def _write_matching_error_log(
    *,
    error_id: str,
    task_order_id: str,
    stage: str,
    error: Exception,
) -> Path | None:
    """Persist a local diagnostic record for a failed matching run.

    Runtime logs are intentionally ignored by Git. The response returns only a
    short, redacted summary while this file retains the traceback needed for
    debugging the local server.
    """
    try:
        log_dir = Path(settings.AGENT_RUN_STORAGE_DIR).parent / "logs"
        log_dir.mkdir(parents=True, exist_ok=True)
        log_path = log_dir / "agent-core-errors.jsonl"
        record = {
            "error_id": error_id,
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "task_order_id": task_order_id,
            "stage": stage,
            "error_type": type(error).__name__,
            "error_message": _safe_error_message(str(error)),
            "traceback": _safe_error_message("".join(traceback.format_exception(error))),
        }
        with log_path.open("a", encoding="utf-8") as file:
            file.write(json.dumps(record, ensure_ascii=False) + "\n")
        return log_path
    except OSError:
        return None


def _safe_error_message(message: str) -> str:
    """Keep diagnostics useful without writing credentials to a response/log."""
    redacted = re.sub(
        r"(?i)(api[_ -]?key|authorization|bearer|key)=?\s*[^\s,&]+",
        r"\1=<redacted>",
        message,
    )
    return redacted.replace("\n", " ").strip()[:800]
