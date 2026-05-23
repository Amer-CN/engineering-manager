@echo off
setlocal
set NODE_OPTIONS=
set ELECTRON_RUN_AS_NODE=
cd /d E:\测试
node_modules\.bin\electron.cmd %*
endlocal
