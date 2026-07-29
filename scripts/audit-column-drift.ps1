# 列漂移只读审计：扫描所有写端点的 INSERT/UPDATE 列名 vs 目标库实际列，报告端点引用但库中不存在的列。
# 用于根治"端点 SQL 照死 schema 写、真库用另一套列"的系统性漂移（M-REVIEW1 发现的 drawings/inventory/expenses 即此类）。
# 只读：仅 PRAGMA table_info 读列，绝不写库。
#
# 用法：
#   pwsh scripts/audit-column-drift.ps1                                      # 审计工作区 data/engineering.db
#   pwsh scripts/audit-column-drift.ps1 -DbPath "F:\Company Database\engineering.db"   # 审计真库
param(
    [string]$DbPath = "$PSScriptRoot\..\data\engineering.db"
)
$ErrorActionPreference = 'Stop'
$bin = Get-ChildItem "$PSScriptRoot\..\EngineeringManager.Api\bin" -Recurse -Filter "Microsoft.Data.Sqlite.dll" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $bin) { Write-Error "未找到 Microsoft.Data.Sqlite.dll，请先 dotnet build"; exit 1 }
$binDir = $bin.DirectoryName
$native = Join-Path $binDir "runtimes\win-x64\native"
if (Test-Path $native) { $env:PATH = "$native;$env:PATH" }
Add-Type -Path $bin.FullName
foreach ($d in @('SQLitePCLRaw.core.dll','SQLitePCLRaw.provider.e_sqlite3.dll','SQLitePCLRaw.batteries_v2.dll')) {
    $p = Join-Path $binDir $d; if (Test-Path $p) { Add-Type -Path $p }
}

$db = (Resolve-Path $DbPath).Path
Write-Host "=== 列漂移只读审计: $db ===" -ForegroundColor Cyan
$conn = New-Object Microsoft.Data.Sqlite.SqliteConnection("Data Source=$db;Mode=ReadOnly")
$conn.Open()

# 收集每张表的真实列集
$tableCols = @{}
$c1 = $conn.CreateCommand(); $c1.CommandText = "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
$tables = @(); $r1 = $c1.ExecuteReader(); while ($r1.Read()) { $tables += $r1.GetString(0) }; $r1.Close()
foreach ($t in $tables) {
    $c2 = $conn.CreateCommand(); $c2.CommandText = "PRAGMA table_info([$t])"
    $cols = New-Object System.Collections.Generic.HashSet[string]
    $r2 = $c2.ExecuteReader(); while ($r2.Read()) { [void]$cols.Add($r2.GetString(1).ToLower()) }; $r2.Close()
    $tableCols[$t.ToLower()] = $cols
}
$conn.Close()

# 扫描端点文件里的 INSERT INTO <t> (<cols>) 与 UPDATE <t> SET <col>=...
$drift = @()
$files = Get-ChildItem "$PSScriptRoot\..\EngineeringManager.Api\Endpoints" -Filter "*.cs"
foreach ($f in $files) {
    $text = Get-Content $f.FullName -Raw
    # INSERT INTO <t> (col1,col2,...)
    foreach ($m in [regex]::Matches($text, 'INSERT\s+INTO\s+\[?(\w+)\]?\s*\(([^)]+)\)')) {
        $t = $m.Groups[1].Value.ToLower()
        if (-not $tableCols.ContainsKey($t)) { continue }
        foreach ($col in $m.Groups[2].Value -split ',') {
            $col = $col.Trim().ToLower()
            if ($col -and -not $tableCols[$t].Contains($col)) { $drift += "  $($f.Name)  INSERT $t.$col  ← 库中无此列" }
        }
    }
    # UPDATE <t> SET a=@A,b=@B... WHERE
    foreach ($m in [regex]::Matches($text, 'UPDATE\s+\[?(\w+)\]?\s+SET\s+(.+?)\s+WHERE')) {
        $t = $m.Groups[1].Value.ToLower()
        if (-not $tableCols.ContainsKey($t)) { continue }
        foreach ($assign in $m.Groups[2].Value -split ',') {
            if ($assign -match '^\s*(\w+)\s*=') {
                $col = $Matches[1].ToLower()
                if ($col -eq 'version') { continue }  # version=version+1 自增，非漂移
                if (-not $tableCols[$t].Contains($col)) { $drift += "  $($f.Name)  UPDATE $t.$col  ← 库中无此列" }
            }
        }
    }
}

if ($drift.Count -eq 0) {
    Write-Host "`n✅ 无列漂移：所有写端点的 INSERT/UPDATE 列均存在于目标库" -ForegroundColor Green
} else {
    Write-Host "`n⚠️ 发现 $($drift.Count) 处列漂移（端点引用但库中不存在）：" -ForegroundColor Yellow
    $drift | Sort-Object -Unique | ForEach-Object { Write-Host $_ }
}
