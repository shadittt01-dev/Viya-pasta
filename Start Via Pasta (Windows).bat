@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Download the LTS version from https://nodejs.org , install it, then double-click this file again.
  start https://nodejs.org
  pause
  exit /b
)
echo Starting the Via Pasta website... keep this window open while you use it.
start "" cmd /c "timeout /t 4 >nul && start http://localhost:3000"
node --disable-warning=ExperimentalWarning server/main.js
pause
