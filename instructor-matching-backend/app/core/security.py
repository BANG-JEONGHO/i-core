"""JWT 토큰 및 비밀번호 보안."""

from __future__ import annotations

from datetime import datetime, timedelta

import bcrypt
import jwt
import structlog

from app.core.config import settings

logger = structlog.get_logger()


def create_access_token(user_id: str) -> str:
    """JWT 액세스 토큰을 생성합니다."""
    payload = {
        "sub": user_id,
        "exp": datetime.utcnow() + timedelta(hours=settings.ACCESS_TOKEN_EXPIRE_HOURS),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


def decode_access_token(token: str) -> dict | None:
    """JWT 토큰을 디코딩합니다. 실패 시 None 반환."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("token_expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning("token_invalid", error=str(e))
        return None


def hash_password(password: str) -> str:
    """비밀번호를 bcrypt로 해싱합니다."""
    salt = bcrypt.gensalt(rounds=settings.BCRYPT_ROUNDS)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    """비밀번호를 검증합니다."""
    return bcrypt.checkpw(
        password.encode("utf-8"), hashed_password.encode("utf-8")
    )
