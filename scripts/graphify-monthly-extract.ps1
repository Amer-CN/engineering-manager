# Graphify monthly extract script
# Runs silently, no console window. Logs to %USERPROFILE%\.cache\graphify-monthly-extract.log

$ErrorActionPreference = 'Continue'
$ProjectRoot = "E:\测试"
$LogDir = "$env:USERPROFILE\.cache"
$LogFile = "$LogDir\graphify-monthly-extract.log"
$Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# Ensure log directory exists
$null = New-Item -Path $LogDir -ItemType Directory -Force

function Write-Log {
    param([string]$Message)
    $line = "[$Timestamp] $Message"
    Add-Content -Path $LogFile -Value $line
}

Write-Log "=== Graphify Monthly Extract ==="
Write-Log "Project: $ProjectRoot"

# 1) Check project directory
if (-not (Test-Path $ProjectRoot)) {
    Write-Log "ERROR: Project root not found: $ProjectRoot"
    exit 1
}

# 2) Check graphify command
$GraphifyCmd = Get-Command 'graphify' -ErrorAction SilentlyContinue
if (-not $GraphifyCmd) {
    Write-Log "ERROR: graphify command not found"
    exit 1
}
Write-Log "graphify found: $($GraphifyCmd.Source)"

# 3) Check API key
if (-not $env:DEEPSEEK_API_KEY) {
    Write-Log "WARNING: DEEPSEEK_API_KEY not set"
}

# 4) Quick AST sync
Push-Location $ProjectRoot
try {
    Write-Log "Running: graphify update ."
    $UpdateResult = & graphify update . 2>&1
    foreach ($line in $UpdateResult) {
        Write-Log "  update> $line"
    }
    Write-Log "graphify update done"
}
catch {
    Write-Log "WARNING: update failed (non-fatal): $_"
}
Pop-Location

# 5) Check if semantic extract is needed
Push-Location $ProjectRoot
try {
    Write-Log "Running: graphify check-update ."
    & graphify check-update . 2>&1 | ForEach-Object { Write-Log "  check> $_" }
    $ExitCode = $LASTEXITCODE
    
    if ($ExitCode -ne 0) {
        Write-Log "check-update: code $ExitCode - no change, skipping extract"
        Pop-Location
        exit 0
    }
    
    Write-Log "check-update: extract needed, proceeding..."
}
catch {
    Write-Log "WARNING: check-update failed (will retry next month): $_"
    Pop-Location
    exit 0
}
Pop-Location

# 6) Full semantic extract + viz
Push-Location $ProjectRoot
try {
    Write-Log "Running: graphify extract . --backend deepseek"
    & graphify extract . --backend deepseek 2>&1 | ForEach-Object { Write-Log "  extract> $_" }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Log "SUCCESS: extract completed"
    }
    else {
        Write-Log "FAILED: extract exited with code $LASTEXITCODE"
    }
}
catch {
    Write-Log "ERROR: extract exception: $_"
}
Pop-Location

$EndTimestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Log "[$EndTimestamp] Finished"
exit 0
