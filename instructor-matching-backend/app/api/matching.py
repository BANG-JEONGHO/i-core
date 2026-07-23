"""매칭 API 라우터."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.models.models import User
from app.schemas.matching import MatchingResultResponse, MatchingSummary
from app.services import matching_service

router = APIRouter(prefix="/api/matching", tags=["matching"])


@router.post("/execute/{task_order_id}", response_model=MatchingResultResponse)
async def execute_matching(
    task_order_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """매칭 실행."""
    return await matching_service.execute_matching(db, task_order_id, current_user.id)


@router.get("/history", response_model=list[MatchingSummary])
async def list_matching_history(
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """매칭 이력 조회."""
    return await matching_service.list_matching_history(db, offset, limit)


@router.get("/{matching_id}", response_model=MatchingResultResponse)
async def get_matching_result(
    matching_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """매칭 결과 상세 조회."""
    return await matching_service.get_matching_result(db, matching_id)


@router.post("/{matching_id}/candidates/{instructor_id}")
async def add_candidate(
    matching_id: str,
    instructor_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """후보 선정."""
    from app.models.models import MatchingResult
    from sqlalchemy.orm.attributes import flag_modified
    result = await db.get(MatchingResult, matching_id)
    if not result:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    candidates = list(result.candidates or [])
    if instructor_id not in candidates:
        candidates.append(instructor_id)
        result.candidates = candidates
        flag_modified(result, "candidates")
    return {"candidates": candidates}


@router.delete("/{matching_id}/candidates/{instructor_id}")
async def remove_candidate(
    matching_id: str,
    instructor_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """후보 해제."""
    from app.models.models import MatchingResult
    from sqlalchemy.orm.attributes import flag_modified
    result = await db.get(MatchingResult, matching_id)
    if not result:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    candidates = list(result.candidates or [])
    if instructor_id in candidates:
        candidates.remove(instructor_id)
        result.candidates = candidates
        flag_modified(result, "candidates")
    return {"candidates": candidates}


@router.delete("/{matching_id}", status_code=204)
async def delete_matching_result(
    matching_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """매칭 결과 삭제."""
    from app.models.models import MatchingResult
    result = await db.get(MatchingResult, matching_id)
    if result:
        await db.delete(result)


@router.put("/{matching_id}/memo")
async def update_memo(
    matching_id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """매칭 결과에 메모 저장."""
    from app.models.models import MatchingResult
    result = await db.get(MatchingResult, matching_id)
    if not result:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    result.memo = body.get("memo", "")
    return {"memo": result.memo}


@router.post("/{matching_id}/ai-reason/{instructor_id}")
async def get_ai_reason(
    matching_id: str,
    instructor_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """AI로 매칭 추천 이유를 생성합니다."""
    from app.models.models import MatchingResult, TaskOrder
    from app.services.ai_agent import generate_match_reason
    from app.services.external_instructor_db import get_instructor_profile

    result = await db.get(MatchingResult, matching_id)
    if not result:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    # 해당 강사의 점수 찾기
    score_data = None
    for r in result.results:
        if r.get("instructor_id") == instructor_id:
            score_data = r
            break

    if not score_data:
        return {"reason": "해당 강사의 매칭 데이터를 찾을 수 없습니다."}

    # 강사 정보 로드
    # Agent-core runs already contain audited analysis A, independent verifier
    # B, and grounding checks. Reuse it instead of the legacy explanation LLM.
    agent_review = score_data.get("agent_review")
    if agent_review:
        import json

        analysis = agent_review.get("analysis", {})
        verification = agent_review.get("verification", {})
        grounding = agent_review.get("grounding") or {}
        return {
            "reason": json.dumps(
                {
                    "strengths": analysis.get("recommendation_reasons", []),
                    "weaknesses": [
                        *analysis.get("gaps", []),
                        *analysis.get("risks", []),
                    ],
                    "summary": "; ".join(score_data.get("recommendation_reasons", [])),
                    "final_status": score_data.get("final_status"),
                    "verifier_verdict": verification.get("verdict"),
                    "grounding_verdict": grounding.get("verdict"),
                },
                ensure_ascii=False,
            )
        }

    instructor = await get_instructor_profile(instructor_id)
    if not instructor:
        return {"reason": "강사 정보를 찾을 수 없습니다."}

    # 과업지시서 정보 로드 - 구조화된 데이터 사용 (raw_text는 손상될 수 있음)
    task_order = await db.get(TaskOrder, result.task_order_id)
    task_desc = ""
    if task_order:
        # 구조화된 자격요건/평가기준으로 과업 요약 생성
        parts = []
        if task_order.qualifications:
            parts.append("신청자격:")
            for q in task_order.qualifications[:5]:
                desc = q.get("description", "")[:100]
                keywords = ", ".join(q.get("keywords", [])[:5])
                parts.append(f"  - {desc} (키워드: {keywords})")
        if task_order.evaluation_criteria:
            parts.append("평가기준:")
            for e in task_order.evaluation_criteria[:5]:
                desc = e.get("description", "")[:100]
                keywords = ", ".join(e.get("keywords", [])[:5])
                weight = e.get("weight", "")
                parts.append(f"  - {desc} {'('+str(weight)+'점)' if weight else ''} (키워드: {keywords})")
        task_desc = "\n".join(parts) if parts else f"파일명: {task_order.file_name}"

    reason = await generate_match_reason(
        task_description=task_desc,
        instructor_name=instructor.name,
        instructor_keywords=instructor.keywords or [],
        instructor_experience=instructor.experience_years,
        score=score_data.get("total_score", 0),
        keyword_score=score_data.get("keyword_score", 0),
        qual_score=score_data.get("qualification_score", 0),
        exp_score=score_data.get("experience_score", 0),
    )

    return {"reason": reason}
