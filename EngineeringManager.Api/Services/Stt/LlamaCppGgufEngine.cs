using System.Diagnostics;
using System.Text;

namespace EngineeringManager.Api.Services.Stt;

/// <summary>
/// LlamaCpp GGUF 引擎：用 Process 起 transcribe.exe，解析 stdout 拿转写文本。
/// 关键设计：
/// 1. 进程要能被 CancellationToken 杀掉整个进程树（taskkill /F /T /PID）
/// 2. 超时保护（30 分钟）
/// 3. stdout 解析：使用原始字节读取 + StdoutEncodingDecoder 严格 UTF-8 解码。
///    PYTHONUTF8=1 + PYTHONIOENCODING=utf-8 强制 Python 子进程用 UTF-8 输出。
///    10.12 修正：解码失败直接 fail closed，禁止 GBK 猜测回退。
/// 4. 环境变量 PYTHONUTF8=1 + PYTHONIOENCODING=utf-8 强制 Python 子进程用 UTF-8 输出
/// 5. 批量转写 (TranscribeBatchAsync)：一次进程处理多段音频，模型只加载一次
/// 6. 热词表 (hotwords.txt) 自动读取并拼入 --context 参数
/// 7. GPU fail-closed：启动后 30 秒内必须检测到 "Vulkan backend"，否则杀进程拒绝运行
/// 8. 资源保险丝：持续监控进程 PrivateMemorySize64，超过 6GB 或系统 RAM≥80% 立即杀进程树
/// 9. 单实例：同时只允许一个 transcribe.exe 进程运行
/// </summary>
public class LlamaCppGgufEngine : ISttEngine
{
    public string Name => "Qwen3-ASR-1.7B-GGUF (q4_k, llama.cpp Vulkan)";

    private readonly bool _useVulkan;
    private readonly string _engineDir;

    // transcribe.exe 默认超时：30 分钟（长音频可能很慢）
    // 批量模式按段数线性放大：每段额外加 5 分钟
    private static readonly TimeSpan DefaultTimeout = TimeSpan.FromMinutes(30);

    // 资源保险丝：内存检查间隔
    private static readonly TimeSpan MemoryCheckInterval = TimeSpan.FromSeconds(5);

    // 单实例锁：同时只允许一个 transcribe.exe 进程
    private static readonly object _instanceLock = new();
    private static volatile bool _isRunning;

    // OS 级命名 Mutex：跨进程单实例约束
    // 部署不变量：工程管家桌面应用只有一个 API 进程实例，该进程内只有一个 worker 调用 ASR。
    // 此 Mutex 作为额外安全层，防止多 API 进程同时运行 transcribe.exe。
    private static readonly Mutex _osMutex = new(false, "Global\\EngineeringManagerSttEngine");

    public LlamaCppGgufEngine()
    {
        var gpu = SttEngineSelector.Detect();
        _useVulkan = gpu.HasDiscreteGpu && gpu.SupportsVulkan;
        _engineDir = SttModelManager.GetEngineDir();
    }

    public Task<bool> IsAvailableAsync()
    {
        return Task.FromResult(SttModelManager.IsAsrModelAvailable());
    }

