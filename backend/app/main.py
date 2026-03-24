from __future__ import annotations

import asyncio
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import ARTIFACT_DIR, UPLOAD_DIR
from .pipeline_orchestrator import orchestrator
from .schemas import (
    DetectFacesData,
    DetectFacesRequest,
    DetectFacesResponse,
    FaceCandidate,
    TaskCreateData,
    TaskCreateRequest,
    TaskCreateResponse,
    TaskStatusData,
    TaskStatusResponse,
    UploadData,
    UploadResponse,
)
from .task_store import store


app = FastAPI(title="3D Engraver Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/artifacts", StaticFiles(directory=ARTIFACT_DIR), name="artifacts")


@app.get("/api/v1/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/v1/upload", response_model=UploadResponse)
async def upload_image(file: UploadFile = File(...)) -> UploadResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="filename is required")

    upload_tmp_dir = UPLOAD_DIR / "tmp"
    upload_tmp_dir.mkdir(parents=True, exist_ok=True)

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="empty file")

    temp_path = upload_tmp_dir / file.filename
    temp_path.write_bytes(raw)

    suffix = Path(file.filename).suffix.lower() or ".jpg"
    upload_id = f"upl_{uuid4().hex[:12]}"
    upload_dir = UPLOAD_DIR / upload_id
    upload_dir.mkdir(parents=True, exist_ok=True)
    final_path = upload_dir / f"original{suffix}"
    final_path.write_bytes(raw)

    record = store.create_upload(
        filename=file.filename,
        size_bytes=len(raw),
        saved_path=str(final_path),
        upload_id=upload_id,
    )

    return UploadResponse(
        code=200,
        data=UploadData(
            uploadId=record.upload_id,
            filename=record.filename,
            sizeBytes=record.size_bytes,
        ),
    )


@app.post("/api/v1/faces/detect", response_model=DetectFacesResponse)
async def detect_faces(request: DetectFacesRequest) -> DetectFacesResponse:
    upload = store.get_upload(request.upload_id)
    if not upload:
        raise HTTPException(status_code=404, detail="upload not found")

    faces = [
        FaceCandidate(
            faceIndex=0, confidence=0.98, bbox=[140, 90, 420, 500], thumbnailUrl=""
        ),
    ]
    return DetectFacesResponse(
        code=200,
        data=DetectFacesData(
            uploadId=request.upload_id, faceCount=len(faces), faces=faces
        ),
    )


@app.post("/api/v1/tasks", response_model=TaskCreateResponse)
async def create_task(payload: TaskCreateRequest) -> TaskCreateResponse:
    upload = store.get_upload(payload.upload_id)
    if not upload:
        raise HTTPException(status_code=404, detail="upload not found")

    task = store.create_task(
        upload_id=payload.upload_id,
        face_index=payload.face_index,
        payment_token=payload.payment_token,
        options=payload.options.model_dump(by_alias=True),
    )

    asyncio.create_task(orchestrator.run(task.task_id))

    return TaskCreateResponse(
        code=200,
        data=TaskCreateData(taskId=task.task_id, status=task.status),
    )


@app.get("/api/v1/tasks/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(task_id: str) -> TaskStatusResponse:
    task = store.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="task not found")

    return TaskStatusResponse(
        code=200,
        data=TaskStatusData(
            taskId=task.task_id,
            uploadId=task.upload_id,
            status=task.status,  # type: ignore[arg-type]
            stage=task.stage,  # type: ignore[arg-type]
            progress=task.progress,
            message=task.message,
            result=task.result,
            error=task.error,
        ),
    )
