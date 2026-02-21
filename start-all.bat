@echo off
echo ========================================
echo Starting Backend and Frontend
echo ========================================

REM バックエンドを起動（バックグラウンド）
echo Starting backend on port 3000...
start "Backend" cmd /k "cd backend && npm run dev"

REM 5秒待機
timeout /t 5 /nobreak

REM フロントエンドを起動（バックグラウンド）
echo Starting frontend on port 5173...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo Backend: http://localhost:3000
echo Frontend: http://localhost:5173 (or 5174 if 5173 is in use)
echo ========================================
echo.
echo Press any key to exit (servers will continue running)...
pause
