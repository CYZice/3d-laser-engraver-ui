from __future__ import annotations

from pathlib import Path

from .config import ARTIFACT_DIR
from .pipeline_errors import PipelineError
from .pipeline_runner import run_3ddfa_to_obj, run_obj_to_ply, run_ply_to_dxf
from .task_store import store


class PipelineOrchestrator:
    async def run(self, task_id: str) -> None:
        task = store.get_task(task_id)
        if not task:
            return

        try:
            upload = store.get_upload(task.upload_id)
            if upload is None:
                raise PipelineError(
                    "UPLOAD_NOT_FOUND", f"Upload not found: {task.upload_id}"
                )

            task_dir = ARTIFACT_DIR / task_id
            task_dir.mkdir(parents=True, exist_ok=True)

            input_img = Path(upload.saved_path)
            obj_path = task_dir / "result.obj"
            ply_path = task_dir / "result.ply"
            output_prefix = task_dir / "result"

            await self._set_stage(
                task_id,
                "PROCESSING",
                "PROCESSING_DETECT",
                10,
                "Detecting faces",
            )

            await self._set_stage(
                task_id,
                "PROCESSING",
                "PROCESSING_3DDFA",
                35,
                "Converting image to OBJ",
            )
            run_3ddfa_to_obj(input_img=input_img, output_obj=obj_path)

            await self._set_stage(
                task_id,
                "PROCESSING",
                "PROCESSING_OBJ2PLY",
                60,
                "Converting OBJ to PLY",
            )
            density = float(task.options.get("pointDensity", 1.0))
            run_obj_to_ply(input_obj=obj_path, output_ply=ply_path, density=density)

            await self._set_stage(
                task_id,
                "PROCESSING",
                "PROCESSING_PLY2DXF",
                85,
                "Converting PLY to DXF",
            )
            resolution = float(task.options.get("dxfResolution", 0.5))
            gamma = float(task.options.get("gamma", 0.5))
            shading = task.options.get("shading", "equalize")
            method = task.options.get("method", "jarvis")
            blend_alpha = float(task.options.get("blendAlpha", 0.4))
            threshold = float(task.options.get("threshold", 0.5))
            dxf_path, preview_path = run_ply_to_dxf(
                input_ply=ply_path,
                output_prefix=output_prefix,
                resolution=resolution,
                gamma=gamma,
                shading=shading,
                method=method,
                blend_alpha=blend_alpha,
                threshold=threshold,
            )

            dxf_url = f"/artifacts/{task_id}/{dxf_path.name}"
            preview_url = (
                f"/artifacts/{task_id}/{preview_path.name}"
                if preview_path.exists()
                else ""
            )
            store.update_task(
                task_id,
                status="COMPLETED",
                stage="COMPLETED",
                progress=100,
                message="Completed",
                result={
                    "dxfUrl": dxf_url,
                    "previewUrl": preview_url,
                    "objUrl": f"/artifacts/{task_id}/{obj_path.name}",
                    "plyUrl": f"/artifacts/{task_id}/{ply_path.name}",
                },
                error=None,
            )
        except PipelineError as exc:
            store.update_task(
                task_id,
                status="FAILED",
                stage="FAILED",
                progress=100,
                message="Failed",
                error={"code": exc.code, "message": exc.message},
            )
        except Exception as exc:
            store.update_task(
                task_id,
                status="FAILED",
                stage="FAILED",
                progress=100,
                message="Failed",
                error={"code": "PIPELINE_ERROR", "message": str(exc)},
            )

    async def _set_stage(
        self, task_id: str, status: str, stage: str, progress: int, message: str
    ) -> None:
        store.update_task(
            task_id,
            status=status,
            stage=stage,
            progress=progress,
            message=message,
        )


orchestrator = PipelineOrchestrator()
