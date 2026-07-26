"""Small SQLite-backed vector store for the MVP RAG pipeline.

It stores vectors locally and calculates cosine similarity in Python. This is
appropriate for the current document volume and can later be replaced by a
managed vector service without changing the retriever interface.
"""

from __future__ import annotations

import json
import math
import os
import sqlite3
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class VectorRecord:
    document_id: str
    chunk_id: str
    text: str
    section: str | None
    source_type: str
    score: float


class LocalVectorStore:
    def __init__(self, database_path: Path | None = None) -> None:
        configured = os.getenv("VECTOR_STORE_PATH", "data/vector-store/rag.sqlite3")
        self.database_path = database_path or Path(configured)

    def replace_document(
        self,
        *,
        document_id: str,
        source_type: str,
        chunks: list[tuple[str, str, str | None]],
        embeddings: list[list[float]],
    ) -> None:
        if len(chunks) != len(embeddings):
            raise ValueError("Chunk and embedding counts must match.")
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as connection:
            self._ensure_schema(connection)
            connection.execute("DELETE FROM rag_chunks WHERE document_id = ?", (document_id,))
            connection.executemany(
                """
                INSERT INTO rag_chunks (document_id, chunk_id, source_type, section, text, embedding_json)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                [
                    (document_id, chunk_id, source_type, section, text, json.dumps(vector))
                    for (chunk_id, text, section), vector in zip(chunks, embeddings, strict=True)
                ],
            )

    def search(
        self,
        query_vector: list[float],
        *,
        source_type: str,
        document_id: str | None = None,
        limit: int = 5,
    ) -> list[VectorRecord]:
        if not self.database_path.is_file():
            return []
        with self._connect() as connection:
            self._ensure_schema(connection)
            if document_id is None:
                rows = connection.execute(
                    "SELECT document_id, chunk_id, source_type, section, text, embedding_json "
                    "FROM rag_chunks WHERE source_type = ?",
                    (source_type,),
                ).fetchall()
            else:
                rows = connection.execute(
                    "SELECT document_id, chunk_id, source_type, section, text, embedding_json "
                    "FROM rag_chunks WHERE source_type = ? AND document_id = ?",
                    (source_type, document_id),
                ).fetchall()
        ranked = [
            VectorRecord(
                document_id=row["document_id"],
                chunk_id=row["chunk_id"],
                source_type=row["source_type"],
                section=row["section"],
                text=row["text"],
                score=_cosine(query_vector, json.loads(row["embedding_json"])),
            )
            for row in rows
        ]
        return sorted(ranked, key=lambda item: item.score, reverse=True)[:limit]

    def document_text(self, document_id: str) -> str:
        if not self.database_path.is_file():
            return ""
        with self._connect() as connection:
            self._ensure_schema(connection)
            rows = connection.execute(
                "SELECT text FROM rag_chunks WHERE document_id = ? ORDER BY CAST(chunk_id AS INTEGER)",
                (document_id,),
            ).fetchall()
        return "\n".join(row["text"] for row in rows)

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.database_path)
        connection.row_factory = sqlite3.Row
        return connection

    @staticmethod
    def _ensure_schema(connection: sqlite3.Connection) -> None:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS rag_chunks (
                document_id TEXT NOT NULL,
                chunk_id TEXT NOT NULL,
                source_type TEXT NOT NULL,
                section TEXT,
                text TEXT NOT NULL,
                embedding_json TEXT NOT NULL,
                PRIMARY KEY (document_id, chunk_id)
            )
            """
        )


def _cosine(left: list[float], right: list[float]) -> float:
    if len(left) != len(right) or not left or not right:
        return 0.0
    denominator = math.sqrt(sum(value * value for value in left)) * math.sqrt(sum(value * value for value in right))
    return sum(a * b for a, b in zip(left, right, strict=True)) / denominator if denominator else 0.0
