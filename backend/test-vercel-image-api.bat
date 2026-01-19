@echo off
echo Testing Vercel Image API Endpoints...
echo.

echo 1. Testing health endpoint...
curl -X GET "https://baikyaku-property-site3.vercel.app/api/health"
echo.
echo.

echo 2. Testing properties list (first 5)...
curl -X GET "https://baikyaku-property-site3.vercel.app/api/public/properties?limit=5"
echo.
echo.

echo 3. Testing specific property images endpoint (AA13069)...
curl -X GET "https://baikyaku-property-site3.vercel.app/api/public/properties/AA13069/images"
echo.
echo.

echo Done!
pause
