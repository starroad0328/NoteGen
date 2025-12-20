"""
User Database Model
사용자 데이터베이스 모델
"""

from sqlalchemy import Column, Integer, String, DateTime, Enum, Boolean
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import enum

Base = declarative_base()


class UserPlan(str, enum.Enum):
    """사용자 플랜"""
    FREE = "free"  # 무료
    BASIC = "basic"  # 기본 유료 (월 6,990원)
    PRO = "pro"  # 프로 유료 (월 14,900원)


class AIModel(str, enum.Enum):
    """AI 모델"""
    GPT_5_NANO = "gpt-5-nano-2025-08-07"  # OCR 정제용 (가장 저렴)
    GPT_5_MINI = "gpt-5-mini-2025-08-07"  # 무료 & Basic 기본값
    GPT_5 = "gpt-5"  # 유료 Pro 옵션 1
    GPT_5_2 = "gpt-5.2"  # 유료 Pro 옵션 2 (최고급)


class User(Base):
    """사용자 모델"""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    # 기본 정보
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)

    # 플랜 정보
    plan = Column(Enum(UserPlan), default=UserPlan.FREE)

    # 사용자 AI 모델 선택
    preferred_ai_model = Column(
        Enum(AIModel),
        default=AIModel.GPT_5_MINI
    )

    # 활성 상태
    is_active = Column(Boolean, default=True)

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', plan='{self.plan}')>"

    def get_allowed_models(self):
        """사용 가능한 AI 모델 목록 반환"""
        if self.plan == UserPlan.FREE:
            return [AIModel.GPT_5_MINI]  # 무료도 GPT-5 mini 사용
        elif self.plan == UserPlan.BASIC:
            return [AIModel.GPT_5_MINI]
        else:  # PRO
            return [AIModel.GPT_5, AIModel.GPT_5_2]  # Pro는 선택 가능

    def can_use_model(self, model: AIModel) -> bool:
        """특정 모델 사용 가능 여부 확인"""
        return model in self.get_allowed_models()
