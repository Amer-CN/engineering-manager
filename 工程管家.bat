@echo off
chcp 65001 >nul 2>&1
title EngineeringManager

cd /d "%~dp0EngineeringManager.Api"

:: 开发版数据隔离 — 不干扰安装版的数据（%APPDATA%\工程管家）
set "ENGINEERING_MANAGER_DATA_PATH=%~dp0data"

taskkill /F /IM EngineeringManager.Api.exe 2>nul
timeout /t 1 /nobreak >nul

dotnet run
exit
