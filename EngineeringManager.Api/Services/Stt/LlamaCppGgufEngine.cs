using System.Diagnostics;
using System.Text;

namespace EngineeringManager.Api.Services.Stt;

/// <summary>
/// LlamaCpp GGUF 引擎：用 Process 起 transcribe.exe，解析 stdout 拿转写文本。
/// 关键设计：
/// 1. 进程要能被 CancellationToken 杀掉整个进程树（taskkill /F /T /PID）
/// 2. 超时保护（30 分钟）
/// 3. stdout 解析容错：transcribe.exe 的 PyInstaller 打包版在打印 emoji 统计时
///    会因 GBK 编码崩溃 (exit code 1)，但文本在此之前已经输出到 stdout，
///    所以只要 stdout 里有文本就视为成功。
/// 4. 环境变量 PYTHONUTF8=1 + PYTHONIOENCODING=utf-8 强制 Python 子进程用 UTF-8 输出
/// 5. 批量转写 (TranscribeBatchAsync)：一次进程处理多段音频，模型只加载一次
/// 6. 热词表 (hotwords.txt) 自动读取并拼入 --context 参数
/// </summary>
public class LlamaCppGgufEngine : ISttEngine
{
    public string Name => "Qwen3-ASR-1.7B-GGUF (q4_k, llama.cpp Vulkan)";

    private readonly bool _useVulkan;
    private readonly string _engineDir;

