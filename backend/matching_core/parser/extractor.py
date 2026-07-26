"""섹션 식별 및 정보 추출."""

from __future__ import annotations

import re

import structlog

from matching_core.config import (
    MANDATORY_KEYWORDS,
    PREFERRED_KEYWORDS,
    SECTION_PATTERNS,
)
from matching_core.models.entities import (
    DocumentSection,
    EvaluationCriterion,
    ParsedDocument,
    Qualification,
    SectionType,
    TaskRequirements,
)
from matching_core.utils.text_processing import extract_keywords

logger = structlog.get_logger()


def identify_sections(document: ParsedDocument) -> ParsedDocument:
    """문서에서 섹션을 식별합니다.

    Args:
        document: 파싱된 문서 (raw_text가 있어야 함)

    Returns:
        ParsedDocument: 섹션이 식별된 문서
    """
    text = document.raw_text
    sections: list[DocumentSection] = []

    # 모든 섹션 패턴에 대해 위치 찾기
    section_positions: list[tuple[int, str, SectionType]] = []

    for section_type_key, patterns in SECTION_PATTERNS.items():
        section_type = (
            SectionType.QUALIFICATION
            if section_type_key == "qualification"
            else SectionType.EVALUATION
        )
        for pattern in patterns:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                section_positions.append((match.start(), match.group(), section_type))

    # 위치 순서로 정렬
    section_positions.sort(key=lambda x: x[0])

    # 각 섹션의 내용 추출 (현재 헤더부터 다음 헤더까지)
    for i, (pos, title, section_type) in enumerate(section_positions):
        # 다음 섹션 시작 위치 또는 문서 끝
        if i + 1 < len(section_positions):
            end_pos = section_positions[i + 1][0]
        else:
            end_pos = len(text)

        content = text[pos:end_pos].strip()
        # 제목 부분 제거
        content = content[len(title):].strip()

        sections.append(
            DocumentSection(
                title=title,
                content=content,
                section_type=section_type,
            )
        )

    # 섹션을 식별하지 못한 경우 전체 텍스트를 OTHER로
    if not sections:
        logger.warning("no_sections_identified", text_length=len(text))
        sections.append(
            DocumentSection(
                title="전체 문서",
                content=text,
                section_type=SectionType.OTHER,
            )
        )

    document.sections = sections
    logger.info("sections_identified", count=len(sections))
    return document


def extract_qualifications(document: ParsedDocument) -> list[Qualification]:
    """문서에서 참여자격/신청자격을 추출합니다."""
    qualifications: list[Qualification] = []

    qualification_sections = [
        s for s in document.sections if s.section_type == SectionType.QUALIFICATION
    ]

    # 자격 섹션이 없으면 전체 텍스트에서 시도
    if not qualification_sections:
        qualification_sections = [
            s for s in document.sections if s.section_type == SectionType.OTHER
        ]

    for section in qualification_sections:
        items = _split_into_items(section.content)
        for item in items:
            qualification = _parse_qualification_item(item)
            if qualification:
                qualifications.append(qualification)

    logger.info("qualifications_extracted", count=len(qualifications))
    return qualifications


def extract_evaluation_criteria(document: ParsedDocument) -> list[EvaluationCriterion]:
    """문서에서 평가기준을 추출합니다."""
    criteria: list[EvaluationCriterion] = []

    evaluation_sections = [
        s for s in document.sections if s.section_type == SectionType.EVALUATION
    ]

    if not evaluation_sections:
        evaluation_sections = [
            s for s in document.sections if s.section_type == SectionType.OTHER
        ]

    for section in evaluation_sections:
        items = _split_into_items(section.content)
        for item in items:
            criterion = _parse_evaluation_item(item)
            if criterion:
                criteria.append(criterion)

    logger.info("evaluation_criteria_extracted", count=len(criteria))
    return criteria


