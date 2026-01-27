@echo off
cd /d "%~dp0"

echo Step 1: Checking Node.js version...
node -v
if %errorlevel% neq 0 (
    echo Node.js is NOT installed!
    pause
    exit
)

echo Step 2: Starting Server...
cd server
start "Backend" cmd /k "cd /d "%~dp0server" && node src/app.js"
cd ..

timeout /t 3

echo Step 3: Starting Client...
cd client
start "Frontend" cmd /k "cd /d "%~dp0client" && npm run dev"
cd ..

echo Done! Browser should open manually at http://localhost:8888
pause