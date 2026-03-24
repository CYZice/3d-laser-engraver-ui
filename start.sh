#!/bin/bash
# 3D Laser Engraver Frontend 启动脚本

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== 3D Laser Engraver Frontend ==="

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo "Error: npm not found."
    exit 1
fi

# 检查 node_modules
if [ ! -d "node_modules" ]; then
    echo "[1/2] Installing dependencies..."
    npm install
else
    echo "[1/2] Dependencies already installed"
fi

# 启动服务
echo "[2/2] Starting Vite dev server on http://localhost:5173"
echo "Press Ctrl+C to stop"
echo ""

npx vite
