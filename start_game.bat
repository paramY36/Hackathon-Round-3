@echo off

python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH.
    pause
    exit /b 1
)

if not exist ".venv" (
    echo Setting up virtual environment...
    python -m venv .venv
    .venv\Scripts\python -m pip install --upgrade pip
    .venv\Scripts\python -m pip install -r requirements.txt
)

echo Starting server on http://localhost:8000
start http://localhost:8000
.venv\Scripts\python -m uvicorn server.app:app --host 0.0.0.0 --port 8000
pause
