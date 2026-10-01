@echo off
echo ===================================================================
echo   Employee Calling & CRM Platform - Backend Development Launcher
echo ===================================================================

cd /d "%~dp0\.."

echo Checking Python environment...
python --version
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH!
    pause
    exit /b 1
)

echo Seeding database with initial users and disposition codes...
python scripts/seed_data.py

echo.
echo Starting FastAPI development server on http://localhost:8000 ...
echo Swagger Documentation: http://localhost:8000/docs
echo Health Check:          http://localhost:8000/health
echo.
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
pause
