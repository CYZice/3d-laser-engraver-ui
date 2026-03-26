#!/bin/bash
# 3D Laser Engraver Backend 启动脚本

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== 3D Laser Engraver Backend ==="

if command -v uv &> /dev/null; then
    echo "[1/2] Syncing dependencies with uv..."
    uv sync

    echo "[2/2] Starting FastAPI server on http://localhost:8000"
    echo "API docs: http://localhost:8000/docs"
    echo "Press Ctrl+C to stop"
    echo ""

    exec uv run uvicorn app.main:app --reload --port 8000 --host 0.0.0.0
else
    echo "Warning: uv not found. Falling back to python venv + pip."

    if command -v python3 &> /dev/null; then
        PYTHON_BIN="python3"
    elif command -v python &> /dev/null; then
        PYTHON_BIN="python"
    else
        echo "Error: Python not found. Please install Python 3.10+"
        exit 1
    fi

    if [ ! -d ".venv" ]; then
        echo "[1/3] Creating virtual environment (.venv)..."
        "$PYTHON_BIN" -m venv .venv
    else
        echo "[1/3] Virtual environment already exists"
    fi

    if [ -f ".venv/Scripts/activate" ]; then
        # shellcheck disable=SC1091
        source .venv/Scripts/activate
    elif [ -f ".venv/bin/activate" ]; then
        # shellcheck disable=SC1091
        source .venv/bin/activate
    else
        echo "Error: Cannot find virtual environment activation script."
        exit 1
    fi

    echo "[2/3] Installing backend dependencies..."
    python -m pip install --upgrade pip
    python -m pip install -r requirements.txt

    echo "[3/3] Starting FastAPI server on http://localhost:8000"
    echo "API docs: http://localhost:8000/docs"
    echo "Press Ctrl+C to stop"
    echo ""

    exec python -m uvicorn app.main:app --reload --port 8000 --host 0.0.0.0
fi
