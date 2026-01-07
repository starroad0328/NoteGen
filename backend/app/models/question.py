"""
Question Database Model
문제 및 풀이 기록 데이터베이스 모델
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, JSON, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.models.base import Base


class QuestionType(str, enum.Enum):
    """문제 형식"""
    MCQ = "mcq"                    # 객관식 (4지선다)
    TRUE_FALSE = "true_false"      # 참/거짓
    MATCHING = "matching"          # 매칭
    SHORT_ANSWER = "short_answer"  # 단답형


class CognitiveLevel(str, enum.Enum):
    """인지 단계 (역사 과목)"""
    RECALL = "recall"              # 용어/사건 회상
    SEQUENCE = "sequence"          # 순서/연표
    CAUSE_EFFECT = "cause_effect"  # 원인-결과
    COMPARE = "compare"            # 비교/구분


class ErrorType(str, enum.Enum):
    """오류 유형 태그 (역사 과목)"""
    TERM_CONFUSION = "term_confusion"            # 용어/개념 혼동
    CHRONOLOGY_CONFUSION = "chronology_confusion"  # 연도/순서 혼동
    CAUSE_EFFECT_MIXUP = "cause_effect_mixup"    # 원인-결과 뒤바꿈
    COMPARISON_MISS = "comparison_miss"          # 비교 포인트 누락
    EVIDENCE_MISS = "evidence_miss"              # 근거 못 찾음
    CARELESS = "careless"                        # 단순 실수


class Question(Base):
    """
    문제 모델

    ConceptCard 기반으로 AI가 생성한 문제 저장
    """

    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)

    # 연결 관계
    note_id = Column(Integer, ForeignKey("notes.id", ondelete="CASCADE"), nullable=False, index=True)
    concept_card_id = Column(Integer, ForeignKey("concept_cards.id", ondelete="SET NULL"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # 문제 내용
    question_text = Column(Text, nullable=False)
    choices = Column(JSON, nullable=True)  # ["A", "B", "C", "D"] (객관식용)
    correct_answer = Column(Integer, nullable=True)  # 정답 인덱스 (0-based)
    solution = Column(Text, nullable=True)  # 해설

    # 태그
    question_type = Column(Enum(QuestionType), default=QuestionType.MCQ)
    cognitive_level = Column(Enum(CognitiveLevel), nullable=True)
    induced_error_tags = Column(JSON, nullable=True)  # ["term_confusion", "chronology_confusion"]

    # 근거
    evidence_spans = Column(JSON, nullable=True)  # ["필기 5줄", ...]

    # 메타데이터
    subject = Column(String(50), default="history", index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<Question(id={self.id}, type='{self.question_type}', subject='{self.subject}')>"

    def to_dict(self, include_answer: bool = False):
        """JSON 직렬화용 (정답 포함 여부 선택)"""
        result = {
            "id": self.id,
            "note_id": self.note_id,
            "concept_card_id": self.concept_card_id,
            "question_text": self.question_text,
            "choices": self.choices,
            "question_type": self.question_type.value if self.question_type else None,
            "cognitive_level": self.cognitive_level.value if self.cognitive_level else None,
            "subject": self.subject,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

        if include_answer:
            result["correct_answer"] = self.correct_answer
            result["solution"] = self.solution
            result["induced_error_tags"] = self.induced_error_tags
            result["evidence_spans"] = self.evidence_spans

        return result


class UserQuestionAttempt(Base):
    """
    사용자 문제 풀이 기록 모델

    오답 분석 및 취약점 추적에 활용
    """

    __tablename__ = "user_question_attempts"

    id = Column(Integer, primary_key=True, index=True)

    # 연결 관계
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True)

    # 풀이 결과
    selected_answer = Column(Integer, nullable=False)  # 사용자가 선택한 답
    is_correct = Column(Boolean, nullable=False)  # 정답 여부
    error_type = Column(String(50), nullable=True)  # 오답 시 오류 유형

    # 메타데이터
    attempted_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<UserQuestionAttempt(id={self.id}, question_id={self.question_id}, is_correct={self.is_correct})>"

    def to_dict(self):
        """JSON 직렬화용"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "question_id": self.question_id,
            "selected_answer": self.selected_answer,
            "is_correct": self.is_correct,
            "error_type": self.error_type,
            "attempted_at": self.attempted_at.isoformat() if self.attempted_at else None,
        }
