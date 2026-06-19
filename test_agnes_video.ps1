# Agnes Video V2.0 Test Script

$API_KEY = "sk-ZqhVc4y6UxPwKLCr7CRgbuwOlyLMIOU1qoC6pfLtkB0gr1c9"
$BASE_URL = "https://apihub.agnes-ai.com"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Agnes Video V2.0 - API Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: 创建视频任务（文生视频）
Write-Host "[Step 1] 创建视频任务..." -ForegroundColor Yellow
$body = @{
    model = "agnes-video-v2.0"
    prompt = "A cinematic drone shot flying over a crystal-clear alpine lake at sunrise, mist rising from the water surface, snow-capped mountains in the background, golden hour lighting, smooth slow motion"
    height = 768
    width = 1152
    num_frames = 121
    frame_rate = 24
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $API_KEY"
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/v1/videos" -Method Post -Headers $headers -Body $body -ErrorAction Stop
    Write-Host "✅ 任务创建成功！" -ForegroundColor Green
    Write-Host ""
    Write-Host "  task_id   : $($response.task_id)" -ForegroundColor White
    Write-Host "  video_id  : $($response.video_id)" -ForegroundColor White
    Write-Host "  status    : $($response.status)" -ForegroundColor White
    Write-Host "  progress  : $($response.progress)%" -ForegroundColor White
    Write-Host "  size      : $($response.size)" -ForegroundColor White
    Write-Host "  seconds   : $($response.seconds)s" -ForegroundColor White
    Write-Host ""

    $videoId = $response.video_id
    $taskId = $response.task_id

    # Step 2: 轮询查询结果
    Write-Host "[Step 2] 开始轮询查询视频结果（间隔 5 秒）..." -ForegroundColor Yellow
    Write-Host ""

    $maxAttempts = 60  # 最多轮询 60 次 = 5 分钟
    $attempt = 0

    while ($attempt -lt $maxAttempts) {
        $attempt++
        Start-Sleep -Seconds 5

        try {
            # 推荐方式：用 video_id 查询
            $queryUrl = "$BASE_URL/agnesapi?video_id=$videoId"
            $result = Invoke-RestMethod -Uri $queryUrl -Method Get -Headers @{ "Authorization" = "Bearer $API_KEY" } -ErrorAction Stop

            Write-Host "  [轮询 #$attempt] status=$($result.status)  progress=$($result.progress)%  created=$($result.created_at)" -ForegroundColor Gray

            if ($result.status -eq "completed") {
                Write-Host ""
                Write-Host "✅ 视频生成完成！" -ForegroundColor Green
                Write-Host "  视频 URL: $($result.remixed_from_video_id)" -ForegroundColor Cyan
                break
            } elseif ($result.status -eq "failed") {
                Write-Host ""
                Write-Host "❌ 视频生成失败！" -ForegroundColor Red
                if ($result.error) {
                    Write-Host "  错误信息: $($result.error | ConvertTo-Json -Compress)" -ForegroundColor Red
                }
                break
            }
        } catch {
            Write-Host "  [轮询 #$attempt] 查询失败: $_" -ForegroundColor Red
        }
    }

    if ($attempt -ge $maxAttempts) {
        Write-Host ""
        Write-Host "⏱ 超时（已超过 5 分钟），任务可能仍在处理中。" -ForegroundColor Yellow
        Write-Host "  可用以下命令继续查询：" -ForegroundColor Yellow
        Write-Host "  curl -H `"Authorization: Bearer $API_KEY`" `$BASE_URL/agnesapi?video_id=$videoId" -ForegroundColor Gray
    }

} catch {
    Write-Host "❌ 请求失败！" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  测试完成" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
