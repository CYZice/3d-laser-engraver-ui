#!/bin/bash
# run.sh — 激光雕刻完整流水线
#
# 依赖:
#   Step 1 — C++ ModelTransformer（OBJ → PLY 表面点云）
#             编译自 ../ModelTransformer-main/
#   Step 2 — Python pipeline.py（PLY → Jarvis DXF）
#   Step 3 — Python gen_3d_html.py（DXF → 3D HTML 预览）
#
# 用法:
#   ./run.sh input/demo.obj
#   ./run.sh input/demo.obj 1 0.5 0.5
#              [density] [resolution] [gamma]
#
# 参数:
#   density    C++ 采样密度（默认 1，越小点越密）
#   resolution Python 网格精度，单位=模型单位（默认 0.5）
#   gamma      Gamma 校正，<1 提升中间调密度（默认 0.5）

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CPP_TOOL="$SCRIPT_DIR/../ModelTransformer-main/build/ModelTransformer"
OUT_DIR="$SCRIPT_DIR/output"

if [ $# -lt 1 ]; then
    echo "用法: ./run.sh <input.obj> [density] [resolution] [gamma]"
    echo "示例: ./run.sh input/demo.obj 1 0.5 0.5"
    exit 1
fi

INPUT="$1"
DENSITY="${2:-1}"
RESOLUTION="${3:-0.5}"
GAMMA="${4:-0.5}"
STEM=$(basename "${INPUT%.*}")

mkdir -p "$OUT_DIR"

echo "========================================"
echo "  输入模型  : $INPUT"
echo "  采样密度  : $DENSITY"
echo "  网格精度  : $RESOLUTION"
echo "  Gamma    : $GAMMA"
echo "========================================"

# ── Step 1: C++ → PLY ─────────────────────────────────────────────────────────
PLY="$OUT_DIR/${STEM}_d${DENSITY}.ply"
echo ""
echo "[Step 1] C++ ModelTransformer → PLY"
"$CPP_TOOL" -i "$INPUT" -d "$DENSITY" -o "$PLY" -t ply -f ascii
echo "  → $PLY"

# ── Step 2: Python → DXF + 预览 PNG ──────────────────────────────────────────
PREFIX="$OUT_DIR/${STEM}_d${DENSITY}_r${RESOLUTION}"
echo ""
echo "[Step 2] Jarvis 半色调 → DXF + PNG"
python3 "$SCRIPT_DIR/pipeline.py" \
    "$PLY" \
    --resolution "$RESOLUTION" \
    --gamma      "$GAMMA" \
    --output     "$PREFIX"

# ── Step 3: DXF → 3D HTML 预览 ────────────────────────────────────────────────
DXF="$PREFIX_jarvis.dxf"
HTML="$OUT_DIR/${STEM}_3d_preview.html"
echo ""
echo "[Step 3] 生成 3D HTML 预览"
python3 "$SCRIPT_DIR/gen_3d_html.py" \
    "${PREFIX}_jarvis.dxf" \
    --output "$HTML"

echo ""
echo "========================================"
echo "  PLY 点云  → $OUT_DIR/"
echo "  DXF 文件  → $OUT_DIR/"
echo "  预览 PNG  → $OUT_DIR/"
echo "  3D HTML   → $HTML"
echo "========================================"
