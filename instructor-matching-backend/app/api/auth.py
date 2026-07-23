"""인증 API 라우터."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token
from app.db.database import get_db
from app.models.models import User
from app.schemas.auth import LoginRequest, TokenResponse
from app.services import auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """기존 아이디/비밀번호 로그인 (fallback)."""
    return await auth_service.login(db, request)


class GoogleLoginRequest(BaseModel):
    credential: str


class GoogleLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


@router.post("/google", response_model=GoogleLoginResponse)
async def google_login(request: GoogleLoginRequest, db: AsyncSession = Depends(get_db)):
    """Google OAuth 로그인. Google ID 토큰을 검증하고 JWT를 발급합니다."""
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests
    import structlog
    logger = structlog.get_logger()

    try:
        # Google ID 토큰 검증 (audience 검증 포함)
        idinfo = id_token.verify_oauth2_token(
            request.credential,
            google_requests.Request(),
            audience=settings.GOOGLE_CLIENT_ID,
        )
        logger.info("google_token_verified", email=idinfo.get("email"))
    except Exception as e:
        logger.error("google_token_verification_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Google 토큰 검증 실패: {str(e)}",
        )

    email = idinfo.get("email", "")
    name = idinfo.get("name", email)
    picture = idinfo.get("picture")
    google_sub = idinfo.get("sub", "")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이메일 정보를 가져올 수 없습니다.",
        )

    # DB에서 해당 이메일 사용자 찾기 or 자동 생성
    result = await db.execute(select(User).where(User.username == email))
    user = result.scalar_one_or_none()

    if not user:
        # 최초 Google 로그인 시 자동 계정 생성
        user = User(
            username=email,
            hashed_password="google_oauth",  # Google 로그인이라 비밀번호 불필요
            name=name,
        )
        db.add(user)
        await db.flush()

    token = create_access_token(user.id)

    return GoogleLoginResponse(
        access_token=token,
        user={
            "id": user.id,
            "email": email,
            "name": name,
            "picture": picture,
        },
    )
