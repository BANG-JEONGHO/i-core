from types import SimpleNamespace

from app.main import _apply_additive_schema_updates
from app.models.models import Instructor, InstructorSchedule, MatchingResult, TaskOrder, User


def test_timestamp_columns_have_server_defaults() -> None:
    """Rows created without an explicit timestamp must be accepted by the DB."""
    for model in (User, Instructor, TaskOrder, MatchingResult, InstructorSchedule):
        assert model.__table__.c.created_at.server_default is not None

    assert Instructor.__table__.c.updated_at.server_default is not None


def test_postgres_timestamp_defaults_are_applied_to_existing_tables() -> None:
    class FakeConnection:
        dialect = SimpleNamespace(name="postgresql")

        def __init__(self) -> None:
            self.statements: list[str] = []

        def exec_driver_sql(self, statement: str) -> None:
            self.statements.append(statement)

    connection = FakeConnection()
    _apply_additive_schema_updates(connection)

    assert connection.statements == [
        "ALTER TABLE users ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE instructors ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE instructors ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE task_orders ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE matching_results ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE instructor_schedules ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP",
    ]
