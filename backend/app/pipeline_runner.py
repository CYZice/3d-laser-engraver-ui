from __future__ import annotations

import subprocess
import sys
from pathlib import Path

from .config import MODEL_TRANSFORMER_BIN, OBJ_TO_DXF_PIPELINE, THREEDFFA_DIR
from .pipeline_errors import PipelineError


def ensure_paths() -> None:
    if not THREEDFFA_DIR.exists():
        raise PipelineError(
            "THREEDFFA_NOT_FOUND", f"3DDFA folder not found: {THREEDFFA_DIR}"
        )
    if not MODEL_TRANSFORMER_BIN.exists():
        raise PipelineError(
            "MODEL_TRANSFORMER_NOT_FOUND",
            f"ModelTransformer not found: {MODEL_TRANSFORMER_BIN}",
        )
    if not OBJ_TO_DXF_PIPELINE.exists():
        raise PipelineError(
            "OBJ_TO_DXF_PIPELINE_NOT_FOUND",
            f"pipeline.py not found: {OBJ_TO_DXF_PIPELINE}",
        )


def run_cmd(
    cmd: list[str], cwd: Path | None = None, timeout: int = 600
) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(
            cmd,
            cwd=str(cwd) if cwd else None,
            check=True,
            text=True,
            capture_output=True,
            timeout=timeout,
        )
    except subprocess.TimeoutExpired as exc:
        raise PipelineError(
            "SUBPROCESS_TIMEOUT", f"Command timeout: {' '.join(cmd)}"
        ) from exc
    except subprocess.CalledProcessError as exc:
        stderr = (exc.stderr or "").strip()
        stdout = (exc.stdout or "").strip()
        detail = stderr if stderr else stdout
        raise PipelineError(
            "SUBPROCESS_FAILED", f"Command failed: {' '.join(cmd)}\n{detail}"
        ) from exc
    except OSError as exc:
        raise PipelineError(
            "SUBPROCESS_FAILED", f"Command failed: {' '.join(cmd)}\n{exc}"
        ) from exc


def convert_obj_to_ascii_ply(input_obj: Path, output_ply: Path) -> None:
    vertices: list[tuple[float, float, float]] = []
    with input_obj.open("r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            s = line.strip()
            if not s.startswith("v "):
                continue
            parts = s.split()
            if len(parts) < 4:
                continue
            try:
                x, y, z = float(parts[1]), float(parts[2]), float(parts[3])
            except ValueError:
                continue
            vertices.append((x, y, z))

    if not vertices:
        raise PipelineError(
            "PLY_NOT_GENERATED", f"No vertices parsed from OBJ: {input_obj}"
        )

    output_ply.parent.mkdir(parents=True, exist_ok=True)
    with output_ply.open("w", encoding="utf-8") as f:
        f.write("ply\n")
        f.write("format ascii 1.0\n")
        f.write(f"element vertex {len(vertices)}\n")
        f.write("property float x\n")
        f.write("property float y\n")
        f.write("property float z\n")
        f.write("property uchar red\n")
        f.write("property uchar green\n")
        f.write("property uchar blue\n")
        f.write("property uchar alpha\n")
        f.write("end_header\n")
        for x, y, z in vertices:
            f.write(f"{x:.6f} {y:.6f} {z:.6f} 128 128 128 255\n")


def run_3ddfa_to_obj(input_img: Path, output_obj: Path) -> Path:
    ensure_paths()

    examples_inputs = THREEDFFA_DIR / "examples" / "inputs"
    examples_results = THREEDFFA_DIR / "examples" / "results"
    examples_inputs.mkdir(parents=True, exist_ok=True)
    examples_results.mkdir(parents=True, exist_ok=True)

    task_stem = output_obj.stem
    task_input = examples_inputs / f"{task_stem}{input_img.suffix.lower() or '.jpg'}"
    task_input.write_bytes(input_img.read_bytes())

    cmd = [
        sys.executable,
        "demo.py",
        "-f",
        str(task_input),
        "-o",
        "obj",
        "--show_flag",
        "false",
    ]
    run_cmd(cmd, cwd=THREEDFFA_DIR)

    generated = examples_results / f"{task_stem}_obj.obj"
    if not generated.exists() or generated.stat().st_size == 0:
        raise PipelineError(
            "OBJ_NOT_GENERATED", f"3DDFA OBJ output missing: {generated}"
        )

    output_obj.write_bytes(generated.read_bytes())
    return output_obj


def run_obj_to_ply(input_obj: Path, output_ply: Path, density: float = 1.0) -> Path:
    ensure_paths()
    cmd = [
        str(MODEL_TRANSFORMER_BIN),
        "-i",
        str(input_obj),
        "-d",
        str(density),
        "-o",
        str(output_ply),
        "-t",
        "ply",
        "-f",
        "ascii",
    ]
    try:
        run_cmd(cmd)
    except PipelineError as exc:
        # Some repositories ship a prebuilt macOS ModelTransformer binary.
        # Fallback keeps the pipeline runnable on Linux by exporting vertices as ASCII PLY.
        if "Exec format error" in str(exc) or "cannot execute" in str(exc):
            convert_obj_to_ascii_ply(input_obj, output_ply)
        else:
            raise
    if not output_ply.exists() or output_ply.stat().st_size == 0:
        raise PipelineError("PLY_NOT_GENERATED", f"PLY output missing: {output_ply}")
    return output_ply


def run_ply_to_dxf(
    input_ply: Path, output_prefix: Path, resolution: float = 0.5, gamma: float = 0.5
) -> tuple[Path, Path]:
    ensure_paths()
    cmd = [
        sys.executable,
        str(OBJ_TO_DXF_PIPELINE),
        str(input_ply),
        "--resolution",
        str(resolution),
        "--gamma",
        str(gamma),
        "--output",
        str(output_prefix),
    ]
    run_cmd(cmd)

    dxf_path = Path(f"{output_prefix}_jarvis.dxf")
    preview_path = Path(f"{output_prefix}_preview.png")

    if not dxf_path.exists() or dxf_path.stat().st_size == 0:
        raise PipelineError("DXF_NOT_GENERATED", f"DXF output missing: {dxf_path}")

    return dxf_path, preview_path
