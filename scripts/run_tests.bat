@echo off
echo ===================================================================
echo   Employee Calling & CRM Platform - Automated Test Suite
echo ===================================================================

cd /d "%~dp0\.."

echo Running pytest on backend test suite...
python -m pytest backend/tests/test_backend_suite.py -v --tb=short

if errorlevel 1 (
    echo.
    echo [TEST SUITE FAILED] Please examine errors above.
    pause
    exit /b 1
) else (
    echo.
    echo [TEST SUITE PASSED] All 12 test specifications succeeded.
)
pause
