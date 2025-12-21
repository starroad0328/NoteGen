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
from app.schemas.note import NoteResponse, NoteListResponse
from app.api.auth import get_current_user

router = APIRouter()


def get_thumbnail_url(image_paths: str) -> str | None:
    """이미지 경로에서 첫 번째 이미지의 URL 생성"""
    if not image_paths:
        return None
    first_path = image_paths.split(",")[0]
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
        if path.startswith("./"):
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
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """
    노트 목록 조회 (로그인 사용자의 노트만)

    - **skip**: 건너뛸 노트 수
    - **limit**: 가져올 노트 수 (최대 100)
    """
    if limit > 100:
        limit = 100

    # 로그인 사용자의 노트만 조회
    query = db.query(Note)
    if current_user:
        query = query.filter(Note.user_id == current_user.id)
    else:
        return []

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
    }


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

    db.delete(note)
    db.commit()

    return {"message": "노트가 삭제되었습니다.", "note_id": note_id}
