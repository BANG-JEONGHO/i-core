# 기술 스택 결정 — unit-backend

## 핵심 기술

| 카테고리 | 선택 | 버전 | 근거 |
|---|---|---|---|
| 프레임워크 | FastAPI | 0.115.x | 비동기, 자동 API 문서, Pydantic 통합 |
| 서버 | Uvicorn | 0.30.x | ASGI 서버, 개발/운영 겸용 |
| ORM | SQLAlchemy | 2.0.x | 표준 Python ORM, 비동기 지원 |
| DB (개발) | SQLite | - | 설치 불요, aiosqlite로 비동기 |
| DB (운영) | PostgreSQL | 16+ | 향후 전환 |
| 마이그레이션 | Alembic | 1.13.x | SQLAlchemy 연동 |
| 인증 | PyJWT + bcrypt | 2.9.x / 4.2.x | JWT 토큰 + 비밀번호 해싱 |
| 검증 | Pydantic | 2.9.x | 요청/응답 스키마 |
| 파일 처리 | python-multipart | 0.0.12 | FastAPI 파일 업로드 |
| Excel 파싱 | pandas + openpyxl | 2.2.x / 3.1.x | 강사 일괄 업로드 |
| Rate Limiting | slowapi | 0.1.x | FastAPI 미들웨어 |
| CORS | FastAPI CORSMiddleware | (내장) | 프론트엔드 연동 |
| 로깅 | structlog | 24.x | 구조화된 로깅 |
| 테스트 | pytest + httpx | 8.x / 0.27.x | API 테스트 (AsyncClient) |
| 매칭 코어 | instructor-matching-core | 0.1.0 | pip install -e (로컬) |

## 의존성 목록

```
# Core
fastapi==0.115.6
uvicorn==0.30.6
sqlalchemy==2.0.36
alembic==1.13.3
aiosqlite==0.20.0
pyjwt==2.9.0
bcrypt==4.2.1
python-multipart==0.0.12
pydantic==2.9.2
pydantic-settings==2.6.1

# Business
pandas==2.2.3
openpyxl==3.1.5
instructor-matching-core @ file:../instructor-matching-core

# Middleware
slowapi==0.1.9
structlog==24.4.0

# Dev/Test
pytest==8.3.3
httpx==0.27.0
pytest-asyncio==0.24.0
pytest-cov==5.0.0
```

## 설계 결정

### D-01: 비동기 (async/await)
- FastAPI의 비동기 지원 활용
- DB: aiosqlite로 비동기 SQLite 접근
- 파일 I/O: matching_core는 동기 → `run_in_executor`로 래핑

### D-02: 3계층 아키텍처
```
app/
├── api/         # Router Layer (엔드포인트 정의)
├── services/    # Service Layer (비즈니스 로직)
├── repositories/ # Repository Layer (DB 접근)
├── models/      # SQLAlchemy 모델
├── schemas/     # Pydantic DTO
└── core/        # 설정, 보안, 미들웨어
```

### D-03: SQLite → PostgreSQL 전환 전략
- SQLAlchemy ORM 사용으로 DB 추상화
- 연결 문자열만 변경하면 전환 가능
- JSON 필드: SQLite에서는 TEXT + JSON 직렬화, PostgreSQL에서는 JSONB

### D-04: 파일 저장 전략
- 로컬 파일 시스템 (`uploads/` 디렉토리)
- 파일명: `{uuid}_{sanitized_original_name}`
- 향후: S3 등 객체 스토리지로 전환 가능한 추상화 레이어
