@echo off
echo Restarting backend server...
taskkill /F /IM node.exe /T 2>nul
timeout /t 2 /nobreak >nul
cd backend
npm run dev
