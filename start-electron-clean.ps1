# start-electron-clean.ps1
# 用完全干净的环境变量启动 Electron

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "E:\测试\node_modules\electron\dist\electron.exe"
$psi.Arguments = "."

# 必须先设 UseShellExecute = $false，才能修改 EnvironmentVariables
$psi.UseShellExecute = $false
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.CreateNoWindow = $true

# 清空环境变量，只加必要的（不加入 ELECTRON_RUN_AS_NODE 和 NODE_OPTIONS）
# 注意：EnvironmentVariables 是只读的当 UseShellExecute = true
# 设好 UseShellExecute = $false 后就可以添加了
$psi.EnvironmentVariables.Clear() | Out-Null
$psi.EnvironmentVariables.Add("PATH", $env:PATH)
$psi.EnvironmentVariables.Add("APPDATA", $env:APPDATA)
$psi.EnvironmentVariables.Add("LOCALAPPDATA", $env:LOCALAPPDATA)
$psi.EnvironmentVariables.Add("USERPROFILE", $env:USERPROFILE)
$psi.EnvironmentVariables.Add("HOME", $env:HOME)
$psi.EnvironmentVariables.Add("USERNAME", $env:USERNAME)
$psi.EnvironmentVariables.Add("SYSTEMROOT", $env:SYSTEMROOT)
$psi.EnvironmentVariables.Add("TEMP", $env:TEMP)
$psi.EnvironmentVariables.Add("TMP", $env:TMP)

Write-Host "[start-electron-clean] 正在以干净环境启动 Electron..."
Write-Host "[start-electron-clean] ELECTRON_RUN_AS_NODE 存在: $($psi.EnvironmentVariables.ContainsKey('ELECTRON_RUN_AS_NODE'))"
Write-Host "[start-electron-clean] NODE_OPTIONS 存在: $($psi.EnvironmentVariables.ContainsKey('NODE_OPTIONS'))"

try {
    $p = [System.Diagnostics.Process]::Start($psi)
    Write-Host "[start-electron-clean] 进程已启动，PID: $($p.Id)"
    # 不 WaitForExit，让应用继续运行
    Write-Host "[start-electron-clean] Electron 正在运行，请检查应用窗口"
} catch {
    Write-Host "[start-electron-clean] 启动失败: $_"
    exit 1
}
