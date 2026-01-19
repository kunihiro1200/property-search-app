@echo off
echo Testing Image Proxy Endpoint...
echo.

echo Testing image proxy with file ID: 1FWLuG5aEJUWUlyAMI21ihYCh07x-cpUR
echo URL: https://baikyaku-property-site3.vercel.app/api/public/images/proxy/1FWLuG5aEJUWUlyAMI21ihYCh07x-cpUR
echo.

curl -I "https://baikyaku-property-site3.vercel.app/api/public/images/proxy/1FWLuG5aEJUWUlyAMI21ihYCh07x-cpUR"
echo.
echo.

echo If you see "Content-Type: image/jpeg" above, the proxy is working!
echo If you see 404 or 500, there's an error.
echo.
pause
