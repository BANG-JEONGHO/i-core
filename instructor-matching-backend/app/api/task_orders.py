"""과업지시서 API 라우터."""

import os
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


@router.post("/{task_order_id}/reparse", response_model=TaskOrderResponse)
async def reparse_task_order(
    task_order_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """과업지시서 재파싱 - 파싱 실패 시 다시 시도."""
    import asyncio
    from datetime import datetime
    from app.models.models import TaskOrder
    from app.services.ai_agent import parse_document_with_ai

    task_order = await db.get(TaskOrder, task_order_id)
    if not task_order:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    # 저장된 파일 읽기
    file_path = task_order.file_path
    if not file_path or not os.path.exists(file_path):
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="원본 파일을 찾을 수 없습니다.")

    with open(file_path, "rb") as f:
        content = f.read()

    try:
        ai_result = await asyncio.wait_for(
            parse_document_with_ai(content, task_order.file_name),
            timeout=120.0
        )
        task_order.raw_text = ai_result.get("raw_text", "")
        task_order.qualifications = ai_result.get("qualifications", [])
        task_order.evaluation_criteria = ai_result.get("evaluation_criteria", [])
        if task_order.qualifications or task_order.evaluation_criteria:
            task_order.parsed_at = datetime.utcnow()
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(task_order, "qualifications")
        flag_modified(task_order, "evaluation_criteria")
    except asyncio.TimeoutError:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_408_REQUEST_TIMEOUT, detail="파싱 시간이 초과되었습니다. 다시 시도해주세요.")

    return TaskOrderResponse.model_validate(task_order)
