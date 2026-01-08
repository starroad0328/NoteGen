"""
Auth API Endpoints
인증 관련 API 엔드포인트
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.models.user import User, AIMode
from app.schemas.auth import (
    UserRegister, UserLogin, Token, UserResponse, UserUpdate,
    UsageResponse, PlanInfo, PlansResponse
)
from app.services.auth_service import (
    get_password_hash, verify_password, create_access_token, decode_access_token
)

router = APIRouter(prefix="/api/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """현재 로그인한 사용자 가져오기 (선택적)"""
    if not credentials:
        return None

    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    user = db.query(User).filter(User.id == int(user_id)).first()
    return user


def require_user(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer()),
    db: Session = Depends(get_db)
) -> User:
    """현재 로그인한 사용자 필수"""
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    return user


@router.post("/register", response_model=Token)
async def register(data: UserRegister, db: Session = Depends(get_db)):
    """회원가입"""
    # 이메일 중복 체크
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # 학년 유효성 체크
    if data.grade and (data.grade < 1 or data.grade > 3):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Grade must be 1, 2, or 3"
        )

    # 사용자 생성
    user = User(
        email=data.email,
        password_hash=get_password_hash(data.password),
        name=data.name,
        school_level=data.school_level,
        grade=data.grade
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # 토큰 발급
    access_token = create_access_token(data={"sub": str(user.id)})
    return Token(access_token=access_token)


@router.post("/login", response_model=Token)
async def login(data: UserLogin, db: Session = Depends(get_db)):
    """로그인"""
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # 토큰 발급
    access_token = create_access_token(data={"sub": str(user.id)})
    return Token(access_token=access_token)


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(require_user)):
    """현재 사용자 정보"""
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        school_level=user.school_level.value if user.school_level else None,
        grade=user.grade,
        grade_display=user.grade_display,
        plan=user.plan.value,
        ai_mode=user.ai_mode.value if user.ai_mode else "fast"
    )


@router.put("/me", response_model=UserResponse)
async def update_me(
    data: UserUpdate,
    user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    """사용자 정보 업데이트"""
    if data.name is not None:
        user.name = data.name
    if data.school_level is not None:
        user.school_level = data.school_level
    if data.grade is not None:
        if data.grade < 1 or data.grade > 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Grade must be 1, 2, or 3"
            )
        user.grade = data.grade

    db.commit()
    db.refresh(user)

    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        school_level=user.school_level.value if user.school_level else None,
        grade=user.grade,
        grade_display=user.grade_display,
        plan=user.plan.value,
        ai_mode=user.ai_mode.value if user.ai_mode else "fast"
    )


@router.get("/usage", response_model=UsageResponse)
async def get_usage(
    user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    """사용량 조회"""
    # 월이 바뀌었으면 리셋
    user.check_and_reset_usage()
    db.commit()

    usage_info = user.get_usage_info()
    return UsageResponse(**usage_info)


@router.get("/plans", response_model=PlansResponse)
async def get_plans(
    user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    """플랜 목록 및 현재 사용량 조회"""
    # 월이 바뀌었으면 리셋
    user.check_and_reset_usage()
    db.commit()

    usage_info = user.get_usage_info()

    # 플랜 정보 정의
    plans = [
        PlanInfo(
            id="free",
            name="Free",
            price=0,
            price_display="무료",
            monthly_limit=10,
            features=[
                "월 10회 필기 정리",
                "AI 모델: GPT-5 mini",
                "Free용 정리법",
                "문제 자동 생성 5문제",
                "노트 저장/검색",
            ],
            is_current=user.plan.value == "free"
        ),
        PlanInfo(
            id="basic",
            name="Basic",
            price=6990,
            price_display="6,990/월",
            monthly_limit=100,
            features=[
                "월 100회 필기 정리",
                "AI 모델: GPT-5",
                "Basic용 정리법",
                "문제 자동 생성 15문제",
                "노트 저장/검색",
            ],
            is_current=user.plan.value == "basic"
        ),
        PlanInfo(
            id="pro",
            name="Pro",
            price=14900,
            price_display="14,900/월",
            monthly_limit=-1,
            features=[
                "무제한 필기 정리",
                "AI 모델: GPT-5.2",
                "Pro용 정리법",
                "문제 자동 생성 30문제",
                "개념 강조",
                "출제자 관점 정리",
                "헷갈리는 개념 비교표",
                "시험 직전 압축 노트",
            ],
            is_current=user.plan.value == "pro"
        ),
    ]

    return PlansResponse(
        current_plan=user.plan.value,
        usage=UsageResponse(**usage_info),
        plans=plans
    )


@router.post("/admin/set-plan")
async def admin_set_plan(
    email: str,
    plan: str,
    admin_key: str,
    db: Session = Depends(get_db)
):
    """관리자: 사용자 플랜 변경"""
    # 간단한 관리자 키 검증
    if admin_key != "notegen-admin-2026":
        raise HTTPException(status_code=403, detail="Invalid admin key")

    from app.models.user import UserPlan

    # 사용자 찾기
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 플랜 변경
    plan_map = {
        "free": UserPlan.FREE,
        "basic": UserPlan.BASIC,
        "pro": UserPlan.PRO,
    }

    if plan not in plan_map:
        raise HTTPException(status_code=400, detail="Invalid plan. Use: free, basic, pro")

    user.plan = plan_map[plan]
    db.commit()

    return {"message": f"User {email} plan changed to {plan}"}


@router.get("/me/ai-mode")
async def get_ai_mode(user: User = Depends(require_user)):
    """AI 모드 조회"""
    return {
        "ai_mode": user.ai_mode.value if user.ai_mode else "fast",
        "description": "빠른 모드 (~70초)" if user.ai_mode == AIMode.FAST else "품질 모드 (~110초)"
    }


@router.patch("/me/ai-mode")
async def update_ai_mode(
    ai_mode: str,
    user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    """AI 모드 변경"""
    mode_map = {
        "fast": AIMode.FAST,
        "quality": AIMode.QUALITY,
    }

    if ai_mode not in mode_map:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ai_mode. Use: fast, quality"
        )

    user.ai_mode = mode_map[ai_mode]
    db.commit()

    return {
        "ai_mode": user.ai_mode.value,
        "description": "빠른 모드 (~70초)" if user.ai_mode == AIMode.FAST else "품질 모드 (~110초)"
    }
