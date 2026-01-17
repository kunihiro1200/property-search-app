@echo off
REM 問い合わせAPIテスト用スクリプト

echo 問い合わせAPIをテストします...
echo.

curl -X POST http://localhost:3000/api/public/inquiries ^
  -H "Content-Type: application/json" ^
  -d "{\"property_id\":\"AA10424\",\"name\":\"テスト太郎\",\"email\":\"test@example.com\",\"phone\":\"090-1234-5678\",\"message\":\"テスト問い合わせです\"}"

echo.
echo.
echo テスト完了
pause
