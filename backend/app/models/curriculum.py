"""
Curriculum Models
교육과정 DB 모델 (2015/2022 개정 교육과정)
"""

from sqlalchemy import Column, Integer, String, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.models.base import Base
from app.models.user import SchoolLevel
import enum


class CurriculumVersion(str, enum.Enum):
    """교육과정 버전"""
    V2015 = "2015"
    V2022 = "2022"


class Subject(Base):
    """과목 테이블"""
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(10), unique=True, nullable=False)  # math, korean, english, etc.
    name_ko = Column(String(50), nullable=False)  # 수학, 국어, 영어
    name_en = Column(String(50), nullable=False)  # Mathematics, Korean, English

    # Relations
    domains = relationship("Domain", back_populates="subject")


class Domain(Base):
    """영역 테이블 (예: 수와연산, 문자와식, 함수)"""
    __tablename__ = "domains"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    code = Column(String(10), nullable=False)  # 01, 02, 03...
    name = Column(String(100), nullable=False)  # 수와 연산, 문자와 식
    curriculum_version = Column(SQLEnum(CurriculumVersion), nullable=False)
    school_level = Column(SQLEnum(SchoolLevel), nullable=False)

    # Relations
    subject = relationship("Subject", back_populates="domains")
    standards = relationship("AchievementStandard", back_populates="domain")


class AchievementStandard(Base):
    """성취기준 테이블"""
    __tablename__ = "achievement_standards"

    id = Column(Integer, primary_key=True, index=True)
    domain_id = Column(Integer, ForeignKey("domains.id"), nullable=False)

    # 성취기준 코드: [9수01-01]
    code = Column(String(20), unique=True, nullable=False)  # 9수01-01
    full_code = Column(String(25), nullable=False)  # [9수01-01]

    # 학년 정보
    grade = Column(Integer, nullable=False)  # 1, 2, 3

    # 성취기준 내용
    content = Column(Text, nullable=False)

    # 소단원/주제 (optional)
    topic = Column(String(100), nullable=True)  # 소인수분해, 정수와 유리수 등

    # Relations
    domain = relationship("Domain", back_populates="standards")


# 초기 데이터: 과목
INITIAL_SUBJECTS = [
    {"code": "math", "name_ko": "수학", "name_en": "Mathematics"},
    {"code": "korean", "name_ko": "국어", "name_en": "Korean"},
    {"code": "english", "name_ko": "영어", "name_en": "English"},
    {"code": "social", "name_ko": "사회", "name_en": "Social Studies"},
    {"code": "science", "name_ko": "과학", "name_en": "Science"},
    {"code": "history", "name_ko": "역사", "name_en": "History"},
]


# 중학교 수학 영역 (2015 개정)
MATH_DOMAINS_2015_MIDDLE = [
    {"code": "01", "name": "수와 연산"},
    {"code": "02", "name": "문자와 식"},
    {"code": "03", "name": "함수"},
    {"code": "04", "name": "기하"},
    {"code": "05", "name": "확률과 통계"},
]


