"""강사 매칭 코어 라이브러리.

과업지시서 문서를 파싱하고, 강사 매칭을 수행하는 핵심 비즈니스 로직 패키지입니다.

Usage:
    from matching_core import parse_and_extract, match_instructors

    # 1. 과업지시서 파싱
    requirements = parse_and_extract(file_content, "과업지시서.pdf")

    # 2. 강사 매칭
    results = match_instructors(requirements, instructors)
"""

from matching_core.engine.reason_generator import ReasonGenerator
from matching_core.engine.score_combiner import ScoreCombiner
from matching_core.models.entities import (
    EvaluationCriterion,
    FileType,
    Instructor,
    MatchReason,
    MatchScore,
    ParsedDocument,
    Qualification,
    ScoreBreakdown,
    TaskRequirements,
)
from matching_core.parser import parse_and_extract, parse_document

__version__ = "0.1.0"

# 간편 API
_combiner = ScoreCombiner()
_reason_generator = ReasonGenerator()


def match_instructors(
    requirements: TaskRequirements,
    instructors: list[Instructor],
) -> list[MatchScore]:
    """강사 매칭을 수행합니다.

    Args:
        requirements: 과업지시서에서 추출된 요구사항
        instructors: 매칭 대상 강사 목록

    Returns:
        list[MatchScore]: 점수 내림차순 정렬된 매칭 결과
    """
    return _combiner.calculate_match_scores(requirements, instructors)


def generate_match_reasons(
    instructors: list[Instructor],
    scores: list[MatchScore],
    top_n: int | None = None,
) -> list[MatchReason]:
    """매칭 근거를 생성합니다.

    Args:
        instructors: 강사 목록
        scores: 매칭 점수 목록
        top_n: 상위 N명만 생성 (None이면 전체)

    Returns:
        list[MatchReason]: 매칭 근거 목록
    """
    return _reason_generator.generate_batch(instructors, scores, top_n)


__all__ = [
    # Public API
    "parse_document",
    "parse_and_extract",
    "match_instructors",
    "generate_match_reasons",
    # Models
    "FileType",
    "ParsedDocument",
    "Qualification",
    "EvaluationCriterion",
    "TaskRequirements",
    "Instructor",
    "MatchScore",
    "ScoreBreakdown",
    "MatchReason",
    # Version
    "__version__",
]
