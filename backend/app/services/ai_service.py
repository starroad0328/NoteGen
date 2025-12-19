"""
AI Organization Service
AI 기반 노트 정리 서비스 (2단계 처리 + 블록 압축)
"""

import json
from typing import Optional, Dict, List
from openai import OpenAI
from app.core.config import settings
from app.models.note import OrganizeMethod
from app.models.user import AIModel, UserPlan


class AIService:
    """AI 정리 서비스 (2단계 파이프라인)"""

    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)

    async def organize_note(
        self,
        ocr_text: str,
        method: OrganizeMethod,
        ocr_metadata: Optional[Dict] = None,
        ai_model: AIModel = AIModel.GPT_5_MINI
    ) -> str:
        """
        필기 텍스트를 2단계로 정리

        1단계: 구조 파악 (목차, 주제 분류)
        2단계: 원본 유지 + 보강 정리

        Args:
            ocr_text: OCR로 추출한 텍스트
            method: 정리 방식
            ocr_metadata: OCR 메타데이터 (압축 블록 포함)
            ai_model: 사용할 AI 모델

        Returns:
            정리된 노트 (마크다운 형식)
        """
        if not ocr_text or not ocr_text.strip():
            raise ValueError("정리할 텍스트가 비어있습니다.")

        # 압축된 블록 데이터 추출
        blocks_data = self._get_blocks_for_llm(ocr_metadata) if ocr_metadata else None

        try:
            # 1단계: 구조 파악
            print("[AI] 1단계 시작...", flush=True)

            structure = await self._step1_analyze_structure(blocks_data, ocr_text, ai_model)

            print(f"[AI] 1단계 완료. 구조 길이: {len(structure)}", flush=True)

            # 2단계: 원본 유지 + 보강 정리
            print("[AI] 2단계 시작...", flush=True)

            organized = await self._step2_organize_with_structure(
                blocks_data, ocr_text, structure, method, ai_model
            )

            print(f"[AI] 2단계 완료. 결과 길이: {len(organized)}", flush=True)

            return organized

        except Exception as e:
            print(f"[AI] 에러 발생: {str(e)}", flush=True)
            raise Exception(f"AI 정리 중 오류 발생: {str(e)}")

    def _get_blocks_for_llm(self, metadata: Dict) -> Optional[Dict]:
        """LLM 전달용 압축 블록 데이터 추출"""
        if not metadata:
            return None

        blocks = []
        for image_meta in metadata.get("images", []):
            blocks.extend(image_meta.get("blocks", []))

        if not blocks:
            return None

        return {
            "page": {"w": 1000, "h": 1000},
            "blocks": blocks
        }

    def _format_blocks_for_prompt(self, blocks_data: Dict) -> str:
        """블록 데이터를 프롬프트용 문자열로 변환"""
        if not blocks_data or not blocks_data.get("blocks"):
            return ""

        lines = []
        for block in blocks_data["blocks"]:
            # [id] (y좌표) 텍스트
            bbox = block.get("bbox", [0, 0, 0, 0])
            lines.append(f"[{block['id']}] (y:{bbox[1]}) {block['text']}")

        return "\n".join(lines)

    async def _step1_analyze_structure(
        self,
        blocks_data: Optional[Dict],
        ocr_text: str,
        ai_model: AIModel
    ) -> str:
        """
        1단계: 필기 구조 파악 (가볍게)
        - 목차 뽑기
        - 주제 분류
        - 누락 위험 구간 체크
        """
        # 블록 데이터 사용 (토큰 절약)
        if blocks_data:
            content = self._format_blocks_for_prompt(blocks_data)
            input_desc = f"(블록 {len(blocks_data['blocks'])}개)"
        else:
            content = ocr_text
            input_desc = "(원본 텍스트)"

        prompt = f"""다음 필기의 구조를 파악해주세요. {input_desc}

[출력 형식]
- 주제: (한 줄)
- 섹션: (번호로 나열)
- 주의: (누락 위험 구간)

[필기]
{content}
"""

        with open('C:/NoteGen/backend/debug.log', 'a', encoding='utf-8') as f:
            f.write(f"[AI] _step1 API 호출 직전\n")

        response = self.client.chat.completions.create(
            model=ai_model.value,
            messages=[
                {
                    "role": "system",
                    "content": "필기 구조만 간단히 파악. 짧게."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_completion_tokens=3000  # 1단계: reasoning 포함
        )

        with open('C:/NoteGen/backend/debug.log', 'a', encoding='utf-8') as f:
            f.write(f"[AI] _step1 API 호출 완료, finish_reason: {response.choices[0].finish_reason}\n")

        result = response.choices[0].message.content
        if not result or not result.strip():
            if response.choices[0].finish_reason == "length":
                raise Exception("1단계 토큰 한도 초과")
            return ""
        return result.strip()

    async def _step2_organize_with_structure(
        self,
        blocks_data: Optional[Dict],
        ocr_text: str,
        structure: str,
        method: OrganizeMethod,
        ai_model: AIModel
    ) -> str:
        """
        2단계: 원본 유지 + 보강 정리 (핵심)
        - 원본 필기 내용은 삭제/요약 금지
        - 빠진 설명만 [보강]으로 추가
        """
        # 블록 데이터 사용 (토큰 절약)
        if blocks_data:
            content = self._format_blocks_for_prompt(blocks_data)
            block_count = len(blocks_data['blocks'])
        else:
            content = ocr_text
            block_count = 0

        # 정리 방식에 따른 포맷 지시
        if method == OrganizeMethod.BASIC_SUMMARY:
            format_instruction = """[출력 형식]
# 제목

## 섹션1
- 원본 내용 그대로
- [보강] 추가 설명

## 섹션2
- 원본 내용 그대로
"""
        elif method == OrganizeMethod.CORNELL:
            format_instruction = """[출력 형식]
# 제목

| 키워드 | 설명 |
|--------|------|
| 개념 | 원본 내용 |
| [보강] | 추가 설명 |

**요약**: 1문장
"""
        else:
            format_instruction = "글머리표로 정리"

        prompt = f"""필기를 정리해주세요. (블록 {block_count}개)

[필수 규칙]
- 원본 내용 삭제/요약 금지
- 추가 설명은 [보강]으로 표시
- 섹션당 최대 8개 bullet

[구조]
{structure}

{format_instruction}

[필기 블록]
{content}
"""

        response = self.client.chat.completions.create(
            model=ai_model.value,
            messages=[
                {
                    "role": "system",
                    "content": "학생 필기 정리. 원본 삭제 금지."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_completion_tokens=6000  # 2단계: 충분히
        )

        result = response.choices[0].message.content

        if not result or not result.strip():
            if response.choices[0].finish_reason == "length":
                raise Exception("토큰 한도 초과: max_completion_tokens를 늘려야 합니다.")
            raise Exception(f"AI가 빈 응답을 반환했습니다. (finish_reason: {response.choices[0].finish_reason})")

        return result.strip()


# 싱글톤 인스턴스
ai_service = AIService()
