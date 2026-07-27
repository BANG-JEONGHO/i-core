"""Migrate i-Core application SQLite data to Cloud SQL PostgreSQL.

This is optional for a fresh deployment because the API creates empty app
tables on startup. Run it when existing accounts, task orders, schedules, or
matching history must be preserved.
"""

from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.engine import make_url

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.models.models import Base


TABLE_ORDER = ["users", "instructors", "task_orders", "matching_results", "instructor_schedules"]
JSON_COLUMNS = {
    "instructors": {"specializations", "subjects", "certifications", "keywords", "lecture_history", "qualifications_career"},
    "task_orders": {"qualifications", "evaluation_criteria", "overview"},
    "matching_results": {"results", "top_instructors", "candidates"},
}
DATETIME_COLUMNS = {"created_at", "updated_at", "parsed_at"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Migrate i-Core app SQLite data to PostgreSQL.")
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--target-url", default=os.getenv("APP_DATABASE_SYNC_URL", ""))
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def _source_table_names(connection: sqlite3.Connection) -> set[str]:
    return {row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type='table'")}


def _normalize_value(table: str, column: str, value: Any) -> Any:
    if value is None:
        return None
    if column in JSON_COLUMNS.get(table, set()):
        if isinstance(value, (dict, list)):
            return value
        try:
            return json.loads(value)
        except (TypeError, json.JSONDecodeError):
            return [] if column != "overview" else {}
    if column in DATETIME_COLUMNS and isinstance(value, str):
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            return None
    if column == "is_active":
        return bool(value)
    return value


def _load_rows(connection: sqlite3.Connection, table: str) -> list[dict[str, Any]]:
    if table not in _source_table_names(connection):
        return []
    target_columns = {column.name for column in Base.metadata.tables[table].columns}
    rows = connection.execute(f"SELECT * FROM {table}").fetchall()
    return [
        {
            key: _normalize_value(table, key, value)
            for key, value in dict(row).items()
            if key in target_columns
        }
        for row in rows
    ]


def main() -> None:
    args = parse_args()
    if not args.source.is_file():
        raise SystemExit(f"Source SQLite file was not found: {args.source}")
    if not args.target_url or make_url(args.target_url).get_backend_name() != "postgresql":
        raise SystemExit("Set APP_DATABASE_SYNC_URL (or --target-url) to a PostgreSQL SQLAlchemy URL.")

    source = sqlite3.connect(args.source)
    source.row_factory = sqlite3.Row
    try:
        rows_by_table = {table: _load_rows(source, table) for table in TABLE_ORDER}
    finally:
        source.close()

    for table, rows in rows_by_table.items():
        print(f"{table}: {len(rows)} rows")
    if args.dry_run:
        print("Dry run complete; no data was written.")
        return

    engine = create_engine(args.target_url, pool_pre_ping=True)
    try:
        Base.metadata.create_all(engine)
        with engine.begin() as connection:
            for table_name, rows in rows_by_table.items():
                if not rows:
                    continue
                table = Base.metadata.tables[table_name]
                statement = insert(table).values(rows)
                updates = {
                    column.name: getattr(statement.excluded, column.name)
                    for column in table.columns
                    if column.name != "id"
                }
                connection.execute(
                    statement.on_conflict_do_update(index_elements=[table.c.id], set_=updates)
                )
                print(f"Migrated {len(rows)} rows into {table_name}.")
    finally:
        engine.dispose()
    print("Application database migration completed successfully.")


if __name__ == "__main__":
    main()
