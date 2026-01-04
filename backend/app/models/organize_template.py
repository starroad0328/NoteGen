"""
OrganizeTemplate Model
정리법 템플릿 모델
"""

import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base
from app.models.user import UserPlan


class OutputStructure(str, enum.Enum):
    """출력 구조 타입"""
    MARKDOWN = "markdown"      # 마크다운 (기본 요약)
    CORNELL_JSON = "cornell"   # 코넬식 JSON
    TABLE = "table"            # 표 형식
    BULLET = "bullet"          # 글머리표


class OrganizeTemplate(Base):
    """정리법 템플릿"""
    __tablename__ = "organize_templates"

    id = Column(Integer, primary_key=True, index=True)

    # 기본 정보
    name = Column(String(100), nullable=False)
    description = Column(String(500), nullable=True)
    icon = Column(String(10), default="📝")

    # 프롬프트 설정
    prompt = Column(Text, nullable=False)
    system_message = Column(String(500), default="학생 필기 정리. 메타데이터 제거. 깔끔하게.")
    output_structure = Column(Enum(OutputStructure), default=OutputStructure.MARKDOWN)

    # 제한 설정
    required_plan = Column(Enum(UserPlan), default=UserPlan.FREE)
    subject = Column(String(50), nullable=True)  # null이면 전 과목

    # 시스템/사용자 구분
    is_system = Column(Boolean, default=False)  # 시스템 기본 정리법
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # 통계
    usage_count = Column(Integer, default=0)
    like_count = Column(Integer, default=0)

    # 시간
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 관계
    creator = relationship("User", backref="created_templates")

    def __repr__(self):
        return f"<OrganizeTemplate {self.name}>"

    def increment_usage(self):
        """사용 횟수 증가"""
        self.usage_count += 1


class UserTemplateSubscription(Base):
    """사용자 정리법 구독"""
    __tablename__ = "user_template_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    template_id = Column(Integer, ForeignKey("organize_templates.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # 관계
    user = relationship("User", backref="template_subscriptions")
    template = relationship("OrganizeTemplate", backref="subscribers")


class UserTemplateLike(Base):
    """사용자 정리법 좋아요"""
    __tablename__ = "user_template_likes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    template_id = Column(Integer, ForeignKey("organize_templates.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # 관계
    user = relationship("User", backref="template_likes")
    template = relationship("OrganizeTemplate", backref="likes")
