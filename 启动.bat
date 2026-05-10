@echo off
chcp 65001 >nul
cd /d "%~dp0"
set NODE_OPTIONS=--no-deprecation
npm run dev
pause
