"""
Payment API Router
결제 및 구독 관리 API
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import json

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import User, UserPlan
from app.models.subscription import (
    Subscription, Payment, PurchaseVerification,
    SubscriptionStatus, PaymentProvider
)

router = APIRouter(prefix="/api/payment", tags=["payment"])


# ============================================
# Schemas
# ============================================

class GooglePlayPurchaseRequest(BaseModel):
    """Google Play 구매 검증 요청"""
    purchase_token: str
    product_id: str  # 예: notegen_basic_monthly, notegen_pro_monthly
    package_name: str = "com.notegen.app"


class SubscriptionResponse(BaseModel):
    """구독 정보 응답"""
    id: int
    plan: str
    status: str
    provider: str
    current_period_start: datetime
    current_period_end: datetime
    cancelled_at: Optional[datetime]
    is_active: bool


class PaymentHistoryResponse(BaseModel):
    """결제 내역 응답"""
    id: int
    amount: int
    currency: str
    plan: str
    status: str
    created_at: datetime


class VerifyPurchaseResponse(BaseModel):
    """구매 검증 응답"""
    success: bool
    message: str
    subscription: Optional[SubscriptionResponse]
    new_plan: Optional[str]


# ============================================
# Product Configuration
# ============================================

# Google Play 상품 ID -> 플랜 매핑
PRODUCT_PLAN_MAP = {
    "notegen_basic_monthly": {"plan": "basic", "months": 1, "price": 6990},
    "notegen_basic_yearly": {"plan": "basic", "months": 12, "price": 69900},
    "notegen_pro_monthly": {"plan": "pro", "months": 1, "price": 14900},
    "notegen_pro_yearly": {"plan": "pro", "months": 12, "price": 149000},
}


# ============================================
# Helper Functions
# ============================================

def get_active_subscription(db: Session, user_id: int) -> Optional[Subscription]:
    """활성 구독 조회"""
    return db.query(Subscription).filter(
        Subscription.user_id == user_id,
        Subscription.status.in_([SubscriptionStatus.ACTIVE, SubscriptionStatus.GRACE_PERIOD]),
        Subscription.current_period_end > datetime.utcnow()
    ).first()


def update_user_plan(db: Session, user: User, plan: str) -> None:
    """사용자 플랜 업데이트"""
    plan_map = {
        "basic": UserPlan.BASIC,
        "pro": UserPlan.PRO,
        "free": UserPlan.FREE,
    }
    user.plan = plan_map.get(plan, UserPlan.FREE)
    db.commit()


# ============================================
# API Endpoints
# ============================================

@router.post("/verify-purchase", response_model=VerifyPurchaseResponse)
async def verify_google_play_purchase(
    request: GooglePlayPurchaseRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Google Play 구매 검증 및 구독 활성화

    MVP 단계: 클라이언트 구매 정보를 신뢰하고 저장
    TODO: Google Play Developer API로 실제 검증 추가
    """

    # 상품 정보 확인
    product_info = PRODUCT_PLAN_MAP.get(request.product_id)
    if not product_info:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown product ID: {request.product_id}"
        )

    plan = product_info["plan"]
    months = product_info["months"]
    price = product_info["price"]

    # 중복 구매 확인
    existing = db.query(Subscription).filter(
        Subscription.external_subscription_id == request.purchase_token
    ).first()

    if existing:
        return VerifyPurchaseResponse(
            success=True,
            message="이미 처리된 구매입니다.",
            subscription=SubscriptionResponse(
                id=existing.id,
                plan=existing.plan,
                status=existing.status.value,
                provider=existing.provider.value,
                current_period_start=existing.current_period_start,
                current_period_end=existing.current_period_end,
                cancelled_at=existing.cancelled_at,
                is_active=existing.is_active
            ),
            new_plan=None
        )

    # 구매 검증 로그 저장
    verification = PurchaseVerification(
        user_id=current_user.id,
        provider=PaymentProvider.GOOGLE_PLAY,
        purchase_token=request.purchase_token,
        product_id=request.product_id,
        is_valid=True,  # MVP: 클라이언트 신뢰
        raw_response=json.dumps({"note": "MVP - client trusted"})
    )
    db.add(verification)

    # 기존 활성 구독 만료 처리
    active_sub = get_active_subscription(db, current_user.id)
    if active_sub:
        active_sub.status = SubscriptionStatus.CANCELLED
        active_sub.cancelled_at = datetime.utcnow()

    # 새 구독 생성
    now = datetime.utcnow()
    subscription = Subscription(
        user_id=current_user.id,
        plan=plan,
        status=SubscriptionStatus.ACTIVE,
        provider=PaymentProvider.GOOGLE_PLAY,
        external_subscription_id=request.purchase_token,
        external_product_id=request.product_id,
        current_period_start=now,
        current_period_end=now + timedelta(days=30 * months)
    )
    db.add(subscription)

    # 결제 내역 저장
    payment = Payment(
        user_id=current_user.id,
        subscription_id=subscription.id,
        amount=price,
        currency="KRW",
        plan=plan,
        provider=PaymentProvider.GOOGLE_PLAY,
        external_payment_id=request.purchase_token,
        status="completed",
        raw_data=json.dumps({
            "product_id": request.product_id,
            "package_name": request.package_name,
        })
    )
    db.add(payment)

    # 사용자 플랜 업데이트
    update_user_plan(db, current_user, plan)

    db.commit()
    db.refresh(subscription)

    return VerifyPurchaseResponse(
        success=True,
        message=f"{plan.upper()} 플랜이 활성화되었습니다!",
        subscription=SubscriptionResponse(
            id=subscription.id,
            plan=subscription.plan,
            status=subscription.status.value,
            provider=subscription.provider.value,
            current_period_start=subscription.current_period_start,
            current_period_end=subscription.current_period_end,
            cancelled_at=subscription.cancelled_at,
            is_active=subscription.is_active
        ),
        new_plan=plan
    )


