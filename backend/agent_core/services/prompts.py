from __future__ import annotations

from pathlib import Path


PACKAGE_DIR = Path(__file__).resolve().parents[1]
PROMPT_DIR = PACKAGE_DIR / "prompts"
# The supplied agent-core source keeps its prompt files beside the package
# modules. Keep that layout working while also supporting a future
# ``agent_core/prompts`` directory.
LEGACY_PROMPT_DIR = PACKAGE_DIR


def load_prompt(name: str) -> str:
    """Load only application-owned prompt files; never derive a path from user input."""
    if Path(name).name != name or Path(name).suffix != ".md":
        raise ValueError(f"unknown prompt: {name}")
    for prompt_dir in (PROMPT_DIR, LEGACY_PROMPT_DIR):
        path = prompt_dir / name
        if path.parent == prompt_dir and path.is_file():
            return path.read_text(encoding="utf-8")
    raise ValueError(f"unknown prompt: {name}")


