"""
Note Pydantic Schemas
노트 API 스키마
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.note import OrganizeMethod, ProcessStatus


class NoteCreate(BaseModel):
    """노트 생성 요청"""
    organize_method: OrganizeMethod = Field(
        default=OrganizeMethod.BASIC_SUMMARY,
        description="정리 방식"
    )


class NoteResponse(BaseModel):
    """노트 응답"""
    id: int
    title: str
    created_at: datetime
    organize_method: OrganizeMethod
    status: ProcessStatus
    organized_content: Optional[str] = None
    error_message: Optional[str] = None
    image_urls: Optional[List[str]] = None  # 원본 이미지 URL 목록

    class Config:
        from_attributes = True


class NoteListResponse(BaseModel):
    """노트 목록 응답"""
    id: int
    title: str
    created_at: datetime
    status: ProcessStatus
    thumbnail_url: Optional[str] = None

    class Config:
        from_attributes = True


class ProcessResponse(BaseModel):
    """처리 결과 응답"""
    note_id: int
    status: ProcessStatus
    message: str
    organized_content: Optional[str] = None
    error_message: Optional[str] = None
