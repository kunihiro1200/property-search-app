@echo off
echo Testing Vercel build locally...
echo.
echo Step 1: Clean install
cd frontend
if exist node_modules rmdir /s /q node_modules
if exist dist rmdir /s /q dist

echo.
echo Step 2: Install dependencies
call npm install

echo.
echo Step 3: Build with production mode
call npm run build

echo.
echo Build test completed!
pause
