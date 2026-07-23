"""Matching service - AI 기반 강사 매칭."""

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
    """AI 기반 강사 매칭을 실행합니다."""
    task_order = await db.get(TaskOrder, task_order_id)
    if not task_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="과업지시서를 찾을 수 없습니다.",
        )
    if not task_order.qualifications and not task_order.evaluation_criteria:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="파싱된 데이터가 없습니다. 먼저 재파싱을 실행해주세요.",
        )

    # 강사 목록 로드
    profiles = await list_all_instructor_profiles()
    if not profiles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="등록된 강사가 없습니다.",
        )

    # AI 점수 매기기
    from app.services.ai_agent import ai_score_instructors

    task_requirements = {
        "qualifications": task_order.qualifications or [],
        "evaluation_criteria": task_order.evaluation_criteria or [],
    }

    # 일정 충돌 강사 제외
    from app.models.models import InstructorSchedule
    from sqlalchemy import select as sa_select

    # 과업 기간 추출 (과업지시서 raw_text에서 기간 정보 확인)
    task_start = None
    task_end = None
    # evaluation_criteria나 qualifications에서 기간 정보 추출 시도
    # 기본: 오늘부터 3개월 후까지를 과업 기간으로 설정
    from datetime import date, timedelta
    task_start = date.today().isoformat()
    task_end = (date.today() + timedelta(days=90)).isoformat()

    # 일정 충돌 강사 조회
    conflict_result = await db.execute(
        sa_select(InstructorSchedule).where(
            InstructorSchedule.start_date <= task_end,
            InstructorSchedule.end_date >= task_start,
        )
    )
    conflicting_ids = set(s.instructor_id for s in conflict_result.scalars().all())
    if conflicting_ids:
        logger.info("schedule_conflicts_excluded", count=len(conflicting_ids))

    # 충돌 강사 제외한 목록으로 매칭
    instructors_data = [
        {
            "id": p.id,
            "name": p.name,
            "keywords": p.keywords or [],
            "experience_years": p.experience_years or 0,
        }
        for p in profiles
        if p.id not in conflicting_ids
    ]

    try:
        ai_scores = await ai_score_instructors(task_requirements, instructors_data)
    except Exception as e:
        logger.error("ai_scoring_failed", error=str(e))
        ai_scores = []

    # AI 점수를 강사 ID로 매핑
    score_map = {}
    for item in ai_scores:
        sid = item.get("id", "")
        score = item.get("score", 50)
        # ID가 앞 8자리로 올 수 있으므로 매칭
        for p in profiles:
            if p.id.startswith(sid):
                score_map[p.id] = score
                break

    # 결과 생성 (점수 높은 순)
    results_data = []
    for p in profiles:
        total_score = score_map.get(p.id, 30)  # AI 점수 없으면 기본 30
        results_data.append({
            "instructor_id": p.id,
            "instructor_name": p.name,
            "total_score": total_score,
            "keyword_score": round(total_score * 0.4),
            "qualification_score": round(total_score * 0.3),
            "experience_score": round(total_score * 0.3),
        })

    results_data.sort(key=lambda x: x["total_score"], reverse=True)

    # 상위 30명만 저장
    results_data = results_data[:30]
    top_ids = [r["instructor_id"] for r in results_data[:10]]

    matching_result = MatchingResult(
        task_order_id=task_order_id,
        results=results_data,
        top_instructors=top_ids,
        executed_by=user_id,
    )
    db.add(matching_result)
    await db.flush()

    logger.info(
        "matching_executed",
        task_order_id=task_order_id,
        instructor_count=len(results_data),
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
            top_instructor_count=sum(1 for c in (item.candidates or []) if c.startswith('final_')),
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
