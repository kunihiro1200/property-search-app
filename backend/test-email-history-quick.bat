@echo off
echo ========================================
echo メール履歴APIテスト
echo ========================================
echo.

cd /d "%~dp0"
call npx ts-node test-email-history-api.ts

echo.
echo ========================================
echo テスト完了
echo ========================================
pause
