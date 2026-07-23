from __future__ import annotations

import json
import os
from typing import Any, Literal, Protocol, TypeVar, get_origin

from google import genai
from pydantic import BaseModel, ValidationError


T = TypeVar("T", bound=BaseModel)


class StructuredOutputError(RuntimeError):
    """Raised when the model response cannot be converted to the requested schema."""


class StructuredLLM(Protocol):
    def parse(self, *, instructions: str, input_text: str, schema: type[T]) -> T:
        """Return an object conforming to the requested Pydantic schema."""


class GeminiStructuredLLM:
    """Small adapter that keeps provider-specific API details outside agent logic."""

    def __init__(self, model: str | None = None) -> None:
        if not os.environ.get("GEMINI_API_KEY"):
            raise RuntimeError("GEMINI_API_KEY is not configured")
        self.client = genai.Client()
        self.model = model or os.getenv("GEMINI_MODEL", "gemini-3.5-flash")

    def parse(self, *, instructions: str, input_text: str, schema: type[T]) -> T:
        interaction = self.client.interactions.create(
            model=self.model,
            input=(
                "<agent_instructions>\n"
                f"{instructions}\n"
                "</agent_instructions>\n\n"
                "<task_input>\n"
                f"{input_text}\n"
                "</task_input>"
            ),
            response_format={
                "type": "text",
                "mime_type": "application/json",
                "schema": schema.model_json_schema(),
            },
        )
        return parse_structured_output(interaction.output_text, schema)


def parse_structured_output(output_text: str, schema: type[T]) -> T:
    """Validate a model JSON response and apply only server-owned fixed constants.

    A model occasionally returns an old label such as ``schema_version: 1.0.0``.
    Values whose Pydantic field is a ``Literal`` *and* has a default are owned by
    this API, so the server always writes the canonical default before validation.
    All extracted document values still go through normal strict validation.
    """
    try:
        payload: Any = json.loads(output_text)
    except json.JSONDecodeError as error:
        raise StructuredOutputError("Gemini did not return valid JSON. Please retry.") from error

    if not isinstance(payload, dict):
        raise StructuredOutputError("Gemini returned a JSON value instead of a JSON object. Please retry.")

    normalized_payload = payload.copy()
    for field_name, field in schema.model_fields.items():
        # e.g. ProjectProfile.schema_version and service_type. These are API
        # protocol constants, not facts extracted from the source document.
        if get_origin(field.annotation) is Literal and not field.is_required():
            normalized_payload[field_name] = field.default

    try:
        return schema.model_validate(normalized_payload)
    except ValidationError as error:
        detail = "; ".join(
            f"{'.'.join(str(part) for part in issue['loc'])}: {issue['msg']}"
            for issue in error.errors()[:3]
        )
        raise StructuredOutputError(
            f"Gemini response did not match the required result format. Please retry. ({detail})"
        ) from error


def as_json(value: BaseModel) -> str:
    return json.dumps(value.model_dump(mode="json"), ensure_ascii=False, indent=2)

