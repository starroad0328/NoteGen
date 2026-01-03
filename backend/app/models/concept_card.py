"""
Concept Card Database Model
개념 카드 데이터베이스 모델 - 문제 생성의 기반
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.models.base import Base


class CardType(str, enum.Enum):
    """카드 유형 (과목별)"""
    # 공통
    CONCEPT = "concept"  # 개념/정의

    # 수학
    FORMULA = "formula"  # 공식
    SOLUTION = "solution"  # 풀이 과정

    # 영어
    PASSAGE = "passage"  # 지문
    VOCAB = "vocab"  # 단어/표현
    GRAMMAR = "grammar"  # 문법

    # 국어
    LITERATURE = "literature"  # 문학 작품

    # 과학
    PROCESS = "process"  # 과정/메커니즘
    EXPERIMENT = "experiment"  # 실험
    DIAGRAM = "diagram"  # 도식

    # 역사
    TIMELINE = "timeline"  # 연표
    TERMS = "terms"  # 용어/인물/사건


class ConceptCard(Base):
    """
    개념 카드 모델

    노트에서 추출된 핵심 개념을 구조화하여 저장
    문제 생성의 기반이 됨
    """

    __tablename__ = "concept_cards"

    id = Column(Integer, primary_key=True, index=True)

    # 노트 연결
    note_id = Column(Integer, ForeignKey("notes.id", ondelete="CASCADE"), nullable=False, index=True)

    # 사용자 연결 (빠른 조회용)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)

    # 카드 기본 정보
    card_type = Column(Enum(CardType), default=CardType.CONCEPT)
    title = Column(String(255), nullable=False)

    # 과목 (note.detected_subject와 동일하지만 빠른 필터링용)
    subject = Column(String(50), nullable=True, index=True)

    # 단원 정보
    unit_id = Column(String(100), nullable=True)
    unit_name = Column(String(255), nullable=True)

    # 핵심 내용 (JSON - 카드 타입별 다른 구조)
    # 예시:
    # concept: {"definition": "...", "key_points": [...]}
    # formula: {"formula": "...", "conditions": [...]}
    # passage: {"main_idea": "...", "structure": [...], "key_sentences": [...]}
    # experiment: {"hypothesis": "...", "variables": {...}, "procedure": [...]}
    content = Column(JSON, nullable=False)

    # 자주 틀리는 실수 (문제 생성 시 오답 선택지에 활용)
    common_mistakes = Column(JSON, nullable=True)  # ["실수1", "실수2"]

    # 근거 구간 (필기에서 어디서 추출했는지)
    evidence_spans = Column(JSON, nullable=True)  # ["필기 2번째 줄", "이미지 좌측"]

    # 메타데이터
    created_at = Column(DateTime, default=datetime.utcnow)

    # 문제 생성 횟수 (통계용)
    question_count = Column(Integer, default=0)

    def __repr__(self):
        return f"<ConceptCard(id={self.id}, title='{self.title}', type='{self.card_type}')>"

    def to_dict(self):
        """JSON 직렬화용"""
        return {
            "id": self.id,
            "note_id": self.note_id,
            "card_type": self.card_type.value if self.card_type else None,
            "title": self.title,
            "subject": self.subject,
            "unit_id": self.unit_id,
            "unit_name": self.unit_name,
            "content": self.content,
            "common_mistakes": self.common_mistakes,
            "evidence_spans": self.evidence_spans,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
