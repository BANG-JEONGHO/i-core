from __future__ import annotations

from enum import Enum
from typing import Annotated, Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class ReviewStatus(str, Enum):
    UNREVIEWED = "unreviewed"
    APPROVED = "approved"
    NEEDS_REVIEW = "needs_review"
    REJECTED = "rejected"


class EvidenceRef(BaseModel):
    """A source location supporting one extracted or scoring claim."""

    source_document_id: str
    page: int | None = Field(default=None, ge=1)
    section: str | None = None
    quote: str = Field(min_length=1, max_length=1_000)
    confidence: float = Field(ge=0, le=1)


class ProjectBase(BaseModel):
    project_name: str | None = None
    client_organization: str | None = None
    purpose: list[str] = Field(default_factory=list)
    contract_method: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    budget_krw: int | None = Field(default=None, ge=0)
    vat_included: bool | None = None
    deliverables: list[str] = Field(default_factory=list)
    proposal_requirements: list[str] = Field(default_factory=list)
    compliance_requirements: list[str] = Field(default_factory=list)


class InstructorRequirements(BaseModel):
    required_experience: list[str] = Field(default_factory=list)
    required_certifications: list[str] = Field(default_factory=list)
    required_vendor_credentials: list[str] = Field(default_factory=list)
    similar_project_experience: list[str] = Field(default_factory=list)


class EducationRequirements(BaseModel):
    technology_domains: list[str] = Field(default_factory=list)
    program_topics: list[str] = Field(default_factory=list)
    target_audience: list[str] = Field(default_factory=list)
    participant_capacity: int | None = Field(default=None, ge=0)
    delivery_format: list[str] = Field(default_factory=list)
    education_hours: int | None = Field(default=None, ge=0)
    schedule: list[str] = Field(default_factory=list)
    required_roles: list[str] = Field(default_factory=list)
    instructor_requirements: InstructorRequirements = Field(default_factory=InstructorRequirements)
    curriculum_requirements: list[str] = Field(default_factory=list)
    operational_requirements: list[str] = Field(default_factory=list)
    practical_project_requirements: list[str] = Field(default_factory=list)
    assessment_requirements: list[str] = Field(default_factory=list)
    outcome_requirements: list[str] = Field(default_factory=list)


class ProjectProfile(BaseModel):
    schema_version: Literal["education_project_v1"] = "education_project_v1"
    service_type: Literal["education_program"] = "education_program"
    program_type: Literal[
        "vocational_training",
        "school_youth_training",
        "career_camp_or_hackathon",
        "training_infrastructure",
    ]
    classification_confidence: float = Field(ge=0, le=1)
    base: ProjectBase
    education: EducationRequirements
    extensions: dict[str, object] = Field(default_factory=dict)
    evidence: list[EvidenceRef] = Field(default_factory=list)
    review_status: ReviewStatus = ReviewStatus.UNREVIEWED


class TeachingItem(BaseModel):
    topic: str
    organization: str | None = None
    target_audience: list[str] = Field(default_factory=list)
    delivery_format: list[str] = Field(default_factory=list)
    hours: int | None = Field(default=None, ge=0)
    outcomes: list[str] = Field(default_factory=list)
    evidence: list[EvidenceRef] = Field(default_factory=list)


class Certification(BaseModel):
    name: str
    issuer: str | None = None
    expires_at: str | None = None
    evidence: list[EvidenceRef] = Field(default_factory=list)


class ProjectExperienceItem(BaseModel):
    title: str
    client_organization: str | None = None
    role: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    keywords: list[str] = Field(default_factory=list)
    evidence: list[EvidenceRef] = Field(default_factory=list)


class WorkExperienceItem(BaseModel):
    organization: str | None = None
    summary: str
    start_date: str | None = None
    end_date: str | None = None
    evidence: list[EvidenceRef] = Field(default_factory=list)


class InstructorProfile(BaseModel):
    instructor_id: str
    profile_version: str
    display_name: str
    expertise_tags: list[str] = Field(min_length=1)
    summary: str
    delivery_modes: list[str] = Field(default_factory=list)
    availability_notes: str | None = None
    vendor_experience: list[str] = Field(default_factory=list)
    vendor_certifications: list[str] = Field(default_factory=list)
    teaching_items: list[TeachingItem] = Field(default_factory=list)
    project_items: list[ProjectExperienceItem] = Field(default_factory=list)
    work_experience_items: list[WorkExperienceItem] = Field(default_factory=list)
    certifications: list[Certification] = Field(default_factory=list)
    # IDs of original resume documents already indexed for RAG retrieval.
    source_document_ids: list[str] = Field(default_factory=list)
    extensions: dict[str, object] = Field(default_factory=dict)
    evidence: list[EvidenceRef] = Field(default_factory=list)
    review_status: ReviewStatus = ReviewStatus.UNREVIEWED


class ScoreItem(BaseModel):
    criterion: Literal[
        "topic_match",
        "teaching_depth",
        "audience_fit",
        "career_and_certification",
        "evidence_completeness",
    ]
    score: float = Field(ge=0)
    max_score: float = Field(gt=0)
    rationale: str
    project_evidence: list[EvidenceRef] = Field(default_factory=list)
    instructor_evidence: list[EvidenceRef] = Field(default_factory=list)

    @model_validator(mode="after")
    def score_cannot_exceed_max(self):
        if self.score > self.max_score:
            raise ValueError("score cannot exceed max_score")
        return self


