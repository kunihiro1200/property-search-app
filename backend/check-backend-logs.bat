@echo off
echo Checking backend logs for PropertyListingService...
echo.
echo Looking for PropertyListingService logs in the last 100 lines:
echo ================================================================
powershell -Command "Get-Content backend-output.log -Tail 100 | Select-String -Pattern 'PropertyListingService|PropertyImageService' -Context 2,2"
echo.
echo ================================================================
echo.
pause
