"""Convert extracted document text into small, source-preserving RAG chunks."""

from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class TextChunk:
    chunk_id: str
    text: str
    section: str | None = None


def chunk_text(text: str, *, chunk_size: int = 900, overlap: int = 120) -> list[TextChunk]:
    """Split text on paragraph/sentence boundaries without inventing any content."""
    normalized = "\n".join(line.strip() for line in text.splitlines() if line.strip())
    if not normalized:
        return []

    units = [unit.strip() for unit in re.split(r"\n+|(?<=[.!?])\s+", normalized) if unit.strip()]
    chunks: list[TextChunk] = []
    current = ""
    for unit in units:
        if len(unit) > chunk_size:
            if current:
                chunks.append(TextChunk(str(len(chunks)), current))
                current = ""
            for start in range(0, len(unit), max(chunk_size - overlap, 1)):
                chunks.append(TextChunk(str(len(chunks)), unit[start : start + chunk_size]))
            continue
        proposed = f"{current}\n{unit}".strip()
        if current and len(proposed) > chunk_size:
            chunks.append(TextChunk(str(len(chunks)), current))
            tail = current[-overlap:] if overlap else ""
            current = f"{tail}\n{unit}".strip()
        else:
            current = proposed
    if current:
        chunks.append(TextChunk(str(len(chunks)), current))
    return chunks
