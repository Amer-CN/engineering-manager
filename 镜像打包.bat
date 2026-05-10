@echo off
cd /d "%~dp0"

echo ========================================
echo   Build with Mirror (npmmirror.com)
echo ========================================
echo.

:: Set mirror env vars
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
set ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/

echo Mirror: %ELECTRON_MIRROR%
echo.

:: Clean cache
echo [1/4] Cleaning old cache...
if exist "%USERPROFILE%\.cache\electron" rmdir /s /q "%USERPROFILE%\.cache\electron"
if exist "%USERPROFILE%\.cache\electron-builder" rmdir /s /q "%USERPROFILE%\.cache\electron-builder"

:: Rebuild
echo [2/4] TypeScript compile...
call npx tsc --noEmit
if errorlevel 1 (
    echo TS compile failed!
    pause
    exit /b 1
)

echo [3/4] Vite build...
call npx vite build
if errorlevel 1 (
    echo Vite build failed!
    pause
    exit /b 1
)

:: Copy OCR config
echo [4/4] Copying OCR config...
copy /y "public\ocr-config.json" "dist\ocr-config.json"

:: Build with mirror
echo.
echo Starting electron-builder (mirror)...
call node node_modules\electron-builder\out\cli.js --win --x64

if errorlevel 1 (
    echo.
    echo Build failed. Check error messages above.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Build complete!
echo ========================================
dir release\*.exe 2>nul
echo.
echo Press any key to open output directory...
pause >nul
explorer release
