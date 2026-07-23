"""Build the LLM-safe InstructorProfile contract from normalized DB rows."""

from __future__ import annotations

import hashlib
import json
import re
from typing import Any

from agent_core.schemas import (
    Certification,
    EvidenceRef,
    InstructorProfile,
    ProjectExperienceItem,
    TeachingItem,
    WorkExperienceItem,
)
from agent_core.services.instructor_repository import InstructorDatabaseRecord


class InstructorProfileBuildError(ValueError):
    """Raised when a DB record cannot form a safe, useful matching profile."""


_CATEGORY_ALIASES = {
    "강/": "강의",
    "학습이수": "교육이수",
}


def build_instructor_profile(record: InstructorDatabaseRecord) -> InstructorProfile:
    """Convert one normalized DB bundle into the existing agent input contract.

    Private fields are absent from ``InstructorDatabaseRecord`` by design.  Each
    child record preserves its source workbook/sheet/row as an EvidenceRef.
    """
    instructor = record.instructor
    expertise_tags = _expertise_tags(instructor, record.lectures_projects)
    if not expertise_tags:
        raise InstructorProfileBuildError(
            f"Instructor {instructor['id']} has no usable expertise tags."
        )

    teaching_items: list[TeachingItem] = []
    project_items: list[ProjectExperienceItem] = []
    vendor_experience: list[str] = []

    for row in record.lectures_projects:
        category = _normalized_category(row["category"])
        evidence = _row_evidence(row, row.get("course_project_name") or row.get("keyword"))

        if category == "강의":
            topic = _clean(row.get("course_project_name")) or _clean(row.get("keyword"))
            if topic:
                teaching_items.append(
                    TeachingItem(
                        topic=topic,
                        organization=_clean(row.get("client_name")),
                        hours=_hours(row.get("hours")),
                        evidence=[evidence] if evidence else [],
                    )
                )

        elif category == "프로젝트":
            title = _clean(row.get("course_project_name")) or _clean(row.get("keyword"))
            if title:
                project_items.append(
                    ProjectExperienceItem(
                        title=title,
                        client_organization=_clean(row.get("client_name")),
                        role=_clean(row.get("role")),
                        start_date=_clean(row.get("start_month")),
                        end_date=_clean(row.get("end_month")),
                        keywords=_split_tags(row.get("keyword")),
                        evidence=[evidence] if evidence else [],
                    )
                )
                vendor_experience.append(_experience_label(row))

    certifications: list[Certification] = []
    work_experience_items: list[WorkExperienceItem] = []
    vendor_certifications: list[str] = []
    other_records: list[dict[str, object]] = []

    for row in record.certificates_careers:
        category = _normalized_category(row["category"])
        detail = _clean(row.get("detail"))
        evidence = _row_evidence(row, detail)

        if category == "자격증" and detail:
            certifications.append(
                Certification(
                    name=detail,
                    issuer=_clean(row.get("institution_company")),
                    evidence=[evidence] if evidence else [],
                )
            )
            vendor_certifications.append(detail)

        elif category == "회사경력" and detail:
            work_experience_items.append(
                WorkExperienceItem(
                    organization=_clean(row.get("institution_company")),
                    summary=detail,
                    start_date=_clean(row.get("start_month")),
                    end_date=_clean(row.get("end_month")),
                    evidence=[evidence] if evidence else [],
                )
            )
            vendor_experience.append(_experience_label(row))

        elif detail:
            other_records.append(
                {
                    "category": category,
                    "detail": detail,
                    "organization": _clean(row.get("institution_company")),
                    "start_date": _clean(row.get("start_month")),
                    "end_date": _clean(row.get("end_month")),
                }
            )

    summary = _clean(instructor.get("summary")) or ", ".join(expertise_tags[:5])
    profile_evidence = _base_evidence(instructor, summary)

    return InstructorProfile(
        instructor_id=f"instructor-{instructor['id']}",
        profile_version=_profile_version(record),
        display_name=instructor["name"],
        expertise_tags=expertise_tags,
        summary=summary,
        vendor_experience=_unique(vendor_experience),
        vendor_certifications=_unique(vendor_certifications),
        teaching_items=teaching_items,
        project_items=project_items,
        work_experience_items=work_experience_items,
        certifications=certifications,
        source_document_ids=_source_document_ids(
            [
                *[item.evidence for item in teaching_items],
                *[item.evidence for item in project_items],
                *[item.evidence for item in work_experience_items],
                *[item.evidence for item in certifications],
                [profile_evidence] if profile_evidence else [],
            ]
        ),
        extensions={"other_records": other_records} if other_records else {},
        evidence=[profile_evidence] if profile_evidence else [],
    )


def _expertise_tags(
    instructor: dict[str, Any],
    lectures_projects: list[dict[str, Any]],
) -> list[str]:
    tags = _split_tags(instructor.get("tech_stack"))
    tags.extend(_split_tags(instructor.get("main_lecture_fields")))
    tags.extend(
        tag
        for row in lectures_projects
        for tag in _split_tags(row.get("keyword"))
    )
    return _unique(tags)


def _row_evidence(row: dict[str, Any], quote: str | None) -> EvidenceRef | None:
    if not quote:
        return None
    source_file = _clean(row.get("source_file")) or "internal_instructor_database"
    sheet = _clean(row.get("source_sheet")) or "unknown_sheet"
    source_row = row.get("source_row")
    section = f"{sheet} row {source_row}" if source_row else sheet
    return EvidenceRef(
        source_document_id=f"instructor-source:{source_file}",
        section=section,
        quote=quote,
        confidence=1.0,
    )


def _base_evidence(instructor: dict[str, Any], summary: str) -> EvidenceRef | None:
    if not summary:
        return None
    return EvidenceRef(
        source_document_id=f"instructor-db:{instructor['id']}",
        section="instructors",
        quote=summary,
        confidence=1.0,
    )


def _profile_version(record: InstructorDatabaseRecord) -> str:
    """A content hash makes cached results invalid when DB matching data changes."""
    payload = json.dumps(
        {
            "instructor": record.instructor,
            "lectures_projects": record.lectures_projects,
            "certificates_careers": record.certificates_careers,
        },
        ensure_ascii=False,
        sort_keys=True,
        default=str,
    )
    return f"db-{hashlib.sha256(payload.encode()).hexdigest()[:12]}"


def _normalized_category(value: Any) -> str:
    category = _clean(value) or "unknown"
    return _CATEGORY_ALIASES.get(category, category)


def _clean(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text if text and text != "-" else None


def _split_tags(value: Any) -> list[str]:
    text = _clean(value)
    if not text:
        return []
    return [item.strip() for item in re.split(r"[,\n;/]", text) if item.strip()]


def _hours(value: Any) -> int | None:
    text = _clean(value)
    if not text:
        return None
    match = re.fullmatch(r"(\d+)\s*(?:시간)?", text)
    return int(match.group(1)) if match else None


def _experience_label(row: dict[str, Any]) -> str:
    organization = _clean(row.get("client_name") or row.get("institution_company"))
    detail = _clean(row.get("course_project_name") or row.get("detail"))
    return " - ".join(part for part in [organization, detail] if part)


def _unique(values: list[str]) -> list[str]:
    seen: set[str] = set()
    unique_values: list[str] = []
    for value in values:
        key = value.casefold()
        if key not in seen:
            seen.add(key)
            unique_values.append(value)
    return unique_values


def _source_document_ids(evidence_groups: list[list[EvidenceRef]]) -> list[str]:
    return _unique(
        [evidence.source_document_id for group in evidence_groups for evidence in group]
    )

