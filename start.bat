@echo off
echo ========================================================
echo   Pornire Rapida Joc (Backend + Frontend)
echo ========================================================

:: Eliberare port vechi 8005
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8005" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo 1. Pornire Backend FastAPI (Port 8005)...
start "Backend FastAPI (Port 8005)" cmd /k "cd backend && python -m uvicorn main:app --host 0.0.0.0 --port 8005 --reload"

echo 2. Pornire Frontend Angular...
start "Frontend Angular (Port 4300)" cmd /k "cd frontend && npm start"

echo.
echo Backend Python: http://localhost:8005
echo Frontend Angular: http://localhost:4300
echo.
pause

