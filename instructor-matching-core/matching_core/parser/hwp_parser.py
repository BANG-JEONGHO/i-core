"""HWP 문서 파서."""

from __future__ import annotations

import io

import structlog

from matching_core.exceptions import EmptyDocumentError, ParseError
from matching_core.models.entities import FileType, ParsedDocument
from matching_core.parser.base import BaseParser
from matching_core.utils.text_processing import clean_text

logger = structlog.get_logger()


class HwpParser(BaseParser):
    """HWP 파일을 파싱합니다.

    OLE2 기반 한글 파일(.hwp)에서 텍스트를 추출합니다.
    """

    def parse(self, file_content: bytes) -> ParsedDocument:
        """HWP에서 텍스트를 추출합니다."""
        raw_text = ""

        # 방법 1: olefile 기반 직접 추출 시도
        try:
            raw_text = self._parse_with_olefile(file_content)
        except Exception as e:
            logger.warning("hwp_olefile_failed", error=str(e))
            # 방법 2: 기본 바이너리에서 텍스트 추출 시도
            try:
                raw_text = self._parse_fallback(file_content)
            except Exception as e2:
                logger.error("hwp_parse_failed", error=str(e2))
                raise ParseError(
                    user_message="HWP 파일을 파싱할 수 없습니다. 파일이 손상되었거나 지원하지 않는 버전입니다.",
                    internal_detail=f"HWP parse failed: primary={e}, fallback={e2}",
                )

        raw_text = clean_text(raw_text)
        if not raw_text.strip():
            raise EmptyDocumentError()

        logger.info("hwp_parsed", text_length=len(raw_text))

        return ParsedDocument(
            raw_text=raw_text,
            file_type=FileType.HWP,
            sections=[],
        )

    def _parse_with_olefile(self, file_content: bytes) -> str:
        """olefile을 사용하여 HWP 텍스트를 추출합니다."""
        import olefile

        ole = olefile.OleFileIO(io.BytesIO(file_content))

        # HWP의 본문 텍스트는 BodyText 스트림에 있음
        text_parts: list[str] = []
        for stream_name in ole.listdir():
            joined = "/".join(stream_name)
            if "BodyText" in joined or "Section" in joined:
                stream_data = ole.openstream(stream_name).read()
                # HWP 바이너리에서 텍스트 추출 (UTF-16LE 인코딩)
                decoded = self._decode_hwp_stream(stream_data)
                if decoded:
                    text_parts.append(decoded)

        ole.close()
        return "\n".join(text_parts)

    def _decode_hwp_stream(self, data: bytes) -> str:
        """HWP 스트림 데이터에서 텍스트를 디코딩합니다."""
        import zlib

        try:
            # HWP 본문은 zlib 압축되어 있을 수 있음
            decompressed = zlib.decompress(data, -15)
        except zlib.error:
            decompressed = data

        # UTF-16LE로 텍스트 추출 시도
        text_chars: list[str] = []
        i = 0
        while i < len(decompressed) - 1:
            char_code = decompressed[i] | (decompressed[i + 1] << 8)
            if 0x20 <= char_code < 0xFFFF and char_code not in (0xFFFE, 0xFFFF):
                try:
                    char = chr(char_code)
                    if char.isprintable() or char in ("\n", "\r", "\t", " "):
                        text_chars.append(char)
                except (ValueError, OverflowError):
                    pass
            i += 2

        return "".join(text_chars)

    def _parse_fallback(self, file_content: bytes) -> str:
        """폴백: 바이너리에서 한국어 텍스트를 추출합니다."""
        # 간단한 방법: UTF-16LE로 디코딩 가능한 부분만 추출
        try:
            text = file_content.decode("utf-16-le", errors="ignore")
        except Exception:
            text = file_content.decode("cp949", errors="ignore")

        # 인쇄 가능한 문자만 유지
        cleaned = "".join(c for c in text if c.isprintable() or c in "\n\r\t ")
        return cleaned
