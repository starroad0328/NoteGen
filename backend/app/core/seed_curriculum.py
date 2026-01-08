"""
Curriculum Seeder
교육과정 데이터 초기화 스크립트
"""

from sqlalchemy.orm import Session
from app.models.curriculum import (
    Subject, Domain, AchievementStandard,
    CurriculumVersion,
    INITIAL_SUBJECTS,
    # 2015 개정 - 중학교
    MATH_DOMAINS_2015_MIDDLE, MATH_STANDARDS_2015_MIDDLE,
    KOREAN_DOMAINS_2015_MIDDLE, KOREAN_STANDARDS_2015_MIDDLE,
    ENGLISH_DOMAINS_2015_MIDDLE, ENGLISH_STANDARDS_2015_MIDDLE,
    SOCIAL_DOMAINS_2015_MIDDLE, SOCIAL_STANDARDS_2015_MIDDLE,
    SCIENCE_DOMAINS_2015_MIDDLE, SCIENCE_STANDARDS_2015_MIDDLE,
    # 2015 개정 - 고등학교
    MATH_DOMAINS_2015_HIGH, MATH_STANDARDS_2015_HIGH,
    KOREAN_DOMAINS_2015_HIGH, KOREAN_STANDARDS_2015_HIGH,
    ENGLISH_DOMAINS_2015_HIGH, ENGLISH_STANDARDS_2015_HIGH,
    SOCIAL_DOMAINS_2015_HIGH, SOCIAL_STANDARDS_2015_HIGH,
    SCIENCE_DOMAINS_2015_HIGH, SCIENCE_STANDARDS_2015_HIGH,
    HISTORY_DOMAINS_2015_HIGH, HISTORY_STANDARDS_2015_HIGH,
    # 2022 개정 - 중학교
    MATH_DOMAINS_2022_MIDDLE, MATH_STANDARDS_2022_MIDDLE,
    KOREAN_DOMAINS_2022_MIDDLE, KOREAN_STANDARDS_2022_MIDDLE,
    ENGLISH_DOMAINS_2022_MIDDLE, ENGLISH_STANDARDS_2022_MIDDLE,
    # 2022 개정 - 고등학교
    MATH_DOMAINS_2022_HIGH, MATH_STANDARDS_2022_HIGH,
    SOCIAL_DOMAINS_2022_HIGH, SOCIAL_STANDARDS_2022_HIGH,
    SCIENCE_DOMAINS_2022_HIGH, SCIENCE_STANDARDS_2022_HIGH,
    HISTORY_DOMAINS_2022_HIGH, HISTORY_STANDARDS_2022_HIGH,
)
from app.models.user import SchoolLevel


def seed_subjects(db: Session) -> dict:
    """과목 초기 데이터 삽입"""
    subjects = {}
    for subject_data in INITIAL_SUBJECTS:
        existing = db.query(Subject).filter(Subject.code == subject_data["code"]).first()
        if existing:
            subjects[subject_data["code"]] = existing
        else:
            subject = Subject(**subject_data)
            db.add(subject)
            db.flush()
            subjects[subject_data["code"]] = subject
    return subjects


def seed_math_domains(db: Session, math_subject: Subject) -> dict:
    """수학 영역 데이터 삽입 (2015 중학교)"""
    domains = {}
    for domain_data in MATH_DOMAINS_2015_MIDDLE:
        existing = db.query(Domain).filter(
            Domain.subject_id == math_subject.id,
            Domain.code == domain_data["code"],
            Domain.curriculum_version == CurriculumVersion.V2015,
            Domain.school_level == SchoolLevel.MIDDLE
        ).first()

        if existing:
            domains[domain_data["code"]] = existing
        else:
            domain = Domain(
                subject_id=math_subject.id,
                code=domain_data["code"],
                name=domain_data["name"],
                curriculum_version=CurriculumVersion.V2015,
                school_level=SchoolLevel.MIDDLE
            )
            db.add(domain)
            db.flush()
            domains[domain_data["code"]] = domain
    return domains


