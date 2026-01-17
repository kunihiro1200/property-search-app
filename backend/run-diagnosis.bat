@echo off
cd /d %~dp0
echo 診断を実行中...
npx ts-node diagnose-property-listing-sync.ts AA4885 > diagnosis-result.txt 2>&1
echo 診断完了。結果を表示します:
echo.
type diagnosis-result.txt
