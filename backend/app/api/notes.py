"""
Notes Management API
노트 관리 API
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.note import Note
from app.schemas.note import NoteResponse, NoteListResponse

router = APIRouter()


@router.get("/", response_model=List[NoteListResponse])
async def list_notes(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """
    노트 목록 조회

    - **skip**: 건너뛸 노트 수
    - **limit**: 가져올 노트 수 (최대 100)
    """
    if limit > 100:
        limit = 100

    notes = db.query(Note)\
        .order_by(Note.created_at.desc())\
        .offset(skip)\
        .limit(limit)\
        .all()

    return notes


@router.get("/{note_id}", response_model=NoteResponse)
async def get_note(
    note_id: int,
    db: Session = Depends(get_db)
):
    """노트 상세 조회"""
    note = db.query(Note).filter(Note.id == note_id).first()

    if not note:
        raise HTTPException(status_code=404, detail="노트를 찾을 수 없습니다.")

    return note


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
