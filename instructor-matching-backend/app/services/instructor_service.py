"""강사 관리 서비스."""

from __future__ import annotations

import io
from collections import Counter

import pandas as pd
import structlog
from fastapi import HTTPException, UploadFile, status
from sqlalchemy import String, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Instructor
from app.schemas.instructor import (
    BulkUploadResponse,
    InstructorCreate,
    InstructorResponse,
    InstructorStats,
    InstructorUpdate,
)

logger = structlog.get_logger()


async def upload_bulk(db: AsyncSession, file: UploadFile) -> BulkUploadResponse:
    """Excel/CSV 파일에서 강사 데이터를 일괄 업로드합니다. 3시트 통합 지원."""
    content = await file.read()
    file_name = file.filename or ""

    try:
        if file_name.endswith(".csv"):
            df_basic = pd.read_csv(io.BytesIO(content))
            df_history = None
            df_qual = None
        else:
            xls = pd.ExcelFile(io.BytesIO(content))
            sheet_names = xls.sheet_names
            # 시트 이름으로 매핑 (번호 또는 이름)
            df_basic = pd.read_excel(xls, sheet_name=0, header=None) if len(sheet_names) >= 1 else None
            df_history = pd.read_excel(xls, sheet_name=1, header=None) if len(sheet_names) >= 2 else None
            df_qual = pd.read_excel(xls, sheet_name=2, header=None) if len(sheet_names) >= 3 else None

            # 자동 헤더 감지: "성명" 또는 "강사명" 포함 행을 찾아 헤더로 설정
            if df_basic is not None:
                df_basic = _auto_detect_header(df_basic)
            if df_history is not None:
                df_history = _auto_detect_header(df_history)
            if df_qual is not None:
                df_qual = _auto_detect_header(df_qual)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"파일을 읽을 수 없습니다: {e}",
        )

    if df_basic is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="기본정보 시트를 찾을 수 없습니다.")

    # 강의이력과 자격경력을 이름 기준으로 그룹화
    history_map: dict[str, list[dict]] = {}
    if df_history is not None:
        for _, row in df_history.iterrows():
            name = str(row.get("강사명", row.get("성명", ""))).strip()
            if not name or name == "nan":
                continue
            if name not in history_map:
                history_map[name] = []
            history_map[name].append({
                "type": str(row.get("구분", "")).strip(),
                "start": str(row.get("시작월", "")).strip(),
                "end": str(row.get("종료월", "")).strip(),
                "client": str(row.get("고객사명", "")).strip(),
                "course": str(row.get("과정/프로젝트명", row.get("과정명", ""))).strip(),
                "hours": str(row.get("시간", "")).strip(),
                "role": str(row.get("역할", "")).strip(),
                "keywords": str(row.get("키워드", "")).strip(),
            })

    qual_map: dict[str, list[dict]] = {}
    if df_qual is not None:
        for _, row in df_qual.iterrows():
            name = str(row.get("강사명", row.get("성명", ""))).strip()
            if not name or name == "nan":
                continue
            if name not in qual_map:
                qual_map[name] = []
            qual_map[name].append({
                "type": str(row.get("구분", "")).strip(),
                "start": str(row.get("시작월", "")).strip(),
                "end": str(row.get("종료월", "")).strip(),
                "detail": str(row.get("상세내용", "")).strip(),
                "issuer": str(row.get("발급기관/회사", row.get("발급기관", ""))).strip(),
            })

    # 기존 강사 이름 목록 로드 (중복 체크용)
    existing_result = await db.execute(select(Instructor.name))
    existing_names = set(row[0] for row in existing_result.fetchall())

    success = 0
    errors: list[str] = []
    skipped_duplicates = 0

    for idx, row in df_basic.iterrows():
        try:
            # 이름 컬럼 감지
            name = ""
            for col in ["성명", "이름", "name", "강사명"]:
                if col in row.index and pd.notna(row.get(col)):
                    name = str(row.get(col)).strip()
                    if name and name != "nan":
                        break

            if not name or name == "nan":
                continue

            # 중복 체크
            if name in existing_names:
                skipped_duplicates += 1
                errors.append(f"'{name}' 이미 등록된 강사입니다.")
                continue
            existing_names.add(name)

            # 기술스택 파싱
            skills_raw = str(row.get("기술스택", row.get("보유기술", ""))).strip()
            skills = _parse_skills(skills_raw)

            instructor = Instructor(
                name=name,
                contact=_safe_str(row.get("연락처", "")),
                email=_safe_str(row.get("이메일", "")),
                region=_safe_str(row.get("지역", "")),
                affiliation=_safe_str(row.get("소속", "")),
                degree=_safe_str(row.get("학위", "")),
                school=_safe_str(row.get("학교", "")),
                major=_safe_str(row.get("전공", "")),
                main_lecture_area=_safe_str(row.get("주요강의분야", "")),
                summary=_safe_str(row.get("요약", "")),
                birth_date=_safe_str(row.get("생년월일", "")),
                education=(_safe_str(row.get("학위", "")) or "") + " " + (_safe_str(row.get("학교", "")) or ""),
                specializations=skills[:5],
                keywords=skills,
                experience_years=_parse_int(row.get("강의건수", 0)) or len(history_map.get(name, [])),
                notes=_safe_str(row.get("직함", "")),
                lecture_history=history_map.get(name, []),
                qualifications_career=qual_map.get(name, []),
            )
            db.add(instructor)
            success += 1
        except Exception as e:
            errors.append(f"행 {idx + 2}: {e}")

    await db.flush()
    logger.info("bulk_upload_completed", total=len(df_basic), success=success, skipped=skipped_duplicates)
    return BulkUploadResponse(total=len(df_basic), success=success, errors=errors[:50])


