#!/usr/bin/env bash
# ==============================================================================
# GITHUB CODESPACES 1-CLICK LAUNCHER
# Clash Royale Autonomous 1v1 Arena
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "============================================================"
echo "    👑 LAUNCHING AI ARENA IN GITHUB CODESPACES 👑"
echo "============================================================"

# 1. Ensure Python 3 is installed
if ! command -v python3 &>/dev/null; then
    echo "[-] Error: python3 is not available in PATH."
    exit 1
fi
echo "[+] Python version: $(python3 --version)"

# 2. Check & Install Ollama in Codespace if missing
if ! command -v ollama &>/dev/null; then
    echo "[*] Ollama not found. Installing Ollama CLI into Codespace..."
    curl -fsSL https://ollama.com/install.sh | sh
    echo "[+] Ollama installed successfully."
else
    echo "[+] Ollama already installed."
fi

# 3. Start Ollama daemon in background if not responding
echo "[*] Verifying Ollama daemon status..."
if ! curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
    echo "[*] Starting 'ollama serve' in background..."
    nohup ollama serve > /tmp/ollama_codespace.log 2>&1 &
    
    # Wait up to 15 seconds for Ollama daemon to become ready
    RETRIES=15
    while ! curl -s http://localhost:11434/api/tags >/dev/null 2>&1; do
        sleep 1
        RETRIES=$((RETRIES - 1))
        if [ "$RETRIES" -le 0 ]; then
            echo "[-] Error: Timed out waiting for Ollama service to start."
            cat /tmp/ollama_codespace.log
            exit 1
        fi
    done
fi
echo "[+] Ollama daemon is active and responding."

# 4. Check & Pull required LLM model (qwen2.5:0.5b)
echo "[*] Checking for model 'qwen2.5:0.5b'..."
if curl -s http://localhost:11434/api/tags | grep -q "qwen2.5:0.5b"; then
    echo "[+] Model 'qwen2.5:0.5b' is cached and ready."
else
    echo "[*] Pulling 'qwen2.5:0.5b' (~397 MB, optimized for fast CPU inference)..."
    ollama pull qwen2.5:0.5b
    echo "[+] Model downloaded successfully."
fi

# 5. Set up Python Virtual Environment & Dependencies
if [ ! -d ".venv" ]; then
    echo "[*] Creating Python virtual environment (.venv)..."
    python3 -m venv .venv
    echo "[*] Upgrading pip..."
    .venv/bin/pip install --upgrade pip --quiet
    echo "[*] Installing dependencies from requirements.txt..."
    .venv/bin/pip install -r requirements.txt --quiet
    echo "[+] Dependencies installed."
else
    echo "[+] Existing virtual environment found."
fi

# 6. Free Port 8000 if occupied
PORT=8000
if command -v lsof &>/dev/null && lsof -ti:$PORT >/dev/null 2>&1; then
    echo "[*] Port $PORT in use. Releasing port..."
    kill -9 $(lsof -ti:$PORT) 2>/dev/null || true
    sleep 1
elif command -v fuser &>/dev/null && fuser $PORT/tcp >/dev/null 2>&1; then
    echo "[*] Port $PORT in use. Releasing port..."
    fuser -k $PORT/tcp 2>/dev/null || true
    sleep 1
fi

echo "============================================================"
echo "  🚀 ARENA READY ON PORT ${PORT}"
echo "============================================================"
if [ "$CODESPACES" = "true" ] && [ -n "$CODESPACE_NAME" ]; then
    echo "  🌐 Codespace Detected!"
    echo "  🔗 Direct Web URL: https://${CODESPACE_NAME}-${PORT}.app.github.dev"
    echo ""
    echo "  📌 NOTE: In the VS Code 'PORTS' tab below:"
    echo "     1. Find port ${PORT}"
    echo "     2. Right-click -> Set 'Port Visibility' to 'Public'"
else
    echo "  🔗 Access locally: http://localhost:${PORT}"
fi
echo "============================================================"

# 7. Start FastAPI Uvicorn Server
exec .venv/bin/python -m uvicorn server.app:app --host 0.0.0.0 --port $PORT
