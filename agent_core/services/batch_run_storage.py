"""Local audit storage for DB ranking and optional reviewed-match batches."""

from __future__ import annotations

import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

from agent_core.schemas import BatchMatchRequest, BatchMatchResult


class BatchRunStorageError(RuntimeError):
    """Raised when a batch audit record cannot be saved or loaded."""


class BatchRunStorage:
    _BATCH_RUN_ID_PATTERN = re.compile(r"^batch_\d{8}T\d{6}Z_[0-9a-f]{12}$")

    def __init__(self, root: Path | None = None) -> None:
        self.root = root or Path(os.getenv("BATCH_RUN_STORAGE_DIR", "data/batch-runs"))

    def save_batch_run(
        self,
        request: BatchMatchRequest,
        result: BatchMatchResult,
    ) -> str:
        """Persist a complete batch request and its retrieval/review output."""
        created_at = datetime.now(timezone.utc)
        batch_run_id = f"batch_{created_at:%Y%m%dT%H%M%SZ}_{uuid4().hex[:12]}"
        batch_path = self.root / batch_run_id
        stored_result = result.model_copy(update={"batch_run_id": batch_run_id})

        try:
            batch_path.mkdir(parents=True, exist_ok=False)
            self._write_json(batch_path / "request.json", request.model_dump(mode="json"))
            self._write_json(batch_path / "result.json", stored_result.model_dump(mode="json"))
            self._write_json(
                batch_path / "metadata.json",
                {
                    "batch_run_id": batch_run_id,
                    "created_at": created_at.isoformat(),
                    "status": "completed",
                    "storage_schema_version": "batch_match_run_v1",
                    "total_instructors": result.total_instructors,
                    "reviewed_instructor_ids": request.review_instructor_ids,
                    "reviewed_match_run_ids": [
                        match.run_id
                        for match in result.reviewed_matches
                        if match.run_id is not None
                    ],
                },
            )
        except OSError as error:
            raise BatchRunStorageError(f"Could not save batch run to {batch_path}") from error

        return batch_run_id

    def load_batch_run(self, batch_run_id: str) -> dict[str, Any]:
        if not self._BATCH_RUN_ID_PATTERN.fullmatch(batch_run_id):
            raise BatchRunStorageError("Batch run was not found.")

        batch_path = self.root / batch_run_id
        try:
            return {
                "metadata": self._read_json(batch_path / "metadata.json"),
                "request": self._read_json(batch_path / "request.json"),
                "result": self._read_json(batch_path / "result.json"),
            }
        except (OSError, json.JSONDecodeError) as error:
            raise BatchRunStorageError("Batch run was not found or could not be read.") from error

    @staticmethod
    def _write_json(path: Path, data: Any) -> None:
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    @staticmethod
    def _read_json(path: Path) -> dict[str, Any]:
        return json.loads(path.read_text(encoding="utf-8"))

