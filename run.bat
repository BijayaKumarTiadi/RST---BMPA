@echo off
title My Node Server
setlocal

:: Change to script folder (important if run from Explorer)
cd /d "%~dp0"

:build
echo ===============================
echo Building the project...
echo ===============================
call npm run build
if %errorlevel% neq 0 (
    echo Build failed! Press any key to exit...
    pause >nul
    exit /b
)

:run
echo ===============================
echo Starting the project...
echo ===============================
set NODE_ENV=production
node dist/index.js --port 5000

echo.
echo ===============================
echo Server crashed or stopped!
echo Restarting in 5 seconds...
echo ===============================
timeout /t 5 /nobreak >nul
goto run
