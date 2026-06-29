@echo off
chcp 65001 >nul 2>&1
title Engineering Manager - Release Build

echo ============================================================
echo   Engineering Manager - 一键发版脚本
echo ============================================================
echo.

pushd "%~dp0"

:: Read version from package.json
for /f "tokens=2 delims=:, " %%a in ('findstr /C:"version" package.json') do set VERSION=%%~a
set VERSION=%VERSION:"=%
echo   Version: %VERSION%

:: Check EM_RELEASE_BASE
if "%EM_RELEASE_BASE%"=="" (
    echo.
    echo   [ERROR] 缺少环境变量 EM_RELEASE_BASE
    echo   请设置: set EM_RELEASE_BASE=https://github.com/Amer-CN/engineering-manager/releases/download/v%%VERSION%%
    echo.
    pause
    exit /b 1
)
echo   Release Base: %EM_RELEASE_BASE%
echo.

:: 1. Sync version to all downstream files
echo [1/5] Syncing version to all files...
call npm run sync-version
if errorlevel 1 ( echo X FAILED & pause & exit /b 1 )
echo    OK

:: 2. Build main app frontend
echo.
echo [2/5] Building main app frontend...
call npx vite build
if errorlevel 1 ( echo X FAILED & pause & exit /b 1 )
echo    OK

:: 3. Publish main app
echo.
echo [3/5] Publishing main app...
set APP_DIR=EngineeringManager.Installer\app-files
if exist "%APP_DIR%" rmdir /s /q "%APP_DIR%"
dotnet publish EngineeringManager.Api -c Release -r win-x64 --self-contained -o "%APP_DIR%"
if errorlevel 1 ( echo X FAILED & pause & exit /b 1 )
echo    OK

:: 4. Copy frontend + config into app-files
echo.
echo [4/5] Copying assets into app-files...
xcopy /E /I /Q /Y dist "%APP_DIR%\dist" >nul
copy /Y public\ocr-config.json "%APP_DIR%\ocr-config.json" >nul
copy /Y public\seed-data.json "%APP_DIR%\seed-data.json" >nul
echo    OK

:: 5. Build installer with Inno Setup
echo.
echo [5/5] Building installer with Inno Setup...
if not exist release mkdir release
iscc installer.iss /DVERSION=%VERSION%
if errorlevel 1 ( echo X FAILED & pause & exit /b 1 )
echo    OK

:: Generate manifest
echo.
echo [6/6] Generating manifest...
call npm run release:manifest
if errorlevel 1 ( echo X FAILED & pause & exit /b 1 )
echo    OK

:: Commit and push
echo.
echo [7/7] Committing and pushing...
git add -A
git commit -m "release: v%VERSION%"
git tag v%VERSION%
git push origin master --tags
if errorlevel 1 ( echo X FAILED & pause & exit /b 1 )
echo    OK

echo.
echo ============================================================
echo   RELEASE COMPLETE!
echo.
echo   Installer: release\EngineeringManager-Setup-%VERSION%.exe
echo   Tag: v%VERSION%
echo   Manifest: update/manifest.json
echo.
echo   Next steps:
echo   1. Upload installer to GitHub Release
echo   2. Verify manifest URL works
echo   3. Test auto-update flow
echo ============================================================
echo.

explorer release
popd
pause
