@echo off
echo =============================================
echo   InsightAI Backend Diagnostic Check
echo =============================================
echo.

echo [1] Checking Node.js...
node --version
if %ERRORLEVEL% neq 0 (
  echo ERROR: Node.js is not installed or not in PATH!
  echo Download from: https://nodejs.org
  pause
  exit /b 1
)

echo.
echo [2] Checking npm...
npm --version
if %ERRORLEVEL% neq 0 (
  echo ERROR: npm not found!
  pause
  exit /b 1
)

echo.
echo [3] Checking node_modules...
if not exist "backend\node_modules" (
  echo node_modules missing - running npm install in backend...
  cd backend
  npm install
  cd ..
) else (
  echo node_modules OK
)

echo.
echo [4] Checking ts-node...
cd backend
call npx ts-node --version
if %ERRORLEVEL% neq 0 (
  echo WARNING: ts-node may have issues
)

echo.
echo [5] TypeScript type check...
call npx tsc --noEmit 2>&1
if %ERRORLEVEL% neq 0 (
  echo WARNING: TypeScript errors found above
) else (
  echo TypeScript OK - no errors
)

echo.
echo [6] Starting backend server (will show errors if any)...
echo     Press Ctrl+C to stop
echo.
npm run dev

cd ..
pause
