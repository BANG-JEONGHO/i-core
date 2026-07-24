"""Authenticated instructor availability management endpoints."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.models.models import InstructorSchedule, User

router = APIRouter(prefix="/api/schedules", tags=["schedules"])


class ScheduleCreate(BaseModel):
    instructor_id: str
    instructor_name: str = Field(min_length=1, max_length=100)
    project_name: str = Field(min_length=1, max_length=300)
    start_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    end_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    note: str | None = Field(default=None, max_length=2000)


class ScheduleResponse(ScheduleCreate):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("/", response_model=ScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_schedule(
    body: ScheduleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.end_date < body.start_date:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="end_date must not precede start_date")
    schedule = InstructorSchedule(**body.model_dump(), created_by=current_user.id)
    db.add(schedule)
    await db.flush()
    return ScheduleResponse.model_validate(schedule)


@router.get("/", response_model=list[ScheduleResponse])
async def list_schedules(
    instructor_id: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(InstructorSchedule).order_by(InstructorSchedule.start_date.desc())
    if instructor_id:
        query = query.where(InstructorSchedule.instructor_id == instructor_id)
    result = await db.execute(query)
    return [ScheduleResponse.model_validate(item) for item in result.scalars().all()]


@router.get("/conflicts")
async def check_conflicts(
    start_date: str = Query(pattern=r"^\d{4}-\d{2}-\d{2}$"),
    end_date: str = Query(pattern=r"^\d{4}-\d{2}-\d{2}$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if end_date < start_date:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="end_date must not precede start_date")
    result = await db.execute(
        select(InstructorSchedule).where(
            InstructorSchedule.start_date <= end_date,
            InstructorSchedule.end_date >= start_date,
        )
    )
    schedules = result.scalars().all()
    details = {
        item.instructor_id: {
            "instructor_name": item.instructor_name,
            "project_name": item.project_name,
            "start_date": item.start_date,
            "end_date": item.end_date,
        }
        for item in schedules
    }
    return {"conflicting_instructor_ids": list(details), "details": details}


@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_schedule(
    schedule_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    schedule = await db.get(InstructorSchedule, schedule_id)
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule was not found")
    await db.delete(schedule)
