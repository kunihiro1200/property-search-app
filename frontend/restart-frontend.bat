@echo off
echo フロントエンドを再起動します...
echo.

cd /d "%~dp0"

echo 1. 既存のプロセスを停止...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo 2. 環境変数を確認...
type .env
echo.
type .env.local
echo.

echo 3. フロントエンドを起動...
npm run dev

pause
