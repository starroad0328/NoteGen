"""
OrganizeTemplate API
정리법 템플릿 API
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.models.organize_template import OrganizeTemplate, OutputStructure, UserTemplateSubscription, UserTemplateLike
from app.models.user import User, UserPlan
from app.schemas.template import TemplateResponse, TemplateDetailResponse, TemplateListResponse
from app.api.auth import get_current_user

router = APIRouter()


@router.get("", response_model=TemplateListResponse)
async def list_templates(
    subject: Optional[str] = Query(None, description="과목 필터"),
    plan: Optional[str] = Query(None, description="플랜 필터 (free/basic/pro)"),
    sort: str = Query("popular", description="정렬 (popular/newest)"),
    db: Session = Depends(get_db)
):
    """
    정리법 목록 조회
    - 시스템 정리법만 표시 (MVP)
    - 과목/플랜 필터링
    - 인기순/최신순 정렬
    """
    query = db.query(OrganizeTemplate).filter(OrganizeTemplate.is_system == True)

    # 과목 필터
    if subject:
        query = query.filter(
            (OrganizeTemplate.subject == subject) |
            (OrganizeTemplate.subject == None)
        )

    # 플랜 필터
    if plan:
        try:
            plan_enum = UserPlan(plan)
            query = query.filter(OrganizeTemplate.required_plan == plan_enum)
        except ValueError:
            pass

    # 정렬
    if sort == "newest":
        query = query.order_by(OrganizeTemplate.created_at.desc())
    else:  # popular
        query = query.order_by(OrganizeTemplate.usage_count.desc())

    templates = query.all()

    return TemplateListResponse(
        templates=[TemplateResponse(
            id=t.id,
            name=t.name,
            description=t.description,
            icon=t.icon,
            output_structure=t.output_structure.value,
            required_plan=t.required_plan.value,
            subject=t.subject,
            is_system=t.is_system,
            usage_count=t.usage_count,
            like_count=t.like_count or 0,
            created_at=t.created_at
        ) for t in templates],
        total=len(templates)
    )


# NOTE: 고정 경로는 /{template_id} 보다 먼저 정의해야 함
@router.get("/subscribed/list", response_model=TemplateListResponse)
async def list_subscribed_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """내가 구독한 정리법 목록"""
    subscriptions = db.query(UserTemplateSubscription).filter(
        UserTemplateSubscription.user_id == current_user.id
    ).all()

    template_ids = [s.template_id for s in subscriptions]
    templates = db.query(OrganizeTemplate).filter(
        OrganizeTemplate.id.in_(template_ids)
    ).all() if template_ids else []

    return TemplateListResponse(
        templates=[TemplateResponse(
            id=t.id,
            name=t.name,
            description=t.description,
            icon=t.icon,
            output_structure=t.output_structure.value,
            required_plan=t.required_plan.value,
            subject=t.subject,
            is_system=t.is_system,
            usage_count=t.usage_count,
            like_count=t.like_count or 0,
            created_at=t.created_at
        ) for t in templates],
        total=len(templates)
    )


@router.get("/liked/list")
async def list_liked_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """내가 좋아요한 정리법 ID 목록"""
    likes = db.query(UserTemplateLike).filter(
        UserTemplateLike.user_id == current_user.id
    ).all()

    return {"liked_ids": [like.template_id for like in likes]}


@router.get("/{template_id}", response_model=TemplateDetailResponse)
async def get_template(
    template_id: int,
    db: Session = Depends(get_db)
):
    """정리법 상세 조회"""
    template = db.query(OrganizeTemplate).filter(OrganizeTemplate.id == template_id).first()

    if not template:
        raise HTTPException(status_code=404, detail="정리법을 찾을 수 없습니다.")

    return TemplateDetailResponse(
        id=template.id,
        name=template.name,
        description=template.description,
        icon=template.icon,
        prompt=template.prompt,
        system_message=template.system_message,
        output_structure=template.output_structure.value,
        required_plan=template.required_plan.value,
        subject=template.subject,
        is_system=template.is_system,
        usage_count=template.usage_count,
        like_count=template.like_count or 0,
        created_at=template.created_at
    )


@router.post("/{template_id}/use")
async def use_template(
    template_id: int,
    db: Session = Depends(get_db)
):
    """정리법 사용 (사용 횟수 증가)"""
    template = db.query(OrganizeTemplate).filter(OrganizeTemplate.id == template_id).first()

    if not template:
        raise HTTPException(status_code=404, detail="정리법을 찾을 수 없습니다.")

    template.increment_usage()
    db.commit()

    return {"message": "사용 횟수가 증가했습니다.", "usage_count": template.usage_count}


@router.post("/{template_id}/subscribe")
async def subscribe_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """정리법 구독"""
    template = db.query(OrganizeTemplate).filter(OrganizeTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="정리법을 찾을 수 없습니다.")

    # 플랜 체크
    plan_order = ['free', 'basic', 'pro']
    user_plan_index = plan_order.index(current_user.plan.value)
    required_plan_index = plan_order.index(template.required_plan.value)
    if required_plan_index > user_plan_index:
        raise HTTPException(status_code=403, detail=f"{template.required_plan.value} 플랜이 필요합니다.")

    # 이미 구독 중인지 확인
    existing = db.query(UserTemplateSubscription).filter(
        UserTemplateSubscription.user_id == current_user.id,
        UserTemplateSubscription.template_id == template_id
    ).first()

    if existing:
        return {"message": "이미 구독 중입니다.", "subscribed": True}

    # 구독 추가
    subscription = UserTemplateSubscription(
        user_id=current_user.id,
        template_id=template_id
    )
    db.add(subscription)
    db.commit()

    return {"message": "구독되었습니다.", "subscribed": True}


@router.delete("/{template_id}/subscribe")
async def unsubscribe_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """정리법 구독 해제"""
    subscription = db.query(UserTemplateSubscription).filter(
        UserTemplateSubscription.user_id == current_user.id,
        UserTemplateSubscription.template_id == template_id
    ).first()

    if not subscription:
        return {"message": "구독 중이 아닙니다.", "subscribed": False}

    db.delete(subscription)
    db.commit()

    return {"message": "구독이 해제되었습니다.", "subscribed": False}


@router.post("/{template_id}/like")
async def like_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """정리법 좋아요"""
    template = db.query(OrganizeTemplate).filter(OrganizeTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="정리법을 찾을 수 없습니다.")

    # 이미 좋아요 했는지 확인
    existing = db.query(UserTemplateLike).filter(
        UserTemplateLike.user_id == current_user.id,
        UserTemplateLike.template_id == template_id
    ).first()

    if existing:
        return {"message": "이미 좋아요한 정리법입니다.", "liked": True, "like_count": template.like_count}

    # 좋아요 추가
    like = UserTemplateLike(
        user_id=current_user.id,
        template_id=template_id
    )
    db.add(like)
    template.like_count = (template.like_count or 0) + 1
    db.commit()

    return {"message": "좋아요!", "liked": True, "like_count": template.like_count}


@router.delete("/{template_id}/like")
async def unlike_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """정리법 좋아요 취소"""
    template = db.query(OrganizeTemplate).filter(OrganizeTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="정리법을 찾을 수 없습니다.")

    like = db.query(UserTemplateLike).filter(
        UserTemplateLike.user_id == current_user.id,
        UserTemplateLike.template_id == template_id
    ).first()

    if not like:
        return {"message": "좋아요하지 않은 정리법입니다.", "liked": False, "like_count": template.like_count}

    db.delete(like)
    template.like_count = max((template.like_count or 0) - 1, 0)
    db.commit()

    return {"message": "좋아요 취소", "liked": False, "like_count": template.like_count}
