# Backend Stage 2 (Pipeline Wired)

This directory contains the phase-2 backend implementation:

- API contract for upload, face detection, task creation, and task status.
- In-memory task store and stage-based state machine.
- Local artifacts publishing via static endpoint.
- Real pipeline orchestration: 3DDFA -> OBJ -> PLY -> DXF.

## Quick Start

1. Create and activate a Python environment.
2. Install dependencies:

   pip install -r backend/requirements.txt

3. Run server:

   uvicorn backend.app.main:app --reload --port 8000

4. Base endpoints:

- GET /api/v1/health
- POST /api/v1/upload
- POST /api/v1/faces/detect
- POST /api/v1/tasks
- GET /api/v1/tasks/{task_id}

Artifacts are served from /artifacts/{task_id}/.

## Notes

- This phase executes real subprocess pipeline calls.
- Current face detection endpoint is still a placeholder response.
- Multi-face selection is accepted in API but not fully enforced inside 3DDFA yet.

## Pipeline Steps

1. 3DDFA `demo.py` generates OBJ.
2. ModelTransformer converts OBJ to ASCII PLY.
3. `objTOdxf/deploy/pipeline.py` converts PLY to DXF.
4. Task result returns URLs for DXF/OBJ/PLY/preview.

## Task Options

POST `/api/v1/tasks` accepts:

- `options.modelVersion` (default `mb1_120x120`)
- `options.dxfResolution` (default `0.5`)
- `options.pointDensity` (default `1.0`)
- `options.gamma` (default `0.5`)
