"""
User Database Model
사용자 데이터베이스 모델
"""

from sqlalchemy import Column, Integer, String, DateTime, Enum, Boolean, Date
from datetime import datetime, date
import enum

from app.models.base import Base


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


class SchoolLevel(str, enum.Enum):
    """학교급"""
    MIDDLE = "middle"  # 중학교
    HIGH = "high"  # 고등학교


class User(Base):
    """사용자 모델"""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    # 기본 정보
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)

    # 학년 정보 (교육과정 반영용)
    school_level = Column(Enum(SchoolLevel), nullable=True)  # 중/고
    grade = Column(Integer, nullable=True)  # 1, 2, 3학년

    # 플랜 정보
    plan = Column(Enum(UserPlan), default=UserPlan.FREE)

    # 사용자 AI 모델 선택
    preferred_ai_model = Column(
        Enum(AIModel),
        default=AIModel.GPT_5_MINI
    )

    # 활성 상태
    is_active = Column(Boolean, default=True)

    # 월간 사용량 제한
    monthly_usage = Column(Integer, default=0)  # 이번 달 사용 횟수
    usage_reset_date = Column(Date, default=date.today)  # 마지막 리셋 날짜

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', plan='{self.plan}')>"

    @property
    def grade_display(self) -> str:
        """학년 표시 문자열 반환 (예: '중2', '고1')"""
        if not self.school_level or not self.grade:
            return ""
        prefix = "중" if self.school_level == SchoolLevel.MIDDLE else "고"
        return f"{prefix}{self.grade}"

    def get_allowed_models(self):
        """사용 가능한 AI 모델 목록 반환"""
        if self.plan == UserPlan.FREE:
            return [AIModel.GPT_5_MINI]
        elif self.plan == UserPlan.BASIC:
            return [AIModel.GPT_5_MINI, AIModel.GPT_5]
        else:  # PRO
            return [AIModel.GPT_5_MINI, AIModel.GPT_5, AIModel.GPT_5_2]

    def get_default_model(self) -> 'AIModel':
        """플랜별 기본 AI 모델 반환"""
        if self.plan == UserPlan.FREE:
            return AIModel.GPT_5_MINI  # 무료: gpt-5-mini
        elif self.plan == UserPlan.BASIC:
            return AIModel.GPT_5  # 베이직: gpt-5
        else:  # PRO
            return AIModel.GPT_5_2  # 프로: gpt-5.2

    def can_use_model(self, model: AIModel) -> bool:
        """특정 모델 사용 가능 여부 확인"""
        return model in self.get_allowed_models()

    def get_monthly_limit(self) -> int:
        """플랜별 월간 사용 제한 반환"""
        limits = {
            UserPlan.FREE: 20,    # 무료: 월 20회
            UserPlan.BASIC: 150,  # 베이직: 월 150회
            UserPlan.PRO: -1,     # 프로: 무제한
        }
        return limits.get(self.plan, 20)

    def check_and_reset_usage(self) -> None:
        """월이 바뀌었으면 사용량 리셋"""
        today = date.today()
        if self.usage_reset_date is None or self.usage_reset_date.month != today.month or self.usage_reset_date.year != today.year:
            self.monthly_usage = 0
            self.usage_reset_date = today

    def can_use_service(self) -> bool:
        """서비스 사용 가능 여부 (사용량 체크)"""
        self.check_and_reset_usage()
        limit = self.get_monthly_limit()
        if limit == -1:  # 무제한
            return True
        return self.monthly_usage < limit

    def increment_usage(self) -> None:
        """사용량 증가"""
        self.check_and_reset_usage()
        self.monthly_usage += 1

    def get_usage_info(self) -> dict:
        """사용량 정보 반환"""
        self.check_and_reset_usage()
        limit = self.get_monthly_limit()
        return {
            "used": self.monthly_usage,
            "limit": limit,
            "remaining": max(0, limit - self.monthly_usage) if limit != -1 else -1,
            "is_unlimited": limit == -1,
        }
