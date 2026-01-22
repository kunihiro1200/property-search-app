@echo off
chcp 65001 >nul
echo ========================================
echo  Development Server Startup
echo ========================================
echo.
echo Starting Backend and Frontend...
echo.

REM バックエンドを新しいウィンドウで起動
start "Backend Server (Port 3000)" cmd /k "cd backend && npm run dev"

REM 少し待ってからフロントエンドを起動
timeout /t 2 /nobreak >nul

REM フロントエンドを新しいウィンドウで起動
start "Frontend Server (Port 5173)" cmd /k "cd frontend && npm run dev"

echo.
echo Server started successfully!
echo.
echo Backend:  http://localhost:3000
echo Frontend: http://localhost:5173
echo.
echo Press Ctrl+C in each window to stop the servers.
echo.
