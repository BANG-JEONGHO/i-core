"""AI Agent - Gemini 기반 과업지시서 분석 및 매칭 추천.

파싱 전략:
- DOCX: python-docx로 텍스트 추출 → Gemini에 텍스트 전달
- HWP: pyhwpx(COM)로 텍스트 추출 → 실패시 olefile/zlib → Gemini에 전달
- PDF: Gemini File API에 직접 PDF 업로드 → AI가 파싱
"""

from __future__ import annotations

import json
import tempfile
import os
import structlog
from google import genai
from google.genai import types

from app.core.config import settings

logger = structlog.get_logger()

_client: genai.Client | None = None
MODEL = settings.GEMINI_MODEL


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(
            api_key=settings.GEMINI_API_KEY,
            http_options=types.HttpOptions(
                client_args={"trust_env": settings.GEMINI_USE_ENV_PROXY}
            ),
        )
    return _client


EXTRACTION_PROMPT = """당신은 나라장터 과업지시서/제안요청서를 분석하는 최고 전문가입니다.
아래 문서에서 **'신청자격(참여자격/참가자격)'** 과 **'평가기준(심사기준/배점표)'** 을 정확히 추출해주세요.

## 추출 규칙:
1. **신청자격**: 사업에 참여하기 위한 자격 요건을 모두 추출
   - 법인/업체 요건 (등록증, 인증, 매출 기준 등)
   - 인력 요건 (투입 인력의 자격증, 학력, 경력)
   - 기술/장비 요건
   - 실적 요건 (유사용역 수행실적)
   - 각 항목이 필수인지 우대인지 구분
   - keywords: 해당 항목에서 강사 이력서와 매칭할 때 핵심이 되는 기술명/자격증명/분야명

2. **평가기준**: 제안서/입찰 평가 항목을 모두 추출
   - 기술평가, 가격평가, 실적평가 등 대분류
   - 세부 항목별 배점(weight)
   - keywords: 높은 점수를 받기 위해 강사가 갖춰야 할 역량/경험

3. 문서에 표(table) 형태로 되어 있을 수 있음. 표의 내용도 빠짐없이 추출
4. "해당 사항 없음"이면 빈 배열 반환

## 출력 형식 (반드시 이 JSON 구조만 출력, 다른 텍스트 금지):
{
  "qualifications": [
    {"category": "인력요건", "description": "프로젝트 관리자 PMP 자격증 보유", "is_mandatory": true, "keywords": ["PMP", "프로젝트관리"]},
    {"category": "실적요건", "description": "최근 3년간 유사 교육 용역 수행 실적 2건 이상", "is_mandatory": true, "keywords": ["교육용역", "수행실적"]}
  ],
  "evaluation_criteria": [
    {"category": "기술평가", "description": "수행 인력의 전문성 및 자격", "weight": 30, "keywords": ["전문성", "자격증", "경력"]},
    {"category": "기술평가", "description": "유사 사업 수행 실적", "weight": 20, "keywords": ["유사사업", "실적"]}
  ]
}

JSON만 출력하세요:"""


def _extract_text_from_hwp(file_content: bytes, file_name: str) -> str | None:
    """HWP 파일에서 텍스트를 추출합니다. 여러 방법을 순차 시도."""
    # 방법 1: pyhwpx (COM 기반 - Windows에서만 동작)
    text = _extract_hwp_pyhwpx(file_content, file_name)
    if text:
        return text

    # 방법 2: olefile + zlib 디코딩 (서버리스 호환)
    text = _extract_hwp_olefile(file_content)
    if text:
        return text

    return None


