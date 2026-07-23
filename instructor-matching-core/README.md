# Instructor Matching Core (강사 매칭 코어)

과업지시서 문서를 파싱하고, 강사 이력서 데이터 기반으로 최적의 강사를 매칭하는 Python 패키지입니다.

## 설치

```bash
pip install -e .
```

개발 의존성 포함:
```bash
pip install -e ".[dev]"
```

## 사용법

```python
from matching_core import parse_and_extract, match_instructors, generate_match_reasons
from matching_core import Instructor

# 1. 과업지시서 파싱
with open("과업지시서.pdf", "rb") as f:
    requirements = parse_and_extract(f.read(), "과업지시서.pdf")

# 2. 강사 데이터 준비
instructors = [
    Instructor(
        id="001",
        name="김강사",
        specializations=["인공지능"],
        experience_years=8,
        certifications=["정보처리기사"],
        education="석사",
        keywords=["인공지능", "머신러닝", "파이썬"],
    ),
    # ...
]

# 3. 매칭 실행
scores = match_instructors(requirements, instructors)

# 4. 매칭 근거 생성
reasons = generate_match_reasons(instructors, scores, top_n=10)

# 결과 확인
for score in scores[:5]:
    print(f"{score.instructor_id}: {score.total_score}점")
```

## 테스트

```bash
pytest
pytest --cov=matching_core
```

## 구조

```
matching_core/
├── __init__.py          # Public API
├── config.py            # 설정값
├── exceptions.py        # 커스텀 예외
├── parser/              # 문서 파서
│   ├── base.py          # 파서 인터페이스
│   ├── pdf_parser.py    # PDF 파서
│   ├── hwp_parser.py    # HWP 파서
│   ├── docx_parser.py   # DOCX 파서
│   └── extractor.py     # 섹션/키워드 추출
├── engine/              # 매칭 엔진
│   ├── base.py          # 매칭 전략 인터페이스
│   ├── keyword_matcher.py
│   ├── rule_scorer.py
│   ├── score_combiner.py
│   └── reason_generator.py
├── models/              # 도메인 엔티티
│   └── entities.py
├── data/                # 데이터 파일
│   ├── synonyms.json    # 동의어 사전
│   └── stopwords.json   # 불용어 목록
└── utils/               # 유틸리티
    ├── text_processing.py
    └── validation.py
```
