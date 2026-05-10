@echo off
cd /d "%~dp0"
echo === Starting Vite Build ===
npx vite build 2>&1
echo === Build Exit Code: %ERRORLEVEL% ===
pause