    // ═══════════════════════════════════════════════════════════
    // 上下文构建：hotwords.txt + 用户 context
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 构建完整的 context 参数：读取 hotwords.txt 热词表 + 拼入用户提供的上下文。
    /// </summary>
    private string? BuildContext(string? userContext)
    {
        var parts = new List<string>();

        var hotwordsPath = Path.Combine(_engineDir, "hotwords.txt");
        if (File.Exists(hotwordsPath))
        {
            try
            {
                var hotwords = File.ReadAllLines(hotwordsPath)
                    .Where(l => !string.IsNullOrWhiteSpace(l))
                    .Select(l => l.Trim())
                    .ToList();
                if (hotwords.Count > 0)
                {
                    var hotwordsStr = string.Join("、", hotwords);
                    parts.Add(hotwordsStr);
                    Console.WriteLine($"[SttEngine] 已加载 {hotwords.Count} 个热词到 context");
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[SttEngine] 读取 hotwords.txt 失败: {Common.Sanitize(ex.Message)}");
            }
        }

        if (!string.IsNullOrWhiteSpace(userContext))
            parts.Add(userContext);

        return parts.Count > 0 ? string.Join("。", parts) : null;
    }

    // ═══════════════════════════════════════════════════════════
    // 单文件转写
    // ═══════════════════════════════════════════════════════════

    public async Task<SttResult> TranscribeAsync(
        string wavPath,
        string? context,
        IProgress<int>? progress,
        CancellationToken ct)
    {
        if (!File.Exists(wavPath))
            throw new FileNotFoundException($"音频文件不存在: {wavPath}");

        var fullContext = BuildContext(context);
        var args = BuildArgs(new List<string> { wavPath }, fullContext);

        var (stdout, stderr, exitCode, hasCompletionMarker) = await RunTranscribeExe(args, ct, 1);

        var (text, elapsed, _) = ParseTranscribeOutput(stdout, Path.GetFileName(wavPath));

        ValidateResult(text, exitCode, hasCompletionMarker, stderr, stdout);

        progress?.Report(100);

        return new SttResult
        {
            Text = text,
            Segments = new List<SttSegment> { new() { Speaker = 0, Start = 0, End = 0, Text = text } },
            ElapsedSec = elapsed,
            Engine = Name,
        };
    }

    // ═══════════════════════════════════════════════════════════
    // 批量转写
    // ═══════════════════════════════════════════════════════════

    public async Task<List<string>> TranscribeBatchAsync(
        List<string> wavPaths,
        string? context,
        CancellationToken ct)
    {
        if (wavPaths.Count == 0)
            return new List<string>();

        if (wavPaths.Count == 1)
        {
            var result = await TranscribeAsync(wavPaths[0], context, null, ct);
            return new List<string> { result.Text };
        }

        foreach (var path in wavPaths)
        {
            if (!File.Exists(path))
                throw new FileNotFoundException($"音频文件不存在: {path}");
        }

        Console.WriteLine($"[SttEngine] 批量转写 {wavPaths.Count} 段（模型只加载一次）");

        var fullContext = BuildContext(context);
        var args = BuildArgs(wavPaths, fullContext);

        var (stdout, stderr, exitCode, hasCompletionMarker) = await RunTranscribeExe(args, ct, wavPaths.Count);

        var texts = ParseMultiFileOutput(stdout, wavPaths);

        if (texts.All(string.IsNullOrWhiteSpace))
        {
            var errMsg = string.IsNullOrEmpty(stderr) ? stdout : stderr;
            throw new Exception($"transcribe.exe 批量转写失败 (exit={exitCode}): {Common.Sanitize(errMsg)}");
        }

        if (exitCode != 0)
        {
            if (hasCompletionMarker)
            {
                Console.WriteLine($"[SttEngine] transcribe.exe exit code={exitCode} (完成标记已找到，尾部崩溃已忽略)");
            }
            else
            {
                Console.Error.WriteLine($"[SttEngine] 警告: transcribe.exe exit code={exitCode} 且无完成标记，文本可能不完整");
            }
        }

        return texts;
    }

    // ═══════════════════════════════════════════════════════════
    // 内部方法
    // ═══════════════════════════════════════════════════════════

    private StringBuilder BuildArgs(List<string> wavPaths, string? fullContext)
    {
        var args = new StringBuilder();

        foreach (var path in wavPaths)
        {
            args.Append('"').Append(path).Append('"').Append(' ');
        }

        args.Append("--prec int4");
        args.Append(" --n-ctx 2048");
        args.Append(" --chunk-size 40");
        args.Append(" --no-ts");
        args.Append(" --quiet");
        args.Append(" -y");
        if (_useVulkan)
            args.Append(" --vulkan");
        else
            args.Append(" --no-vulkan");
        // DML 开启（2026-09-05 用户决策：能用显存就用显存）：编码器 ONNX 经
        // DirectML 走显卡。注：2f1034b2 曾以"开 DML 致任务 24 内存熔断"为由回退，
        // 后经时间线核对证伪（任务 24 跑于 DML 生效前，DML 不可能是凶手），故恢复。
        args.Append(" --dml");
        if (!string.IsNullOrWhiteSpace(fullContext))
            args.Append(" --context \"").Append(fullContext.Replace("\"", "\\\"")).Append('"');
        args.Append(" --language Chinese");

        return args;
    }

    /// <summary>
    /// 运行 transcribe.exe 并返回 stdout/stderr/exitCode/hasCompletionMarker。
    /// 安全机制：
    /// - GPU fail-closed：启动后 30 秒内必须检测到 Vulkan 后端，否则杀进程拒绝运行
    /// - 资源保险丝：PrivateMemorySize64 ≥6GB 或系统 RAM≥80% 或 Commit≥90% 时杀进程树
    /// - 单实例：同时只允许一个 transcribe.exe 进程
    /// </summary>
    private async Task<(string stdout, string stderr, int exitCode, bool hasCompletionMarker)> RunTranscribeExe(
        StringBuilder args,
        CancellationToken ct,
        int fileCount)
    {
        var exePath = SttModelManager.GetTranscribeExePath();
        if (!File.Exists(exePath))
            throw new FileNotFoundException($"transcribe.exe 不存在: {exePath}");

        // fail-closed 前置检查：Vulkan DLL 必须存在
        if (!_useVulkan)
            throw new InvalidOperationException("GPU fail-closed: Vulkan 不可用，拒绝启动 ASR（严禁 CPU 回退）");

        // Mutex 获取/释放委托给 SttMutexGuard.WithMutexAsync
        // 在专用线程上同步获取和释放 Mutex，确保同一线程满足 Windows Mutex 所有权规则
        return await SttMutexGuard.WithMutexAsync(
            _osMutex, _instanceLock, () => _isRunning, v => _isRunning = v,
            async () =>
            {
            // Pre-job 动态资源门控：不缓存，启动子进程前实时读取 RAM/Commit/可用内存
            var preJobRam = SttEngineSelector.GetRamUsagePercent();
            var (preJobCommit, preJobCommitLimit) = SttEngineSelector.GetCommitInfo();
            var preJobAvailMem = SttEngineSelector.GetAvailableMemoryBytes();
            var preJobCheck = SttSafetyChecker.CheckPreJobResources(
                preJobRam, preJobCommit, preJobCommitLimit, preJobAvailMem);
            if (preJobCheck.ShouldFail)
            {
                throw new InvalidOperationException(preJobCheck.Message);
            }

            Process? process = null;
            try
            {
            var psi = new ProcessStartInfo
            {
                FileName = exePath,
                Arguments = args.ToString(),
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                StandardOutputEncoding = Encoding.UTF8,
                StandardErrorEncoding = Encoding.UTF8,
                WorkingDirectory = _engineDir,
            };

            psi.Environment["PYTHONUTF8"] = "1";
            psi.Environment["PYTHONIOENCODING"] = "utf-8";
            psi.Environment["GGML_VULKAN_DEVICE"] = "0";

// 启动前准备日志文件：重命名旧文件，杜绝陈旧日志误放行。
// 必须在 process.Start() 之前 —— 否则日志被残留进程锁定时异常抛出、
// 任务标失败，但已启动的转写进程无人回收，在后台空跑（任务 23 事故）。
var logFilePath = Path.Combine(_engineDir, "logs", "latest.log");
if (!LogFileIncrementalReader.PrepareForNewRun(logFilePath))
{
    throw new Exception(
                        "日志文件被占用（可能有残留的转写进程）。请重启应用后重试；" +
                        "若仍失败，请在任务管理器结束所有 transcribe.exe 进程。");
}

            process = new Process { StartInfo = psi };
            var tcs = new TaskCompletionSource<bool>();

            process.EnableRaisingEvents = true;
            process.Exited += (s, e) => tcs.TrySetResult(true);

            if (!process.Start())
                throw new Exception("无法启动 transcribe.exe");

            // 逐行读取 stdout/stderr，使监控计时器能实时检查 GPU 确认
            // stdout 使用原始字节读取 + 后续严格解码，避免 UTF-8 替换回退产生 U+FFFD
            var outputBuilder = new StringBuilder();   // best-effort UTF-8，仅供监控循环使用
            var errorBuilder = new StringBuilder();
            var outputLock = new object();
            var rawStdoutStream = new System.IO.MemoryStream();

            var stdoutTask = Task.Run(async () =>
            {
                var buffer = new byte[8192];
                var baseStream = process.StandardOutput.BaseStream;
                int bytesRead;
                while ((bytesRead = await baseStream.ReadAsync(buffer, ct)) > 0)
                {
                    // 1. 保存原始字节（用于最终严格解码）
                    lock (outputLock)
                    {
                        rawStdoutStream.Write(buffer, 0, bytesRead);
                    }
                    // 2. best-effort UTF-8 解码追加到 outputBuilder（仅供监控循环检查 ASCII 标记）
                    lock (outputLock)
                    {
                        var bestEffortText = Encoding.UTF8.GetString(buffer, 0, bytesRead);
                        outputBuilder.Append(bestEffortText);
                    }
                }
            }, ct);

            var stderrTask = Task.Run(async () =>
            {
                string? line;
                while ((line = await process.StandardError.ReadLineAsync(ct)) != null)
                {
                    lock (outputLock)
                        errorBuilder.AppendLine(line);
                }
            }, ct);

// GPU fail-closed + 资源保险丝：使用 SttMonitorLoop（可注入 ISttTelemetryProvider）
// （日志准备已在 process.Start() 之前完成，logFilePath 供 telemetry 增量读取）
var telemetry = new SttTelemetryProvider(process, outputLock, outputBuilder, errorBuilder, logFilePath);
            var monitorLoop = new SttMonitorLoop(telemetry);
            var startTime = DateTime.UtcNow;

            using var monitorTimer = new System.Threading.Timer(_ =>
            {
                try
                {
                    var stopReason = monitorLoop.CheckOnce(startTime);
                    if (stopReason != null)
                    {
                        Console.Error.WriteLine($"[SttEngine] {stopReason}");
                        tcs.TrySetException(new InvalidOperationException(stopReason));
                    }
                }
                catch { }
            }, null, MemoryCheckInterval, MemoryCheckInterval);

            // 注册取消令牌
            await using var ctReg = ct.Register(() =>
            {
                try { KillProcessTree(process); } catch { }
                tcs.TrySetCanceled(ct);
            });

            // 超时
            var timeout = TimeSpan.FromMinutes(DefaultTimeout.TotalMinutes + (fileCount - 1) * 5);
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeoutCts.CancelAfter(timeout);
            await using var timeoutReg = timeoutCts.Token.Register(() =>
            {
                try { KillProcessTree(process); } catch { }
                tcs.TrySetException(new TimeoutException($"转写超时 ({timeout.TotalMinutes:F0} 分钟, {fileCount} 段)"));
            });

            try
            {
                await tcs.Task;
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                throw;
            }
            catch (TimeoutException)
            {
                throw;
            }

            process.WaitForExit();

            await stdoutTask;
            await stderrTask;

            string stdout;
            string stderr;
            byte[] rawStdoutBytes;
            lock (outputLock)
            {
                rawStdoutBytes = rawStdoutStream.ToArray();
                stderr = errorBuilder.ToString();
            }

            // 严格解码 stdout：UTF-8 严格模式，失败则 fail closed
            // 10.12 修正：禁止 GBK 猜测回退，严格按 PYTHONUTF8=1 契约
            var decodeResult = StdoutEncodingDecoder.Decode(rawStdoutBytes);
            stdout = decodeResult.Text;

            Console.WriteLine($"[SttEngine] stdout decoded as {decodeResult.EncodingUsed}, " +
                $"raw={rawStdoutBytes.Length} bytes, text={stdout.Length} chars, " +
                $"containsFffd={decodeResult.ContainsReplacementChars}");

            if (decodeResult.ContainsReplacementChars)
            {
                throw new InvalidOperationException(
                    $"Stdout 解码后仍含 U+FFFD 替换字符（编码={decodeResult.EncodingUsed}），" +
                    "fail closed：结果不可信，拒绝使用。");
            }

            // GPU fail-closed 最终验证（使用 GpuLogParser 严格解析）
            var gpuResult = monitorLoop.FinalGpuVerification();

            if (gpuResult.ShouldFail)
            {
                Console.Error.WriteLine($"[SttEngine] GPU fail-closed 最终验证失败: {gpuResult.Message}");
                throw new InvalidOperationException($"GPU fail-closed: {gpuResult.Message}");
            }

            Console.WriteLine($"[SttEngine] {gpuResult.Message}");

            // CPU fallback 最终检测
            if (monitorLoop.CpuFallbackDetected)
            {
                Console.Error.WriteLine("[SttEngine] GPU fail-closed: 检测到 CPU fallback。拒绝结果");
                throw new InvalidOperationException("GPU fail-closed: 检测到 CPU fallback，结果被拒绝");
            }

            var hasCompletionMarker = stdout.Contains("已完成", StringComparison.Ordinal)
                || stdout.Contains("completed", StringComparison.OrdinalIgnoreCase);

            Console.WriteLine($"[SttEngine] stdout len={stdout.Length}, stderr len={stderr.Length}, exit={process.ExitCode}");

            return (stdout, stderr, process.ExitCode, hasCompletionMarker);
            }
            catch
            {
                // 任何阶段抛异常（监控保险丝/GPU 验证/解码失败）都不能让已启动的
                // 转写进程存活 —— 否则它锁着 latest.log 继续跑，下一个任务也会被拖垮
                try { if (process != null) KillProcessTree(process); } catch { }
                throw;
            }
            finally
            {
                process?.Dispose();
            }
            }); // end SttMutexGuard.WithMutexAsync
    }

    /// <summary>
    /// 验证转写结果
    /// </summary>
    private static void ValidateResult(string text, int exitCode, bool hasCompletionMarker, string stderr, string stdout)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            var errMsg = string.IsNullOrEmpty(stderr) ? stdout : stderr;
            throw new Exception($"transcribe.exe 转写失败 (exit={exitCode}): {Common.Sanitize(errMsg)}");
        }

