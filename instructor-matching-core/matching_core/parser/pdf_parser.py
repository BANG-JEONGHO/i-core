"""PDF 문서 파서."""

from __future__ import annotations

import io

import structlog

from matching_core.exceptions import EmptyDocumentError, ParseError
from matching_core.models.entities import FileType, ParsedDocument
from matching_core.parser.base import BaseParser
from matching_core.utils.text_processing import clean_text

logger = structlog.get_logger()


class PdfParser(BaseParser):
    """PDF 파일을 파싱합니다."""

    def parse(self, file_content: bytes) -> ParsedDocument:
        """PDF에서 텍스트를 추출합니다."""
        try:
            import pdfplumber
        except ImportError as e:
            raise ParseError(
                user_message="PDF 파싱 라이브러리가 설치되지 않았습니다.",
                internal_detail=f"pdfplumber import failed: {e}",
            )

        try:
            pages_text: list[str] = []
            with pdfplumber.open(io.BytesIO(file_content)) as pdf:
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        pages_text.append(text)

            raw_text = "\n\n".join(pages_text)
            raw_text = clean_text(raw_text)

            if not raw_text.strip():
                raise EmptyDocumentError()

            logger.info("pdf_parsed", pages=len(pages_text), text_length=len(raw_text))

            return ParsedDocument(
                raw_text=raw_text,
                file_type=FileType.PDF,
                sections=[],
            )

        except EmptyDocumentError:
            raise
        except Exception as e:
            logger.error("pdf_parse_failed", error=str(e))
            raise ParseError(
                user_message="PDF 파일을 파싱할 수 없습니다. 파일이 손상되었거나 이미지 전용 PDF일 수 있습니다.",
                internal_detail=f"PDF parse error: {e}",
            )
