@echo off
echo Triggering property listing sync on Vercel...
curl -X GET "https://property-site-frontend-kappa.vercel.app/api/cron/sync-property-listings"
echo.
echo Done!
pause
