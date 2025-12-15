"""
Note Processing Pipeline API
노트 처리 파이프라인 통합 API
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.note import Note, ProcessStatus
from app.schemas.note import ProcessResponse
from app.services.ocr_service import ocr_service
from app.services.ai_service import ai_service

router = APIRouter()


async def process_note_pipeline(note_id: int, db: Session):
    """
    노트 처리 파이프라인
    1. OCR 처리
    2. AI 정리
    3. 결과 저장
    """
    note = db.query(Note).filter(Note.id == note_id).first()

    if not note:
        return

    try:
        # 1. OCR 처리
        note.status = ProcessStatus.OCR_PROCESSING
        db.commit()

        image_paths = note.image_paths.split(",")
        ocr_text = await ocr_service.extract_text_from_images(image_paths)

        if not ocr_text or not ocr_text.strip():
            raise Exception("이미지에서 텍스트를 추출할 수 없습니다.")

        note.ocr_text = ocr_text
        db.commit()

        # 2. AI 정리
        note.status = ProcessStatus.AI_ORGANIZING
        db.commit()

        organized_content = await ai_service.organize_note(
            ocr_text=ocr_text,
            method=note.organize_method
        )

        note.organized_content = organized_content
        note.status = ProcessStatus.COMPLETED
        db.commit()

    except Exception as e:
        note.status = ProcessStatus.FAILED
        note.error_message = str(e)
        db.commit()


@router.post("/{note_id}/process", response_model=ProcessResponse)
async def process_note(
    note_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    노트 처리 시작 (비동기)

    업로드된 노트를 OCR + AI 정리 파이프라인으로 처리합니다.
    """
    note = db.query(Note).filter(Note.id == note_id).first()

    if not note:
        raise HTTPException(status_code=404, detail="노트를 찾을 수 없습니다.")

    if note.status not in [ProcessStatus.UPLOADING, ProcessStatus.FAILED]:
        raise HTTPException(
            status_code=400,
            detail=f"현재 노트 상태에서는 처리할 수 없습니다. 상태: {note.status}"
        )

    # 백그라운드에서 처리
    background_tasks.add_task(process_note_pipeline, note_id, db)

    return ProcessResponse(
        note_id=note.id,
        status=ProcessStatus.OCR_PROCESSING,
        message="노트 처리가 시작되었습니다. 완료까지 잠시 기다려주세요."
    )


@router.get("/{note_id}/status", response_model=ProcessResponse)
async def get_process_status(
    note_id: int,
    db: Session = Depends(get_db)
):
    """처리 상태 조회"""
    note = db.query(Note).filter(Note.id == note_id).first()

    if not note:
        raise HTTPException(status_code=404, detail="노트를 찾을 수 없습니다.")

    status_messages = {
        ProcessStatus.UPLOADING: "업로드 완료",
        ProcessStatus.OCR_PROCESSING: "OCR 처리 중...",
        ProcessStatus.AI_ORGANIZING: "AI 정리 중...",
        ProcessStatus.COMPLETED: "처리 완료!",
        ProcessStatus.FAILED: f"처리 실패: {note.error_message}"
    }

    return ProcessResponse(
        note_id=note.id,
        status=note.status,
        message=status_messages.get(note.status, "알 수 없는 상태"),
        organized_content=note.organized_content if note.status == ProcessStatus.COMPLETED else None,
        error_message=note.error_message if note.status == ProcessStatus.FAILED else None
    )
