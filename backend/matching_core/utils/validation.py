"""파일 검증 유틸리티."""

from __future__ import annotations

from pathlib import Path

import structlog

from matching_core.config import PARSER_CONFIG
from matching_core.exceptions import (
    FileSizeExceededError,
    UnsupportedFileTypeError,
)
from matching_core.models.entities import FileType

logger = structlog.get_logger()

# Magic bytes for file type validation
MAGIC_BYTES = {
    FileType.PDF: b"%PDF",
    FileType.DOCX: b"PK\x03\x04",  # ZIP-based format
    FileType.HWP: b"\xd0\xcf\x11\xe0",  # OLE2 Compound Document
}


def validate_file(file_path: str | Path, file_content: bytes | None = None) -> FileType:
    """파일을 검증하고 파일 타입을 반환합니다.

    Args:
        file_path: 파일 경로 또는 파일명
        file_content: 파일 바이너리 내용 (제공되지 않으면 경로에서 읽음)

    Returns:
        FileType: 감지된 파일 형식

    Raises:
        UnsupportedFileTypeError: 지원하지 않는 형식
        FileSizeExceededError: 파일 크기 초과
    """
    path = Path(file_path)
    extension = path.suffix.lower()

    # 1. 확장자 검증
    if extension not in PARSER_CONFIG["supported_extensions"]:
        logger.warning("unsupported_file_extension", extension=extension)
        raise UnsupportedFileTypeError(extension)

    # 2. 파일 크기 검증
    if file_content is not None:
        file_size = len(file_content)
    elif path.exists():
        file_size = path.stat().st_size
    else:
        file_size = 0

    max_size = PARSER_CONFIG["max_file_size_bytes"]
    if file_size > max_size:
        size_mb = file_size / (1024 * 1024)
        max_mb = PARSER_CONFIG["max_file_size_mb"]
        logger.warning("file_size_exceeded", size_mb=size_mb, max_mb=max_mb)
        raise FileSizeExceededError(size_mb, max_mb)

    # 3. 확장자 → FileType 매핑
    extension_map = {
        ".pdf": FileType.PDF,
        ".hwp": FileType.HWP,
        ".docx": FileType.DOCX,
    }
    file_type = extension_map[extension]

    # 4. Magic bytes 검증 (파일 내용이 있는 경우)
    if file_content is not None and len(file_content) >= 4:
        expected_magic = MAGIC_BYTES.get(file_type)
        if expected_magic and not file_content[:len(expected_magic)].startswith(expected_magic):
            logger.warning(
                "magic_bytes_mismatch",
                expected=file_type.value,
                file_name=path.name,
            )
            # Magic bytes 불일치 시에도 확장자 기반으로 진행 (경고만)

    logger.info("file_validated", file_type=file_type.value, size_bytes=file_size)
    return file_type
