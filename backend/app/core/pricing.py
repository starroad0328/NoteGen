"""
Pricing Configuration
가격 정책 설정
"""

from app.models.user import UserPlan, AIModel


# 플랜별 가격 (KRW)
PLAN_PRICES = {
    UserPlan.FREE: 0,
    UserPlan.BASIC: 6990,  # 월 6,990원
    UserPlan.PRO: 14900,  # 월 14,900원
}

# 플랜별 연간 가격 (할인 적용)
PLAN_PRICES_YEARLY = {
    UserPlan.FREE: 0,
    UserPlan.BASIC: 69900,  # 연 69,900원 (월 5,825원, 17% 할인)
    UserPlan.PRO: 149000,  # 연 149,000원 (월 12,417원, 17% 할인)
}

# 플랜별 AI 모델
PLAN_AI_MODELS = {
    UserPlan.FREE: AIModel.GPT_5_NANO,
    UserPlan.BASIC: AIModel.GPT_5_MINI,
    UserPlan.PRO: AIModel.GPT_5_2,
}

# 플랜별 월 사용 제한
PLAN_MONTHLY_LIMITS = {
    UserPlan.FREE: 10,  # 월 10회
    UserPlan.BASIC: -1,  # 무제한
    UserPlan.PRO: -1,  # 무제한
}

# 플랜별 제공 기능
PLAN_FEATURES = {
    UserPlan.FREE: {
        "basic_organize": True,
        "cornell_organize": True,
        "importance_marking": True,
        "note_save": True,
        "monthly_limit": 10,
        # Pro 기능
        "exam_prep": False,
        "question_generation": 0,  # 0개
        "comparison_table": False,
        "test_maker_view": False,
    },
    UserPlan.BASIC: {
        "basic_organize": True,
        "cornell_organize": True,
        "importance_marking": True,
        "note_save": True,
        "monthly_limit": -1,  # 무제한
        # Pro 기능
        "exam_prep": False,
        "question_generation": 5,  # 5개까지
        "comparison_table": False,
        "test_maker_view": False,
    },
    UserPlan.PRO: {
        "basic_organize": True,
        "cornell_organize": True,
        "importance_marking": True,
        "note_save": True,
        "monthly_limit": -1,  # 무제한
        # Pro 기능
        "exam_prep": True,
        "question_generation": 20,  # 20개까지
        "comparison_table": True,
        "test_maker_view": True,
        "concept_highlighting": True,
        "mistake_analysis": True,
        "compressed_summary": True,
    },
}


def get_plan_price(plan: UserPlan, yearly: bool = False) -> int:
    """플랜 가격 조회"""
    if yearly:
        return PLAN_PRICES_YEARLY.get(plan, 0)
    return PLAN_PRICES.get(plan, 0)


def get_plan_ai_model(plan: UserPlan) -> AIModel:
    """플랜에 해당하는 AI 모델 반환"""
    return PLAN_AI_MODELS.get(plan, AIModel.GPT_5_NANO)


def get_plan_monthly_limit(plan: UserPlan) -> int:
    """플랜별 월 사용 제한 (-1은 무제한)"""
    return PLAN_MONTHLY_LIMITS.get(plan, 10)


def get_plan_features(plan: UserPlan) -> dict:
    """플랜별 제공 기능"""
    return PLAN_FEATURES.get(plan, PLAN_FEATURES[UserPlan.FREE])
