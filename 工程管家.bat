@echo off
title Engineering Manager
cd /d "%~dp0"

echo Clearing cache...
if exist "node_modules\.vite" (
    rd /s /q "node_modules\.vite"
    echo Cache cleared.
)

echo Starting application...
chcp 65001 >nul
npm run dev
\r