@echo off
echo ========================================
echo Checking Server Status
echo ========================================
echo.

REM バックエンド（ポート3000）の状態を確認
echo Backend (port 3000):
netstat -ano | findstr :3000 | findstr LISTENING >nul
if %errorlevel% equ 0 (
    echo   [RUNNING] Backend is running on port 3000
) else (
    echo   [STOPPED] Backend is not running
)

echo.

REM フロントエンド（ポート5173）の状態を確認
echo Frontend (port 5173):
netstat -ano | findstr :5173 | findstr LISTENING >nul
if %errorlevel% equ 0 (
    echo   [RUNNING] Frontend is running on port 5173
) else (
    echo   [STOPPED] Frontend is not running on port 5173
)

echo.

REM フロントエンド（ポート5174）の状態を確認
echo Frontend (port 5174):
netstat -ano | findstr :5174 | findstr LISTENING >nul
if %errorlevel% equ 0 (
    echo   [RUNNING] Frontend is running on port 5174
) else (
    echo   [STOPPED] Frontend is not running on port 5174
)

echo.
echo ========================================
echo.
pause
