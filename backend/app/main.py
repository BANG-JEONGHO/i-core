"""i-Core 백엔드 서비스 메인 엔트리포인트.

FastAPI 기반의 RESTful API 서버로, Google OAuth 및 세션 인증, 강사 데이터 관리,
나라장터 과업지시서 문석 파싱(PDF/DOCX/HWP), 결정론적 규칙 매칭 엔진 및 Gemini AI 에이전트 매칭을 통합 제공합니다.
"""

from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import auth, instructors, instructor_portal, matching, schedules, task_orders
from app.core.config import settings
from app.core.middleware import RequestLoggingMiddleware, SecurityHeadersMiddleware
from app.db.database import engine
from app.models.models import Base

# 구조화된 로그(structlog) 생성기 초기화
logger = structlog.get_logger()


def _apply_additive_schema_updates(connection) -> None:
    """SQLite 데이터베이스 스키마 하위 호환 마이그레이션.
    
    SQLAlchemy create_all()이 이미 존재하는 테이블에 신규 컬럼을 자동으로 추가하지 못하므로,
    task_orders 및 matching_results 테이블의 신규 필드를 안전하게 브리지합니다.
    """
    # PostgreSQL deployments are initialized from the current ORM metadata.
    # The PRAGMA-based bridge below is only for legacy local SQLite files.
    if connection.dialect.name != "sqlite":
        return

    # 1. task_orders 테이블 overview 컬럼 체크 및 추가
    columns = {
        row[1]
        for row in connection.exec_driver_sql("PRAGMA table_info(task_orders)").fetchall()
    }
    if "overview" not in columns:
        connection.exec_driver_sql(
            "ALTER TABLE task_orders ADD COLUMN overview JSON NOT NULL DEFAULT '{}'"
        )
        logger.info("database_schema_updated", table="task_orders", column="overview")

    # 2. matching_results 테이블 memo 및 memo_author_name 컬럼 체크 및 추가
    matching_columns = {
        row[1]
        for row in connection.exec_driver_sql("PRAGMA table_info(matching_results)").fetchall()
    }
    if "memo" not in matching_columns:
        connection.exec_driver_sql("ALTER TABLE matching_results ADD COLUMN memo VARCHAR(1000)")
        logger.info("database_schema_updated", table="matching_results", column="memo")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI 생명주기 이벤트 관리자.
    
    서버 시작 시 데이터베이스 테이블을 자동 생성 및 스키마 업데이트를 수행하며,
    서버 종료 시 커넥션 풀을 안전하게 해제합니다.
    """
    # [시작] 데이터베이스 커넥션 생성 및 스키마 미들웨어 실행
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_apply_additive_schema_updates)
    logger.info("database_initialized", app_name=settings.APP_NAME)
    
    yield
    
    # [종료] 커넥션 풀 자원 반납
    await engine.dispose()
    logger.info("database_disposed")


# FastAPI 애플리케이션 객체 생성
app = FastAPI(
    title=settings.APP_NAME,
    description="i-Core AI 기반 스마트 강사 매칭 및 과업 분석 플랫폼 API",
    version="2.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# 미들웨어(Middleware) 설정
# ---------------------------------------------------------------------------
# 1. CORS 미들웨어 (프론트엔드 Vite 개발 서버와의 차단 방지)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# 2. 보안 헤더 미들웨어
app.add_middleware(SecurityHeadersMiddleware)
# 3. 요청/응답 수행시간 및 로깅 미들웨어
app.add_middleware(RequestLoggingMiddleware)

# ---------------------------------------------------------------------------
# API 라우터(Router) 등록 (각 라우터 모듈 자체에 /api 접두어가 포함되어 있습니다)
# ---------------------------------------------------------------------------
app.include_router(auth.router)
app.include_router(instructors.router)
app.include_router(task_orders.router)
app.include_router(matching.router)
app.include_router(schedules.router)
app.include_router(instructor_portal.router)


# ---------------------------------------------------------------------------
# 전역 예외 처리기 (Global Exception Handler)
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """서버 내부에서 발생하는 모든 미처리 예외를 안전하게 가로채 500 응답을 생성합니다."""
    logger.error("unhandled_exception", error=str(exc), path=request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."},
    )


@app.get("/", tags=["System"])
async def root():
    """백엔드 루트 안내 엔드포인트."""
    return {"message": "i-Core 강사 매칭 API 서버가 정상 실행 중입니다.", "docs": "/docs", "health": "/health"}


@app.get("/health", tags=["System"])
async def health_check():
    """서버 상태 확인 헬스체크 엔드포인트."""
    return {"status": "ok", "service": settings.APP_NAME}
