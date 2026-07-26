"""Local audit storage for completed matching runs.

The implementation is intentionally filesystem-based for the MVP.  Its public
interface can later be backed by Cloud Storage and a database without changing
the API or agent workflow.
"""

from __future__ import annotations

import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

from agent_core.schemas import MatchRequest, MergedMatchResult


class RunStorageError(RuntimeError):
    """Raised when a completed run cannot be persisted or loaded."""


class RunStorage:
    """Persist one match request, result, and audit metadata per run directory."""

    _RUN_ID_PATTERN = re.compile(r"^\d{8}T\d{6}Z_[0-9a-f]{12}$")

    def __init__(self, root: Path | None = None) -> None:
        # RUN_STORAGE_DIR permits a different disk/bucket mount in each environment.
        self.root = root or Path(os.getenv("RUN_STORAGE_DIR", "data/runs"))

    def save_match_run(
        self,
        request: MatchRequest,
        result: MergedMatchResult,
    ) -> str:
        """Create an immutable local audit record and return its generated run ID."""
        created_at = datetime.now(timezone.utc)
        run_id = f"{created_at:%Y%m%dT%H%M%SZ}_{uuid4().hex[:12]}"
        run_path = self.root / run_id
        stored_result = result.model_copy(update={"run_id": run_id})

        try:
            run_path.mkdir(parents=True, exist_ok=False)
            self._write_json(run_path / "request.json", request.model_dump(mode="json"))
            self._write_json(
                run_path / "result.json",
                stored_result.model_dump(mode="json"),
            )
            self._write_json(
                run_path / "metadata.json",
                {
                    "run_id": run_id,
                    "created_at": created_at.isoformat(),
                    "status": "completed",
                    "storage_schema_version": "match_run_v1",
                    "model": os.getenv("GEMINI_MODEL", "gemini-3.5-flash"),
                    "project_source_document_ids": sorted(
                        {
                            evidence.source_document_id
                            for evidence in request.project.evidence
                        }
                    ),
                    "instructor_id": request.instructor.instructor_id,
                    "instructor_profile_version": request.instructor.profile_version,
                    "rag_project_evidence_count": len(result.rag_context.project_evidence)
                    if result.rag_context else 0,
                    "rag_instructor_evidence_count": len(result.rag_context.instructor_evidence)
                    if result.rag_context else 0,
                    "grounding_verdict": result.grounding.verdict if result.grounding else None,
                },
            )
        except OSError as error:
            raise RunStorageError(f"Could not save match run to {run_path}") from error

        return run_id

    def load_match_run(self, run_id: str) -> dict[str, Any]:
        """Load a stored record. A strict ID check prevents path traversal."""
        if not self._RUN_ID_PATTERN.fullmatch(run_id):
            raise RunStorageError("Run was not found.")

        run_path = self.root / run_id
        try:
            return {
                "metadata": self._read_json(run_path / "metadata.json"),
                "request": self._read_json(run_path / "request.json"),
                "result": self._read_json(run_path / "result.json"),
            }
        except (OSError, json.JSONDecodeError) as error:
            raise RunStorageError("Run was not found or could not be read.") from error

    @staticmethod
    def _write_json(path: Path, data: Any) -> None:
        """Write UTF-8 JSON so Korean text is preserved in human-readable form."""
        path.write_text(
            json.dumps(data, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    @staticmethod
    def _read_json(path: Path) -> dict[str, Any]:
        return json.loads(path.read_text(encoding="utf-8"))

