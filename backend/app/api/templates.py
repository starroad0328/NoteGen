"""
OrganizeTemplate API
정리법 템플릿 API
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.models.organize_template import OrganizeTemplate, OutputStructure
from app.models.user import User, UserPlan
from app.schemas.template import TemplateResponse, TemplateDetailResponse, TemplateListResponse
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
            created_at=t.created_at
        ) for t in templates],
        total=len(templates)
    )


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
