$token = $args[0]; $releaseId = $args[1]; $file = $args[2]
$uploadUrl = "https://uploads.github.com/repos/Amer-CN/engineering-manager/releases/$releaseId/assets?name=EngineeringManager-Setup-0.80.0.exe"
$asset = Invoke-RestMethod -Uri $uploadUrl -Method Post -Headers @{ Authorization = "Bearer $token"; Accept = "application/vnd.github+json"; "Content-Type" = "application/octet-stream" } -InFile $file -TimeoutSec 900
Write-Host "Uploaded: $($asset.name) $($asset.state) $($asset.size)"
