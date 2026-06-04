@echo off
echo ==========================================
echo Starting InsightAI SaaS Local Dev Servers
echo ==========================================

echo [1/3] Running npm install in backend...
cd backend
call npm install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to run npm install in backend.
    pause
    exit /b %ERRORLEVEL%
)

echo [2/3] Starting backend dev server (Port 4000)...
start "InsightAI Backend" cmd /k "npm run dev"

echo [3/3] Starting frontend dev server (Port 5173)...
cd ../frontend
start "InsightAI Frontend" cmd /k "npm run dev"

echo ==========================================
echo All servers launched in separate windows!
echo Backend: http://localhost:4000
echo Frontend: http://localhost:5173
echo ==========================================
pause
