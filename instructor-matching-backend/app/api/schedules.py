"""강사 일정 관리 API."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.models.models import InstructorSchedule, User

router = APIRouter(prefix="/api/schedules", tags=["schedules"])


class ScheduleCreate(BaseModel):
    instructor_id: str
    instructor_name: str
    project_name: str
    start_date: str  # YYYY-MM-DD
    end_date: str    # YYYY-MM-DD
    note: str | None = None


class ScheduleResponse(BaseModel):
    id: str
    instructor_id: str
    instructor_name: str
    project_name: str
    start_date: str
    end_date: str
    note: str | None
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("/", response_model=ScheduleResponse, status_code=201)
async def create_schedule(
    body: ScheduleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """강사 일정 등록."""
    schedule = InstructorSchedule(
        instructor_id=body.instructor_id,
        instructor_name=body.instructor_name,
        project_name=body.project_name,
        start_date=body.start_date,
        end_date=body.end_date,
        note=body.note,
        created_by=current_user.id,
    )
    db.add(schedule)
    await db.flush()
    return ScheduleResponse.model_validate(schedule)


@router.get("/", response_model=list[ScheduleResponse])
async def list_schedules(
    instructor_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """강사 일정 목록 조회. instructor_id 로 필터 가능."""
    query = select(InstructorSchedule).order_by(InstructorSchedule.start_date.desc())
    if instructor_id:
        query = query.where(InstructorSchedule.instructor_id == instructor_id)
    result = await db.execute(query)
    return [ScheduleResponse.model_validate(s) for s in result.scalars().all()]


@router.get("/conflicts")
async def check_conflicts(
    start_date: str = Query(...),
    end_date: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """특정 기간과 겹치는 강사 ID 목록 조회."""
    # 기간 겹침: schedule.start <= end_date AND schedule.end >= start_date
    result = await db.execute(
        select(InstructorSchedule).where(
            InstructorSchedule.start_date <= end_date,
            InstructorSchedule.end_date >= start_date,
        )
    )
    schedules = result.scalars().all()
    conflicts = {}
    for s in schedules:
        conflicts[s.instructor_id] = {
            "instructor_name": s.instructor_name,
            "project_name": s.project_name,
            "start_date": s.start_date,
            "end_date": s.end_date,
        }
    return {"conflicting_instructor_ids": list(conflicts.keys()), "details": conflicts}


@router.delete("/{schedule_id}", status_code=204)
async def delete_schedule(
    schedule_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """강사 일정 삭제."""
    schedule = await db.get(InstructorSchedule, schedule_id)
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    await db.delete(schedule)