def seed_math_standards(db: Session, domains: dict):
    """수학 성취기준 데이터 삽입 (2015 중학교)"""
    count = 0
    for grade, standards in MATH_STANDARDS_2015_MIDDLE.items():
        for std_data in standards:
            full_code = f"[{std_data['code']}]"

            existing = db.query(AchievementStandard).filter(
                AchievementStandard.code == std_data["code"]
            ).first()

            if existing:
                continue

            domain = domains.get(std_data["domain"])
            if not domain:
                print(f"[WARN] Domain not found for {std_data['code']}")
                continue

            standard = AchievementStandard(
                domain_id=domain.id,
                code=std_data["code"],
                full_code=full_code,
                grade=grade,
                content=std_data["content"],
                topic=std_data.get("topic")
            )
            db.add(standard)
            count += 1

    return count


def seed_domains(db: Session, subject: Subject, domains_data: list, school_level: SchoolLevel = SchoolLevel.MIDDLE, curriculum_version: CurriculumVersion = CurriculumVersion.V2015) -> dict:
    """범용 영역 데이터 삽입"""
    domains = {}
    for domain_data in domains_data:
        existing = db.query(Domain).filter(
            Domain.subject_id == subject.id,
            Domain.code == domain_data["code"],
            Domain.curriculum_version == curriculum_version,
            Domain.school_level == school_level
        ).first()

        if existing:
            domains[domain_data["code"]] = existing
        else:
            domain = Domain(
                subject_id=subject.id,
                code=domain_data["code"],
                name=domain_data["name"],
                curriculum_version=curriculum_version,
                school_level=school_level
            )
            db.add(domain)
            db.flush()
            domains[domain_data["code"]] = domain
    return domains


def seed_standards(db: Session, domains: dict, standards_data: dict):
    """범용 성취기준 데이터 삽입"""
    count = 0
    for grade, standards in standards_data.items():
        for std_data in standards:
            full_code = f"[{std_data['code']}]"

            existing = db.query(AchievementStandard).filter(
                AchievementStandard.code == std_data["code"]
            ).first()

            if existing:
                continue

            domain = domains.get(std_data["domain"])
            if not domain:
                print(f"[WARN] Domain not found for {std_data['code']}")
                continue

            standard = AchievementStandard(
                domain_id=domain.id,
                code=std_data["code"],
                full_code=full_code,
                grade=grade,
                content=std_data["content"],
                topic=std_data.get("topic")
            )
            db.add(standard)
            count += 1

    return count


