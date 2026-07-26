"""Read-only access to the normalized instructor SQLite database.

This layer deliberately excludes ``instructors_private``.  Contact details and
birth dates are not necessary for matching and must not reach an LLM request.
"""

from __future__ import annotations

import os
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Any


class InstructorRepositoryError(RuntimeError):
    """Raised when the configured instructor database cannot be read."""


class InstructorNotFoundError(InstructorRepositoryError):
    """Raised when an instructor ID does not exist in the database."""


@dataclass(frozen=True)
class InstructorDatabaseRecord:
    """A non-private instructor record with all matching-relevant child rows."""

    instructor: dict[str, Any]
    lectures_projects: list[dict[str, Any]]
    certificates_careers: list[dict[str, Any]]


class InstructorRepository:
    """Load normalized instructor data without modifying the SQLite database."""

    def __init__(self, database_path: Path | None = None) -> None:
        configured_path = os.getenv("INSTRUCTOR_DB_PATH")
        self.database_path = database_path or (
            Path(configured_path) if configured_path else None
        )

    def list_instructor_ids(self) -> list[int]:
        """Return every instructor ID in a deterministic order."""
        with self._connect() as connection:
            rows = connection.execute("SELECT id FROM instructors ORDER BY id").fetchall()
        return [int(row["id"]) for row in rows]

    def get_instructor(self, instructor_id: int) -> InstructorDatabaseRecord:
        """Return one instructor and their teaching, project, career, and certificate rows."""
        with self._connect() as connection:
            instructor = connection.execute(
                """
                SELECT
                    id, name, affiliation, degree, school, major,
                    main_lecture_fields, tech_stack, summary, original_resume_file
                FROM instructors
                WHERE id = ?
                """,
                (instructor_id,),
            ).fetchone()

            if instructor is None:
                raise InstructorNotFoundError(f"Instructor {instructor_id} was not found.")

            lectures_projects = connection.execute(
                """
                SELECT
                    id, category, start_month, end_month, client_name,
                    course_project_name, hours, role, keyword,
                    source_file, source_sheet, source_row
                FROM lectures_projects
                WHERE instructor_id = ?
                ORDER BY start_month DESC, id DESC
                """,
                (instructor_id,),
            ).fetchall()

            certificates_careers = connection.execute(
                """
                SELECT
                    id, category, start_month, end_month, detail,
                    institution_company, source_file, source_sheet, source_row
                FROM certificates_careers
                WHERE instructor_id = ?
                ORDER BY start_month DESC, id DESC
                """,
                (instructor_id,),
            ).fetchall()

        return InstructorDatabaseRecord(
            instructor=dict(instructor),
            lectures_projects=[dict(row) for row in lectures_projects],
            certificates_careers=[dict(row) for row in certificates_careers],
        )

    def _connect(self) -> sqlite3.Connection:
        """Open SQLite in read-only mode so matching cannot alter source data."""
        if self.database_path is None:
            raise InstructorRepositoryError(
                "INSTRUCTOR_DB_PATH is not configured."
            )
        if not self.database_path.is_file():
            raise InstructorRepositoryError(
                f"Instructor database was not found: {self.database_path}"
            )

        try:
            connection = sqlite3.connect(
                f"{self.database_path.resolve().as_uri()}?mode=ro",
                uri=True,
            )
        except sqlite3.Error as error:
            raise InstructorRepositoryError("Instructor database could not be opened.") from error

        connection.row_factory = sqlite3.Row
        return connection

