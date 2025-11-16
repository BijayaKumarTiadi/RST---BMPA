@echo off
echo Running child user database migration...
echo.

curl -X POST http://localhost:5000/api/database/add-company-child-user-columns -H "Content-Type: application/json"

echo.
echo.
echo Migration complete! Press any key to close...
pause > nul