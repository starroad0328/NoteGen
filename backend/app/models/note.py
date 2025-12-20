"""
Note Database Model
노트 데이터베이스 모델
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, JSON
from datetime import datetime
import enum

from app.models.base import Base


class OrganizeMethod(str, enum.Enum):
    """정리 방식"""
    BASIC_SUMMARY = "basic_summary"  # 기본 요약 정리
    CORNELL = "cornell"  # 코넬식 정리


class ProcessStatus(str, enum.Enum):
    """처리 상태"""
    UPLOADING = "uploading"  # 업로드 중
    OCR_PROCESSING = "ocr_processing"  # OCR 처리 중
    AI_ORGANIZING = "ai_organizing"  # AI 정리 중
    COMPLETED = "completed"  # 완료
    FAILED = "failed"  # 실패


class Note(Base):
    """노트 모델"""

    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)

    # 사용자 연결 (선택적 - 비로그인 사용자도 가능)
    user_id = Column(Integer, nullable=True, index=True)

    # 기본 정보
    title = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 파일 정보
    image_paths = Column(Text)  # JSON array of image paths

    # OCR 결과
    ocr_text = Column(Text, nullable=True)
    ocr_metadata = Column(JSON, nullable=True)  # bbox, confidence 등 메타데이터

    # 정리 방식
    organize_method = Column(
        Enum(OrganizeMethod),
        default=OrganizeMethod.BASIC_SUMMARY
    )

    # 정리 결과
    organized_content = Column(Text, nullable=True)

    # 처리 상태
    status = Column(
        Enum(ProcessStatus),
        default=ProcessStatus.UPLOADING
    )

    # 에러 정보
    error_message = Column(Text, nullable=True)

    # 진행 상태 메시지 (AI 단계 표시용)
    progress_message = Column(String(100), nullable=True)

    def __repr__(self):
        return f"<Note(id={self.id}, title='{self.title}', status='{self.status}')>"
