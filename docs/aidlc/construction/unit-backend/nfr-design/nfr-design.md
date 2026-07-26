# NFR 설계 — unit-backend

## 1. 프로젝트 구조

```
instructor-matching-backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI 앱 생성, 미들웨어, 라우터 등록
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py        # 환경변수 설정 (pydantic-settings)
│   │   ├── security.py      # JWT 생성/검증, 비밀번호 해싱
│   │   ├── dependencies.py  # 의존성 주입 (get_db, get_current_user)
│   │   └── middleware.py    # 보안 헤더, 로깅, Rate Limit
│   ├── models/
│   │   ├── __init__.py
│   │   └── models.py        # SQLAlchemy DB 모델
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── auth.py          # 인증 DTO
│   │   ├── instructor.py    # 강사 DTO
│   │   ├── task_order.py    # 과업지시서 DTO
│   │   └── matching.py      # 매칭 DTO
│   ├── api/
│   │   ├── __init__.py
│   │   ├── auth.py          # /api/auth/* 라우터
│   │   ├── instructors.py   # /api/instructors/* 라우터
│   │   ├── task_orders.py   # /api/task-orders/* 라우터
│   │   └── matching.py      # /api/matching/* 라우터
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── instructor_service.py
│   │   ├── task_order_service.py
│   │   └── matching_service.py
│   └── db/
│       ├── __init__.py
│       ├── database.py      # 엔진, 세션 설정
│       └── init_db.py       # 초기 테이블 생성
├── uploads/                  # 업로드된 파일 저장소
├── tests/
│   ├── conftest.py
│   ├── test_auth.py
│   ├── test_instructors.py
│   ├── test_task_orders.py
│   └── test_matching.py
├── alembic/                  # DB 마이그레이션 (향후)
├── pyproject.toml
└── requirements.txt
```

---

## 2. 보안 설계

### 2.1 인증 (SECURITY-08, SECURITY-12)
```python
# app/core/security.py

# JWT 생성
def create_access_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.utcnow() + timedelta(hours=24),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

# 비밀번호 해싱
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())
```

### 2.2 보안 헤더 미들웨어 (SECURITY-04)
```python
# app/core/middleware.py
SECURITY_HEADERS = {
    "Content-Security-Policy": "default-src 'self'",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
}
```

### 2.3 입력 검증 (SECURITY-05)
```python
# Pydantic 스키마로 모든 API 입력 검증
# 문자열 최대 길이, 숫자 범위, 필수 필드 등
# 파일 업로드: 확장자 + 크기 + content-type 검증
```

### 2.4 Rate Limiting (SECURITY-11)
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
# 기본: "100/minute"
# 업로드: "10/minute"
# 매칭: "30/minute"
```

### 2.5 에러 처리 (SECURITY-09, SECURITY-15)
```python
# 글로벌 에러 핸들러
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error("unhandled_exception", error=str(exc), path=request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "서버 오류가 발생했습니다."},
    )

# MatchingCoreError → 400
# ValidationError → 422
# HTTPException → 그대로 전달
```

### 2.6 로깅 (SECURITY-03, SECURITY-14)
```python
import structlog

logger = structlog.get_logger()

# 요청 로깅 미들웨어
# - 요청: method, path, user_id
# - 응답: status_code, duration_ms
# - 에러: error_type, error_message
# - 절대 로깅 금지: password, token, file_content
```

---

## 3. 데이터 계층 설계

### 3.1 DB 세션 관리
```python
# app/db/database.py
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

DATABASE_URL = "sqlite+aiosqlite:///./app.db"
engine = create_async_engine(DATABASE_URL)
async_session = sessionmaker(engine, class_=AsyncSession)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
```

### 3.2 JSON 필드 처리 (SQLite 호환)
```python
from sqlalchemy import JSON, TypeDecorator
import json

# SQLAlchemy의 JSON 타입 사용
# SQLite: TEXT로 저장, 자동 직렬화/역직렬화
# PostgreSQL: JSONB 네이티브
```

---

## 4. 미들웨어 스택

```python
# app/main.py - 미들웨어 등록 순서
app.add_middleware(CORSMiddleware, ...)       # 1. CORS
app.add_middleware(SecurityHeadersMiddleware)  # 2. 보안 헤더
app.add_middleware(RequestLoggingMiddleware)   # 3. 요청 로깅
app.state.limiter = limiter                   # 4. Rate Limiting
```

---

## 5. 의존성 주입 패턴

```python
# app/core/dependencies.py

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """JWT 토큰에서 현재 사용자를 추출합니다."""
    payload = decode_token(token)  # 실패시 401
    user = await db.get(User, payload["sub"])
    if not user or not user.is_active:
        raise HTTPException(status_code=401)
    return user
```

---

## 6. matching_core 연동 패턴

```python
# 동기 matching_core를 비동기로 래핑
import asyncio
from functools import partial

async def run_matching(requirements, instructors):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None,
        partial(matching_core.match_instructors, requirements, instructors),
    )
```

---

## Security Compliance Summary

| 규칙 | 상태 | 적용 내용 |
|---|---|---|
| SECURITY-01 | 준수 | SQLite WAL, 향후 PostgreSQL TLS 연결 |
| SECURITY-02 | N/A | 로드밸런서/API GW 없음 (로컬/사내 배포) |
| SECURITY-03 | 준수 | structlog, 요청ID, PII 미포함 |
| SECURITY-04 | 준수 | SecurityHeadersMiddleware 적용 |
| SECURITY-05 | 준수 | Pydantic 전체 검증, 파일 검증 |
| SECURITY-06 | N/A | IAM 정책 없음 (로컬 배포) |
| SECURITY-07 | N/A | 네트워크 구성 없음 (로컬 배포) |
| SECURITY-08 | 준수 | JWT 미들웨어, 모든 보호 엔드포인트 |
| SECURITY-09 | 준수 | 글로벌 에러 핸들러, 내부 정보 미노출 |
| SECURITY-10 | 준수 | 버전 고정 requirements.txt |
| SECURITY-11 | 준수 | auth 모듈 분리, slowapi Rate Limiting |
| SECURITY-12 | 준수 | bcrypt, JWT, Rate Limit(브루트포스 방지) |
| SECURITY-13 | 준수 | Pydantic 역직렬화, 파일 검증 |
| SECURITY-14 | 준수 | 인증 실패 로깅, structlog |
| SECURITY-15 | 준수 | async with, try/except/finally, fail-closed |
