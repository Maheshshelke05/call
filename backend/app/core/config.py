from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    APP_NAME: str = "Employee Calling & CRM Platform"
    APP_ENV: str = "local"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str = "sqlite:///./calling_platform.db"
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 10

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT Authentication
    JWT_SECRET: str = "supersecretjwtkeyforlocaldevemployeecallingcrmplatform987654321"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8 hours for employee shift
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # AWS / S3 Configuration
    AWS_REGION: str = "ap-south-1"
    AWS_S3_BUCKET: str = "employee-calling-recordings-private"
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_S3_ENDPOINT_URL: Optional[str] = None  # MinIO or localstack override
    LOCAL_RECORDING_STORAGE_DIR: str = "./storage/recordings"

    # CORS
    ADMIN_WEB_ORIGIN: str = "http://localhost:3000"
    MOBILE_API_BASE_URL: str = "http://localhost:8000"

    # CRM Settings
    INDIAN_PHONE_DEFAULT_PREFIX: str = "+91"
    RECORDING_SIGNED_URL_EXPIRY_SECONDS: int = 3600  # 1 hour
    MAX_CSV_IMPORT_ROWS: int = 50000

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
