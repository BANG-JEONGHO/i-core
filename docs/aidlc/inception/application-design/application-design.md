# 애플리케이션 설계 통합 문서

## 1. 아키텍처 개요

**구조**: 모놀리식 FastAPI 백엔드 + React/TypeScript SPA 프론트엔드

```
+--------------------+       HTTP/REST (JSON)       +--------------------+
|                    |  <========================>  |                    |
|  React/TS Frontend |                              |  FastAPI Backend   |
|     (SPA)          |                              |                    |
+--------------------+                              +--------------------+
                                                    |  Router Layer      |
                                                    |  Auth Middleware   |
                                                    |  Service Layer     |
                                                    |  Business Logic    |
                                                    |  Data Layer (ORM)  |
                                                    +--------------------+
                                                             |
                                                             v
                                                    +--------------------+
                                                    |  SQLite/PostgreSQL |
                                                    +--------------------+
```

---

## 2. 컴포넌트 요약 (8개)

| ID | 컴포넌트 | 계층 | 핵심 책임 |
|---|---|---|---|
| C-01 | Frontend | Presentation | React/TS UI |
| C-02 | Auth Module | Business | 인증/세션 관리 |
| C-03 | Instructor Service | Business | 강사 CRUD |
| C-04 | Document Parser | Business | 파일 파싱 (PDF/HWP/Word) |
| C-05 | Matching Engine | Business | 매칭 알고리즘 (단계적 확장) |
| C-06 | Task Order Service | Business | 과업지시서 관리 |
| C-07 | Matching Service | Business | 매칭 오케스트레이션 |
| C-08 | Database | Data | 영구 저장소 |

---

## 3. 서비스 구조 (4개)

| 서비스 | 호출 엔드포인트 | 주요 의존 |
|---|---|---|
| AuthService | `/api/auth/*` | Database |
| InstructorService | `/api/instructors/*` | Database |
| TaskOrderService | `/api/task-orders/*` | DocumentParser, Database |
| MatchingService | `/api/matching/*` | MatchingEngine, InstructorService, TaskOrderService |

---

## 4. 기술 스택 결정

| 항목 | 선택 | 근거 |
|---|---|---|
| 백엔드 프레임워크 | FastAPI | 비동기 지원, 자동 API 문서, AI/ML 프로젝트 적합 |
| 프론트엔드 | React + TypeScript | 타입 안전성, 컴포넌트 기반 UI |
| 빌드 도구 | Vite | 빠른 개발 서버, HMR |
| ORM | SQLAlchemy | Python 표준 ORM, 다양한 DB 지원 |
| DB (개발) | SQLite | 설치 불요, 로컬 개발 편리 |
| DB (운영) | PostgreSQL | 확장성, 안정성 (배포 시 전환) |
| 인증 | JWT (PyJWT) | 상태 비저장, 확장 용이 |
| 파일 파싱 | pdfplumber, python-docx, hwp5 | 각 형식별 최적 라이브러리 |
| 상태 관리 (FE) | React Query + Zustand | 서버 상태 + 클라이언트 상태 분리 |

---

## 5. 핵심 데이터 흐름

```
과업지시서 업로드 → 파싱 → 매칭 → 결과 표시
```

1. 사용자가 과업지시서 파일 업로드
2. Document Parser가 파일 형식 감지 후 텍스트 추출
3. 평가기준 + 참여자격 자동 추출
4. 사용자가 파싱 결과 확인/수정
5. 매칭 실행 요청
6. Matching Engine이 전체 강사 풀 대상 점수 계산
7. 점수순 정렬 결과 반환
8. 프론트엔드에서 목록 + 카드(매칭 근거) 표시

---

## 6. 단계적 확장 전략

| 단계 | Matching Engine 변화 | 기술 추가 |
|---|---|---|
| 1단계 | 키워드 매칭 + 규칙 가중치 | TF-IDF, 키워드 추출 |
| 2단계 | + AI 임베딩 유사도 | OpenAI API, 벡터 유사도 |
| 3단계 | + Knowledge Graph + Agent | Neo4j/NetworkX, LangChain |

Matching Engine은 **전략 패턴**으로 설계하여 각 단계를 독립 모듈로 추가/교체 가능하게 합니다.

---

## 7. 보안 설계 (Security Baseline 준수)

| 영역 | 적용 내용 |
|---|---|
| 인증 | JWT + bcrypt 비밀번호 해싱 |
| 세션 | HttpOnly + Secure + SameSite 쿠키 |
| 입력 검증 | Pydantic 스키마 검증 (모든 API) |
| SQL Injection | SQLAlchemy ORM (파라미터화 쿼리) |
| HTTP 헤더 | CSP, HSTS, X-Content-Type-Options 등 |
| Rate Limiting | slowapi (FastAPI 미들웨어) |
| 로깅 | structlog (민감 정보 마스킹) |
| 에러 처리 | 글로벌 에러 핸들러 (스택 트레이스 숨김) |

---

## 참조 문서
- 상세 컴포넌트: `components.md`
- 메서드 시그니처: `component-methods.md`
- 서비스 정의: `services.md`
- 의존성 관계: `component-dependency.md`
