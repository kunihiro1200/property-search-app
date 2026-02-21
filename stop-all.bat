@echo off
echo ========================================
echo Stopping Backend and Frontend
echo ========================================

REM ポート3000を使用しているプロセスを停止
echo Stopping backend (port 3000)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do (
    taskkill /F /PID %%a 2>nul
)

REM ポート5173を使用しているプロセスを停止
echo Stopping frontend (port 5173)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do (
    taskkill /F /PID %%a 2>nul
)

REM ポート5174を使用しているプロセスを停止
echo Stopping frontend (port 5174)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5174') do (
    taskkill /F /PID %%a 2>nul
)

echo.
echo ========================================
echo All servers stopped
echo ========================================
pause
