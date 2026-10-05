#!/usr/bin/env bash
# ==============================================================================
# CLASH ROYALE AUTONOMOUS 1V1 ARENA LAUNCHER
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "============================================================"
echo "    👑  CLASH ROYALE AI ARENA: 2-LANE KNOCKOUT TOURNAMENT  👑"
echo "============================================================"

# 1. Check Python
if ! command -v python3 &>/dev/null; then
    echo "[-] Error: python3 is not installed or not in PATH."
    exit 1
fi
echo "[+] Python detected: $(python3 --version)"

# 2. Check / Setup Virtual Environment
if [ ! -d ".venv" ]; then
    echo "[*] Creating local virtual environment in .venv..."
    python3 -m venv .venv
    echo "[*] Installing dependencies from requirements.txt..."
    .venv/bin/pip install --upgrade pip
    .venv/bin/pip install -r requirements.txt
else
    echo "[+] Virtual environment found (.venv)."
fi

# 3. Check / Launch Local LLM (Ollama)
echo "[*] Checking local LLM service at http://localhost:11434..."
if ! curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
    echo "[*] Ollama server is not running. Checking if ollama binary exists..."
    if command -v ollama &>/dev/null; then
        echo "[+] Found ollama binary. Starting 'ollama serve' in background..."
        nohup ollama serve > /tmp/ollama_clash.log 2>&1 &
        sleep 3
    else
        echo "[-] Notice: 'ollama' binary was not found in PATH."
        echo "    If running on another machine, install Ollama (https://ollama.com) or start your local OpenAI-compatible endpoint."
    fi
fi

# 4. Verify Model Availability
if curl -s http://localhost:11434/api/tags 2>&1 | grep -q "qwen2.5:0.5b"; then
    echo "[+] Model 'qwen2.5:0.5b' is ready and loaded!"
else
    echo "[*] Checking if model needs to be pulled..."
    if command -v ollama &>/dev/null; then
        echo "[*] Pulling qwen2.5:0.5b (only ~397MB, under 1B params)..."
        ollama pull qwen2.5:0.5b || echo "[-] Warning: Model pull failed or offline."
    fi
fi

# 5. Launch Game Arena Server
PORT=8000
echo "[*] Checking if port $PORT is already in use..."
if lsof -ti:$PORT >/dev/null 2>&1; then
    echo "[*] Cleaning up previous process listening on port $PORT..."
    kill -9 $(lsof -ti:$PORT) 2>/dev/null || true
    sleep 1
    echo "[+] Port $PORT freed."
fi

echo "============================================================"
echo "  🚀 LAUNCHING SPECTATOR ARENA ON: http://localhost:${PORT}"
echo "============================================================"
echo "  Participants can drop .md files into the 'skills/' folder,"
echo "  or use the in-browser Skill File Workshop."
echo "============================================================"

# Open browser if DISPLAY is present
if [ -n "$DISPLAY" ]; then
    (sleep 1.5 && (xdg-open "http://localhost:${PORT}" 2>/dev/null || sensible-browser "http://localhost:${PORT}" 2>/dev/null || true)) &
fi

exec .venv/bin/python -m uvicorn server.app:app --host 0.0.0.0 --port $PORT
