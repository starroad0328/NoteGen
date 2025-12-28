"""
Subscription & Payment Models
구독 및 결제 데이터베이스 모델
"""

from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.models.base import Base


class SubscriptionStatus(str, enum.Enum):
    """구독 상태"""
    ACTIVE = "active"          # 활성 구독
    CANCELLED = "cancelled"    # 취소됨 (기간 종료 시 만료)
    EXPIRED = "expired"        # 만료됨
    PAUSED = "paused"          # 일시정지
    GRACE_PERIOD = "grace_period"  # 결제 실패 유예 기간


class PaymentProvider(str, enum.Enum):
    """결제 제공자"""
    GOOGLE_PLAY = "google_play"  # Google Play 인앱결제
    APPLE = "apple"              # Apple App Store
    MANUAL = "manual"            # 수동 처리 (관리자)


class Subscription(Base):
    """구독 모델"""

    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # 구독 정보
    plan = Column(String(20), nullable=False)  # basic, pro
    status = Column(Enum(SubscriptionStatus), default=SubscriptionStatus.ACTIVE)
    provider = Column(Enum(PaymentProvider), nullable=False)

    # 외부 결제 정보
    external_subscription_id = Column(String(255), unique=True, index=True)  # Google Play purchase token
    external_product_id = Column(String(100))  # 상품 ID (예: notegen_basic_monthly)

    # 기간 정보
    current_period_start = Column(DateTime, nullable=False)
    current_period_end = Column(DateTime, nullable=False)
    cancelled_at = Column(DateTime, nullable=True)  # 취소 요청 시간

    # 메타데이터
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 관계
    user = relationship("User", backref="subscriptions")

    def __repr__(self):
        return f"<Subscription(id={self.id}, user_id={self.user_id}, plan='{self.plan}', status='{self.status}')>"

    @property
    def is_active(self) -> bool:
        """구독 활성 여부"""
        if self.status not in [SubscriptionStatus.ACTIVE, SubscriptionStatus.GRACE_PERIOD]:
            return False
        return datetime.utcnow() < self.current_period_end


class Payment(Base):
    """결제 내역 모델"""

    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=True)

    # 결제 정보
    amount = Column(Integer, nullable=False)  # 원 단위
    currency = Column(String(3), default="KRW")
    plan = Column(String(20), nullable=False)
    provider = Column(Enum(PaymentProvider), nullable=False)

    # 외부 결제 정보
    external_payment_id = Column(String(255), unique=True, index=True)  # 결제 ID
    external_order_id = Column(String(255), index=True)  # 주문 ID

    # 상태
    status = Column(String(20), default="completed")  # pending, completed, refunded, failed

    # 메타데이터
    raw_data = Column(Text, nullable=True)  # 원본 결제 데이터 (JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

    # 관계
    user = relationship("User", backref="payments")
    subscription = relationship("Subscription", backref="payments")

    def __repr__(self):
        return f"<Payment(id={self.id}, user_id={self.user_id}, amount={self.amount}, status='{self.status}')>"


class PurchaseVerification(Base):
    """구매 검증 로그 (디버깅/감사용)"""

    __tablename__ = "purchase_verifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # 검증 정보
    provider = Column(Enum(PaymentProvider), nullable=False)
    purchase_token = Column(String(500), nullable=False)
    product_id = Column(String(100), nullable=False)

    # 결과
    is_valid = Column(Boolean, nullable=False)
    error_message = Column(Text, nullable=True)
    raw_response = Column(Text, nullable=True)  # Google API 응답 (JSON)

    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<PurchaseVerification(id={self.id}, is_valid={self.is_valid})>"
