"""Matching service backed by the supplied agent_core workflow."""

from __future__ import annotations

import asyncio

import structlog
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import MatchingResult, TaskOrder
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
        logger.exception("agent_core_matching_failed", task_order_id=task_order_id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Agent-core matching failed. Check Gemini configuration and the agent audit logs.",
        ) from error

    # Agent-core deliberately keeps private instructor data out of its prompts.
    # The API adds the display name afterwards from the existing read adapter.
    profiles = await list_all_instructor_profiles()
    names_by_id = {profile.id: profile.name for profile in profiles}
    for result in results_data:
        result["instructor_name"] = names_by_id.get(
            result["instructor_id"], "Unknown"
        )

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
