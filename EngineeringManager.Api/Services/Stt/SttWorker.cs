using System.Data;
using Dapper;

namespace EngineeringManager.Api.Services.Stt;

/// <summary>
/// STT 后台 worker：单并发，取 pending job → 预处理 → (多人)分离 → 转写 → 写回
/// 低配机别并发跑多个大模型
/// </summary>
public class SttWorker : IHostedService, IDisposable
{
    private readonly IServiceProvider _services;
    private readonly ILogger<SttWorker>? _logger;
    private System.Threading.Timer? _timer;
    private static readonly object _runLock = new();
    private static bool _isRunning = false;
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(5);
    // F4(审计): 在途任务的取消令牌登记——取消端点在改库状态之外同时触发真实取消（引擎/预处理收到令牌即中止）
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<long, CancellationTokenSource> _activeJobs = new();

    /// <summary>触发在途任务的真实取消；任务不在途（已写回/未开始）时返回 false，仅库内状态生效。</summary>
    internal static bool TryCancel(long jobId)
    {
        if (_activeJobs.TryRemove(jobId, out var cts))
        {
            cts.Cancel();
            cts.Dispose();
            return true;
        }
        return false;
    }

    public SttWorker(IServiceProvider services, ILogger<SttWorker>? logger = null)
    {
        _services = services;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken ct)
    {
        _logger?.LogInformation("[SttWorker] 后台任务服务启动，轮询间隔 {Interval}s", PollInterval.TotalSeconds);

        // 孤儿恢复：只在启动路径执行一次（migrations 在 InitializeDatabaseOrExit 中先于
        // hosted service 启动跑完；try-catch 兜底表不存在等启动期问题，不得让启动崩）。
        // 禁止放进 Poll——轮询中反复执行会把正在处理的活任务误恢复成 pending。
        try
        {
            using var scope = _services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<IDbConnection>();
            var recovered = RecoverOrphanJobs(db);
            if (recovered > 0)
                _logger?.LogInformation("[SttWorker] 启动时恢复孤儿 processing 任务 {Count} 条 → pending", recovered);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "[SttWorker] 孤儿任务恢复失败（跳过，不影响启动）");
        }

