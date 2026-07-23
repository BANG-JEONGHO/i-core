"""강사 포털 API (로그인 불필요) — 강사가 직접 이력서 업로드 및 일정 관리."""

from fastapi import APIRouter, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

from app.db.database import get_db
from app.models.models import InstructorSchedule

router = APIRouter(prefix="/api/portal", tags=["instructor-portal"])


class PortalScheduleCreate(BaseModel):
    instructor_id: str
    instructor_name: str
    project_name: str
    start_date: str
    end_date: str
    note: str | None = None


class PortalScheduleResponse(BaseModel):
    id: str
    instructor_id: str
    instructor_name: str
    project_name: str
    start_date: str
    end_date: str
    note: str | None

    class Config:
        from_attributes = True


@router.get("/instructors")
async def list_instructor_names(db: AsyncSession = Depends(get_db)):
    """강사 이름 목록 조회 (포털 드롭다운용)."""
    from app.services.external_instructor_db import list_all_instructor_profiles
    profiles = await list_all_instructor_profiles()
    return [{"id": p.id, "name": p.name} for p in profiles]


@router.get("/schedules/{instructor_id}", response_model=list[PortalScheduleResponse])
async def get_my_schedules(instructor_id: str, db: AsyncSession = Depends(get_db)):
    """강사 본인의 일정 조회."""
    result = await db.execute(
        select(InstructorSchedule)
        .where(InstructorSchedule.instructor_id == instructor_id)
        .order_by(InstructorSchedule.start_date.desc())
    )
    return [PortalScheduleResponse.model_validate(s) for s in result.scalars().all()]


@router.post("/schedules", response_model=PortalScheduleResponse, status_code=201)
async def create_schedule(body: PortalScheduleCreate, db: AsyncSession = Depends(get_db)):
    """강사가 직접 일정 등록."""
    schedule = InstructorSchedule(
        instructor_id=body.instructor_id,
        instructor_name=body.instructor_name,
        project_name=body.project_name,
        start_date=body.start_date,
        end_date=body.end_date,
        note=body.note,
    )
    db.add(schedule)
    await db.flush()
    return PortalScheduleResponse.model_validate(schedule)


@router.delete("/schedules/{schedule_id}", status_code=204)
async def delete_schedule(schedule_id: str, db: AsyncSession = Depends(get_db)):
    """강사가 직접 일정 삭제."""
    schedule = await db.get(InstructorSchedule, schedule_id)
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    await db.delete(schedule)


@router.post("/resume/{instructor_id}")
async def upload_resume(instructor_id: str, file: UploadFile, db: AsyncSession = Depends(get_db)):
    """강사가 이력서 파일 업로드 (관리자에게 전달용)."""
    import os
    from pathlib import Path
    from datetime import datetime

    save_dir = Path("uploads/resumes") / datetime.now().strftime("%Y/%m")
    save_dir.mkdir(parents=True, exist_ok=True)
    save_path = save_dir / f"{instructor_id}_{file.filename}"

    content = await file.read()
    with open(save_path, "wb") as f:
        f.write(content)

    return {
        "message": "이력서 업로드 완료",
        "file_name": file.filename,
        "instructor_id": instructor_id,
        "path": str(save_path),
    }
