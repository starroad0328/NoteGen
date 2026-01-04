"""
Weak Concepts API
취약 개념 조회/분석 API (Pro 전용)
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.models.user import User, UserPlan
from app.models.weak_concept import UserWeakConcept
from app.models.note import Note
from app.api.auth import get_current_user

router = APIRouter()


# Response Models
class WeakConceptResponse(BaseModel):
    id: int
    subject: str
    unit: Optional[str]
    concept: str
    error_reason: Optional[str]
    error_count: int
    first_error_at: datetime
    last_error_at: datetime
    last_note_id: Optional[int] = None
    last_note_title: Optional[str] = None

    class Config:
        from_attributes = True


class SubjectSummary(BaseModel):
    subject: str
    subject_name: str
    total_concepts: int
    total_errors: int
    top_concept: Optional[str]


class WeakConceptsOverview(BaseModel):
    total_weak_concepts: int
    total_errors: int
    subjects: List[SubjectSummary]
    recent_concepts: List[WeakConceptResponse]


# 과목명 한글 변환
SUBJECT_NAMES = {
    "math": "수학",
    "korean": "국어",
    "english": "영어",
    "science": "과학",
    "social": "사회",
    "history": "역사",
    "other": "기타",
}


@router.get("/", response_model=List[WeakConceptResponse])
async def get_weak_concepts(
    subject: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    사용자의 취약 개념 목록 조회 (Pro 전용)

    - **subject**: 과목 필터 (선택)
    - **limit**: 최대 개수 (기본 20)
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")

    if current_user.plan != UserPlan.PRO:
        raise HTTPException(status_code=403, detail="Pro 플랜 전용 기능입니다.")

    query = db.query(UserWeakConcept).filter(
        UserWeakConcept.user_id == current_user.id
    )

    if subject:
        query = query.filter(UserWeakConcept.subject == subject)

    concepts = query.order_by(
        UserWeakConcept.error_count.desc(),
        UserWeakConcept.last_error_at.desc()
    ).limit(limit).all()

    # 노트 제목 추가
    result = []
    for concept in concepts:
        concept_dict = {
            "id": concept.id,
            "subject": concept.subject,
            "unit": concept.unit,
            "concept": concept.concept,
            "error_reason": concept.error_reason,
            "error_count": concept.error_count,
            "first_error_at": concept.first_error_at,
            "last_error_at": concept.last_error_at,
            "last_note_id": concept.last_note_id,
            "last_note_title": None
        }
        if concept.last_note_id:
            note = db.query(Note).filter(Note.id == concept.last_note_id).first()
            if note:
                concept_dict["last_note_title"] = note.title
        result.append(concept_dict)

    return result


@router.get("/overview", response_model=WeakConceptsOverview)
async def get_weak_concepts_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    취약 개념 전체 요약 (Pro 전용)

    - 총 취약 개념 수
    - 과목별 요약
    - 최근 틀린 개념
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")

    if current_user.plan != UserPlan.PRO:
        raise HTTPException(status_code=403, detail="Pro 플랜 전용 기능입니다.")

    # 전체 통계
    total_concepts = db.query(UserWeakConcept).filter(
        UserWeakConcept.user_id == current_user.id
    ).count()

    total_errors = db.query(func.sum(UserWeakConcept.error_count)).filter(
        UserWeakConcept.user_id == current_user.id
    ).scalar() or 0

    # 과목별 요약
    subject_stats = db.query(
        UserWeakConcept.subject,
        func.count(UserWeakConcept.id).label("concept_count"),
        func.sum(UserWeakConcept.error_count).label("error_sum")
    ).filter(
        UserWeakConcept.user_id == current_user.id
    ).group_by(UserWeakConcept.subject).all()

    subjects = []
    for stat in subject_stats:
        # 해당 과목에서 가장 많이 틀린 개념
        top = db.query(UserWeakConcept).filter(
            UserWeakConcept.user_id == current_user.id,
            UserWeakConcept.subject == stat.subject
        ).order_by(UserWeakConcept.error_count.desc()).first()

        subjects.append(SubjectSummary(
            subject=stat.subject,
            subject_name=SUBJECT_NAMES.get(stat.subject, stat.subject),
            total_concepts=stat.concept_count,
            total_errors=stat.error_sum or 0,
            top_concept=top.concept if top else None
        ))

    # 최근 틀린 개념 5개
    recent = db.query(UserWeakConcept).filter(
        UserWeakConcept.user_id == current_user.id
    ).order_by(UserWeakConcept.last_error_at.desc()).limit(5).all()

    return WeakConceptsOverview(
        total_weak_concepts=total_concepts,
        total_errors=total_errors,
        subjects=subjects,
        recent_concepts=recent
    )


@router.get("/subject/{subject}", response_model=List[WeakConceptResponse])
async def get_weak_concepts_by_subject(
    subject: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """특정 과목의 취약 개념 목록 (Pro 전용)"""
    if not current_user:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")

    if current_user.plan != UserPlan.PRO:
        raise HTTPException(status_code=403, detail="Pro 플랜 전용 기능입니다.")

    concepts = db.query(UserWeakConcept).filter(
        UserWeakConcept.user_id == current_user.id,
        UserWeakConcept.subject == subject
    ).order_by(
        UserWeakConcept.error_count.desc(),
        UserWeakConcept.last_error_at.desc()
    ).all()

    return concepts


@router.delete("/{concept_id}")
async def delete_weak_concept(
    concept_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """취약 개념 삭제 (Pro 전용)"""
    if not current_user:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")

    if current_user.plan != UserPlan.PRO:
        raise HTTPException(status_code=403, detail="Pro 플랜 전용 기능입니다.")

    concept = db.query(UserWeakConcept).filter(
        UserWeakConcept.id == concept_id,
        UserWeakConcept.user_id == current_user.id
    ).first()

    if not concept:
        raise HTTPException(status_code=404, detail="취약 개념을 찾을 수 없습니다.")

    db.delete(concept)
    db.commit()

    return {"message": "취약 개념이 삭제되었습니다.", "concept_id": concept_id}
