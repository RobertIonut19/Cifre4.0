@echo off
echo ========================================================
echo   Pornire Joc 4-Digit Number Guessing (Backend + Frontend)
echo ========================================================

echo 1. Instalare dependente backend si pornire FastAPI...
start cmd /k "cd backend && pip install -r requirements.txt && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

echo 2. Instalare dependente frontend si pornire Angular...
start cmd /k "cd frontend && npm install && npm start"

echo.
echo Server Backend: http://localhost:8000
echo Frontend Angular: http://localhost:4300
echo.
pause
