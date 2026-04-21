@echo off
chcp 65001 >nul
echo =======================================================
echo   Adobe Motion Engine - Start Tool ^& Generate Videos
echo =======================================================
echo.
echo [1] Starting the Web Application (Local Server)...
start cmd /k "npm run dev"

echo [2] Waiting for server to start...
timeout /t 3 /nobreak >nul

echo [3] Opening the Application in your Browser...
start http://localhost:8080

echo.
echo =======================================================
echo  If you want to generate videos, make sure you have 
echo  downloaded the 'batch_tokens.json' file first!
echo =======================================================
echo.
pause
echo [4] Starting Video Generation...
node scripts\batch-render.js

echo.
pause
