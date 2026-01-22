@echo off
echo Deploying frontend to Vercel...
echo.
echo Project: property-site-frontend
echo.
cd frontend
npx vercel --prod
pause
