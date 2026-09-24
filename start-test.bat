@echo off
setlocal
cd /d "%~dp0"

where npm >nul 2>&1
if errorlevel 1 (
  echo Node.js/npm was not found. Please install Node.js 20.19+ first.
  pause
  exit /b 1
)

start "Exam Dev Server" cmd /k "cd /d ""%~dp0"" && npm run dev"
echo Starting the exam app...
timeout /t 3 /nobreak >nul
start "" "http://localhost:5173/"

endlocal
