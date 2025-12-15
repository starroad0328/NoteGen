"""
OCR Service
이미지에서 텍스트 추출 서비스
"""

from typing import List, Optional
import os
from app.core.config import settings


class OCRService:
    """OCR 처리 서비스"""

    def __init__(self):
        self.use_google_vision = bool(settings.GOOGLE_APPLICATION_CREDENTIALS)

    async def extract_text_from_images(self, image_paths: List[str]) -> str:
        """
        여러 이미지에서 텍스트 추출

        Args:
            image_paths: 이미지 파일 경로 리스트

        Returns:
            추출된 텍스트 (모든 이미지 통합)
        """
        all_text = []

        for image_path in image_paths:
            text = await self.extract_text_from_image(image_path)
            if text:
                all_text.append(text)

        return "\n\n".join(all_text)

    async def extract_text_from_image(self, image_path: str) -> Optional[str]:
        """
        단일 이미지에서 텍스트 추출

        Args:
            image_path: 이미지 파일 경로

        Returns:
            추출된 텍스트
        """
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"이미지 파일을 찾을 수 없습니다: {image_path}")

        # Google Cloud Vision 사용
        if self.use_google_vision:
            return await self._extract_with_google_vision(image_path)
        else:
            # 대안: Tesseract 사용
            return await self._extract_with_tesseract(image_path)

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
