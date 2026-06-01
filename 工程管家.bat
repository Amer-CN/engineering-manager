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
dotnet run
exit
