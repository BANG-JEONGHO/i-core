"""인증 서비스."""

from __future__ import annotations

import structlog
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_password, verify_password
from app.models.models import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse

logger = structlog.get_logger()


async def register(db: AsyncSession, request: RegisterRequest) -> UserResponse:
    """새 사용자를 등록합니다."""
    # 중복 확인
    result = await db.execute(select(User).where(User.username == request.username))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 존재하는 아이디입니다.",
        )

    # 사용자 생성
    user = User(
        username=request.username,
        hashed_password=hash_password(request.password),
        name=request.name,
    )
    db.add(user)
    await db.flush()

    logger.info("user_registered", user_id=user.id)
    return UserResponse.model_validate(user)


async def login(db: AsyncSession, request: LoginRequest) -> TokenResponse:
    """로그인하여 JWT 토큰을 발급합니다."""
    result = await db.execute(select(User).where(User.username == request.username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(request.password, user.hashed_password):
        logger.warning("login_failed", username=request.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="아이디 또는 비밀번호가 올바르지 않습니다.",
        )

    token = create_access_token(user.id)
    logger.info("user_logged_in", user_id=user.id)
    return TokenResponse(access_token=token)
