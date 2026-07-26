"""매칭 근거 생성."""

from __future__ import annotations

from matching_core.models.entities import Instructor, MatchReason, MatchScore


class ReasonGenerator:
    """매칭 근거를 생성합니다."""

    def generate(
        self, instructor: Instructor, score: MatchScore
    ) -> MatchReason:
        """강사별 매칭 근거를 생성합니다.

        Args:
            instructor: 강사 정보
            score: 매칭 점수

        Returns:
            MatchReason: 매칭 근거
        """
        strengths: list[str] = []
        weaknesses: list[str] = []

        for breakdown in score.breakdown:
            ratio = breakdown.score / breakdown.max_score if breakdown.max_score > 0 else 0
            if ratio >= 0.7:
                strengths.append(
                    f"{breakdown.criterion}: {breakdown.score}/{breakdown.max_score}점"
                )
            elif ratio < 0.3:
                weaknesses.append(
                    f"{breakdown.criterion}: {breakdown.score}/{breakdown.max_score}점"
                )

        # 한줄 요약 생성
        summary = self._generate_summary(instructor, score, strengths)

        return MatchReason(
            instructor_id=instructor.id,
            summary=summary,
            strengths=strengths,
            weaknesses=weaknesses,
            score_breakdown=score.breakdown,
        )

    def generate_batch(
        self,
        instructors: list[Instructor],
        scores: list[MatchScore],
        top_n: int | None = None,
    ) -> list[MatchReason]:
        """여러 강사의 매칭 근거를 일괄 생성합니다.

        Args:
            instructors: 강사 목록
            scores: 매칭 점수 목록 (정렬된 상태)
            top_n: 상위 N명만 생성 (None이면 전체)

        Returns:
            list[MatchReason]: 매칭 근거 목록
        """
        instructor_map = {i.id: i for i in instructors}
        target_scores = scores[:top_n] if top_n else scores
        reasons: list[MatchReason] = []

        for score in target_scores:
            instructor = instructor_map.get(score.instructor_id)
            if instructor:
                reason = self.generate(instructor, score)
                reasons.append(reason)

        return reasons

    def _generate_summary(
        self,
        instructor: Instructor,
        score: MatchScore,
        strengths: list[str],
    ) -> str:
        """한줄 요약을 생성합니다 (최대 100자)."""
        parts: list[str] = [f"{instructor.name}"]

        if instructor.specializations:
            specs = ", ".join(instructor.specializations[:2])
            parts.append(f"({specs} 전문)")

        parts.append(f"종합 {score.total_score}점")

        if strengths:
            parts.append(f"- {strengths[0].split(':')[0]} 우수")

        summary = " ".join(parts)
        # 100자 제한
        if len(summary) > 100:
            summary = summary[:97] + "..."

        return summary
