@echo off
chcp 65001 >nul 2>&1
title EngineeringManager

cd /d "%~dp0EngineeringManager.Api"

taskkill /F /IM EngineeringManager.Api.exe 2>nul
timeout /t 1 /nobreak >nul

dotnet run
exit
