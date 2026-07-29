# 真库表结构只读审计（schema snapshot）
#
# 历史：v0.85.0 周期用临时版审计过真库 45+ 表（曝光 contract_templates 建表漂移，
# settlements settler_id 幽灵列也由此对照发现）。审查意见要求入库为常驻工具。
#
# 功能：只读列出 SQLite 库中全部表的实际列（PRAGMA table_info），输出到控制台，
# 供与代码期望（INSERT/UPDATE 列名、EnsureTables/Migrations）人工或 AI 对照，
# 排查"代码期望列 vs 真库实际列"漂移。
#
# 用法：
#   pwsh scripts/schema-audit.ps1                       # 默认审计工作区 data/engineering.db
#   pwsh scripts/schema-audit.ps1 -DbPath "F:\Company Database\engineering.db"   # 审计真库
#   pwsh scripts/schema-audit.ps1 -Table contract_templates                       # 只看单表
#
# 依赖：EngineeringManager.Api 已 build（复用其 bin 下的 Microsoft.Data.Sqlite + e_sqlite3）
param(
    [string]$DbPath = "$PSScriptRoot\..\data\engineering.db",
    [string]$Table = ""
)

$ErrorActionPreference = 'Stop'

# 定位 API 输出目录（复用其 Microsoft.Data.Sqlite 程序集与原生 e_sqlite3）
$apiBin = Get-ChildItem "$PSScriptRoot\..\EngineeringManager.Api\bin" -Recurse -Filter "Microsoft.Data.Sqlite.dll" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $apiBin) { Write-Error "未找到 Microsoft.Data.Sqlite.dll，请先 dotnet build EngineeringManager.Api"; exit 1 }
$binDir = $apiBin.DirectoryName

# 【坑】e_sqlite3 原生 DLL 不在探测路径会加载失败——把 native 目录前插 PATH
$native = Join-Path $binDir "runtimes\win-x64\native"
if (Test-Path $native) { $env:PATH = "$native;$env:PATH" }

Add-Type -Path $apiBin.FullName
foreach ($dep in @('SQLitePCLRaw.core.dll', 'SQLitePCLRaw.provider.e_sqlite3.dll', 'SQLitePCLRaw.batteries_v2.dll')) {
    $p = Join-Path $binDir $dep
    if (Test-Path $p) { Add-Type -Path $p }
}

if (-not (Test-Path $DbPath)) { Write-Error "数据库不存在: $DbPath"; exit 1 }
$resolved = (Resolve-Path $DbPath).Path
Write-Host "=== 只读审计: $resolved ===" -ForegroundColor Cyan

# 只读模式打开（Mode=ReadOnly，绝不写库）
$conn = New-Object Microsoft.Data.Sqlite.SqliteConnection("Data Source=$resolved;Mode=ReadOnly")
$conn.Open()
try {
    $cmd = $conn.CreateCommand()
    if ($Table) {
        $cmd.CommandText = "SELECT name FROM sqlite_master WHERE type='table' AND name=@t ORDER BY name"
        [void]$cmd.Parameters.AddWithValue('@t', $Table)
    } else {
        $cmd.CommandText = "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    }
    $tables = @()
    $r = $cmd.ExecuteReader()
    while ($r.Read()) { $tables += $r.GetString(0) }
    $r.Close()

    foreach ($t in $tables) {
        # PRAGMA 的表名不可参数化，此处 $t 来自 sqlite_master 自身查询结果（非外部输入），安全
        $c2 = $conn.CreateCommand()
        $c2.CommandText = "PRAGMA table_info([$t])"
        $r2 = $c2.ExecuteReader()
        $cols = @()
        while ($r2.Read()) { $cols += "$($r2.GetString(1)):$($r2.GetString(2))" }
        $r2.Close()
        Write-Host ("{0,-28} {1,3} 列  {2}" -f $t, $cols.Count, ($cols -join ', '))
    }
    Write-Host "`n共 $($tables.Count) 个表（只读，未做任何写操作）" -ForegroundColor Green
} finally {
    $conn.Close()
}
