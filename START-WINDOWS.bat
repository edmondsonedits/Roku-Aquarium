@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 24 LTS from https://nodejs.org then open this file again.
  pause
  exit /b 1
)
node -e "if(Number(process.versions.node.split('.')[0])<24)process.exit(1)"
if errorlevel 1 (
  echo Node.js 24 or newer is required. Get it from https://nodejs.org
  pause
  exit /b 1
)
echo Keep this window open while the aquarium is running.
echo Open http://localhost:4317 on this computer.
node runtime/server.mjs
pause
