@echo off
cd /d "%~dp0"
echo Building TypeScript...
call "D:\Program Files\nodejs\node.exe" node_modules/typescript/bin/tsc
if %ERRORLEVEL% NEQ 0 goto error
echo Building Vite...
call "D:\Program Files\nodejs\node.exe" node_modules/vite/bin/vite.js build
if %ERRORLEVEL% NEQ 0 goto error
echo Building Electron...
electron-builder
if %ERRORLEVEL% NEQ 0 goto error
echo Build complete!
exit /b 0
:error
echo Build failed!
exit /b 1