        if (exitCode != 0)
        {
            if (hasCompletionMarker)
            {
                Console.WriteLine($"[SttEngine] transcribe.exe exit code={exitCode} (完成标记已找到，尾部崩溃已忽略)");
            }
            else
            {
                Console.Error.WriteLine($"[SttEngine] 警告: transcribe.exe exit code={exitCode} 且无完成标记，文本可能不完整");
            }
        }
    }

    /// <summary>
    /// 从 stdout 中提取单文件转写文本
    /// </summary>
    private static (string text, double elapsed, bool hasCompletionMarker) ParseTranscribeOutput(string stdout, string? filename = null)
    {
        var lines = stdout.Split('\n', StringSplitOptions.None);
        var textLines = new List<string>();
        double elapsed = 0;
        bool hasCompletionMarker = false;

        bool inTextSection = false;

        foreach (var rawLine in lines)
        {
            var trimmed = rawLine.Trim();

            if (!inTextSection)
            {
                if (trimmed.Contains("开始处理", StringComparison.Ordinal)
                    || (filename != null && trimmed.Contains(filename, StringComparison.OrdinalIgnoreCase)))
                {
                    inTextSection = true;
                }
                continue;
            }

            if (inTextSection)
            {
                if (trimmed.Contains("所有任务已完成", StringComparison.Ordinal))
                {
                    hasCompletionMarker = true;
                    break;
                }
                if (trimmed.StartsWith("--- [QwenASR]", StringComparison.Ordinal))
                    break;
                if (trimmed.Contains("Traceback", StringComparison.Ordinal))
                    break;
                if (trimmed.StartsWith("+---") && trimmed.Contains("---+"))
                    break;
                if (trimmed.Contains("UnicodeEncodeError", StringComparison.Ordinal))
                    break;
                if (trimmed.StartsWith("[PYI-", StringComparison.Ordinal))
                    break;

                if (trimmed.StartsWith("已保存文本文件", StringComparison.Ordinal)
                    || trimmed.StartsWith("已生成字幕文件", StringComparison.Ordinal)
                    || trimmed.StartsWith("已导出时间戳", StringComparison.Ordinal))
                    continue;

                if (string.IsNullOrEmpty(trimmed))
                    continue;

                textLines.Add(trimmed);
            }
        }

        var fullText = string.Join("\n", textLines).Trim();
        return (fullText, elapsed, hasCompletionMarker);
    }

    /// <summary>
    /// 解析多文件转写输出
    /// </summary>
    private static List<string> ParseMultiFileOutput(string stdout, List<string> wavPaths)
    {
        var lines = stdout.Split('\n', StringSplitOptions.None);
        var results = new List<string>();
        var currentText = new List<string>();
        bool inTextSection = false;
        bool hasAnyFile = false;

        var filenames = wavPaths.Select(p => Path.GetFileName(p)).ToList();

        foreach (var rawLine in lines)
        {
            var trimmed = rawLine.Trim();

            bool isFileMarker = false;
            foreach (var fn in filenames)
            {
                if (trimmed.Contains(fn, StringComparison.OrdinalIgnoreCase))
                {
                    isFileMarker = true;
                    break;
                }
            }

            if (isFileMarker)
            {
                if (hasAnyFile)
                {
                    results.Add(string.Join("\n", currentText).Trim());
                }
                hasAnyFile = true;
                currentText.Clear();
                inTextSection = true;
                continue;
            }

            if (!inTextSection)
                continue;

            if (trimmed.Contains("所有任务已完成", StringComparison.Ordinal))
            {
                if (hasAnyFile)
                    results.Add(string.Join("\n", currentText).Trim());
                break;
            }
            if (trimmed.StartsWith("--- [QwenASR]", StringComparison.Ordinal))
            {
                if (hasAnyFile)
                    results.Add(string.Join("\n", currentText).Trim());
                break;
            }
            if (trimmed.Contains("Traceback", StringComparison.Ordinal))
            {
                if (hasAnyFile)
                    results.Add(string.Join("\n", currentText).Trim());
                break;
            }
            if (trimmed.StartsWith("+---") && trimmed.Contains("---+"))
            {
                if (hasAnyFile)
                    results.Add(string.Join("\n", currentText).Trim());
                break;
            }
            if (trimmed.Contains("UnicodeEncodeError", StringComparison.Ordinal))
            {
                if (hasAnyFile)
                    results.Add(string.Join("\n", currentText).Trim());
                break;
            }
            if (trimmed.StartsWith("[PYI-", StringComparison.Ordinal))
            {
                if (hasAnyFile)
                    results.Add(string.Join("\n", currentText).Trim());
                break;
            }

            if (trimmed.Contains(".txt", StringComparison.OrdinalIgnoreCase))
                continue;
            if (trimmed.StartsWith("已保存文本文件", StringComparison.Ordinal)
                || trimmed.StartsWith("已生成字幕文件", StringComparison.Ordinal)
                || trimmed.StartsWith("已导出时间戳", StringComparison.Ordinal))
                continue;

            if (string.IsNullOrEmpty(trimmed))
                continue;

            currentText.Add(trimmed);
        }

        if (hasAnyFile && inTextSection)
        {
            results.Add(string.Join("\n", currentText).Trim());
        }

        if (results.Count == 0)
        {
            var (text, _, _) = ParseTranscribeOutput(stdout, filenames.FirstOrDefault());
            results.Add(text);
        }

        var expectedCount = wavPaths.Count;
        while (results.Count < expectedCount)
            results.Add("");

        return results;
    }

    /// <summary>
    /// 杀掉整个进程树
    /// </summary>
    private static void KillProcessTree(Process process)
    {
        if (process.HasExited) return;

        try
        {
            var pid = process.Id;
            Console.WriteLine($"[SttEngine] 杀掉进程树 PID={pid}");

            var psi = new ProcessStartInfo
            {
                FileName = "taskkill",
                Arguments = $"/F /T /PID {pid}",
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
            };
            using var killer = Process.Start(psi);
            killer?.WaitForExit(5000);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[SttEngine] 杀进程树失败: {Common.Sanitize(ex.Message)}");
            try { process.Kill(entireProcessTree: true); } catch { }
        }
    }
}
