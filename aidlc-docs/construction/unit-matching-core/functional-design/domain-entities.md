# 도메인 엔티티 — unit-matching-core

## 개요
매칭 코어의 내부 도메인 모델입니다. DB 모델이 아닌 비즈니스 로직 처리용 데이터 구조입니다.

---

## Entity: ParsedDocument

과업지시서 파일에서 추출된 원시 파싱 결과

| 필드 | 타입 | 설명 |
|---|---|---|
| raw_text | str | 전체 추출 텍스트 |
| file_type | FileType (PDF/HWP/DOCX) | 원본 파일 형식 |
| sections | List[DocumentSection] | 식별된 섹션 목록 |

---

## Entity: DocumentSection

문서 내 식별된 섹션

| 필드 | 타입 | 설명 |
|---|---|---|
| title | str | 섹션 제목 |
| content | str | 섹션 내용 |
| section_type | SectionType | 섹션 유형 (QUALIFICATION/EVALUATION/OTHER) |
| page_number | Optional[int] | 위치 정보 |

---

## Entity: TaskRequirements

과업지시서에서 추출·구조화된 요구사항

| 필드 | 타입 | 설명 |
|---|---|---|
| qualifications | List[Qualification] | 참여자격/신청자격 목록 |
| evaluation_criteria | List[EvaluationCriterion] | 평가기준 목록 |
| raw_text | str | 원본 텍스트 (참고용) |

---

## Entity: Qualification

개별 참여자격 항목

| 필드 | 타입 | 설명 |
|---|---|---|
| category | str | 자격 카테고리 (학력, 경력, 자격증 등) |
| description | str | 요구 내용 |
| is_mandatory | bool | 필수 여부 |
| keywords | List[str] | 추출된 핵심 키워드 |

---

## Entity: EvaluationCriterion

개별 평가기준 항목

| 필드 | 타입 | 설명 |
|---|---|---|
| category | str | 평가 카테고리 (기술평가, 경력평가 등) |
| description | str | 평가 내용 |
| weight | Optional[float] | 배점/가중치 (있을 경우) |
| keywords | List[str] | 추출된 핵심 키워드 |

---

## Entity: Instructor

매칭 대상 강사 정보 (Backend에서 전달받는 데이터)

| 필드 | 타입 | 설명 |
|---|---|---|
| id | str | 강사 고유 ID |
| name | str | 이름 |
| specializations | List[str] | 전문 분야 |
| subjects | List[str] | 교육 과목 |
| experience_years | int | 경력 연수 |
| certifications | List[str] | 보유 자격증 |
| education | str | 학력 |
| keywords | List[str] | 이력서에서 추출된 키워드 전체 |

---

## Entity: MatchScore

강사별 매칭 점수 결과

| 필드 | 타입 | 설명 |
|---|---|---|
| instructor_id | str | 강사 ID |
| total_score | float | 종합 점수 (0~100) |
| keyword_score | float | 키워드 매칭 점수 |
| qualification_score | float | 자격 매칭 점수 |
| experience_score | float | 경력 매칭 점수 |
| breakdown | List[ScoreBreakdown] | 항목별 점수 상세 |

---

## Entity: ScoreBreakdown

점수 상세 내역 (매칭 근거)

| 필드 | 타입 | 설명 |
|---|---|---|
| criterion | str | 평가 항목 |
| score | float | 해당 항목 점수 |
| max_score | float | 최대 가능 점수 |
| reason | str | 점수 부여 근거 |
| matched_keywords | List[str] | 매칭된 키워드 목록 |

---

## Entity: MatchReason

매칭 근거 요약 (카드 표시용)

| 필드 | 타입 | 설명 |
|---|---|---|
| instructor_id | str | 강사 ID |
| summary | str | 한줄 요약 |
| strengths | List[str] | 강점 항목 |
| weaknesses | List[str] | 부족 항목 |
| score_breakdown | List[ScoreBreakdown] | 상세 점수 |

---

## Enum: FileType
- PDF
- HWP
- DOCX

## Enum: SectionType
- QUALIFICATION (참여자격/신청자격)
- EVALUATION (평가기준)
- OTHER (기타)
