@echo off
chcp 65001 >nul 2>&1
title Engineering Manager - Build Installer

echo ============================================================
echo   Engineering Manager - Custom Installer Build
echo ============================================================
echo.

pushd "%~dp0"

:: 1. Build installer frontend
echo [1/5] Building installer frontend...
cd installer
call npx vite build
if errorlevel 1 (
    echo X Installer frontend build failed!
    pause
    exit /b 1
)
cd ..
echo OK Installer frontend built

:: 2. Build main app frontend
echo.
echo [2/5] Building main app frontend...
call npx vite build
if errorlevel 1 (
    echo X Main frontend build failed!
    pause
    exit /b 1
)
echo OK Main frontend built

:: 3. Publish main app
echo.
echo [3/5] Publishing main app...
set PUBLISH_DIR=EngineeringManager.Installer\app-files
if exist "%PUBLISH_DIR%" rmdir /s /q "%PUBLISH_DIR%"
dotnet publish EngineeringManager.Api -c Release -r win-x64 --self-contained -o "%PUBLISH_DIR%"
if errorlevel 1 (
    echo X Main app publish failed!
    pause
    exit /b 1
)
echo OK Main app published

:: 4. Copy frontend dist into app-files
echo.
echo [4/5] Copying frontend assets...
xcopy /E /I /Q /Y dist "%PUBLISH_DIR%\dist"
copy /Y public\ocr-config.json "%PUBLISH_DIR%\ocr-config.json" >nul
copy /Y public\seed-data.json "%PUBLISH_DIR%\seed-data.json" >nul
echo OK Assets copied

:: 5. Build installer exe
echo.
echo [5/5] Building installer...
cd EngineeringManager.Installer
dotnet publish -c Release -r win-x64 --self-contained -o ..\release
cd ..
if errorlevel 1 (
    echo X Installer build failed!
    pause
    exit /b 1
)

:: Copy installer frontend to release
xcopy /E /I /Q /Y installer\dist "release\installer\dist"

echo.
echo ============================================================
echo   BUILD COMPLETE!
echo.
echo   Installer: release\EngineeringManager.Installer.exe
echo ============================================================
echo.

explorer release
popd
pause
