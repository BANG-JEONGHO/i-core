"""강사 DTO."""

from datetime import datetime

from pydantic import BaseModel, Field


class InstructorCreate(BaseModel):
    name: str = Field(max_length=100)
    specializations: list[str] = []
    subjects: list[str] = []
    experience_years: int = Field(default=0, ge=0, le=50)
    certifications: list[str] = []
    education: str = ""
    contact: str | None = None
    notes: str | None = None


class InstructorUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=100)
    specializations: list[str] | None = None
    subjects: list[str] | None = None
    experience_years: int | None = Field(default=None, ge=0, le=50)
    certifications: list[str] | None = None
    education: str | None = None
    contact: str | None = None
    notes: str | None = None


class InstructorResponse(BaseModel):
    id: str
    name: str
    specializations: list[str]
    subjects: list[str]
    experience_years: int
    certifications: list[str]
    education: str
    keywords: list[str]
    contact: str | None
    notes: str | None
    email: str | None = None
    region: str | None = None
    affiliation: str | None = None
    degree: str | None = None
    school: str | None = None
    major: str | None = None
    main_lecture_area: str | None = None
    summary: str | None = None
    birth_date: str | None = None
    lecture_history: list[dict] = []
    qualifications_career: list[dict] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BulkUploadResponse(BaseModel):
    total: int
    success: int
    errors: list[str] = []


class InstructorStats(BaseModel):
    total_count: int
    specialization_distribution: dict[str, int]
    average_experience: float