# 중학교 수학 성취기준 (2015 개정) - 학년별
MATH_STANDARDS_2015_MIDDLE = {
    # ===== 중1 =====
    1: [
        # 수와 연산
        {"code": "9수01-01", "domain": "01", "topic": "소인수분해",
         "content": "소인수분해의 뜻을 알고, 자연수를 소인수분해할 수 있다."},
        {"code": "9수01-02", "domain": "01", "topic": "소인수분해",
         "content": "최대공약수와 최소공배수의 성질을 이해하고, 이를 구할 수 있다."},
        {"code": "9수01-03", "domain": "01", "topic": "정수와 유리수",
         "content": "양수와 음수, 정수와 유리수의 개념을 이해한다."},
        {"code": "9수01-04", "domain": "01", "topic": "정수와 유리수",
         "content": "정수와 유리수의 대소 관계를 판단할 수 있다."},
        {"code": "9수01-05", "domain": "01", "topic": "정수와 유리수",
         "content": "정수와 유리수의 사칙계산의 원리를 이해하고, 그 계산을 할 수 있다."},

        # 문자와 식
        {"code": "9수02-01", "domain": "02", "topic": "문자의 사용",
         "content": "다양한 상황을 문자를 사용한 식으로 간단히 나타낼 수 있다."},
        {"code": "9수02-02", "domain": "02", "topic": "문자의 사용",
         "content": "식의 값을 구할 수 있다."},
        {"code": "9수02-03", "domain": "02", "topic": "일차식의 계산",
         "content": "일차식의 덧셈과 뺄셈의 원리를 이해하고, 그 계산을 할 수 있다."},
        {"code": "9수02-04", "domain": "02", "topic": "일차방정식",
         "content": "방정식과 그 해의 의미를 알고, 등식의 성질을 이해한다."},
        {"code": "9수02-05", "domain": "02", "topic": "일차방정식",
         "content": "일차방정식을 풀 수 있고, 이를 활용하여 문제를 해결할 수 있다."},

        # 함수
        {"code": "9수03-01", "domain": "03", "topic": "좌표와 그래프",
         "content": "순서쌍과 좌표를 이해한다."},
        {"code": "9수03-02", "domain": "03", "topic": "좌표와 그래프",
         "content": "다양한 상황을 그래프로 나타내고, 주어진 그래프를 해석할 수 있다."},
        {"code": "9수03-03", "domain": "03", "topic": "정비례와 반비례",
         "content": "정비례, 반비례 관계를 이해하고, 그 관계를 표, 식, 그래프로 나타낼 수 있다."},

        # 기하
        {"code": "9수04-01", "domain": "04", "topic": "기본 도형",
         "content": "점, 선, 면, 각을 이해하고, 점, 직선, 평면의 위치 관계를 설명할 수 있다."},
        {"code": "9수04-02", "domain": "04", "topic": "기본 도형",
         "content": "평행선에서 동위각과 엇각의 성질을 이해한다."},
        {"code": "9수04-03", "domain": "04", "topic": "작도와 합동",
         "content": "삼각형을 작도할 수 있다."},
        {"code": "9수04-04", "domain": "04", "topic": "작도와 합동",
         "content": "삼각형의 합동 조건을 이해하고, 이를 이용하여 두 삼각형이 합동인지 판별할 수 있다."},
        {"code": "9수04-05", "domain": "04", "topic": "다각형",
         "content": "다각형의 성질을 이해한다."},
        {"code": "9수04-06", "domain": "04", "topic": "원과 부채꼴",
         "content": "부채꼴의 중심각과 호의 관계를 이해한다."},
        {"code": "9수04-07", "domain": "04", "topic": "다면체와 회전체",
         "content": "다면체의 성질을 이해한다."},
        {"code": "9수04-08", "domain": "04", "topic": "다면체와 회전체",
         "content": "회전체의 성질을 이해한다."},
        {"code": "9수04-09", "domain": "04", "topic": "입체도형의 측정",
         "content": "입체도형의 겉넓이와 부피를 구할 수 있다."},

        # 확률과 통계
        {"code": "9수05-01", "domain": "05", "topic": "자료의 정리",
         "content": "자료를 줄기와 잎 그림, 도수분포표, 히스토그램, 도수분포다각형으로 나타내고 해석할 수 있다."},
        {"code": "9수05-02", "domain": "05", "topic": "자료의 정리",
         "content": "상대도수를 구하고, 이를 그래프로 나타내고, 상대도수의 분포를 이해한다."},
    ],

    # ===== 중2 =====
    2: [
        # 수와 연산
        {"code": "9수01-06", "domain": "01", "topic": "유리수와 순환소수",
         "content": "순환소수의 뜻을 알고, 유리수와 순환소수의 관계를 이해한다."},

        # 문자와 식
        {"code": "9수02-06", "domain": "02", "topic": "식의 계산",
         "content": "지수법칙을 이해한다."},
        {"code": "9수02-07", "domain": "02", "topic": "식의 계산",
         "content": "다항식의 덧셈과 뺄셈의 원리를 이해하고, 그 계산을 할 수 있다."},
        {"code": "9수02-08", "domain": "02", "topic": "식의 계산",
         "content": "다항식과 단항식의 곱셈과 나눗셈의 원리를 이해하고, 그 계산을 할 수 있다."},
        {"code": "9수02-09", "domain": "02", "topic": "부등식",
         "content": "부등식과 그 해의 의미를 알고, 부등식의 성질을 이해한다."},
        {"code": "9수02-10", "domain": "02", "topic": "부등식",
         "content": "일차부등식을 풀 수 있고, 이를 활용하여 문제를 해결할 수 있다."},
        {"code": "9수02-11", "domain": "02", "topic": "연립방정식",
         "content": "미지수가 2개인 연립일차방정식을 풀 수 있고, 이를 활용하여 문제를 해결할 수 있다."},

        # 함수
        {"code": "9수03-04", "domain": "03", "topic": "함수",
         "content": "함수의 개념을 이해한다."},
        {"code": "9수03-05", "domain": "03", "topic": "일차함수",
         "content": "일차함수의 의미를 이해하고, 그 그래프를 그릴 수 있다."},
        {"code": "9수03-06", "domain": "03", "topic": "일차함수",
         "content": "일차함수의 그래프의 성질을 이해한다."},
        {"code": "9수03-07", "domain": "03", "topic": "일차함수와 방정식",
         "content": "일차함수와 일차방정식의 관계를 이해한다."},
        {"code": "9수03-08", "domain": "03", "topic": "일차함수와 방정식",
         "content": "두 일차함수의 그래프를 통해 연립일차방정식의 해를 이해한다."},

        # 기하
        {"code": "9수04-10", "domain": "04", "topic": "삼각형의 성질",
         "content": "이등변삼각형의 성질을 이해하고, 이를 증명할 수 있다."},
        {"code": "9수04-11", "domain": "04", "topic": "삼각형의 성질",
         "content": "삼각형의 외심, 내심의 성질을 이해한다."},
        {"code": "9수04-12", "domain": "04", "topic": "사각형의 성질",
         "content": "평행사변형, 여러 가지 사각형의 성질을 이해한다."},

        # 확률과 통계
        {"code": "9수05-03", "domain": "05", "topic": "공학적 도구",
         "content": "공학적 도구를 이용하여 실생활과 관련된 자료를 수집하고 표나 그래프로 정리하고 해석할 수 있다."},
        {"code": "9수05-04", "domain": "05", "topic": "경우의 수",
         "content": "경우의 수를 구할 수 있다."},
        {"code": "9수05-05", "domain": "05", "topic": "확률",
         "content": "확률의 개념과 그 기본 성질을 이해하고, 확률을 구할 수 있다."},
    ],

    # ===== 중3 =====
    3: [
        # 수와 연산
        {"code": "9수01-07", "domain": "01", "topic": "제곱근과 실수",
         "content": "제곱근의 뜻을 알고, 그 성질을 이해한다."},
        {"code": "9수01-08", "domain": "01", "topic": "제곱근과 실수",
         "content": "무리수의 개념을 이해한다."},
        {"code": "9수01-09", "domain": "01", "topic": "제곱근과 실수",
         "content": "실수의 대소 관계를 판단할 수 있다."},
        {"code": "9수01-10", "domain": "01", "topic": "제곱근과 실수",
         "content": "근호를 포함한 식의 사칙계산을 할 수 있다."},

        # 문자와 식
        {"code": "9수02-12", "domain": "02", "topic": "다항식의 곱셈과 인수분해",
         "content": "다항식의 곱셈과 인수분해를 할 수 있다."},
        {"code": "9수02-13", "domain": "02", "topic": "이차방정식",
         "content": "이차방정식을 풀 수 있고, 이를 활용하여 문제를 해결할 수 있다."},

        # 함수
        {"code": "9수03-09", "domain": "03", "topic": "이차함수",
         "content": "이차함수의 의미를 이해하고, 그 그래프를 그릴 수 있다."},
        {"code": "9수03-10", "domain": "03", "topic": "이차함수",
         "content": "이차함수의 그래프의 성질을 이해한다."},

        # 기하
        {"code": "9수04-13", "domain": "04", "topic": "도형의 닮음",
         "content": "도형의 닮음의 의미와 성질을 이해한다."},
        {"code": "9수04-14", "domain": "04", "topic": "도형의 닮음",
         "content": "삼각형의 닮음 조건을 이해하고, 이를 이용하여 두 삼각형이 닮음인지 판별할 수 있다."},
        {"code": "9수04-15", "domain": "04", "topic": "도형의 닮음",
         "content": "평행선 사이의 선분의 길이의 비에 대한 성질을 이해하고, 이를 활용할 수 있다."},
        {"code": "9수04-16", "domain": "04", "topic": "피타고라스 정리",
         "content": "피타고라스 정리를 이해하고, 이를 활용할 수 있다."},
        {"code": "9수04-17", "domain": "04", "topic": "삼각비",
         "content": "삼각비의 뜻을 알고, 간단한 삼각비의 값을 구할 수 있다."},
        {"code": "9수04-18", "domain": "04", "topic": "삼각비",
         "content": "삼각비를 활용하여 문제를 해결할 수 있다."},
        {"code": "9수04-19", "domain": "04", "topic": "원의 성질",
         "content": "원에서 현과 접선의 성질을 이해한다."},
        {"code": "9수04-20", "domain": "04", "topic": "원의 성질",
         "content": "원주각의 성질을 이해한다."},

        # 확률과 통계
        {"code": "9수05-06", "domain": "05", "topic": "대푯값과 산포도",
         "content": "중앙값, 최빈값, 평균의 의미를 이해하고, 이를 구할 수 있다."},
        {"code": "9수05-07", "domain": "05", "topic": "대푯값과 산포도",
         "content": "분산과 표준편차의 의미를 이해하고, 이를 구할 수 있다."},
        {"code": "9수05-08", "domain": "05", "topic": "상관관계",
         "content": "자료를 산점도로 나타내고, 이를 이용하여 상관관계를 말할 수 있다."},
    ],
}
