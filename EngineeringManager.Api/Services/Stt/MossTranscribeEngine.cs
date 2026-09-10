using System.Diagnostics;
using System.Text;
using System.Text.Json;
using EngineeringManager.Api.Services.Stt;

namespace EngineeringManager.Api.Services.Stt;

/// <summary>
/// MOSS-Transcribe-Diarize 0.9B 引擎（OpenMOSS，Apache-2.0，社区 ggml 移植 moss-transcribe.cpp）。
///
/// 与 LlamaCppGgufEngine（Qwen3-ASR）的本质差异：一步成段——单个模型在一次推理中
/// 同时输出文本、说话人标签（[S01]…，1 基）与时间戳，因此**跳过 sherpa 分离阶段**，
/// 也不存在两段式管线的重叠巨段缺陷（2026-09-09 实测 #24 重叠率 35.8%）。
///
/// 运行形态：asr-engine/moss/moss-transcribe.exe（CPU 基线）+ moss-transcribe-q8_0.gguf（941MB，
/// 官方参考实现逐字节一致）；目录下若另有 moss-transcribe-vk.exe（Vulkan 后端，RX 580 实测
/// 1.44×）则优先使用，Vulkan 失败自动回退 CPU。安全机制沿用现役引擎纪律：
/// - 单实例：与 LlamaCppGgufEngine 共享同一 OS Mutex，整机同时只跑一个重推理
/// - PreJob 资源门：启动子进程前实时检查 RAM/Commit/可用内存
/// - 运行时保险丝：进程 RSS ≥8GB 或系统可用内存低于 SttSafetyChecker 运行时阈值 → 杀进程树
/// - 取消/异常路径一律杀进程树（任务 23 僵尸进程事故教训）
///
/// 长音频：切块顺序推理，CHUNK_SEC(120s)（2026-09-09 细分块实测：600s 块 CPU RTF 恶化到 6.6，
/// 120s 块 RTF 1.24（Vulkan）/约 1.8（CPU），31.6 分钟会议 16 块可跑完）。
/// **跨块说话人编号暂不保证全局一致**（[S01] 按块内出现顺序分配）——跨块对齐需声纹嵌入，
/// 设计见 .work/moss/speaker-align-design.md，待拍板后实装。
///
/// 热词（2026-09-10 接线）：context 非空 → 选用热词版 exe（--hotwords，cpp 补丁把值按
/// 系统代码页→UTF-8 重编码后拼进解码 prompt「热词提示：…」）；热词版 exe 缺失或 context
/// 为空 → 走无热词基线路径（与历史行为逐字节一致）。编码链路（探针实测，勿改）：
/// C# 经 ProcessStartInfo.Arguments 传中文 → .NET/系统按 ACP(GBK) 编码窄 argv →
/// exe 侧 argv_acp_to_utf8 转回 UTF-8，链路闭合；**C# 侧禁止预转 UTF-8**（双转乱码）。
/// 2026-09-09 方言试金石（南充/富顺/自贡）：MOSS 无热词全对，Qwen3 把自贡写成「资贡」。
/// </summary>
public class MossTranscribeEngine : ISttEngine
{
    public const string EngineId = "moss-transcribe-0.9b";

    /// <summary>CPU 版 exe 名（基线，必存在）。</summary>
    public const string CpuExeName = "moss-transcribe.exe";

    /// <summary>
    /// Vulkan 版 exe 名（可选加速后端）。部署：把 E:\moss-build\moss-transcribe.cpp\build-vulkan\
    /// moss-transcribe.exe 复制为 asr-engine/moss/moss-transcribe-vk.exe（51.6MB，不入库）；
    /// 运行时加载系统 vulkan-1.dll（RX 580 实测 1.44× CPU）。缺失即回退 CPU 版。
    /// </summary>
    public const string VulkanExeName = "moss-transcribe-vk.exe";

