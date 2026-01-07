"""
OCR Service
이미지에서 텍스트 추출 서비스
"""

from typing import List, Optional, Tuple, Dict, Any
import os
import base64
import json
import time
import uuid
import tempfile
from pathlib import Path
import httpx
from app.core.config import settings


class OCRService:
    """OCR 처리 서비스"""

    def __init__(self):
        self.use_clova_ocr = bool(settings.CLOVA_OCR_SECRET_KEY and settings.CLOVA_OCR_INVOKE_URL)
        self.use_google_vision = bool(settings.GOOGLE_APPLICATION_CREDENTIALS)

    async def extract_text_from_images(
        self,
        image_paths: List[str],
        use_google_for_math: bool = False
    ) -> tuple[str, dict]:
        """
        여러 이미지에서 텍스트 추출

        Args:
            image_paths: 이미지 파일 경로 리스트
            use_google_for_math: True면 수학 오답노트용으로 Google Vision 사용

        Returns:
            (추출된 텍스트, OCR 메타데이터)
        """
        all_text = []
        all_metadata = {"images": []}

        for image_path in image_paths:
            result = await self.extract_text_from_image(image_path, use_google_for_math)
            if result:
                text, metadata = result
                all_text.append(text)
                all_metadata["images"].append(metadata)

        return "\n\n".join(all_text), all_metadata

    async def extract_text_from_image(
        self,
        image_path: str,
        use_google_for_math: bool = False
    ) -> Optional[Tuple[str, Dict[str, Any]]]:
        """
        단일 이미지에서 텍스트 추출

        Args:
            image_path: 이미지 파일 경로
            use_google_for_math: True면 수학 오답노트용으로 Google Vision 사용

        Returns:
            (추출된 텍스트, OCR 메타데이터)
        """
        # URL인 경우 다운로드하여 임시 파일로 처리
        temp_file_path = None
        if image_path.startswith("http://") or image_path.startswith("https://"):
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.get(image_path)
                    if response.status_code != 200:
                        raise Exception(f"이미지 다운로드 실패: HTTP {response.status_code}")

                    # URL에서 확장자 추출
                    ext = ".jpg"
                    if "." in image_path.split("/")[-1].split("?")[0]:
                        ext = "." + image_path.split("/")[-1].split("?")[0].split(".")[-1].lower()
                    if ext not in [".jpg", ".jpeg", ".png", ".gif", ".webp"]:
                        ext = ".jpg"

                    # 임시 파일 생성
                    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
                    temp_file.write(response.content)
                    temp_file.close()
                    temp_file_path = temp_file.name
                    image_path = temp_file_path
            except httpx.RequestError as e:
                raise Exception(f"이미지 URL 다운로드 중 오류: {str(e)}")
        elif not os.path.exists(image_path):
            raise FileNotFoundError(f"이미지 파일을 찾을 수 없습니다: {image_path}")

        try:
            # 수학 오답노트인 경우 Google Vision 사용 (설정되어 있으면)
            if use_google_for_math and self.use_google_vision:
                return await self._extract_with_google_vision(image_path)

            # CLOVA OCR 우선 사용
            if self.use_clova_ocr:
                return await self._extract_with_clova_ocr(image_path)
            # Google Cloud Vision 사용
            elif self.use_google_vision:
                return await self._extract_with_google_vision(image_path)
            else:
                # 대안: Tesseract 사용
                return await self._extract_with_tesseract(image_path)
        finally:
            # 임시 파일 정리
            if temp_file_path and os.path.exists(temp_file_path):
                try:
                    os.unlink(temp_file_path)
                except Exception:
                    pass  # 임시 파일 삭제 실패는 무시

    async def _extract_with_clova_ocr(self, image_path: str) -> Optional[Tuple[str, Dict[str, Any]]]:
        """CLOVA OCR API로 텍스트 + bbox 추출"""
        try:
            # 이미지를 base64로 인코딩
            with open(image_path, "rb") as image_file:
                image_data = base64.b64encode(image_file.read()).decode("utf-8")

            # 파일 확장자로 포맷 결정
            ext = os.path.splitext(image_path)[1].lower()
            format_map = {".jpg": "jpg", ".jpeg": "jpg", ".png": "png"}
            image_format = format_map.get(ext, "jpg")

            # CLOVA OCR API 요청 본문
            request_body = {
                "version": "V2",
                "requestId": str(uuid.uuid4()),
                "timestamp": int(time.time() * 1000),
                "lang": "ko",
                "images": [
                    {
                        "format": image_format,
                        "name": "image",
                        "data": image_data
                    }
                ]
            }

            # API 호출
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    settings.CLOVA_OCR_INVOKE_URL,
                    headers={
                        "X-OCR-SECRET": settings.CLOVA_OCR_SECRET_KEY,
                        "Content-Type": "application/json"
                    },
                    json=request_body
                )

            if response.status_code != 200:
                raise Exception(f"CLOVA OCR API 오류: {response.status_code} - {response.text}")

            result = response.json()

            # 이미지 크기 추출 (정규화용)
            image_width = 1000
            image_height = 1000
            for image_result in result.get("images", []):
                if "convertedImageInfo" in image_result:
                    image_width = image_result["convertedImageInfo"].get("width", 1000)
                    image_height = image_result["convertedImageInfo"].get("height", 1000)

            # 텍스트 + bbox 추출 (원본 - 글자/단어 단위)
            extracted_texts = []
            ocr_words = []

            for image_result in result.get("images", []):
                for field in image_result.get("fields", []):
                    infer_text = field.get("inferText", "")
                    if not infer_text:
                        continue

                    # 텍스트
                    extracted_texts.append(infer_text)

                    # bbox + confidence
                    vertices = field.get("boundingPoly", {}).get("vertices", [])
                    if vertices:
                        # 4점 좌표에서 x, y, w, h 계산
                        xs = [int(v.get("x", 0)) for v in vertices]
                        ys = [int(v.get("y", 0)) for v in vertices]
                        x, y = min(xs), min(ys)
                        w, h = max(xs) - x, max(ys) - y

                        # y 중심값 (줄 판정용)
                        cy = y + h // 2

                        ocr_words.append({
                            "text": infer_text,
                            "x": x, "y": y, "w": w, "h": h,
                            "cy": cy,
                            "confidence": field.get("inferConfidence", 0.0)
                        })

            # 줄/블록으로 압축
            lines = self._merge_words_to_lines(ocr_words)
            blocks = self._merge_lines_to_blocks(lines, image_width, image_height)

            # 메타데이터 구조
            metadata = {
                "image_path": image_path,
                "image_size": {"w": image_width, "h": image_height},
                "words": ocr_words,  # 원본 (UI용)
                "blocks": blocks,     # 압축 (LLM용)
                "total_words": len(ocr_words),
                "total_blocks": len(blocks)
            }

            text_result = " ".join(extracted_texts) if extracted_texts else None
            return (text_result, metadata) if text_result else None

        except Exception as e:
            raise Exception(f"CLOVA OCR 처리 중 오류 발생: {str(e)}")

    def _merge_words_to_lines(self, words: List[Dict]) -> List[Dict]:
        """
        글자/단어 bbox → 줄(Line)로 합치기

        - y 중심값(cy) 기준으로 같은 줄 판정
        - 같은 줄은 x 기준 정렬 후 텍스트 이어붙임
        """
        if not words:
            return []

        # cy 기준 정렬
        sorted_words = sorted(words, key=lambda w: (w["cy"], w["x"]))

        lines = []
        current_line = [sorted_words[0]]

        for word in sorted_words[1:]:
            last_word = current_line[-1]

            # 평균 높이 계산
            avg_height = sum(w["h"] for w in current_line) / len(current_line)

            # 같은 줄 판정: cy 차이가 높이의 80% 이내 (수학 필기는 간격이 좁음)
            if abs(word["cy"] - last_word["cy"]) < avg_height * 0.8:
                current_line.append(word)
            else:
                # 새 줄 시작
                lines.append(self._create_line_from_words(current_line))
                current_line = [word]

        # 마지막 줄 추가
        if current_line:
            lines.append(self._create_line_from_words(current_line))

        return lines

    def _create_line_from_words(self, words: List[Dict]) -> Dict:
        """단어들을 하나의 줄로 합침"""
        # x 기준 정렬
        sorted_words = sorted(words, key=lambda w: w["x"])

        # 텍스트 이어붙이기
        text = " ".join(w["text"] for w in sorted_words)

        # bbox: 포함하는 최소 사각형
        min_x = min(w["x"] for w in sorted_words)
        min_y = min(w["y"] for w in sorted_words)
        max_x = max(w["x"] + w["w"] for w in sorted_words)
        max_y = max(w["y"] + w["h"] for w in sorted_words)

        # 평균 confidence
        avg_conf = sum(w["confidence"] for w in sorted_words) / len(sorted_words)

        return {
            "text": text,
            "x": min_x, "y": min_y,
            "w": max_x - min_x, "h": max_y - min_y,
            "cy": (min_y + max_y) // 2,
            "confidence": avg_conf,
            "word_count": len(sorted_words)
        }

    def _merge_lines_to_blocks(
        self,
        lines: List[Dict],
        image_width: int,
        image_height: int
    ) -> List[Dict]:
        """
        줄(Line) → 블록(Block)으로 합치기

        - 연속 줄 사이 간격이 작으면 같은 블록
        - 들여쓰기(x 시작점)가 비슷하면 같은 블록
        - 좌표는 0~1000 정규화
        """
        if not lines:
            return []

        # y 기준 정렬
        sorted_lines = sorted(lines, key=lambda l: l["y"])

        blocks = []
        current_block = [sorted_lines[0]]

        for line in sorted_lines[1:]:
            last_line = current_block[-1]

            # 줄 간격 계산
            line_gap = line["y"] - (last_line["y"] + last_line["h"])
            avg_height = sum(l["h"] for l in current_block) / len(current_block)

            # x 시작점 차이
            x_diff = abs(line["x"] - last_line["x"])

            # 같은 블록 판정:
            # - 줄 간격이 평균 높이의 2배 이내 (수학 필기는 간격이 좁음)
            # - x 시작점 차이가 100px 이내
            if line_gap < avg_height * 2.0 and x_diff < 100:
                current_block.append(line)
            else:
                # 새 블록 시작
                blocks.append(self._create_block_from_lines(
                    current_block, len(blocks), image_width, image_height
                ))
                current_block = [line]

        # 마지막 블록 추가
        if current_block:
            blocks.append(self._create_block_from_lines(
                current_block, len(blocks), image_width, image_height
            ))

        return blocks

    def _create_block_from_lines(
        self,
        lines: List[Dict],
        block_idx: int,
        image_width: int,
        image_height: int
    ) -> Dict:
        """줄들을 하나의 블록으로 합치고 좌표 정규화"""
        # 텍스트 합치기 (줄바꿈으로 구분)
        text = "\n".join(l["text"] for l in lines)

        # bbox: 포함하는 최소 사각형
        min_x = min(l["x"] for l in lines)
        min_y = min(l["y"] for l in lines)
        max_x = max(l["x"] + l["w"] for l in lines)
        max_y = max(l["y"] + l["h"] for l in lines)

        # 0~1000 정규화 (정수)
        norm_x = int(min_x * 1000 / image_width)
        norm_y = int(min_y * 1000 / image_height)
        norm_w = int((max_x - min_x) * 1000 / image_width)
        norm_h = int((max_y - min_y) * 1000 / image_height)

        # 평균 confidence
        avg_conf = sum(l["confidence"] for l in lines) / len(lines)

        return {
            "id": f"b{block_idx}",
            "bbox": [norm_x, norm_y, norm_w, norm_h],
            "text": text,
            "confidence": round(avg_conf, 3),
            "line_count": len(lines)
        }

    def get_blocks_for_llm(self, metadata: Dict) -> Dict:
        """
        LLM 전달용 압축 데이터 반환

        Returns:
            {"page": {"w": 1000, "h": 1000}, "blocks": [...]}
        """
        blocks = []

        for image_meta in metadata.get("images", []):
            blocks.extend(image_meta.get("blocks", []))

        return {
            "page": {"w": 1000, "h": 1000},
            "blocks": blocks
        }

    async def _extract_with_google_vision(self, image_path: str) -> Optional[Tuple[str, Dict[str, Any]]]:
        """Google Cloud Vision API로 텍스트 추출 (수학 오답노트용)"""
        try:
            from google.cloud import vision
            from google.oauth2 import service_account
            from PIL import Image as PILImage

            # credentials 파일 경로 (절대 경로로 변환)
            credentials_path = Path(__file__).parent.parent.parent / "credentials" / "google-vision.json"
            credentials = service_account.Credentials.from_service_account_file(str(credentials_path))
            client = vision.ImageAnnotatorClient(credentials=credentials)

            with open(image_path, "rb") as image_file:
                content = image_file.read()

            image = vision.Image(content=content)

            # 텍스트 감지 (손글씨 포함 - DOCUMENT_TEXT_DETECTION이 수학 기호에 더 좋음)
            response = client.document_text_detection(image=image)

            if response.error.message:
                raise Exception(f"Google Vision API Error: {response.error.message}")

            # 이미지 크기 가져오기
            try:
                pil_image = PILImage.open(image_path)
                image_width, image_height = pil_image.size
            except Exception:
                image_width, image_height = 1000, 1000

            # 전체 텍스트 추출
            text = response.full_text_annotation.text

            # 메타데이터 구성 (CLOVA 형식과 호환)
            ocr_words = []
            blocks = []

            # Google Vision의 word 단위 정보 추출
            for page in response.full_text_annotation.pages:
                for block_idx, block in enumerate(page.blocks):
                    block_text_parts = []
                    for paragraph in block.paragraphs:
                        for word in paragraph.words:
                            word_text = "".join([symbol.text for symbol in word.symbols])
                            block_text_parts.append(word_text)

                            # bbox 추출
                            vertices = word.bounding_box.vertices
                            if vertices:
                                xs = [v.x for v in vertices]
                                ys = [v.y for v in vertices]
                                x, y = min(xs), min(ys)
                                w, h = max(xs) - x, max(ys) - y
                                ocr_words.append({
                                    "text": word_text,
                                    "x": x, "y": y, "w": w, "h": h,
                                    "cy": y + h // 2,
                                    "confidence": word.confidence
                                })

                    # 블록 정보 추가
                    block_vertices = block.bounding_box.vertices
                    if block_vertices:
                        bxs = [v.x for v in block_vertices]
                        bys = [v.y for v in block_vertices]
                        bx, by = min(bxs), min(bys)
                        bw, bh = max(bxs) - bx, max(bys) - by

                        # 정규화 (0~1000)
                        norm_x = int(bx * 1000 / image_width) if image_width else 0
                        norm_y = int(by * 1000 / image_height) if image_height else 0
                        norm_w = int(bw * 1000 / image_width) if image_width else 0
                        norm_h = int(bh * 1000 / image_height) if image_height else 0

                        blocks.append({
                            "id": f"b{block_idx}",
                            "bbox": [norm_x, norm_y, norm_w, norm_h],
                            "text": " ".join(block_text_parts),
                            "confidence": block.confidence,
                            "line_count": len(block.paragraphs)
                        })

            metadata = {
                "image_path": image_path,
                "image_size": {"w": image_width, "h": image_height},
                "words": ocr_words,
                "blocks": blocks,
                "total_words": len(ocr_words),
                "total_blocks": len(blocks),
                "ocr_engine": "google_vision"
            }

            return (text.strip(), metadata) if text else None

        except ImportError as e:
            raise Exception(
                f"Google Cloud Vision import 오류: {str(e)}"
            )
        except Exception as e:
            raise Exception(f"Google Vision OCR 처리 중 오류 발생: {str(e)}")

    async def _extract_with_tesseract(self, image_path: str) -> Optional[str]:
        """Tesseract OCR로 텍스트 추출 (대안)"""
        try:
            import pytesseract
            from PIL import Image

            # 이미지 열기
            image = Image.open(image_path)

            # 한글 + 영문 OCR
            text = pytesseract.image_to_string(
                image,
                lang='kor+eng',  # 한글 + 영문
                config='--psm 6'  # Assume a single uniform block of text
            )

            return text.strip() if text else None

        except ImportError:
            raise Exception(
                "Tesseract가 설치되지 않았습니다. "
                "pytesseract와 Tesseract 실행 파일을 설치하세요."
            )
        except Exception as e:
            raise Exception(f"Tesseract OCR 처리 중 오류 발생: {str(e)}")


# 싱글톤 인스턴스
ocr_service = OCRService()
