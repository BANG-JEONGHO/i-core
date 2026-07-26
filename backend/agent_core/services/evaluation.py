"""Deterministic quality checks for matching-agent outputs.

This module does not ask an LLM to judge another LLM.  It checks claims that can
be verified mechanically: quoted evidence must be present in the original text,
and positive match scores must cite both the project and instructor documents.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from agent_core.schemas import EvidenceRef, MergedMatchResult


@dataclass(frozen=True)
class EvaluationMetrics:
    """Aggregate metrics calculated across one or more Golden Set cases."""

    citation_accuracy: float
    unsupported_claim_rate: float
    required_condition_accuracy: float
    final_status_accuracy: float


def _normalized(text: str) -> str:
    """Ignore harmless whitespace changes introduced by document extraction."""
    return " ".join(text.split())


def all_evidence(result: MergedMatchResult) -> list[EvidenceRef]:
    """Collect and de-duplicate every evidence reference from agents A and B."""
    unique: dict[tuple[str, int | None, str], EvidenceRef] = {}

    for score_items in (
        result.analysis.score_items,
        result.verification.corrected_score_items,
    ):
        for item in score_items:
            for evidence in [*item.project_evidence, *item.instructor_evidence]:
                key = (evidence.source_document_id, evidence.page, evidence.quote)
                unique[key] = evidence

    return list(unique.values())


def calculate_citation_accuracy(
    result: MergedMatchResult,
    source_documents: dict[str, str],
) -> float:
    """Return the proportion of returned quotes that occur in their source text."""
    evidence_items = all_evidence(result)
    if not evidence_items:
        return 0.0

    valid_count = 0
    for evidence in evidence_items:
        original_text = source_documents.get(evidence.source_document_id, "")
        if _normalized(evidence.quote) in _normalized(original_text):
            valid_count += 1

    return valid_count / len(evidence_items)


def calculate_unsupported_claim_rate(result: MergedMatchResult) -> float:
    """Return the fraction of positive match scores lacking either side's evidence.

    ``evidence_completeness`` is excluded because it is specifically allowed to
    describe missing evidence.  A score of zero is also excluded: a rejection can
    be based on a documented requirement even when the instructor has no evidence.
    """
    scored_items = [
        item
        for item in result.analysis.score_items
        if item.criterion != "evidence_completeness" and item.score > 0
    ]
    if not scored_items:
        return 0.0

    unsupported_count = sum(
        not item.project_evidence or not item.instructor_evidence
        for item in scored_items
    )
    return unsupported_count / len(scored_items)


def calculate_metrics(
    results: Iterable[tuple[MergedMatchResult, dict]],
) -> EvaluationMetrics:
    """Compare matching results with human-labelled Golden Set expectations."""
    rows = list(results)
    if not rows:
        raise ValueError("At least one Golden Set result is required.")

    citation_scores: list[float] = []
    unsupported_rates: list[float] = []
    required_condition_matches = 0
    final_status_matches = 0

    for result, expected in rows:
        citation_scores.append(
            calculate_citation_accuracy(result, expected["source_documents"])
        )
        unsupported_rates.append(calculate_unsupported_claim_rate(result))

        if (
            result.verification.required_conditions_passed
            == expected["required_conditions_passed"]
        ):
            required_condition_matches += 1

        if result.final_status.value == expected["final_status"]:
            final_status_matches += 1

    total = len(rows)
    return EvaluationMetrics(
        citation_accuracy=sum(citation_scores) / total,
        unsupported_claim_rate=sum(unsupported_rates) / total,
        required_condition_accuracy=required_condition_matches / total,
        final_status_accuracy=final_status_matches / total,
    )


def assert_quality_thresholds(metrics: EvaluationMetrics) -> None:
    """Fail a test when the agreed quality gate is not met."""
    assert metrics.citation_accuracy == 1.0, "All quotes must be found in source text."
    assert metrics.unsupported_claim_rate == 0.0, "Positive match scores need both evidence types."
    assert metrics.required_condition_accuracy >= 0.95
    assert metrics.final_status_accuracy >= 0.90

