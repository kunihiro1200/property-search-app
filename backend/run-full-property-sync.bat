@echo off
echo Starting full property and valuation data sync...
echo This will take approximately 30-60 minutes for 8753 rows.
echo.
npx ts-node sync-property-and-valuation-data.ts
echo.
echo Sync complete!
pause
