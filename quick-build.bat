@echo off
cd /d "%~dp0"
echo Step 1: Building Vite...
call "D:\Program Files\nodejs\node.exe" node_modules/vite/bin/vite.js build
if %ERRORLEVEL% NEQ 0 goto error

echo Step 2: Building Electron...
electron-builder --win --dir
if %ERRORLEVEL% NEQ 0 goto error

echo Build complete! Output in release\win-unpacked
pause
exit /b 0

:error
echo Build failed!
pause
exit /b 1