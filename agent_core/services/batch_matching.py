"""Orchestrate full-DB ranking with optional explicit A/B reviews."""

from __future__ import annotations

from agent_core.schemas import BatchMatchRequest, BatchMatchResult, MatchRequest
from agent_core.services.agents import MatchingWorkflow
from agent_core.services.candidate_ranker import rank_instructors
from agent_core.services.instructor_profile_builder import build_instructor_profile
from agent_core.services.instructor_repository import InstructorRepository
from agent_core.services.llm import StructuredLLM
from agent_core.services.run_storage import RunStorage
from agent_core.services.evidence_retriever import EvidenceRetriever


class BatchMatchingWorkflow:
    """Rank all DB instructors and run LLM review only for requested IDs."""

    def __init__(
        self,
        repository: InstructorRepository,
        llm: StructuredLLM | None = None,
        run_storage: RunStorage | None = None,
        evidence_retriever: EvidenceRetriever | None = None,
    ) -> None:
        self.repository = repository
        self.llm = llm
        self.run_storage = run_storage
        self.evidence_retriever = evidence_retriever

    def run(self, request: BatchMatchRequest) -> BatchMatchResult:
        rankings = rank_instructors(request.project, self.repository)
        available_ids = set(self.repository.list_instructor_ids())
        unknown_ids = sorted(set(request.review_instructor_ids) - available_ids)
        if unknown_ids:
            raise ValueError(f"Unknown instructor IDs: {unknown_ids}")

        reviewed_matches = []
        if request.review_instructor_ids:
            if self.llm is None or self.run_storage is None or self.evidence_retriever is None:
                raise RuntimeError("LLM review dependencies are not configured.")

            matching_workflow = MatchingWorkflow(self.llm, self.evidence_retriever)
            for instructor_id in request.review_instructor_ids:
                profile = build_instructor_profile(
                    self.repository.get_instructor(instructor_id)
                )
                match_request = MatchRequest(project=request.project, instructor=profile)
                result = matching_workflow.run(match_request)
                run_id = self.run_storage.save_match_run(match_request, result)
                reviewed_matches.append(result.model_copy(update={"run_id": run_id}))

        return BatchMatchResult(
            total_instructors=len(rankings),
            rankings=rankings,
            reviewed_matches=reviewed_matches,
        )

