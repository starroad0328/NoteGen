"""
Note Processing Pipeline API
노트 처리 파이프라인 통합 API
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session
import json
from datetime import datetime

from app.core.database import get_db
from app.models.note import Note, ProcessStatus, Subject, NoteType, OrganizeMethod
from app.models.user import User, UserPlan
from app.models.weak_concept import UserWeakConcept
from app.models.concept_card import ConceptCard, CardType
from app.schemas.note import ProcessResponse
from app.services.ocr_service import ocr_service
from app.services.ai_service import ai_service

router = APIRouter()


def debug_log(note_id: int, message: str):
    """안전한 디버그 로깅 (Railway 호환)"""
    try:
        print(f"[{note_id}] {message}", flush=True)
    except Exception:
        pass


# 과목명 한글 변환
SUBJECT_NAMES = {
    "math": "수학",
    "korean": "국어",
    "english": "영어",
    "science": "과학",
    "social": "사회",
    "history": "역사",
    "other": "필기",
}


def generate_note_title(subject: str, unit: str = "") -> str:
    """과목,날짜,단원 형식으로 제목 생성"""
    subject_name = SUBJECT_NAMES.get(subject, "필기")
    date_str = datetime.now().strftime("%y/%m/%d")

    if unit and unit.strip():
        return f"{subject_name},{date_str},{unit.strip()}"
    else:
        return f"{subject_name},{date_str}"


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

        # OCR 실행 (오답노트면 Google Vision 사용)
        use_google = note.organize_method == OrganizeMethod.ERROR_NOTE
        debug_log(note_id, f"Starting OCR... (use_google={use_google})")

        ocr_result = await ocr_service.extract_text_from_images(image_paths, use_google_for_math=use_google)
        debug_log(note_id, f"OCR result type: {type(ocr_result)}, is_tuple: {isinstance(ocr_result, tuple)}")

        ocr_text, ocr_metadata = ocr_result
        debug_log(note_id, f"Text length: {len(ocr_text) if ocr_text else 0}, Metadata: {ocr_metadata is not None}")

        if not ocr_text or not ocr_text.strip():
            raise Exception("이미지에서 텍스트를 추출할 수 없습니다.")

        note.ocr_text = ocr_text
        metadata_json = json.dumps(ocr_metadata) if ocr_metadata else None
        note.ocr_metadata = metadata_json
        debug_log(note_id, f"Metadata JSON length: {len(metadata_json) if metadata_json else 0}")

        db.commit()
        debug_log(note_id, "Committed OCR to DB")

        # 2. AI 정리
        debug_log(note_id, "Starting AI processing...")

        note.status = ProcessStatus.AI_ORGANIZING
        db.commit()

        # 사용자 학년 정보 및 플랜별 AI 모델 조회
        user = None
        school_level = None
        grade = None
        ai_model = None  # 플랜별 AI 모델
        if note.user_id:
            user = db.query(User).filter(User.id == note.user_id).first()
            if user:
                school_level = user.school_level
                grade = user.grade
                ai_model = user.get_default_model()  # 플랜에 맞는 AI 모델
                debug_log(note_id, f"User: {user.grade_display}, plan={user.plan.value}, model={ai_model.value}")

        # AI 단계 진행 콜백
        async def on_ai_step(step: int, message: str):
            note.progress_message = f"[{step+1}/3] {message}"
            db.commit()
            debug_log(note_id, f"AI Step {step}: {message}")

        debug_log(note_id, f"organize_note 호출 직전, ocr_metadata type: {type(ocr_metadata)}, ai_model: {ai_model}")

        result = await ai_service.organize_note(
            ocr_text=ocr_text,
            method=note.organize_method,
            ocr_metadata=ocr_metadata,
            on_step=on_ai_step,
            school_level=school_level,
            grade=grade,
            ai_model=ai_model  # 플랜별 AI 모델 전달
        )

        debug_log(note_id, "organize_note 호출 완료")

        # 결과에서 콘텐츠와 감지 정보 추출
        organized_content = result.get("content", "")
        detected_subject_str = result.get("detected_subject", "other")
        detected_note_type_str = result.get("detected_note_type", "general")
        detected_unit = result.get("detected_unit", "")

        debug_log(note_id, f"AI result length: {len(organized_content) if organized_content else 0}")
        debug_log(note_id, f"Detected: subject={detected_subject_str}, note_type={detected_note_type_str}, unit={detected_unit}")

        # 문자열을 Enum으로 변환
        try:
            note.detected_subject = Subject(detected_subject_str)
        except ValueError:
            note.detected_subject = Subject.OTHER

        try:
            note.detected_note_type = NoteType(detected_note_type_str)
        except ValueError:
            note.detected_note_type = NoteType.GENERAL

        # 자동 제목 생성 (과목,날짜,단원 형식)
        note.title = generate_note_title(detected_subject_str, detected_unit)

        note.organized_content = organized_content
        note.status = ProcessStatus.COMPLETED
        db.commit()

        # 프로 사용자 + 오답노트인 경우 취약 개념 추출 및 저장
        if user and user.plan == UserPlan.PRO and detected_note_type_str == "error_note":
            try:
                debug_log(note_id, "Pro user - extracting weak concepts...")

                weak_concepts = await ai_service.extract_weak_concepts(
                    organized_content=organized_content,
                    subject=detected_subject_str,
                    unit=detected_unit
                )

                for concept_data in weak_concepts:
                    # 기존 취약 개념 확인
                    existing = db.query(UserWeakConcept).filter(
                        UserWeakConcept.user_id == user.id,
                        UserWeakConcept.subject == detected_subject_str,
                        UserWeakConcept.concept == concept_data["concept"]
                    ).first()

                    if existing:
                        # 기존 개념이면 횟수 증가
                        existing.increment_error(
                            note_id=note_id,
                            error_reason=concept_data.get("error_reason")
                        )
                    else:
                        # 새 취약 개념 생성
                        new_concept = UserWeakConcept(
                            user_id=user.id,
                            subject=detected_subject_str,
                            unit=detected_unit,
                            concept=concept_data["concept"],
                            error_reason=concept_data.get("error_reason"),
                            last_note_id=note_id
                        )
                        db.add(new_concept)

                db.commit()
                debug_log(note_id, f"Saved {len(weak_concepts)} weak concepts")

            except Exception as e:
                debug_log(note_id, f"Weak concept extraction error: {str(e)}")

        # Concept Card 추출 및 저장 (문제 생성용)
        try:
            debug_log(note_id, "Extracting concept cards...")

            concept_cards = await ai_service.extract_concept_cards(
                organized_content=organized_content,
                subject=detected_subject_str,
                unit=detected_unit,
                note_type=detected_note_type_str
            )

            for card_data in concept_cards:
                # CardType enum 변환
                try:
                    card_type = CardType(card_data.get("card_type", "concept"))
                except ValueError:
                    card_type = CardType.CONCEPT

                new_card = ConceptCard(
                    note_id=note_id,
                    user_id=note.user_id,
                    card_type=card_type,
                    title=card_data.get("title", ""),
                    subject=detected_subject_str,
                    unit_id=detected_unit,
                    unit_name=detected_unit,
                    content=card_data.get("content", {}),
                    common_mistakes=card_data.get("common_mistakes", []),
                    evidence_spans=card_data.get("evidence_spans", [])
                )
                db.add(new_card)

            db.commit()
            debug_log(note_id, f"Saved {len(concept_cards)} concept cards")

        except Exception as e:
            debug_log(note_id, f"Concept card extraction error: {str(e)}")

        debug_log(note_id, "AI processing completed")

    except Exception as e:
        note.status = ProcessStatus.FAILED
        note.error_message = str(e)
        db.commit()
        debug_log(note_id, f"ERROR: {str(e)}")
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


@router.post("/{note_id}/reprocess", response_model=ProcessResponse)
async def reprocess_note(
    note_id: int,
    db: Session = Depends(get_db)
):
    """
    노트 AI 재처리 (OCR 스킵, AI만 다시 실행)
    """
    note = db.query(Note).filter(Note.id == note_id).first()

    if not note:
        raise HTTPException(status_code=404, detail="노트를 찾을 수 없습니다.")

    if not note.ocr_text:
        raise HTTPException(status_code=400, detail="OCR 텍스트가 없습니다. 전체 재처리가 필요합니다.")

    # AI만 다시 실행
    note.status = ProcessStatus.AI_ORGANIZING
    db.commit()

    try:
        # 사용자 학년 정보 및 플랜별 AI 모델 조회
        user = None
        school_level = None
        grade = None
        ai_model = None
        if note.user_id:
            user = db.query(User).filter(User.id == note.user_id).first()
            if user:
                school_level = user.school_level
                grade = user.grade
                ai_model = user.get_default_model()

        # OCR 메타데이터 파싱
        ocr_metadata = None
        if note.ocr_metadata:
            ocr_metadata = json.loads(note.ocr_metadata)

        debug_log(note_id, "REPROCESS - BEFORE organize_note call")

        result = await ai_service.organize_note(
            ocr_text=note.ocr_text,
            method=note.organize_method,
            ocr_metadata=ocr_metadata,
            school_level=school_level,
            grade=grade,
            ai_model=ai_model  # 플랜별 AI 모델 전달
        )

        debug_log(note_id, f"REPROCESS - AFTER organize_note, result keys: {list(result.keys())}")

        # 결과 저장
        organized_content = result.get("content", "")
        detected_subject_str = result.get("detected_subject", "other")
        detected_note_type_str = result.get("detected_note_type", "general")
        detected_unit = result.get("detected_unit", "")

        try:
            note.detected_subject = Subject(detected_subject_str)
        except ValueError:
            note.detected_subject = Subject.OTHER

        try:
            note.detected_note_type = NoteType(detected_note_type_str)
        except ValueError:
            note.detected_note_type = NoteType.GENERAL

        # 자동 제목 생성 (과목,날짜,단원 형식)
        note.title = generate_note_title(detected_subject_str, detected_unit)

        note.organized_content = organized_content
        note.status = ProcessStatus.COMPLETED
        db.commit()

        # 프로 사용자 + 오답노트인 경우 취약 개념 추출 및 저장
        debug_log(note_id, f"REPROCESS - user={user is not None}, plan={user.plan.value if user else 'N/A'}, note_type={detected_note_type_str}")
        if user and user.plan == UserPlan.PRO and detected_note_type_str == "error_note":
            try:
                debug_log(note_id, "REPROCESS - Pro user - extracting weak concepts...")
                weak_concepts = await ai_service.extract_weak_concepts(
                    organized_content=organized_content,
                    subject=detected_subject_str,
                    unit=detected_unit
                )

                for concept_data in weak_concepts:
                    existing = db.query(UserWeakConcept).filter(
                        UserWeakConcept.user_id == user.id,
                        UserWeakConcept.subject == detected_subject_str,
                        UserWeakConcept.concept == concept_data["concept"]
                    ).first()

                    if existing:
                        existing.increment_error(
                            note_id=note_id,
                            error_reason=concept_data.get("error_reason")
                        )
                    else:
                        new_concept = UserWeakConcept(
                            user_id=user.id,
                            subject=detected_subject_str,
                            unit=detected_unit,
                            concept=concept_data["concept"],
                            error_reason=concept_data.get("error_reason"),
                            last_note_id=note_id
                        )
                        db.add(new_concept)

                db.commit()
            except Exception as e:
                print(f"[reprocess] Weak concept extraction error: {str(e)}")

        return ProcessResponse(
            note_id=note.id,
            status=note.status,
            message="AI 재처리 완료",
            organized_content=note.organized_content
        )

    except Exception as e:
        note.status = ProcessStatus.FAILED
        note.error_message = str(e)
        db.commit()
        raise HTTPException(status_code=500, detail=f"AI 재처리 실패: {str(e)}")


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
        error_message=note.error_message if note.status == ProcessStatus.FAILED else None,
        detected_note_type=note.detected_note_type.value if note.detected_note_type else None,
        organize_method=note.organize_method.value if note.organize_method else None
    )

