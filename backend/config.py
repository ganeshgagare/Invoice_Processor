from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    GEMINI_API_KEY: str = ""
    CORS_ORIGINS: str = "https://invoice-processor-web.onrender.com,http://localhost:3000,http://localhost:3001,http://localhost:5173"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        # Render may provide postgres:// URLs; SQLAlchemy expects postgresql+psycopg2://
        if isinstance(value, str) and value.startswith("postgres://"):
            return value.replace("postgres://", "postgresql+psycopg2://", 1)
        return value

    @property
    def cors_origins_list(self) -> list[str]:
        value = self.CORS_ORIGINS.strip()
        if value == "*":
            return ["*"]

        return [origin.strip() for origin in value.split(",") if origin.strip()]

    class Config:
        env_file = ".env"


settings = Settings()
