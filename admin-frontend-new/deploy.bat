@echo off
echo ========================================
echo 業務管理システム デプロイスクリプト
echo ========================================
echo.

echo [1/3] ビルド中...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ ビルドに失敗しました
    pause
    exit /b %errorlevel%
)
echo ✅ ビルド完了

echo.
echo [2/3] Vercelにデプロイ中...
call vercel --prod
if %errorlevel% neq 0 (
    echo ❌ デプロイに失敗しました
    pause
    exit /b %errorlevel%
)
echo ✅ デプロイ完了

echo.
echo [3/3] デプロイURL:
echo https://new-admin-management-system.vercel.app
echo.
echo ========================================
echo デプロイが完了しました！
echo ========================================
pause
