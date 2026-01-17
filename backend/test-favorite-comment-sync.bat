@echo off
echo Testing favorite comment sync with 5 properties...
echo.
cd backend
npx ts-node sync-favorite-comments-to-database.ts --limit 5 --dry-run
echo.
echo Dry run complete. Review the output above.
echo.
echo To run without dry-run mode:
echo   npx ts-node sync-favorite-comments-to-database.ts --limit 5
echo.
pause
