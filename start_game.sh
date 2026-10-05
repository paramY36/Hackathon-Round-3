#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if ! command -v python3 &>/dev/null; then
    echo "Error: python3 is not installed or not in PATH."
    exit 1
fi

if [ ! -d ".venv" ]; then
    echo "Setting up virtual environment..."
    python3 -m venv .venv
    .venv/bin/pip install --upgrade pip
    .venv/bin/pip install -r requirements.txt
fi

if ! curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
    if command -v ollama &>/dev/null; then
        echo "Starting Ollama..."
        nohup ollama serve > /tmp/ollama_clash.log 2>&1 &
        sleep 3
    fi
fi

if command -v ollama &>/dev/null; then
    if ! curl -s http://localhost:11434/api/tags 2>&1 | grep -q "qwen2.5:0.5b"; then
        echo "Pulling qwen2.5:0.5b model..."
        ollama pull qwen2.5:0.5b || true
    fi
fi

PORT=8000
if command -v lsof &>/dev/null && lsof -ti:$PORT >/dev/null 2>&1; then
    kill -9 $(lsof -ti:$PORT) 2>/dev/null || true
    sleep 1
elif command -v fuser &>/dev/null && fuser $PORT/tcp >/dev/null 2>&1; then
    fuser -k $PORT/tcp 2>/dev/null || true
    sleep 1
fi

echo "Starting server at http://localhost:${PORT}"

if [ -n "$DISPLAY" ]; then
    (sleep 1.5 && (xdg-open "http://localhost:${PORT}" 2>/dev/null || sensible-browser "http://localhost:${PORT}" 2>/dev/null || true)) &
fi

exec .venv/bin/python -m uvicorn server.app:app --host 0.0.0.0 --port $PORT
