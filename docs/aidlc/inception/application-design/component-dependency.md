# 컴포넌트 의존성

## 의존성 매트릭스

| 컴포넌트 | 의존 대상 | 관계 유형 |
|---|---|---|
| Frontend (C-01) | API Layer 전체 | HTTP REST 호출 |
| Auth Module (C-02) | Database (C-08) | 데이터 읽기/쓰기 |
| Instructor Service (C-03) | Database (C-08) | 데이터 읽기/쓰기 |
| Document Parser (C-04) | - (독립) | 외부 의존 없음 |
| Matching Engine (C-05) | - (독립) | 외부 의존 없음 |
| Task Order Service (C-06) | Document Parser (C-04), Database (C-08) | 내부 호출 + 데이터 |
| Matching Service (C-07) | Matching Engine (C-05), Instructor Service (C-03), Task Order Service (C-06), Database (C-08) | 내부 호출 + 데이터 |
| Database (C-08) | - (독립) | 인프라 |

---

## 의존성 다이어그램

```
+-------------+          HTTP/REST          +------------------+
|  Frontend   | --------------------------> |  FastAPI Router  |
|   (C-01)    |                             |     + Auth MW    |
+-------------+                             +------------------+
                                                     |
                                    +----------------+----------------+
                                    |                |                |
                                    v                v                v
                            +------------+  +--------------+  +-------------+
                            |   Auth     |  | Instructor   |  | Task Order  |
                            |  Service   |  |   Service    |  |   Service   |
                            |   (C-02)   |  |    (C-03)    |  |    (C-06)   |
                            +------------+  +--------------+  +-------------+
                                    |                |                |
                                    |                |                v
                                    |                |        +--------------+
                                    |                |        |   Document   |
                                    |                |        |    Parser    |
                                    |                |        |    (C-04)    |
                                    |                |        +--------------+
                                    |                |
                                    |                v
                                    |        +-------------+
                                    |        |  Matching   |
                                    |        |   Service   |
                                    |        |   (C-07)    |
                                    |        +-------------+
                                    |                |
                                    |                v
                                    |        +--------------+
                                    |        |  Matching    |
                                    |        |   Engine     |
                                    |        |   (C-05)     |
                                    |        +--------------+
                                    |
                                    v
                            +------------------+
                            |    Database      |
                            |     (C-08)       |
                            | SQLite/PostgreSQL|
                            +------------------+
```

---

## 통신 패턴

| 패턴 | 사용 위치 | 설명 |
|---|---|---|
| HTTP REST | Frontend → Backend | JSON 기반 API 통신 |
| 동기 함수 호출 | Service → Service | 같은 프로세스 내 직접 호출 |
| 동기 함수 호출 | Service → Engine/Parser | 비즈니스 로직 위임 |
| ORM 쿼리 | Service → Database | SQLAlchemy를 통한 DB 접근 |

---

## 데이터 흐름

### 핵심 흐름: 과업지시서 업로드 → 매칭

```
1. Frontend: 파일 업로드 요청
   → POST /api/task-orders/upload

2. TaskOrderService: 파일 저장 + 파싱
   → DocumentParser.parse_document()
   → DocumentParser.extract_qualifications()
   → DocumentParser.extract_evaluation_criteria()
   → DB 저장

3. Frontend: 매칭 실행 요청
   → POST /api/matching/execute/{task_order_id}

4. MatchingService: 매칭 오케스트레이션
   → TaskOrderService.get_task_order() (파싱된 요구사항)
   → InstructorService.list_instructors() (전체 강사 풀)
   → MatchingEngine.match_keywords()
   → MatchingEngine.calculate_rule_score() (각 강사)
   → MatchingEngine.rank_instructors()
   → MatchingEngine.generate_match_reason() (상위 강사)
   → DB 저장

5. Frontend: 결과 표시
   → GET /api/matching/{id}
```

---

## 설계 원칙

1. **느슨한 결합**: Document Parser와 Matching Engine은 독립 모듈로 교체 가능
2. **서비스 레이어 패턴**: API 라우터는 얇게, 비즈니스 로직은 서비스에 집중
3. **단방향 의존**: 상위 레이어만 하위 레이어를 호출 (순환 의존 없음)
4. **플러그인 구조**: Matching Engine은 단계별 확장 가능한 전략 패턴 적용
