@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo [1/3] Setting up Visual Studio environment...
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
if errorlevel 1 (
  echo [ERROR] Failed to set up VS environment
  pause
  exit /b 1
)

echo [2/3] VS environment set.
where msbuild >nul 2>nul || echo [WARN] msbuild not in PATH

echo [3/3] Running electron-rebuild for better-sqlite3...
cd /d E:\测试
npx electron-rebuild --force --module-dir E:\测试\node_modules\better-sqlite3
if errorlevel 1 (
  echo [ERROR] electron-rebuild failed
  pause
  exit /b 1
)

echo [DONE] Rebuild completed successfully!
pause
