"""매칭 엔진 기본 인터페이스."""

from __future__ import annotations

from abc import ABC, abstractmethod

from matching_core.models.entities import Instructor, MatchScore, TaskRequirements


class MatchingStrategy(ABC):
    """매칭 전략 인터페이스.

    전략 패턴으로 단계별 매칭 알고리즘을 교체/추가할 수 있습니다.
    """

    @abstractmethod
    def calculate_score(
        self, requirements: TaskRequirements, instructor: Instructor
    ) -> float:
        """단일 강사에 대한 점수를 계산합니다.

        Args:
            requirements: 과업지시서 요구사항
            instructor: 대상 강사

        Returns:
            float: 계산된 점수 (0~100 범위 내)
        """
        ...
