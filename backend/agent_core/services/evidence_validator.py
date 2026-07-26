"""Mechanical evidence and mandatory-condition checks after LLM analysis."""

from __future__ import annotations

import re

from agent_core.schemas import (
    GroundingValidation,
    InstructorProfile,
    MatchAnalysis,
    ProjectProfile,
    RAGContext,
    RequiredConditionCheck,
    VerificationResult,
)


def validate_grounding(
    project: ProjectProfile,
    instructor: InstructorProfile,
    analysis: MatchAnalysis,
    verification: VerificationResult,
    context: RAGContext,
) -> GroundingValidation:
    """Verify quotes against retrieved chunks and exact certificate requirements."""
    source_parts: dict[str, list[str]] = {}
    for item in [*context.project_evidence, *context.instructor_evidence]:
        source_parts.setdefault(item.evidence.source_document_id, []).append(item.evidence.quote)
    source_texts = {
        document_id: "\n".join(parts)
        for document_id, parts in source_parts.items()
    }
    all_items = [*analysis.score_items, *verification.corrected_score_items]
    evidence = [
        reference
        for item in all_items
        for reference in [*item.project_evidence, *item.instructor_evidence]
    ]
    valid = sum(_quote_exists(reference.quote, source_texts.get(reference.source_document_id, "")) for reference in evidence)
    invalid = len(evidence) - valid
    positive_items = [item for item in analysis.score_items if item.criterion != "evidence_completeness" and item.score > 0]
    unsupported = sum(not item.project_evidence or not item.instructor_evidence for item in positive_items)
    checks = _required_condition_checks(project, instructor)

    if invalid or any(check.status == "failed" for check in checks):
        verdict = "FAIL"
    elif (
        not evidence
        or unsupported
        or any(check.status == "not_automatically_verifiable" for check in checks)
    ):
        verdict = "REVIEW"
    else:
        verdict = "PASS"
    return GroundingValidation(
        citation_accuracy=valid / len(evidence) if evidence else 0.0,
        invalid_citation_count=invalid,
        unsupported_positive_score_count=unsupported,
        required_condition_checks=checks,
        verdict=verdict,
    )


def _required_condition_checks(project: ProjectProfile, instructor: InstructorProfile) -> list[RequiredConditionCheck]:
    requirements = project.education.instructor_requirements
    certificates = [certificate.name for certificate in instructor.certifications]
    certificates.extend(instructor.vendor_certifications)
    checks = [
        _exact_check(value, "certification", certificates)
        for value in requirements.required_certifications
    ]
    checks.extend(
        _exact_check(value, "vendor_credential", certificates)
        for value in requirements.required_vendor_credentials
    )
    checks.extend(
        RequiredConditionCheck(
            requirement=value,
            condition_type="experience",
            status="not_automatically_verifiable",
            detail="Experience requirements need human or model review unless a numeric rule is configured.",
        )
        for value in requirements.required_experience
    )
    return checks


def _exact_check(requirement: str, condition_type: str, actual_values: list[str]) -> RequiredConditionCheck:
    found = any(_normalized(requirement) == _normalized(value) for value in actual_values)
    return RequiredConditionCheck(
        requirement=requirement,
        condition_type=condition_type,  # type: ignore[arg-type]
        status="verified" if found else "failed",
        detail="Exact credential found in instructor profile." if found else "Required credential not found in instructor profile.",
    )


def _quote_exists(quote: str, source_text: str) -> bool:
    return _normalized(quote) in _normalized(source_text)


def _normalized(value: str) -> str:
    return re.sub(r"\s+", "", value).casefold()
