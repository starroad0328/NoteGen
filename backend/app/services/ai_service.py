"""
AI Organization Service
AI 기반 노트 정리 서비스
"""

from typing import Optional
from openai import OpenAI
from app.core.config import settings
from app.models.note import OrganizeMethod


class AIService:
    """AI 정리 서비스"""

    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)

    async def organize_note(
        self,
        ocr_text: str,
        method: OrganizeMethod
    ) -> str:
        """
        필기 텍스트를 선택한 방식으로 정리

        Args:
            ocr_text: OCR로 추출한 텍스트
            method: 정리 방식

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

        # OpenAI API 호출
        try:
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "당신은 학생들의 필기를 깔끔하게 정리해주는 AI 어시스턴트입니다. "
                                   "주어진 텍스트를 읽기 쉽고 이해하기 쉽게 구조화하세요."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,  # 일관성 있는 결과를 위해 낮게 설정
                max_tokens=2000
            )

            organized_text = response.choices[0].message.content

            return organized_text.strip()

        except Exception as e:
            raise Exception(f"AI 정리 중 오류 발생: {str(e)}")

    def _get_basic_summary_prompt(self, ocr_text: str) -> str:
        """기본 요약 정리 프롬프트"""
        return f"""
다음 필기 내용을 '기본 요약 정리' 형식으로 정리해주세요.

[정리 규칙]
1. 제목을 자동으로 생성하세요 (내용을 기반으로)
2. 소제목으로 내용을 구분하세요
3. 각 소제목 아래에 글머리표(•)를 사용하여 요약하세요
4. 중요한 개념은 ⭐ 표시를 추가하세요
5. 강조할 내용은 🔸 표시를 추가하세요
6. 마크다운 형식으로 작성하세요

[출력 형식]
# [제목]

## [소제목 1]
• 요약 내용 1
• ⭐ 중요 개념
• 요약 내용 2

## [소제목 2]
• 🔸 강조 내용
• 요약 내용

[필기 원문]
{ocr_text}

위 내용을 기본 요약 정리 형식으로 정리해주세요:
"""

    def _get_cornell_prompt(self, ocr_text: str) -> str:
        """코넬식 정리 프롬프트"""
        return f"""
다음 필기 내용을 '코넬식 노트' 형식으로 정리해주세요.

[정리 규칙]
1. 제목을 자동으로 생성하세요
2. 좌측 키워드: 핵심 개념을 질문형으로 ("~란?", "~의 특징은?")
3. 우측 본문: 개념을 명확하게 설명
4. 하단 요약: 전체 내용을 1문장으로 압축
5. 중요한 개념은 ⭐ 표시
6. 마크다운 형식으로 작성하세요

[출력 형식]
# [제목]

## 📝 노트 내용

| 키워드/질문 | 설명 |
|------------|------|
| ⭐ [핵심 개념]이란? | [명확한 설명] |
| [관련 개념]의 특징은? | [특징 설명] |

---

**📌 요약**
[전체 내용을 1문장으로 압축한 요약]

[필기 원문]
{ocr_text}

위 내용을 코넬식 노트 형식으로 정리해주세요:
"""


# 싱글톤 인스턴스
ai_service = AIService()
