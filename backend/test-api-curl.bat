@echo off
echo Testing API endpoint...
echo.
curl -s http://localhost:3000/api/sellers/AA13424 | jq ".visitAcquisitionDate, .visitDate, .visitValuationAcquirer, .visitAssignee"
echo.
pause
