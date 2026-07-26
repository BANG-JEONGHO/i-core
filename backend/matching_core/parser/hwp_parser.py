"""Text extraction for HWP 5.x (OLE Compound Document) files.

This parser deliberately extracts document text only.  It does not render the
document or require Hancom Office, so it is suitable for Linux containers and
serverless runtimes.
"""

from __future__ import annotations

import io
import zlib

import structlog

from matching_core.exceptions import EmptyDocumentError, ParseError
from matching_core.models.entities import FileType, ParsedDocument
from matching_core.parser.base import BaseParser
from matching_core.utils.text_processing import clean_text

logger = structlog.get_logger()


# HWP 5.0 record tag for paragraph text.  Text is stored as UTF-16LE in the
# record payload; formatting records are intentionally ignored.
HWPTAG_PARA_TEXT = 67
_COMPRESSED_FLAG = 0x01


class HwpParser(BaseParser):
    """Extract plain text from a non-encrypted HWP 5.x document."""

    def parse(self, file_content: bytes) -> ParsedDocument:
        try:
            raw_text = self._parse_with_olefile(file_content)
        except Exception as exc:
            logger.warning("hwp_ole_parse_failed", error=str(exc))
            raise ParseError(
                user_message="HWP 본문을 읽지 못했습니다. 암호화·배포용 문서인지 확인해 주세요.",
                internal_detail=f"HWP OLE parsing failed: {exc}",
            ) from exc

        raw_text = clean_text(raw_text)
        if not raw_text.strip():
            raise EmptyDocumentError()

        logger.info("hwp_parsed", text_length=len(raw_text))
        return ParsedDocument(raw_text=raw_text, file_type=FileType.HWP, sections=[])

    def _parse_with_olefile(self, file_content: bytes) -> str:
        """Read ``BodyText/Section*`` streams and extract paragraph records."""
        import olefile

        with olefile.OleFileIO(io.BytesIO(file_content)) as ole:
            if not ole.exists("FileHeader"):
                raise ValueError("not an HWP 5.x OLE document")

            header = ole.openstream("FileHeader").read()
            if len(header) < 40:
                raise ValueError("invalid HWP file header")
            flags = int.from_bytes(header[36:40], "little")
            compressed = bool(flags & _COMPRESSED_FLAG)

            section_paths = sorted(
                (path for path in ole.listdir() if len(path) == 2 and path[0] == "BodyText" and path[1].startswith("Section")),
                key=lambda path: self._section_number(path[1]),
            )
            if not section_paths:
                raise ValueError("BodyText sections are missing")

            text_parts = []
            for section_path in section_paths:
                stream = ole.openstream(section_path).read()
                if compressed:
                    stream = self._decompress_raw_deflate(stream, "/".join(section_path))
                text_parts.append(self._extract_paragraph_text(stream))

            return "\n".join(part for part in text_parts if part)

    @staticmethod
    def _section_number(name: str) -> int:
        try:
            return int(name.removeprefix("Section"))
        except ValueError:
            return 0

    @staticmethod
    def _decompress_raw_deflate(data: bytes, stream_name: str) -> bytes:
        try:
            return zlib.decompress(data, -15)
        except zlib.error as exc:
            raise ValueError(f"cannot decompress {stream_name}") from exc

    @staticmethod
    def _extract_paragraph_text(data: bytes) -> str:
        """Walk HWP records and decode only paragraph-text payloads.

        A record header is a little-endian 32-bit word: tag (10 bits), level
        (10 bits), and payload size (12 bits).  A size of 0xFFF is followed by
        an extended 32-bit payload size.
        """
        offset = 0
        paragraphs: list[str] = []

        while offset + 4 <= len(data):
            header = int.from_bytes(data[offset : offset + 4], "little")
            tag = header & 0x3FF
            payload_size = header >> 20
            offset += 4

            if payload_size == 0xFFF:
                if offset + 4 > len(data):
                    break
                payload_size = int.from_bytes(data[offset : offset + 4], "little")
                offset += 4

            if payload_size < 0 or offset + payload_size > len(data):
                # A malformed record must not cause binary data to be treated
                # as text.  Stop this section and preserve already read text.
                break

            payload = data[offset : offset + payload_size]
            offset += payload_size

            if tag == HWPTAG_PARA_TEXT:
                text = payload.decode("utf-16-le", errors="ignore")
                normalized = "".join(
                    "\n" if character in "\r\n" else character
                    for character in text
                    if character.isprintable() or character in "\r\n\t"
                ).strip()
                if normalized:
                    paragraphs.append(normalized)

        return "\n".join(paragraphs)