    /// <summary>
    /// 热词版 exe 名（CPU 构建；cpp 补丁：--hotwords 值 ACP→UTF-8 + 拼 prompt）。
    /// Vulkan 热词版尚未构建（待办：同补丁 -DMT_GGML_VULKAN=ON 重编），当前热词路径固定走 CPU 版。
    /// </summary>
    public const string HotwordsExeName = "moss-transcribe-hotwords.exe";

    /// <summary>热词长度上限（字符）。超长截断并日志，防止挤占解码上下文窗口。</summary>
    public const int HotwordsMaxChars = 500;

    /// <summary>
    /// 后端选择纯函数（单元测试覆盖）：热词 → 热词版 exe（基线 vk 版无 --hotwords，选它会静默丢热词）；
    /// 否则有 Vulkan 版用 Vulkan，无则回退 CPU。
    /// </summary>
    public static string SelectExeName(bool vkPresent, bool hotwords = false) =>
        hotwords ? HotwordsExeName : (vkPresent ? VulkanExeName : CpuExeName);

    /// <summary>
    /// 热词归一化纯函数（单元测试覆盖）：去首尾空白；空白/空 → null（走无热词路径）；
    /// 超 HotwordsMaxChars 截断（truncated=true 供调用方日志）。
    /// </summary>
    public static string? NormalizeHotwords(string? context, out bool truncated)
    {
        truncated = false;
        var s = context?.Trim();
        if (string.IsNullOrEmpty(s)) return null;
        if (s.Length > HotwordsMaxChars)
        {
            truncated = true;
            s = s[..HotwordsMaxChars];
        }
        return s;
    }

