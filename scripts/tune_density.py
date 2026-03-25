#!/usr/bin/env python3
"""
OBJ -> PLY -> DXF 密度调参脚本（跳过拍照流程）。

用途：
1) 用同一个 OBJ 批量跑不同 point density；
2) 固定一套 pipeline 参数，输出多个 DXF；
3) 产出 preview 对比图和前端调试链接，直接走当前 CrystalViewer 渲染。

示例：
  python3 scripts/tune_density.py --obj backend/artifacts/example/result.obj
  python3 scripts/tune_density.py --obj /path/to/a.obj --densities 0.6,0.8,1.0,1.2 --resolution 1.0
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

import matplotlib.image as mpimg
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.app.config import ARTIFACT_DIR  # noqa: E402
from backend.app.pipeline_errors import PipelineError  # noqa: E402
from backend.app.pipeline_runner import run_obj_to_ply, run_ply_to_dxf  # noqa: E402


@dataclass
class RunResult:
    density: float
    ply_path: Path
    dxf_path: Path
    preview_path: Path
    points: int
    frontend_url: str


def parse_density_list(raw: str) -> list[float]:
    vals: list[float] = []
    for part in raw.split(","):
        s = part.strip()
        if not s:
            continue
        vals.append(float(s))
    if not vals:
        raise ValueError("densities 不能为空")
    return vals


def density_tag(v: float) -> str:
    return f"d{v:.3f}".replace(".", "p")


def count_dxf_points(dxf_path: Path) -> int:
    count = 0
    with dxf_path.open("r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            if line.strip() == "POINT":
                count += 1
    return count


def build_compare_preview(results: list[RunResult], out_path: Path) -> None:
    if not results:
        return

    n = len(results)
    cols = min(3, n)
    rows = math.ceil(n / cols)
    fig, axes = plt.subplots(rows, cols, figsize=(7 * cols, 4 * rows))

    if rows == 1 and cols == 1:
        axes_list = [axes]
    elif rows == 1:
        axes_list = list(axes)
    elif cols == 1:
        axes_list = [a for a in axes]
    else:
        axes_list = [a for row in axes for a in row]

    for i, r in enumerate(results):
        ax = axes_list[i]
        img = mpimg.imread(str(r.preview_path))
        ax.imshow(img)
        ax.set_title(f"density={r.density:g}  pts={r.points:,}")
        ax.axis("off")

    for i in range(len(results), len(axes_list)):
        axes_list[i].axis("off")

    fig.suptitle("DXF Preview Compare", fontsize=16)
    fig.tight_layout()
    fig.savefig(out_path, dpi=140)
    plt.close(fig)


def main() -> int:
    parser = argparse.ArgumentParser(description="OBJ -> PLY -> DXF 密度调参")
    parser.add_argument("--obj", required=True, help="输入 OBJ 文件路径")
    parser.add_argument(
        "--densities",
        default="0.6,0.8,1.0,1.2,1.5",
        help="逗号分隔的 point density 列表（默认: 0.6,0.8,1.0,1.2,1.5）",
    )
    parser.add_argument("--resolution", type=float, default=1.0, help="DXF 栅格分辨率")
    parser.add_argument("--gamma", type=float, default=0.5, help="半色调 gamma")
    parser.add_argument(
        "--shading",
        choices=["texture", "equalize", "normal", "blend"],
        default="equalize",
        help="灰度来源",
    )
    parser.add_argument(
        "--method",
        choices=["threshold", "bayer", "floyd", "jarvis"],
        default="jarvis",
        help="半色调方法",
    )
    parser.add_argument(
        "--blend-alpha", type=float, default=0.4, help="blend 模式纹理权重"
    )
    parser.add_argument(
        "--threshold", type=float, default=0.5, help="threshold 方法阈值"
    )
    parser.add_argument(
        "--frontend-base",
        default="http://localhost:5173",
        help="前端地址，用于输出调试链接",
    )
    parser.add_argument(
        "--name",
        default="",
        help="本次调参任务名（默认自动时间戳）",
    )
    args = parser.parse_args()

    obj_path = Path(args.obj).resolve()
    if not obj_path.exists():
        print(f"[ERROR] OBJ 不存在: {obj_path}")
        return 2

    try:
        densities = parse_density_list(args.densities)
    except ValueError as exc:
        print(f"[ERROR] density 列表非法: {exc}")
        return 2

    run_name = args.name.strip() or datetime.now().strftime("%Y%m%d_%H%M%S")
    out_dir = ARTIFACT_DIR / "debug_density" / run_name
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"[INFO] OBJ: {obj_path}")
    print(f"[INFO] Output Dir: {out_dir}")
    print(f"[INFO] Densities: {', '.join(f'{d:g}' for d in densities)}")

    results: list[RunResult] = []

    for d in densities:
        tag = density_tag(d)
        ply_path = out_dir / f"{tag}.ply"
        prefix = out_dir / tag

        print(f"\n[RUN] density={d:g}")
        try:
            run_obj_to_ply(input_obj=obj_path, output_ply=ply_path, density=d)
            dxf_path, preview_path = run_ply_to_dxf(
                input_ply=ply_path,
                output_prefix=prefix,
                resolution=args.resolution,
                gamma=args.gamma,
                shading=args.shading,
                method=args.method,
                blend_alpha=args.blend_alpha,
                threshold=args.threshold,
            )
        except PipelineError as exc:
            print(f"[ERROR] pipeline 失败: {exc.code} | {exc.message}")
            continue
        except Exception as exc:  # noqa: BLE001
            print(f"[ERROR] 未知异常: {exc}")
            continue

        points = count_dxf_points(dxf_path)
        rel_dxf = dxf_path.relative_to(ARTIFACT_DIR)
        rel_preview = (
            preview_path.relative_to(ARTIFACT_DIR) if preview_path.exists() else None
        )
        dxf_url = f"/artifacts/{rel_dxf.as_posix()}"
        preview_url = f"/artifacts/{rel_preview.as_posix()}" if rel_preview else ""

        frontend_url = (
            f"{args.frontend_base}/?debugDxf={dxf_url}&debugPreview={preview_url}"
        )

        results.append(
            RunResult(
                density=d,
                ply_path=ply_path,
                dxf_path=dxf_path,
                preview_path=preview_path,
                points=points,
                frontend_url=frontend_url,
            )
        )
        print(f"[OK] dxf={dxf_path.name}  points={points:,}")

    if not results:
        print(
            "\n[FAILED] 没有成功输出结果，请先检查 ModelTransformer 与 pipeline 依赖。"
        )
        return 1

    compare_png = out_dir / "preview_compare.png"
    build_compare_preview(results, compare_png)

    manifest = {
        "obj": str(obj_path),
        "outputDir": str(out_dir),
        "resolution": args.resolution,
        "gamma": args.gamma,
        "shading": args.shading,
        "method": args.method,
        "blendAlpha": args.blend_alpha,
        "threshold": args.threshold,
        "results": [
            {
                "density": r.density,
                "ply": str(r.ply_path),
                "dxf": str(r.dxf_path),
                "preview": str(r.preview_path),
                "points": r.points,
                "frontendUrl": r.frontend_url,
            }
            for r in results
        ],
        "comparePreview": str(compare_png),
    }

    manifest_path = out_dir / "manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print("\n================ 调参完成 ================")
    print(f"对比图: {compare_png}")
    print(f"清单:   {manifest_path}")
    print("\n前端调试链接（逐个打开截图对比）：")
    for r in results:
        print(f"  density={r.density:g} -> {r.frontend_url}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
