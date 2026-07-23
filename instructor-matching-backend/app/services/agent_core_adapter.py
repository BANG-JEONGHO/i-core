"""Connect normalized task orders to the supplied ``agent_core`` workflow.

Document parsing remains in ``task_order_service``.  This adapter begins after
that normalized result exists: it ranks the full instructor DB, runs the A/B
agent review for the highest-ranked candidates, and saves the audit trail.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Any

from app.core.config import settings
from app.models.models import TaskOrder
from app.services.external_instructor_db import get_external_db_path


class AgentCoreConfigurationError(RuntimeError):
    """The locally supplied agent-core package or its configuration is invalid."""


def execute_agent_core_matching(task_order: TaskOrder) -> tuple[list[dict[str, Any]], list[str]]:
    """Execute agent-core synchronously; callers should use ``asyncio.to_thread``."""
    _prepare_agent_core_import()
    if not settings.GEMINI_API_KEY:
        raise AgentCoreConfigurationError(
            "GEMINI_API_KEY is not configured; agent-core analysis and verification cannot run."
        )

    from agent_core.schemas import (
        BatchMatchRequest,
        EducationRequirements,
        EvidenceRef,
        InstructorRequirements,
        ProjectBase,
        ProjectProfile,
    )
    from agent_core.services.batch_matching import BatchMatchingWorkflow
    from agent_core.services.batch_run_storage import BatchRunStorage
    from agent_core.services.evidence_retriever import EvidenceRetriever
    from agent_core.services.instructor_repository import InstructorRepository
    from agent_core.services.run_storage import RunStorage
    from agent_core.services.vector_store import LocalVectorStore

    project = _build_project_profile(
        task_order,
        ProjectProfile=ProjectProfile,
        ProjectBase=ProjectBase,
        EducationRequirements=EducationRequirements,
        InstructorRequirements=InstructorRequirements,
        EvidenceRef=EvidenceRef,
    )
    repository = InstructorRepository(database_path=Path(get_external_db_path()))
    retriever = EvidenceRetriever(
        embeddings=_ConfiguredGeminiEmbeddings(
            settings.GEMINI_API_KEY, settings.GEMINI_EMBEDDING_MODEL
        ),
        store=LocalVectorStore(Path(settings.VECTOR_STORE_PATH)),
    )
    # Index the original extracted text for RAG. If unavailable, agent_core
    # falls back to its structured project profile during retrieval.
    if task_order.raw_text and task_order.raw_text.strip():
        retriever.index_document(
            document_id=f"task-order:{task_order.id}",
            source_type="project",
            text=task_order.raw_text,
        )

    workflow = BatchMatchingWorkflow(
        repository=repository,
        llm=_ConfiguredGeminiStructuredLLM(
            settings.GEMINI_API_KEY, settings.GEMINI_MODEL
        ),
        run_storage=RunStorage(Path(settings.AGENT_RUN_STORAGE_DIR)),
        evidence_retriever=retriever,
    )

    # First phase: deterministic candidate search over every instructor.
    preliminary = workflow.run(BatchMatchRequest(project=project))
    review_limit = min(max(settings.AGENT_REVIEW_TOP_K, 0), len(preliminary.rankings), 108)
    review_ids = [
        int(_database_id(item.instructor_id))
        for item in preliminary.rankings[:review_limit]
    ]

    # Second phase: independent analysis A, verifier B, and code grounding.
    request = BatchMatchRequest(project=project, review_instructor_ids=review_ids)
    batch_result = workflow.run(request)
    BatchRunStorage(Path(settings.AGENT_BATCH_RUN_STORAGE_DIR)).save_batch_run(
        request, batch_result
    )

    reviewed_by_id = {
        instructor_id: result
        for instructor_id, result in zip(review_ids, batch_result.reviewed_matches, strict=True)
    }
    results = [_ranking_to_result(item) for item in batch_result.rankings]
    for result in results:
        review = reviewed_by_id.get(int(_database_id(result["instructor_id"])))
        if review is not None:
            result.update(_reviewed_result_to_fields(review))

    results.sort(key=lambda item: -item["total_score"])
    recommended_ids = [
        item["instructor_id"]
        for item in results
        if item.get("final_status") == "recommended"
    ][:10]
    return results, recommended_ids or [item["instructor_id"] for item in results[:10]]


def _prepare_agent_core_import() -> None:
    package_path = Path(settings.AGENT_CORE_PATH).expanduser()
    if not package_path.is_absolute():
        backend_root = Path(__file__).resolve().parents[2]
        package_path = backend_root / package_path
    if package_path.name != "agent_core" or not (package_path / "__init__.py").is_file():
        raise AgentCoreConfigurationError(
            f"AGENT_CORE_PATH must point to the agent_core package directory: {package_path}"
        )
    parent = str(package_path.parent)
    if parent not in sys.path:
        sys.path.insert(0, parent)


def _build_project_profile(
    task_order: TaskOrder,
    *,
    ProjectProfile: Any,
    ProjectBase: Any,
    EducationRequirements: Any,
    InstructorRequirements: Any,
    EvidenceRef: Any,
) -> Any:
    qualifications = task_order.qualifications or []
    criteria = task_order.evaluation_criteria or []
    requirement_texts = _descriptions(qualifications)
    criterion_texts = _descriptions(criteria)
    qualification_terms = _keywords(qualifications)
    criterion_terms = _keywords(criteria)
    source_id = f"task-order:{task_order.id}"

    required_certifications = [
        _description(item)
        for item in qualifications
        if item.get("is_mandatory") and _is_certificate_requirement(item)
    ]
    required_experience = [
        _description(item)
        for item in qualifications
        if item.get("is_mandatory") and _is_experience_requirement(item)
    ]
    evidence_text = (task_order.raw_text or "\n".join([*requirement_texts, *criterion_texts])).strip()
    evidence = (
        [
            EvidenceRef(
                source_document_id=source_id,
                section="normalized task-order requirements",
                quote=evidence_text[:1000],
                confidence=1.0,
            )
        ]
        if evidence_text
        else []
    )

    return ProjectProfile(
        program_type="vocational_training",
        classification_confidence=1.0,
        base=ProjectBase(
            project_name=task_order.file_name,
            proposal_requirements=requirement_texts,
            compliance_requirements=criterion_texts,
        ),
        education=EducationRequirements(
            technology_domains=_unique([*qualification_terms, *criterion_terms]),
            program_topics=_unique([*criterion_terms, *qualification_terms]),
            instructor_requirements=InstructorRequirements(
                required_experience=required_experience,
                required_certifications=required_certifications,
            ),
            assessment_requirements=criterion_texts,
        ),
        extensions={
            "source_task_order_id": task_order.id,
            "normalized_qualifications": qualifications,
            "normalized_evaluation_criteria": criteria,
        },
        evidence=evidence,
    )


def _ranking_to_result(ranking: Any) -> dict[str, Any]:
    score_items = [item.model_dump(mode="json") for item in ranking.score_items]
    scores = {item["criterion"]: item["score"] for item in score_items}
    return {
        "instructor_id": _database_id(ranking.instructor_id),
        "instructor_name": "",
        "total_score": ranking.retrieval_score,
        "keyword_score": scores.get("topic_tags", 0.0),
        "qualification_score": scores.get("required_certifications", 0.0),
        "experience_score": round(
            scores.get("teaching_experience", 0.0)
            + scores.get("project_and_work_experience", 0.0),
            2,
        ),
        "breakdown": [{"source": "deterministic_retrieval", **item} for item in score_items],
        "final_status": "unreviewed",
        "recommendation_reasons": (
            [f"Matched terms: {', '.join(ranking.matched_terms)}"]
            if ranking.matched_terms
            else []
        ),
        "grounding_verdict": None,
        "agent_run_id": None,
        "agent_review": None,
    }


def _reviewed_result_to_fields(review: Any) -> dict[str, Any]:
    analysis_items = [item.model_dump(mode="json") for item in review.analysis.score_items]
    verification_items = [
        item.model_dump(mode="json") for item in review.verification.corrected_score_items
    ]
    analysis_scores = {item["criterion"]: item["score"] for item in analysis_items}
    return {
        "total_score": review.final_score,
        "keyword_score": analysis_scores.get("topic_match", 0.0),
        "qualification_score": analysis_scores.get("career_and_certification", 0.0),
        "experience_score": round(
            analysis_scores.get("teaching_depth", 0.0)
            + analysis_scores.get("audience_fit", 0.0),
            2,
        ),
        "breakdown": [
            *[{"source": "agent_a", **item} for item in analysis_items],
            *[{"source": "agent_b", **item} for item in verification_items],
        ],
        "final_status": review.final_status.value,
        "recommendation_reasons": review.reasons,
        "grounding_verdict": review.grounding.verdict if review.grounding else None,
        "agent_run_id": review.run_id,
        "agent_review": review.model_dump(mode="json"),
    }


class _ConfiguredGeminiStructuredLLM:
    """Implement agent_core's StructuredLLM protocol using app settings."""

    def __init__(self, api_key: str, model: str) -> None:
        from google import genai
        from google.genai import types

        self.client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(
                client_args={"trust_env": settings.GEMINI_USE_ENV_PROXY}
            ),
        )
        self.model = model

    def parse(self, *, instructions: str, input_text: str, schema: Any) -> Any:
        from agent_core.services.llm import parse_structured_output

        interaction = self.client.interactions.create(
            model=self.model,
            input=(
                "<agent_instructions>\n" + instructions + "\n</agent_instructions>\n\n"
                "<task_input>\n" + input_text + "\n</task_input>"
            ),
            response_format={
                "type": "text",
                "mime_type": "application/json",
                "schema": schema.model_json_schema(),
            },
        )
        return parse_structured_output(interaction.output_text, schema)


