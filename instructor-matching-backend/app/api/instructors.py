"""강사 API 라우터."""

from fastapi import APIRouter, Depends, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.models.models import User
from app.schemas.instructor import (
    BulkUploadResponse,
    InstructorCreate,
    InstructorResponse,
    InstructorStats,
    InstructorUpdate,
)
from app.services import instructor_service

router = APIRouter(prefix="/api/instructors", tags=["instructors"])


@router.post("/upload", response_model=BulkUploadResponse)
async def upload_bulk(
    file: UploadFile,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """강사 데이터 일괄 업로드 (Excel/CSV)."""
    return await instructor_service.upload_bulk(db, file)


@router.get("/", response_model=dict)
async def list_instructors(
    keyword: str | None = None,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """강사 목록 조회 (검색/필터)."""
    instructors, total = await instructor_service.list_instructors(db, keyword, offset, limit)
    return {"data": instructors, "total": total}


@router.get("/statistics", response_model=InstructorStats)
async def get_statistics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """강사 통계."""
    return await instructor_service.get_statistics(db)


@router.get("/{instructor_id}", response_model=InstructorResponse)
async def get_instructor(
    instructor_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """강사 상세 조회."""
    return await instructor_service.get_instructor(db, instructor_id)


@router.put("/{instructor_id}", response_model=InstructorResponse)
async def update_instructor(
    instructor_id: str,
    data: InstructorUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """강사 정보 수정."""
    return await instructor_service.update_instructor(db, instructor_id, data)


@router.delete("/all", status_code=200)
async def delete_all_instructors(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """모든 강사 삭제."""
    count = await instructor_service.delete_all_instructors(db)
    return {"deleted": count}


@router.delete("/{instructor_id}", status_code=204)
async def delete_instructor(
    instructor_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """강사 삭제."""
    await instructor_service.delete_instructor(db, instructor_id)