def _extract_hwp_pyhwpx(file_content: bytes, file_name: str) -> str | None:
    """pyhwpx를 사용하여 HWP 텍스트를 추출합니다."""
    try:
        import pyhwpx
        # 임시 파일로 저장 후 열기
        with tempfile.NamedTemporaryFile(suffix='.hwp', delete=False) as tmp:
            tmp.write(file_content)
            tmp_path = tmp.name

        try:
            hwp = pyhwpx.Hwp(visible=False)
            hwp.open(tmp_path)
            # 전체 텍스트 추출
            text = hwp.get_text()
            hwp.quit()

            if text and _is_usable_extracted_text(text):
                logger.info("hwp_pyhwpx_extraction_success", text_length=len(text))
                return text
            logger.warning("hwp_pyhwpx_low_quality", text_length=len(text) if text else 0)
        except Exception as e:
            logger.warning("hwp_pyhwpx_failed", error=str(e))
            try:
                hwp.quit()
            except:
                pass
        finally:
            os.unlink(tmp_path)
    except ImportError:
        logger.info("pyhwpx_not_available")
    except Exception as e:
        logger.warning("hwp_pyhwpx_init_failed", error=str(e))
    return None


def _extract_hwp_olefile(file_content: bytes) -> str | None:
    """olefile + zlib로 HWP 본문 텍스트를 추출합니다."""
    try:
        import olefile
        import zlib
        import struct

        if not olefile.isOleFile(file_content):
            return None

        ole = olefile.OleFileIO(file_content)
        all_text = []

        # HWP의 BodyText 섹션들을 순회
        section_idx = 0
        while ole.exists(f"BodyText/Section{section_idx}"):
            data = ole.openstream(f"BodyText/Section{section_idx}").read()

            # HWP는 BodyText를 zlib 압축할 수 있음
            try:
                decompressed = zlib.decompress(data, -15)
            except:
                decompressed = data

            # 바이너리에서 텍스트 레코드 추출
            text_parts = _parse_hwp_body_text(decompressed)
            all_text.extend(text_parts)
            section_idx += 1

        text = "\n".join(all_text)
        if text and _is_usable_extracted_text(text):
            logger.info("hwp_olefile_extraction_success", text_length=len(text))
            return text
        logger.warning("hwp_olefile_low_quality", text_length=len(text) if text else 0)
    except Exception as exc:
        logger.warning("hwp_olefile_extraction_failed", error=str(exc))
    return None


def _parse_hwp_body_text(data: bytes) -> list[str]:
    """HWP body text 바이너리에서 텍스트 레코드를 파싱합니다."""
    texts = []
    pos = 0
    while pos < len(data) - 4:
        # HWP 레코드 헤더: 4바이트
        try:
            header = int.from_bytes(data[pos:pos+4], 'little')
            tag_id = header & 0x3FF
            level = (header >> 10) & 0x3FF
            size = (header >> 20) & 0xFFF

            if size == 0xFFF:
                # 확장 크기
                if pos + 8 > len(data):
                    break
                size = int.from_bytes(data[pos+4:pos+8], 'little')
                pos += 8
            else:
                pos += 4

            if pos + size > len(data):
                break

            # HWPTAG_PARA_TEXT = 67
            if tag_id == 67:
                # 텍스트 레코드 파싱
                text_data = data[pos:pos+size]
                text = _decode_hwp_text(text_data)
                if text.strip():
                    texts.append(text.strip())

            pos += size
        except:
            break

    return texts


def _decode_hwp_text(data: bytes) -> str:
    """HWP 텍스트 데이터를 디코딩합니다."""
    result = []
    i = 0
    while i < len(data) - 1:
        code = int.from_bytes(data[i:i+2], 'little')
        if code == 0:
            break
        elif code < 32:
            # 제어 문자 처리
            if code == 13 or code == 10:  # 줄바꿈
                result.append('\n')
            elif code == 9:  # 탭
                result.append('\t')
            # 기타 제어 문자는 건너뜀
            # HWP 제어 문자: 추가 바이트를 가질 수 있으므로 주의
            if code in (1, 2, 3, 11, 12, 14, 15, 16, 17, 18, 21, 22, 23):
                i += 2
                continue
        else:
            result.append(chr(code))
        i += 2
    return ''.join(result)


