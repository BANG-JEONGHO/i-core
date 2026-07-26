# 도메인 엔티티 — unit-backend

## 개요
Backend의 DB 모델 및 API 스키마 정의입니다.

---

## DB Model: User (사용자)

| 필드 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| id | UUID | PK, auto | 고유 ID |
| username | str | unique, not null | 로그인 ID |
| hashed_password | str | not null | bcrypt 해시된 비밀번호 |
| name | str | not null | 이름 |
| created_at | datetime | auto | 생성일시 |
| is_active | bool | default=True | 활성 여부 |

---

## DB Model: Instructor (강사)

| 필드 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| id | UUID | PK, auto | 고유 ID |
| name | str | not null | 강사명 |
| specializations | JSON | default=[] | 전문 분야 리스트 |
| subjects | JSON | default=[] | 교육 과목 리스트 |
| experience_years | int | default=0 | 경력 연수 |
| certifications | JSON | default=[] | 보유 자격증 리스트 |
| education | str | default="" | 학력 |
| keywords | JSON | default=[] | 추출된 키워드 |
| contact | str | nullable | 연락처 |
| notes | str | nullable | 비고 |
| created_at | datetime | auto | 등록일시 |
| updated_at | datetime | auto | 수정일시 |

---

## DB Model: TaskOrder (과업지시서)

| 필드 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| id | UUID | PK, auto | 고유 ID |
| file_name | str | not null | 원본 파일명 |
| file_path | str | not null | 저장 경로 |
| file_type | str | not null | 파일 형식 (pdf/hwp/docx) |
| raw_text | text | nullable | 추출된 원문 텍스트 |
| qualifications | JSON | default=[] | 추출된 참여자격 |
| evaluation_criteria | JSON | default=[] | 추출된 평가기준 |
| parsed_at | datetime | nullable | 파싱 완료 시각 |
| uploaded_by | UUID | FK(User.id) | 업로드한 사용자 |
| created_at | datetime | auto | 업로드일시 |

---

## DB Model: MatchingResult (매칭 결과)

| 필드 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| id | UUID | PK, auto | 고유 ID |
| task_order_id | UUID | FK(TaskOrder.id) | 과업지시서 ID |
| results | JSON | not null | 매칭 점수 목록 (전체 강사) |
| top_instructors | JSON | default=[] | 상위 강사 ID 목록 |
| executed_by | UUID | FK(User.id) | 실행한 사용자 |
| created_at | datetime | auto | 실행일시 |

---

## API DTO: Auth

### RegisterRequest
| 필드 | 타입 | 검증 |
|---|---|---|
| username | str | min=3, max=50 |
| password | str | min=8, max=100 |
| name | str | min=1, max=50 |

### LoginRequest
| 필드 | 타입 | 검증 |
|---|---|---|
| username | str | required |
| password | str | required |

### TokenResponse
| 필드 | 타입 | 설명 |
|---|---|---|
| access_token | str | JWT 토큰 |
| token_type | str | "bearer" |

### UserResponse
| 필드 | 타입 |
|---|---|
| id | UUID |
| username | str |
| name | str |

---

## API DTO: Instructor

### InstructorCreate
| 필드 | 타입 | 검증 |
|---|---|---|
| name | str | required, max=100 |
| specializations | list[str] | optional |
| subjects | list[str] | optional |
| experience_years | int | min=0, max=50 |
| certifications | list[str] | optional |
| education | str | optional |
| contact | str | optional |
| notes | str | optional |

### InstructorUpdate (partial)
동일 필드, 모든 필드 optional

### InstructorResponse
DB 모델의 모든 필드 반환

### BulkUploadResponse
| 필드 | 타입 | 설명 |
|---|---|---|
| total | int | 전체 행 수 |
| success | int | 성공 건수 |
| errors | list[str] | 오류 메시지 목록 |

---

## API DTO: TaskOrder

### TaskOrderResponse
| 필드 | 타입 |
|---|---|
| id | UUID |
| file_name | str |
| file_type | str |
| qualifications | list[dict] |
| evaluation_criteria | list[dict] |
| parsed_at | datetime |
| created_at | datetime |

### ParsedResultUpdate
| 필드 | 타입 | 설명 |
|---|---|---|
| qualifications | list[dict] | 수정된 참여자격 |
| evaluation_criteria | list[dict] | 수정된 평가기준 |

---

## API DTO: Matching

### MatchingResultResponse
| 필드 | 타입 |
|---|---|
| id | UUID |
| task_order_id | UUID |
| results | list[MatchScoreDTO] |
| created_at | datetime |

### MatchScoreDTO
| 필드 | 타입 |
|---|---|
| instructor_id | UUID |
| instructor_name | str |
| total_score | float |
| keyword_score | float |
| qualification_score | float |
| experience_score | float |
| breakdown | list[dict] |

### CompareRequest
| 필드 | 타입 |
|---|---|
| instructor_ids | list[UUID] (2~5개) |
