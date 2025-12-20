"""
Curriculum API
교육과정 조회 API
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.models.curriculum import Subject, Domain, AchievementStandard, CurriculumVersion
from app.models.user import SchoolLevel
from pydantic import BaseModel


router = APIRouter(prefix="/api/curriculum")


# Response Models
class SubjectResponse(BaseModel):
    id: int
    code: str
    name_ko: str
    name_en: str

    class Config:
        from_attributes = True


class DomainResponse(BaseModel):
    id: int
    code: str
    name: str
    curriculum_version: str
    school_level: str

    class Config:
        from_attributes = True


class StandardResponse(BaseModel):
    id: int
    code: str
    full_code: str
    grade: int
    content: str
    topic: Optional[str]
    domain_name: str

    class Config:
        from_attributes = True


class StandardListResponse(BaseModel):
    subject: str
    grade: int
    school_level: str
    total: int
    standards: List[StandardResponse]


# API Endpoints
@router.get("/subjects", response_model=List[SubjectResponse])
def get_subjects(db: Session = Depends(get_db)):
    """전체 과목 목록 조회"""
    return db.query(Subject).all()


@router.get("/domains/{subject_code}", response_model=List[DomainResponse])
def get_domains(
    subject_code: str,
    school_level: SchoolLevel = Query(SchoolLevel.MIDDLE),
    version: CurriculumVersion = Query(CurriculumVersion.V2015),
    db: Session = Depends(get_db)
):
    """과목별 영역 목록 조회"""
    return db.query(Domain).join(Subject).filter(
        Subject.code == subject_code,
        Domain.school_level == school_level,
        Domain.curriculum_version == version
    ).all()


@router.get("/standards/{subject_code}/{grade}", response_model=StandardListResponse)
def get_standards_by_grade(
    subject_code: str,
    grade: int,
    school_level: SchoolLevel = Query(SchoolLevel.MIDDLE),
    version: CurriculumVersion = Query(CurriculumVersion.V2015),
    db: Session = Depends(get_db)
):
    """학년별 성취기준 조회"""
    subject = db.query(Subject).filter(Subject.code == subject_code).first()
    if not subject:
        return StandardListResponse(
            subject=subject_code,
            grade=grade,
            school_level=school_level.value,
            total=0,
            standards=[]
        )

    standards = db.query(AchievementStandard).join(Domain).join(Subject).filter(
        Subject.code == subject_code,
        Domain.school_level == school_level,
        Domain.curriculum_version == version,
        AchievementStandard.grade == grade
    ).all()

    return StandardListResponse(
        subject=subject.name_ko,
        grade=grade,
        school_level=school_level.value,
        total=len(standards),
        standards=[
            StandardResponse(
                id=s.id,
                code=s.code,
                full_code=s.full_code,
                grade=s.grade,
                content=s.content,
                topic=s.topic,
                domain_name=s.domain.name
            )
            for s in standards
        ]
    )


@router.get("/standards/{subject_code}", response_model=StandardListResponse)
def get_all_standards(
    subject_code: str,
    school_level: SchoolLevel = Query(SchoolLevel.MIDDLE),
    version: CurriculumVersion = Query(CurriculumVersion.V2015),
    domain_code: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """과목 전체 또는 영역별 성취기준 조회"""
    subject = db.query(Subject).filter(Subject.code == subject_code).first()
    if not subject:
        return StandardListResponse(
            subject=subject_code,
            grade=0,
            school_level=school_level.value,
            total=0,
            standards=[]
        )

    query = db.query(AchievementStandard).join(Domain).join(Subject).filter(
        Subject.code == subject_code,
        Domain.school_level == school_level,
        Domain.curriculum_version == version
    )

    if domain_code:
        query = query.filter(Domain.code == domain_code)

    standards = query.order_by(AchievementStandard.grade, AchievementStandard.code).all()

    return StandardListResponse(
        subject=subject.name_ko,
        grade=0,  # All grades
        school_level=school_level.value,
        total=len(standards),
        standards=[
            StandardResponse(
                id=s.id,
                code=s.code,
                full_code=s.full_code,
                grade=s.grade,
                content=s.content,
                topic=s.topic,
                domain_name=s.domain.name
            )
            for s in standards
        ]
    )


@router.get("/stats")
def get_curriculum_stats(db: Session = Depends(get_db)):
    """교육과정 데이터 통계"""
    subjects_count = db.query(Subject).count()
    domains_count = db.query(Domain).count()
    standards_count = db.query(AchievementStandard).count()

    # 학년별 성취기준 수
    grade_stats = {}
    for grade in [1, 2, 3]:
        count = db.query(AchievementStandard).filter(
            AchievementStandard.grade == grade
        ).count()
        grade_stats[f"grade_{grade}"] = count

    return {
        "subjects": subjects_count,
        "domains": domains_count,
        "achievement_standards": standards_count,
        "by_grade": grade_stats
    }
