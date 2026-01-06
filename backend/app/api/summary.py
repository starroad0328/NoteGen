"""
Summary Note API
요약 노트 생성 API
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field
from enum import Enum

from app.core.database import get_db
from app.models.note import Note, ProcessStatus
from app.models.user import User, UserPlan, AIModel
from app.api.auth import get_current_user
from app.services.ai_service import AIService

router = APIRouter()


class SummaryStyle(str, Enum):
    """요약 스타일"""
    BASIC = "basic"         # 기본 요약 (무료/베이직/프로)
    KEYWORD = "keyword"     # 키워드 중심 (프로 전용)
    TABLE = "table"         # 표 형식 (프로 전용)


class SummaryRequest(BaseModel):
    """요약 생성 요청"""
    note_ids: List[int] = Field(..., min_length=1, description="요약할 노트 ID 목록")
    style: SummaryStyle = Field(default=SummaryStyle.BASIC, description="요약 스타일")
    title: Optional[str] = Field(default=None, description="요약 노트 제목 (없으면 자동 생성)")


class SummaryResponse(BaseModel):
    """요약 생성 응답"""
    id: int
    title: str
    content: str
    source_note_ids: List[int]
    style: str


@router.get("/limits")
async def get_summary_limits(
    current_user: User = Depends(get_current_user)
):
    """
    현재 사용자의 요약 생성 제한 정보 조회
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")

    usage_info = current_user.get_summary_usage_info()

    # 사용 가능한 스타일
    available_styles = ["basic"]
    if current_user.plan == UserPlan.PRO:
        available_styles.extend(["keyword", "table"])

    return {
        **usage_info,
        "available_styles": available_styles,
    }


@router.post("/generate", response_model=SummaryResponse)
async def generate_summary(
    request: SummaryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    선택한 노트들을 기반으로 시험용 요약 노트 생성

    - **note_ids**: 요약할 노트 ID 목록
    - **style**: 요약 스타일 (basic, keyword, table)
    - **title**: 요약 노트 제목 (선택)
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")

    # 사용량 체크
    if not current_user.can_generate_summary():
        usage_info = current_user.get_summary_usage_info()
        raise HTTPException(
            status_code=429,
            detail={
                "message": f"이번 달 요약 생성 한도({usage_info['limit']}회)를 모두 사용했습니다.",
                "usage": usage_info,
                "upgrade_required": True
            }
        )

    # 선택 가능한 노트 수 체크
    max_notes = current_user.get_summary_max_notes()
    if len(request.note_ids) > max_notes:
        raise HTTPException(
            status_code=400,
            detail=f"현재 플랜에서는 최대 {max_notes}개의 노트만 선택할 수 있습니다."
        )

    # 스타일 권한 체크
    if request.style in [SummaryStyle.KEYWORD, SummaryStyle.TABLE]:
        if current_user.plan != UserPlan.PRO:
            raise HTTPException(
                status_code=403,
                detail="키워드/표 형식 요약은 PRO 플랜에서만 사용할 수 있습니다."
            )

    # 노트 조회
    notes = db.query(Note).filter(
        Note.id.in_(request.note_ids),
        Note.user_id == current_user.id,
        Note.status == ProcessStatus.COMPLETED
    ).all()

    if len(notes) != len(request.note_ids):
        raise HTTPException(
            status_code=404,
            detail="일부 노트를 찾을 수 없거나 접근 권한이 없습니다."
        )

    # 노트 내용 수집
    note_contents = []
    subjects = set()
    for note in notes:
        if note.organized_content:
            note_contents.append({
                "title": note.title,
                "content": note.organized_content,
                "subject": note.detected_subject.value if note.detected_subject else "other"
            })
            if note.detected_subject:
                subjects.add(note.detected_subject.value)

    if not note_contents:
        raise HTTPException(
            status_code=400,
            detail="요약할 내용이 있는 노트가 없습니다."
        )

    # AI 서비스로 요약 생성
    ai_service = AIService()

    try:
        summary_result = await ai_service.generate_summary(
            note_contents=note_contents,
            style=request.style.value,
            user_plan=current_user.plan,
            school_level=current_user.school_level,
            grade=current_user.grade
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"요약 생성 중 오류가 발생했습니다: {str(e)}")

    # 제목 생성
    if request.title:
        summary_title = request.title
    else:
        # 자동 제목 생성
        subject_str = ", ".join([get_subject_name(s) for s in subjects]) if subjects else "통합"
        summary_title = f"{subject_str} 요약 노트"

    # 요약 노트 저장 (새로운 Note로 저장)
    from datetime import datetime
    summary_note = Note(
        title=summary_title,
        user_id=current_user.id,
        organized_content=summary_result["content"],
        status=ProcessStatus.COMPLETED,
        organize_method=None,  # 요약 노트는 별도 타입
        detected_subject=notes[0].detected_subject if len(subjects) == 1 else None,
    )
    db.add(summary_note)

    # 사용량 증가
    current_user.increment_summary_usage()
    db.commit()
    db.refresh(summary_note)

    return SummaryResponse(
        id=summary_note.id,
        title=summary_note.title,
        content=summary_note.organized_content,
        source_note_ids=request.note_ids,
        style=request.style.value
    )


def get_subject_name(subject_code: str) -> str:
    """과목 코드를 한글명으로 변환"""
    names = {
        "math": "수학",
        "korean": "국어",
        "english": "영어",
        "science": "과학",
        "social": "사회",
        "history": "역사",
        "other": "기타"
    }
    return names.get(subject_code, subject_code)
