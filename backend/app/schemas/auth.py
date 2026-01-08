"""
Auth Schemas
인증 관련 Pydantic 스키마
"""

from pydantic import BaseModel, EmailStr
from typing import Optional
from app.models.user import SchoolLevel


class UserRegister(BaseModel):
    """회원가입 요청"""
    email: EmailStr
    password: str
    name: str
    school_level: SchoolLevel
    grade: int  # 1, 2, 3


class UserLogin(BaseModel):
    """로그인 요청"""
    email: EmailStr
    password: str


class Token(BaseModel):
    """토큰 응답"""
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """사용자 정보 응답"""
    id: int
    email: str
    name: Optional[str]
    school_level: Optional[str]
    grade: Optional[int]
    grade_display: str
    plan: str
    ai_mode: str = "fast"  # fast 또는 quality

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    """사용자 정보 업데이트"""
    name: Optional[str] = None
    school_level: Optional[SchoolLevel] = None
    grade: Optional[int] = None


class UsageResponse(BaseModel):
    """사용량 정보 응답"""
    used: int
    limit: int
    remaining: int
    is_unlimited: bool

    class Config:
        from_attributes = True


class PlanInfo(BaseModel):
    """플랜 정보"""
    id: str
    name: str
    price: int  # 원
    price_display: str
    monthly_limit: int
    features: list[str]
    is_current: bool = False


class PlansResponse(BaseModel):
    """플랜 목록 응답"""
    current_plan: str
    usage: UsageResponse
    plans: list[PlanInfo]
