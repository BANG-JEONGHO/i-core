"""매칭 DTO."""

from datetime import datetime

from pydantic import BaseModel, Field


class MatchScoreDTO(BaseModel):
    instructor_id: str
    instructor_name: str
    total_score: float
    keyword_score: float
    qualification_score: float
    experience_score: float
    breakdown: list[dict]
    # Agent-core review fields are optional so existing saved results remain
    # readable while new runs expose the final verification outcome.
    final_status: str | None = None
    recommendation_reasons: list[str] = []
    grounding_verdict: str | None = None
    agent_run_id: str | None = None
    agent_review: dict | None = None


class MatchingResultResponse(BaseModel):
    id: str
    task_order_id: str
    results: list[MatchScoreDTO]
    candidates: list[str] = []
    created_at: datetime

    class Config:
        from_attributes = True


class MatchingSummary(BaseModel):
    id: str
    task_order_id: str
    task_order_name: str | None = None
    top_instructor_count: int
    created_at: datetime


class CompareRequest(BaseModel):
    instructor_ids: list[str] = Field(min_length=2, max_length=5)
