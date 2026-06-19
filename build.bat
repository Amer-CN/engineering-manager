@echo off
chcp 65001 >nul 2>&1
title 工程管家 - 构建脚本

echo ════════════════════════════════════════════════
echo   工程管家 - 一键构建 + 打包安装程序
echo ════════════════════════════════════════════════
echo.

pushd "%~dp0"

:: ── 读取版本号 ──
for /f "tokens=2 delims=:, " %%a in ('findstr /C:"version" package.json') do (
    set VERSION=%%~a
)
set VERSION=%VERSION: =%
set VERSION=%VERSION:"=%
echo [1/5] 版本号: %VERSION%

:: ── 前端构建 ──
echo.
echo [2/5] 构建前端...
call npx vite build
if errorlevel 1 (
    echo ✗ 前端构建失败！
    pause
    exit /b 1
)
echo ✓ 前端构建完成

:: ── C# 发布 ──
echo.
echo [3/5] 发布 C# 项目...
set PUBLISH_DIR=release\engineering-manager-%VERSION%
if exist "%PUBLISH_DIR%" rmdir /s /q "%PUBLISH_DIR%"
dotnet publish EngineeringManager.Api -c Release -r win-x64 --self-contained -o "%PUBLISH_DIR%"
if errorlevel 1 (
    echo ✗ C# 发布失败！
    pause
    exit /b 1
)
echo ✓ C# 发布完成

:: ── 复制前端资源到发布目录 ──
echo.
echo [4/5] 复制前端资源和配置...
xcopy /E /I /Q /Y dist "%PUBLISH_DIR%\dist"
copy /Y public\ocr-config.json "%PUBLISH_DIR%\ocr-config.json" >nul
copy /Y public\seed-data.json "%PUBLISH_DIR%\seed-data.json" >nul
echo ✓ 资源复制完成

:: ── 验证关键文件 ──
echo.
echo [5/5] 验证发布目录...
if not exist "%PUBLISH_DIR%\EngineeringManager.Api.exe" (
    echo ✗ 缺少主程序！
    pause
    exit /b 1
)
if not exist "%PUBLISH_DIR%\dist\index.html" (
    echo ✗ 缺少前端文件！
    pause
    exit /b 1
)
if not exist "%PUBLISH_DIR%\ocr-config.json" (
    echo ✗ 缺少 OCR 配置！
    pause
    exit /b 1
)
echo ✓ 所有文件验证通过

:: ── 打包为便携版 zip ──
echo.
echo [Bonus] 生成便携版 ZIP...
where powershell >nul 2>nul
if not errorlevel 1 (
    powershell -Command "Compress-Archive -Path '%PUBLISH_DIR%\*' -DestinationPath 'release\工程管家-%VERSION%-便携版.zip' -Force"
    echo ✓ 便携版 ZIP 已生成
)

:: ── Inno Setup 安装包 ──
echo.
echo [Bonus] 生成 Inno Setup 安装包...
where iscc >nul 2>nul
if not errorlevel 1 (
    iscc /DVERSION=%VERSION% /DPUBLISH_DIR=%PUBLISH_DIR% installer.iss
    if errorlevel 1 (
        echo ⚠ Inno Setup 编译失败（可选），便携版已可用
    ) else (
        echo ✓ 安装包已生成
    )
) else (
    echo ⚠ 未检测到 Inno Setup (iscc)，跳过安装包生成
    echo   如需安装包，请安装 Inno Setup 后重新运行此脚本
)

:: ── 完成 ──
echo.
echo ════════════════════════════════════════════════
echo   构建完成！
echo.
echo   便携版目录: %PUBLISH_DIR%
echo   便携版 ZIP: release\工程管家-%VERSION%-便携版.zip
echo.
echo   安装包: release\工程管家-Setup-%VERSION%.exe（需 Inno Setup）
echo ════════════════════════════════════════════════
echo.

:: ── 打开输出目录 ──
explorer "%PUBLISH_DIR%"

popd
pause
