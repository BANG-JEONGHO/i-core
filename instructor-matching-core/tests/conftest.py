"""테스트 픽스처."""

import pytest

from matching_core.models.entities import (
    EvaluationCriterion,
    Instructor,
    Qualification,
    TaskRequirements,
)


@pytest.fixture
def sample_instructor() -> Instructor:
    """샘플 강사 데이터."""
    return Instructor(
        id="instr-001",
        name="김강사",
        specializations=["인공지능", "데이터분석"],
        subjects=["파이썬 프로그래밍", "머신러닝 기초"],
        experience_years=8,
        certifications=["정보처리기사", "빅데이터분석기사"],
        education="석사 (컴퓨터공학)",
        keywords=["인공지능", "머신러닝", "파이썬", "데이터분석", "딥러닝", "빅데이터"],
    )


@pytest.fixture
def sample_instructors() -> list[Instructor]:
    """샘플 강사 목록."""
    return [
        Instructor(
            id="instr-001",
            name="김강사",
            specializations=["인공지능", "데이터분석"],
            subjects=["파이썬 프로그래밍", "머신러닝 기초"],
            experience_years=8,
            certifications=["정보처리기사", "빅데이터분석기사"],
            education="석사 (컴퓨터공학)",
            keywords=["인공지능", "머신러닝", "파이썬", "데이터분석", "딥러닝"],
        ),
        Instructor(
            id="instr-002",
            name="이강사",
            specializations=["네트워크", "보안"],
            subjects=["네트워크 기초", "정보보안"],
            experience_years=12,
            certifications=["정보보안기사", "네트워크관리사"],
            education="학사 (정보통신)",
            keywords=["네트워크", "보안", "정보보안", "방화벽", "침입탐지"],
        ),
        Instructor(
            id="instr-003",
            name="박강사",
            specializations=["프로젝트관리", "교육"],
            subjects=["리더십", "프로젝트관리"],
            experience_years=15,
            certifications=["PMP"],
            education="박사 (경영학)",
            keywords=["프로젝트관리", "리더십", "경영", "팀관리"],
        ),
    ]


@pytest.fixture
def sample_requirements() -> TaskRequirements:
    """샘플 과업지시서 요구사항."""
    return TaskRequirements(
        qualifications=[
            Qualification(
                category="자격증",
                description="정보처리기사 이상 자격증 보유",
                is_mandatory=True,
                keywords=["정보처리기사"],
            ),
            Qualification(
                category="경력",
                description="관련분야 5년 이상 경력자",
                is_mandatory=True,
                keywords=["5년", "경력"],
            ),
            Qualification(
                category="학력",
                description="학사 이상",
                is_mandatory=True,
                keywords=["학사"],
            ),
        ],
        evaluation_criteria=[
            EvaluationCriterion(
                category="기술평가",
                description="인공지능 및 데이터분석 교육 경험 평가",
                weight=60.0,
                keywords=["인공지능", "데이터분석", "교육"],
            ),
            EvaluationCriterion(
                category="경력평가",
                description="관련분야 강의 실적",
                weight=40.0,
                keywords=["강의", "실적"],
            ),
        ],
        raw_text="인공지능 교육 과정 강사 모집. 참여자격: 정보처리기사 이상, 5년 이상 경력, 학사 이상.",
    )
