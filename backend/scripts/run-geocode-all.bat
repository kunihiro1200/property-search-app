@echo off
echo ========================================
echo 全物件の座標を一括ジオコーディング
echo ========================================
echo.
echo このスクリプトは全物件の座標をDBに保存します
echo 実行には数分かかります
echo.
pause

cd /d %~dp0\..
call npx ts-node scripts/geocode-all-properties.ts

echo.
echo ========================================
echo 完了しました
echo ========================================
pause