def _is_usable_extracted_text(text: str) -> bool:
    """바이너리 노이즈를 JSON 추출 모델에 전달하지 않도록 최소 품질을 검증합니다."""
    normalized = text.strip()
    if len(normalized) < 80:
        return False

    meaningful = sum(
        character.isalnum() or character in " \n\r\t.,:;()[]{}<>/-_+%"
        for character in normalized
    )
    return meaningful / len(normalized) >= 0.60


def _extract_text_from_docx(file_content: bytes) -> str | None:
    """python-docx로 DOCX 텍스트 추출 (표 포함)."""
    try:
        import io
        from docx import Document
        doc = Document(io.BytesIO(file_content))
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        for table in doc.tables:
            for row in table.rows:
                row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                if row_text:
                    paragraphs.append(row_text)
        text = "\n".join(paragraphs)
        if text and len(text.strip()) > 50:
            return text
    except Exception as e:
        logger.warning("docx_extraction_failed", error=str(e))
    return None


def _extract_text_from_pdf(file_content: bytes) -> str | None:
    """pdfplumber로 PDF 텍스트 추출 (표 포함)."""
    try:
        import io
        import pdfplumber

        all_text = []
        with pdfplumber.open(io.BytesIO(file_content)) as pdf:
            for page in pdf.pages:
                # 일반 텍스트
                text = page.extract_text()
                if text:
                    all_text.append(text)

                # 표 데이터도 추출
                tables = page.extract_tables()
                for table in tables:
                    for row in table:
                        if row:
                            row_text = " | ".join(str(cell).strip() for cell in row if cell)
                            if row_text.strip():
                                all_text.append(row_text)

        full_text = "\n".join(all_text)
        if full_text and len(full_text.strip()) > 100:
            logger.info("pdf_local_extraction_success", text_length=len(full_text))
            return full_text
        logger.warning("pdf_local_extraction_low_quality", text_length=len(full_text) if full_text else 0)
    except Exception as e:
        logger.warning("pdf_extraction_failed", error=str(e))
    return None


async def parse_document_with_ai(file_content: bytes, file_name: str) -> dict:
    """파일을 AI로 파싱하여 신청자격/평가기준을 추출합니다.

    Returns:
        dict: {"qualifications": [...], "evaluation_criteria": [...], "raw_text": str}
    """
    import asyncio

    ext = file_name.rsplit('.', 1)[-1].lower() if '.' in file_name else ''
    raw_text = ""
    use_file_api = False

    # 1. 텍스트 추출 시도
    if ext == 'docx':
        raw_text = _extract_text_from_docx(file_content) or ""
    elif ext == 'hwp':
        raw_text = _extract_text_from_hwp(file_content, file_name) or ""
        if not raw_text:
            # 로컬 추출 완전 실패 시 File API로 시도
            use_file_api = True
            logger.info("hwp_fallback_to_file_api", file_name=file_name)
    elif ext == 'pdf':
        # PDF: 먼저 로컬에서 텍스트 추출 시도 (pdfplumber)
        raw_text = _extract_text_from_pdf(file_content) or ""
        if not raw_text or len(raw_text.strip()) < 100:
            # 텍스트 추출 실패 시 Gemini File API 사용
            use_file_api = True
    else:
        try:
            raw_text = file_content.decode("utf-8", errors="ignore")
        except:
            pass

    # 2. Gemini로 구조화 추출
    try:
        client = _get_client()
        loop = asyncio.get_event_loop()

        if use_file_api:
            result = await loop.run_in_executor(None, lambda: _parse_with_file_api(client, file_content, file_name))
        elif raw_text and len(raw_text) > 50:
            result = await loop.run_in_executor(None, lambda: _parse_with_text(client, raw_text))
        else:
            result = await loop.run_in_executor(None, lambda: _parse_with_file_api(client, file_content, file_name))

        result["raw_text"] = raw_text or result.get("raw_text", "")
        return result

    except Exception as e:
        logger.error("ai_parsing_failed", error=str(e))
        return {"qualifications": [], "evaluation_criteria": [], "raw_text": raw_text}