def seed_curriculum(db: Session):
    """전체 교육과정 데이터 초기화"""
    print("[SEED] Starting curriculum seed...")

    # 1. 과목 삽입
    subjects = seed_subjects(db)
    print(f"[SEED] Subjects: {len(subjects)} loaded")

    # 2. 수학 영역 및 성취기준 삽입
    math_subject = subjects.get("math")
    if math_subject:
        math_domains = seed_math_domains(db, math_subject)
        print(f"[SEED] Math domains: {len(math_domains)} loaded")
        math_std_count = seed_math_standards(db, math_domains)
        print(f"[SEED] Math standards: {math_std_count} added")

    # 3. 국어 영역 및 성취기준 삽입
    korean_subject = subjects.get("korean")
    if korean_subject:
        korean_domains = seed_domains(db, korean_subject, KOREAN_DOMAINS_2015_MIDDLE)
        print(f"[SEED] Korean domains: {len(korean_domains)} loaded")
        korean_std_count = seed_standards(db, korean_domains, KOREAN_STANDARDS_2015_MIDDLE)
        print(f"[SEED] Korean standards: {korean_std_count} added")

    # 4. 영어 영역 및 성취기준 삽입
    english_subject = subjects.get("english")
    if english_subject:
        english_domains = seed_domains(db, english_subject, ENGLISH_DOMAINS_2015_MIDDLE)
        print(f"[SEED] English domains: {len(english_domains)} loaded")
        english_std_count = seed_standards(db, english_domains, ENGLISH_STANDARDS_2015_MIDDLE)
        print(f"[SEED] English standards: {english_std_count} added")

    # 5. 사회 영역 및 성취기준 삽입
    social_subject = subjects.get("social")
    if social_subject:
        social_domains = seed_domains(db, social_subject, SOCIAL_DOMAINS_2015_MIDDLE)
        print(f"[SEED] Social domains: {len(social_domains)} loaded")
        social_std_count = seed_standards(db, social_domains, SOCIAL_STANDARDS_2015_MIDDLE)
        print(f"[SEED] Social standards: {social_std_count} added")

    # 6. 과학 영역 및 성취기준 삽입
    science_subject = subjects.get("science")
    if science_subject:
        science_domains = seed_domains(db, science_subject, SCIENCE_DOMAINS_2015_MIDDLE)
        print(f"[SEED] Science domains: {len(science_domains)} loaded")
        science_std_count = seed_standards(db, science_domains, SCIENCE_STANDARDS_2015_MIDDLE)
        print(f"[SEED] Science standards: {science_std_count} added")

    # ========== 고등학교 교육과정 (2015 개정) ==========
    print("[SEED] Starting high school curriculum seed...")

    # 7. 고등학교 수학 영역 및 성취기준 삽입
    if math_subject:
        math_domains_high = seed_domains(db, math_subject, MATH_DOMAINS_2015_HIGH, SchoolLevel.HIGH)
        print(f"[SEED] Math (HIGH) domains: {len(math_domains_high)} loaded")
        math_std_high_count = seed_standards(db, math_domains_high, MATH_STANDARDS_2015_HIGH)
        print(f"[SEED] Math (HIGH) standards: {math_std_high_count} added")

    # 8. 고등학교 국어 영역 및 성취기준 삽입
    if korean_subject:
        korean_domains_high = seed_domains(db, korean_subject, KOREAN_DOMAINS_2015_HIGH, SchoolLevel.HIGH)
        print(f"[SEED] Korean (HIGH) domains: {len(korean_domains_high)} loaded")
        korean_std_high_count = seed_standards(db, korean_domains_high, KOREAN_STANDARDS_2015_HIGH)
        print(f"[SEED] Korean (HIGH) standards: {korean_std_high_count} added")

    # 9. 고등학교 영어 영역 및 성취기준 삽입
    if english_subject:
        english_domains_high = seed_domains(db, english_subject, ENGLISH_DOMAINS_2015_HIGH, SchoolLevel.HIGH)
        print(f"[SEED] English (HIGH) domains: {len(english_domains_high)} loaded")
        english_std_high_count = seed_standards(db, english_domains_high, ENGLISH_STANDARDS_2015_HIGH)
        print(f"[SEED] English (HIGH) standards: {english_std_high_count} added")

    # 10. 고등학교 사회(통합사회) 영역 및 성취기준 삽입
    if social_subject:
        social_domains_high = seed_domains(db, social_subject, SOCIAL_DOMAINS_2015_HIGH, SchoolLevel.HIGH)
        print(f"[SEED] Social (HIGH) domains: {len(social_domains_high)} loaded")
        social_std_high_count = seed_standards(db, social_domains_high, SOCIAL_STANDARDS_2015_HIGH)
        print(f"[SEED] Social (HIGH) standards: {social_std_high_count} added")

    # 11. 고등학교 과학(통합과학) 영역 및 성취기준 삽입
    if science_subject:
        science_domains_high = seed_domains(db, science_subject, SCIENCE_DOMAINS_2015_HIGH, SchoolLevel.HIGH)
        print(f"[SEED] Science (HIGH) domains: {len(science_domains_high)} loaded")
        science_std_high_count = seed_standards(db, science_domains_high, SCIENCE_STANDARDS_2015_HIGH)
        print(f"[SEED] Science (HIGH) standards: {science_std_high_count} added")

    # 12. 고등학교 역사(한국사) 영역 및 성취기준 삽입
    history_subject = subjects.get("history")
    if history_subject:
        history_domains_high = seed_domains(db, history_subject, HISTORY_DOMAINS_2015_HIGH, SchoolLevel.HIGH)
        print(f"[SEED] History (HIGH) domains: {len(history_domains_high)} loaded")
        history_std_high_count = seed_standards(db, history_domains_high, HISTORY_STANDARDS_2015_HIGH)
        print(f"[SEED] History (HIGH) standards: {history_std_high_count} added")

    # ========== 2022 개정 교육과정 ==========
    print("[SEED] Starting 2022 revised curriculum seed...")

    # 13. 중학교 수학 (2022 개정) - 중3
    if math_subject:
        math_domains_2022 = seed_domains(db, math_subject, MATH_DOMAINS_2022_MIDDLE, SchoolLevel.MIDDLE, CurriculumVersion.V2022)
        print(f"[SEED] Math (2022 MIDDLE) domains: {len(math_domains_2022)} loaded")
        math_std_2022_count = seed_standards(db, math_domains_2022, MATH_STANDARDS_2022_MIDDLE)
        print(f"[SEED] Math (2022 MIDDLE) standards: {math_std_2022_count} added")

    # 14. 중학교 국어 (2022 개정)
    if korean_subject:
        korean_domains_2022 = seed_domains(db, korean_subject, KOREAN_DOMAINS_2022_MIDDLE, SchoolLevel.MIDDLE, CurriculumVersion.V2022)
        print(f"[SEED] Korean (2022 MIDDLE) domains: {len(korean_domains_2022)} loaded")
        korean_std_2022_count = seed_standards(db, korean_domains_2022, KOREAN_STANDARDS_2022_MIDDLE)
        print(f"[SEED] Korean (2022 MIDDLE) standards: {korean_std_2022_count} added")

    # 15. 중학교 영어 (2022 개정)
    if english_subject:
        english_domains_2022 = seed_domains(db, english_subject, ENGLISH_DOMAINS_2022_MIDDLE, SchoolLevel.MIDDLE, CurriculumVersion.V2022)
        print(f"[SEED] English (2022 MIDDLE) domains: {len(english_domains_2022)} loaded")
        english_std_2022_count = seed_standards(db, english_domains_2022, ENGLISH_STANDARDS_2022_MIDDLE)
        print(f"[SEED] English (2022 MIDDLE) standards: {english_std_2022_count} added")

    # 16. 고등학교 공통수학 (2022 개정)
    if math_subject:
        math_domains_2022_high = seed_domains(db, math_subject, MATH_DOMAINS_2022_HIGH, SchoolLevel.HIGH, CurriculumVersion.V2022)
        print(f"[SEED] Math (2022 HIGH) domains: {len(math_domains_2022_high)} loaded")
        math_std_2022_high_count = seed_standards(db, math_domains_2022_high, MATH_STANDARDS_2022_HIGH)
        print(f"[SEED] Math (2022 HIGH) standards: {math_std_2022_high_count} added")

    # 17. 고등학교 통합사회 (2022 개정)
    if social_subject:
        social_domains_2022_high = seed_domains(db, social_subject, SOCIAL_DOMAINS_2022_HIGH, SchoolLevel.HIGH, CurriculumVersion.V2022)
        print(f"[SEED] Social (2022 HIGH) domains: {len(social_domains_2022_high)} loaded")
        social_std_2022_high_count = seed_standards(db, social_domains_2022_high, SOCIAL_STANDARDS_2022_HIGH)
        print(f"[SEED] Social (2022 HIGH) standards: {social_std_2022_high_count} added")

    # 18. 고등학교 통합과학 (2022 개정)
    if science_subject:
        science_domains_2022_high = seed_domains(db, science_subject, SCIENCE_DOMAINS_2022_HIGH, SchoolLevel.HIGH, CurriculumVersion.V2022)
        print(f"[SEED] Science (2022 HIGH) domains: {len(science_domains_2022_high)} loaded")
        science_std_2022_high_count = seed_standards(db, science_domains_2022_high, SCIENCE_STANDARDS_2022_HIGH)
        print(f"[SEED] Science (2022 HIGH) standards: {science_std_2022_high_count} added")

    # 19. 고등학교 한국사 (2022 개정)
    if history_subject:
        history_domains_2022_high = seed_domains(db, history_subject, HISTORY_DOMAINS_2022_HIGH, SchoolLevel.HIGH, CurriculumVersion.V2022)
        print(f"[SEED] History (2022 HIGH) domains: {len(history_domains_2022_high)} loaded")
        history_std_2022_high_count = seed_standards(db, history_domains_2022_high, HISTORY_STANDARDS_2022_HIGH)
        print(f"[SEED] History (2022 HIGH) standards: {history_std_2022_high_count} added")

    db.commit()
    print("[SEED] Curriculum seed complete!")


def get_standards_by_grade(db: Session, subject_code: str, grade: int, school_level: SchoolLevel = SchoolLevel.MIDDLE):
    """학년별 성취기준 조회"""
    return db.query(AchievementStandard).join(Domain).join(Subject).filter(
        Subject.code == subject_code,
        Domain.school_level == school_level,
        AchievementStandard.grade == grade
    ).all()


def get_standards_by_domain(db: Session, subject_code: str, domain_code: str):
    """영역별 성취기준 조회"""
    return db.query(AchievementStandard).join(Domain).join(Subject).filter(
        Subject.code == subject_code,
        Domain.code == domain_code
    ).all()
