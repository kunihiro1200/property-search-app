@echo off
chcp 65001 >nul
echo Registering hourly full sync task...

schtasks /create /tn "SellerFullSync_Hourly" /tr "C:\Users\kunih\sateituikyaku\backend\scripts\run-full-sync.bat" /sc hourly /mo 1 /f

echo.
echo Done! Checking task status:
schtasks /query /tn "SellerFullSync_Hourly"

pause
