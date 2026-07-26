"""점수 결합 및 정렬."""

from __future__ import annotations

import structlog

from matching_core.engine.keyword_matcher import KeywordMatcher
from matching_core.engine.rule_scorer import RuleScorer
from matching_core.models.entities import Instructor, MatchScore, TaskRequirements

logger = structlog.get_logger()


class ScoreCombiner:
    """여러 매칭 전략의 점수를 결합합니다."""

    def __init__(self) -> None:
        self.keyword_matcher = KeywordMatcher()
        self.rule_scorer = RuleScorer()

    def calculate_match_scores(
        self,
        requirements: TaskRequirements,
        instructors: list[Instructor],
    ) -> list[MatchScore]:
        """전체 강사 풀에 대한 매칭 점수를 계산하고 정렬합니다.

        Args:
            requirements: 과업지시서 요구사항
            instructors: 강사 목록

        Returns:
            list[MatchScore]: 점수 내림차순 정렬된 결과
        """
        scores: list[MatchScore] = []

        for instructor in instructors:
            try:
                score = self._calculate_single(requirements, instructor)
                scores.append(score)
            except Exception as e:
                # 개별 강사 계산 실패 시 건너뛰기 (전체 중단 방지)
                logger.warning(
                    "score_calculation_failed",
                    instructor_id=instructor.id,
                    error=str(e),
                )
                scores.append(
                    MatchScore(
                        instructor_id=instructor.id,
                        total_score=0.0,
                    )
                )

        # 정렬: 총점 내림차순 → 경력 내림차순 → 이름 가나다순
        instructor_map = {i.id: i for i in instructors}
        scores.sort(
            key=lambda s: (
                -s.total_score,
                -instructor_map.get(s.instructor_id, Instructor(id="", name="")).experience_years,
                instructor_map.get(s.instructor_id, Instructor(id="", name="")).name,
            )
        )

        logger.info(
            "matching_completed",
            instructor_count=len(instructors),
            top_score=scores[0].total_score if scores else 0,
        )

        return scores

    def _calculate_single(
        self, requirements: TaskRequirements, instructor: Instructor
    ) -> MatchScore:
        """단일 강사에 대한 종합 점수를 계산합니다."""
        # 키워드 매칭
        keyword_detail = self.keyword_matcher.calculate_detailed(
            requirements, instructor
        )

        # 자격 매칭
        qual_detail = self.rule_scorer.calculate_qualification_score(
            requirements, instructor
        )

        # 경력 매칭
        exp_detail = self.rule_scorer.calculate_experience_score(
            requirements, instructor
        )

        # 종합 점수
        total = round(
            keyword_detail.score + qual_detail.score + exp_detail.score, 1
        )
        # 0~100 범위 보장
        total = max(0.0, min(100.0, total))

        return MatchScore(
            instructor_id=instructor.id,
            total_score=total,
            keyword_score=keyword_detail.score,
            qualification_score=qual_detail.score,
            experience_score=exp_detail.score,
            breakdown=[keyword_detail, qual_detail, exp_detail],
        )
