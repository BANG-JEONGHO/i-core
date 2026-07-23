"""과업지시서 API 라우터."""

from fastapi import APIRouter, Depends, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.models.models import User
from app.schemas.task_order import ParsedResultUpdate, TaskOrderResponse, TaskOrderSummary
from app.services import task_order_service

router = APIRouter(prefix="/api/task-orders", tags=["task-orders"])


@router.post("/upload", response_model=TaskOrderResponse, status_code=201)
async def upload_task_order(
    file: UploadFile,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """과업지시서 업로드 및 자동 파싱."""
    return await task_order_service.upload_task_order(db, file, current_user.id)


@router.get("/", response_model=dict)
async def list_task_orders(
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """과업지시서 목록 조회."""
    task_orders, total = await task_order_service.list_task_orders(db, offset, limit)
    return {"data": task_orders, "total": total}


@router.get("/{task_order_id}", response_model=TaskOrderResponse)
async def get_task_order(
    task_order_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """과업지시서 상세 조회."""
    return await task_order_service.get_task_order(db, task_order_id)


@router.delete("/{task_order_id}", status_code=204)
async def delete_task_order(
    task_order_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """과업지시서 삭제."""
    from app.models.models import TaskOrder
    task_order = await db.get(TaskOrder, task_order_id)
    if task_order:
        await db.delete(task_order)


@router.put("/{task_order_id}/parsed", response_model=TaskOrderResponse)
async def update_parsed_result(
    task_order_id: str,
    data: ParsedResultUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """파싱 결과 수정."""
    return await task_order_service.update_parsed_result(db, task_order_id, data)
