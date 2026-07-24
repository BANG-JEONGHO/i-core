"""과업지시서 DTO."""

from datetime import datetime

from pydantic import BaseModel, Field


class TaskOrderResponse(BaseModel):
    id: str
    file_name: str
    file_type: str
    qualifications: list[dict]
    evaluation_criteria: list[dict]
    overview: dict = Field(default_factory=dict)
    parsed_at: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True


class TaskOrderSummary(BaseModel):
    id: str
    file_name: str
    file_type: str
    parsed_at: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True


class ParsedResultUpdate(BaseModel):
    qualifications: list[dict]
    evaluation_criteria: list[dict]
    overview: dict | None = None
