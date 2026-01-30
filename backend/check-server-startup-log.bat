@echo off
echo Checking backend server startup log...
cd backend
npm run dev 2>&1 | findstr /C:"Enhanced periodic" /C:"Auto-sync" /C:"Server running"
