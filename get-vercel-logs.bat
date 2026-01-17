@echo off
echo Fetching Vercel deployment logs...
npx vercel logs baikyaku-property-site3 --token=%VERCEL_TOKEN%
pause
