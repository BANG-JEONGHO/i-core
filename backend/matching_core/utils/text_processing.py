"""텍스트 처리 유틸리티."""

from __future__ import annotations

import json
import re
from pathlib import Path

import structlog

logger = structlog.get_logger()

# 불용어 목록 로드
_STOPWORDS: set[str] | None = None
_SYNONYMS: dict[str, list[str]] | None = None


def _load_stopwords() -> set[str]:
    """불용어 목록을 로드합니다."""
    global _STOPWORDS
    if _STOPWORDS is not None:
        return _STOPWORDS

    stopwords_path = Path(__file__).parent.parent / "data" / "stopwords.json"
    try:
        with open(stopwords_path, encoding="utf-8") as f:
            _STOPWORDS = set(json.load(f))
    except FileNotFoundError:
        logger.warning("stopwords_file_not_found", path=str(stopwords_path))
        _STOPWORDS = set()
    return _STOPWORDS


def _load_synonyms() -> dict[str, list[str]]:
    """동의어 사전을 로드합니다."""
    global _SYNONYMS
    if _SYNONYMS is not None:
        return _SYNONYMS

    synonyms_path = Path(__file__).parent.parent / "data" / "synonyms.json"
    try:
        with open(synonyms_path, encoding="utf-8") as f:
            _SYNONYMS = json.load(f)
    except FileNotFoundError:
        logger.warning("synonyms_file_not_found", path=str(synonyms_path))
        _SYNONYMS = {}
    return _SYNONYMS


def clean_text(text: str) -> str:
    """텍스트를 정제합니다.

    - 불필요한 공백 제거
    - 특수문자 정리
    - 연속 공백을 단일 공백으로 변환
    """
    # 탭을 공백으로 변환
    text = text.replace("\t", " ")
    # 연속 공백을 단일 공백으로
    text = re.sub(r" {2,}", " ", text)
    # 연속 줄바꿈을 2개로 제한
    text = re.sub(r"\n{3,}", "\n\n", text)
    # 앞뒤 공백 제거
    text = text.strip()
    return text


def extract_keywords(text: str) -> list[str]:
    """텍스트에서 핵심 키워드를 추출합니다.

    정규표현식 기반으로 한국어/영어 명사구를 추출합니다.
    """
    stopwords = _load_stopwords()

    # 한국어 명사구 패턴 (2글자 이상)
    korean_pattern = re.compile(r"[가-힣]{2,}")
    # 영어 단어 패턴 (2글자 이상)
    english_pattern = re.compile(r"[A-Za-z]{2,}")
    # 복합 명사 (한글+영문 혼합, 예: "AI개발")
    mixed_pattern = re.compile(r"[A-Za-z]+[가-힣]+|[가-힣]+[A-Za-z]+")

    keywords: list[str] = []

    # 복합 명사 먼저 추출
    for match in mixed_pattern.finditer(text):
        word = match.group()
        if word.lower() not in stopwords and len(word) >= 2:
            keywords.append(word)

    # 한국어 키워드 추출
    for match in korean_pattern.finditer(text):
        word = match.group()
        if word not in stopwords and len(word) >= 2:
            keywords.append(word)

    # 영어 키워드 추출
    for match in english_pattern.finditer(text):
        word = match.group()
        if word.lower() not in stopwords and len(word) >= 2:
            keywords.append(word.lower())

    # 중복 제거 (순서 유지)
    seen: set[str] = set()
    unique_keywords: list[str] = []
    for kw in keywords:
        kw_lower = kw.lower()
        if kw_lower not in seen:
            seen.add(kw_lower)
            unique_keywords.append(kw)

    return unique_keywords


def expand_with_synonyms(keywords: list[str]) -> list[str]:
    """동의어를 포함하여 키워드를 확장합니다."""
    synonyms = _load_synonyms()
    expanded: set[str] = set(kw.lower() for kw in keywords)

    for keyword in keywords:
        kw_lower = keyword.lower()
        # 동의어 사전에서 확장
        for canonical, syn_list in synonyms.items():
            all_forms = [canonical.lower()] + [s.lower() for s in syn_list]
            if kw_lower in all_forms:
                expanded.update(all_forms)

    return list(expanded)


def extract_numbers(text: str) -> list[float]:
    """텍스트에서 숫자를 추출합니다 (경력 연수, 배점 등)."""
    pattern = re.compile(r"(\d+(?:\.\d+)?)")
    return [float(m.group()) for m in pattern.finditer(text)]