        _timer = new System.Threading.Timer(Poll, null, TimeSpan.FromSeconds(10), PollInterval);
        return Task.CompletedTask;
    }

    /// <summary>
    /// 把孤儿 'processing' 任务恢复为 'pending'：应用上次运行因崩溃/管道死锁卡在
    /// 'processing'，而 Poll 只取 'pending'，不恢复则重启后永远显示"处理中"。
    /// 只在启动路径调用一次；completed/failed/cancelled/pending 均不受影响。
    /// </summary>
    internal static int RecoverOrphanJobs(IDbConnection db)
    {
        return db.Execute(
            "UPDATE stt_jobs SET status = 'pending', updated_at = @Now WHERE status = 'processing'",
            new { Now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") });
    }

    public Task StopAsync(CancellationToken ct)
    {
        _timer?.Change(Timeout.Infinite, 0);
        _logger?.LogInformation("[SttWorker] 后台任务服务停止");
        return Task.CompletedTask;
    }

    private async void Poll(object? state)
    {
        // 10.12 验收模式：STT_WORKER_PAUSED=1 时暂停轮询，让执行器验证后再处理
        var pausedEnv = Environment.GetEnvironmentVariable("STT_WORKER_PAUSED");
        if (pausedEnv == "1")
        {
            _logger?.LogInformation("[SttWorker] 验收模式：Worker 已暂停，等待执行器验证完成");
            return;
        }

        // 单并发：同时只处理一个 STT 任务
        lock (_runLock)
        {
            if (_isRunning) return;
            _isRunning = true;
        }

        try
        {
            using var scope = _services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<IDbConnection>();

            // 取一个 pending 的 job
            var job = db.QueryFirstOrDefault<SttJob>(
                @"SELECT * FROM stt_jobs WHERE status = 'pending' ORDER BY created_at LIMIT 1");
            if (job == null) return;

            await ProcessJobAsync(scope, job);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "[SttWorker] 轮询异常");
        }
        finally
        {
            lock (_runLock) { _isRunning = false; }
        }
    }

    private async Task ProcessJobAsync(IServiceScope scope, SttJob job)
    {
        var db = scope.ServiceProvider.GetRequiredService<IDbConnection>();
        var now = () => DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

        CancellationTokenSource? jobCts = null;
        try
        {
            // 标记为 processing——带 pending 守卫：取消端点已把 pending→cancelled 时不再占用 worker（F4）
            var claimed = db.Execute(
                "UPDATE stt_jobs SET status = 'processing', updated_at = @Now WHERE id = @Id AND status = 'pending'",
                new { Now = now(), job.Id });
            if (claimed == 0) return;

            jobCts = new CancellationTokenSource();
            _activeJobs[job.Id] = jobCts;
            var ct = jobCts.Token;

            // 检查环境
            if (!SttEngineSelector.CanUseLocalStt())
                throw new InvalidOperationException($"本地转写不可用: {SttEngineSelector.GetUnavailableReason()}");

            var engine = new LlamaCppGgufEngine();
            if (!await engine.IsAvailableAsync())
                throw new InvalidOperationException("ASR 模型文件缺失，请检查 asr-engine/model/ 目录");

            // 1. 音频预处理
            UpdateProgress(db, job.Id, 5, "预处理音频...");
            var sourcePath = Path.Combine(ApiConfig.ResolveDataPath(), "uploads", job.Source_Path);
            if (!File.Exists(sourcePath))
            {
                // 兜底：尝试直接用 Source_File 作为路径
                sourcePath = job.Source_Path;
                if (!File.Exists(sourcePath))
                    throw new FileNotFoundException($"音频文件不存在: {job.Source_Path}");
            }

            var processedWav = await AudioPreprocessor.PreprocessAsync(sourcePath, ct: ct);
            var duration = await AudioPreprocessor.GetDurationAsync(processedWav);
            db.Execute("UPDATE stt_jobs SET duration_sec = @Dur, updated_at = @Now WHERE id = @Id",
                new { Dur = duration, Now = now(), job.Id });

            SttResult result;

            // 2. 判断是否多人录音
            if (job.Is_Multi_Speaker == 1)
            {
                // 多人：先分离 → 逐段转写 → 拼回
                UpdateProgress(db, job.Id, 10, "加载说话人分离模型...");
                await SttModelManager.EnsureDiarizationModelsAsync();

                UpdateProgress(db, job.Id, 15, "说话人分离...");
                var diarization = new DiarizationService();
                var segments = await diarization.DiarizeAsync(
                    processedWav,
                    job.Num_Speakers,
                    ct: ct);

                if (segments.Count == 0)
                    throw new Exception("说话人分离未检测到任何语音段");

                UpdateProgress(db, job.Id, 25, $"分离出 {segments.Count} 段，切分音频...");

                // 按说话人段切分音频
                var splitFiles = await diarization.SplitAudioBySpeakersAsync(processedWav, segments);

                // 批量转写：一次 transcribe.exe 调用处理所有段
                // 模型只加载一次，避免 N 段 N 次重载 1.7B 模型的性能灾难
                UpdateProgress(db, job.Id, 30, $"批量转写 {splitFiles.Count} 段（模型只加载一次）...");
                var sw = System.Diagnostics.Stopwatch.StartNew();

                var wavPaths = splitFiles.Select(s => s.wavPath).ToList();
                var texts = await engine.TranscribeBatchAsync(wavPaths, job.Hotwords, ct);

                sw.Stop();
                Console.WriteLine($"[SttWorker] 批量转写 {splitFiles.Count} 段完成，耗时 {sw.Elapsed.TotalSeconds:F1}s");

                // 组装结果（此时 Speaker 仍是原始簇号 0-based）
                var allSegments = new List<SttSegment>();
                for (int i = 0; i < splitFiles.Count; i++)
                {
                    var (seg, _) = splitFiles[i];
                    seg.Text = texts[i];
                    allSegments.Add(seg);
                }

                // ★ 说话人归一化：原始簇号 0/3/7... → 连续 1/2/3（按首次出现顺序）
                // 在持久化前执行，确保 result_text / result_json / GET / ingest 全链路一致
                SpeakerLabelNormalizer.Normalize(allSegments);

                // 用归一化后的编号拼装全文
                var totalText = allSegments.Select(s => $"【说话人{s.Speaker}】{s.Text}").ToList();

                UpdateProgress(db, job.Id, 90, $"转写完成，{allSegments.Count} 段");

                // 清理临时文件
                DiarizationService.CleanupTempFiles(splitFiles.Select(s => s.wavPath).ToList());

                result = new SttResult
                {
                    Text = string.Join("\n", totalText),
                    Segments = allSegments,
                    DurationSec = duration,
                    ElapsedSec = allSegments.Sum(s => 0), // 各段累加复杂，暂不精确
                    Engine = engine.Name,
                };
            }
            else
            {
                // 单人：直接转写，跳过分离
                UpdateProgress(db, job.Id, 10, "转写中...");
                result = await engine.TranscribeAsync(processedWav, job.Hotwords, null, ct);
                result.DurationSec = duration;

                // 单人：segments 只有一段，Speaker = 1（归一化后 1-based）
                if (result.Segments.Count == 0)
                    result.Segments.Add(new SttSegment { Speaker = 1, Start = 0, End = duration, Text = result.Text });
                else
                {
                    result.Segments[0].Speaker = 1;
                    result.Segments[0].End = duration;
                }
            }

            // 清理预处理临时文件
            try { if (processedWav.StartsWith(Path.GetTempPath())) File.Delete(processedWav); } catch { }

            // 3. 写回结果
            UpdateProgress(db, job.Id, 95, "保存结果...");
            var resultJson = System.Text.Json.JsonSerializer.Serialize(
                result.Segments.Select(s => new { speaker = s.Speaker, start = s.Start, end = s.End, text = s.Text }));

            // F4: 写回带 processing 守卫——转写期间被取消的任务不得覆盖回 completed（原取消是幻觉）
            var written = db.Execute(@"
                UPDATE stt_jobs SET
                    status = 'completed', progress = 100,
                    result_text = @Text, result_json = @Json,
                    elapsed_sec = @Elapsed, error = NULL,
                    updated_at = @Now
                WHERE id = @Id AND status = 'processing'",
                new
                {
                    Text = result.Text,
                    Json = resultJson,
                    Elapsed = result.ElapsedSec,
                    Now = now(),
                    job.Id,
                });
            if (written == 0)
                _logger?.LogInformation("[SttWorker] Job {Id} 在写回前已被取消，保留 cancelled 状态", job.Id);

            _logger?.LogInformation("[SttWorker] Job {Id} 完成: {Chars} 字, {Duration:F1}s 音频",
                job.Id, result.Text.Length, duration);
        }
        catch (OperationCanceledException)
        {
            db.Execute("UPDATE stt_jobs SET status = 'cancelled', updated_at = @Now WHERE id = @Id",
                new { Now = now(), job.Id });
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[SttWorker] Job {job.Id} 失败: {ex.Message}");
            db.Execute("UPDATE stt_jobs SET status = 'failed', error = @Err, updated_at = @Now WHERE id = @Id",
                new { Err = Common.Sanitize(ex.Message), Now = now(), job.Id });
        }
        finally
        {
            if (jobCts != null) { _activeJobs.TryRemove(job.Id, out _); jobCts.Dispose(); }
        }
    }

    private static void UpdateProgress(IDbConnection db, long jobId, int progress, string? note = null)
    {
        var now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
        db.Execute("UPDATE stt_jobs SET progress = @P, updated_at = @Now WHERE id = @Id",
            new { P = progress, Now = now, Id = jobId });
        if (note != null)
            Console.WriteLine($"[SttWorker] Job {jobId} 进度 {progress}%: {note}");
    }

    public void Dispose()
    {
        _timer?.Dispose();
    }
}

/// <summary>stt_jobs 表映射（Dapper 用）</summary>
public class SttJob
{
    public long Id { get; set; }
    public string Source_File { get; set; } = "";
    public string Source_Path { get; set; } = "";
    public string Source_Type { get; set; } = "audio";
    public string Engine { get; set; } = "qwen3-asr-1.7b-gguf";
    public string Status { get; set; } = "pending";
    public int Progress { get; set; }
    public int Is_Multi_Speaker { get; set; }
    public int? Num_Speakers { get; set; }
    public string? Hotwords { get; set; }
    public string? Result_Text { get; set; }
    public string? Result_Json { get; set; }
    public double? Duration_Sec { get; set; }
    public double? Elapsed_Sec { get; set; }
    public string? Error { get; set; }
    public string Created_At { get; set; } = "";
    public string Updated_At { get; set; } = "";
    public string Created_By { get; set; } = "";
}
