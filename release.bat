@echo off
chcp 65001 >nul 2>&1
title Engineering Manager - Release Build

echo ============================================================
echo   Engineering Manager - 一键发版脚本（WebView2 安装器）
echo ============================================================
echo.

pushd "%~dp0"

:: Read version from package.json
for /f "tokens=2 delims=:, " %%a in ('findstr /C:"version" package.json') do set VERSION=%%~a
set VERSION=%VERSION:"=%
echo   Version: %VERSION%

:: Auto-set EM_RELEASE_BASE
if "%EM_RELEASE_BASE%"=="" (
    set EM_RELEASE_BASE=https://github.com/Amer-CN/engineering-manager/releases/download/v%VERSION%
    echo   [AUTO] EM_RELEASE_BASE: %EM_RELEASE_BASE%
)
echo.

:: 1. Sync version to all downstream files
echo [1/7] Syncing version to all files...
call npm run sync-version
if errorlevel 1 ( echo X FAILED & pause & exit /b 1 )
echo    OK

:: 2. Build installer frontend (WebView2 UI)
echo.
echo [2/7] Building installer frontend...
cd installer
call npx vite build
if errorlevel 1 ( echo X FAILED & pause & exit /b 1 )
cd ..
echo    OK

:: 3. Build main app frontend
echo.
echo [3/7] Building main app frontend...
call npx vite build
if errorlevel 1 ( echo X FAILED & pause & exit /b 1 )
echo    OK

:: 4. Publish main app + copy assets
echo.
echo [4/7] Publishing main app...
set APP_DIR=EngineeringManager.Installer\app-files
if exist "%APP_DIR%" rmdir /s /q "%APP_DIR%"
dotnet publish EngineeringManager.Api -c Release -r win-x64 --self-contained -o "%APP_DIR%"
if errorlevel 1 ( echo X FAILED & pause & exit /b 1 )
xcopy /E /I /Q /Y dist "%APP_DIR%\dist" >nul
copy /Y public\ocr-config.json "%APP_DIR%\ocr-config.json" >nul
copy /Y public\seed-data.json "%APP_DIR%\seed-data.json" >nul
echo    OK

:: 4b. Build & stage uninstaller (frontend + single-file exe) -> app-files\uninstall\
echo.
echo [uninstaller] Building uninstaller frontend...
cd uninstaller
call npx vite build
if errorlevel 1 ( echo X UNINSTALLER FRONTEND FAILED & pause & exit /b 1 )
cd ..
echo [uninstaller] Publishing uninstaller exe...
dotnet publish EngineeringManager.Uninstaller -c Release -o release-uninstaller
if errorlevel 1 ( echo X UNINSTALLER PUBLISH FAILED & pause & exit /b 1 )
if exist "%APP_DIR%\uninstall" rmdir /s /q "%APP_DIR%\uninstall"
xcopy /E /I /Q /Y release-uninstaller "%APP_DIR%\uninstall" >nul
del "%APP_DIR%\uninstall\*.pdb" >nul 2>&1
ren "%APP_DIR%\uninstall\EngineeringManager.Uninstaller.exe" 工程管家卸载.exe
xcopy /E /I /Q /Y uninstaller\dist "%APP_DIR%\uninstall\uninstaller" >nul
rmdir /s /q release-uninstaller 2>nul
echo    OK

:: 5. Build WebView2 installer (payload.zip + single-file publish + stub+payload+footer)
echo.
echo [5/7] Building WebView2 installer...
:: 5a. Create payload.zip
if exist EngineeringManager.Installer\payload.zip del EngineeringManager.Installer\payload.zip
cd EngineeringManager.Installer
powershell -Command "Compress-Archive -Path 'app-files','..\installer\dist' -DestinationPath 'payload.zip' -Force"
cd ..
if errorlevel 1 ( echo X PAYLOAD FAILED & pause & exit /b 1 )

:: 5b. Publish installer as single-file
if exist release-installer rmdir /s /q release-installer
dotnet publish EngineeringManager.Installer -c Release -r win-x64 --self-contained -o release-installer -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true
if errorlevel 1 ( echo X STUB FAILED & pause & exit /b 1 )

:: 5c. Concatenate stub + payload + footer (EMPAYLD1 magic + Int64 length)
if not exist release mkdir release
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\pack-installer.ps1 -Stub "release-installer\EngineeringManager.Installer.exe" -Payload "EngineeringManager.Installer\payload.zip" -Out "release\EngineeringManager-Setup-%VERSION%.exe"
if errorlevel 1 ( echo X CONCAT FAILED & pause & exit /b 1 )

rmdir /s /q release-installer 2>nul
echo    OK

:: 6. Generate manifest (SHA256 of final exe)
echo.
echo [6/7] Generating manifest...
call npm run release:manifest
if errorlevel 1 ( echo X FAILED & pause & exit /b 1 )
echo    OK

:: 7. Commit, tag, push, create GitHub Release
echo.
echo [7/7] Committing and pushing...
git add -A
git commit -m "release: v%VERSION%"
git tag v%VERSION%
git push origin master --tags
if errorlevel 1 ( echo X FAILED & pause & exit /b 1 )

echo.
echo ============================================================
echo   RELEASE COMPLETE!
echo.
echo   Installer: release\EngineeringManager-Setup-%VERSION%.exe
echo   Tag: v%VERSION%
echo   Manifest: update/manifest.json
echo ============================================================
echo.

explorer release
popd
pause
