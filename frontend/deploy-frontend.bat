@echo off
echo Deploying frontend to Vercel...
echo.
echo Project name: property-site-frontend
echo Backend API: https://baikyaku-property-site3.vercel.app
echo.
npx vercel --prod
pause
