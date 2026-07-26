from __future__ import annotations

from agent_core.schemas import (
    FinalStatus,
    GroundingValidation,
    MatchAnalysis,
    MergedMatchResult,
    VerificationResult,
)


SCORE_DIFFERENCE_REVIEW = 6
SCORE_DIFFERENCE_HOLD = 15
EVIDENCE_REVIEW = 0.70
EVIDENCE_RECOMMEND = 0.90


def merge_results(
    analysis: MatchAnalysis,
    verification: VerificationResult,
    grounding: GroundingValidation | None = None,
) -> MergedMatchResult:
    """Apply the functional-specification merge rules without asking an LLM to decide them."""
    difference = abs(analysis.total_score - verification.independent_score)
    reasons: list[str] = [
        f"A/B score difference: {difference:.1f}",
        f"Evidence coverage: {verification.evidence_coverage:.0%}",
        f"Verifier verdict: {verification.verdict}",
    ]
    if grounding:
        reasons.extend(
            [
                f"Code grounding verdict: {grounding.verdict}",
                f"Citation accuracy: {grounding.citation_accuracy:.0%}",
            ]
        )

    if grounding and grounding.verdict == "FAIL":
        return _result(
            analysis, verification, FinalStatus.ON_HOLD,
            "Code validation found an invalid citation or an unmet exact mandatory condition.", reasons,
            grounding,
        )

    required_failure = (
        analysis.required_conditions_passed is False
        or verification.required_conditions_passed is False
    )
    if required_failure:
        return _result(
            analysis, verification, FinalStatus.ON_HOLD,
            "A required condition is explicitly unmet by the analyst or verifier.", reasons, grounding,
        )
    if verification.verdict == "FAIL" or difference > SCORE_DIFFERENCE_HOLD or verification.evidence_coverage < EVIDENCE_REVIEW:
        return _result(
            analysis, verification, FinalStatus.ON_HOLD,
            "Verification failed, evidence is insufficient, or A/B scores diverge materially.", reasons, grounding,
        )
    if (
        (grounding and grounding.verdict == "REVIEW")
        or verification.verdict == "REVIEW"
        or difference >= SCORE_DIFFERENCE_REVIEW
        or verification.evidence_coverage < EVIDENCE_RECOMMEND
    ):
        return _result(
            analysis, verification, FinalStatus.NEEDS_REVIEW,
            "A reviewer must resolve a verification issue, evidence gap, or score difference.", reasons, grounding,
        )
    return _result(
        analysis, verification, FinalStatus.RECOMMENDED,
        "Evidence, independent verification, and code validation satisfy the recommendation policy.", reasons, grounding,
    )


def _result(
    analysis: MatchAnalysis,
    verification: VerificationResult,
    status: FinalStatus,
    policy_reason: str,
    reasons: list[str],
    grounding: GroundingValidation | None,
) -> MergedMatchResult:
    return MergedMatchResult(
        final_score=round((analysis.total_score + verification.independent_score) / 2, 2),
        final_status=status,
        reasons=[policy_reason, *reasons],
        analysis=analysis,
        verification=verification,
        grounding=grounding,
    )