    // transcribe.exe 默认超时：30 分钟（长音频可能很慢）
    // 批量模式按段数线性放大：每段额外加 5 分钟
    private static readonly TimeSpan DefaultTimeout = TimeSpan.FromMinutes(30);

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
    /// hotwords.txt 位于 asr-engine/ 目录，每行一个热词（工程术语、人名、地名等）。
    /// 拼接格式：甲方、乙方、监理、…、[已脱敏]。用户上下文
    /// </summary>
    private string? BuildContext(string? userContext)
    {
        var parts = new List<string>();

        // 1. 读取热词表
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

        // 2. 拼入用户上下文
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
    // 批量转写：一次 transcribe.exe 调用处理多个音频文件
    // 模型只加载一次，避免 N 段 N 次重载 1.7B 模型的性能灾难
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 批量转写多个音频文件，返回每段对应的文本列表。
    /// transcribe.exe 支持 FILES... 多文件参数，一次进程内顺序处理。
    /// </summary>
    /// <param name="wavPaths">要转写的 WAV 文件路径列表</param>
    /// <param name="context">可选上下文/热词提示</param>
    /// <param name="ct">取消令牌</param>
    /// <returns>每段音频对应的转写文本（顺序与 wavPaths 一致）</returns>
    public async Task<List<string>> TranscribeBatchAsync(
        List<string> wavPaths,
        string? context,
        CancellationToken ct)
    {
        if (wavPaths.Count == 0)
            return new List<string>();

        // 单段直接走单文件路径
        if (wavPaths.Count == 1)
        {
            var result = await TranscribeAsync(wavPaths[0], context, null, ct);
            return new List<string> { result.Text };
        }

        // 验证文件存在
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

        // 验证：至少有一段非空文本
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

    /// <summary>
    /// 构建 transcribe.exe 命令行参数（单文件和多文件通用）
    /// </summary>
    private StringBuilder BuildArgs(List<string> wavPaths, string? fullContext)
    {
        var args = new StringBuilder();

        // 文件路径（transcribe.exe 接受 FILES... 多文件）
        foreach (var path in wavPaths)
        {
            args.Append('"').Append(path).Append('"').Append(' ');
        }

        args.Append("--prec int4");
        args.Append(" --n-ctx 2048");
        args.Append(" --chunk-size 40");
        args.Append(" --no-ts");       // 不需要时间戳对齐（不需要 Aligner 模型）
        args.Append(" --quiet");       // 减少无关输出（避免统计 emoji 崩溃）
        args.Append(" -y");            // 覆盖已有输出
        if (_useVulkan)
            args.Append(" --vulkan");
        else
            args.Append(" --no-vulkan");
        args.Append(" --no-dml");      // Encoder 留 CPU
        if (!string.IsNullOrWhiteSpace(fullContext))
            args.Append(" --context \"").Append(fullContext.Replace("\"", "\\\"")).Append('"');
        args.Append(" --language Chinese");

        return args;
    }

    /// <summary>
    /// 运行 transcribe.exe 并返回 stdout/stderr/exitCode/hasCompletionMarker。
    /// 公共逻辑：进程启动、UTF-8 编码、取消令牌、超时保护、进程树杀。
    /// </summary>
    private async Task<(string stdout, string stderr, int exitCode, bool hasCompletionMarker)> RunTranscribeExe(
        StringBuilder args,
        CancellationToken ct,
        int fileCount)
    {
        var exePath = SttModelManager.GetTranscribeExePath();
        if (!File.Exists(exePath))
            throw new FileNotFoundException($"transcribe.exe 不存在: {exePath}");

        var psi = new ProcessStartInfo
        {
            FileName = exePath,
            Arguments = args.ToString(),
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            // transcribe.exe (PyInstaller 打包) 不受 PYTHONUTF8 环境变量控制，
            // 其 stdout 使用系统默认编码（中文 Windows = GBK）。
            // stderr 可能含 emoji 统计信息，仍用 UTF-8 读取避免崩溃。
            StandardOutputEncoding = Encoding.Default,
            StandardErrorEncoding = Encoding.UTF8,
            WorkingDirectory = _engineDir,
        };

        // 环境变量：强制 Python UTF-8 模式（根治 emoji GBK 崩溃）
        psi.Environment["PYTHONUTF8"] = "1";
        psi.Environment["PYTHONIOENCODING"] = "utf-8";
        psi.Environment["GGML_VULKAN_DEVICE"] = "0";

        using var process = new Process { StartInfo = psi };
        var tcs = new TaskCompletionSource<bool>();

        process.EnableRaisingEvents = true;
        process.Exited += (s, e) => tcs.TrySetResult(true);

        if (!process.Start())
            throw new Exception("无法启动 transcribe.exe");

        // 使用 ReadToEndAsync 代替 BeginOutputReadLine，避免事件回调丢数据
        var stdoutTask = process.StandardOutput.ReadToEndAsync(ct);
        var stderrTask = process.StandardError.ReadToEndAsync(ct);

        // 注册取消令牌：杀掉整个进程树
        await using var ctReg = ct.Register(() =>
        {
            try { KillProcessTree(process); } catch { }
            tcs.TrySetCanceled(ct);
        });

        // 超时：按文件数线性放大（每段额外加 5 分钟）
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

        // 等待进程完全退出 + 异步读取完成
        process.WaitForExit();

        var stdout = await stdoutTask;
        var stderr = await stderrTask;

        // 完成标记检测：用多种方式匹配（编码兼容）
        var hasCompletionMarker = stdout.Contains("已完成", StringComparison.Ordinal)
            || stdout.Contains("completed", StringComparison.OrdinalIgnoreCase);

        Console.WriteLine($"[SttEngine] stdout len={stdout.Length}, stderr len={stderr.Length}, exit={process.ExitCode}");

        return (stdout, stderr, process.ExitCode, hasCompletionMarker);
    }

    /// <summary>
    /// 验证转写结果，抛异常或打日志
    /// </summary>
    private static void ValidateResult(string text, int exitCode, bool hasCompletionMarker, string stderr, string stdout)
    {
        // 判定逻辑：
        // 1. exit code=0 → 成功
        // 2. exit code=1 + 有文本 + 有完成标记 → 成功（emoji 崩溃发生在输出统计阶段）
        // 3. exit code=1 + 有文本 + 无完成标记 → 可疑（可能中途崩了只吐了半截）
        // 4. exit code=1 + 无文本 → 真正失败
        if (string.IsNullOrWhiteSpace(text))
        {
            // 没有文本 → 真正的失败
            var errMsg = string.IsNullOrEmpty(stderr) ? stdout : stderr;
            throw new Exception($"transcribe.exe 转写失败 (exit={exitCode}): {Common.Sanitize(errMsg)}");
        }

        if (exitCode != 0)
        {
            if (hasCompletionMarker)
            {
                // 完成标记存在 → 文本是完整的，exit code=1 只是尾部 emoji 崩溃
                Console.WriteLine($"[SttEngine] transcribe.exe exit code={exitCode} (完成标记已找到，尾部崩溃已忽略)");
            }
            else
            {
                // 无完成标记 → 可能中途崩溃，文本可能不完整
                Console.Error.WriteLine($"[SttEngine] 警告: transcribe.exe exit code={exitCode} 且无完成标记，文本可能不完整");
                // 不抛异常，但在日志中标记可疑（准确优先原则下宁可告警也不静默）
            }
        }
    }

    /// <summary>
    /// 从 stdout 中提取单文件转写文本
    /// 
    /// transcribe.exe --quiet 输出格式：
    ///   +---------- Qwen3-ASR 配置选项 ----------+
    ///   |  模型目录    ...                       |
    ///   +----------------------------------------+
    ///   --- [QwenASR] 引擎初始化耗时: 2.49 秒 ---
    ///   
    ///   开始处理: filename.wav
    ///   
    ///   转写文本第一行
    ///   转写文本第二行
    ///   ...
    ///   转写文本最后一行
    ///   
    ///   所有任务已完成。
    ///   
    /// 提取策略：找 "开始处理:" 行之后的文本，到 "所有任务已完成" 或 "--- [QwenASR]" 或 Traceback 为止
    /// 返回值：text, elapsed, hasCompletionMarker
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

            // 文本区域开始：匹配 "开始处理" 或包含文件名
            if (!inTextSection)
            {
                if (trimmed.Contains("开始处理", StringComparison.Ordinal)
                    || (filename != null && trimmed.Contains(filename, StringComparison.OrdinalIgnoreCase)))
                {
                    inTextSection = true;
                }
                continue;
            }

            // 文本区域结束标志
            if (inTextSection)
            {
                // "所有任务已完成" → 成功完成标记
                if (trimmed.Contains("所有任务已完成", StringComparison.Ordinal))
                {
                    hasCompletionMarker = true;
                    break;
                }
                // "--- [QwenASR]" → 引擎关闭，结束
                if (trimmed.StartsWith("--- [QwenASR]", StringComparison.Ordinal))
                    break;
                // Traceback → 崩溃输出，结束
                if (trimmed.Contains("Traceback", StringComparison.Ordinal))
                    break;
                // "+----------------" → traceback 边框，结束
                if (trimmed.StartsWith("+---") && trimmed.Contains("---+"))
                    break;
                // UnicodeEncodeError → 编码崩溃，结束
                if (trimmed.Contains("UnicodeEncodeError", StringComparison.Ordinal))
                    break;
                // "[PYI-" → PyInstaller 错误，结束
                if (trimmed.StartsWith("[PYI-", StringComparison.Ordinal))
                    break;

                // 跳过导出消息行（emoji 修复后这些行会出现在文本之后）
                if (trimmed.StartsWith("已保存文本文件", StringComparison.Ordinal)
                    || trimmed.StartsWith("已生成字幕文件", StringComparison.Ordinal)
                    || trimmed.StartsWith("已导出时间戳", StringComparison.Ordinal))
                    continue;

                // 跳过空行（但保留文本中的空行结构）
                if (string.IsNullOrEmpty(trimmed))
                    continue;

                // 收集文本行
                textLines.Add(trimmed);
            }
        }

        var fullText = string.Join("\n", textLines).Trim();
        return (fullText, elapsed, hasCompletionMarker);
    }

