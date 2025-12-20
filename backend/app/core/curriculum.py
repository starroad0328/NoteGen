"""
Korean Curriculum Data
한국 교육과정 데이터 (2022 개정 교육과정 기준)
"""

from typing import Dict, List, Optional
from app.models.user import SchoolLevel

# 중학교 교육과정
MIDDLE_SCHOOL_CURRICULUM: Dict[int, Dict[str, List[str]]] = {
    1: {
        "국어": ["문학의 이해", "읽기와 쓰기", "문법의 기초"],
        "수학": ["정수와 유리수", "문자와 식", "일차방정식", "함수", "기본 도형"],
        "영어": ["기초 문법", "일상 회화", "간단한 읽기"],
        "사회": ["지리 기초", "역사 입문", "일반사회 기초"],
        "과학": ["지구과학 기초", "생명과학 기초", "물리 기초", "화학 기초"],
        "역사": ["선사시대", "고조선", "삼국시대", "통일신라와 발해"],
    },
    2: {
        "국어": ["문학 감상", "설명문과 논설문", "어휘와 문법"],
        "수학": ["유리수와 순환소수", "식의 계산", "일차함수", "확률"],
        "영어": ["시제", "조동사", "비교급/최상급", "독해"],
        "사회": ["기후와 생활", "인구와 도시", "정치와 경제"],
        "과학": ["물질의 구성", "빛과 파동", "식물과 에너지"],
        "역사": ["고려시대", "조선 전기", "조선 후기", "개항기"],
    },
    3: {
        "국어": ["비평문 쓰기", "토론과 토의", "고전문학"],
        "수학": ["제곱근과 실수", "인수분해", "이차방정식", "이차함수", "삼각비"],
        "영어": ["현재완료", "관계대명사", "가정법", "고급 독해"],
        "사회": ["헌법과 인권", "경제생활", "국제관계"],
        "과학": ["운동과 에너지", "화학반응", "생식과 유전", "별과 우주"],
        "역사": ["일제강점기", "대한민국 수립", "민주화 운동", "현대사"],
    },
}

# 고등학교 교육과정
HIGH_SCHOOL_CURRICULUM: Dict[int, Dict[str, List[str]]] = {
    1: {
        "국어": ["문학", "독서", "언어와 매체", "화법과 작문"],
        "수학": ["다항식", "방정식과 부등식", "도형의 방정식", "집합과 명제", "함수"],
        "영어": ["고급 문법", "독해 전략", "작문"],
        "한국사": ["전근대 한국사", "근현대 한국사"],
        "통합사회": ["인간과 공동체", "시장과 경제", "정의와 사회"],
        "통합과학": ["물질과 규칙성", "시스템과 상호작용", "변화와 다양성", "환경과 에너지"],
    },
    2: {
        "국어": ["심화 문학", "고전 읽기", "매체 언어"],
        "수학I": ["지수함수와 로그함수", "삼각함수", "수열"],
        "수학II": ["함수의 극한", "미분법", "적분법"],
        "영어I": ["심화 독해", "에세이 작성", "토론"],
        "한국사": ["근현대사 심화"],
        "세계사": ["문명의 발생", "제국주의와 세계대전", "현대세계"],
        "물리학I": ["역학", "열역학", "파동"],
        "화학I": ["화학결합", "화학반응", "산화환원"],
        "생명과학I": ["세포", "유전", "진화"],
        "지구과학I": ["지권", "대기권", "천체"],
    },
    3: {
        "국어": ["수능 대비 문학/비문학"],
        "수학": ["확률과 통계", "미적분II", "기하"],
        "영어": ["수능 대비 독해", "듣기"],
        "사회탐구": ["한국지리", "세계지리", "동아시아사", "윤리와 사상"],
        "과학탐구": ["물리학II", "화학II", "생명과학II", "지구과학II"],
    },
}


def get_curriculum(school_level: SchoolLevel, grade: int) -> Dict[str, List[str]]:
    """
    학교급과 학년에 맞는 교육과정 반환
    """
    if school_level == SchoolLevel.MIDDLE:
        return MIDDLE_SCHOOL_CURRICULUM.get(grade, {})
    elif school_level == SchoolLevel.HIGH:
        return HIGH_SCHOOL_CURRICULUM.get(grade, {})
    return {}


def get_curriculum_context(school_level: Optional[SchoolLevel], grade: Optional[int]) -> str:
    """
    AI 프롬프트에 삽입할 교육과정 컨텍스트 생성
    """
    if not school_level or not grade:
        return ""

    curriculum = get_curriculum(school_level, grade)
    if not curriculum:
        return ""

    level_name = "중학교" if school_level == SchoolLevel.MIDDLE else "고등학교"

    lines = [f"[학습자 정보: {level_name} {grade}학년]"]
    lines.append("이 학생이 배우는 교과과정:")

    for subject, topics in curriculum.items():
        lines.append(f"  - {subject}: {', '.join(topics[:3])}{'...' if len(topics) > 3 else ''}")

    lines.append("")
    lines.append("위 교육과정 수준에 맞게 설명을 보충해주세요.")
    lines.append("- 해당 학년에서 배우는 개념과 연결지어 설명")
    lines.append("- 어려운 용어는 학년 수준에 맞게 풀어서 설명")
    lines.append("- 관련 교과 내용 언급 시 학생이 아는 개념 활용")

    return "\n".join(lines)


def detect_subject(text: str) -> Optional[str]:
    """
    텍스트에서 과목 추정
    """
    keywords = {
        "역사": ["조선", "고려", "삼국", "신라", "백제", "고구려", "일제", "독립", "왕", "시대", "전쟁", "조약"],
        "수학": ["방정식", "함수", "미분", "적분", "확률", "도형", "그래프", "공식", "계산"],
        "과학": ["원자", "분자", "세포", "에너지", "힘", "운동", "실험", "반응"],
        "국어": ["문학", "시", "소설", "문법", "비유", "주제", "작가"],
        "영어": ["grammar", "verb", "noun", "sentence", "tense"],
        "사회": ["경제", "정치", "헌법", "인권", "민주주의", "시장", "정부"],
    }

    text_lower = text.lower()
    scores = {}

    for subject, words in keywords.items():
        score = sum(1 for word in words if word in text_lower or word.lower() in text_lower)
        if score > 0:
            scores[subject] = score

    if scores:
        return max(scores, key=scores.get)
    return None