@router.get("/subscription", response_model=Optional[SubscriptionResponse])
async def get_current_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """현재 활성 구독 조회"""
    subscription = get_active_subscription(db, current_user.id)

    if not subscription:
        return None

    return SubscriptionResponse(
        id=subscription.id,
        plan=subscription.plan,
        status=subscription.status.value,
        provider=subscription.provider.value,
        current_period_start=subscription.current_period_start,
        current_period_end=subscription.current_period_end,
        cancelled_at=subscription.cancelled_at,
        is_active=subscription.is_active
    )


@router.post("/subscription/cancel")
async def cancel_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    구독 취소 (기간 종료 시 만료)

    Note: Google Play 구독은 Google Play에서 직접 취소해야 함
    이 엔드포인트는 서버 측 상태만 업데이트
    """
    subscription = get_active_subscription(db, current_user.id)

    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="활성 구독이 없습니다."
        )

    subscription.status = SubscriptionStatus.CANCELLED
    subscription.cancelled_at = datetime.utcnow()
    db.commit()

    return {
        "message": "구독이 취소되었습니다. 현재 기간이 종료될 때까지 서비스를 이용하실 수 있습니다.",
        "expires_at": subscription.current_period_end.isoformat()
    }


@router.get("/history", response_model=list[PaymentHistoryResponse])
async def get_payment_history(
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """결제 내역 조회"""
    payments = db.query(Payment).filter(
        Payment.user_id == current_user.id
    ).order_by(Payment.created_at.desc()).limit(limit).all()

    return [
        PaymentHistoryResponse(
            id=p.id,
            amount=p.amount,
            currency=p.currency,
            plan=p.plan,
            status=p.status,
            created_at=p.created_at
        )
        for p in payments
    ]


@router.post("/restore")
async def restore_purchases(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    구매 복원 (앱 재설치 시)

    활성 구독이 있으면 사용자 플랜 복원
    """
    subscription = get_active_subscription(db, current_user.id)

    if subscription and subscription.is_active:
        update_user_plan(db, current_user, subscription.plan)
        return {
            "restored": True,
            "plan": subscription.plan,
            "message": f"{subscription.plan.upper()} 플랜이 복원되었습니다."
        }

    # 활성 구독 없으면 FREE로
    update_user_plan(db, current_user, "free")
    return {
        "restored": False,
        "plan": "free",
        "message": "활성 구독이 없습니다."
    }
