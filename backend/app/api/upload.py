"""
File Upload API
파일 업로드 엔드포인트
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
import os
import uuid
from datetime import datetime

from app.core.config import settings
from app.core.database import get_db
from app.models.note import Note, OrganizeMethod, ProcessStatus
from app.schemas.note import NoteResponse

router = APIRouter()


def validate_file(file: UploadFile) -> bool:
    """파일 유효성 검증"""
    # 파일 확장자 확인
    file_ext = file.filename.split('.')[-1].lower()
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"허용되지 않은 파일 형식입니다. 허용: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )
    return True


def save_upload_file(file: UploadFile) -> str:
    """업로드 파일 저장"""
    # 고유 파일명 생성
    file_ext = file.filename.split('.')[-1].lower()
    unique_filename = f"{uuid.uuid4()}.{file_ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)

    # 파일 저장
    with open(file_path, "wb") as buffer:
        content = file.file.read()

        # 파일 크기 확인
        if len(content) > settings.MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"파일 크기가 너무 큽니다. 최대: {settings.MAX_UPLOAD_SIZE / (1024*1024)}MB"
            )

        buffer.write(content)

    return file_path


@router.post("/", response_model=NoteResponse)
async def upload_images(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(..., description="이미지 파일 (최대 3개)"),
    organize_method: OrganizeMethod = Form(default=OrganizeMethod.BASIC_SUMMARY),
    db: Session = Depends(get_db)
):
    """
    필기 이미지 업로드 및 자동 처리 시작

    - **files**: 이미지 파일 리스트 (JPG, PNG)
    - **organize_method**: 정리 방식 (basic_summary 또는 cornell)
    """

    # 파일 개수 확인
    if len(files) > settings.MAX_FILES_PER_UPLOAD:
        raise HTTPException(
            status_code=400,
            detail=f"최대 {settings.MAX_FILES_PER_UPLOAD}개까지 업로드 가능합니다."
        )

    # 파일 검증 및 저장
    saved_paths = []
    try:
        for file in files:
            validate_file(file)
            file_path = save_upload_file(file)
            saved_paths.append(file_path)
    except Exception as e:
        # 에러 발생 시 이미 저장된 파일 삭제
        for path in saved_paths:
            if os.path.exists(path):
                os.remove(path)
        raise e

    # 노트 생성
    note = Note(
        title=f"필기 {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        image_paths=",".join(saved_paths),  # 쉼표로 구분하여 저장
        organize_method=organize_method,
        status=ProcessStatus.UPLOADING
    )

    db.add(note)
    db.commit()
    db.refresh(note)

    # 자동으로 처리 시작 (백그라운드)
    from app.api.process import process_note_pipeline
    background_tasks.add_task(process_note_pipeline, note.id)

    return note


@router.get("/{note_id}", response_model=NoteResponse)
async def get_note(
    note_id: int,
    db: Session = Depends(get_db)
):
    """노트 조회"""
    note = db.query(Note).filter(Note.id == note_id).first()

    if not note:
        raise HTTPException(status_code=404, detail="노트를 찾을 수 없습니다.")

    return note
