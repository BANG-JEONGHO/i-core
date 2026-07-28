"""애플리케이션 설정."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """환경변수 기반 설정."""

    # App
    APP_NAME: str = "강사 매칭 플랫폼 API"
    DEBUG: bool = True

    # Database
    # Local development keeps using SQLite. Cloud Run uses PostgreSQL URLs
    # injected through Secret Manager (see .env.example).
    DATABASE_URL: str = "sqlite+aiosqlite:///./app.db"
    # The instructor database is intentionally separated from app data because
    # it contains resume records. This accepts either SQLite (local) or
    # PostgreSQL (Cloud SQL) URLs.
    INSTRUCTOR_DATABASE_URL: str = "sqlite+aiosqlite:///./data/private/내부_강사_정보.db"

    # Security
    SECRET_KEY: str = "change-this-to-a-secure-random-string-at-least-32-chars"
    ACCESS_TOKEN_EXPIRE_HOURS: int = 24
    BCRYPT_ROUNDS: int = 12

    # AI
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.5-flash"
    GEMINI_EMBEDDING_MODEL: str = "gemini-embedding-001"

    # Google OAuth (leave blank to keep username/password-only login)
    GOOGLE_CLIENT_ID: str = ""
    # Optional domain restriction for a company Google Workspace deployment.
    GOOGLE_ALLOWED_DOMAIN: str = ""
    # Set to true only when the deployment intentionally routes Gemini API
    # traffic through HTTP(S)_PROXY. Local/serverless deployments should
    # connect directly by default.
    GEMINI_USE_ENV_PROXY: bool = False

    # Agent-core matching workflow
    # This points to the supplied agent_core package directory. Its parent is
    # added to Python's import path only when an agent-based match is executed.
    # Repository-relative by default. An environment variable can override this
    # when agent_core is deployed as a separately managed package.
    AGENT_CORE_PATH: str = "agent_core"
    AGENT_REVIEW_TOP_K: int = 20
    # Candidate reviews run concurrently, while the Gemini request limit is
    # shared by all A/B workers to avoid quota bursts.
    AGENT_REVIEW_WORKERS: int = 20
    AGENT_MAX_CONCURRENT_LLM_REQUESTS: int = 40
    VECTOR_STORE_PATH: str = "data/vector-store/rag.sqlite3"
    AGENT_RUN_STORAGE_DIR: str = "data/agent-runs"
    AGENT_BATCH_RUN_STORAGE_DIR: str = "data/agent-batch-runs"

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:8900",
        "http://localhost:3000",
        "http://localhost:8700",
        "http://127.0.0.1:8900",
        "https://i-core-frontend-761086712825.asia-northeast3.run.app",
    ]

    # File Upload
    UPLOAD_DIR: str = "uploads"
    # Cloud Run uses this bucket for durable original HWP/PDF storage.
    # Leave empty to retain the local development uploads directory.
    GCS_BUCKET: str = ""
    MAX_FILE_SIZE_MB: int = 50

    # Rate Limiting
    RATE_LIMIT_DEFAULT: str = "100/minute"
    RATE_LIMIT_UPLOAD: str = "10/minute"
    RATE_LIMIT_MATCHING: str = "30/minute"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
