@echo off
echo Checking port 3000...
netstat -ano | findstr :3000
echo.
echo If you see any results above, port 3000 is in use.
echo To kill the process, run: taskkill /PID [PID_NUMBER] /F
pause
