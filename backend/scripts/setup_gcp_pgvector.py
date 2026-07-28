"""Pre-index all instructor profiles into GCP Cloud SQL (PostgreSQL + pgvector).

This script connects directly to the Cloud SQL PostgreSQL database instance,
enables the 'vector' extension if not present, creates the 'rag_chunks' table,
and populates embeddings for all registered instructors using Gemini Embedding API.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

from sqlalchemy import text

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Ensure UTF-8 stdout encoding on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from app.core.config import settings
from app.services.agent_core_adapter import (
    _ConfiguredGeminiEmbeddings,
    _prepare_agent_core_import,
)
from app.services.external_instructor_db import get_external_database_sync_url


def setup_gcp_pgvector() -> None:
    _prepare_agent_core_import()

    api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        print("[ERROR] GEMINI_API_KEY environment variable is not set. Please pass GEMINI_API_KEY.")
        sys.exit(1)

    from agent_core.services.cloud_sql_vector_store import CloudSQLVectorStore
    from agent_core.services.evidence_retriever import EvidenceRetriever, _profile_source_text
    from agent_core.services.instructor_profile_builder import build_instructor_profile
    from agent_core.services.instructor_repository import InstructorRepository
    from sqlalchemy import text

    db_url = get_external_database_sync_url()
    print(f"[INFO] Connecting to GCP Cloud SQL Database: {db_url}")
    
    repo = InstructorRepository(database_url=db_url)
    embeddings = _ConfiguredGeminiEmbeddings(api_key, settings.GEMINI_EMBEDDING_MODEL)
    
    # Initialize CloudSQLVectorStore and recreate schema with 3072 vector dimension
    cloud_vector_store = CloudSQLVectorStore(database_url=db_url)
    with cloud_vector_store._engine.begin() as conn:
        if cloud_vector_store.is_postgres:
            conn.execute(text("DROP TABLE IF EXISTS rag_chunks;"))
            
    cloud_vector_store.ensure_schema()
    retriever = EvidenceRetriever(embeddings=embeddings, store=cloud_vector_store)

    instructor_ids = repo.list_instructor_ids()
    print(f"[INFO] Found {len(instructor_ids)} instructors in Cloud SQL. Starting pre-indexing...")

    indexed_count = 0
    total_chunks = 0

    for i, instructor_id in enumerate(instructor_ids, start=1):
        try:
            record = repo.get_instructor(instructor_id)
            profile = build_instructor_profile(record)
            fallback_id = f"rag:{profile.instructor_id}:{profile.profile_version}"

            if not cloud_vector_store.document_text(fallback_id):
                text = _profile_source_text(profile)
                chunks_count = retriever.index_document(
                    document_id=fallback_id,
                    source_type="instructor",
                    text=text,
                )
                indexed_count += 1
                total_chunks += chunks_count
                print(f"  [{i}/{len(instructor_ids)}] Pre-indexed Instructor #{instructor_id} ({profile.display_name}) -> {chunks_count} vector chunks")
            else:
                print(f"  [{i}/{len(instructor_ids)}] Instructor #{instructor_id} ({profile.display_name}) already indexed in Cloud SQL.")
        except Exception as error:
            print(f"  [WARN] Skipping Instructor #{instructor_id} due to error: {error}")

    print(f"\n[SUCCESS] GCP Cloud SQL pgvector pre-indexing complete!")
    print(f"[INFO] New indexed instructors: {indexed_count}, Total vector chunks: {total_chunks}")


if __name__ == "__main__":
    setup_gcp_pgvector()
