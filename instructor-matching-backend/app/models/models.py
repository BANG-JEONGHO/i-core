"""SQLAlchemy DB 모델."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone, timedelta

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

KST = timezone(timedelta(hours=9))


def now_kst() -> datetime:
    return datetime.now(KST).replace(tzinfo=None)


class Base(DeclarativeBase):
    """SQLAlchemy Base."""

    pass


def generate_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    """사용자 계정."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(200), nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_kst)


class Instructor(Base):
    """강사."""

    __tablename__ = "instructors"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    specializations: Mapped[list] = mapped_column(JSON, default=list)
    subjects: Mapped[list] = mapped_column(JSON, default=list)
    experience_years: Mapped[int] = mapped_column(Integer, default=0)
    certifications: Mapped[list] = mapped_column(JSON, default=list)
    education: Mapped[str] = mapped_column(String(200), default="")
    keywords: Mapped[list] = mapped_column(JSON, default=list)
    contact: Mapped[str | None] = mapped_column(String(200), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    email: Mapped[str | None] = mapped_column(String(200), nullable=True)
    region: Mapped[str | None] = mapped_column(String(50), nullable=True)
    affiliation: Mapped[str | None] = mapped_column(String(200), nullable=True)
    degree: Mapped[str | None] = mapped_column(String(50), nullable=True)
    school: Mapped[str | None] = mapped_column(String(200), nullable=True)
    major: Mapped[str | None] = mapped_column(String(200), nullable=True)
    main_lecture_area: Mapped[str | None] = mapped_column(Text, nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    birth_date: Mapped[str | None] = mapped_column(String(20), nullable=True)
    lecture_history: Mapped[list] = mapped_column(JSON, default=list)
    qualifications_career: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_kst)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now_kst, onupdate=now_kst)


class TaskOrder(Base):
    """과업지시서."""

    __tablename__ = "task_orders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_type: Mapped[str] = mapped_column(String(10), nullable=False)
    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    qualifications: Mapped[list] = mapped_column(JSON, default=list)
    evaluation_criteria: Mapped[list] = mapped_column(JSON, default=list)
    parsed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    uploaded_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_kst)


class InstructorSchedule(Base):
    """강사 일정."""

    __tablename__ = "instructor_schedules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    instructor_id: Mapped[str] = mapped_column(String(36), nullable=False)
    instructor_name: Mapped[str] = mapped_column(String(100), nullable=False)
    project_name: Mapped[str] = mapped_column(String(300), nullable=False)
    start_date: Mapped[str] = mapped_column(String(10), nullable=False)
    end_date: Mapped[str] = mapped_column(String(10), nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_kst)


class MatchingResult(Base):
    """매칭 결과."""

    __tablename__ = "matching_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    task_order_id: Mapped[str] = mapped_column(String(36), ForeignKey("task_orders.id"))
    results: Mapped[list] = mapped_column(JSON, nullable=False)
    top_instructors: Mapped[list] = mapped_column(JSON, default=list)
    candidates: Mapped[list] = mapped_column(JSON, default=list)
    memo: Mapped[str | None] = mapped_column(String(1000), nullable=True, default=None)
    executed_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_kst)
