"""규칙 기반 가중치 점수 계산."""

from __future__ import annotations

import re

import structlog

from matching_core.config import EDUCATION_HIERARCHY, SCORING_WEIGHTS
from matching_core.engine.base import MatchingStrategy
from matching_core.models.entities import Instructor, ScoreBreakdown, TaskRequirements

logger = structlog.get_logger()


class RuleScorer(MatchingStrategy):
    """규칙 기반 가중치 점수 계산 전략.

    자격증/학력 매칭과 경력 매칭을 점수화합니다.
    """

    def calculate_score(
        self, requirements: TaskRequirements, instructor: Instructor
    ) -> float:
        """규칙 기반 총점을 계산합니다 (자격 + 경력)."""
        qual_result = self.calculate_qualification_score(requirements, instructor)
        exp_result = self.calculate_experience_score(requirements, instructor)
        return round(qual_result.score + exp_result.score, 1)

    def calculate_qualification_score(
        self, requirements: TaskRequirements, instructor: Instructor
    ) -> ScoreBreakdown:
        """자격 매칭 점수를 계산합니다."""
        max_score = SCORING_WEIGHTS["qualification"]

        # 필수 자격 항목만 추출
        mandatory_quals = [
            q for q in requirements.qualifications if q.is_mandatory
        ]

        if not mandatory_quals:
            # 필수 자격이 없으면 만점
            return ScoreBreakdown(
                criterion="자격 매칭",
                score=max_score,
                max_score=max_score,
                reason="필수 자격 요건이 없어 만점 부여",
                matched_keywords=[],
            )

        met_count = 0
        matched_items: list[str] = []

        for qual in mandatory_quals:
            is_met = self._check_qualification_met(qual.category, qual.keywords, instructor)
            if is_met:
                met_count += 1
                matched_items.append(qual.category)

        # 점수 계산
        ratio = met_count / len(mandatory_quals)
        score = round(ratio * max_score, 1)

        return ScoreBreakdown(
            criterion="자격 매칭",
            score=score,
            max_score=max_score,
            reason=f"필수 자격 {met_count}/{len(mandatory_quals)}개 충족",
            matched_keywords=matched_items,
        )

    def calculate_experience_score(
        self, requirements: TaskRequirements, instructor: Instructor
    ) -> ScoreBreakdown:
        """경력 매칭 점수를 계산합니다."""
        max_score = SCORING_WEIGHTS["experience"]

        # 요구 경력 추출
        required_years = self._extract_required_years(requirements)

        if required_years is None or required_years == 0:
            # 경력 요구가 없으면 만점
            return ScoreBreakdown(
                criterion="경력 매칭",
                score=max_score,
                max_score=max_score,
                reason="경력 요건이 없어 만점 부여",
                matched_keywords=[],
            )

        # 경력 비교
        instructor_years = instructor.experience_years
        if instructor_years >= required_years:
            score = max_score
            reason = f"요구 경력 {required_years}년 충족 (보유: {instructor_years}년)"
        else:
            ratio = instructor_years / required_years
            score = round(ratio * max_score, 1)
            reason = f"요구 경력 {required_years}년 미달 (보유: {instructor_years}년)"

        # 전문분야 일치 가산점 (최대 5점 보너스, 총점 초과 불가)
        specialization_bonus = self._calculate_specialization_bonus(
            requirements, instructor
        )
        score = min(score + specialization_bonus, max_score)

        return ScoreBreakdown(
            criterion="경력 매칭",
            score=round(score, 1),
            max_score=max_score,
            reason=reason,
            matched_keywords=[f"경력 {instructor_years}년"],
        )

    def _check_qualification_met(
        self, category: str, keywords: list[str], instructor: Instructor
    ) -> bool:
        """개별 자격 항목 충족 여부를 확인합니다."""
        if category == "자격증":
            # 자격증 매칭 (이름 포함 관계)
            for kw in keywords:
                for cert in instructor.certifications:
                    if kw.lower() in cert.lower() or cert.lower() in kw.lower():
                        return True
            return False

        elif category == "학력":
            # 학력 매칭 (동등 이상)
            required_level = self._get_education_level(keywords)
            instructor_level = self._get_education_level_from_text(instructor.education)
            return instructor_level >= required_level

        elif category == "경력":
            # 경력은 별도 경력 점수에서 처리
            return True

        else:
            # 기타 자격: 키워드 매칭
            instructor_all = " ".join(
                instructor.specializations
                + instructor.subjects
                + instructor.certifications
            ).lower()
            return any(kw.lower() in instructor_all for kw in keywords)

    def _extract_required_years(self, requirements: TaskRequirements) -> int | None:
        """요구 경력 연수를 추출합니다."""
        for qual in requirements.qualifications:
            if qual.category == "경력":
                # "5년 이상", "3년이상" 패턴
                match = re.search(r"(\d+)\s*년", qual.description)
                if match:
                    return int(match.group(1))

        # 전체 텍스트에서 검색
        match = re.search(r"(\d+)\s*년\s*이상", requirements.raw_text)
        if match:
            return int(match.group(1))

        return None

    def _get_education_level(self, keywords: list[str]) -> int:
        """키워드에서 학력 수준을 추출합니다."""
        text = " ".join(keywords).lower()
        for i, level in enumerate(EDUCATION_HIERARCHY):
            if level in text:
                return i
        return 0

    def _get_education_level_from_text(self, education: str) -> int:
        """교육 텍스트에서 학력 수준을 추출합니다."""
        edu_lower = education.lower()
        for i, level in enumerate(EDUCATION_HIERARCHY):
            if level in edu_lower:
                return i
        # 대학, 대학교 등 일반적 표현
        if "박사" in edu_lower:
            return 4
        if "석사" in edu_lower:
            return 3
        if any(kw in edu_lower for kw in ["대학", "학사", "대졸"]):
            return 2
        return 0

    def _calculate_specialization_bonus(
        self, requirements: TaskRequirements, instructor: Instructor
    ) -> float:
        """전문분야 일치 가산점을 계산합니다."""
        # 과업 관련 키워드와 강사 전문분야 비교
        req_keywords = set()
        for crit in requirements.evaluation_criteria:
            req_keywords.update(kw.lower() for kw in crit.keywords)

        instructor_specs = set(s.lower() for s in instructor.specializations)
        instructor_subjects = set(s.lower() for s in instructor.subjects)
        all_instructor = instructor_specs | instructor_subjects

        # 일치하는 전문분야 수에 따라 보너스
        matches = req_keywords & all_instructor
        if len(matches) >= 3:
            return 5.0
        elif len(matches) >= 2:
            return 3.0
        elif len(matches) >= 1:
            return 1.0
        return 0.0
