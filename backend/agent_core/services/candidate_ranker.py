"""Deterministic, evidence-backed retrieval ranking for every instructor.

The score in this module is not the final recommendation score.  It is a fast
DB-based retrieval score used to order all instructors before optional LLM
review.  No instructor is automatically excluded.
"""

from __future__ import annotations

import re

from agent_core.schemas import (
    EvidenceRef,
    InstructorProfile,
    ProjectProfile,
    RankedInstructor,
    RetrievalScoreItem,
)
from agent_core.services.instructor_profile_builder import build_instructor_profile
from agent_core.services.instructor_repository import InstructorRepository


_STOP_TOKENS = {
    "교육",
    "과정",
    "운영",
    "프로그램",
    "기초",
    "심화",
    "실습",
    "프로젝트",
    "강의",
    "훈련",
    "관리",
    "활용",
}


def rank_instructors(
    project: ProjectProfile,
    repository: InstructorRepository,
) -> list[RankedInstructor]:
    """Rank every instructor in the DB; zero-score instructors are retained."""
    rankings = [
        score_instructor(project, build_instructor_profile(repository.get_instructor(id)))
        for id in repository.list_instructor_ids()
    ]
    return sorted(
        rankings,
        key=lambda ranking: (-ranking.retrieval_score, ranking.instructor_id),
    )


def score_instructor(
    project: ProjectProfile,
    instructor: InstructorProfile,
) -> RankedInstructor:
    """Calculate a normalized retrieval score from explicit DB profile fields."""
    topic_terms = _unique(
        [
            *project.education.technology_domains,
            *project.education.program_topics,
        ]
    )
    teaching_terms = _unique(project.education.program_topics) or topic_terms
    project_terms = _unique(
        [
            *project.education.practical_project_requirements,
            *project.education.instructor_requirements.similar_project_experience,
            *project.education.technology_domains,
            *project.education.program_topics,
        ]
    )
    certification_terms = _unique(
        [
            *project.education.instructor_requirements.required_certifications,
            *project.education.instructor_requirements.required_vendor_credentials,
        ]
    )
    overview_context_terms = _unique(
        [
            *project.education.target_audience,
            *project.education.delivery_format,
            *project.education.required_roles,
            *project.education.practical_project_requirements,
            *project.education.instructor_requirements.similar_project_experience,
        ]
    )
    overview_context_values = [
        *instructor.delivery_modes,
        *[
            value
            for item in instructor.teaching_items
            for value in [item.topic, *item.target_audience, *item.delivery_format, *item.outcomes]
        ],
        *[
            value
            for item in instructor.project_items
            for value in [item.title, item.role or "", *item.keywords]
        ],
        *[item.summary for item in instructor.work_experience_items],
    ]
    overview_context_evidence = [
        *[evidence for item in instructor.teaching_items for evidence in item.evidence],
        *[evidence for item in instructor.project_items for evidence in item.evidence],
        *[evidence for item in instructor.work_experience_items for evidence in item.evidence],
    ]

    score_items = [
        _score_component(
            criterion="topic_tags",
            max_score=40,
            required_terms=topic_terms,
            candidate_values=instructor.expertise_tags,
            evidence=instructor.evidence,
        ),
        _score_component(
            criterion="teaching_experience",
            max_score=30,
            required_terms=teaching_terms,
            candidate_values=[item.topic for item in instructor.teaching_items],
            evidence=[evidence for item in instructor.teaching_items for evidence in item.evidence],
        ),
        _score_component(
            criterion="project_and_work_experience",
            max_score=20,
            required_terms=project_terms,
            candidate_values=[
                *[item.title for item in instructor.project_items],
                *[term for item in instructor.project_items for term in item.keywords],
                *[item.summary for item in instructor.work_experience_items],
            ],
            evidence=[
                *[evidence for item in instructor.project_items for evidence in item.evidence],
                *[evidence for item in instructor.work_experience_items for evidence in item.evidence],
            ],
        ),
        _score_component(
            criterion="required_certifications",
            max_score=10,
            required_terms=certification_terms,
            candidate_values=[certificate.name for certificate in instructor.certifications],
            evidence=[evidence for certificate in instructor.certifications for evidence in certificate.evidence],
        ),
        _score_component(
            criterion="overview_context_fit",
            max_score=15,
            required_terms=overview_context_terms,
            candidate_values=overview_context_values,
            evidence=overview_context_evidence,
        ),
    ]

    # Only criteria that the project actually specifies participate in the
    # denominator. This keeps different project types comparable on a 0-100 scale.
    active_items = [item for item in score_items if item.max_score > 0]
    raw_score = sum(item.score for item in active_items)
    active_max_score = sum(item.max_score for item in active_items)
    retrieval_score = round(100 * raw_score / active_max_score, 2) if active_max_score else 0.0
    matched_terms = _unique(
        [term for item in score_items for term in item.matched_terms]
    )

    return RankedInstructor(
        instructor_id=instructor.instructor_id,
        profile_version=instructor.profile_version,
        retrieval_score=retrieval_score,
        score_items=score_items,
        matched_terms=matched_terms,
    )


def _score_component(
    *,
    criterion: str,
    max_score: float,
    required_terms: list[str],
    candidate_values: list[str],
    evidence: list[EvidenceRef],
) -> RetrievalScoreItem:
    if not required_terms:
        return RetrievalScoreItem(
            criterion=criterion,
            score=0,
            max_score=0,
            matched_terms=[],
            evidence=[],
        )

    matched_terms = [
        term
        for term in required_terms
        if any(_is_related(term, value) for value in candidate_values)
    ]
    coverage = len(matched_terms) / len(required_terms)
    relevant_evidence = evidence if matched_terms else []
    return RetrievalScoreItem(
        criterion=criterion,
        score=round(max_score * coverage, 2),
        max_score=max_score,
        matched_terms=matched_terms,
        evidence=relevant_evidence,
    )


def _is_related(required_term: str, candidate_value: str) -> bool:
    required = _normalized(required_term)
    candidate = _normalized(candidate_value)
    if not required or not candidate:
        return False
    if required in candidate or candidate in required:
        return True

    required_tokens = _tokens(required_term)
    candidate_tokens = _tokens(candidate_value)
    return bool(required_tokens and candidate_tokens and required_tokens & candidate_tokens)


def _normalized(value: str) -> str:
    return re.sub(r"\s+", "", value).casefold()


def _tokens(value: str) -> set[str]:
    return {
        token.casefold()
        for token in re.findall(r"[A-Za-z0-9+#.]+|[가-힣]{2,}", value)
        if token.casefold() not in _STOP_TOKENS
    }


def _unique(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        normalized = _normalized(value)
        if normalized and normalized not in seen:
            seen.add(normalized)
            result.append(value)
    return result

