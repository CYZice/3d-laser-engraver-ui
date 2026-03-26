#!/bin/bash
# 3D Laser Engraver 一键启动脚本（前后端）

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "╔══════════════════════════════════════════════════════╗"
echo "║     3D Laser Engraver - Starting All Services        ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
	echo ""
	echo "Stopping services..."
	if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
		kill "$FRONTEND_PID" 2>/dev/null || true
	fi
	if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
		kill "$BACKEND_PID" 2>/dev/null || true
	fi
}

trap cleanup EXIT INT TERM

# 启动后端（直接使用当前环境，不做依赖同步/自动安装）
echo "[1/2] Starting Backend (FastAPI) on http://localhost:8000"
cd "$SCRIPT_DIR/backend"
python -m uvicorn app.main:app --reload --port 8000 --host 0.0.0.0 &
BACKEND_PID=$!

# 等待后端进程拉起
sleep 2
if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
	echo ""
	echo "Backend failed to start. Please check logs above."
	exit 1
fi

# 可选健康检查（若系统有 curl）
if command -v curl &> /dev/null; then
	echo "Waiting for backend health endpoint..."
	BACKEND_HEALTH_TIMEOUT_SEC="${BACKEND_HEALTH_TIMEOUT_SEC:-180}"
	BACKEND_READY=0
	for _ in $(seq 1 "$BACKEND_HEALTH_TIMEOUT_SEC"); do
		if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
			echo ""
			echo "Backend process exited before becoming healthy."
			exit 1
		fi

		if curl -sSf "http://127.0.0.1:8000/api/v1/health" >/dev/null 2>&1; then
			BACKEND_READY=1
			break
		fi
		sleep 1
	done

	if [ "$BACKEND_READY" -ne 1 ]; then
		echo ""
		echo "Backend process started but health check did not pass within ${BACKEND_HEALTH_TIMEOUT_SEC}s."
		echo "You can still inspect logs; exiting to avoid frontend proxy errors."
		exit 1
	fi
fi

# 启动前端
echo ""
echo "[2/2] Starting Frontend (Vite) on http://localhost:5173"
cd "$SCRIPT_DIR"
npm run dev &
FRONTEND_PID=$!

sleep 1
if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
	echo ""
	echo "Frontend failed to start. Please check logs above."
	exit 1
fi

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
wait "$BACKEND_PID" "$FRONTEND_PID"
