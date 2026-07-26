"""Read instructor profiles from the external resume SQLite database."""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

import aiosqlite

from app.core.config import settings


@dataclass(slots=True)
class InstructorProfile:
    id: str
    name: str
    specializations: list[str]
    subjects: list[str]
    experience_years: int
    certifications: list[str]
    education: str
    keywords: list[str]
    contact: str | None
    notes: str | None
    email: str | None
    region: str | None
    affiliation: str | None
    degree: str | None
    school: str | None
    major: str | None
    main_lecture_area: str | None
    summary: str | None
    birth_date: str | None
    lecture_history: list[dict]
    qualifications_career: list[dict]
    created_at: datetime
    updated_at: datetime


def get_external_db_path() -> str:
    prefix = "sqlite+aiosqlite:///"
    database_url = settings.INSTRUCTOR_DATABASE_URL
    if database_url.startswith(prefix):
        database_url = database_url.removeprefix(prefix)

    database_path = Path(database_url).expanduser()
    if not database_path.is_absolute():
        # Resolve relative paths from the backend folder, rather than from the
        # process working directory. This keeps the setup identical on each PC.
        backend_root = Path(__file__).resolve().parents[2]
        database_path = backend_root / database_path
    return str(database_path)


async def list_instructor_profiles(
    keyword: str | None = None,
    offset: int = 0,
    limit: int = 20,
) -> tuple[list[InstructorProfile], int]:
    db_path = get_external_db_path()
    where_sql = ""
    params: list[object] = []

    if keyword:
        like = f"%{keyword.lower()}%"
        where_sql = """
        WHERE lower(
            coalesce(i.name, '') || ' ' ||
            coalesce(i.region, '') || ' ' ||
            coalesce(i.affiliation, '') || ' ' ||
            coalesce(i.degree, '') || ' ' ||
            coalesce(i.school, '') || ' ' ||
            coalesce(i.major, '') || ' ' ||
            coalesce(i.main_lecture_fields, '') || ' ' ||
            coalesce(i.tech_stack, '') || ' ' ||
            coalesce(i.summary, '')
        ) LIKE ?
        """
        params.append(like)

    async with aiosqlite.connect(db_path) as conn:
        conn.row_factory = aiosqlite.Row
        total_row = await _fetchone(
            conn,
            f"SELECT count(*) AS total FROM instructors i {where_sql}",
            params,
        )
        rows = await _fetchall(
            conn,
            f"""
            SELECT
                i.*,
                p.birth_date,
                p.phone,
                p.email,
                (
                    SELECT count(*)
                    FROM lectures_projects lp
                    WHERE lp.instructor_id = i.id
                ) AS lecture_count
            FROM instructors i
            LEFT JOIN instructors_private p ON p.instructor_id = i.id
            {where_sql}
            ORDER BY i.name
            LIMIT ? OFFSET ?
            """,
            [*params, limit, offset],
        )

        histories = await _load_histories(conn, [row["id"] for row in rows])
        qualifications = await _load_qualifications(conn, [row["id"] for row in rows])

    return (
        [
            _row_to_profile(row, histories.get(row["id"], []), qualifications.get(row["id"], []), db_path)
            for row in rows
        ],
        int(total_row["total"] if total_row else 0),
    )


async def get_instructor_profile(instructor_id: str) -> InstructorProfile | None:
    db_path = get_external_db_path()
    async with aiosqlite.connect(db_path) as conn:
        conn.row_factory = aiosqlite.Row
        row = await _fetchone(
            conn,
            """
            SELECT
                i.*,
                p.birth_date,
                p.phone,
                p.email,
                (
                    SELECT count(*)
                    FROM lectures_projects lp
                    WHERE lp.instructor_id = i.id
                ) AS lecture_count
            FROM instructors i
            LEFT JOIN instructors_private p ON p.instructor_id = i.id
            WHERE CAST(i.id AS TEXT) = ?
            """,
            [instructor_id],
        )
        if not row:
            return None

        histories = await _load_histories(conn, [row["id"]])
        qualifications = await _load_qualifications(conn, [row["id"]])

    return _row_to_profile(row, histories.get(row["id"], []), qualifications.get(row["id"], []), db_path)


async def list_all_instructor_profiles() -> list[InstructorProfile]:
    profiles, _ = await list_instructor_profiles(offset=0, limit=100_000)
    return profiles


