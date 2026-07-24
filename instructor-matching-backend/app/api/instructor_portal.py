"""Public instructor portal for resume delivery and self-reported schedules."""

from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.database import get_db
from app.models.models import Instructor, InstructorSchedule
from app.services.external_instructor_db import list_all_instructor_profiles

router = APIRouter(prefix="/api/portal", tags=["instructor-portal"])


class PortalRegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class PortalScheduleCreate(BaseModel):
    instructor_id: str
    instructor_name: str = Field(min_length=1, max_length=100)
    project_name: str = Field(min_length=1, max_length=300)
    start_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    end_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    note: str | None = Field(default=None, max_length=2000)


class PortalScheduleResponse(PortalScheduleCreate):
    id: str

    class Config:
        from_attributes = True


@router.get("/instructors")
async def list_instructors(db: AsyncSession = Depends(get_db)):
    external = await list_all_instructor_profiles()
    local = (await db.execute(select(Instructor))).scalars().all()
    names: dict[str, str] = {item.id: item.name for item in external}
    names.update({item.id: item.name for item in local})
    return [{"id": instructor_id, "name": name} for instructor_id, name in sorted(names.items(), key=lambda item: item[1])]


@router.post("/register")
async def register_instructor(body: PortalRegisterRequest, db: AsyncSession = Depends(get_db)):
    name = body.name.strip()
    external = await list_all_instructor_profiles()
    found = next((item for item in external if item.name == name), None)
    if found:
        return {"instructor_id": found.id, "name": found.name, "is_new": False}

    result = await db.execute(select(Instructor).where(Instructor.name == name))
    existing = result.scalar_one_or_none()
    if existing:
        return {"instructor_id": existing.id, "name": existing.name, "is_new": False}

    instructor = Instructor(name=name, specializations=[], subjects=[], certifications=[], keywords=[])
    db.add(instructor)
    await db.flush()
    return {"instructor_id": instructor.id, "name": instructor.name, "is_new": True}


@router.get("/schedules/{instructor_id}", response_model=list[PortalScheduleResponse])
async def get_schedules(instructor_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(InstructorSchedule)
        .where(InstructorSchedule.instructor_id == instructor_id)
        .order_by(InstructorSchedule.start_date.desc())
    )
    return [PortalScheduleResponse.model_validate(item) for item in result.scalars().all()]


@router.post("/schedules", response_model=PortalScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_schedule(body: PortalScheduleCreate, db: AsyncSession = Depends(get_db)):
    if body.end_date < body.start_date:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="end_date must not precede start_date")
    schedule = InstructorSchedule(**body.model_dump())
    db.add(schedule)
    await db.flush()
    return PortalScheduleResponse.model_validate(schedule)


@router.delete("/schedules/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_schedule(schedule_id: str, db: AsyncSession = Depends(get_db)):
    schedule = await db.get(InstructorSchedule, schedule_id)
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule was not found")
    await db.delete(schedule)


@router.post("/resume/{instructor_id}")
async def upload_resume(instructor_id: str, file: UploadFile, db: AsyncSession = Depends(get_db)):
    """Store the submitted file for subsequent staff review; it is not auto-ingested into the private CV DB."""
    file_name = Path(file.filename or "resume.bin").name
    save_dir = Path(settings.UPLOAD_DIR) / "resumes" / datetime.now().strftime("%Y/%m")
    save_dir.mkdir(parents=True, exist_ok=True)
    save_path = save_dir / f"{instructor_id}_{file_name}"
    content = await file.read()
    with save_path.open("wb") as output:
        output.write(content)
    return {"message": "resume uploaded", "file_name": file_name, "instructor_id": instructor_id}
