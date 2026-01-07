"""
Questions API
문제 생성/조회/풀이 API (역사 과목 MVP)
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.models.note import Note
from app.models.user import User
from app.models.concept_card import ConceptCard
from app.models.question import Question, UserQuestionAttempt, QuestionType, CognitiveLevel, ErrorType
from app.api.auth import get_current_user
from app.services.ai_service import ai_service

router = APIRouter()


@router.post("/generate/{note_id}")
async def generate_questions(
    note_id: int,
    question_count: int = 5,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """
    노트에서 문제 생성 (역사 과목 한정)

    - **note_id**: 노트 ID
    - **question_count**: 생성할 문제 수 (기본 5개, 최대 10개)
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")

    if question_count > 10:
        question_count = 10

    # 노트 조회
    note = db.query(Note).filter(
        Note.id == note_id,
        Note.user_id == current_user.id
    ).first()

    if not note:
        raise HTTPException(status_code=404, detail="노트를 찾을 수 없습니다.")

    # 역사 과목 확인
    if note.detected_subject and note.detected_subject.value != "history":
        raise HTTPException(
            status_code=400,
            detail=f"현재 역사 과목만 문제 생성을 지원합니다. (현재 과목: {note.detected_subject.value})"
        )

    # 노트의 Concept Card 조회
    concept_cards = db.query(ConceptCard).filter(
        ConceptCard.note_id == note_id
    ).all()

    all_questions = []

    if concept_cards:
        # 개념 카드가 있으면 카드 기반 문제 생성
        questions_per_card = max(1, question_count // len(concept_cards))
        remaining = question_count - (questions_per_card * len(concept_cards))

        for i, card in enumerate(concept_cards):
            count = questions_per_card + (1 if i < remaining else 0)
            if count == 0:
                continue

            try:
                generated = await ai_service.generate_history_questions(
                    concept_card=card.to_dict(),
                    question_count=count
                )

                for q in generated:
                    question = Question(
                        note_id=note_id,
                        concept_card_id=card.id,
                        user_id=current_user.id,
                        question_text=q["question_text"],
                        choices=q["choices"],
                        correct_answer=q["correct_answer"],
                        solution=q["solution"],
                        question_type=QuestionType.MCQ,
                        cognitive_level=CognitiveLevel(q["cognitive_level"]) if q.get("cognitive_level") else None,
                        induced_error_tags=q.get("induced_error_tags", []),
                        evidence_spans=card.evidence_spans,
                        subject="history"
                    )
                    db.add(question)
                    all_questions.append(question)

                card.question_count = (card.question_count or 0) + len(generated)

            except Exception as e:
                print(f"[Questions API] 카드 {card.id} 문제 생성 실패: {e}", flush=True)
                continue
    else:
        # 개념 카드가 없으면 노트 내용에서 직접 문제 생성
        if not note.organized_content:
            raise HTTPException(
                status_code=400,
                detail="노트에 정리된 내용이 없습니다."
            )

        try:
            print(f"[Questions API] 노트 기반 문제 생성 시작 - note_id: {note_id}", flush=True)
            generated = await ai_service.generate_history_questions_from_note(
                note_content=note.organized_content,
                question_count=question_count
            )
            print(f"[Questions API] AI 응답 받음 - {len(generated)}개 문제", flush=True)

            for i, q in enumerate(generated):
                try:
                    # cognitive_level 안전 변환
                    cog_level = None
                    if q.get("cognitive_level"):
                        try:
                            cog_level = CognitiveLevel(q["cognitive_level"])
                        except ValueError:
                            print(f"[Questions API] 유효하지 않은 cognitive_level: {q['cognitive_level']}", flush=True)
                            cog_level = CognitiveLevel.RECALL

                    question = Question(
                        note_id=note_id,
                        concept_card_id=None,
                        user_id=current_user.id,
                        question_text=q["question_text"],
                        choices=q["choices"],
                        correct_answer=q["correct_answer"],
                        solution=q.get("solution", ""),
                        question_type=QuestionType.MCQ,
                        cognitive_level=cog_level,
                        induced_error_tags=q.get("induced_error_tags", []),
                        evidence_spans=[],
                        subject="history"
                    )
                    db.add(question)
                    all_questions.append(question)
                except Exception as qe:
                    print(f"[Questions API] 문제 {i} 저장 실패: {qe}", flush=True)
                    continue

        except Exception as e:
            print(f"[Questions API] 노트 기반 문제 생성 실패: {type(e).__name__}: {e}", flush=True)
            import traceback
            print(f"[Questions API] Traceback: {traceback.format_exc()}", flush=True)
            raise HTTPException(status_code=500, detail="문제 생성 중 오류가 발생했습니다.")

    db.commit()

    # 생성된 문제 ID 목록 반환 (정답 제외)
    return {
        "message": f"{len(all_questions)}개 문제가 생성되었습니다.",
        "question_count": len(all_questions),
        "questions": [q.to_dict(include_answer=False) for q in all_questions]
    }


@router.get("/note/{note_id}")
async def get_questions_by_note(
    note_id: int,
    include_solved: bool = True,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """
    노트별 문제 목록 조회

    - **note_id**: 노트 ID
    - **include_solved**: 이미 푼 문제 포함 여부
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")

    # 노트 소유권 확인
    note = db.query(Note).filter(
        Note.id == note_id,
        Note.user_id == current_user.id
    ).first()

    if not note:
        raise HTTPException(status_code=404, detail="노트를 찾을 수 없습니다.")

    # 문제 조회
    query = db.query(Question).filter(
        Question.note_id == note_id,
        Question.user_id == current_user.id
    )

    if not include_solved:
        # 아직 풀지 않은 문제만
        solved_ids = db.query(UserQuestionAttempt.question_id).filter(
            UserQuestionAttempt.user_id == current_user.id
        ).subquery()
        query = query.filter(~Question.id.in_(solved_ids))

    questions = query.order_by(Question.created_at.desc()).all()

    return {
        "note_id": note_id,
        "note_title": note.title,
        "question_count": len(questions),
        "questions": [q.to_dict(include_answer=False) for q in questions]
    }


@router.get("/")
async def list_questions(
    subject: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """
    사용자의 전체 문제 목록 조회

    - **subject**: 과목 필터 (현재 history만 지원)
    - **skip**: 건너뛸 문제 수
    - **limit**: 가져올 문제 수 (최대 100)
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")

    if limit > 100:
        limit = 100

    query = db.query(Question).filter(Question.user_id == current_user.id)

    if subject:
        query = query.filter(Question.subject == subject)

    questions = query.order_by(Question.created_at.desc())\
        .offset(skip)\
        .limit(limit)\
        .all()

    return {
        "total": query.count(),
        "questions": [q.to_dict(include_answer=False) for q in questions]
    }


# 중요: /stats/summary와 /weak-practice는 /{question_id}보다 먼저 정의해야 함
@router.get("/stats/summary")
async def get_question_stats(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """
    사용자의 문제 풀이 통계
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")

    # 총 문제 수
    total_questions = db.query(Question).filter(
        Question.user_id == current_user.id
    ).count()

    # 풀이 기록
    attempts = db.query(UserQuestionAttempt).filter(
        UserQuestionAttempt.user_id == current_user.id
    ).all()

    total_attempts = len(attempts)
    correct_count = sum(1 for a in attempts if a.is_correct)

    # 오류 유형별 통계
    error_stats = {}
    for a in attempts:
        if not a.is_correct and a.error_type:
            error_stats[a.error_type] = error_stats.get(a.error_type, 0) + 1

    # 상위 오류 유형
    top_errors = sorted(error_stats.items(), key=lambda x: x[1], reverse=True)[:3]

    return {
        "total_questions": total_questions,
        "total_attempts": total_attempts,
        "correct_count": correct_count,
        "accuracy": round(correct_count / total_attempts * 100, 1) if total_attempts > 0 else 0,
        "error_stats": error_stats,
        "top_errors": [{"error_type": e[0], "count": e[1]} for e in top_errors]
    }


@router.get("/weak-practice")
async def get_weak_practice_questions(
    limit: int = 5,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """
    취약점 기반 맞춤 문제 추천

    사용자가 자주 틀리는 오류 유형의 문제를 우선 추천
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")

    if limit > 20:
        limit = 20

    # 최근 20개 오답에서 오류 유형 분석
    recent_wrong = db.query(UserQuestionAttempt).filter(
        UserQuestionAttempt.user_id == current_user.id,
        UserQuestionAttempt.is_correct == False,
        UserQuestionAttempt.error_type != None
    ).order_by(UserQuestionAttempt.attempted_at.desc()).limit(20).all()

    if not recent_wrong:
        # 오답 기록이 없으면 랜덤 문제
        questions = db.query(Question).filter(
            Question.user_id == current_user.id
        ).order_by(func.random()).limit(limit).all()

        return {
            "recommendation_type": "random",
            "message": "아직 오답 기록이 없어서 랜덤 문제를 추천합니다.",
            "questions": [q.to_dict(include_answer=False) for q in questions]
        }

    # 오류 유형별 빈도 계산
    error_freq = {}
    for a in recent_wrong:
        error_freq[a.error_type] = error_freq.get(a.error_type, 0) + 1

    top_error_types = sorted(error_freq.items(), key=lambda x: x[1], reverse=True)
    top_errors = [e[0] for e in top_error_types[:2]]

    # 이미 푼 문제 ID
    solved_ids = db.query(UserQuestionAttempt.question_id).filter(
        UserQuestionAttempt.user_id == current_user.id
    ).all()
    solved_id_set = {s[0] for s in solved_ids}

    # 해당 오류 유형을 유도하는 문제 중 아직 안 푼 것
    recommended = []
    for error_type in top_errors:
        questions = db.query(Question).filter(
            Question.user_id == current_user.id,
            Question.induced_error_tags.contains([error_type])
        ).all()

        for q in questions:
            if q.id not in solved_id_set and len(recommended) < limit:
                recommended.append(q)

    # 부족하면 랜덤으로 채우기
    if len(recommended) < limit:
        remaining = limit - len(recommended)
        random_qs = db.query(Question).filter(
            Question.user_id == current_user.id,
            ~Question.id.in_(solved_id_set),
            ~Question.id.in_([q.id for q in recommended])
        ).order_by(func.random()).limit(remaining).all()
        recommended.extend(random_qs)

    return {
        "recommendation_type": "weak_concept",
        "top_error_types": top_errors,
        "message": f"'{top_errors[0]}' 유형을 집중적으로 연습해보세요." if top_errors else "",
        "questions": [q.to_dict(include_answer=False) for q in recommended]
    }


@router.get("/{question_id}")
async def get_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """
    문제 상세 조회 (정답 미포함)
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")

    question = db.query(Question).filter(
        Question.id == question_id,
        Question.user_id == current_user.id
    ).first()

    if not question:
        raise HTTPException(status_code=404, detail="문제를 찾을 수 없습니다.")

    return question.to_dict(include_answer=False)


@router.post("/{question_id}/submit")
async def submit_answer(
    question_id: int,
    selected_answer: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """
    답안 제출 및 채점

    - **question_id**: 문제 ID
    - **selected_answer**: 선택한 답 인덱스 (0-based)
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")

    question = db.query(Question).filter(
        Question.id == question_id,
        Question.user_id == current_user.id
    ).first()

    if not question:
        raise HTTPException(status_code=404, detail="문제를 찾을 수 없습니다.")

    # 유효한 답인지 확인
    if selected_answer < 0 or selected_answer >= len(question.choices or []):
        raise HTTPException(status_code=400, detail="유효하지 않은 답입니다.")

    # 정답 여부 확인
    is_correct = selected_answer == question.correct_answer

    # 오답일 경우 오류 태그 결정
    error_type = None
    if not is_correct and question.induced_error_tags:
        # 선택한 답에 해당하는 오류 태그 (단순화: 첫 번째 태그 사용)
        error_type = question.induced_error_tags[0] if question.induced_error_tags else None

    # 풀이 기록 저장
    attempt = UserQuestionAttempt(
        user_id=current_user.id,
        question_id=question_id,
        selected_answer=selected_answer,
        is_correct=is_correct,
        error_type=error_type
    )
    db.add(attempt)
    db.commit()

    return {
        "is_correct": is_correct,
        "correct_answer": question.correct_answer,
        "selected_answer": selected_answer,
        "solution": question.solution,
        "error_type": error_type
    }
