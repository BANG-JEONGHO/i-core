"""FastAPI 애플리케이션 엔트리포인트."""

from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import auth, instructors, matching, task_orders, schedules, instructor_portal
from app.core.config import settings
from app.core.middleware import RequestLoggingMiddleware, SecurityHeadersMiddleware
from app.db.database import engine
from app.models.models import Base

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작/종료 시 실행."""
    # 시작: 테이블 생성
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("database_initialized")
    yield
    # 종료
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    lifespan=lifespan,
)

# 미들웨어 등록 (역순 실행)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestLoggingMiddleware)

# 라우터 등록
app.include_router(auth.router)
app.include_router(instructors.router)
app.include_router(task_orders.router)
app.include_router(matching.router)
app.include_router(schedules.router)
app.include_router(instructor_portal.router)


# 글로벌 에러 핸들러
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """처리되지 않은 예외를 안전하게 처리합니다."""
    logger.error("unhandled_exception", error=str(exc), path=request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "서버 오류가 발생했습니다."},
    )


@app.get("/health")
async def health_check():
    """헬스체크 엔드포인트."""
    return {"status": "ok"}
