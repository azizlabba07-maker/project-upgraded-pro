@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

:: --------------------------------------------------------------
:: 1️⃣ الوصول إلى مجلد السكربت الحالي (أي المجلد الذي يحتوي هذا الـ .bat)
:: --------------------------------------------------------------
cd /d "%~dp0"

echo =======================================================
echo   Adobe Motion Engine - Start Tool ^& Generate Videos
echo =======================================================
echo.

:: --------------------------------------------------------------
:: 2️⃣ تشغيل خادم Vite في نافذة مستقلة (detached)
:: --------------------------------------------------------------
echo [1] Starting the Web Application (Local Server)...
start cmd /k "npm run dev"

echo [2] Waiting for server to start...
timeout /t 3 /nobreak >nul

echo [3] Opening the Application in your Browser...
start http://localhost:8080

echo.
echo ✅ Vite is running. You can now use the tool from your browser.
echo.
exit /b
