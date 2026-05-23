@echo off
REM start-electron-final.cmd
REM 彻底清除有害环境变量，然后启动 Electron 应用

setlocal EnableDelayedExpansion

REM 显式设置为空字符串（覆盖系统继承的值）
set ELECTRON_RUN_AS_NODE=0
set NODE_OPTIONS=

echo [start-electron] ELECTRON_RUN_AS_NODE=!ELECTRON_RUN_AS_NODE!
echo [start-electron] NODE_OPTIONS=!NODE_OPTIONS!

REM 切换到项目目录
cd /d E:\测试

REM 直接调用 electron.exe，绕过 electron.cmd 和 cli.js
echo [start-electron] Starting Electron...
"E:\测试\node_modules\electron\dist\electron.exe" . 2>&1

endlocal
