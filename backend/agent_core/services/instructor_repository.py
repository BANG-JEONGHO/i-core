"""Read matching-relevant instructor data from SQLite or PostgreSQL.

Private contact and birth-date records remain deliberately excluded from the
agent-core repository, regardless of the configured database backend.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine, make_url


class InstructorRepositoryError(RuntimeError):
    """Raised when the configured instructor database cannot be read."""


class InstructorNotFoundError(InstructorRepositoryError):
    """Raised when an instructor ID does not exist in the database."""


@dataclass(frozen=True)
class InstructorDatabaseRecord:
    instructor: dict[str, Any]
    lectures_projects: list[dict[str, Any]]
    certificates_careers: list[dict[str, Any]]


class InstructorRepository:
    """Load normalized non-private instructor records using a SQLAlchemy URL."""

    def __init__(self, database_url: str | None = None) -> None:
        if not database_url:
            raise InstructorRepositoryError("Instructor database URL is not configured.")
        self.database_url = database_url
        try:
            url = make_url(database_url)
        except Exception as error:
            raise InstructorRepositoryError("Instructor database URL is invalid.") from error
        if url.get_backend_name() not in {"sqlite", "postgresql"}:
            raise InstructorRepositoryError("Instructor database must use SQLite or PostgreSQL.")
        self._engine: Engine = create_engine(
            database_url,
            pool_pre_ping=url.get_backend_name() != "sqlite",
        )

    def list_instructor_ids(self) -> list[int]:
        with self._connect() as connection:
            rows = connection.execute(text("SELECT id FROM instructors ORDER BY id")).mappings().all()
        return [int(row["id"]) for row in rows]

    def get_instructor(self, instructor_id: int) -> InstructorDatabaseRecord:
        with self._connect() as connection:
            instructor = connection.execute(
                text(
                    """
                    SELECT id, name, affiliation, degree, school, major,
                        main_lecture_fields, tech_stack, summary, original_resume_file
                    FROM instructors WHERE id = :instructor_id
                    """
                ),
                {"instructor_id": instructor_id},
            ).mappings().first()
            if instructor is None:
                raise InstructorNotFoundError(f"Instructor {instructor_id} was not found.")

            lectures = connection.execute(
                text(
                    """
                    SELECT id, category, start_month, end_month, client_name,
                        course_project_name, hours, role, keyword, source_file,
                        source_sheet, source_row
                    FROM lectures_projects
                    WHERE instructor_id = :instructor_id
                    ORDER BY start_month DESC, id DESC
                    """
                ),
                {"instructor_id": instructor_id},
            ).mappings().all()
            certificates = connection.execute(
                text(
                    """
                    SELECT id, category, start_month, end_month, detail,
                        institution_company, source_file, source_sheet, source_row
                    FROM certificates_careers
                    WHERE instructor_id = :instructor_id
                    ORDER BY start_month DESC, id DESC
                    """
                ),
                {"instructor_id": instructor_id},
            ).mappings().all()

        return InstructorDatabaseRecord(
            instructor=dict(instructor),
            lectures_projects=[dict(row) for row in lectures],
            certificates_careers=[dict(row) for row in certificates],
        )

    def _connect(self):
        try:
            return self._engine.connect()
        except Exception as error:
            raise InstructorRepositoryError("Instructor database could not be opened.") from error
