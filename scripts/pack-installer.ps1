param(
  [Parameter(Mandatory=$true)][string]$Stub,
  [Parameter(Mandatory=$true)][string]$Payload,
  [Parameter(Mandatory=$true)][string]$Out
)
$ErrorActionPreference = 'Stop'

$stubBytes    = [System.IO.File]::ReadAllBytes($Stub)
$payloadBytes = [System.IO.File]::ReadAllBytes($Payload)

$magic = [System.Text.Encoding]::ASCII.GetBytes('EMPAYLD1')   # 必须正好 8 字节
if ($magic.Length -ne 8) { throw 'magic must be 8 bytes' }
$lenBytes = [System.BitConverter]::GetBytes([Int64]$payloadBytes.Length)  # 小端
if (-not [System.BitConverter]::IsLittleEndian) { [Array]::Reverse($lenBytes) }

$outDir = [System.IO.Path]::GetDirectoryName($Out)
if ($outDir -and -not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }

$fs = [System.IO.File]::Create($Out)
try {
  $fs.Write($stubBytes,    0, $stubBytes.Length)
  $fs.Write($payloadBytes, 0, $payloadBytes.Length)
  $fs.Write($magic,        0, 8)
  $fs.Write($lenBytes,     0, 8)
} finally { $fs.Dispose() }

Write-Host "Packed -> $Out  (stub=$($stubBytes.Length)  payload=$($payloadBytes.Length))"
exit 0