"""
Notes Management API
노트 관리 API
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.models.note import Note
from app.models.user import User
from app.models.weak_concept import UserWeakConcept
from app.models.concept_card import ConceptCard
from app.schemas.note import NoteResponse, NoteListResponse, NoteUpdate
from app.api.auth import get_current_user

router = APIRouter()


def get_thumbnail_url(image_paths: str) -> str | None:
    """이미지 경로에서 첫 번째 이미지의 URL 생성"""
    if not image_paths:
        return None
    first_path = image_paths.split(",")[0].strip()
    # Cloudinary URL은 그대로 반환
    if first_path.startswith("http://") or first_path.startswith("https://"):
        return first_path
    # "./uploads/uuid.jpg" -> "/uploads/uuid.jpg"
    if first_path.startswith("./"):
        return first_path[1:]  # "." 제거
    elif first_path.startswith("uploads/"):
        return "/" + first_path
    return first_path


def get_image_urls(image_paths: str) -> List[str]:
    """이미지 경로들을 URL 목록으로 변환"""
    if not image_paths:
        return []
    urls = []
    for path in image_paths.split(","):
        path = path.strip()
        # Cloudinary URL은 그대로 반환
        if path.startswith("http://") or path.startswith("https://"):
            urls.append(path)
        elif path.startswith("./"):
            urls.append(path[1:])  # "." 제거
        elif path.startswith("uploads/"):
            urls.append("/" + path)
        else:
            urls.append(path)
    return urls


@router.get("/", response_model=List[NoteListResponse])
async def list_notes(
    skip: int = 0,
    limit: int = 20,
    subject: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """
    노트 목록 조회 (로그인 사용자의 노트만)

    - **skip**: 건너뛸 노트 수
    - **limit**: 가져올 노트 수 (최대 100)
    - **subject**: 과목 필터 (math, korean, english, social, science, history 또는 all)
    - **search**: 제목 검색어
    """
    if limit > 100:
        limit = 100

    # 로그인 사용자의 노트만 조회
    query = db.query(Note)
    if current_user:
        query = query.filter(Note.user_id == current_user.id)
    else:
        return []

    # 과목 필터 적용
    if subject and subject != "all":
        from app.models.note import Subject as SubjectEnum
        try:
            subject_enum = SubjectEnum(subject)
            query = query.filter(Note.detected_subject == subject_enum)
        except ValueError:
            pass  # 잘못된 과목명은 무시

    # 제목 검색 적용
    if search and search.strip():
        query = query.filter(Note.title.ilike(f"%{search.strip()}%"))

    notes = query.order_by(Note.created_at.desc())\
        .offset(skip)\
        .limit(limit)\
        .all()

    # thumbnail_url 추가
    result = []
    for note in notes:
        note_dict = {
            "id": note.id,
            "title": note.title,
            "created_at": note.created_at,
            "status": note.status,
            "thumbnail_url": get_thumbnail_url(note.image_paths)
        }
        result.append(note_dict)

    return result


# 주의: 이 라우트는 /{note_id} 보다 먼저 정의해야 함 (라우팅 우선순위)
@router.get("/user/concept-cards")
async def get_user_concept_cards(
    subject: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """
    사용자의 전체 Concept Card 조회 (문제 생성용)

    - **subject**: 과목 필터 (math, korean, english 등)
    - **limit**: 가져올 카드 수 (최대 100)
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")

    if limit > 100:
        limit = 100

    query = db.query(ConceptCard).filter(ConceptCard.user_id == current_user.id)

    if subject:
        query = query.filter(ConceptCard.subject == subject)

    cards = query.order_by(ConceptCard.created_at.desc()).limit(limit).all()

    return [card.to_dict() for card in cards]


@router.get("/{note_id}", response_model=NoteResponse)
async def get_note(
    note_id: int,
    db: Session = Depends(get_db)
):
    """노트 상세 조회"""
    note = db.query(Note).filter(Note.id == note_id).first()

    if not note:
        raise HTTPException(status_code=404, detail="노트를 찾을 수 없습니다.")

    return {
        "id": note.id,
        "title": note.title,
        "created_at": note.created_at,
        "organize_method": note.organize_method,
        "status": note.status,
        "organized_content": note.organized_content,
        "error_message": note.error_message,
        "image_urls": get_image_urls(note.image_paths),
        "detected_subject": note.detected_subject.value if note.detected_subject else None,
    }


@router.patch("/{note_id}")
async def update_note(
    note_id: int,
    update_data: NoteUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """노트 제목 수정"""
    note = db.query(Note).filter(Note.id == note_id).first()

    if not note:
        raise HTTPException(status_code=404, detail="노트를 찾을 수 없습니다.")

    # 권한 확인: 로그인한 사용자의 노트인지 확인
    if current_user and note.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="권한이 없습니다.")

    note.title = update_data.title
    db.commit()
    db.refresh(note)

    return {"message": "노트 제목이 수정되었습니다.", "note_id": note_id, "title": note.title}


@router.post("/{note_id}/convert-to-error-note")
async def convert_to_error_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """노트를 오답노트로 변경하고 재처리"""
    from app.models.note import OrganizeMethod

    note = db.query(Note).filter(Note.id == note_id).first()

    if not note:
        raise HTTPException(status_code=404, detail="노트를 찾을 수 없습니다.")

    # 권한 확인
    if current_user and note.user_id and note.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="권한이 없습니다.")

    # 오답노트로 변경
    note.organize_method = OrganizeMethod.ERROR_NOTE

    db.commit()

    return {"message": "오답노트로 변경되었습니다.", "note_id": note_id}


@router.delete("/{note_id}")
async def delete_note(
    note_id: int,
    db: Session = Depends(get_db)
):
    """노트 삭제"""
    note = db.query(Note).filter(Note.id == note_id).first()

    if not note:
        raise HTTPException(status_code=404, detail="노트를 찾을 수 없습니다.")

    # 이미지 파일 삭제
    import os
    if note.image_paths:
        for path in note.image_paths.split(","):
            if os.path.exists(path):
                try:
                    os.remove(path)
                except Exception:
                    pass

    # 관련 취약 개념 삭제
    db.query(UserWeakConcept).filter(UserWeakConcept.last_note_id == note_id).delete()

    # 관련 Concept Card 삭제
    db.query(ConceptCard).filter(ConceptCard.note_id == note_id).delete()

    db.delete(note)
    db.commit()

    return {"message": "노트가 삭제되었습니다.", "note_id": note_id}


@router.get("/{note_id}/concept-cards")
async def get_concept_cards(
    note_id: int,
    db: Session = Depends(get_db)
):
    """노트의 Concept Card 목록 조회"""
    note = db.query(Note).filter(Note.id == note_id).first()

    if not note:
        raise HTTPException(status_code=404, detail="노트를 찾을 수 없습니다.")

    cards = db.query(ConceptCard).filter(ConceptCard.note_id == note_id).all()

    return [card.to_dict() for card in cards]