@echo off
chcp 65001 >nul 2>&1
title EngineeringManager

if "%WT_SESSION%"=="" (
    where wt.exe >nul 2>nul
    if not errorlevel 1 (
        wt.exe -w -1 cmd /c "%~f0"
        exit /b
    )
)

pushd "%~dp0"
cd EngineeringManager.Api

:: v0.72.0: 启动前杀残留进程, 避免端口锁死 (5048 占着)
taskkill /F /IM EngineeringManager.Api.exe 2>nul
taskkill /F /FI "WINDOWTITLE eq EngineeringManager*" 2>nul
timeout /t 1 /nobreak >nul

dotnet run
exit
