# 코드 생성 계획 — unit-matching-core

## 유닛 컨텍스트
- **유닛**: unit-matching-core (매칭 엔진 + 문서 파서)
- **기술**: Python 3.11+, pdfplumber, python-docx, python-hwp
- **프로젝트 경로**: `instructor-matching-core/`
- **관련 스토리**: US-10, US-11, US-12, US-13, US-15, US-16, US-17, US-18, US-19
- **의존**: 없음 (독립 패키지)
- **피의존**: unit-backend (pip install -e)

---

## 코드 생성 순서

### Step 1: 프로젝트 구조 설정
- [x] `instructor-matching-core/` 루트 디렉토리 생성
- [x] `pyproject.toml` 생성 (패키지 메타데이터, 의존성)
- [x] `requirements.txt` 생성 (핀 고정 버전)
- [x] 디렉토리 구조 생성 (matching_core/, tests/)

### Step 2: 도메인 모델 구현
- [x] `matching_core/models/entities.py` — 도메인 엔티티 (dataclass)
- [x] `matching_core/exceptions.py` — 커스텀 예외 클래스
- [x] `matching_core/config.py` — 설정값 (가중치, 파서 설정)

### Step 3: 유틸리티 모듈 구현
- [x] `matching_core/utils/text_processing.py` — 텍스트 정제, 키워드 추출
- [x] `matching_core/utils/validation.py` — 파일 검증 (크기, 형식, magic bytes)
- [x] `matching_core/data/synonyms.json` — 동의어 사전
- [x] `matching_core/data/stopwords.json` — 불용어 목록

### Step 4: Document Parser 구현
- [x] `matching_core/parser/base.py` — 파서 인터페이스 (ABC)
- [x] `matching_core/parser/pdf_parser.py` — PDF 파서
- [x] `matching_core/parser/hwp_parser.py` — HWP 파서
- [x] `matching_core/parser/docx_parser.py` — DOCX 파서
- [x] `matching_core/parser/extractor.py` — 섹션 식별 + 참여자격/평가기준 추출
- [x] `matching_core/parser/__init__.py` — 파서 팩토리

### Step 5: Matching Engine 구현
- [x] `matching_core/engine/base.py` — 매칭 전략 인터페이스 (ABC)
- [x] `matching_core/engine/keyword_matcher.py` — 키워드 매칭
- [x] `matching_core/engine/rule_scorer.py` — 규칙 기반 가중치 점수
- [x] `matching_core/engine/score_combiner.py` — 점수 결합 및 정렬
- [x] `matching_core/engine/reason_generator.py` — 매칭 근거 생성
- [x] `matching_core/engine/__init__.py` — 엔진 팩토리

### Step 6: Public API 및 패키지 초기화
- [x] `matching_core/__init__.py` — Public API export
- [x] `matching_core/parser/__init__.py` 완성
- [x] `matching_core/engine/__init__.py` 완성

### Step 7: 단위 테스트
- [x] `tests/conftest.py` — 테스트 픽스처
- [x] `tests/test_parser/test_extractor.py` — 섹션/키워드 추출 테스트
- [x] `tests/test_parser/test_pdf_parser.py` — PDF 파서 테스트 (extractor에 포함)
- [x] `tests/test_engine/test_keyword_matcher.py` — 키워드 매칭 테스트
- [x] `tests/test_engine/test_rule_scorer.py` — 점수 계산 테스트 (combiner에 포함)
- [x] `tests/test_engine/test_score_combiner.py` — 점수 결합 테스트
- [x] `tests/test_properties.py` — PBT 테스트 (hypothesis)

### Step 8: 문서 및 정리
- [x] `instructor-matching-core/README.md` — 패키지 사용법

---

## 예상 파일 수: ~25개
## 스토리 커버리지: US-10~12 (파싱), US-15~16 (매칭)
