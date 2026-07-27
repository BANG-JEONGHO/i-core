"""Persist uploaded task-order source files in GCS or local storage.

Cloud Run's local filesystem is ephemeral. When ``GCS_BUCKET`` is configured,
the service stores original task-order files in that bucket and records a
``gs://`` URI in ``task_orders.file_path``. Local development keeps the prior
``UPLOAD_DIR`` behaviour when no bucket is configured.
"""

from __future__ import annotations

import asyncio
import uuid
from datetime import datetime
from pathlib import Path

from google.api_core.exceptions import GoogleAPIError
from google.auth.exceptions import GoogleAuthError
from google.cloud import storage

from app.core.config import settings


class ObjectStorageError(RuntimeError):
    """Raised when an original uploaded file cannot be persisted or read."""


def is_gcs_uri(value: str) -> bool:
    return value.startswith("gs://")


async def save_task_order_file(
    content: bytes,
    file_name: str,
    content_type: str | None = None,
) -> str:
    """Store an original task-order file and return its durable path."""
    suffix = Path(file_name).suffix.lower() or ".bin"
    object_name = (
        f"task-orders/{datetime.now().strftime('%Y/%m')}/"
        f"{uuid.uuid4()}{suffix}"
    )
    bucket_name = settings.GCS_BUCKET.strip()
    if bucket_name:
        return await asyncio.to_thread(
            _upload_to_gcs, bucket_name, object_name, content, content_type
        )

    save_path = Path(settings.UPLOAD_DIR) / object_name
    save_path.parent.mkdir(parents=True, exist_ok=True)
    save_path.write_bytes(content)
    return str(save_path)


async def read_task_order_file(file_path: str) -> bytes:
    """Read an original source file from GCS or the local development path."""
    if is_gcs_uri(file_path):
        bucket_name, object_name = _split_gcs_uri(file_path)
        return await asyncio.to_thread(_download_from_gcs, bucket_name, object_name)

    path = Path(file_path)
    if not path.is_file():
        raise ObjectStorageError("The original uploaded file is unavailable")
    return path.read_bytes()


async def delete_task_order_file(file_path: str) -> None:
    """Delete an original source file when its task order is removed."""
    if is_gcs_uri(file_path):
        bucket_name, object_name = _split_gcs_uri(file_path)
        await asyncio.to_thread(_delete_from_gcs, bucket_name, object_name)
        return
    Path(file_path).unlink(missing_ok=True)


def _upload_to_gcs(
    bucket_name: str,
    object_name: str,
    content: bytes,
    content_type: str | None,
) -> str:
    try:
        blob = storage.Client().bucket(bucket_name).blob(object_name)
        blob.upload_from_string(content, content_type=content_type)
    except (GoogleAPIError, GoogleAuthError) as error:
        raise ObjectStorageError("Could not store the uploaded file in Cloud Storage") from error
    return f"gs://{bucket_name}/{object_name}"


def _download_from_gcs(bucket_name: str, object_name: str) -> bytes:
    try:
        return storage.Client().bucket(bucket_name).blob(object_name).download_as_bytes()
    except (GoogleAPIError, GoogleAuthError) as error:
        raise ObjectStorageError("The original uploaded file is unavailable") from error


def _delete_from_gcs(bucket_name: str, object_name: str) -> None:
    try:
        storage.Client().bucket(bucket_name).blob(object_name).delete()
    except (GoogleAPIError, GoogleAuthError) as error:
        raise ObjectStorageError("Could not delete the uploaded file from Cloud Storage") from error


def _split_gcs_uri(uri: str) -> tuple[str, str]:
    path = uri.removeprefix("gs://")
    bucket_name, separator, object_name = path.partition("/")
    if not bucket_name or not separator or not object_name:
        raise ObjectStorageError("The Cloud Storage path is invalid")
    return bucket_name, object_name