async def list_instructors(
    db: AsyncSession,
    keyword: str | None = None,
    offset: int = 0,
    limit: int = 20,
) -> tuple[list[InstructorResponse], int]:
    """강사 목록을 조회합니다."""
    query = select(Instructor)

    if keyword:
        keyword_filter = f"%{keyword}%"
        query = query.where(
            Instructor.name.ilike(keyword_filter)
            | Instructor.education.ilike(keyword_filter)
            | Instructor.main_lecture_area.ilike(keyword_filter)
            | Instructor.summary.ilike(keyword_filter)
            | Instructor.affiliation.ilike(keyword_filter)
            # keywords는 JSON이지만 SQLite에서 TEXT로 저장되므로 LIKE 검색 가능
            | Instructor.keywords.cast(String).ilike(keyword_filter)
            | Instructor.specializations.cast(String).ilike(keyword_filter)
        )

    # 총 개수
    from sqlalchemy import func
    count_query = select(func.count()).select_from(query.subquery())
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    # 페이지네이션
    query = query.order_by(Instructor.name).offset(offset).limit(limit)
    result = await db.execute(query)
    instructors = result.scalars().all()

    return [InstructorResponse.model_validate(i) for i in instructors], total


async def get_instructor(db: AsyncSession, instructor_id: str) -> InstructorResponse:
    """강사 상세 정보를 조회합니다."""
    instructor = await db.get(Instructor, instructor_id)
    if not instructor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="강사를 찾을 수 없습니다.")
    return InstructorResponse.model_validate(instructor)


async def update_instructor(
    db: AsyncSession, instructor_id: str, data: InstructorUpdate
) -> InstructorResponse:
    """강사 정보를 수정합니다."""
    instructor = await db.get(Instructor, instructor_id)
    if not instructor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="강사를 찾을 수 없습니다.")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(instructor, field, value)

    # 키워드 재생성
    instructor.keywords = _generate_keywords(instructor)
    await db.flush()
    return InstructorResponse.model_validate(instructor)


async def delete_instructor(db: AsyncSession, instructor_id: str) -> None:
    """강사를 삭제합니다."""
    instructor = await db.get(Instructor, instructor_id)
    if not instructor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="강사를 찾을 수 없습니다.")
    await db.delete(instructor)


async def delete_all_instructors(db: AsyncSession) -> int:
    """모든 강사를 삭제합니다."""
    from sqlalchemy import delete as sql_delete
    result = await db.execute(sql_delete(Instructor))
    count = result.rowcount
    logger.info("all_instructors_deleted", count=count)
    return count


