# NFR 설계 — unit-matching-core

## 개요
NFR 요구사항을 구체적인 설계 패턴과 구현 전략으로 변환합니다.

---

## 1. 성능 설계

### 1.1 문서 파싱 최적화
- **스트리밍 파싱**: 대용량 PDF를 페이지 단위로 처리 (전체 메모리 적재 방지)
- **조기 종료**: 필요한 섹션(참여자격, 평가기준)을 찾으면 나머지 페이지 스킵
- **텍스트 캐싱**: 동일 파일 재파싱 방지 (해시 기반 캐시)

### 1.2 매칭 계산 최적화
- **사전 인덱싱**: 강사 키워드를 역인덱스 형태로 사전 구축
- **벡터화**: numpy 배열 기반 일괄 점수 계산 (루프 최소화)
- **프로파일 기준**: 108명 기준 2초 이내, 500명 기준 5초 이내 목표

### 1.3 메모리 관리
- 파일 파싱 후 원본 바이너리 즉시 해제
- 대용량 텍스트는 제너레이터 패턴으로 처리
- 최대 메모리 사용: 500MB 이내

---

## 2. 보안 설계

### 2.1 입력 검증 (SECURITY-05)
```python
# 파일 검증 체인
validate_file_size(file, max_size=50*1024*1024)  # 50MB
validate_file_extension(file, allowed=['.pdf', '.hwp', '.docx'])
validate_magic_bytes(file)  # 확장자 위조 방어
sanitize_extracted_text(text)  # XSS 방지용 텍스트 정제
```

### 2.2 구조화된 로깅 (SECURITY-03)
```python
import structlog

logger = structlog.get_logger()

# 로깅 규칙:
# - 파일명: 로깅 허용
# - 파일 내용: 로깅 금지
# - 추출 결과 요약: 로깅 허용 (키워드 개수만)
# - 강사 개인정보: 로깅 금지 (ID만 허용)

logger.info("document_parsed", file_type="PDF", sections_found=3)
logger.info("matching_completed", instructor_count=108, top_score=87.5)
```

### 2.3 에러 처리 (SECURITY-09, SECURITY-15)
```python
# 글로벌 에러 핸들러 패턴
class MatchingCoreError(Exception):
    """Base exception - 사용자에게 안전한 메시지만 포함"""
    def __init__(self, user_message: str, internal_detail: str = ""):
        self.user_message = user_message  # 외부 노출용
        self.internal_detail = internal_detail  # 로그 전용
        
# Fail-closed: 파싱 실패 시 빈 결과 반환 (매칭 진행 안함)
# 리소스 정리: try/finally로 파일 핸들 반드시 해제
```

### 2.4 의존성 보안 (SECURITY-10)
- requirements.txt에 정확한 버전 고정 (==)
- 정기적 `pip audit` 실행 가이드
- 알려진 취약점이 있는 패키지 사용 금지

---

## 3. 신뢰성 설계

### 3.1 파서 폴백 전략
```
PDF 파싱:
  1차: pdfplumber (텍스트 추출)
  실패 → 2차: 기본 PyPDF2 텍스트 추출
  실패 → ParseError 반환

HWP 파싱:
  1차: python-hwp
  실패 → 2차: olefile 기반 직접 추출
  실패 → ParseError 반환

DOCX 파싱:
  1차: python-docx
  실패 → ParseError 반환
```

### 3.2 매칭 안전 장치
- 강사 풀이 비어있으면: 빈 리스트 반환 + 로그 경고
- 과업 요구사항이 비어있으면: 매칭 거부 + 에러 반환
- 점수 계산 중 예외: 해당 강사 건너뛰기 + 로그 기록 (전체 중단 안함)

---

## 4. 유지보수성 설계

### 4.1 전략 패턴 (확장성)
```python
from abc import ABC, abstractmethod

class MatchingStrategy(ABC):
    @abstractmethod
    def calculate_score(self, requirements: TaskRequirements, 
                       instructor: Instructor) -> float:
        pass

class KeywordMatcher(MatchingStrategy):
    """1단계: 키워드 매칭"""
    pass

class RuleScorer(MatchingStrategy):
    """1단계: 규칙 기반 가중치"""
    pass

# 향후 추가:
# class EmbeddingMatcher(MatchingStrategy): ...
# class KnowledgeGraphMatcher(MatchingStrategy): ...
```

