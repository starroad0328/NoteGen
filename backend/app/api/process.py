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
    노트 처리 파이프라인 (2단계 분리)
    1. OCR 처리
    2. AI Step 0+1: 구조 파악 + 노트 타입 감지
    3. 확인 필요 여부 체크 (오답노트 감지 + 다른 방식 선택)
    4. AI Step 2: 콘텐츠 생성
    5. 결과 저장
    """
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
        ocr_text, ocr_metadata = ocr_result
        debug_log(note_id, f"Text length: {len(ocr_text) if ocr_text else 0}")

        if not ocr_text or not ocr_text.strip():
            raise Exception("이미지에서 텍스트를 추출할 수 없습니다.")

        note.ocr_text = ocr_text
        metadata_json = json.dumps(ocr_metadata) if ocr_metadata else None
        note.ocr_metadata = metadata_json
        db.commit()

        # 2. AI Step 0+1: 구조 파악 + 노트 타입 감지
        note.status = ProcessStatus.AI_ORGANIZING
        note.progress_message = "[1/3] 필기 구조 분석 중..."
        db.commit()

        # 사용자 정보 조회
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
                debug_log(note_id, f"User: {user.grade_display}, plan={user.plan.value}")

        # Step 0 + Step 1 실행 (노트 타입 감지)
        detection_result = await ai_service.detect_note_type_only(
            ocr_text=ocr_text,
            ocr_metadata=ocr_metadata,
            ai_model=ai_model,
            school_level=school_level,
            grade=grade
        )

        detected_subject_str = detection_result["detected_subject"]
        detected_note_type_str = detection_result["detected_note_type"]
        detected_unit = detection_result["detected_unit"]

        debug_log(note_id, f"Detection: subject={detected_subject_str}, type={detected_note_type_str}")

        # 감지 결과 저장
        try:
            note.detected_subject = Subject(detected_subject_str)
        except ValueError:
            note.detected_subject = Subject.OTHER

        try:
            note.detected_note_type = NoteType(detected_note_type_str)
        except ValueError:
            note.detected_note_type = NoteType.GENERAL

        # 3. 확인 필요 여부 체크 (V2로 미룸 - 비활성화)
        # 오답노트로 감지됐는데 사용자가 다른 방식을 선택한 경우
        # needs_confirmation = (
        #     detected_note_type_str == "error_note" and
        #     note.organize_method != OrganizeMethod.ERROR_NOTE
        # )
        needs_confirmation = False  # V2까지 비활성화

        if needs_confirmation:
            debug_log(note_id, "Confirmation needed: detected error_note but user selected different method")

            # 중간 결과 캐시 저장
            cache_data = {
                "refined_text": detection_result["refined_text"],
                "structure": detection_result["structure"],
                "curriculum_context": detection_result["curriculum_context"],
                "detected_subject": detected_subject_str,
                "detected_note_type": detected_note_type_str,
                "detected_unit": detected_unit
            }
            note.detection_cache = json.dumps(cache_data, ensure_ascii=False)
            note.status = ProcessStatus.CONFIRMATION_NEEDED
            note.progress_message = "오답노트로 변경할지 확인 필요"
            db.commit()

            debug_log(note_id, "Paused for user confirmation")
            return  # 여기서 중단, 사용자 확인 대기

        # 4. AI Step 2: 콘텐츠 생성 (확인 불필요시 바로 진행)
        await continue_processing(
            db, note, user,
            detection_result["refined_text"],
            detection_result["structure"],
            detection_result["curriculum_context"],
            detected_subject_str,
            detected_note_type_str,
            detected_unit,
            ocr_metadata,
            ai_model
        )

    except Exception as e:
        note.status = ProcessStatus.FAILED
        note.error_message = str(e)
        db.commit()
        debug_log(note_id, f"ERROR: {str(e)}")
    finally:
        db.close()


async def continue_processing(
    db, note, user,
    refined_text: str,
    structure: str,
    curriculum_context: str,
    detected_subject_str: str,
    detected_note_type_str: str,
    detected_unit: str,
    ocr_metadata,
    ai_model
):
    """Step 2 이후 처리 (콘텐츠 생성 + 취약 개념/카드 추출)"""
    note_id = note.id

    note.status = ProcessStatus.AI_ORGANIZING
    note.progress_message = "[2/3] AI 정리 생성 중..."
    db.commit()

    # Step 2: 콘텐츠 생성
    organized_content = await ai_service.continue_content_generation(
        refined_text=refined_text,
        structure=structure,
        method=note.organize_method,
        detected_subject=detected_subject_str,
        detected_note_type=detected_note_type_str,
        ocr_metadata=ocr_metadata,
        ai_model=ai_model,
        curriculum_context=curriculum_context
    )

    debug_log(note_id, f"Content generated: {len(organized_content)} chars")

    # 제목 생성 및 결과 저장
    note.title = generate_note_title(detected_subject_str, detected_unit)
    note.organized_content = organized_content
    note.status = ProcessStatus.COMPLETED
    note.detection_cache = None  # 캐시 정리
    db.commit()

    # 프로 사용자 + 오답노트인 경우 취약 개념 추출
    if user and user.plan == UserPlan.PRO and note.organize_method == OrganizeMethod.ERROR_NOTE:
        try:
            debug_log(note_id, "Pro user - extracting weak concepts...")

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
            debug_log(note_id, f"Saved {len(weak_concepts)} weak concepts")

        except Exception as e:
            debug_log(note_id, f"Weak concept extraction error: {str(e)}")

    # Concept Card 추출
    try:
        debug_log(note_id, "Extracting concept cards...")

        concept_cards = await ai_service.extract_concept_cards(
            organized_content=organized_content,
            subject=detected_subject_str,
            unit=detected_unit,
            note_type=detected_note_type_str
        )

        for card_data in concept_cards:
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

    debug_log(note_id, "Processing completed")


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


@router.post("/{note_id}/confirm-type")
async def confirm_note_type(
    note_id: int,
    convert_to_error_note: bool = False,
    db: Session = Depends(get_db)
):
    """
    오답노트 변환 확인 후 처리 계속

    - convert_to_error_note=True: 오답노트로 변경 후 처리
    - convert_to_error_note=False: 원래 선택한 방식으로 처리
    """
    note = db.query(Note).filter(Note.id == note_id).first()

    if not note:
        raise HTTPException(status_code=404, detail="노트를 찾을 수 없습니다.")

    if note.status != ProcessStatus.CONFIRMATION_NEEDED:
        raise HTTPException(status_code=400, detail="확인 대기 상태가 아닙니다.")

    if not note.detection_cache:
        raise HTTPException(status_code=400, detail="감지 캐시가 없습니다.")

    # 캐시 데이터 로드
    cache_data = json.loads(note.detection_cache)

    # 오답노트로 변경 요청시
    if convert_to_error_note:
        note.organize_method = OrganizeMethod.ERROR_NOTE
        debug_log(note_id, "User confirmed: convert to error_note")
    else:
        debug_log(note_id, "User confirmed: keep original method")

    # 사용자 정보 조회
    user = None
    ai_model = None
    if note.user_id:
        user = db.query(User).filter(User.id == note.user_id).first()
        if user:
            ai_model = user.get_default_model()

    # OCR 메타데이터 파싱
    ocr_metadata = None
    if note.ocr_metadata:
        ocr_metadata = json.loads(note.ocr_metadata)

    # Step 2 계속 실행
    try:
        await continue_processing(
            db, note, user,
            cache_data["refined_text"],
            cache_data["structure"],
            cache_data["curriculum_context"],
            cache_data["detected_subject"],
            cache_data["detected_note_type"],
            cache_data["detected_unit"],
            ocr_metadata,
            ai_model
        )

        return ProcessResponse(
            note_id=note.id,
            status=note.status,
            message="처리 완료!",
            organized_content=note.organized_content
        )

    except Exception as e:
        note.status = ProcessStatus.FAILED
        note.error_message = str(e)
        db.commit()
        raise HTTPException(status_code=500, detail=f"처리 실패: {str(e)}")


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
            ProcessStatus.CONFIRMATION_NEEDED: "오답노트로 변경할지 확인해주세요",
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

