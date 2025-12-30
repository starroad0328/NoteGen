"""
UserWeakConcept Database Model
사용자 취약 개념 데이터베이스 모델
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from datetime import datetime

from app.models.base import Base


class UserWeakConcept(Base):
    """사용자 취약 개념 모델"""

    __tablename__ = "user_weak_concepts"

    id = Column(Integer, primary_key=True, index=True)

    # 사용자 연결
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # 취약 개념 정보
    subject = Column(String(50), nullable=False, index=True)  # math, korean, english 등
    unit = Column(String(100), nullable=True)  # 이차방정식, 일차함수 등
    concept = Column(String(200), nullable=False)  # 판별식, 기울기 계산 등

    # 오답 상세 정보
    error_reason = Column(Text, nullable=True)  # 틀린 이유 (AI 분석)

    # 통계
    error_count = Column(Integer, default=1)  # 오답 횟수

    # 날짜
    first_error_at = Column(DateTime, default=datetime.utcnow)  # 첫 오답 날짜
    last_error_at = Column(DateTime, default=datetime.utcnow)  # 마지막 오답 날짜

    # 관련 노트 ID (마지막 오답 노트)
    last_note_id = Column(Integer, ForeignKey("notes.id"), nullable=True)

    def __repr__(self):
        return f"<UserWeakConcept(user_id={self.user_id}, subject='{self.subject}', concept='{self.concept}', count={self.error_count})>"

    def increment_error(self, note_id: int = None, error_reason: str = None):
        """오답 횟수 증가"""
        self.error_count += 1
        self.last_error_at = datetime.utcnow()
        if note_id:
            self.last_note_id = note_id
        if error_reason:
            self.error_reason = error_reason
