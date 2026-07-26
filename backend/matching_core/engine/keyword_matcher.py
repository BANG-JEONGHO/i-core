"""키워드 기반 매칭."""

from __future__ import annotations

import structlog

from matching_core.config import SCORING_WEIGHTS
from matching_core.engine.base import MatchingStrategy
from matching_core.models.entities import Instructor, ScoreBreakdown, TaskRequirements
from matching_core.utils.text_processing import expand_with_synonyms

logger = structlog.get_logger()


class KeywordMatcher(MatchingStrategy):
    """키워드 기반 매칭 전략.

    과업지시서 키워드와 강사 키워드의 일치율로 점수를 계산합니다.
    동의어 확장을 지원합니다.
    """

    def calculate_score(
        self, requirements: TaskRequirements, instructor: Instructor
    ) -> float:
        """키워드 매칭 점수를 계산합니다."""
        result = self.calculate_detailed(requirements, instructor)
        return result.score

    def calculate_detailed(
        self, requirements: TaskRequirements, instructor: Instructor
    ) -> ScoreBreakdown:
        """키워드 매칭 상세 점수를 반환합니다."""
        max_score = SCORING_WEIGHTS["keyword"]

        # 과업지시서에서 키워드 수집
        requirement_keywords: set[str] = set()
        for qual in requirements.qualifications:
            requirement_keywords.update(kw.lower() for kw in qual.keywords)
        for crit in requirements.evaluation_criteria:
            requirement_keywords.update(kw.lower() for kw in crit.keywords)

        if not requirement_keywords:
            # 키워드가 없으면 점수 0
            return ScoreBreakdown(
                criterion="키워드 매칭",
                score=0.0,
                max_score=max_score,
                reason="과업지시서에서 키워드를 추출하지 못했습니다.",
                matched_keywords=[],
            )

        # 동의어 확장
        expanded_req_keywords = set(expand_with_synonyms(list(requirement_keywords)))

        # 강사 키워드 (동의어 확장 포함)
        instructor_keywords = set(kw.lower() for kw in instructor.keywords)
        expanded_instr_keywords = set(expand_with_synonyms(list(instructor_keywords)))

        # 일치 키워드 계산
        matched = expanded_req_keywords & expanded_instr_keywords

        # 부분 일치도 확인 (포함 관계)
        partial_matches: set[str] = set()
        for req_kw in expanded_req_keywords:
            for instr_kw in expanded_instr_keywords:
                if (
                    req_kw in instr_kw or instr_kw in req_kw
                ) and req_kw not in matched:
                    partial_matches.add(req_kw)

        # 점수 계산: 완전 일치(1.0) + 부분 일치(0.5)
        total_keywords = len(expanded_req_keywords)
        if total_keywords == 0:
            score = 0.0
        else:
            match_ratio = (len(matched) + len(partial_matches) * 0.5) / total_keywords
            score = round(min(match_ratio * max_score, max_score), 1)

        all_matched = list(matched | partial_matches)

        return ScoreBreakdown(
            criterion="키워드 매칭",
            score=score,
            max_score=max_score,
            reason=f"{len(matched)}개 완전 일치, {len(partial_matches)}개 부분 일치 (총 {total_keywords}개 중)",
            matched_keywords=all_matched[:20],  # 최대 20개
        )
