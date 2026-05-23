@echo off
REM 彻底清除有害环境变量，然后启动 Electron
setlocal EnableDelayedExpansion

REM 清除当前 cmd 会话中的变量
set ELECTRON_RUN_AS_NODE=
set NODE_OPTIONS=

REM 使用 PowerShell 启动一个干净环境的 Electron
powershell -Command "& { $psi = New-Object System.Diagnostics.ProcessStartInfo; $psi.FileName = 'E:\测试\node_modules\electron\dist\electron.exe'; $psi.Arguments = '.'; $psi.UseShellExecute = $false; $psi.EnvironmentVariables.Clear(); $psi.EnvironmentVariables['PATH'] = $env:PATH; $psi.EnvironmentVariables['APPDATA'] = $env:APPDATA; $psi.EnvironmentVariables['USERPROFILE'] = $env:USERPROFILE; $psi.EnvironmentVariables['HOME'] = $env:HOME; $psi.EnvironmentVariables['USERNAME'] = $env:USERNAME; $psi.EnvironmentVariables['SYSTEMROOT'] = $env:SYSTEMROOT; $p = [System.Diagnostics.Process]::Start($psi); $p.WaitForExit(); }"