async def get_statistics(db: AsyncSession) -> InstructorStats:
    """강사 통계를 반환합니다."""
    result = await db.execute(select(Instructor))
    instructors = result.scalars().all()

    total = len(instructors)
    if total == 0:
        return InstructorStats(
            total_count=0, specialization_distribution={}, average_experience=0.0
        )

    # 전문분야 분포
    spec_counter: Counter[str] = Counter()
    total_exp = 0
    for i in instructors:
        for spec in (i.specializations or []):
            spec_counter[spec] += 1
        total_exp += i.experience_years

    return InstructorStats(
        total_count=total,
        specialization_distribution=dict(spec_counter.most_common(20)),
        average_experience=round(total_exp / total, 1),
    )


def _detect_columns(columns: list[str]) -> dict[str, str]:
    """DataFrame 컬럼을 내부 필드명에 매핑합니다."""
    col_map: dict[str, str] = {}
    for col in columns:
        col_lower = col.lower().strip()
        if col_lower in ("이름", "name", "강사명"):
            col_map["name"] = col
        elif col_lower in ("전문분야", "specialization", "전문"):
            col_map["specializations"] = col
        elif col_lower in ("과목", "subject", "교육과목"):
            col_map["subjects"] = col
        elif col_lower in ("경력", "experience", "경력연수", "강의건수"):
            col_map["experience_years"] = col
        elif col_lower in ("자격증", "certification", "자격"):
            col_map["certifications"] = col
        elif col_lower in ("학력", "education"):
            col_map["education"] = col
        elif col_lower in ("연락처", "contact", "전화"):
            col_map["contact"] = col
        elif col_lower in ("보유기술", "기술", "skills", "보유 기술"):
            col_map["skills"] = col
        elif col_lower in ("직함", "title", "직급"):
            col_map["title"] = col
        elif col_lower in ("소속", "department", "부서"):
            col_map["department"] = col
    return col_map


def _auto_detect_header(df: pd.DataFrame) -> pd.DataFrame:
    """DataFrame에서 실제 헤더 행을 자동 감지합니다."""
    header_keywords = ["성명", "강사명", "이름", "name"]
    for idx, row in df.iterrows():
        row_values = [str(v).strip().lower() for v in row.values if pd.notna(v)]
        for kw in header_keywords:
            if kw.lower() in row_values or any(kw in v for v in row_values):
                # 이 행을 헤더로 설정
                new_df = df.iloc[idx + 1:].copy()
                new_df.columns = [str(v).strip() if pd.notna(v) else f"col_{i}" for i, v in enumerate(df.iloc[idx])]
                new_df = new_df.reset_index(drop=True)
                # Unnamed/빈 컬럼 제거
                new_df = new_df.loc[:, ~new_df.columns.str.contains('^Unnamed|^col_')]
                new_df = new_df.dropna(how='all')
                return new_df
    # 헤더를 찾지 못하면 첫 행을 헤더로 사용
    df.columns = [str(v).strip() if pd.notna(v) else f"col_{i}" for i, v in enumerate(df.iloc[0])]
    df = df.iloc[1:].reset_index(drop=True)
    df = df.loc[:, ~df.columns.str.contains('^Unnamed|^col_')]
    df = df.dropna(how='all')
    return df


def _parse_list(value) -> list[str]:
    """쉼표 구분 문자열을 리스트로 변환합니다."""
    if pd.isna(value) or str(value).strip() in ("", "nan"):
        return []
    return [v.strip() for v in str(value).split(",") if v.strip()]


def _parse_skills(value) -> list[str]:
    """슬래시(/) 또는 쉼표 구분 문자열을 리스트로 변환합니다."""
    if pd.isna(value) or str(value).strip() in ("", "nan"):
        return []
    # 슬래시와 쉼표 모두 지원
    text = str(value)
    if "/" in text:
        return [v.strip() for v in text.split("/") if v.strip()]
    return [v.strip() for v in text.split(",") if v.strip()]


def _safe_str(value) -> str | None:
    """안전하게 문자열 변환. NaN이면 None 반환."""
    if pd.isna(value) or str(value).strip() in ("", "nan", "-"):
        return None
    return str(value).strip()


def _parse_int(value) -> int:
    """안전하게 정수로 변환합니다."""
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return 0


def _generate_keywords(instructor: Instructor) -> list[str]:
    """강사 정보에서 키워드를 자동 생성합니다."""
    keywords: set[str] = set()
    for spec in (instructor.specializations or []):
        keywords.add(spec.lower())
    for subj in (instructor.subjects or []):
        keywords.add(subj.lower())
    for cert in (instructor.certifications or []):
        keywords.add(cert.lower())
    return list(keywords)
