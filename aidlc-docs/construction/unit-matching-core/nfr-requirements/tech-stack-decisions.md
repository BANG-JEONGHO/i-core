# 기술 스택 결정 — unit-matching-core

## 핵심 기술

| 카테고리 | 선택 | 버전 | 근거 |
|---|---|---|---|
| 언어 | Python | 3.11+ | FastAPI 호환, AI/ML 생태계 |
| 패키지 관리 | pip + pyproject.toml | - | 표준 Python 패키징 |
| PDF 파싱 | pdfplumber | 0.10.x | 테이블/레이아웃 인식 우수 |
| DOCX 파싱 | python-docx | 1.1.x | 표준 Word 파서 |
| HWP 파싱 | python-hwp | 0.3.x | 한글 파일 파싱 (hwp5 기반) |
| 텍스트 처리 | re (내장) | - | 정규표현식 기반 섹션 추출 |
| 키워드 추출 | konlpy (Okt) | 0.6.x | 한국어 형태소 분석 |
| 로깅 | structlog | 24.x | 구조화된 로깅 |
| 테스트 | pytest | 8.x | 표준 테스트 프레임워크 |
| PBT | hypothesis | 6.x | 속성 기반 테스팅 |
| 타입 체크 | mypy | 1.x | 정적 타입 검증 |

## 의존성 목록 (requirements.txt)

```
# Core parsing
pdfplumber==0.10.4
python-docx==1.1.2
python-hwp==0.3.2

# Korean NLP
konlpy==0.6.0

# Logging
structlog==24.4.0

# Dev/Test
pytest==8.3.3
hypothesis==6.112.0
mypy==1.11.0
```

## 설계 결정

### D-01: 외부 API 의존 없음 (1단계)
- 1단계는 OpenAI API 등 외부 서비스 의존 없이 동작
- 로컬 환경에서 인터넷 없이 완전 동작 가능
- 2단계에서 선택적으로 AI API 추가

### D-02: 패키지 형태로 배포
- `pip install -e .` 로 Backend에서 로컬 설치
- pyproject.toml에 패키지 메타데이터 정의
- public API를 `__init__.py`에 명시적 export

### D-03: HWP 파싱 대안
- python-hwp가 모든 HWP 버전을 지원하지 않을 수 있음
- 대안 1: pyhwp (olefile 기반)
- 대안 2: LibreOffice 헤드리스 변환 (hwp → pdf → pdfplumber)
- 구현 시 여러 방식 시도 후 가장 안정적인 방식 선택

### D-04: konlpy 의존성
- konlpy는 Java 런타임 필요 (Okt 형태소 분석기)
- 대안: 순수 Python 기반 키워드 추출 (정규식 + 불용어 사전)
- 1단계에서는 정규식 기반으로 시작, 필요시 konlpy 추가

### D-05: 동의어 사전
- 간단한 JSON 파일 기반 동의어 사전
- 파일 위치: `matching_core/data/synonyms.json`
- 사용자가 수동으로 추가/편집 가능
