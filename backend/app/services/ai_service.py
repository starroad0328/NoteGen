"""
AI Organization Service
AI 기반 노트 정리 서비스
"""

from typing import Optional
from openai import OpenAI
from app.core.config import settings
from app.models.note import OrganizeMethod
from app.models.user import AIModel, UserPlan


class AIService:
    """AI 정리 서비스"""

    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)

    async def organize_note(
        self,
        ocr_text: str,
        method: OrganizeMethod,
        ai_model: AIModel = AIModel.GPT_5_NANO
    ) -> str:
        """
        필기 텍스트를 선택한 방식으로 정리

        Args:
            ocr_text: OCR로 추출한 텍스트
            method: 정리 방식
            ai_model: 사용할 AI 모델 (기본: GPT-5 nano)

        Returns:
            정리된 노트 (마크다운 형식)
        """
        if not ocr_text or not ocr_text.strip():
            raise ValueError("정리할 텍스트가 비어있습니다.")

        # 정리 방식에 따른 프롬프트 선택
        if method == OrganizeMethod.BASIC_SUMMARY:
            prompt = self._get_basic_summary_prompt(ocr_text)
        elif method == OrganizeMethod.CORNELL:
            prompt = self._get_cornell_prompt(ocr_text)
        else:
            raise ValueError(f"지원하지 않는 정리 방식입니다: {method}")

        # 모델에 따른 max_tokens 설정
        max_tokens_config = {
            AIModel.GPT_5_NANO: 2000,  # 무료: nano는 생각 토큰 많이 씀 (최소 2000)
            AIModel.GPT_5_MINI: 1500,  # Basic: 중간
            AIModel.GPT_5: 2000,       # Pro: 충분
            AIModel.GPT_5_2: 2500,     # Pro 최고급: 풍부
        }
        max_tokens = max_tokens_config.get(ai_model, 2000)  # 기본값 2000

        # OpenAI API 호출
        try:
            # nano용 간소화된 시스템 프롬프트
            system_prompt = "필기를 정리해주세요." if ai_model == AIModel.GPT_5_NANO else \
                           "당신은 학생들의 필기를 깔끔하게 정리해주는 AI 어시스턴트입니다. " \
                           "주어진 텍스트를 읽기 쉽고 이해하기 쉽게 구조화하세요."

            response = self.client.chat.completions.create(
                model=ai_model.value,
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_completion_tokens=max_tokens
            )

            organized_text = response.choices[0].message.content

            # 빈 응답 처리
            if not organized_text or not organized_text.strip():
                if response.choices[0].finish_reason == "length":
                    raise Exception("토큰 한도 초과: max_completion_tokens를 늘려야 합니다.")
                else:
                    raise Exception(f"AI가 빈 응답을 반환했습니다. (finish_reason: {response.choices[0].finish_reason})")

            return organized_text.strip()

        except Exception as e:
            raise Exception(f"AI 정리 중 오류 발생: {str(e)}")

    def _get_basic_summary_prompt(self, ocr_text: str) -> str:
        """기본 요약 정리 프롬프트 (nano용 간소화)"""
        return f"""제목과 글머리표로 정리:

{ocr_text}
"""

    def _get_cornell_prompt(self, ocr_text: str) -> str:
        """코넬식 정리 프롬프트 (nano용 간소화)"""
        return f"""키워드와 설명을 표로 정리하고 요약:

{ocr_text}
"""


# 싱글톤 인스턴스
ai_service = AIService()
