@echo off
chcp 65001 >nul 2>&1
title Engineering Manager - Build Single-File Installer

echo ============================================================
echo   Engineering Manager - Single-File Installer Build
echo ============================================================
echo.

pushd "%~dp0"

:: Read version from package.json
for /f "tokens=2 delims=:, " %%a in ('findstr /C:"version" package.json') do set VERSION=%%~a
set VERSION=%VERSION:"=%
echo   Version: %VERSION%
echo.

:: 1. Build installer frontend
echo [1/6] Building installer frontend...
cd installer
call npx vite build
if errorlevel 1 ( echo X FAILED & pause & exit /b 1 )
cd ..
echo    OK

:: 2. Build main app frontend
echo.
echo [2/6] Building main app frontend...
call npx vite build
if errorlevel 1 ( echo X FAILED & pause & exit /b 1 )
echo    OK

:: 3. Publish main app
echo.
echo [3/6] Publishing main app...
set APP_DIR=EngineeringManager.Installer\app-files
if exist "%APP_DIR%" rmdir /s /q "%APP_DIR%"
dotnet publish EngineeringManager.Api -c Release -r win-x64 --self-contained -o "%APP_DIR%"
if errorlevel 1 ( echo X FAILED & pause & exit /b 1 )
echo    OK

:: 4. Copy frontend + config into app-files
echo.
echo [4/6] Copying assets into app-files...
xcopy /E /I /Q /Y dist "%APP_DIR%\dist" >nul
copy /Y public\ocr-config.json "%APP_DIR%\ocr-config.json" >nul
copy /Y public\seed-data.json "%APP_DIR%\seed-data.json" >nul
echo    OK

:: 5. Create payload.zip (app-files + installer/dist)
echo.
echo [5/6] Creating payload.zip...
if exist EngineeringManager.Installer\payload.zip del EngineeringManager.Installer\payload.zip
cd EngineeringManager.Installer
powershell -Command "Compress-Archive -Path 'app-files','..\installer\dist' -DestinationPath 'payload.zip' -Force"
cd ..
for %%I in (EngineeringManager.Installer\payload.zip) do echo    Size: %%~zI bytes
echo    OK

:: 6. Build single-file installer exe
echo.
echo [6/6] Building single-file installer exe...
if exist release-installer rmdir /s /q release-installer
dotnet publish EngineeringManager.Installer -c Release -r win-x64 --self-contained -o release-installer -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true
if errorlevel 1 ( echo X FAILED & pause & exit /b 1 )

:: Concatenate stub + payload + footer (自解压追加段)
echo    Concatenating stub + payload + footer...
powershell -NoProfile -Command ^
  "$stub='release-installer\EngineeringManager.Installer.exe';" ^
  "$payload='EngineeringManager.Installer\payload.zip';" ^
  "$out='release\EngineeringManager-Setup-%VERSION%.exe';" ^
  "$magic=[Text.Encoding]::ASCII.GetBytes('EMPAYLD1');" ^
  "$len=(Get-Item $payload).Length;" ^
  "$lenBytes=[BitConverter]::GetBytes([Int64]$len);" ^
  "$o=[IO.File]::Open($out,'Create');" ^
  "try{ $s=[IO.File]::OpenRead($stub); try{$s.CopyTo($o)}finally{$s.Dispose()};" ^
  "$p=[IO.File]::OpenRead($payload); try{$p.CopyTo($o)}finally{$p.Dispose()};" ^
  "$o.Write($magic,0,8); $o.Write($lenBytes,0,8) } finally { $o.Dispose() }"
if errorlevel 1 ( echo X FAILED & pause & exit /b 1 )

:: Clean up
rmdir /s /q release-installer 2>nul

echo.
echo ============================================================
echo   BUILD COMPLETE!
echo.
echo   Single-file installer: release\EngineeringManager-Setup-%VERSION%.exe
echo.
for %%I in (release\EngineeringManager-Setup-%VERSION%.exe) do echo   Size: %%~zI bytes
echo ============================================================
echo.

explorer release
popd
pause
