"""
Auth API Endpoints
인증 관련 API 엔드포인트
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.models.user import User
from app.schemas.auth import (
    UserRegister, UserLogin, Token, UserResponse, UserUpdate
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
        plan=user.plan.value
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
        plan=user.plan.value
    )
