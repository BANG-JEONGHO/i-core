"""GCP Cloud SQL (PostgreSQL + pgvector) Native Vector Store.

Stores text embeddings in Cloud SQL's PostgreSQL instance using the pgvector
extension. Vector similarity searches run directly at the database engine level
via SQL cosine distance operators (<=>) in sub-millisecond execution time.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine, make_url


@dataclass(frozen=True)
class VectorRecord:
    document_id: str
    chunk_id: str
    text: str
    section: str | None
    source_type: str
    score: float


class CloudSQLVectorStore:
    """Cloud SQL PostgreSQL native vector store using pgvector."""

    def __init__(self, database_url: str) -> None:
        self.database_url = database_url
        try:
            url = make_url(database_url)
        except Exception as error:
            raise RuntimeError(f"Invalid database URL for CloudSQLVectorStore: {error}") from error

        self.is_postgres = url.get_backend_name() == "postgresql"
        self._engine: Engine = create_engine(
            database_url,
            pool_pre_ping=self.is_postgres,
        )
        self.ensure_schema()

    def ensure_schema(self) -> None:
        with self._engine.begin() as connection:
            if self.is_postgres:
                connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
                connection.execute(
                    text(
                        """
                        CREATE TABLE IF NOT EXISTS rag_chunks (
                            id SERIAL PRIMARY KEY,
                            document_id VARCHAR(255) NOT NULL,
                            chunk_id VARCHAR(255) NOT NULL,
                            source_type VARCHAR(50) NOT NULL,
                            section VARCHAR(255),
                            text TEXT NOT NULL,
                            embedding vector(3072) NOT NULL
                        );
                        """
                    )
                )
                connection.execute(
                    text(
                        """
                        CREATE INDEX IF NOT EXISTS rag_chunks_doc_source_idx 
                        ON rag_chunks (source_type, document_id);
                        """
                    )
                )
            else:
                # SQLite Fallback schema for local offline unit testing
                connection.execute(
                    text(
                        """
                        CREATE TABLE IF NOT EXISTS rag_chunks (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            document_id TEXT NOT NULL,
                            chunk_id TEXT NOT NULL,
                            source_type TEXT NOT NULL,
                            section TEXT,
                            text TEXT NOT NULL,
                            embedding_json TEXT NOT NULL
                        );
                        """
                    )
                )

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
        
        with self._engine.begin() as connection:
            connection.execute(
                text("DELETE FROM rag_chunks WHERE document_id = :document_id"),
                {"document_id": document_id},
            )
            if self.is_postgres:
                for (chunk_id, text_content, section), vector in zip(chunks, embeddings, strict=True):
                    vector_str = "[" + ",".join(str(v) for v in vector) + "]"
                    connection.execute(
                        text(
                            """
                            INSERT INTO rag_chunks (document_id, chunk_id, source_type, section, text, embedding)
                            VALUES (:document_id, :chunk_id, :source_type, :section, :text, CAST(:embedding AS vector))
                            """
                        ),
                        {
                            "document_id": document_id,
                            "chunk_id": chunk_id,
                            "source_type": source_type,
                            "section": section,
                            "text": text_content,
                            "embedding": vector_str,
                        },
                    )
            else:
                for (chunk_id, text_content, section), vector in zip(chunks, embeddings, strict=True):
                    connection.execute(
                        text(
                            """
                            INSERT INTO rag_chunks (document_id, chunk_id, source_type, section, text, embedding_json)
                            VALUES (:document_id, :chunk_id, :source_type, :section, :text, :embedding_json)
                            """
                        ),
                        {
                            "document_id": document_id,
                            "chunk_id": chunk_id,
                            "source_type": source_type,
                            "section": section,
                            "text": text_content,
                            "embedding_json": json.dumps(vector),
                        },
                    )

    def search(
        self,
        query_vector: list[float],
        *,
        source_type: str,
        document_id: str | None = None,
        limit: int = 5,
    ) -> list[VectorRecord]:
        with self._engine.connect() as connection:
            if self.is_postgres:
                vector_str = "[" + ",".join(str(v) for v in query_vector) + "]"
                if document_id is None:
                    query = text(
                        """
                        SELECT document_id, chunk_id, source_type, section, text,
                               (1 - (embedding <=> CAST(:vector AS vector))) AS score
                        FROM rag_chunks
                        WHERE source_type = :source_type
                        ORDER BY embedding <=> CAST(:vector AS vector)
                        LIMIT :limit
                        """
                    )
                    params = {"source_type": source_type, "vector": vector_str, "limit": limit}
                else:
                    query = text(
                        """
                        SELECT document_id, chunk_id, source_type, section, text,
                               (1 - (embedding <=> CAST(:vector AS vector))) AS score
                        FROM rag_chunks
                        WHERE source_type = :source_type AND document_id = :document_id
                        ORDER BY embedding <=> CAST(:vector AS vector)
                        LIMIT :limit
                        """
                    )
                    params = {
                        "source_type": source_type,
                        "document_id": document_id,
                        "vector": vector_str,
                        "limit": limit,
                    }
                rows = connection.execute(query, params).mappings().all()
                return [
                    VectorRecord(
                        document_id=row["document_id"],
                        chunk_id=row["chunk_id"],
                        source_type=row["source_type"],
                        section=row["section"],
                        text=row["text"],
                        score=float(row["score"]),
                    )
                    for row in rows
                ]
            else:
                # SQLite fallback search
                if document_id is None:
                    query = text(
                        "SELECT document_id, chunk_id, source_type, section, text, embedding_json "
                        "FROM rag_chunks WHERE source_type = :source_type"
                    )
                    params = {"source_type": source_type}
                else:
                    query = text(
                        "SELECT document_id, chunk_id, source_type, section, text, embedding_json "
                        "FROM rag_chunks WHERE source_type = :source_type AND document_id = :document_id"
                    )
                    params = {"source_type": source_type, "document_id": document_id}
                rows = connection.execute(query, params).mappings().all()
                
                def _cosine(v1: list[float], v2: list[float]) -> float:
                    dot = sum(a * b for a, b in zip(v1, v2, strict=True))
                    norm1 = math.sqrt(sum(a * a for a in v1))
                    norm2 = math.sqrt(sum(b * b for b in v2))
                    return dot / (norm1 * norm2) if norm1 and norm2 else 0.0

                import math
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
        with self._engine.connect() as connection:
            rows = connection.execute(
                text("SELECT text FROM rag_chunks WHERE document_id = :document_id"),
                {"document_id": document_id},
            ).mappings().all()
        return "\n".join(row["text"] for row in rows)
