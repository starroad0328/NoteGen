"""
AI Organization Service
AI 기반 노트 정리 서비스 (3단계 처리 + 블록 압축 + 교육과정 반영)
"""

import json
from typing import Optional, Dict, List
from openai import OpenAI
from app.core.config import settings
from app.core.curriculum import get_curriculum_context, detect_subject
from app.models.note import OrganizeMethod, NoteType, Subject
from app.models.user import AIModel, UserPlan, SchoolLevel
import os
from pathlib import Path


class AIService:
    """AI 정리 서비스 (2단계 파이프라인 + 노트 타입 감지)"""

    # 프롬프트 파일 경로
    PROMPTS_DIR = Path(__file__).parent.parent / "prompts"

    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
        self._prompt_cache: Dict[str, str] = {}

    def _load_prompt(self, prompt_name: str) -> Optional[str]:
        """프롬프트 파일 로드 (캐싱)"""
        if prompt_name in self._prompt_cache:
            return self._prompt_cache[prompt_name]

        prompt_path = self.PROMPTS_DIR / f"{prompt_name}.txt"
        if prompt_path.exists():
            with open(prompt_path, "r", encoding="utf-8") as f:
                content = f.read()
                self._prompt_cache[prompt_name] = content
                return content
        return None

    async def organize_note(
        self,
        ocr_text: str,
        method: OrganizeMethod,
        ocr_metadata: Optional[Dict] = None,
        ai_model: Optional[AIModel] = None,
        on_step: Optional[callable] = None,
        school_level: Optional[SchoolLevel] = None,
        grade: Optional[int] = None
    ) -> Dict:
        """
        필기 텍스트를 3단계로 정리

        0단계: OCR 정제 (띄어쓰기, 오타)
        1단계: 구조 파악 + 과목/노트타입 감지
        2단계: 타입별 프롬프트로 정리 생성

        Args:
            ocr_text: OCR로 추출한 텍스트
            method: 정리 방식
            ocr_metadata: OCR 메타데이터 (압축 블록 포함)
            ai_model: 사용할 AI 모델
            on_step: 단계별 콜백 함수
            school_level: 학교급 (중/고)
            grade: 학년 (1, 2, 3)

        Returns:
            Dict: {
                "content": 정리된 노트 (마크다운),
                "detected_subject": 감지된 과목,
                "detected_note_type": 감지된 노트 타입
            }
        """
        if not ocr_text or not ocr_text.strip():
            raise ValueError("정리할 텍스트가 비어있습니다.")

        # ai_model이 None이면 기본값 사용
        if ai_model is None:
            ai_model = AIModel.GPT_5_MINI

        # 압축된 블록 데이터 추출
        blocks_data = self._get_blocks_for_llm(ocr_metadata) if ocr_metadata else None

        try:
            # 0단계: OCR 정제 (렌즈급 텍스트 복원) - 항상 nano 사용
            print("[AI] 0단계: OCR 정제 시작...", flush=True)
            if on_step:
                await on_step(0, "OCR 텍스트 정제 중...")

            refined_text = await self._step0_refine_ocr(ocr_text, AIModel.GPT_5_NANO)

            print(f"[AI] 0단계 완료. 정제 텍스트 길이: {len(refined_text)}", flush=True)

            # 1단계: 구조 파악 + 과목/노트타입 감지
            print("[AI] 1단계 시작...", flush=True)
            if on_step:
                await on_step(1, "필기 구조 분석 중...")

            # 교육과정 컨텍스트 생성 (1단계에서도 활용)
            curriculum_context = get_curriculum_context(school_level, grade)

            analysis_result = await self._step1_analyze_structure(
                blocks_data, refined_text, ai_model, school_level, grade, curriculum_context
            )

            # 감지된 과목/노트타입/단원 추출
            detected_subject = analysis_result.get("subject", "other")
            detected_note_type = analysis_result.get("note_type", "general")
            detected_unit = analysis_result.get("detected_unit", "")
            structure_text = analysis_result.get("structure", "")

            print(f"[AI] 1단계 완료. 과목={detected_subject}, 타입={detected_note_type}, 단원={detected_unit}", flush=True)

            # 2단계: 타입별 프롬프트로 정리 생성
            print("[AI] 2단계 시작...", flush=True)
            if on_step:
                # 노트 타입에 따른 메시지 표시
                type_msg = {
                    "error_note": "오답노트 형식으로 정리 중...",
                    "vocab": "단어장 형식으로 정리 중...",
                    "general": "AI 정리 생성 중..."
                }
                await on_step(2, type_msg.get(detected_note_type, "AI 정리 생성 중..."))

            if curriculum_context:
                print(f"[AI] 교육과정 컨텍스트 적용: {school_level.value if school_level else ''} {grade}학년", flush=True)

            organized = await self._step2_organize_with_structure(
                blocks_data, refined_text, structure_text, method, ai_model, curriculum_context,
                detected_subject, detected_note_type
            )

            print(f"[AI] 2단계 완료. 결과 길이: {len(organized)}", flush=True)

            return {
                "content": organized,
                "detected_subject": detected_subject,
                "detected_note_type": detected_note_type,
                "detected_unit": detected_unit
            }

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

    async def _step0_refine_ocr(
        self,
        ocr_text: str,
        ai_model: AIModel
    ) -> str:
        """
        0단계: OCR 결과 정제 (렌즈급 텍스트 복원)
        - 띄어쓰기 복원
        - 잘린 글자/단어 합치기
        - 오타 교정 (문맥상 명백한 것만)
        - 요약/설명 추가 금지
        """
        prompt = f"""다음 OCR 결과를 자연스러운 텍스트로 정제해줘.

[규칙]
- 원본 내용 그대로 유지
- 띄어쓰기만 자연스럽게 복원
- 잘린 글자/단어 합치기
- 명백한 오타만 교정
- 요약/설명 추가 절대 금지
- 순서 변경 금지
- 없는 내용 추가 금지

[수학 기호 복원]
- 숫자 위첨자: 2 -> ^2 (제곱), 3 -> ^3 (세제곱)
- 루트 기호: V, v -> 루트 또는 sqrt
- 분수: 가로선 위아래 숫자 -> a/b
- 곱하기: x, X, * -> x (문맥에 따라)
- 나누기: / 또는 나누기
- 등호: = 복원
- 부등호: <, >, <=, >=
- 괄호: (), [], 중괄호 구분
- 그리스 문자: 알파, 베타, 세타 등

[OCR 결과]
{ocr_text}

[정제된 텍스트]"""

        response = self.client.chat.completions.create(
            model=ai_model.value,
            messages=[
                {
                    "role": "system",
                    "content": "OCR 텍스트 정제만. 내용 추가/요약 금지."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_completion_tokens=3000
        )

        result = response.choices[0].message.content
        if not result or not result.strip():
            # 정제 실패시 원본 반환
            return ocr_text
        return result.strip()

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
        ai_model: AIModel,
        school_level: Optional[SchoolLevel] = None,
        grade: Optional[int] = None,
        curriculum_context: str = ""
    ) -> Dict:
        """
        1단계: 필기 구조 파악 + 과목/노트타입 감지
        - 과목 감지 (수학, 영어, 국어, 역사, 사회, 과학)
        - 노트 타입 감지 (일반필기, 오답노트, 단어장)
        - 목차 뽑기
        - 주제 분류
        """
        # 블록 데이터 사용 (토큰 절약)
        if blocks_data:
            content = self._format_blocks_for_prompt(blocks_data)
            input_desc = f"(블록 {len(blocks_data['blocks'])}개)"
        else:
            content = ocr_text
            input_desc = "(원본 텍스트)"

        # 학년 정보 섹션 생성
        grade_info = ""
        if school_level and grade:
            level_name = "중학교" if school_level == SchoolLevel.MIDDLE else "고등학교"
            grade_info = f"\n[학습자 정보]\n{level_name} {grade}학년 학생의 필기입니다.\n"
            if curriculum_context:
                # 교육과정에서 과목 목록만 추출
                grade_info += "이 학년에서 배우는 주요 단원을 참고하여 과목을 정확히 감지하세요.\n"

        prompt = f"""다음 필기를 분석해주세요. {input_desc}
{grade_info}
[분석 항목]
1. 과목 감지: math, english, korean, history, social, science, other 중 하나
2. 노트 타입 감지:
   - general: 일반 필기 (개념 정리, 수업 내용)
   - error_note: 오답노트 (문제, 풀이, 정답/오답 포함)
   - vocab: 단어장 (영어 단어, 뜻, 예문)
3. 구조 파악: 섹션, 그룹핑, 주의사항
4. 단원 감지: 학년 교육과정에서 어떤 단원에 해당하는지

[노트 타입 판단 기준]
- error_note: "문제", "풀이", "정답", "오답", "해설", "O/X" 등 포함
- vocab: 영어 단어 + 뜻/예문 형태
- general: 그 외 일반적인 필기

[출력 형식 - 반드시 JSON]
```json
{{
  "subject": "math|english|korean|history|social|science|other",
  "note_type": "general|error_note|vocab",
  "structure": "주제 및 섹션 설명",
  "sections": ["섹션1", "섹션2"],
  "grouping": "그룹핑 힌트",
  "detected_unit": "감지된 단원명 (예: 일차함수, 고려시대)"
}}
```

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
                    "content": "필기 분석 후 JSON 형식으로만 응답. 다른 텍스트 없이 JSON만."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_completion_tokens=3000
        )

        with open('C:/NoteGen/backend/debug.log', 'a', encoding='utf-8') as f:
            f.write(f"[AI] _step1 API 호출 완료, finish_reason: {response.choices[0].finish_reason}\n")

        result = response.choices[0].message.content
        if not result or not result.strip():
            if response.choices[0].finish_reason == "length":
                raise Exception("1단계 토큰 한도 초과")
            return {"subject": "other", "note_type": "general", "structure": "", "sections": [], "grouping": "", "detected_unit": ""}

        # JSON 파싱 시도
        try:
            # ```json ... ``` 블록 추출
            json_str = result.strip()
            if "```json" in json_str:
                json_str = json_str.split("```json")[1].split("```")[0].strip()
            elif "```" in json_str:
                json_str = json_str.split("```")[1].split("```")[0].strip()

            parsed = json.loads(json_str)
            print(f"[AI] 1단계 감지 결과: subject={parsed.get('subject')}, note_type={parsed.get('note_type')}", flush=True)
            return parsed
        except json.JSONDecodeError as e:
            print(f"[AI] JSON 파싱 실패, fallback: {e}", flush=True)
            # 파싱 실패 시 기본값 + 원본 텍스트를 structure에 저장
            return {"subject": "other", "note_type": "general", "structure": result, "sections": [], "grouping": "", "detected_unit": ""}

    def _get_prompt_for_note_type(
        self,
        detected_subject: str,
        detected_note_type: str,
        method: OrganizeMethod
    ) -> tuple[str, str]:
        """
        노트 타입에 따른 프롬프트 선택
        - 사용자가 명시적으로 선택한 method 우선
        - 그 외에는 AI 감지 결과 사용

        Returns:
            (prompt_content, system_message)
        """
        # 1. 사용자가 명시적으로 오답노트 선택
        if method == OrganizeMethod.ERROR_NOTE:
            # 수학이면 수학 오답노트, 아니면 일반 오답노트
            if detected_subject == "math":
                prompt = self._load_prompt("math_error_note")
                if prompt:
                    return prompt, "수학 오답노트 형식으로 정리. 메타데이터 제거. 깔끔한 마크다운만."
            prompt = self._load_prompt("general_error_note")
            if prompt:
                return prompt, "오답노트 형식으로 정리. 메타데이터 제거. 깔끔한 마크다운만."

        # 2. 사용자가 명시적으로 단어장 선택
        if method == OrganizeMethod.VOCAB:
            prompt = self._load_prompt("english_vocab")
            if prompt:
                return prompt, "영어 단어장 형식으로 정리. 메타데이터 제거. 깔끔한 마크다운만."

        # 3. AI 감지 기반 (기존 로직) - BASIC_SUMMARY, CORNELL일 때
        # 수학 오답노트
        if detected_note_type == "error_note" and detected_subject == "math":
            prompt = self._load_prompt("math_error_note")
            if prompt:
                return prompt, "수학 오답노트 형식으로 정리. 메타데이터 제거. 깔끔한 마크다운만."

        # 영어 단어장
        if detected_note_type == "vocab" and detected_subject == "english":
            prompt = self._load_prompt("english_vocab")
            if prompt:
                return prompt, "영어 단어장 형식으로 정리. 메타데이터 제거. 깔끔한 마크다운만."

        # 일반 오답노트 (수학 외 과목)
        if detected_note_type == "error_note":
            prompt = self._load_prompt("general_error_note")
            if prompt:
                return prompt, "오답노트 형식으로 정리. 메타데이터 제거. 깔끔한 마크다운만."

        # 기본: 일반 필기 (기존 로직)
        return None, "학생 필기 정리. 메타데이터([bX], y좌표) 절대 출력 금지. 깔끔한 마크다운만."

    async def _step2_organize_with_structure(
        self,
        blocks_data: Optional[Dict],
        ocr_text: str,
        structure: str,
        method: OrganizeMethod,
        ai_model: AIModel,
        curriculum_context: str = "",
        detected_subject: str = "other",
        detected_note_type: str = "general"
    ) -> str:
        """
        2단계: 타입별 프롬프트로 정리 생성
        - 오답노트/단어장/일반필기 분기
        - 교육과정에 맞는 설명 제공
        """
        # 블록 데이터 사용 (토큰 절약)
        if blocks_data:
            content = self._format_blocks_for_prompt(blocks_data)
            block_count = len(blocks_data['blocks'])
        else:
            content = ocr_text
            block_count = 0

        # 노트 타입별 프롬프트 선택
        type_prompt, system_message = self._get_prompt_for_note_type(
            detected_subject, detected_note_type, method
        )

        if type_prompt:
            # 타입별 전용 프롬프트 사용
            curriculum_section = f"\n{curriculum_context}\n" if curriculum_context else ""

            prompt = f"""{type_prompt}
{curriculum_section}
[구조 참고]
{structure}

[필기 내용]
{content}
"""
        else:
            # 기본 프롬프트 (기존 로직)
            if method == OrganizeMethod.BASIC_SUMMARY:
                format_instruction = """[출력 형식]
# 제목

## 소제목1
- 핵심 내용
- 세부 내용

## 소제목2
- 핵심 내용
"""
            elif method == OrganizeMethod.CORNELL:
                format_instruction = """[출력 형식 - 코넬식 JSON]
반드시 아래 JSON 형식으로만 출력하세요. 다른 텍스트 없이 JSON만 출력.

```json
{
  "title": "제목 (내용 기반 자동 생성)",
  "cues": [
    "키워드1",
    "키워드2",
    "핵심용어"
  ],
  "main": [
    {"type": "heading", "level": 2, "content": "소제목"},
    {"type": "paragraph", "content": "설명 텍스트"},
    {"type": "bullet", "items": ["항목1", "항목2", "항목3"]},
    {"type": "important", "content": "중요 개념 강조"},
    {"type": "example", "content": "예시 내용"}
  ],
  "summary": "전체 내용을 1-2문장으로 압축한 요약 (하단 영역)"
}
```

[main 배열 타입 설명]
- heading: 소제목 (level: 2 또는 3)
- paragraph: 일반 텍스트 설명
- bullet: 글머리표 목록 (items 배열)
- important: 중요 개념 (강조 표시용)
- example: 예시 (별도 스타일 적용용)

[규칙]
- cues는 암기용 핵심 키워드/용어만 (5-10개)
  문장이나 질문 형태 X, 단어/용어 형태로만
- main은 논리적 순서로 구성
- 마크다운 문법 사용하지 말 것 (JSON 구조로 표현)
"""
            else:
                format_instruction = "글머리표로 정리"

            curriculum_section = f"\n{curriculum_context}\n" if curriculum_context else ""

            prompt = f"""필기를 정리해주세요.

[필수 규칙]
- 블록ID, 좌표 등 메타데이터는 출력에서 완전히 제거
- [bX], (y:XX) 같은 형식 절대 출력 금지
- 깔끔한 마크다운으로만 출력
- 원본 내용 기반으로 정리

[그룹핑 규칙 - 중요!]
- 관련된 내용은 반드시 같은 섹션으로 묶기
- 세부 개념은 상위 주제 아래 하위 항목으로 배치
- 예: "3성 6부" → "발해" 섹션 안에 / "과거제" → "고려" 섹션 안에
- 시대/국가/주제가 같으면 하나의 섹션으로 통합
- 필기 순서보다 논리적 연결을 우선
{curriculum_section}
[구조 참고]
{structure}

{format_instruction}

[필기 내용]
{content}
"""

        response = self.client.chat.completions.create(
            model=ai_model.value,
            messages=[
                {
                    "role": "system",
                    "content": system_message
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_completion_tokens=6000
        )

        result = response.choices[0].message.content

        if not result or not result.strip():
            if response.choices[0].finish_reason == "length":
                raise Exception("토큰 한도 초과: max_completion_tokens를 늘려야 합니다.")
            raise Exception(f"AI가 빈 응답을 반환했습니다. (finish_reason: {response.choices[0].finish_reason})")

        result = result.strip()

        # 코넬식일 때 JSON 블록 추출 및 검증
        if method == OrganizeMethod.CORNELL:
            result = self._extract_cornell_json(result)

        return result

    def _extract_cornell_json(self, result: str) -> str:
        """코넬식 JSON 응답에서 JSON 블록 추출 및 검증"""
        json_str = result

        # ```json ... ``` 블록 추출
        if "```json" in json_str:
            json_str = json_str.split("```json")[1].split("```")[0].strip()
        elif "```" in json_str:
            json_str = json_str.split("```")[1].split("```")[0].strip()

        # JSON 검증
        try:
            parsed = json.loads(json_str)
            # 필수 필드 확인
            if not all(key in parsed for key in ["title", "cues", "main", "summary"]):
                print("[AI] 코넬식 JSON 필수 필드 누락, 원본 반환", flush=True)
                return result
            # 검증된 JSON 문자열 반환
            return json.dumps(parsed, ensure_ascii=False)
        except json.JSONDecodeError as e:
            print(f"[AI] 코넬식 JSON 파싱 실패: {e}, 원본 반환", flush=True)
            return result

    def _parse_error_note_sections(self, content: str) -> str:
        """오답노트에서 취약 개념 분석에 필요한 섹션만 추출"""
        import re

        sections = []

        # 틀린 이유/틀린 부분 추출
        reason_patterns = [
            r'\*\*틀린 이유\*\*[:\s]*([^\*]+?)(?=\*\*|$)',
            r'\*\*틀린 부분\*\*[:\s]*([^\*]+?)(?=\*\*|$)',
        ]
        for pattern in reason_patterns:
            matches = re.findall(pattern, content, re.DOTALL)
            for m in matches:
                sections.append(f"틀린 이유: {m.strip()[:300]}")

        # 핵심 공식/핵심 개념 추출
        formula_patterns = [
            r'\*\*핵심 공식\*\*[:\s]*([^\*]+?)(?=\*\*|$)',
            r'\*\*핵심 개념\*\*[:\s]*([^\*]+?)(?=\*\*|$)',
        ]
        for pattern in formula_patterns:
            matches = re.findall(pattern, content, re.DOTALL)
            for m in matches:
                sections.append(f"핵심 개념: {m.strip()[:200]}")

        # 주의점 추출
        caution_pattern = r'\*\*주의점\*\*[:\s]*([^\*]+?)(?=\*\*|$)'
        matches = re.findall(caution_pattern, content, re.DOTALL)
        for m in matches:
            sections.append(f"주의점: {m.strip()[:200]}")

        return "\n".join(sections) if sections else content[:500]

    async def extract_weak_concepts(
        self,
        organized_content: str,
        subject: str,
        unit: str = ""
    ) -> list:
        """
        오답노트에서 취약 개념 추출

        Args:
            organized_content: 정리된 오답노트 내용
            subject: 과목
            unit: 단원

        Returns:
            list: [{"concept": "개념명", "error_reason": "틀린 이유"}, ...]
        """
        # 필요한 섹션만 추출
        parsed_content = self._parse_error_note_sections(organized_content)
        print(f"[AI] 취약 개념 분석용 파싱 완료: {len(parsed_content)}자", flush=True)

        prompt = f"""다음 오답노트 분석 내용을 보고 학생이 취약한 개념을 추출하세요.

[과목]: {subject}
[단원]: {unit or "미지정"}

[분석 내용]:
{parsed_content}

[출력]: JSON 배열만 출력. 최대 5개.
예시: [{{"concept": "이차방정식", "error_reason": "근의 공식 적용 오류"}}]

JSON:"""

        try:
            response = self.client.chat.completions.create(
                model="gpt-5-mini-2025-08-07",  # 취약 개념 추출용
                messages=[
                    {
                        "role": "system",
                        "content": "오답노트에서 취약 개념을 추출하는 분석가입니다. JSON 배열만 출력합니다."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_completion_tokens=1000
            )

            print(f"[AI] 취약 개념 response: finish_reason={response.choices[0].finish_reason}", flush=True)
            result = response.choices[0].message.content
            print(f"[AI] 취약 개념 원본 응답: {result[:200] if result else 'None'}", flush=True)
            if response.choices[0].message.refusal:
                print(f"[AI] 취약 개념 거부됨: {response.choices[0].message.refusal}", flush=True)
                return []
            if not result:
                print("[AI] 취약 개념 응답이 비어있음", flush=True)
                return []
            result = result.strip()

            # JSON 파싱
            if "```json" in result:
                result = result.split("```json")[1].split("```")[0].strip()
            elif "```" in result:
                result = result.split("```")[1].split("```")[0].strip()

            concepts = json.loads(result)

            # 유효성 검사
            if not isinstance(concepts, list):
                return []

            valid_concepts = []
            for c in concepts[:5]:  # 최대 5개
                if isinstance(c, dict) and "concept" in c:
                    valid_concepts.append({
                        "concept": str(c.get("concept", ""))[:200],
                        "error_reason": str(c.get("error_reason", ""))[:500]
                    })

            print(f"[AI] 취약 개념 추출 완료: {len(valid_concepts)}개", flush=True)
            return valid_concepts

        except Exception as e:
            print(f"[AI] 취약 개념 추출 실패: {e}", flush=True)
            return []


# 싱글톤 인스턴스
ai_service = AIService()
