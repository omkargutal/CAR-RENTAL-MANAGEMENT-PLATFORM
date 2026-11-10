import json
from typing import Any, List, Union
from pydantic import AnyHttpUrl, PostgresDsn, computed_field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Application Metadata
    PROJECT_NAME: str = "Car Rental Management Platform"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"
    API_V1_STR: str = "/api/v1"

    # Security & Tokens
    SECRET_KEY: str = "development_secret_key_change_me_in_production_32chars"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 60
    EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS: int = 24
    ALGORITHM: str = "HS256"

    # Security Cookies & Rate Limiting
    REFRESH_COOKIE_NAME: str = "carrental_refresh_token"
    REFRESH_COOKIE_HTTPONLY: bool = True
    REFRESH_COOKIE_SECURE: bool = False
    REFRESH_COOKIE_SAMESITE: str = "lax"
    LOGIN_MAX_FAILED_ATTEMPTS: int = 5
    LOGIN_LOCKOUT_MINUTES: int = 15
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_DEFAULT_PER_MINUTE: int = 120
    RATE_LIMIT_AUTH_PER_MINUTE: int = 20

    # CORS Origins
    BACKEND_CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost",
        "http://localhost:80",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return []

    # Database Settings
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "carrental_user"
    POSTGRES_PASSWORD: str = "carrental_secure_password_2026"
    POSTGRES_DB: str = "carrental_db"
    DATABASE_URL: Union[str, None] = None

    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30

    @computed_field
    @property
    def ASYNC_DATABASE_URL(self) -> str:
        if self.DATABASE_URL:
            if self.DATABASE_URL.startswith("postgresql://"):
                return self.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
            return self.DATABASE_URL
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @computed_field
    @property
    def SYNC_DATABASE_URL(self) -> str:
        if self.DATABASE_URL:
            if self.DATABASE_URL.startswith("postgresql+asyncpg://"):
                return self.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://", 1)
            return self.DATABASE_URL
        return (
            f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    # Object Storage (MinIO / S3)
    STORAGE_PROVIDER: str = "minio"
    S3_ENDPOINT: str = "http://localhost:9000"
    S3_PUBLIC_ENDPOINT: str = "http://localhost:9000"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin123"
    S3_BUCKET_NAME: str = "carrental-uploads"
    S3_REGION: str = "us-east-1"
    S3_USE_SSL: bool = False

    # External Payment Gateway
    PAYMENT_PROVIDER: str = "razorpay"
    RAZORPAY_KEY_ID: str = "rzp_test_AutoFleetKey2026"
    RAZORPAY_KEY_SECRET: str = "test_secret_AutoFleetSecret2026"
    RAZORPAY_WEBHOOK_SECRET: str = "whsec_AutoFleetWebhookSecret2026"
    RAZORPAY_CURRENCY: str = "INR"
    STRIPE_API_KEY: Union[str, None] = None
    STRIPE_WEBHOOK_SECRET: Union[str, None] = None

    # Notifications & WhatsApp Cloud API
    NOTIFICATION_PROVIDER: str = "stub"
    SMTP_HOST: Union[str, None] = None
    SMTP_PORT: int = 587
    SMTP_USER: Union[str, None] = None
    SMTP_PASSWORD: Union[str, None] = None
    EMAILS_FROM_EMAIL: str = "noreply@carrental.example.com"
    EMAILS_FROM_NAME: str = "Car Rental Platform"

    # Meta WhatsApp Business Cloud API
    WHATSAPP_PHONE_NUMBER_ID: Union[str, None] = None
    WHATSAPP_WABA_ID: Union[str, None] = None
    WHATSAPP_ACCESS_TOKEN: Union[str, None] = None
    WHATSAPP_VERIFY_TOKEN: str = "autofleet_webhook_token_2026"
    WHATSAPP_BUSINESS_NUMBER: str = "8421081570"
    WHATSAPP_APP_ID: Union[str, None] = None
    WHATSAPP_APP_SECRET: Union[str, None] = None


settings = Settings()
