"""매칭 서비스."""

from __future__ import annotations

import asyncio
from dataclasses import asdict
from functools import partial

import structlog
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Instructor, MatchingResult, TaskOrder
from app.schemas.matching import MatchingResultResponse, MatchingSummary, MatchScoreDTO

logger = structlog.get_logger()


async def execute_matching(
    db: AsyncSession, task_order_id: str, user_id: str
) -> MatchingResultResponse:
    """매칭을 실행합니다."""
    # 과업지시서 로드
    task_order = await db.get(TaskOrder, task_order_id)
    if not task_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="과업지시서를 찾을 수 없습니다.")

    if not task_order.qualifications and not task_order.evaluation_criteria:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="추출된 요구사항이 없습니다. 파싱 결과를 확인해 주세요.",
        )

    # 강사 풀 로드
    result = await db.execute(select(Instructor))
    db_instructors = result.scalars().all()

    if not db_instructors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="등록된 강사가 없습니다. 먼저 강사 데이터를 업로드해 주세요.",
        )

    # matching_core 엔티티로 변환
    from matching_core import (
        EvaluationCriterion,
        Instructor as MCInstructor,
        Qualification,
        TaskRequirements,
        generate_match_reasons,
        match_instructors,
    )

    mc_instructors = [
        MCInstructor(
            id=i.id,
            name=i.name,
            specializations=i.specializations or [],
            subjects=i.subjects or [],
            experience_years=i.experience_years,
            certifications=i.certifications or [],
            education=i.education or "",
            keywords=i.keywords or [],
        )
        for i in db_instructors
    ]

    # 매칭 실행 - AI 기반 스코어링
    from app.services.ai_agent import ai_score_instructors

    # 강사 데이터를 AI에 전달할 형태로 변환
    instructor_dicts = [
        {"id": i.id, "name": i.name, "keywords": i.keywords or [], "experience_years": i.experience_years}
        for i in db_instructors
    ]
    task_req_dict = {
        "qualifications": task_order.qualifications or [],
        "evaluation_criteria": task_order.evaluation_criteria or [],
    }

    ai_scores = await ai_score_instructors(task_req_dict, instructor_dicts)

    # AI 점수를 instructor_id로 매핑
    ai_score_map = {}
    for item in ai_scores:
        item_id = item.get("id", "")
        score = item.get("score", 50)
        # ID 첫 8자리로 매칭
        for i in db_instructors:
            if i.id.startswith(item_id):
                ai_score_map[i.id] = score
                break

    # 결과 구성
    results_data = []
    for i in db_instructors:
        total_score = ai_score_map.get(i.id, 30)  # AI 점수 없으면 기본 30
        results_data.append({
            "instructor_id": i.id,
            "instructor_name": i.name,
            "total_score": total_score,
            "keyword_score": round(total_score * 0.4, 1),
            "qualification_score": round(total_score * 0.3, 1),
            "experience_score": round(total_score * 0.3, 1),
            "breakdown": [],
        })

    # 점수 내림차순 정렬
    results_data.sort(key=lambda x: -x["total_score"])
    top_ids = [r["instructor_id"] for r in results_data[:10]]

    # DB 저장
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
        instructor_count=len(db_instructors),
        top_score=results_data[0]["total_score"] if results_data else 0,
    )

    return MatchingResultResponse(
        id=matching_result.id,
        task_order_id=task_order_id,
        results=[MatchScoreDTO(**r) for r in results_data],
        candidates=matching_result.candidates or [],
        created_at=matching_result.created_at,
    )


async def get_matching_result(
    db: AsyncSession, matching_id: str
) -> MatchingResultResponse:
    """매칭 결과를 조회합니다."""
    matching_result = await db.get(MatchingResult, matching_id)
    if not matching_result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="매칭 결과를 찾을 수 없습니다.")

    return MatchingResultResponse(
        id=matching_result.id,
        task_order_id=matching_result.task_order_id,
        results=[MatchScoreDTO(**r) for r in matching_result.results],
        candidates=matching_result.candidates or [],
        created_at=matching_result.created_at,
    )


async def list_matching_history(
    db: AsyncSession, offset: int = 0, limit: int = 10
) -> list[MatchingSummary]:
    """매칭 이력을 조회합니다."""
    result = await db.execute(
        select(MatchingResult)
        .order_by(MatchingResult.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    results = result.scalars().all()

    summaries = []
    for r in results:
        summaries.append(
            MatchingSummary(
                id=r.id,
                task_order_id=r.task_order_id,
                top_instructor_count=len(r.candidates or []),
                created_at=r.created_at,
            )
        )
    return summaries
