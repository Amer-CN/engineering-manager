$ErrorActionPreference = "Stop"
$host.UI.RawUI.WindowTitle = "Reasonix Full Config Packer"

$src = "$env:USERPROFILE\.reasonix"
$dst = "$PWD\reasonix-config-full.zip"
$tmp = "$PWD\_reasonix_tmp"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Reasonix Config Full Packer" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $src)) {
    Write-Host "[ERROR] Not found: $src" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "[1/3] Creating temp directory..." -ForegroundColor Yellow
if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
New-Item -ItemType Directory -Path $tmp -Force | Out-Null

Write-Host "[2/3] Copying all files..." -ForegroundColor Yellow
Copy-Item "$src\config.json" "$tmp\" -Force
Write-Host "  - config.json (API Key, theme, model, shell allowlist)"

if (Test-Path "$src\skills") {
    Write-Host "  - Copying skills/ (this may take a while for gstack resources)..."
    Copy-Item "$src\skills" "$tmp\" -Recurse -Force
    $skillCount = (Get-ChildItem "$src\skills\*.md").Count
    $resSize = (Get-ChildItem "$src\skills\resources" -Recurse -File | Measure-Object Length -Sum).Sum
    Write-Host "    $skillCount skill files, $([math]::Round($resSize/1MB,1)) MB resources"
}

if (Test-Path "$src\memory") {
    Copy-Item "$src\memory" "$tmp\" -Recurse -Force
    Write-Host "  - memory/ (global + project memories)"
}

if (Test-Path "$src\sessions") {
    Copy-Item "$src\sessions" "$tmp\" -Recurse -Force
    $sessionCount = (Get-ChildItem "$src\sessions" -File).Count
    Write-Host "  - sessions/ ($sessionCount session files - includes all chat history)"
}

foreach ($f in @("usage.jsonl", "slash-usage.json", "version-cache.json")) {
    $p = "$src\$f"
    if (Test-Path $p) { Copy-Item $p "$tmp\" -Force; Write-Host "  - $f" }
}

Write-Host "[3/3] Compressing to ZIP..." -ForegroundColor Yellow
if (Test-Path $dst) { Remove-Item $dst -Force }

Add-Type -Assembly 'System.IO.Compression.FileSystem'
[System.IO.Compression.ZipFile]::CreateFromDirectory($tmp, $dst, [System.IO.Compression.CompressionLevel]::Optimal, $false)

$size = [math]::Round((Get-Item $dst).Length / 1MB, 1)

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Done! Packed to: $dst" -ForegroundColor Green
Write-Host "  Size: $size MB" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

# Cleanup
Remove-Item $tmp -Recurse -Force

Write-Host "Next steps:"
Write-Host "  1. Copy to new PC:"
Write-Host "     - reasonix-config-full.zip"
Write-Host "     - install-reasonix.bat"
Write-Host "  2. On new PC, run: install-reasonix.bat"
Write-Host ""
Write-Host "  New PC also needs:"
Write-Host "     - Node.js (https://nodejs.org)"
Write-Host "     - npm install -g reasonix  (if not already installed)"
Write-Host ""

pause
