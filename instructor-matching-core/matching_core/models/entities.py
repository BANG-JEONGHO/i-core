"""도메인 엔티티 정의."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class FileType(Enum):
    """지원하는 파일 형식."""

    PDF = "pdf"
    HWP = "hwp"
    DOCX = "docx"


class SectionType(Enum):
    """문서 섹션 유형."""

    QUALIFICATION = "qualification"
    EVALUATION = "evaluation"
    OTHER = "other"


@dataclass
class DocumentSection:
    """문서 내 식별된 섹션."""

    title: str
    content: str
    section_type: SectionType
    page_number: Optional[int] = None


@dataclass
class ParsedDocument:
    """과업지시서 파일에서 추출된 파싱 결과."""

    raw_text: str
    file_type: FileType
    sections: list[DocumentSection] = field(default_factory=list)


@dataclass
class Qualification:
    """개별 참여자격 항목."""

    category: str
    description: str
    is_mandatory: bool = True
    keywords: list[str] = field(default_factory=list)


@dataclass
class EvaluationCriterion:
    """개별 평가기준 항목."""

    category: str
    description: str
    weight: Optional[float] = None
    keywords: list[str] = field(default_factory=list)


@dataclass
class TaskRequirements:
    """과업지시서에서 추출·구조화된 요구사항."""

    qualifications: list[Qualification] = field(default_factory=list)
    evaluation_criteria: list[EvaluationCriterion] = field(default_factory=list)
    raw_text: str = ""


@dataclass
class Instructor:
    """매칭 대상 강사 정보."""

    id: str
    name: str
    specializations: list[str] = field(default_factory=list)
    subjects: list[str] = field(default_factory=list)
    experience_years: int = 0
    certifications: list[str] = field(default_factory=list)
    education: str = ""
    keywords: list[str] = field(default_factory=list)


@dataclass
class ScoreBreakdown:
    """점수 상세 내역."""

    criterion: str
    score: float
    max_score: float
    reason: str
    matched_keywords: list[str] = field(default_factory=list)


@dataclass
class MatchScore:
    """강사별 매칭 점수 결과."""

    instructor_id: str
    total_score: float = 0.0
    keyword_score: float = 0.0
    qualification_score: float = 0.0
    experience_score: float = 0.0
    breakdown: list[ScoreBreakdown] = field(default_factory=list)


@dataclass
class MatchReason:
    """매칭 근거 요약."""

    instructor_id: str
    summary: str = ""
    strengths: list[str] = field(default_factory=list)
    weaknesses: list[str] = field(default_factory=list)
    score_breakdown: list[ScoreBreakdown] = field(default_factory=list)
