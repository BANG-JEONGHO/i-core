from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor

from agent_core.schemas import (
    InstructorProfile,
    MatchAnalysis,
    MatchRequest,
    MergedMatchResult,
    ProjectAnalysisRequest,
    ProjectProfile,
    RAGContext,
    VerificationResult,
)
from agent_core.services.llm import StructuredLLM, as_json
from agent_core.services.matching import merge_results
from agent_core.services.prompts import load_prompt
from agent_core.services.evidence_retriever import EvidenceRetriever


class ProjectAnalyzerAgent:
    def __init__(self, llm: StructuredLLM) -> None:
        self.llm = llm

    def run(self, request: ProjectAnalysisRequest) -> ProjectProfile:
        input_text = (
            f"source_document_id: {request.source_document_id}\n"
            f"source_name: {request.source_name}\n"
            "<source_document>\n"
            f"{request.text}\n"
            "</source_document>"
        )
        return self.llm.parse(
            instructions=load_prompt("project_analyzer.md"),
            input_text=input_text,
            schema=ProjectProfile,
        )


class MatchAnalystAgent:
    def __init__(self, llm: StructuredLLM) -> None:
        self.llm = llm

    def run(
        self,
        project: ProjectProfile,
        instructor: InstructorProfile,
        context: RAGContext,
    ) -> MatchAnalysis:
        return self.llm.parse(
            instructions=load_prompt("match_analyst.md"),
            input_text=(
                f"PROJECT\n{as_json(project)}\n\n"
                f"INSTRUCTOR\n{as_json(instructor)}\n\n"
                f"RETRIEVED_EVIDENCE\n{as_json(context)}"
            ),
            schema=MatchAnalysis,
        )


class MatchVerifierAgent:
    def __init__(self, llm: StructuredLLM) -> None:
        self.llm = llm

    def run(
        self,
        project: ProjectProfile,
        instructor: InstructorProfile,
        context: RAGContext,
    ) -> VerificationResult:
        return self.llm.parse(
            instructions=load_prompt("match_verifier.md"),
            input_text=(
                f"PROJECT\n{as_json(project)}\n\n"
                f"INSTRUCTOR\n{as_json(instructor)}\n\n"
                f"RETRIEVED_EVIDENCE\n{as_json(context)}"
            ),
            schema=VerificationResult,
        )


class MatchingWorkflow:
    def __init__(self, llm: StructuredLLM, evidence_retriever: EvidenceRetriever) -> None:
        self.analyst = MatchAnalystAgent(llm)
        self.verifier = MatchVerifierAgent(llm)
        self.evidence_retriever = evidence_retriever

    def run(self, request: MatchRequest) -> MergedMatchResult:
        # Keep B independent: it receives the source evidence, never A's result.
        from agent_core.services.evidence_validator import validate_grounding

        context = self.evidence_retriever.retrieve(request.project, request.instructor)
        # A and B are independent: each receives only project, instructor, and
        # evidence. They can therefore run in parallel without weakening B.
        # The backend adapter applies a shared limit to outgoing LLM calls.
        with ThreadPoolExecutor(max_workers=2, thread_name_prefix="match-review") as executor:
            analysis_future = executor.submit(
                self.analyst.run, request.project, request.instructor, context
            )
            verification_future = executor.submit(
                self.verifier.run, request.project, request.instructor, context
            )
            analysis = analysis_future.result()
            verification = verification_future.result()
        grounding = validate_grounding(
            request.project, request.instructor, analysis, verification, context
        )
        return merge_results(analysis, verification, grounding).model_copy(
            update={"rag_context": context}
        )


