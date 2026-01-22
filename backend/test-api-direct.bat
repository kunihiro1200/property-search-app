@echo off
echo Testing API endpoint for AA13424...
curl -X GET "http://localhost:3000/api/sellers/AA13424" -H "Content-Type: application/json"
pause