    /// <summary>
    /// 解析多文件转写输出：按 "开始处理:" 标记切分各文件文本。
    /// 
    /// 多文件输出格式：
    ///   --- [QwenASR] 引擎初始化耗时: 2.49 秒 ---
    ///   
    ///   开始处理: seg_000_spk0.wav
    ///   文本A第一行
    ///   文本A第二行
    ///   
    ///   开始处理: seg_001_spk1.wav
    ///   文本B第一行
    ///   
    ///   所有任务已完成。
    /// </summary>
    private static List<string> ParseMultiFileOutput(string stdout, List<string> wavPaths)
    {
        var lines = stdout.Split('\n', StringSplitOptions.None);
        var results = new List<string>();
        var currentText = new List<string>();
        bool inTextSection = false;
        bool hasAnyFile = false;

        // 提取文件名列表（纯 ASCII，不受编码影响）
        var filenames = wavPaths.Select(p => Path.GetFileName(p)).ToList();

        foreach (var rawLine in lines)
        {
            var trimmed = rawLine.Trim();

            // 新文件区域开始：行中包含已知文件名
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
                // 保存上一个文件的文本
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

            // 结束标记
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

            // 跳过导出消息行（包含 .txt 路径的行是导出消息，不是转写文本）
            if (trimmed.Contains(".txt", StringComparison.OrdinalIgnoreCase))
                continue;
            // 跳过中文导出消息行（编码正确时匹配）
            if (trimmed.StartsWith("已保存文本文件", StringComparison.Ordinal)
                || trimmed.StartsWith("已生成字幕文件", StringComparison.Ordinal)
                || trimmed.StartsWith("已导出时间戳", StringComparison.Ordinal))
                continue;

            // 跳过空行
            if (string.IsNullOrEmpty(trimmed))
                continue;

            currentText.Add(trimmed);
        }

        // 循环结束后：如果还在文本区域，保存最后一段文本
        // （进程可能在输出完最后一段文本后崩溃，没有 "所有任务已完成" 标记）
        if (hasAnyFile && inTextSection)
        {
            results.Add(string.Join("\n", currentText).Trim());
        }

        // 如果没有找到任何文件标记，回退到单文件解析
        if (results.Count == 0)
        {
            var (text, _, _) = ParseTranscribeOutput(stdout, filenames.FirstOrDefault());
            results.Add(text);
        }

        // 确保结果数量和预期一致（不足的补空字符串）
        var expectedCount = wavPaths.Count;
        while (results.Count < expectedCount)
            results.Add("");

        return results;
    }

    /// <summary>
    /// 杀掉整个进程树（transcribe.exe 会起子进程做编码/对齐）
    /// 使用 taskkill /F /T /PID 强制杀掉进程及其所有子进程
    /// </summary>
    private static void KillProcessTree(Process process)
    {
        if (process.HasExited) return;

        try
        {
            var pid = process.Id;
            Console.WriteLine($"[SttEngine] 杀掉进程树 PID={pid}");

            // taskkill /F /T 强制杀掉进程及其所有子进程
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
            // 回退：直接 Kill
            try { process.Kill(entireProcessTree: true); } catch { }
        }
    }
}
