"""
OrganizeTemplate Schemas
정리법 템플릿 스키마
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class TemplateBase(BaseModel):
    """정리법 기본 스키마"""
    name: str
    description: Optional[str] = None
    icon: str = "📝"


class TemplateResponse(TemplateBase):
    """정리법 응답 스키마"""
    id: int
    output_structure: str
    required_plan: str
    subject: Optional[str] = None
    is_system: bool
    usage_count: int
    like_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class TemplateDetailResponse(TemplateResponse):
    """정리법 상세 응답 (프롬프트 포함)"""
    prompt: str
    system_message: str


class TemplateListResponse(BaseModel):
    """정리법 목록 응답"""
    templates: list[TemplateResponse]
    total: int