def extract_task_requirements(document: ParsedDocument) -> TaskRequirements:
    """문서에서 전체 요구사항을 추출합니다."""
    document = identify_sections(document)
    qualifications = extract_qualifications(document)
    evaluation_criteria = extract_evaluation_criteria(document)

    return TaskRequirements(
        qualifications=qualifications,
        evaluation_criteria=evaluation_criteria,
        raw_text=document.raw_text,
    )


def _split_into_items(text: str) -> list[str]:
    """텍스트를 개별 항목으로 분리합니다."""
    # 번호 매기기 패턴으로 분리
    # 예: 1. / 1) / ① / - / ・ / ■
    pattern = re.compile(
        r"(?:^|\n)\s*(?:\d+[\.\)]\s*|[①②③④⑤⑥⑦⑧⑨⑩]\s*|[-·■□●○]\s*)"
    )

    parts = pattern.split(text)
    items = [part.strip() for part in parts if part.strip() and len(part.strip()) > 5]

    # 패턴 매칭 실패 시 줄 단위로 분리
    if not items:
        items = [
            line.strip()
            for line in text.split("\n")
            if line.strip() and len(line.strip()) > 5
        ]

    return items


def _parse_qualification_item(item: str) -> Qualification | None:
    """개별 자격 항목을 파싱합니다."""
    if len(item) < 5:
        return None

    # 카테고리 분류
    category = _classify_qualification_category(item)

    # 필수/우대 구분
    is_mandatory = _is_mandatory(item)

    # 키워드 추출
    keywords = extract_keywords(item)

    return Qualification(
        category=category,
        description=item,
        is_mandatory=is_mandatory,
        keywords=keywords,
    )


def _parse_evaluation_item(item: str) -> EvaluationCriterion | None:
    """개별 평가기준 항목을 파싱합니다."""
    if len(item) < 5:
        return None

    # 카테고리 분류
    category = _classify_evaluation_category(item)

    # 배점 추출
    weight = _extract_weight(item)

    # 키워드 추출
    keywords = extract_keywords(item)

    return EvaluationCriterion(
        category=category,
        description=item,
        weight=weight,
        keywords=keywords,
    )


def _classify_qualification_category(text: str) -> str:
    """자격 카테고리를 분류합니다."""
    text_lower = text.lower()
    if any(k in text_lower for k in ["학력", "학위", "졸업", "학사", "석사", "박사"]):
        return "학력"
    if any(k in text_lower for k in ["경력", "년 이상", "년이상", "경험"]):
        return "경력"
    if any(k in text_lower for k in ["자격증", "기사", "기술사", "산업기사", "자격"]):
        return "자격증"
    if any(k in text_lower for k in ["지역", "소재", "근무지"]):
        return "지역"
    return "기타"


def _classify_evaluation_category(text: str) -> str:
    """평가 카테고리를 분류합니다."""
    text_lower = text.lower()
    if any(k in text_lower for k in ["기술", "기술평가", "기술점수"]):
        return "기술평가"
    if any(k in text_lower for k in ["가격", "입찰가격", "금액"]):
        return "입찰가격"
    if any(k in text_lower for k in ["경력", "경력평가", "실적"]):
        return "경력평가"
    if any(k in text_lower for k in ["제안", "제안서", "발표"]):
        return "제안평가"
    return "기타"


def _is_mandatory(text: str) -> bool:
    """필수 여부를 판단합니다."""
    # 우대 키워드가 있으면 비필수
    if any(kw in text for kw in PREFERRED_KEYWORDS):
        return False
    # 필수 키워드가 있으면 필수
    if any(kw in text for kw in MANDATORY_KEYWORDS):
        return True
    # 기본값: 필수
    return True


def _extract_weight(text: str) -> float | None:
    """배점/가중치를 추출합니다."""
    # 패턴: "30점", "30%", "배점: 30"
    patterns = [
        r"(\d+(?:\.\d+)?)\s*점",
        r"(\d+(?:\.\d+)?)\s*%",
        r"배점\s*:?\s*(\d+(?:\.\d+)?)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return float(match.group(1))
    return None
