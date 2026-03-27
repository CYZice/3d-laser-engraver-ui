#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
IMAGE_PATH="${1:-$SCRIPT_DIR/test.jpg}"
API_BASE="${API_BASE:-http://127.0.0.1:8000/api/v1}"
HOST_BASE="${API_BASE%/api/v1}"

if [ ! -f "$IMAGE_PATH" ]; then
  echo "Image not found: $IMAGE_PATH"
  exit 1
fi

BACKEND_PID=""

cleanup() {
  if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" >/dev/null 2>&1; then
    kill "$BACKEND_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

if ! curl -fsS "$API_BASE/health" >/dev/null 2>&1; then
  cd "$SCRIPT_DIR"
  python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 >/tmp/laser_backend.log 2>&1 &
  BACKEND_PID=$!
  for _ in $(seq 1 30); do
    if curl -fsS "$API_BASE/health" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
fi

if ! curl -fsS "$API_BASE/health" >/dev/null 2>&1; then
  echo "Backend is not ready: $API_BASE/health"
  exit 2
fi

UPLOAD_JSON="$(curl -fsS -X POST "$API_BASE/upload" -F "file=@$IMAGE_PATH")"
UPLOAD_ID="$(printf '%s' "$UPLOAD_JSON" | python -c "import sys,json; print(json.load(sys.stdin)['data']['uploadId'])")"
echo "uploadId=$UPLOAD_ID"

TASK_PAYLOAD="$(python - <<PY
import json
print(json.dumps({
  "uploadId": "$UPLOAD_ID",
  "paymentToken": "pay_mock_cli",
  "faceIndex": 0,
  "options": {
    "modelVersion": "mb1_120x120",
    "dxfResolution": 0.5,
    "pointDensity": 1.0,
    "gamma": 0.5,
    "shading": "equalize",
    "method": "jarvis",
    "blendAlpha": 0.4,
    "threshold": 0.5
  }
}, ensure_ascii=False))
PY
)"

TASK_JSON="$(curl -fsS -X POST "$API_BASE/tasks" -H "Content-Type: application/json" -d "$TASK_PAYLOAD")"
TASK_ID="$(printf '%s' "$TASK_JSON" | python -c "import sys,json; print(json.load(sys.stdin)['data']['taskId'])")"
echo "taskId=$TASK_ID"

while true; do
  STATUS_JSON="$(curl -fsS "$API_BASE/tasks/$TASK_ID")"
  LINE="$(printf '%s' "$STATUS_JSON" | python -c "import sys,json; d=json.load(sys.stdin)['data']; print(f\"{d['status']}\t{d.get('stage')}\t{d.get('progress')}\")")"
  STATUS="$(printf '%s' "$LINE" | cut -f1)"
  STAGE="$(printf '%s' "$LINE" | cut -f2)"
  PROGRESS="$(printf '%s' "$LINE" | cut -f3)"
  echo "status=$STATUS stage=$STAGE progress=$PROGRESS"
  if [ "$STATUS" = "COMPLETED" ] || [ "$STATUS" = "FAILED" ]; then
    FINAL_JSON="$STATUS_JSON"
    break
  fi
  sleep 2
done

if [ "$STATUS" != "COMPLETED" ]; then
  echo "$FINAL_JSON" | python -m json.tool
  exit 3
fi

DXF_URL="$(printf '%s' "$FINAL_JSON" | python -c "import sys,json; d=json.load(sys.stdin)['data']['result']; print(d['dxfUrl'])")"
PREVIEW_URL="$(printf '%s' "$FINAL_JSON" | python -c "import sys,json; d=json.load(sys.stdin)['data']['result']; print(d['previewUrl'])")"

echo "DXF=$HOST_BASE$DXF_URL"
echo "PREVIEW=$HOST_BASE$PREVIEW_URL"
echo "RENDER_URL=http://localhost:5173/?debugDxf=$DXF_URL&debugPreview=$PREVIEW_URL"
