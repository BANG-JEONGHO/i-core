"""매칭 코어 설정값."""

# 점수 가중치 (합계 100)
SCORING_WEIGHTS = {
    "keyword": 40.0,
    "qualification": 30.0,
    "experience": 30.0,
}

# 파서 설정
PARSER_CONFIG = {
    "max_file_size_bytes": 50 * 1024 * 1024,  # 50MB
    "max_file_size_mb": 50,
    "supported_extensions": [".pdf", ".hwp", ".docx"],
}

# 섹션 식별 패턴 (정규표현식)
SECTION_PATTERNS = {
    "qualification": [
        r"참여\s*자격",
        r"신청\s*자격",
        r"입찰\s*참가\s*자격",
        r"참가\s*자격",
        r"응찰\s*자격",
    ],
    "evaluation": [
        r"평가\s*기준",
        r"기술\s*평가",
        r"배\s*점",
        r"심사\s*기준",
        r"적격\s*심사",
    ],
}

# 필수/우대 구분 키워드
MANDATORY_KEYWORDS = ["필수", "반드시", "갖추어야", "해야 한다", "충족", "요한다"]
PREFERRED_KEYWORDS = ["우대", "가점", "가산", "바람직", "선호"]

# 학력 순서 (상위 호환)
EDUCATION_HIERARCHY = ["고졸", "전문학사", "학사", "석사", "박사"]

# 동의어 사전 파일 경로
SYNONYMS_FILE = "matching_core/data/synonyms.json"
STOPWORDS_FILE = "matching_core/data/stopwords.json"