class _ConfiguredGeminiEmbeddings:
    def __init__(self, api_key: str, model: str) -> None:
        from google import genai
        from google.genai import types

        self.client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(
                client_args={"trust_env": settings.GEMINI_USE_ENV_PROXY}
            ),
        )
        self.model = model

    def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        try:
            response = self.client.models.embed_content(model=self.model, contents=texts)
            embeddings = getattr(response, "embeddings", None)
            if embeddings is None:
                embeddings = [getattr(response, "embedding")]
            return [list(item.values) for item in embeddings]
        except Exception as error:
            raise RuntimeError("Gemini embeddings could not be generated.") from error


def _database_id(value: str) -> str:
    return value.removeprefix("instructor-")


def _description(item: dict[str, Any]) -> str:
    return str(item.get("description", "")).strip()


def _descriptions(items: list[dict[str, Any]]) -> list[str]:
    return _unique([_description(item) for item in items])


def _keywords(items: list[dict[str, Any]]) -> list[str]:
    return _unique(
        [
            str(keyword).strip()
            for item in items
            for keyword in item.get("keywords", [])
            if str(keyword).strip()
        ]
    )


def _is_certificate_requirement(item: dict[str, Any]) -> bool:
    text = " ".join([str(item.get("category", "")), _description(item)]).lower()
    return any(token in text for token in ("자격", "인증", "certificate", "certification"))


def _is_experience_requirement(item: dict[str, Any]) -> bool:
    text = " ".join([str(item.get("category", "")), _description(item)]).lower()
    return any(token in text for token in ("경력", "경험", "실적", "experience"))


def _unique(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        normalized = re.sub(r"\s+", " ", value).strip()
        key = normalized.casefold()
        if normalized and key not in seen:
            seen.add(key)
            result.append(normalized)
    return result
