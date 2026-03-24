#!/bin/bash
# 3D Laser Engraver Backend 启动脚本

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== 3D Laser Engraver Backend ==="

# 检查 uv
if ! command -v uv &> /dev/null; then
    echo "Error: uv not found. Install: https://github.com/astral-sh/uv"
    exit 1
fi

# 同步依赖
echo "[1/2] Syncing dependencies with uv..."
uv sync

# 启动服务
echo "[2/2] Starting FastAPI server on http://localhost:8000"
echo "API docs: http://localhost:8000/docs"
echo "Press Ctrl+C to stop"
echo ""

uv run uvicorn app.main:app --reload --port 8000 --host 0.0.0.0
