"""애플리케이션 설정."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """환경변수 기반 설정."""

    # App
    APP_NAME: str = "강사 매칭 플랫폼 API"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./app.db"

    # Security
    SECRET_KEY: str = "change-this-to-a-secure-random-string-at-least-32-chars"
    ACCESS_TOKEN_EXPIRE_HOURS: int = 24
    BCRYPT_ROUNDS: int = 12

    # AI
    GEMINI_API_KEY: str = ""

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:8900", "http://localhost:3000", "http://localhost:8700"]

    # File Upload
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE_MB: int = 50

    # Rate Limiting
    RATE_LIMIT_DEFAULT: str = "100/minute"
    RATE_LIMIT_UPLOAD: str = "10/minute"
    RATE_LIMIT_MATCHING: str = "30/minute"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
