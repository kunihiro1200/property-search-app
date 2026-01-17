@echo off
echo ========================================
echo バックエンド起動スクリプト
echo ========================================
echo.

echo [1/3] ポート3000を使用しているプロセスを終了中...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo プロセスID %%a を終了します...
    taskkill /F /PID %%a >nul 2>&1
)

echo [2/3] すべてのNode.jsプロセスを終了中...
taskkill /F /IM node.exe /T >nul 2>&1

timeout /t 2 /nobreak >nul

echo [3/3] バックエンドを起動中...
cd backend
npm run dev