    /// <summary>
    /// 子进程命令行组装纯函数（单元测试覆盖）。热词非空时追加 --hotwords（引号包裹 + 内嵌引号转义）；
    /// 空/null 时不带该参数，与历史命令行逐字节一致。热词值**原样传**（.NET 按系统 ACP 编码，
    /// exe 侧转 UTF-8），此处禁止预转 UTF-8。
    /// </summary>
    public static string BuildArguments(string ggufPath, string chunkPath, string? hotwords) =>
        $"transcribe \"{ggufPath}\" \"{chunkPath}\" --format json"
        + (string.IsNullOrEmpty(hotwords)
            ? ""
            : $" --hotwords \"{hotwords.Replace("\"", "\\\"")}\"");

    /// <summary>切块长度（秒）。120s 块实测 RTF 1.24（Vulkan）/约 1.8（CPU），600s 块超线性恶化到 6.6。</summary>
    private const int ChunkSec = 120;

    /// <summary>单块推理超时（分钟）。120s 块 CPU RTF ~1.8 最坏 ~4 分钟，45 分钟为超保守余量（沿用原值）。</summary>
    private const int PerChunkTimeoutMin = 45;

    /// <summary>运行时进程 RSS 保险丝（字节）。q8_0 大上下文实测峰值 5.6GB（600s 块时代），8GB 熔断留余量。</summary>
    private const long ProcessRssFuseBytes = 8L * 1024 * 1024 * 1024;

    private const string MutexName = "Global\\EngineeringManagerSttEngine"; // 与 LlamaCppGgufEngine 共用：整机单重推理
    private static readonly Mutex _osMutex = new(false, MutexName);
    private static readonly object _instanceLock = new();
    /// <summary>本次 RunSingleAsync 是否触发过运行时保险丝（供回退过滤器排除熔断重试）</summary>
    private static volatile bool _lastFuseTripped;
    private static bool _isRunning;

    private static string? _engineDirCache;

    public string Name => EngineId;

    public Task<bool> IsAvailableAsync()
    {
        var dir = GetEngineDir();
        return Task.FromResult(
            dir != null
            && File.Exists(Path.Combine(dir, "moss-transcribe.exe"))
            && File.Exists(Path.Combine(dir, "moss-transcribe-q8_0.gguf")));
    }

    public async Task<SttResult> TranscribeAsync(
        string wavPath,
        string? context,
        IProgress<int>? progress,
        CancellationToken ct)
    {
        if (!await IsAvailableAsync())
            throw new InvalidOperationException($"MOSS 模型文件缺失，请检查 {EngineId} 所需的 asr-engine/moss/ 目录");

        // 热词归一化（整段一次）：截断日志 + 热词版 exe 缺失降级，避免逐块重复日志
        var hotwords = NormalizeHotwords(context, out var truncated);
        if (hotwords != null)
        {
            if (truncated)
                Console.WriteLine($"[MossTranscribeEngine] 热词超过 {HotwordsMaxChars} 字，已截断（防挤占解码窗口）");
            var engineDir = GetEngineDir();
            if (engineDir == null || !File.Exists(Path.Combine(engineDir, HotwordsExeName)))
            {
                Console.WriteLine("[MossTranscribeEngine] 热词版 exe 缺失，本次回退无热词基线路径");
                hotwords = null;
            }
        }

        var durationSec = await AudioPreprocessor.GetDurationAsync(wavPath);

        // ≤CHUNK_SEC 单次直跑；超长切块（临时文件放 Path.GetTempPath 下的独立目录）
        var chunks = new List<(string path, double offsetSec)>();
        if (durationSec <= ChunkSec + 1)
        {
            chunks.Add((wavPath, 0));
        }
        else
        {
            var tempDir = Path.Combine(Path.GetTempPath(), $"stt_moss_{Guid.NewGuid():N}");
            Directory.CreateDirectory(tempDir);
            try
            {
                for (var offset = 0.0; offset < durationSec; offset += ChunkSec)
                {
                    ct.ThrowIfCancellationRequested();
                    var len = (int)Math.Min(ChunkSec, durationSec - offset);
                    var chunkPath = Path.Combine(tempDir, $"chunk_{(int)offset:000000}.wav");
                    await CutWavAsync(wavPath, offset, len, chunkPath, ct);
                    chunks.Add((chunkPath, offset));
                }

                var all = await RunChunksAsync(chunks, durationSec, hotwords, progress, ct);
                return all;
            }
            finally
            {
                try { Directory.Delete(tempDir, true); } catch { /* 临时目录清理失败不致命 */ }
            }
        }

        return await RunChunksAsync(chunks, durationSec, hotwords, progress, ct);
    }

    private async Task<SttResult> RunChunksAsync(
        List<(string path, double offsetSec)> chunks,
        double durationSec,
        string? hotwords,
        IProgress<int>? progress,
        CancellationToken ct)
    {
        var sw = Stopwatch.StartNew();
        var allSegments = new List<SttSegment>();

        for (var i = 0; i < chunks.Count; i++)
        {
            ct.ThrowIfCancellationRequested();
            var (path, offset) = chunks[i];
            var json = await RunSingleAsync(path, hotwords, ct);
            foreach (var seg in ParseSegmentsJson(json, offset))
                allSegments.Add(seg);
            progress?.Report((i + 1) * 100 / chunks.Count);
        }

        return new SttResult
        {
            Text = string.Join("", allSegments.Select(s => s.Text)),
            Segments = allSegments,
            DurationSec = durationSec,
            ElapsedSec = sw.Elapsed.TotalSeconds,
            Engine = EngineId,
        };
    }

    /// <summary>单块推理：OS Mutex + PreJob 门 + 运行时保险丝（共享单实例纪律）。
    /// Vulkan 版存在则优先；Vulkan 失败（起不来/非零退出）时回退 CPU 版重试一次。</summary>
    private async Task<string> RunSingleAsync(string chunkPath, string? hotwords, CancellationToken ct)
    {
        var engineDir = GetEngineDir() ?? throw new InvalidOperationException("asr-engine/moss 未找到");
        // GGUF 参数必须走 ASCII 安全路径：moss-transcribe.exe 的窄字符 fopen 在中文路径下打不开
        // （2026-09-09 冒烟实测：E:\测试\... 传参 → gguf_init_from_file 失败）。
        // exe 路径本身由 Process.Start 宽字符 API 启动，不受影响；wav 路径在 %TEMP%（ASCII）下天然安全。
        var ggufPath = Path.Combine(GetAsciiEngineDir(), "moss-transcribe-q8_0.gguf");

        var vkExe = Path.Combine(engineDir, VulkanExeName);
        // 热词路径禁用 Vulkan：现只有 CPU 版热词 exe（见 HotwordsExeName 注释），
        // 否则回退分支会用无 --hotwords 补丁的原版 exe 重试 → 静默丢热词
        var useVk = hotwords == null && File.Exists(vkExe);
        var exePath = Path.Combine(engineDir, SelectExeName(useVk, hotwords != null));

        return await SttMutexGuard.WithMutexAsync(
            _osMutex, _instanceLock, () => _isRunning, v => _isRunning = v,
            async () =>
            {
                try
                {
                    return await RunChunkProcessAsync(exePath, ggufPath, chunkPath, hotwords, ct);
                }
                catch (Exception ex) when (useVk && ShouldFallbackToCpu(ex, ct))
                {
                    // Vulkan 起不来（驱动/DLL 问题）或非零退出 → 兜底回退 CPU 版
                    // （热词路径不走 Vulkan：基线 vk 版无 --hotwords，useVk 恒 false，此 catch 不触发）
                    Console.WriteLine($"[MossTranscribeEngine] Vulkan 版失败（{ex.Message}），回退 CPU 版重试");
                    return await RunChunkProcessAsync(Path.Combine(engineDir, CpuExeName), ggufPath, chunkPath, hotwords, ct);
                }
            });
    }

    /// <summary>拉起单块子进程并等待完成（保险丝 + 超时）。失败抛 InvalidOperationException。</summary>
    private static async Task<string> RunChunkProcessAsync(string exePath, string ggufPath, string chunkPath, string? hotwords, CancellationToken ct)
    {
                var preJobRam = SttEngineSelector.GetRamUsagePercent();
                var (preJobCommit, preJobCommitLimit) = SttEngineSelector.GetCommitInfo();
                var preJobAvail = SttEngineSelector.GetAvailableMemoryBytes();
                var preJobCheck = SttSafetyChecker.CheckPreJobResources(preJobRam, preJobCommit, preJobCommitLimit, preJobAvail);
                if (preJobCheck.ShouldFail)
                    throw new InvalidOperationException(preJobCheck.Message);

                var psi = new ProcessStartInfo
                {
                    FileName = exePath,
                    Arguments = BuildArguments(ggufPath, chunkPath, hotwords),
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    StandardOutputEncoding = Encoding.UTF8,
                    StandardErrorEncoding = Encoding.UTF8,
                    WorkingDirectory = Path.GetDirectoryName(exePath) ?? ".",
                };

                using var process = new Process { StartInfo = psi };
                var stdoutMs = new MemoryStream();
                var stderrSb = new StringBuilder();

                process.Start();
                var stdoutTask = process.StandardOutput.BaseStream.CopyToAsync(stdoutMs, ct);
                var stderrTask = Task.Run(async () =>
                {
                    string? line;
                    while ((line = await process.StandardError.ReadLineAsync(ct)) != null)
                        stderrSb.AppendLine(line);
                }, ct);

                // 运行时保险丝：RSS / 系统可用内存双检（5s 周期）
                _lastFuseTripped = false;
                using var fuseTimer = new System.Threading.Timer(_ =>
                {
                    try
                    {
                        if (process.HasExited) return;
                        process.Refresh();
                        if (process.PrivateMemorySize64 >= ProcessRssFuseBytes
                            || SttEngineSelector.GetAvailableMemoryBytes() < SttSafetyChecker.RuntimeMinAvailableBytes)
                        {
                            _lastFuseTripped = true;
                            KillProcessTree(process);
                        }
                    }
                    catch { /* 保险丝检查自身异常不致命 */ }
                }, null, TimeSpan.FromSeconds(5), TimeSpan.FromSeconds(5));

                using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                timeoutCts.CancelAfter(TimeSpan.FromMinutes(PerChunkTimeoutMin));

                try
                {
                    await Task.WhenAll(process.WaitForExitAsync(timeoutCts.Token), stdoutTask, stderrTask)
                        .ConfigureAwait(false);
                }
                catch (OperationCanceledException)
                {
                    KillProcessTree(process);
                    if (!ct.IsCancellationRequested)
                        throw new MossFuseException(
                            $"MOSS 单块推理超过 {PerChunkTimeoutMin} 分钟被保险丝终止（音频块 {ChunkSec}s 内）");
                    throw;
                }

                if (process.ExitCode != 0)
                {
                    // 运行时保险丝触发的 kill（非零退出且可用内存曾低于阈值）不进 CPU 回退——
                    // CPU 版内存只会更高，重跑属纯浪费；同样标记为熔断
                    if (_lastFuseTripped)
                        throw new MossFuseException(
                            $"moss-transcribe.exe 被资源保险丝终止后异常退出 (exit={process.ExitCode})");
                    throw new InvalidOperationException(
                        $"moss-transcribe.exe 失败 (exit={process.ExitCode}): {Truncate(stderrSb.ToString(), 500)}");
                }

                return Encoding.UTF8.GetString(stdoutMs.ToArray());
    }

    // ═══════════════════════════════════════════════════════════
    // 纯函数区（单元测试覆盖）
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 解析 moss-transcribe.cpp 的 --format json 输出（顶层段数组：
    /// [{id,start,end,speaker,text},…]；speaker 形如 "S01"）。
    /// offsetSec 为该块在原音频中的起始偏移，用于把块内相对时间换算为全局时间。
    /// </summary>
    public static List<SttSegment> ParseSegmentsJson(string json, double offsetSec)
    {
        using var doc = JsonDocument.Parse(json);
        var result = new List<SttSegment>();
        foreach (var el in doc.RootElement.EnumerateArray())
        {
            double start = el.TryGetProperty("start", out var s) && s.ValueKind == JsonValueKind.Number ? s.GetDouble() : 0;
            double end = el.TryGetProperty("end", out var e) && e.ValueKind == JsonValueKind.Number ? e.GetDouble() : start;
            var text = el.TryGetProperty("text", out var t) && t.ValueKind == JsonValueKind.String ? t.GetString() ?? "" : "";
            var speaker = ParseSpeaker(el);

            result.Add(new SttSegment
            {
                Speaker = speaker,
                OriginalSpeaker = speaker,
                Start = start + offsetSec,
                End = end + offsetSec,
                Text = text,
            });
        }
        return result;
    }

    /// <summary>"S01" → 1；异常形态回退 1（1 基，与 SpeakerLabelNormalizer 预期一致）。</summary>
    public static int ParseSpeaker(JsonElement el)
    {
        if (el.TryGetProperty("speaker", out var sp) && sp.ValueKind == JsonValueKind.String)
        {
            var raw = sp.GetString() ?? "";
            var digits = raw.TrimStart('S', 's');
            return int.TryParse(digits, out var n) && n >= 1 ? n : 1;
        }
        return 1;
    }

    // ═══════════════════════════════════════════════════════════
    // 基础设施
    // ═══════════════════════════════════════════════════════════

    /// <summary>向上查找 asr-engine/moss（bin→项目根→工作区根），与 SttModelManager 同套路。</summary>
    public static string? GetEngineDir()
    {
        if (_engineDirCache != null) return _engineDirCache;
        var dir = AppContext.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        for (var i = 0; i < 5 && dir != null; i++)
        {
            var candidate = Path.Combine(dir, "asr-engine", "moss");
            if (Directory.Exists(candidate)
                && File.Exists(Path.Combine(candidate, "moss-transcribe.exe")))
            {
                _engineDirCache = candidate;
                return candidate;
            }
            dir = Path.GetDirectoryName(dir);
        }
        return null;
    }

    private static string? _asciiDirCache;

    /// <summary>
    /// 引擎目录的 ASCII 安全视图：%TEMP% 下的 junction（mklink /J，免管理员）。
    /// 子进程参数里出现非 ASCII 路径时，窄字符 CRT 按代码页解析会得到乱码路径——
    /// GGUF 参数一律经此 junction 传给 moss-transcribe.exe。
    /// </summary>
    public static string GetAsciiEngineDir()
    {
        if (_asciiDirCache != null) return _asciiDirCache;
        var engineDir = GetEngineDir() ?? throw new InvalidOperationException("asr-engine/moss 未找到");

        var link = Path.Combine(Path.GetTempPath(), "moss-engine-ascii");
        try
        {
            if (!Directory.Exists(link))
            {
                var psi = new ProcessStartInfo("cmd", $"/c mklink /J \"{link}\" \"{engineDir}\"")
                {
                    UseShellExecute = false,
                    CreateNoWindow = true,
                };
                using var p = Process.Start(psi);
                p?.WaitForExit(5000);
            }
            // 验证 junction 确实能看到模型文件（junction 创建失败/目标移动时回退原路径）
            if (File.Exists(Path.Combine(link, "moss-transcribe-q8_0.gguf")))
            {
                _asciiDirCache = link;
                return link;
            }
        }
        catch { /* junction 失败回退原路径 */ }
        _asciiDirCache = engineDir;
        return engineDir;
    }

    private static async Task CutWavAsync(string src, double startSec, int lenSec, string dst, CancellationToken ct)
    {
        var psi = new ProcessStartInfo
        {
            FileName = "ffmpeg",
            Arguments = $"-y -v error -ss {startSec:0.###} -t {lenSec} -i \"{src}\" -ar 16000 -ac 1 -c:a pcm_s16le \"{dst}\"",
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardError = true,
        };
        using var p = Process.Start(psi) ?? throw new InvalidOperationException("ffmpeg 启动失败（切块）");
        var errTask = p.StandardError.ReadToEndAsync(ct);
        await p.WaitForExitAsync(ct);
        await errTask;
        if (p.ExitCode != 0)
            throw new InvalidOperationException($"ffmpeg 切块失败 (exit={p.ExitCode}): {Truncate(errTask.Result, 300)}");
        if (!File.Exists(dst))
            throw new InvalidOperationException("ffmpeg 切块未产出文件");
    }

    private static void KillProcessTree(Process process)
    {
        try
        {
            if (process.HasExited) return;
            using var killer = Process.Start(new ProcessStartInfo
            {
                FileName = "taskkill",
                Arguments = $"/F /T /PID {process.Id}",
                UseShellExecute = false,
                CreateNoWindow = true,
            });
            killer?.WaitForExit(5000);
        }
        catch { /* 尽力而为 */ }
    }

    /// <summary>
    /// 资源保险丝熔断（超时 / RSS / 可用内存 kill）。与普通启动失败区分：
    /// 熔断不进 Vulkan→CPU 回退（CPU 版内存只会更高，重跑纯浪费）。
    /// </summary>
    private sealed class MossFuseException(string message) : InvalidOperationException(message)
    {
    }

    /// <summary>
    /// 回退判定（回退过滤器的唯一真源，测试同源）：熔断异常、取消请求均不回退。
    /// </summary>
    internal static bool ShouldFallbackToCpu(Exception ex, CancellationToken ct) =>
        ex is not MossFuseException
        && ex is InvalidOperationException or System.ComponentModel.Win32Exception
        && !ct.IsCancellationRequested;

    internal static Exception CreateFuseExceptionForTest(string message) =>
        new MossFuseException(message);

    internal static bool IsFallbackExcluded(Exception ex) =>
        !ShouldFallbackToCpu(ex, CancellationToken.None);

    private static string Truncate(string s, int max) =>
        string.IsNullOrWhiteSpace(s) ? "" : (s.Length <= max ? s : s[..max] + "…");
}
