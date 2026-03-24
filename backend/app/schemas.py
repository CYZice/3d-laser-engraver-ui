from typing import Literal

from pydantic import BaseModel, Field


TaskStatus = Literal["QUEUED", "PROCESSING", "COMPLETED", "FAILED"]
TaskStage = Literal[
    "QUEUED",
    "PROCESSING_DETECT",
    "PROCESSING_3DDFA",
    "PROCESSING_OBJ2PLY",
    "PROCESSING_PLY2DXF",
    "COMPLETED",
    "FAILED",
]


class ApiEnvelope(BaseModel):
    code: int = 200


class UploadData(BaseModel):
    upload_id: str = Field(alias="uploadId")
    filename: str
    size_bytes: int = Field(alias="sizeBytes")


class UploadResponse(ApiEnvelope):
    data: UploadData


class FaceCandidate(BaseModel):
    face_index: int = Field(alias="faceIndex")
    confidence: float
    bbox: list[int]
    thumbnail_url: str = Field(alias="thumbnailUrl")


class DetectFacesRequest(BaseModel):
    upload_id: str = Field(alias="uploadId")


class DetectFacesData(BaseModel):
    upload_id: str = Field(alias="uploadId")
    face_count: int = Field(alias="faceCount")
    faces: list[FaceCandidate]


class DetectFacesResponse(ApiEnvelope):
    data: DetectFacesData


class TaskCreateOptions(BaseModel):
    model_version: str = Field(default="mb1_120x120", alias="modelVersion")
    dxf_resolution: float = Field(default=0.5, alias="dxfResolution")
    point_density: float = Field(default=1.0, alias="pointDensity")
    gamma: float = Field(default=0.5, alias="gamma")


class TaskCreateRequest(BaseModel):
    upload_id: str = Field(alias="uploadId")
    payment_token: str = Field(alias="paymentToken")
    face_index: int = Field(default=0, alias="faceIndex")
    options: TaskCreateOptions = Field(default_factory=TaskCreateOptions)


class TaskCreateData(BaseModel):
    task_id: str = Field(alias="taskId")
    status: TaskStatus


class TaskCreateResponse(ApiEnvelope):
    data: TaskCreateData


class TaskError(BaseModel):
    code: str
    message: str


class TaskResultData(BaseModel):
    dxf_url: str = Field(alias="dxfUrl")
    preview_url: str = Field(alias="previewUrl")
    obj_url: str | None = Field(default=None, alias="objUrl")
    ply_url: str | None = Field(default=None, alias="plyUrl")


class TaskStatusData(BaseModel):
    task_id: str = Field(alias="taskId")
    upload_id: str = Field(alias="uploadId")
    status: TaskStatus
    stage: TaskStage
    progress: int
    message: str | None = None
    result: TaskResultData | None = None
    error: TaskError | None = None


class TaskStatusResponse(ApiEnvelope):
    data: TaskStatusData