def _parse_with_text(client: genai.Client, text: str) -> dict:
    """텍스트를 Gemini에 전달하여 파싱."""
    # 바이너리 노이즈 제거 (CJK 유니코드 범위 밖의 이상한 문자)
    cleaned = _clean_text_noise(text)
    prompt = EXTRACTION_PROMPT + "\n\n## 과업지시서 전체 텍스트:\n" + cleaned[:12000]

    response = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            max_output_tokens=4096,
            temperature=0.1,
        ),
    )
    return _parse_json_response(response.text)


def _clean_text_noise(text: str) -> str:
    """HWP 추출 텍스트에서 바이너리 노이즈를 제거합니다."""
    import re
    # CJK 이상한 문자 (한자 범위이지만 실제로는 노이즈)를 줄바꿈으로 대체
    # 정상: 한글, 영문, 숫자, 일반 문장부호, 공백
    cleaned_lines = []
    for line in text.split('\n'):
        # 라인의 절반 이상이 정상 문자이면 유지
        if not line.strip():
            cleaned_lines.append('')
            continue
        normal_chars = sum(1 for c in line if (
            '\uAC00' <= c <= '\uD7A3' or  # 한글
            '\u0020' <= c <= '\u007E' or  # ASCII
            c in '\t\n\r' or
            '\u3131' <= c <= '\u318E' or  # 한글 자모
            '\u2000' <= c <= '\u206F' or  # 일반 구두점
            '\uFF00' <= c <= '\uFFEF'     # 전각 문자
        ))
        if normal_chars / max(len(line), 1) > 0.5:
            cleaned_lines.append(line)
    return '\n'.join(cleaned_lines)


def _parse_with_file_api(client: genai.Client, file_content: bytes, file_name: str) -> dict:
    """Gemini File API로 파일을 직접 업로드하여 파싱."""
    ext = file_name.rsplit('.', 1)[-1].lower()
    mime_map = {
        'pdf': 'application/pdf',
        'hwp': 'application/x-hwp',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }
    mime_type = mime_map.get(ext, 'application/octet-stream')

    with tempfile.NamedTemporaryFile(suffix=f'.{ext}', delete=False) as tmp:
        tmp.write(file_content)
        tmp_path = tmp.name

    try:
        uploaded_file = client.files.upload(file=tmp_path, config=types.UploadFileConfig(mime_type=mime_type))
        logger.info("file_uploaded_to_gemini", name=uploaded_file.name)

        response = client.models.generate_content(
            model=MODEL,
            contents=[
                types.Content(parts=[
                    types.Part.from_uri(file_uri=uploaded_file.uri, mime_type=mime_type),
                    types.Part.from_text(text=EXTRACTION_PROMPT),
                ])
            ]
        )

        result = _parse_json_response(response.text)

        # 원문 텍스트도 추출
        try:
            text_response = client.models.generate_content(
                model=MODEL,
                contents=[
                    types.Content(parts=[
                        types.Part.from_uri(file_uri=uploaded_file.uri, mime_type=mime_type),
                        types.Part.from_text(text="이 문서의 전체 텍스트를 그대로 출력해주세요. 다른 설명 없이 문서 내용만:"),
                    ])
                ]
            )
            result["raw_text"] = text_response.text[:15000]
        except:
            pass

        return result
    finally:
        os.unlink(tmp_path)


def _parse_json_response(text: str) -> dict:
    """AI 응답에서 JSON을 추출. 불완전한 JSON도 최대한 파싱."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:])
        if "```" in text:
            text = text[:text.rfind("```")]
    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # JSON 부분만 추출 시도
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            try:
                return json.loads(text[start:end])
            except:
                # 불완전한 JSON: 마지막 완전한 배열까지 잘라서 시도
                fragment = text[start:end]
                # qualifications 배열이라도 추출
                try:
                    # 마지막 유효한 ] 위치 찾기
                    last_bracket = fragment.rfind("]")
                    if last_bracket > 0:
                        truncated = fragment[:last_bracket+1] + "}"
                        return json.loads(truncated)
                except:
                    pass
    return {"qualifications": [], "evaluation_criteria": []}


async def generate_match_reason(
    task_description: str,
    instructor_name: str,
    instructor_keywords: list[str],
    instructor_experience: int,
    score: float,
    keyword_score: float,
    qual_score: float,
    exp_score: float,
) -> str:
    """AI로 매칭 추천 이유를 생성합니다."""
    import asyncio

    prompt = f"""당신은 교육 강사 매칭 전문가입니다.
