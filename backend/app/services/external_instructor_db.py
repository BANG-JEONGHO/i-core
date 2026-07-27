"""Read instructor profiles from SQLite locally or Cloud SQL PostgreSQL.

The instructor resume database is intentionally kept separate from app data.
Both the management UI and agent-core use this module, so switching its URL
changes the storage backend without exposing private data to LLM prompts.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime
from functools import lru_cache
from pathlib import Path
from typing import Any

from sqlalchemy import bindparam, text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

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


def _resolved_instructor_database_url() -> str:
    """Return a runnable URL and resolve local SQLite paths consistently."""
    value = settings.INSTRUCTOR_DATABASE_URL.strip()
    if not value.startswith("sqlite"):
        return value

    url = make_url(value)
    if not url.database or Path(url.database).is_absolute():
        return value
    backend_root = Path(__file__).resolve().parents[2]
    database_path = (backend_root / url.database).resolve()
    return str(url.set(database=database_path.as_posix()))


def get_external_db_path() -> str:
    """Return the local SQLite path; retained for local tooling compatibility."""
    url = make_url(_resolved_instructor_database_url())
    if url.get_backend_name() != "sqlite" or not url.database:
        raise RuntimeError("The instructor database is configured for PostgreSQL, not SQLite.")
    return url.database


def get_external_database_sync_url() -> str:
    """Return a synchronous SQLAlchemy URL for agent-core's read repository."""
    url = make_url(_resolved_instructor_database_url())
    if url.get_backend_name() == "postgresql":
        return url.set(drivername="postgresql+psycopg").render_as_string(
            hide_password=False
        )
    if url.get_backend_name() == "sqlite":
        return url.set(drivername="sqlite+pysqlite").render_as_string(
            hide_password=False
        )
    raise RuntimeError("INSTRUCTOR_DATABASE_URL must use SQLite or PostgreSQL.")


@lru_cache(maxsize=2)
def _engine(url: str) -> AsyncEngine:
    return create_async_engine(
        url,
        pool_pre_ping=not url.startswith("sqlite"),
    )


async def list_instructor_profiles(
    keyword: str | None = None,
    offset: int = 0,
    limit: int = 20,
) -> tuple[list[InstructorProfile], int]:
    where_sql = ""
    params: dict[str, Any] = {"offset": offset, "limit": limit}
    if keyword:
        where_sql = """
        WHERE lower(
            coalesce(i.name, '') || ' ' || coalesce(i.region, '') || ' ' ||
            coalesce(i.affiliation, '') || ' ' || coalesce(i.degree, '') || ' ' ||
            coalesce(i.school, '') || ' ' || coalesce(i.major, '') || ' ' ||
            coalesce(i.main_lecture_fields, '') || ' ' ||
            coalesce(i.tech_stack, '') || ' ' || coalesce(i.summary, '')
        ) LIKE :keyword
        """
        params["keyword"] = f"%{keyword.lower()}%"

    engine = _engine(_resolved_instructor_database_url())
    async with engine.connect() as conn:
        total = await conn.execute(
            text(f"SELECT count(*) AS total FROM instructors i {where_sql}"), params
        )
        total_count = int(total.scalar_one())
        rows = (
            await conn.execute(
                text(
                    f"""
                    SELECT i.*, p.birth_date, p.phone, p.email,
                        (SELECT count(*) FROM lectures_projects lp
                         WHERE lp.instructor_id = i.id) AS lecture_count
                    FROM instructors i
                    LEFT JOIN instructors_private p ON p.instructor_id = i.id
                    {where_sql}
                    ORDER BY i.name
                    LIMIT :limit OFFSET :offset
                    """
                ),
                params,
            )
        ).mappings().all()
        ids = [int(row["id"]) for row in rows]
        histories = await _load_histories(conn, ids)
        qualifications = await _load_qualifications(conn, ids)

    timestamp = _database_timestamp()
    return (
        [_row_to_profile(row, histories.get(int(row["id"]), []), qualifications.get(int(row["id"]), []), timestamp) for row in rows],
        total_count,
    )


async def get_instructor_profile(instructor_id: str) -> InstructorProfile | None:
    engine = _engine(_resolved_instructor_database_url())
    async with engine.connect() as conn:
        row = (
            await conn.execute(
                text(
                    """
                    SELECT i.*, p.birth_date, p.phone, p.email,
                        (SELECT count(*) FROM lectures_projects lp
                         WHERE lp.instructor_id = i.id) AS lecture_count
                    FROM instructors i
                    LEFT JOIN instructors_private p ON p.instructor_id = i.id
                    WHERE CAST(i.id AS TEXT) = :instructor_id
                    """
                ),
                {"instructor_id": instructor_id},
            )
        ).mappings().first()
        if row is None:
            return None
        numeric_id = int(row["id"])
        histories = await _load_histories(conn, [numeric_id])
        qualifications = await _load_qualifications(conn, [numeric_id])

    return _row_to_profile(row, histories.get(numeric_id, []), qualifications.get(numeric_id, []), _database_timestamp())


