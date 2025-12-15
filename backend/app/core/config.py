"""
Application Configuration
환경 변수 및 설정 관리
"""

from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """애플리케이션 설정"""

    # Application
    APP_NAME: str = "NoteGen"
    APP_VERSION: str = "1.0.0-MVP"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "sqlite:///./notegen.db"

    # API Keys
    OPENAI_API_KEY: str
    ANTHROPIC_API_KEY: Optional[str] = None

    # Google Cloud
    GOOGLE_CLOUD_PROJECT: Optional[str] = None
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = None

    # Azure (Alternative)
    AZURE_VISION_KEY: Optional[str] = None
    AZURE_VISION_ENDPOINT: Optional[str] = None

    # File Upload
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: set = {"jpg", "jpeg", "png"}
    MAX_FILES_PER_UPLOAD: int = 3

    # CORS
    CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:3001"]

    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"

    class Config:
        env_file = ".env"
        case_sensitive = True


# 설정 인스턴스 생성
settings = Settings()

# 업로드 디렉토리 생성
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
