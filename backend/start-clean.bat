@echo off
echo ========================================
echo バックエンドサーバーをクリーン起動
echo ========================================
echo.

echo [1/2] ポート3000をクリーンアップ中...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo   - プロセスID %%a を停止中...
    taskkill /F /PID %%a 2>nul
)
echo   ✓ ポート3000がクリアされました
echo.

echo [2/2] バックエンドサーバーを起動中...
npm run dev