async def list_all_instructor_profiles() -> list[InstructorProfile]:
    profiles, _ = await list_instructor_profiles(offset=0, limit=100_000)
    return profiles


async def _load_histories(conn, ids: list[int]) -> dict[int, list[dict]]:
    if not ids:
        return {}
    statement = text(
        """
        SELECT * FROM lectures_projects
        WHERE instructor_id IN :ids
        ORDER BY instructor_id, start_month DESC, id
        """
    ).bindparams(bindparam("ids", expanding=True))
    rows = (await conn.execute(statement, {"ids": ids})).mappings().all()
    grouped: dict[int, list[dict]] = {}
    for row in rows:
        instructor_id = int(row["instructor_id"])
        grouped.setdefault(instructor_id, []).append({
            "type": _clean(row["category"]), "start": _clean(row["start_month"]),
            "end": _clean(row["end_month"]), "client": _clean(row["client_name"]),
            "course": _clean(row["course_project_name"]), "hours": _clean(row["hours"]),
            "role": _clean(row["role"]), "keywords": _clean(row["keyword"]),
        })
    return grouped


async def _load_qualifications(conn, ids: list[int]) -> dict[int, list[dict]]:
    if not ids:
        return {}
    statement = text(
        """
        SELECT * FROM certificates_careers
        WHERE instructor_id IN :ids
        ORDER BY instructor_id, start_month DESC, id
        """
    ).bindparams(bindparam("ids", expanding=True))
    rows = (await conn.execute(statement, {"ids": ids})).mappings().all()
    grouped: dict[int, list[dict]] = {}
    for row in rows:
        instructor_id = int(row["instructor_id"])
        grouped.setdefault(instructor_id, []).append({
            "type": _clean(row["category"]), "start": _clean(row["start_month"]),
            "end": _clean(row["end_month"]), "detail": _clean(row["detail"]),
            "issuer": _clean(row["institution_company"]),
        })
    return grouped


def _row_to_profile(row, history: list[dict], qualifications: list[dict], timestamp: datetime) -> InstructorProfile:
    skills = _split_keywords(row["tech_stack"])
    lecture_fields = _split_keywords(row["main_lecture_fields"])
    history_keywords = [item for entry in history for item in _split_keywords(entry.get("keywords"))]
    certs = [entry["detail"] for entry in qualifications if entry.get("detail")]
    return InstructorProfile(
        id=str(row["id"]), name=_clean(row["name"]) or "",
        specializations=skills[:5] or lecture_fields[:5], subjects=[],
        experience_years=int(row["lecture_count"] or len(history)), certifications=certs,
        education=" ".join(part for part in [_clean(row["degree"]), _clean(row["school"])] if part),
        keywords=_unique([*skills, *lecture_fields, *history_keywords, *certs]),
        contact=_clean(row["phone"]), notes=_clean(row["original_resume_file"]),
        email=_clean(row["email"]), region=_clean(row["region"]),
        affiliation=_clean(row["affiliation"]), degree=_clean(row["degree"]),
        school=_clean(row["school"]), major=_clean(row["major"]),
        main_lecture_area=_clean(row["main_lecture_fields"]), summary=_clean(row["summary"]),
        birth_date=_clean(row["birth_date"]), lecture_history=history,
        qualifications_career=qualifications, created_at=timestamp, updated_at=timestamp,
    )


def _database_timestamp() -> datetime:
    try:
        path = Path(get_external_db_path())
        if path.exists():
            return datetime.fromtimestamp(path.stat().st_mtime)
    except RuntimeError:
        pass
    return datetime.utcnow()


def _split_keywords(value: object) -> list[str]:
    text_value = _clean(value)
    return _unique(part.strip() for part in re.split(r"[,/;\n\r]+", text_value or "") if part.strip())


def _unique(values) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if not value:
            continue
        normalized = str(value).strip()
        key = normalized.lower()
        if key and key not in seen:
            seen.add(key)
            result.append(normalized)
    return result


def _clean(value: object) -> str | None:
    if value is None:
        return None
    normalized = str(value).strip()
    return None if not normalized or normalized.lower() == "nan" else normalized
