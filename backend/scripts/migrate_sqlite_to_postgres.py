"""Copy the private instructor SQLite database into Cloud SQL PostgreSQL.

Usage (run from backend/):
  INSTRUCTOR_DATABASE_SYNC_URL='postgresql+psycopg://...' \
  python scripts/migrate_sqlite_to_postgres.py \
    --source /path/to/내부_강사_정보.db

The script only upserts the four instructor-resume tables. It never deletes
records from Cloud SQL, and it intentionally does not migrate application data.
"""

from __future__ import annotations

import argparse
import os
import sqlite3
from pathlib import Path
from typing import Any

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine, make_url


TABLES: dict[str, tuple[str, ...]] = {
    "instructors": (
        "id", "name", "region", "affiliation", "degree", "school", "major",
        "main_lecture_fields", "tech_stack", "summary", "original_resume_file",
    ),
    "instructors_private": ("id", "instructor_id", "birth_date", "phone", "email"),
    "lectures_projects": (
        "id", "instructor_id", "category", "start_month", "end_month", "client_name",
        "course_project_name", "hours", "role", "keyword", "source_file",
        "source_sheet", "source_row",
    ),
    "certificates_careers": (
        "id", "instructor_id", "category", "start_month", "end_month", "detail",
        "institution_company", "source_file", "source_sheet", "source_row",
    ),
}


DDL = """
CREATE TABLE IF NOT EXISTS instructors (
    id BIGINT PRIMARY KEY,
    name TEXT NOT NULL,
    region TEXT, affiliation TEXT, degree TEXT, school TEXT, major TEXT,
    main_lecture_fields TEXT, tech_stack TEXT, summary TEXT,
    original_resume_file TEXT
);
CREATE TABLE IF NOT EXISTS instructors_private (
    id BIGINT PRIMARY KEY,
    instructor_id BIGINT NOT NULL UNIQUE REFERENCES instructors(id) ON DELETE CASCADE,
    birth_date TEXT, phone TEXT, email TEXT
);
CREATE TABLE IF NOT EXISTS lectures_projects (
    id BIGINT PRIMARY KEY,
    instructor_id BIGINT NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
    category TEXT NOT NULL, start_month TEXT, end_month TEXT, client_name TEXT,
    course_project_name TEXT, hours TEXT, role TEXT, keyword TEXT,
    source_file TEXT, source_sheet TEXT, source_row BIGINT
);
CREATE TABLE IF NOT EXISTS certificates_careers (
    id BIGINT PRIMARY KEY,
    instructor_id BIGINT NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
    category TEXT NOT NULL, start_month TEXT, end_month TEXT, detail TEXT,
    institution_company TEXT, source_file TEXT, source_sheet TEXT, source_row BIGINT
);
CREATE INDEX IF NOT EXISTS idx_lectures_projects_instructor_id
    ON lectures_projects(instructor_id);
CREATE INDEX IF NOT EXISTS idx_certificates_careers_instructor_id
    ON certificates_careers(instructor_id);
"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Migrate instructor SQLite data to PostgreSQL.")
    parser.add_argument("--source", required=True, type=Path, help="Path to the source SQLite .db file")
    parser.add_argument(
        "--target-url",
        default=os.getenv("INSTRUCTOR_DATABASE_SYNC_URL", ""),
        help="PostgreSQL SQLAlchemy URL; defaults to INSTRUCTOR_DATABASE_SYNC_URL",
    )
    parser.add_argument("--dry-run", action="store_true", help="Validate source counts without writing")
    return parser.parse_args()


def source_rows(connection: sqlite3.Connection, table: str) -> list[dict[str, Any]]:
    columns = TABLES[table]
    query = f"SELECT {', '.join(columns)} FROM {table} ORDER BY id"
    return [dict(row) for row in connection.execute(query).fetchall()]


def create_schema(engine: Engine) -> None:
    statements = [statement.strip() for statement in DDL.split(";") if statement.strip()]
    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def upsert(engine: Engine, table: str, rows: list[dict[str, Any]]) -> int:
    if not rows:
        return 0
    columns = TABLES[table]
    assignments = ", ".join(f"{column} = EXCLUDED.{column}" for column in columns if column != "id")
    statement = text(
        f"""
        INSERT INTO {table} ({', '.join(columns)})
        VALUES ({', '.join(f':{column}' for column in columns)})
        ON CONFLICT (id) DO UPDATE SET {assignments}
        """
    )
    with engine.begin() as connection:
        connection.execute(statement, rows)
    return len(rows)


def main() -> None:
    args = parse_args()
    if not args.source.is_file():
        raise SystemExit(f"Source SQLite file was not found: {args.source}")
    if not args.target_url:
        raise SystemExit("Set INSTRUCTOR_DATABASE_SYNC_URL or pass --target-url.")

    target = make_url(args.target_url)
    if target.get_backend_name() != "postgresql":
        raise SystemExit("The target URL must be PostgreSQL; SQLite is not a Cloud SQL target.")

    source = sqlite3.connect(args.source)
    source.row_factory = sqlite3.Row
    try:
        rows_by_table = {table: source_rows(source, table) for table in TABLES}
    finally:
        source.close()

    for table, rows in rows_by_table.items():
        print(f"{table}: {len(rows)} rows")
    if args.dry_run:
        print("Dry run complete; no data was written.")
        return

    engine = create_engine(args.target_url, pool_pre_ping=True)
    try:
        create_schema(engine)
        for table, rows in rows_by_table.items():
            print(f"Migrated {upsert(engine, table, rows)} rows into {table}.")
    finally:
        engine.dispose()
    print("Instructor database migration completed successfully.")


if __name__ == "__main__":
    main()
