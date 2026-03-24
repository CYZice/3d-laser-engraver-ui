#!/bin/bash
# 3D Laser Engraver 一键启动脚本（前后端）

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "╔══════════════════════════════════════════════════════╗"
echo "║     3D Laser Engraver - Starting All Services        ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# 启动后端
echo "[1/2] Starting Backend (FastAPI) on http://localhost:8000"
cd "$SCRIPT_DIR/backend"
./start.sh &
BACKEND_PID=$!

# 等待后端启动
sleep 3

# 启动前端
echo ""
echo "[2/2] Starting Frontend (Vite) on http://localhost:5173"
cd "$SCRIPT_DIR"
npx vite &
FRONTEND_PID=$!

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  Services Started Successfully!                     ║"
echo "║  Frontend: http://localhost:5173                   ║"
echo "║  Backend:  http://localhost:8000                   ║"
echo "║  API Docs: http://localhost:8000/docs             ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "Press Ctrl+C to stop all services"

# 等待退出
wait
