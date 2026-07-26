"""파서 기본 인터페이스."""

from __future__ import annotations

from abc import ABC, abstractmethod

from matching_core.models.entities import ParsedDocument


class BaseParser(ABC):
    """문서 파서 인터페이스."""

    @abstractmethod
    def parse(self, file_content: bytes) -> ParsedDocument:
        """파일 내용을 파싱하여 ParsedDocument를 반환합니다.

        Args:
            file_content: 파일 바이너리 내용

        Returns:
            ParsedDocument: 파싱된 문서

        Raises:
            ParseError: 파싱 실패 시
            EmptyDocumentError: 빈 문서일 시
        """
        ...
