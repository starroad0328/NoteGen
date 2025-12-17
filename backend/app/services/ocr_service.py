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
import httpx
from app.core.config import settings


class OCRService:
    """OCR 처리 서비스"""

    def __init__(self):
        self.use_clova_ocr = bool(settings.CLOVA_OCR_SECRET_KEY and settings.CLOVA_OCR_INVOKE_URL)
        self.use_google_vision = bool(settings.GOOGLE_APPLICATION_CREDENTIALS)

    async def extract_text_from_images(self, image_paths: List[str]) -> tuple[str, dict]:
        """
        여러 이미지에서 텍스트 추출

        Args:
            image_paths: 이미지 파일 경로 리스트

        Returns:
            (추출된 텍스트, OCR 메타데이터)
        """
        all_text = []
        all_metadata = {"images": []}

        for image_path in image_paths:
            result = await self.extract_text_from_image(image_path)
            if result:
                text, metadata = result
                all_text.append(text)
                all_metadata["images"].append(metadata)

        return "\n\n".join(all_text), all_metadata

    async def extract_text_from_image(self, image_path: str) -> Optional[Tuple[str, Dict[str, Any]]]:
        """
        단일 이미지에서 텍스트 추출

        Args:
            image_path: 이미지 파일 경로

        Returns:
            (추출된 텍스트, OCR 메타데이터)
        """
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"이미지 파일을 찾을 수 없습니다: {image_path}")

        # CLOVA OCR 우선 사용
        if self.use_clova_ocr:
            return await self._extract_with_clova_ocr(image_path)
        # Google Cloud Vision 사용
        elif self.use_google_vision:
            return await self._extract_with_google_vision(image_path)
        else:
            # 대안: Tesseract 사용
            return await self._extract_with_tesseract(image_path)

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

            # 텍스트 + bbox 추출
            extracted_texts = []
            ocr_blocks = []

            for image_result in result.get("images", []):
                for field in image_result.get("fields", []):
                    infer_text = field.get("inferText", "")
                    if not infer_text:
                        continue

                    # 텍스트
                    extracted_texts.append(infer_text)

                    # bbox + confidence + 메타데이터
                    vertices = field.get("boundingPoly", {}).get("vertices", [])
                    bbox = [[int(v.get("x", 0)), int(v.get("y", 0))] for v in vertices] if vertices else None

                    ocr_blocks.append({
                        "text": infer_text,
                        "bbox": bbox,
                        "confidence": field.get("inferConfidence", 0.0),
                        "source": "clova"
                    })

            # 메타데이터 구조
            metadata = {
                "image_path": image_path,
                "blocks": ocr_blocks,
                "total_blocks": len(ocr_blocks)
            }

            text_result = " ".join(extracted_texts) if extracted_texts else None
            return (text_result, metadata) if text_result else None

        except Exception as e:
            raise Exception(f"CLOVA OCR 처리 중 오류 발생: {str(e)}")

    async def _extract_with_google_vision(self, image_path: str) -> Optional[str]:
        """Google Cloud Vision API로 텍스트 추출"""
        try:
            from google.cloud import vision

            client = vision.ImageAnnotatorClient()

            with open(image_path, "rb") as image_file:
                content = image_file.read()

            image = vision.Image(content=content)

            # 텍스트 감지 (손글씨 포함)
            response = client.document_text_detection(image=image)

            if response.error.message:
                raise Exception(f"Google Vision API Error: {response.error.message}")

            # 전체 텍스트 추출
            text = response.full_text_annotation.text

            return text.strip() if text else None

        except ImportError:
            raise Exception(
                "Google Cloud Vision 라이브러리가 설치되지 않았습니다. "
                "pip install google-cloud-vision을 실행하세요."
            )
        except Exception as e:
            raise Exception(f"OCR 처리 중 오류 발생: {str(e)}")

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
