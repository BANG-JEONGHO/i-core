"""Build and pre-index all instructor profiles into LocalVectorStore.

This batch script reads normalized instructor records from the database and
generates RAG vector embeddings using Gemini Embedding API in advance.
Subsequent matching requests will query the pre-built vector database directly,
bypassing on-demand real-time embedding for speed.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.core.config import settings
from app.services.agent_core_adapter import (
    _ConfiguredGeminiEmbeddings,
    _prepare_agent_core_import,
)
from app.services.external_instructor_db import get_external_database_sync_url


def build_vector_store() -> None:
    _prepare_agent_core_import()

    api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        print("[ERROR] GEMINI_API_KEY environment variable is not set. Please pass GEMINI_API_KEY or set it in environment.")
        sys.exit(1)

    from agent_core.services.evidence_retriever import EvidenceRetriever, _profile_source_text
    from agent_core.services.instructor_profile_builder import build_instructor_profile
    from agent_core.services.instructor_repository import InstructorRepository
    from agent_core.services.vector_store import LocalVectorStore

    db_url = get_external_database_sync_url()
    print(f"[INFO] Connecting to Instructor Repository: {db_url}")
    repo = InstructorRepository(database_url=db_url)

    vector_store_path = Path(settings.VECTOR_STORE_PATH)

    embeddings = _ConfiguredGeminiEmbeddings(
        api_key, settings.GEMINI_EMBEDDING_MODEL
    )
    store = LocalVectorStore(vector_store_path)
    retriever = EvidenceRetriever(embeddings=embeddings, store=store)

    instructor_ids = repo.list_instructor_ids()
    print(f"[INFO] Found {len(instructor_ids)} instructors in database. Starting pre-indexing...")

    indexed_count = 0
    total_chunks = 0

    for i, instructor_id in enumerate(instructor_ids, start=1):
        try:
            record = repo.get_instructor(instructor_id)
            profile = build_instructor_profile(record)
            fallback_id = f"rag:{profile.instructor_id}:{profile.profile_version}"

            # Pre-index fallback document text if not already stored
            if not store.document_text(fallback_id):
                text = _profile_source_text(profile)
                chunks_count = retriever.index_document(
                    document_id=fallback_id,
                    source_type="instructor",
                    text=text,
                )
                indexed_count += 1
                total_chunks += chunks_count
                print(f"  [{i}/{len(instructor_ids)}] Indexed Instructor #{instructor_id} ({profile.display_name}) -> {chunks_count} chunks")
            else:
                print(f"  [{i}/{len(instructor_ids)}] Already indexed Instructor #{instructor_id} ({profile.display_name}), skipping.")
        except Exception as error:
            print(f"  [WARN] Skipping Instructor #{instructor_id} due to build/indexing error: {error}")

    print(f"\n[SUCCESS] Pre-indexing complete! New indexed instructors: {indexed_count}, Total new chunks: {total_chunks}")
    print(f"[INFO] Vector Store location: {vector_store_path.resolve()}")


if __name__ == "__main__":
    build_vector_store()
