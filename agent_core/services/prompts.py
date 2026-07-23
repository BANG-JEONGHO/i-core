from __future__ import annotations

from pathlib import Path


PROMPT_DIR = Path(__file__).resolve().parents[1] / "prompts"


def load_prompt(name: str) -> str:
    """Load only application-owned prompt files; never derive a path from user input."""
    path = PROMPT_DIR / name
    if path.parent != PROMPT_DIR or path.suffix != ".md" or not path.is_file():
        raise ValueError(f"unknown prompt: {name}")
    return path.read_text(encoding="utf-8")


