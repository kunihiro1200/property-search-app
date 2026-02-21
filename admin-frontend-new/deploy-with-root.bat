@echo off
echo Deploying frontend to Vercel with correct root directory...
echo.
npx vercel --prod --cwd .
pause