class MatchAnalysis(BaseModel):
    total_score: float = Field(ge=0, le=100)
    score_items: list[ScoreItem] = Field(min_length=5, max_length=5)
    recommendation_reasons: list[str] = Field(default_factory=list)
    gaps: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    required_conditions_passed: bool | None = None
    required_condition_notes: list[str] = Field(default_factory=list)

    @field_validator("score_items")
    @classmethod
    def require_all_criteria_once(cls, items: list[ScoreItem]):
        expected = {
            "topic_match",
            "teaching_depth",
            "audience_fit",
            "career_and_certification",
            "evidence_completeness",
        }
        actual = {item.criterion for item in items}
        if actual != expected or len(actual) != len(items):
            raise ValueError("score_items must contain each scoring criterion exactly once")
        return items


class VerificationIssue(BaseModel):
    severity: Literal["low", "medium", "high"]
    category: Literal["evidence", "calculation", "required_condition", "omission", "overclaim"]
    description: str
    related_criterion: str | None = None


class VerificationResult(BaseModel):
    independent_score: float = Field(ge=0, le=100)
    verdict: Literal["PASS", "REVIEW", "FAIL"]
    evidence_coverage: float = Field(ge=0, le=1)
    issues: list[VerificationIssue] = Field(default_factory=list)
    corrected_score_items: list[ScoreItem] = Field(min_length=5, max_length=5)
    required_conditions_passed: bool | None = None


class FinalStatus(str, Enum):
    RECOMMENDED = "recommended"
    NEEDS_REVIEW = "needs_review"
    ON_HOLD = "on_hold"


class MergedMatchResult(BaseModel):
    # Assigned after successful audit storage. Existing clients may ignore it.
    run_id: str | None = None
    final_score: float = Field(ge=0, le=100)
    final_status: FinalStatus
    reasons: list[str]
    analysis: MatchAnalysis
    verification: VerificationResult
    grounding: GroundingValidation | None = None
    rag_context: RAGContext | None = None


class RetrievedEvidence(BaseModel):
    """One source chunk retrieved for an LLM decision, with its provenance."""

    source_type: Literal["project", "instructor"]
    evidence: EvidenceRef
    retrieval_score: float = Field(ge=0, le=1)


class RAGContext(BaseModel):
    """Evidence returned by retrieval. Agents must cite only these quotes."""

    project_evidence: list[RetrievedEvidence] = Field(default_factory=list)
    instructor_evidence: list[RetrievedEvidence] = Field(default_factory=list)


class RequiredConditionCheck(BaseModel):
    requirement: str
    condition_type: Literal["certification", "vendor_credential", "experience"]
    status: Literal["verified", "failed", "not_automatically_verifiable"]
    detail: str


class GroundingValidation(BaseModel):
    """Deterministic checks performed after both LLM decisions."""

    citation_accuracy: float = Field(ge=0, le=1)
    invalid_citation_count: int = Field(ge=0)
    unsupported_positive_score_count: int = Field(ge=0)
    required_condition_checks: list[RequiredConditionCheck] = Field(default_factory=list)
    verdict: Literal["PASS", "REVIEW", "FAIL"]


class RetrievalScoreItem(BaseModel):
    """A deterministic DB retrieval-score component, not an LLM recommendation."""

    criterion: str
    score: float = Field(ge=0)
    max_score: float = Field(ge=0)
    matched_terms: list[str] = Field(default_factory=list)
    evidence: list[EvidenceRef] = Field(default_factory=list)


class RankedInstructor(BaseModel):
    instructor_id: str
    profile_version: str
    retrieval_score: float = Field(ge=0, le=100)
    score_items: list[RetrievalScoreItem]
    matched_terms: list[str] = Field(default_factory=list)


class ProjectAnalysisRequest(BaseModel):
    source_document_id: str
    source_name: str
    text: str = Field(min_length=100, max_length=200_000)


class DocumentIndexRequest(BaseModel):
    """Index an original document so its chunks can be retrieved as evidence."""

    source_document_id: str = Field(min_length=1, max_length=200)
    source_name: str = Field(min_length=1, max_length=500)
    text: str = Field(min_length=1, max_length=500_000)
    source_type: Literal["project", "instructor"]


class DocumentIndexResult(BaseModel):
    source_document_id: str
    chunk_count: int = Field(ge=0)


class MatchRequest(BaseModel):
    project: ProjectProfile
    instructor: InstructorProfile


class BatchMatchRequest(BaseModel):
    """Rank every DB instructor, then optionally run A/B for explicit IDs only."""

    project: ProjectProfile = Field(
        description=(
            "Paste the complete JSON object returned by POST /v1/projects/analyze. "
            "Do not put an explanatory sentence or a quoted JSON string here."
        )
    )
    review_instructor_ids: list[int] = Field(
        default_factory=list,
        max_length=108,
        description="Optional instructor IDs for Gemini A/B review. Omit or use [] for ranking only.",
    )

    @field_validator("review_instructor_ids")
    @classmethod
    def require_unique_review_ids(cls, instructor_ids: list[int]) -> list[int]:
        if len(set(instructor_ids)) != len(instructor_ids):
            raise ValueError("review_instructor_ids must not contain duplicates")
        return instructor_ids


class BatchMatchResult(BaseModel):
    batch_run_id: str | None = None
    total_instructors: int = Field(ge=0)
    rankings: list[RankedInstructor]
    reviewed_matches: list[MergedMatchResult] = Field(default_factory=list)

