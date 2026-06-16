# Phase 1.4: 统一 time 函数
# 替换所有 var now = () => DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") 为 Common.NowString

$endpointsDir = "E:\测试\EngineeringManager.Api\Endpoints"

# 获取所有 .cs 文件
$files = Get-ChildItem -Path $endpointsDir -Filter "*.cs"

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    
    # 替换模式
    $pattern = 'var now = \(\) => DateTime\.Now\.ToString\("yyyy-MM-dd HH:mm:ss"\);'
    $replacement = '// now 通过 Common.NowString() 获取'
    
    if ($content -match $pattern) {
        Write-Host "处理: $($file.Name)"
        
        # 删除 var now 定义行
        $content = $content -replace "(?m)^\s*$pattern\s*\r?\n", ""
        
        # 替换 now() 调用为 Common.NowString()
        $content = $content -replace '\bnow\(\)', 'Common.NowString()'
        
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "  已替换"
    }
}

Write-Host "`n完成"
