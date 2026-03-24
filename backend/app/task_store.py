from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from threading import Lock
from typing import Any
from uuid import uuid4


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class UploadRecord:
    upload_id: str
    filename: str
    size_bytes: int
    saved_path: str
    created_at: str = field(default_factory=utc_now_iso)


@dataclass
class TaskRecord:
    task_id: str
    upload_id: str
    face_index: int
    payment_token: str
    options: dict[str, Any]
    status: str = "QUEUED"
    stage: str = "QUEUED"
    progress: int = 0
    message: str | None = None
    result: dict[str, Any] | None = None
    error: dict[str, str] | None = None
    created_at: str = field(default_factory=utc_now_iso)
    updated_at: str = field(default_factory=utc_now_iso)


class TaskStore:
    def __init__(self) -> None:
        self._lock = Lock()
        self._uploads: dict[str, UploadRecord] = {}
        self._tasks: dict[str, TaskRecord] = {}

    def create_upload(
        self,
        filename: str,
        size_bytes: int,
        saved_path: str,
        upload_id: str | None = None,
    ) -> UploadRecord:
        if upload_id is None:
            upload_id = f"upl_{uuid4().hex[:12]}"
        record = UploadRecord(
            upload_id=upload_id,
            filename=filename,
            size_bytes=size_bytes,
            saved_path=saved_path,
        )
        with self._lock:
            self._uploads[upload_id] = record
        return record

    def get_upload(self, upload_id: str) -> UploadRecord | None:
        with self._lock:
            return self._uploads.get(upload_id)

    def create_task(
        self,
        upload_id: str,
        face_index: int,
        payment_token: str,
        options: dict[str, Any],
    ) -> TaskRecord:
        task_id = f"tsk_{uuid4().hex[:12]}"
        task = TaskRecord(
            task_id=task_id,
            upload_id=upload_id,
            face_index=face_index,
            payment_token=payment_token,
            options=options,
        )
        with self._lock:
            self._tasks[task_id] = task
        return task

    def get_task(self, task_id: str) -> TaskRecord | None:
        with self._lock:
            return self._tasks.get(task_id)

    def update_task(self, task_id: str, **kwargs: Any) -> TaskRecord | None:
        with self._lock:
            task = self._tasks.get(task_id)
            if not task:
                return None
            for key, value in kwargs.items():
                if hasattr(task, key):
                    setattr(task, key, value)
            task.updated_at = utc_now_iso()
            return task


store = TaskStore()
