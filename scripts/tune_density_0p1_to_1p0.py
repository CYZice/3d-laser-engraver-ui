#!/usr/bin/env python3
"""
固定密度批量调参包装脚本：0.1 -> 1.0（共10档）。

用途：
- 给一个 OBJ，自动跑 10 个 density（0.1, 0.2, ..., 1.0）
- 复用 scripts/tune_density.py 生成 DXF + 十图对比预览

示例：
  python scripts/tune_density_0p1_to_1p0.py --obj "backend/artifacts/tsk_xxx/result.obj"
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from datetime import datetime
from pathlib import Path


def build_density_arg() -> str:
    values = [i / 10 for i in range(6, 11)]
    return ",".join(f"{v:.1f}" for v in values)


def main() -> int:
    parser = argparse.ArgumentParser(description="固定密度 0.1~1.0 批量调参")
    parser.add_argument("--obj", required=True, help="输入 OBJ 文件路径")
    parser.add_argument("--name", default="", help="输出目录名（默认自动时间戳）")
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
        help="前端地址，用于输出预览链接",
    )
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    tune_script = root / "scripts" / "tune_density.py"
    if not tune_script.exists():
        print(f"[ERROR] 未找到脚本: {tune_script}")
        return 2

    run_name = (
        args.name.strip()
        or f"density_0p1_to_1p0_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    )
    densities = build_density_arg()

    cmd = [
        sys.executable,
        str(tune_script),
        "--obj",
        args.obj,
        "--densities",
        densities,
        "--name",
        run_name,
        "--resolution",
        str(args.resolution),
        "--gamma",
        str(args.gamma),
        "--shading",
        args.shading,
        "--method",
        args.method,
        "--blend-alpha",
        str(args.blend_alpha),
        "--threshold",
        str(args.threshold),
        "--frontend-base",
        args.frontend_base,
    ]

    print("[INFO] 固定 density 列表: " + densities)
    print("[INFO] 执行命令:")
    print(" ".join(cmd))

    try:
        subprocess.run(cmd, cwd=str(root), check=True)
    except subprocess.CalledProcessError as exc:
        print(f"[ERROR] 执行失败，退出码: {exc.returncode}")
        return exc.returncode

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
