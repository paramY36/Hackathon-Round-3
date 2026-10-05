@echo off
REM ==============================================================================
REM CLASH ROYALE AUTONOMOUS 1V1 ARENA LAUNCHER (WINDOWS)
REM ==============================================================================

echo ============================================================
echo     CLASH ROYALE AI ARENA: 2-LANE KNOCKOUT TOURNAMENT
echo ============================================================

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [-] Error: Python is not installed or not in PATH.
    pause
    exit /b 1
)

REM Setup venv if missing
if not exist ".venv" (
    echo [*] Creating virtual environment .venv...
    python -m venv .venv
    echo [*] Installing requirements...
    .venv\Scripts\python -m pip install --upgrade pip
    .venv\Scripts\python -m pip install -r requirements.txt
)

echo [*] Starting Clash Royale Arena Server on http://localhost:8000 ...
start http://localhost:8000
.venv\Scripts\python -m uvicorn server.app:app --host 0.0.0.0 --port 8000
pause
