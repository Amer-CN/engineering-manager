@echo off
title Engineering Manager

:: 如果没在 Windows Terminal 里，就投递到 WT 启动（无闪屏，美观）
if "%WT_SESSION%"=="" (
    where wt.exe >nul 2>nul
    if not errorlevel 1 (
        wt.exe -w -1 cmd /c "%~f0"
        exit /b
    )
)

cd /d "%~dp0"

echo Clearing cache...
if exist "node_modules\.vite" (
    rd /s /q "node_modules\.vite"
    echo Cache cleared.
)

echo Starting application...
chcp 65001 >nul
set NODE_OPTIONS=
npm run dev
\r