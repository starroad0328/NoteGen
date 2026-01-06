"""
Application Configuration
환경 변수 및 설정 관리
"""

from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import Optional, Set, List
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
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None

    # Google Cloud
    GOOGLE_CLOUD_PROJECT: Optional[str] = None
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = None

    # Azure (Alternative)
    AZURE_VISION_KEY: Optional[str] = None
    AZURE_VISION_ENDPOINT: Optional[str] = None

    # CLOVA OCR (Naver Cloud)
    CLOVA_OCR_SECRET_KEY: Optional[str] = None
    CLOVA_OCR_INVOKE_URL: Optional[str] = None

    # Cloudinary (Image Storage)
    CLOUDINARY_CLOUD_NAME: Optional[str] = None
    CLOUDINARY_API_KEY: Optional[str] = None
    CLOUDINARY_API_SECRET: Optional[str] = None

    # File Upload
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: str = "jpg,jpeg,png"
    MAX_FILES_PER_UPLOAD: int = 3

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001"

    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"

    @property
    def allowed_extensions_set(self) -> Set[str]:
        return set(self.ALLOWED_EXTENSIONS.split(","))

    @property
    def cors_origins_list(self) -> List[str]:
        return self.CORS_ORIGINS.split(",")

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


# 설정 인스턴스 생성
settings = Settings()

# 업로드 디렉토리 생성
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
