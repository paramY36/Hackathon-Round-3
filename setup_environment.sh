#!/usr/bin/env bash
# ==============================================================================
# AI WARLORDS - ENVIRONMENT & MODEL PREPARATION SCRIPT
# Run this once on the host laptop before transferring, or on the destination laptop
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Preparing Python Environment ==="
python3 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r requirements.txt

echo "=== Checking Ollama & Local Model ==="
if command -v ollama &>/dev/null; then
    echo "[+] Ollama installed."
    # Start temporary daemon if not running
    if ! curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
        echo "[*] Starting temporary Ollama instance..."
        nohup ollama serve > /tmp/ollama_prep.log 2>&1 &
        sleep 3
    fi
    echo "[*] Ensuring 'qwen2.5:0.5b' model is downloaded locally..."
    ollama pull qwen2.5:0.5b
    echo "[+] Model qwen2.5:0.5b ready in local Ollama cache!"
else
    echo "[-] Ollama command not found in PATH. Install from https://ollama.com"
fi

echo "=== Running Self-Verification Test Suite ==="
.venv/bin/python -m unittest tests/test_game.py

echo "=== Environment Ready! ==="
echo "You can now run ./start_game.sh"
