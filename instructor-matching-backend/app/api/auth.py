"""인증 API 라우터."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token
from app.db.database import get_db
from app.models.models import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.services import auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """회원가입."""
    return await auth_service.register(db, request)


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """로그인."""
    return await auth_service.login(db, request)


class GoogleLoginRequest(BaseModel):
    credential: str


class GoogleLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict[str, str | None]


@router.post("/google", response_model=GoogleLoginResponse)
async def google_login(request: GoogleLoginRequest, db: AsyncSession = Depends(get_db)):
    """Verify a Google ID token and issue the application's own JWT."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google login is not configured",
        )

    try:
        import asyncio
        import structlog
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token

        identity = await asyncio.wait_for(
            asyncio.to_thread(
                id_token.verify_oauth2_token,
                request.credential,
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID,
            ),
            timeout=15,
        )
    except Exception as error:
        structlog.get_logger().warning("google_token_verification_failed", error_type=type(error).__name__)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google token verification failed",
        ) from error

    email = str(identity.get("email") or "").strip().lower()
    if not email or not bool(identity.get("email_verified")):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="A verified email is required")
    if settings.GOOGLE_ALLOWED_DOMAIN and not email.endswith(f"@{settings.GOOGLE_ALLOWED_DOMAIN.lower()}"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This Google account is not allowed")

    result = await db.execute(select(User).where(User.username == email))
    user = result.scalar_one_or_none()
    if not user:
        user = User(
            username=email,
            hashed_password="google_oauth",
            name=str(identity.get("name") or email),
        )
        db.add(user)
        await db.flush()

    return GoogleLoginResponse(
        access_token=create_access_token(user.id),
        user={
            "id": user.id,
            "email": email,
            "name": str(identity.get("name") or user.name),
            "picture": str(identity.get("picture")) if identity.get("picture") else None,
        },
    )
