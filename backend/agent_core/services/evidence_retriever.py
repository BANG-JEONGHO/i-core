"""Retrieve original project and instructor evidence for one matching decision."""

from __future__ import annotations

from agent_core.schemas import EvidenceRef, InstructorProfile, ProjectProfile, RAGContext, RetrievedEvidence
from agent_core.services.document_chunker import chunk_text
from agent_core.services.embedding_client import EmbeddingProvider
from agent_core.services.llm import as_json
from agent_core.services.vector_store import LocalVectorStore, VectorRecord


class EvidenceRetriever:
    def __init__(self, embeddings: EmbeddingProvider, store: LocalVectorStore) -> None:
        self.embeddings = embeddings
        self.store = store

    def index_document(self, *, document_id: str, source_type: str, text: str) -> int:
        chunks = chunk_text(text)
        if not chunks:
            return 0
        vectors = self.embeddings.embed([chunk.text for chunk in chunks])
        self.store.replace_document(
            document_id=document_id,
            source_type=source_type,
            chunks=[(chunk.chunk_id, chunk.text, chunk.section) for chunk in chunks],
            embeddings=vectors,
        )
        return len(chunks)

    def retrieve(self, project: ProjectProfile, instructor: InstructorProfile) -> RAGContext:
        project_id = _project_document_id(project)
        project_fallback = _profile_source_text(project)
        if not self.store.document_text(project_id):
            self.index_document(document_id=project_id, source_type="project", text=project_fallback)

        instructor_document_ids = [
            document_id
            for document_id in instructor.source_document_ids
            if self.store.document_text(document_id)
        ]
        # DB-only candidates still work before the original resume is indexed,
        # but a real indexed resume always takes precedence.
        if not instructor_document_ids:
            fallback_id = f"rag:{instructor.instructor_id}:{instructor.profile_version}"
            self.index_document(
                document_id=fallback_id,
                source_type="instructor",
                text=_profile_source_text(instructor),
            )
            instructor_document_ids = [fallback_id]

        project_vector = self.embeddings.embed([_project_query(project)])[0]
        return RAGContext(
            project_evidence=_as_evidence(
                self.store.search(project_vector, source_type="project", document_id=project_id),
                "project",
            ),
            instructor_evidence=_as_evidence(
                _top_records(
                    [
                        record
                        for document_id in instructor_document_ids
                        for record in self.store.search(
                            project_vector,
                            source_type="instructor",
                            document_id=document_id,
                        )
                    ]
                ),
                "instructor",
            ),
        )


def _as_evidence(records: list[VectorRecord], source_type: str) -> list[RetrievedEvidence]:
    return [
        RetrievedEvidence(
            source_type=source_type,
            retrieval_score=round(max(record.score, 0.0), 4),
            evidence=EvidenceRef(
                source_document_id=record.document_id,
                section=record.section or f"chunk {record.chunk_id}",
                quote=record.text,
                confidence=1.0,
            ),
        )
        for record in records
    ]


def _top_records(records: list[VectorRecord], limit: int = 5) -> list[VectorRecord]:
    return sorted(records, key=lambda record: record.score, reverse=True)[:limit]


def _project_document_id(project: ProjectProfile) -> str:
    if project.evidence:
        return project.evidence[0].source_document_id
    return f"project-profile:{project.base.project_name or 'unknown'}"


def _profile_source_text(profile: ProjectProfile | InstructorProfile) -> str:
    evidence_quotes = [item.quote for item in profile.evidence]
    return "\n".join([as_json(profile), *evidence_quotes])


def _project_query(project: ProjectProfile) -> str:
    return "\n".join(
        [
            *project.education.technology_domains,
            *project.education.program_topics,
            *project.education.curriculum_requirements,
            *project.education.instructor_requirements.required_experience,
            *project.education.instructor_requirements.required_certifications,
            *project.education.instructor_requirements.required_vendor_credentials,
        ]
    ) or as_json(project)