아래 정보를 바탕으로 이 강사가 해당 과업에 적합한 이유를 분석해주세요.

## 과업 요약:
{task_description[:500]}

## 강사 정보:
- 이름: {instructor_name}
- 보유기술: {', '.join(instructor_keywords[:15])}
- 강의건수: {instructor_experience}건

## 매칭 점수:
- 종합: {score}점/100
- 키워드 일치: {keyword_score}/40
- 자격 매칭: {qual_score}/30
- 경력 매칭: {exp_score}/30

## 작성 규칙:
- 한국어로 작성
- 아래 JSON 형식으로만 출력:

{{"strengths": ["강점 1문장", "강점 1문장"], "weaknesses": ["약점 1문장"], "summary": "종합 평가 1문장"}}

JSON만 출력하세요:"""

    try:
        client = _get_client()
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: client.models.generate_content(model=MODEL, contents=prompt)
        )
        text = response.text.strip()
        parsed = _parse_json_response(text)
        if parsed and ("strengths" in parsed or "weaknesses" in parsed):
            return json.dumps(parsed, ensure_ascii=False)
        return text
    except Exception as e:
        logger.error("ai_reason_failed", error=str(e))
        return json.dumps({"strengths": [], "weaknesses": [], "summary": "AI 분석을 수행할 수 없습니다."}, ensure_ascii=False)


async def ai_score_instructors(
    task_requirements: dict,
    instructors: list[dict],
) -> list[dict]:
    """AI로 강사별 매칭 점수를 차별화하여 부여합니다."""
    import asyncio

    task_summary_parts = []
    for q in task_requirements.get("qualifications", [])[:5]:
        task_summary_parts.append(f"자격: {q.get('description', '')}")
    for e in task_requirements.get("evaluation_criteria", [])[:5]:
        task_summary_parts.append(f"평가: {e.get('description', '')}")
    task_summary = "\n".join(task_summary_parts)

    instructor_summaries = []
    for i in instructors[:30]:
        keywords = ", ".join((i.get("keywords") or [])[:10])
        instructor_summaries.append(f"- ID:{i['id'][:8]} | {i['name']} | 기술:{keywords} | 강의:{i.get('experience_years',0)}건")

    instructors_text = "\n".join(instructor_summaries)

    prompt = f"""당신은 교육 강사 매칭 AI입니다.
아래 과업지시서의 요구사항과 강사 목록을 비교하여, 각 강사에게 0~100점 매칭 점수를 부여해주세요.

## 과업 요구사항:
{task_summary}

## 강사 목록:
{instructors_text}

## 점수 기준:
- 과업에서 요구하는 기술/분야와 강사의 보유기술이 얼마나 일치하는가
- 강의 경험(건수)이 풍부한가
- 관련 분야 전문성이 있는가
- 점수는 0~100 사이, 강사별로 반드시 다르게 (동점 최소화)

## 출력 형식 (JSON 배열만 출력):
[{{"id":"첫8자리","score":85}},{{"id":"첫8자리","score":72}}]

JSON만 출력:"""

    try:
        client = _get_client()
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: client.models.generate_content(model=MODEL, contents=prompt)
        )

        result = _parse_json_response(response.text)
        if isinstance(result, list):
            return result
        elif isinstance(result, dict) and "scores" in result:
            return result["scores"]
        return []
    except Exception as e:
        logger.error("ai_scoring_failed", error=str(e))
        return []