async def _fetchone(conn: aiosqlite.Connection, sql: str, params: list[object]):
    cursor = await conn.execute(sql, params)
    try:
        return await cursor.fetchone()
    finally:
        await cursor.close()


async def _fetchall(conn: aiosqlite.Connection, sql: str, params: list[object]):
    cursor = await conn.execute(sql, params)
    try:
        return await cursor.fetchall()
    finally:
        await cursor.close()


async def _load_histories(conn: aiosqlite.Connection, ids: list[int]) -> dict[int, list[dict]]:
    if not ids:
        return {}
    placeholders = ",".join("?" for _ in ids)
    rows = await _fetchall(
        conn,
        f"""
        SELECT *
        FROM lectures_projects
        WHERE instructor_id IN ({placeholders})
        ORDER BY instructor_id, start_month DESC, id
        """,
        ids,
    )
    grouped: dict[int, list[dict]] = {}
    for row in rows:
        grouped.setdefault(row["instructor_id"], []).append({
            "type": _clean(row["category"]),
            "start": _clean(row["start_month"]),
            "end": _clean(row["end_month"]),
            "client": _clean(row["client_name"]),
            "course": _clean(row["course_project_name"]),
            "hours": _clean(row["hours"]),
            "role": _clean(row["role"]),
            "keywords": _clean(row["keyword"]),
        })
    return grouped


async def _load_qualifications(conn: aiosqlite.Connection, ids: list[int]) -> dict[int, list[dict]]:
    if not ids:
        return {}
    placeholders = ",".join("?" for _ in ids)
    rows = await _fetchall(
        conn,
        f"""
        SELECT *
        FROM certificates_careers
        WHERE instructor_id IN ({placeholders})
        ORDER BY instructor_id, start_month DESC, id
        """,
        ids,
    )
    grouped: dict[int, list[dict]] = {}
    for row in rows:
        grouped.setdefault(row["instructor_id"], []).append({
            "type": _clean(row["category"]),
            "start": _clean(row["start_month"]),
            "end": _clean(row["end_month"]),
            "detail": _clean(row["detail"]),
            "issuer": _clean(row["institution_company"]),
        })
    return grouped


def _row_to_profile(
    row: aiosqlite.Row,
    history: list[dict],
    qualifications: list[dict],
    db_path: str,
) -> InstructorProfile:
    skills = _split_keywords(row["tech_stack"])
    lecture_fields = _split_keywords(row["main_lecture_fields"])
    history_keywords = [
        item
        for h in history
        for item in _split_keywords(h.get("keywords"))
    ]
    certs = [q["detail"] for q in qualifications if q.get("detail")]
    keywords = _unique([*skills, *lecture_fields, *history_keywords, *certs])
    timestamp = _db_timestamp(db_path)

    return InstructorProfile(
        id=str(row["id"]),
        name=_clean(row["name"]) or "",
        specializations=skills[:5] or lecture_fields[:5],
        subjects=[],
        experience_years=int(row["lecture_count"] or len(history)),
        certifications=certs,
        education=" ".join(part for part in [_clean(row["degree"]), _clean(row["school"])] if part),
        keywords=keywords,
        contact=_clean(row["phone"]),
        notes=_clean(row["original_resume_file"]),
        email=_clean(row["email"]),
        region=_clean(row["region"]),
        affiliation=_clean(row["affiliation"]),
        degree=_clean(row["degree"]),
        school=_clean(row["school"]),
        major=_clean(row["major"]),
        main_lecture_area=_clean(row["main_lecture_fields"]),
        summary=_clean(row["summary"]),
        birth_date=_clean(row["birth_date"]),
        lecture_history=history,
        qualifications_career=qualifications,
        created_at=timestamp,
        updated_at=timestamp,
    )


def _split_keywords(value: object) -> list[str]:
    text = _clean(value)
    if not text:
        return []
    return _unique(part.strip() for part in re.split(r"[,/;\n\r]+", text) if part.strip())


def _unique(values) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if not value:
            continue
        key = str(value).strip().lower()
        if key and key not in seen:
            seen.add(key)
            result.append(str(value).strip())
    return result


def _clean(value: object) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text or text.lower() == "nan":
        return None
    return text


def _db_timestamp(db_path: str) -> datetime:
    path = Path(db_path)
    if path.exists():
        return datetime.fromtimestamp(path.stat().st_mtime)
    return datetime.utcnow()
