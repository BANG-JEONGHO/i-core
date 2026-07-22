# 컴포넌트 메서드 정의

> 참고: 상세 비즈니스 로직은 Construction Phase의 Functional Design에서 정의됩니다.
> 여기서는 메서드 시그니처와 고수준 목적만 정의합니다.

---

## C-02: Auth Module

| 메서드 | 입력 | 출력 | 목적 |
|---|---|---|---|
| `register(user_data)` | UserCreateDTO (id, password, name) | UserResponse | 새 계정 생성 |
| `login(credentials)` | LoginDTO (id, password) | TokenResponse (access_token) | 인증 후 JWT 발급 |
| `logout(token)` | JWT token | SuccessResponse | 세션 무효화 |
| `get_current_user(token)` | JWT token | UserResponse | 토큰 검증 및 사용자 정보 반환 |

---

## C-03: Instructor Service

| 메서드 | 입력 | 출력 | 목적 |
|---|---|---|---|
| `upload_bulk(file)` | Excel/CSV file | BulkUploadResult (count, errors) | 강사 데이터 일괄 업로드 |
| `list_instructors(filters)` | FilterParams (keyword, field, cert) | List[InstructorSummary] | 강사 목록 조회 (검색/필터) |
| `get_instructor(id)` | instructor_id | InstructorDetail | 강사 상세 정보 조회 |
| `update_instructor(id, data)` | instructor_id, UpdateDTO | InstructorDetail | 강사 정보 수정 |
| `delete_instructor(id)` | instructor_id | SuccessResponse | 강사 삭제 |
| `get_statistics()` | - | InstructorStats | 전문분야별 강사 분포 통계 |

---

## C-04: Document Parser

| 메서드 | 입력 | 출력 | 목적 |
|---|---|---|---|
| `parse_document(file)` | 업로드된 파일 (PDF/HWP/Word) | ParsedDocument (raw_text, sections) | 파일에서 텍스트 추출 |
| `extract_qualifications(parsed_doc)` | ParsedDocument | QualificationList | 참여자격/신청자격 추출 |
| `extract_evaluation_criteria(parsed_doc)` | ParsedDocument | EvaluationCriteriaList | 평가기준 추출 |
| `detect_file_type(file)` | 업로드된 파일 | FileType (PDF/HWP/DOCX) | 파일 형식 자동 감지 |

---

## C-05: Matching Engine

| 메서드 | 입력 | 출력 | 목적 |
|---|---|---|---|
| `match_keywords(task_req, instructors)` | TaskRequirements, List[Instructor] | List[MatchScore] | 키워드 기반 매칭 |
| `calculate_rule_score(task_req, instructor)` | TaskRequirements, Instructor | RuleScore (total, breakdown) | 규칙 기반 가중치 점수 계산 |
| `rank_instructors(scores)` | List[MatchScore] | List[RankedInstructor] | 점수 기반 정렬 |
| `generate_match_reason(task_req, instructor, score)` | TaskRequirements, Instructor, MatchScore | MatchReason | 매칭 근거 생성 |

### 2단계 확장 (향후)
| 메서드 | 입력 | 출력 | 목적 |
|---|---|---|---|
| `match_embedding(task_req, instructors)` | TaskRequirements, List[Instructor] | List[EmbeddingScore] | 임베딩 유사도 매칭 |
| `combine_scores(keyword_scores, embedding_scores)` | List[MatchScore], List[EmbeddingScore] | List[CombinedScore] | 점수 결합 |

### 3단계 확장 (향후)
| 메서드 | 입력 | 출력 | 목적 |
|---|---|---|---|
| `match_knowledge_graph(task_req, instructors)` | TaskRequirements, List[Instructor] | List[KGScore] | Knowledge Graph 매칭 |
| `verify_with_agent(match_result)` | MatchResult | AgentVerification | AI Agent 검증 |

---

## C-06: Task Order Service

| 메서드 | 입력 | 출력 | 목적 |
|---|---|---|---|
| `upload_task_order(file)` | 업로드된 파일 | TaskOrder (id, parsed_result) | 과업지시서 업로드 및 파싱 실행 |
| `get_task_order(id)` | task_order_id | TaskOrderDetail | 과업지시서 상세 조회 |
| `update_parsed_result(id, data)` | task_order_id, UpdatedParseResult | TaskOrderDetail | 파싱 결과 수정 |
| `list_task_orders()` | - | List[TaskOrderSummary] | 과업지시서 이력 목록 |

---

## C-07: Matching Service

| 메서드 | 입력 | 출력 | 목적 |
|---|---|---|---|
| `execute_matching(task_order_id)` | task_order_id | MatchingResult (ranked_list) | 매칭 실행 및 결과 반환 |
| `get_matching_result(id)` | matching_id | MatchingResultDetail | 매칭 결과 상세 조회 |
| `list_matching_history()` | - | List[MatchingSummary] | 최근 매칭 이력 |
| `compare_instructors(ids)` | List[instructor_id] | ComparisonResult | 강사 비교 데이터 |
