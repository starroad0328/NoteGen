"""
Note Processing Pipeline API
노트 처리 파이프라인 통합 API
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session
import json

from app.core.database import get_db
from app.models.note import Note, ProcessStatus, Subject, NoteType
from app.models.user import User
from app.schemas.note import ProcessResponse
from app.services.ocr_service import ocr_service
from app.services.ai_service import ai_service

router = APIRouter()


async def process_note_pipeline(note_id: int):
    """
    노트 처리 파이프라인
    1. OCR 처리
    2. AI 정리
    3. 결과 저장
    """
    # 백그라운드 태스크용 새 DB 세션
    from app.core.database import SessionLocal
    db = SessionLocal()

    try:
        note = db.query(Note).filter(Note.id == note_id).first()

        if not note:
            db.close()
            return
        # 1. OCR 처리
        note.status = ProcessStatus.OCR_PROCESSING
        db.commit()

        image_paths = note.image_paths.split(",")

        # OCR 실행
        with open('./debug.log', 'a') as f:
            f.write(f"\n[{note_id}] Starting OCR...\n")

        ocr_result = await ocr_service.extract_text_from_images(image_paths)

        with open('./debug.log', 'a') as f:
            f.write(f"[{note_id}] OCR result type: {type(ocr_result)}\n")
            f.write(f"[{note_id}] OCR result: {isinstance(ocr_result, tuple)}\n")

        ocr_text, ocr_metadata = ocr_result

        with open('./debug.log', 'a') as f:
            f.write(f"[{note_id}] Text length: {len(ocr_text) if ocr_text else 0}\n")
            f.write(f"[{note_id}] Metadata not None: {ocr_metadata is not None}\n")
            f.write(f"[{note_id}] Metadata type: {type(ocr_metadata)}\n")

        if not ocr_text or not ocr_text.strip():
            raise Exception("이미지에서 텍스트를 추출할 수 없습니다.")

        note.ocr_text = ocr_text
        metadata_json = json.dumps(ocr_metadata) if ocr_metadata else None
        note.ocr_metadata = metadata_json

        with open('./debug.log', 'a') as f:
            f.write(f"[{note_id}] Metadata JSON length: {len(metadata_json) if metadata_json else 0}\n")
            f.write(f"[{note_id}] note.ocr_metadata set: {note.ocr_metadata is not None}\n")

        db.commit()

        with open('./debug.log', 'a') as f:
            f.write(f"[{note_id}] Committed to DB\n")

        # 2. AI 정리
        with open('./debug.log', 'a') as f:
            f.write(f"[{note_id}] Starting AI processing...\n")

        note.status = ProcessStatus.AI_ORGANIZING
        db.commit()

        # 사용자 학년 정보 조회
        user = None
        school_level = None
        grade = None
        if note.user_id:
            user = db.query(User).filter(User.id == note.user_id).first()
            if user:
                school_level = user.school_level
                grade = user.grade
                with open('./debug.log', 'a') as f:
                    f.write(f"[{note_id}] User grade info: {user.grade_display}\n")

        # AI 단계 진행 콜백
        async def on_ai_step(step: int, message: str):
            note.progress_message = f"[{step+1}/3] {message}"
            db.commit()
            print(f"[{note_id}] AI Step {step}: {message}", flush=True)

        with open('./debug.log', 'a') as f:
            f.write(f"[{note_id}] [PROCESS] organize_note 호출 직전\n")
            f.write(f"[{note_id}] [PROCESS] ocr_metadata type: {type(ocr_metadata)}\n")

        result = await ai_service.organize_note(
            ocr_text=ocr_text,
            method=note.organize_method,
            ocr_metadata=ocr_metadata,
            on_step=on_ai_step,
            school_level=school_level,
            grade=grade
        )

        with open('./debug.log', 'a') as f:
            f.write(f"[{note_id}] [PROCESS] organize_note 호출 완료\n")

        # 결과에서 콘텐츠와 감지 정보 추출
        organized_content = result.get("content", "")
        detected_subject_str = result.get("detected_subject", "other")
        detected_note_type_str = result.get("detected_note_type", "general")

        with open('./debug.log', 'a') as f:
            f.write(f"[{note_id}] AI result length: {len(organized_content) if organized_content else 0}\n")
            f.write(f"[{note_id}] Detected: subject={detected_subject_str}, note_type={detected_note_type_str}\n")

        # 문자열을 Enum으로 변환
        try:
            note.detected_subject = Subject(detected_subject_str)
        except ValueError:
            note.detected_subject = Subject.OTHER

        try:
            note.detected_note_type = NoteType(detected_note_type_str)
        except ValueError:
            note.detected_note_type = NoteType.GENERAL

        note.organized_content = organized_content
        note.status = ProcessStatus.COMPLETED
        db.commit()

        with open('./debug.log', 'a') as f:
            f.write(f"[{note_id}] AI processing completed\n")

    except Exception as e:
        note.status = ProcessStatus.FAILED
        note.error_message = str(e)
        db.commit()
        with open('./debug.log', 'a') as f:
            f.write(f"[{note_id}] ERROR: {str(e)}\n")
    finally:
        db.close()


@router.post("/{note_id}/process", response_model=ProcessResponse)
async def process_note(
    note_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    노트 처리 시작 (동기 - 디버깅용)

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

    # 임시: 동기 처리 (에러 확인용)
    await process_note_pipeline(note_id)

    # 처리 후 상태 다시 조회
    db.refresh(note)

    return ProcessResponse(
        note_id=note.id,
        status=note.status,
        message="노트 처리가 완료되었습니다." if note.status == ProcessStatus.COMPLETED else "처리 중...",
        organized_content=note.organized_content if note.status == ProcessStatus.COMPLETED else None
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

    # AI 단계 진행 중이면 progress_message 사용
    if note.status == ProcessStatus.AI_ORGANIZING and note.progress_message:
        message = note.progress_message
    else:
        status_messages = {
            ProcessStatus.UPLOADING: "업로드 완료",
            ProcessStatus.OCR_PROCESSING: "OCR 처리 중...",
            ProcessStatus.AI_ORGANIZING: "AI 정리 중...",
            ProcessStatus.COMPLETED: "처리 완료!",
            ProcessStatus.FAILED: f"처리 실패: {note.error_message}"
        }
        message = status_messages.get(note.status, "알 수 없는 상태")

    return ProcessResponse(
        note_id=note.id,
        status=note.status,
        message=message,
        organized_content=note.organized_content if note.status == ProcessStatus.COMPLETED else None,
        error_message=note.error_message if note.status == ProcessStatus.FAILED else None
    )
