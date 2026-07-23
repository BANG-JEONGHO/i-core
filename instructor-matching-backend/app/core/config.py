"""애플리케이션 설정."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """환경변수 기반 설정."""

    # App
    APP_NAME: str = "강사 매칭 플랫폼 API"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/private/app.db"
    INSTRUCTOR_DATABASE_URL: str = "sqlite+aiosqlite:///./data/private/app.db"

    # Security
    SECRET_KEY: str = "change-this-to-a-secure-random-string-at-least-32-chars"
    ACCESS_TOKEN_EXPIRE_HOURS: int = 24
    BCRYPT_ROUNDS: int = 12

    # AI
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.5-flash"
    GEMINI_EMBEDDING_MODEL: str = "gemini-embedding-001"

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    # Set to true only when the deployment intentionally routes Gemini API
    # traffic through HTTP(S)_PROXY. Local/serverless deployments should
    # connect directly by default.
    GEMINI_USE_ENV_PROXY: bool = False

    # Agent-core matching workflow
    # This points to the supplied agent_core package directory. Its parent is
    # added to Python's import path only when an agent-based match is executed.
    # Repository-relative by default. An environment variable can override this
    # when agent_core is deployed as a separately managed package.
    AGENT_CORE_PATH: str = "../agent_core"
    AGENT_REVIEW_TOP_K: int = 10
    VECTOR_STORE_PATH: str = "data/vector-store/rag.sqlite3"
    AGENT_RUN_STORAGE_DIR: str = "data/agent-runs"
    AGENT_BATCH_RUN_STORAGE_DIR: str = "data/agent-batch-runs"

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
