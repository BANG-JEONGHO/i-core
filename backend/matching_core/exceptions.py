"""커스텀 예외 클래스."""


class MatchingCoreError(Exception):
    """매칭 코어 기본 예외."""

    def __init__(self, user_message: str, internal_detail: str = ""):
        self.user_message = user_message
        self.internal_detail = internal_detail
        super().__init__(user_message)


class UnsupportedFileTypeError(MatchingCoreError):
    """지원하지 않는 파일 형식."""

    def __init__(self, extension: str):
        super().__init__(
            user_message=f"지원하지 않는 파일 형식입니다: {extension}",
            internal_detail=f"Unsupported extension: {extension}",
        )


class ParseError(MatchingCoreError):
    """문서 파싱 실패."""

    def __init__(self, user_message: str, internal_detail: str = ""):
        super().__init__(
            user_message=user_message,
            internal_detail=internal_detail,
        )


class EmptyDocumentError(MatchingCoreError):
    """빈 문서."""

    def __init__(self) -> None:
        super().__init__(
            user_message="빈 문서입니다. 내용이 있는 파일을 업로드해 주세요.",
            internal_detail="Empty document detected",
        )


class FileSizeExceededError(MatchingCoreError):
    """파일 크기 초과."""

    def __init__(self, size_mb: float, max_mb: float):
        super().__init__(
            user_message=f"파일 크기가 {max_mb}MB를 초과합니다 (현재: {size_mb:.1f}MB).",
            internal_detail=f"File size {size_mb}MB exceeds limit {max_mb}MB",
        )


class InvalidRequirementsError(MatchingCoreError):
    """유효하지 않은 요구사항."""

    def __init__(self) -> None:
        super().__init__(
            user_message="추출된 요구사항이 없습니다. 파싱 결과를 확인해 주세요.",
            internal_detail="TaskRequirements has no qualifications or criteria",
        )
