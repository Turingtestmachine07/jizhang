@echo off
chcp 65001 >nul
setlocal
title Financial Management System Launcher

:: Switch to script directory
cd /d "%~dp0"

echo [INIT] Starting Financial Management System...
echo.

:: Check if node is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not detected, please install Node.js first
    echo    Download: https://nodejs.org/
    pause
    exit /b 1
)

echo [INFO] Node.js version:
node -v
echo.

:: Check if data directory exists
if not exist "server\data" (
    echo [INFO] Creating data directory...
    mkdir "server\data"
)

:: Start backend server
echo [BACKEND] Starting server...
cd server
if not exist "node_modules" (
    echo    Installing server dependencies, please wait...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Server dependencies installation failed
        cd ..
        pause
        exit /b 1
    )
)
start "Financial System - Backend" cmd /k "cd /d "%~dp0server" && node src/app.js"
cd ..

:: Wait for server to start (3 seconds)
echo [INFO] Waiting for server to initialize...
timeout /t 3 /nobreak >nul

:: Start frontend server
echo [FRONTEND] Starting client...
cd client
if not exist "node_modules" (
    echo    Installing client dependencies, please wait...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Client dependencies installation failed
        cd ..
        pause
        exit /b 1
    )
)
start "Financial System - Frontend" cmd /k "cd /d "%~dp0client" && npm run dev"
cd ..

:: Wait for frontend to start (5 seconds)
echo [INFO] Waiting for frontend to initialize...
timeout /t 5 /nobreak >nul

:: Get local IP address (simplified version to prevent errors)
set "LOCAL_IP=localhost"
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4" 2^>nul') do (
    set "LOCAL_IP=%%a"
    goto :ip_found
)
:ip_found
:: Remove spaces
for /f "tokens=* delims= " %%a in ("%LOCAL_IP%") do set LOCAL_IP=%%a

:: Open browser
echo.
echo [BROWSER] Opening browser...
start http://localhost:8888

echo.
echo [SUCCESS] System startup complete!
echo.
echo    Local access: http://localhost:8888
echo    Network access: http://%LOCAL_IP%:8888
echo.
echo [TIP] If the page doesn't open, check the popup windows for error messages.
echo.
pause
