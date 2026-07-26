# 서비스 정의

## 서비스 아키텍처 개요

모놀리식 구조의 FastAPI 백엔드 내에서 서비스 레이어 패턴을 사용합니다.
각 서비스는 비즈니스 로직을 캡슐화하고, API 라우터에서 호출됩니다.

```
[React Frontend] 
       |
       | HTTP (REST API)
       v
[FastAPI Router Layer]  ──── 인증 미들웨어 (JWT 검증)
       |
       v
[Service Layer]
  ├── AuthService
  ├── InstructorService  
  ├── TaskOrderService ──── DocumentParser (내부 호출)
  └── MatchingService ──── MatchingEngine (내부 호출)
       |
       v
[Data Layer - SQLAlchemy ORM]
       |
       v
[Database - SQLite/PostgreSQL]
```

---

## 서비스 정의

### S-01: AuthService
- **책임**: 사용자 인증 및 세션 관리 오케스트레이션
- **호출하는 컴포넌트**: Auth Module (C-02)
- **호출되는 곳**: API Router (`/api/auth/*`)
- **오케스트레이션 흐름**:
  - 회원가입: 입력 검증 → 중복 확인 → 비밀번호 해싱 → 저장
  - 로그인: 자격 확인 → JWT 생성 → 반환
  - 미들웨어: 요청 헤더에서 토큰 추출 → 검증 → 사용자 주입

### S-02: InstructorService
- **책임**: 강사 데이터 비즈니스 로직 처리
- **호출하는 컴포넌트**: Instructor Service (C-03)
- **호출되는 곳**: API Router (`/api/instructors/*`)
- **오케스트레이션 흐름**:
  - 일괄 업로드: 파일 유효성 검증 → Excel/CSV 파싱 → 데이터 변환 → 저장
  - CRUD: 입력 검증 → DB 작업 → 응답 변환

### S-03: TaskOrderService
- **책임**: 과업지시서 업로드 및 파싱 오케스트레이션
- **호출하는 컴포넌트**: Task Order Service (C-06), Document Parser (C-04)
- **호출되는 곳**: API Router (`/api/task-orders/*`)
- **오케스트레이션 흐름**:
  - 업로드: 파일 저장 → 파일 형식 감지 → Document Parser 호출 → 파싱 결과 저장
  - 수정: 파싱 결과 업데이트 → 재저장

### S-04: MatchingService
- **책임**: 매칭 실행 오케스트레이션
- **호출하는 컴포넌트**: Matching Service (C-07), Matching Engine (C-05), Instructor Service (C-03)
- **호출되는 곳**: API Router (`/api/matching/*`)
- **오케스트레이션 흐름**:
  - 매칭 실행: 과업지시서 요구사항 로드 → 강사 풀 로드 → 매칭 엔진 호출 → 결과 정렬 → 저장
  - 결과 조회: DB에서 매칭 결과 로드 → 응답 변환

---

## 서비스 간 상호작용

| 호출자 | 피호출자 | 상호작용 유형 | 설명 |
|---|---|---|---|
| TaskOrderService | DocumentParser | 동기 호출 | 파일 파싱 요청 |
| MatchingService | MatchingEngine | 동기 호출 | 매칭 알고리즘 실행 |
| MatchingService | InstructorService | 데이터 조회 | 강사 풀 로드 |
| MatchingService | TaskOrderService | 데이터 조회 | 파싱된 요구사항 로드 |
| 모든 서비스 | AuthService | 미들웨어 | JWT 인증 검증 |

---

## API 라우터 구조

```
/api
├── /auth
│   ├── POST /register      → AuthService.register()
│   ├── POST /login          → AuthService.login()
│   └── POST /logout         → AuthService.logout()
├── /instructors
│   ├── POST /upload         → InstructorService.upload_bulk()
│   ├── GET /                → InstructorService.list_instructors()
│   ├── GET /{id}            → InstructorService.get_instructor()
│   ├── PUT /{id}            → InstructorService.update_instructor()
│   ├── DELETE /{id}         → InstructorService.delete_instructor()
│   └── GET /statistics      → InstructorService.get_statistics()
├── /task-orders
│   ├── POST /upload         → TaskOrderService.upload_task_order()
│   ├── GET /                → TaskOrderService.list_task_orders()
│   ├── GET /{id}            → TaskOrderService.get_task_order()
│   └── PUT /{id}/parsed     → TaskOrderService.update_parsed_result()
└── /matching
    ├── POST /execute/{task_order_id}  → MatchingService.execute_matching()
    ├── GET /{id}                      → MatchingService.get_matching_result()
    ├── GET /history                   → MatchingService.list_matching_history()
    └── POST /compare                  → MatchingService.compare_instructors()
```
