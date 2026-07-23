# 코드 생성 계획 — unit-backend

## 유닛 컨텍스트
- **유닛**: unit-backend (FastAPI REST API)
- **기술**: FastAPI, SQLAlchemy 2.0, Pydantic v2, aiosqlite
- **프로젝트 경로**: `instructor-matching-backend/`
- **관련 스토리**: US-01~09, US-10~14, US-15~16, US-20~24 (전체 24개 중 22개)
- **의존**: unit-matching-core (pip install -e)

---

## 코드 생성 순서

### Step 1: 프로젝트 구조 및 설정
- [ ] 디렉토리 구조 생성
- [ ] `pyproject.toml`, `requirements.txt`
- [ ] `app/core/config.py` — 환경변수 설정
- [ ] `app/db/database.py` — DB 엔진/세션 설정

### Step 2: DB 모델
- [ ] `app/models/models.py` — User, Instructor, TaskOrder, MatchingResult

### Step 3: Pydantic 스키마
- [ ] `app/schemas/auth.py` — 인증 DTO
- [ ] `app/schemas/instructor.py` — 강사 DTO
- [ ] `app/schemas/task_order.py` — 과업지시서 DTO
- [ ] `app/schemas/matching.py` — 매칭 DTO

### Step 4: Core (보안/미들웨어)
- [ ] `app/core/security.py` — JWT, bcrypt
- [ ] `app/core/dependencies.py` — get_db, get_current_user
- [ ] `app/core/middleware.py` — 보안 헤더, 로깅

### Step 5: 서비스 레이어
- [ ] `app/services/auth_service.py`
- [ ] `app/services/instructor_service.py`
- [ ] `app/services/task_order_service.py`
- [ ] `app/services/matching_service.py`

### Step 6: API 라우터
- [ ] `app/api/auth.py` — /api/auth/*
- [ ] `app/api/instructors.py` — /api/instructors/*
- [ ] `app/api/task_orders.py` — /api/task-orders/*
- [ ] `app/api/matching.py` — /api/matching/*

### Step 7: 앱 엔트리포인트
- [ ] `app/main.py` — FastAPI 앱, 미들웨어, 라우터 등록
- [ ] `app/db/init_db.py` — 초기 테이블 생성

### Step 8: 테스트
- [ ] `tests/conftest.py` — 테스트 설정, 클라이언트 픽스처
- [ ] `tests/test_auth.py` — 인증 API 테스트
- [ ] `tests/test_instructors.py` — 강사 API 테스트
- [ ] `tests/test_matching.py` — 매칭 API 테스트

### Step 9: 문서
- [ ] `README.md` — 실행 방법
