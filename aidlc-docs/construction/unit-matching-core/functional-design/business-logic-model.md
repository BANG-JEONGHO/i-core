# 비즈니스 로직 모델 — unit-matching-core

## 개요
매칭 코어는 2개의 독립적인 서브시스템으로 구성됩니다:
1. **Document Parser** — 과업지시서 파싱 및 정보 추출
2. **Matching Engine** — 강사 매칭 알고리즘 실행

---

## 1. Document Parser — 비즈니스 로직

### 1.1 파일 형식 감지 흐름

```
입력: 업로드된 파일 바이너리
  → 파일 확장자 확인
  → Magic bytes 검증 (확장자 위조 방지)
  → FileType 반환 (PDF / HWP / DOCX)
  → 지원하지 않는 형식 → ParseError 발생
```

### 1.2 텍스트 추출 흐름

```
입력: 파일 + FileType
  → FileType별 파서 선택 (전략 패턴)
    - PDF: pdfplumber → 페이지별 텍스트 추출
    - HWP: hwp5/olefile → 본문 텍스트 추출
    - DOCX: python-docx → 단락별 텍스트 추출
  → 텍스트 정제 (불필요한 공백/특수문자 제거)
  → ParsedDocument 반환
```

### 1.3 섹션 식별 흐름

```
입력: ParsedDocument.raw_text
  → 과업지시서 표준 섹션 패턴 매칭
    - "참여자격", "신청자격", "입찰참가자격" → QUALIFICATION
    - "평가기준", "기술평가", "배점", "심사기준" → EVALUATION
  → 패턴 매칭 방법:
    - 정규표현식 기반 섹션 헤더 탐색
    - 헤더 발견 → 다음 헤더까지 내용 추출
  → List[DocumentSection] 반환
```

### 1.4 참여자격 추출 흐름

```
입력: QUALIFICATION 타입 섹션들
  → 각 섹션 내용 분석
    - 줄 단위 분리
    - 번호 매기기 패턴 인식 (1., -, ① 등)
    - 각 항목별 카테고리 분류:
      * "학력", "학위" → 학력 카테고리
      * "경력", "년 이상" → 경력 카테고리
      * "자격증", "기사", "기술사" → 자격증 카테고리
    - 필수/우대 구분 ("필수", "반드시" vs "우대", "가점")
  → 각 항목에서 키워드 추출 (명사 추출)
  → List[Qualification] 반환
```

### 1.5 평가기준 추출 흐름

```
입력: EVALUATION 타입 섹션들
  → 각 섹션 내용 분석
    - 표 형식 인식 (배점표)
    - 항목-배점 쌍 추출
    - 카테고리 분류 (기술평가, 입찰가격, 경력평가 등)
  → 배점 숫자 추출 (정규표현식: \d+점, \d+%)
  → 키워드 추출
  → List[EvaluationCriterion] 반환
```

---

## 2. Matching Engine — 비즈니스 로직

### 2.1 전체 매칭 흐름 (1단계)

```
입력: TaskRequirements + List[Instructor]
  → 각 강사에 대해:
    1. 키워드 매칭 점수 계산
    2. 자격 매칭 점수 계산
    3. 경력 매칭 점수 계산
    4. 가중치 적용하여 종합 점수 산출
    5. 점수 상세 내역(breakdown) 기록
  → 종합 점수 내림차순 정렬
  → List[MatchScore] 반환
```

### 2.2 키워드 매칭 점수 계산

```
입력: TaskRequirements.keywords + Instructor.keywords
  → 과업지시서 키워드 집합 (A)
  → 강사 키워드 집합 (B)
  → 일치 키워드: A ∩ B
  → 키워드 점수 = |A ∩ B| / |A| * 가중치(40점)
  → 매칭된 키워드 목록 기록 (근거용)
```

### 2.3 자격 매칭 점수 계산

```
입력: TaskRequirements.qualifications + Instructor
  → 각 필수 자격 항목에 대해:
    - 자격증 요구 → 강사 certifications에서 매칭 확인
    - 학력 요구 → 강사 education에서 매칭 확인
  → 자격 점수 = 충족 항목 수 / 전체 필수 항목 수 * 가중치(30점)
  → 각 항목 충족 여부 기록 (근거용)
```

### 2.4 경력 매칭 점수 계산

```
입력: TaskRequirements (경력 요구) + Instructor.experience_years
  → 요구 경력 추출 (예: "5년 이상" → 5)
  → 강사 경력과 비교:
    - 경력 >= 요구: 만점
    - 경력 < 요구: (경력/요구) * 가중치
  → 전문분야 일치 가산점:
    - 강사 specializations ∩ 과업 분야 키워드 → 추가 점수
  → 경력 점수 = 기본점수 + 가산점 (최대 30점)
```

### 2.5 종합 점수 산출

```
총점 = 키워드 점수(40) + 자격 점수(30) + 경력 점수(30) = 최대 100점

가중치 기본값:
  - 키워드(전문분야) 매칭: 40%
  - 자격증/학력 매칭: 30%
  - 경력 매칭: 30%
```

### 2.6 매칭 근거 생성

```
입력: TaskRequirements + Instructor + MatchScore
  → 강점 식별: 점수가 높은 항목 (>70% 달성)
  → 약점 식별: 점수가 낮은 항목 (<30% 달성)
  → 한줄 요약 생성:
    "[강사명]은 [강점분야]에서 높은 적합도를 보이며, 
     [매칭키워드수]개의 핵심 키워드가 일치합니다."
  → MatchReason 반환
```

---

## 3. 전략 패턴 구조 (확장성)

```
MatchingEngine
├── KeywordMatcher (1단계)
├── RuleScorer (1단계)
├── EmbeddingMatcher (2단계 - 향후)
├── KnowledgeGraphMatcher (3단계 - 향후)
└── AgentVerifier (3단계 - 향후)

각 Matcher는 동일 인터페이스:
  match(task_requirements, instructors) → List[Score]

ScoreCombiner: 여러 Matcher의 점수를 가중 결합
```
