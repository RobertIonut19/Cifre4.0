@echo off
echo ========================================================
echo   Pornire Rapidă Joc (Backend + Frontend)
echo ========================================================

:: Setare URL PostgreSQL
set DATABASE_URL=postgresql://cifre_db_user:sBlu165teR2wKbhc1RRwS36K9jJXuGUr@dpg-d9urqvdbedkc73aul88g-a.frankfurt-postgres.render.com/cifre_db

echo 1. Pornire Backend FastAPI (Instant)...
start cmd /k "cd backend && set DATABASE_URL=postgresql://cifre_db_user:sBlu165teR2wKbhc1RRwS36K9jJXuGUr@dpg-d9urqvdbedkc73aul88g-a.frankfurt-postgres.render.com/cifre_db && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

echo 2. Pornire Frontend Angular (Instant)...
start cmd /k "cd frontend && npm start"

echo.
echo Backend Python: http://localhost:8000
echo Frontend Angular: http://localhost:4300
echo.
pause
