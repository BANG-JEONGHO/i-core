"""문서 파서 패키지."""

from __future__ import annotations

from matching_core.exceptions import ParseError
from matching_core.models.entities import FileType, ParsedDocument, TaskRequirements
from matching_core.parser.base import BaseParser
from matching_core.parser.docx_parser import DocxParser
from matching_core.parser.extractor import extract_task_requirements
from matching_core.parser.hwp_parser import HwpParser
from matching_core.parser.pdf_parser import PdfParser
from matching_core.utils.validation import validate_file

_PARSERS: dict[FileType, type[BaseParser]] = {
    FileType.PDF: PdfParser,
    FileType.HWP: HwpParser,
    FileType.DOCX: DocxParser,
}


def parse_document(file_content: bytes, file_name: str) -> ParsedDocument:
    """파일을 파싱하여 ParsedDocument를 반환합니다.

    Args:
        file_content: 파일 바이너리 내용
        file_name: 파일명 (형식 감지용)

    Returns:
        ParsedDocument: 파싱된 문서 (섹션 식별 포함)

    Raises:
        UnsupportedFileTypeError: 지원하지 않는 형식
        FileSizeExceededError: 파일 크기 초과
        ParseError: 파싱 실패
        EmptyDocumentError: 빈 문서
    """
    # 1. 파일 검증 및 타입 감지
    file_type = validate_file(file_name, file_content)

    # 2. 파서 선택 및 파싱
    parser_class = _PARSERS.get(file_type)
    if not parser_class:
        raise ParseError(
            user_message=f"파서를 찾을 수 없습니다: {file_type.value}",
            internal_detail=f"No parser registered for {file_type}",
        )

    parser = parser_class()
    document = parser.parse(file_content)

    return document


def parse_and_extract(file_content: bytes, file_name: str) -> TaskRequirements:
    """파일을 파싱하고 요구사항을 추출합니다.

    이 함수는 parse_document + extract_task_requirements를 한번에 수행합니다.

    Args:
        file_content: 파일 바이너리 내용
        file_name: 파일명

    Returns:
        TaskRequirements: 추출된 요구사항
    """
    document = parse_document(file_content, file_name)
    requirements = extract_task_requirements(document)
    return requirements


__all__ = [
    "parse_document",
    "parse_and_extract",
    "extract_task_requirements",
    "BaseParser",
]
