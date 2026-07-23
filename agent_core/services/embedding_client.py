"""Provider adapter for embeddings used by the local vector store."""

from __future__ import annotations

import os
from typing import Protocol

from google import genai


class EmbeddingProvider(Protocol):
    def embed(self, texts: list[str]) -> list[list[float]]:
        """Return one embedding vector per input text."""


class GeminiEmbeddingClient:
    """Use Gemini embeddings while keeping provider details outside RAG logic."""

    def __init__(self, model: str | None = None) -> None:
        if not os.environ.get("GEMINI_API_KEY"):
            raise RuntimeError("GEMINI_API_KEY is not configured")
        self.client = genai.Client()
        self.model = model or os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001")

    def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        try:
            response = self.client.models.embed_content(model=self.model, contents=texts)
            embeddings = getattr(response, "embeddings", None)
            if embeddings is None:
                embeddings = [getattr(response, "embedding")]
            return [list(item.values) for item in embeddings]
        except Exception as error:  # provider exceptions vary by SDK version
            raise RuntimeError("Gemini embeddings could not be generated.") from error
