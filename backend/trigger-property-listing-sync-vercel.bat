@echo off
if "%CRON_SECRET%"=="" (
  echo ERROR: CRON_SECRET must be configured in the current environment.
  exit /b 1
)
echo Triggering authenticated property listing sync on Vercel...
curl --fail-with-body --silent --show-error --request GET --header "Authorization: Bearer %CRON_SECRET%" "https://property-site-frontend-kappa.vercel.app/api/cron/sync-property-listings"
if errorlevel 1 (
  echo ERROR: Request failed.
  exit /b 1
)
echo.
echo Sync request complete.
pause
