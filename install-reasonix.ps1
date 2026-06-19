$ErrorActionPreference = "Continue"
$host.UI.RawUI.WindowTitle = "Reasonix Config Installer"

$zipFile = "$PWD\reasonix-config-full.zip"
$targetDir = "$env:USERPROFILE\.reasonix"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Reasonix Config One-Click Restore" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $zipFile)) {
    Write-Host "[ERROR] reasonix-config-full.zip not found in current directory" -ForegroundColor Red
    Write-Host "  Make sure both files are copied:"
    Write-Host "    - reasonix-config-full.zip"
    Write-Host "    - install-reasonix.ps1"
    pause
    exit 1
}

Write-Host "[Checking environment]..." -ForegroundColor Yellow

# Check Node.js
try { 
    $nv = node --version
    Write-Host "  [OK] Node.js: $nv" -ForegroundColor Green
} catch {
    Write-Host "  [WARN] Node.js not detected" -ForegroundColor Yellow
    Write-Host "    Reasonix needs Node.js (npx mode). Download from: https://nodejs.org"
    $c = Read-Host "    Continue anyway? (y/N)"
    if ($c -ne 'y' -and $c -ne 'Y') { Write-Host "Cancelled"; pause; exit 0 }
}

# Check npx
try {
    $npxVer = & npx --version 2>$null
    Write-Host "  [OK] npx available" -ForegroundColor Green
} catch {
    Write-Host "  [WARN] npx not found (npm install -g npx may help)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "This will OVERWRITE $targetDir" -ForegroundColor Yellow
$confirm = Read-Host "Continue? (y/N)"
if ($confirm -ne 'y' -and $confirm -ne 'Y') { Write-Host "Cancelled"; pause; exit 0 }

Write-Host ""

# Backup old config
if (Test-Path $targetDir) {
    $ts = Get-Date -Format "yyyyMMdd_HHmmss"
    $backup = "$targetDir`_backup_$ts"
    Write-Host "[1/3] Backing up old config -> $backup" -ForegroundColor Yellow
    Move-Item $targetDir $backup -Force
    Write-Host "      Done"
}

# Extract
Write-Host "[2/3] Extracting config to $targetDir ..." -ForegroundColor Yellow
Add-Type -Assembly 'System.IO.Compression.FileSystem'
[System.IO.Compression.ZipFile]::ExtractToDirectory($zipFile, $targetDir)
Write-Host "      Done" -ForegroundColor Green

# Verify
Write-Host "[3/3] Verifying integrity..." -ForegroundColor Yellow
$allOk = $true
$checks = @(
    @{Path="config.json"; Label="config.json (API Key, settings)"},
    @{Path="skills"; Label="skills directory"},
    @{Path="memory"; Label="memory directory"}
)

foreach ($c in $checks) {
    $p = Join-Path $targetDir $c.Path
    if (Test-Path $p) {
        Write-Host "  [OK] $($c.Label)" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] $($c.Label)" -ForegroundColor Red
        $allOk = $false
    }
}

# Check for sessions
$sessionsPath = Join-Path $targetDir "sessions"
if (Test-Path $sessionsPath) {
    $sc = (Get-ChildItem $sessionsPath -File).Count
    Write-Host "  [OK] sessions restored ($sc chat history files)" -ForegroundColor Green
}

Write-Host ""
if ($allOk) {
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "  RESTORE SUCCESSFUL!" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Run Reasonix now:"
    Write-Host ""
    Write-Host "    npx reasonix code"
    Write-Host ""
    Write-Host "  (or desktop mode)"
    Write-Host ""
    Write-Host "    npx reasonix desktop"
    Write-Host ""
    Write-Host "  API Key, all skills, memories, chat history"
    Write-Host "  are ready to use."
    Write-Host ""
    Write-Host "  If Reasonix is not installed yet:"
    Write-Host "    npm install -g reasonix"
    Write-Host ""
} else {
    Write-Host "[ERROR] Incomplete restore - some files may be missing" -ForegroundColor Red
}

pause
