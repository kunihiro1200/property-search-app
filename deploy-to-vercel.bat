@echo off
echo Deploying to Vercel directly from local...
echo.
cd frontend
npx vercel --prod
pause
