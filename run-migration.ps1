# Phase 1.3 迁移执行脚本
# 先预检查，再执行迁移

$dbPath = "$env:APPDATA\工程管家\engineering.db"
Write-Host "数据库路径: $dbPath"

# 检查数据库是否存在
if (-not (Test-Path $dbPath)) {
    Write-Host "错误: 数据库文件不存在"
    exit 1
}

# 备份确认
$backupPath = "$env:APPDATA\工程管家\engineering.db.pre-phase1-20260612"
if (Test-Path $backupPath) {
    $backupSize = (Get-Item $backupPath).Length
    Write-Host "备份文件存在: $backupSize bytes"
} else {
    Write-Host "警告: 备份文件不存在"
}

# 执行迁移（通过启动应用触发 MigrationRunner）
Write-Host "`n执行迁移..."
cd "E:\测试\EngineeringManager.Api"
dotnet run --no-build 2>&1 | Select-Object -First 50

Write-Host "`n迁移完成，请验证数据库"