### 4.2 설정 외부화
```python
# matching_core/config.py
SCORING_WEIGHTS = {
    "keyword": 40,
    "qualification": 30,
    "experience": 30,
}

PARSER_CONFIG = {
    "max_file_size": 50 * 1024 * 1024,  # 50MB
    "supported_extensions": [".pdf", ".hwp", ".docx"],
    "section_patterns": {...}
}
```

### 4.3 패키지 구조
```
instructor-matching-core/
├── matching_core/
│   ├── __init__.py          # Public API export
│   ├── config.py            # 설정값
│   ├── exceptions.py        # 커스텀 예외
│   ├── parser/
│   │   ├── __init__.py
│   │   ├── base.py          # 파서 인터페이스
│   │   ├── pdf_parser.py
│   │   ├── hwp_parser.py
│   │   ├── docx_parser.py
│   │   └── extractor.py     # 섹션/키워드 추출
│   ├── engine/
│   │   ├── __init__.py
│   │   ├── base.py          # 매칭 전략 인터페이스
│   │   ├── keyword_matcher.py
│   │   ├── rule_scorer.py
│   │   ├── score_combiner.py
│   │   └── reason_generator.py
│   ├── models/
│   │   ├── __init__.py
│   │   └── entities.py      # 도메인 엔티티 (dataclass)
│   ├── data/
│   │   ├── synonyms.json    # 동의어 사전
│   │   └── stopwords.json   # 불용어 목록
│   └── utils/
│       ├── __init__.py
│       ├── text_processing.py
│       └── validation.py
├── tests/
│   ├── test_parser/
│   ├── test_engine/
│   └── conftest.py
├── pyproject.toml
└── requirements.txt
```

---

## 5. 테스트 설계 (PBT Partial)

### 5.1 PBT 적용 대상
```python
# 속성: 점수는 항상 0~100 범위
@given(st.lists(st.floats(min_value=0, max_value=100), min_size=1))
def test_total_score_in_range(scores):
    result = combine_scores(scores)
    assert 0 <= result <= 100

# 속성: 키워드가 더 많이 일치하면 점수가 같거나 높다 (단조성)
@given(keywords_a=st.sets(st.text()), keywords_b=st.sets(st.text()))
def test_more_matches_higher_score(keywords_a, keywords_b):
    if keywords_a.issubset(keywords_b):
        assert score(keywords_b) >= score(keywords_a)
```

### 5.2 단위 테스트 대상
- 파일 형식 감지
- 섹션 식별 (정규표현식 패턴)
- 키워드 추출
- 점수 계산 (경계값)
- 동점 처리 로직

---

## Security Compliance Summary

| 규칙 | 상태 | 적용 내용 |
|---|---|---|
| SECURITY-03 | 준수 | structlog 구조화 로깅, 민감정보 미포함 |
| SECURITY-05 | 준수 | 파일 형식/크기 검증, magic bytes 검증 |
| SECURITY-09 | 준수 | 안전한 에러 메시지, 내부 정보 미노출 |
| SECURITY-10 | 준수 | 버전 고정, pip audit 가이드 |
| SECURITY-15 | 준수 | 모든 I/O에 try/finally, fail-closed 원칙 |
| SECURITY-01 | N/A | 이 유닛에 데이터 저장소 없음 |
| SECURITY-02 | N/A | 이 유닛에 네트워크 인터페이스 없음 |
| SECURITY-04 | N/A | 이 유닛에 HTTP 응답 없음 |
| SECURITY-06 | N/A | 이 유닛에 IAM 정책 없음 |
| SECURITY-07 | N/A | 이 유닛에 네트워크 구성 없음 |
| SECURITY-08 | N/A | 이 유닛에 엔드포인트 없음 (라이브러리) |
| SECURITY-11 | 준수 | 보안 로직 분리 (validation.py), 전략 패턴 |
| SECURITY-12 | N/A | 이 유닛에 인증 없음 |
| SECURITY-13 | 준수 | 의존성 버전 고정, 안전한 역직렬화 |
| SECURITY-14 | N/A | 이 유닛에 모니터링 인프라 없음 (Backend에서 처리) |
