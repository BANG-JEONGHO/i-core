"""Reset runtime data accumulated during testing and matching runs.

Keeps core tables (`users`, `instructors`) intact.
Clears `matching_results`, `task_orders`, and `instructor_schedules` records,
as well as local temporary run logs and upload caches.
"""

import asyncio
import os
import shutil
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import text
from app.db.database import engine


async def reset_runtime_database() -> None:
    print("[RESET] Cleaning runtime database tables (task_orders, matching_results, instructor_schedules)...")
    async with engine.begin() as conn:
        await conn.execute(text("DELETE FROM matching_results;"))
        await conn.execute(text("DELETE FROM task_orders;"))
        await conn.execute(text("DELETE FROM instructor_schedules;"))
    print("[RESET] Database runtime tables cleared successfully.")


def reset_runtime_files() -> None:
    dirs_to_clean = [
        backend_dir / "uploads",
        backend_dir / "data" / "agent-runs",
        backend_dir / "data" / "agent-batch-runs",
        backend_dir / "data" / "vector-store",
    ]
    for d in dirs_to_clean:
        if d.exists():
            print(f"[RESET] Removing runtime cache directory: {d}")
            shutil.rmtree(d, ignore_errors=True)
            d.mkdir(parents=True, exist_ok=True)
    print("[RESET] Local runtime storage and cache directories reset.")


async def main() -> None:
    reset_runtime_files()
    try:
        await reset_runtime_database()
    except Exception as e:
        print(f"[RESET] Note: Database reset skipped or encounters error: {e}")


if __name__ == "__main__":
    asyncio.run(main())
