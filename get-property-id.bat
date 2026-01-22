@echo off
REM 公開物件のIDを取得

echo 公開物件のIDを取得します...
echo.

curl "http://localhost:3000/api/public/properties?limit=1"

echo.
echo.
pause
