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
/// 运行形态：asr-engine/moss/moss-transcribe.exe + moss-transcribe-q8_0.gguf（941MB，
/// 官方参考实现逐字节一致）。安全机制沿用现役引擎纪律：
/// - 单实例：与 LlamaCppGgufEngine 共享同一 OS Mutex，整机同时只跑一个重推理
/// - PreJob 资源门：启动子进程前实时检查 RAM/Commit/可用内存
/// - 运行时保险丝：进程 RSS ≥8GB 或系统可用内存低于 SttSafetyChecker 运行时阈值 → 杀进程树
/// - 取消/异常路径一律杀进程树（任务 23 僵尸进程事故教训）
///
/// 长音频：解码器上下文 40960 token，单次最多 ~25 分钟音频；超过 CHUNK_SEC(600s)
/// 即切块顺序推理（600s 块在 16GB 机实测峰值 RSS 5.6GB）。**跨块说话人编号暂不保证
/// 全局一致**（[S01] 按块内出现顺序分配）——跨块对齐需声纹嵌入，留待后续。
///
/// 热词：cpp CLI 暂无 --prompt 参数，context 参数目前被忽略（记录日志）。
/// 2026-09-09 方言试金石（南充/富顺/自贡）：MOSS 无热词全对，Qwen3 把自贡写成「资贡」。
/// </summary>
public class MossTranscribeEngine : ISttEngine
{
    public const string EngineId = "moss-transcribe-0.9b";

    /// <summary>切块长度（秒）。600s 块 ≈ 15k 音频 token + ~8k 输出，余量充足且峰值 RSS 实测 5.6GB。</summary>
    private const int ChunkSec = 600;

    /// <summary>单块推理超时（分钟）。CPU RTF 实测 ~1.75，600s 块最坏 ~20 分钟，留 45 分钟余量。</summary>
    private const int PerChunkTimeoutMin = 45;

    /// <summary>运行时进程 RSS 保险丝（字节）。q8_0 + 600s 上下文实测峰值 5.6GB，8GB 熔断留余量。</summary>
    private const long ProcessRssFuseBytes = 8L * 1024 * 1024 * 1024;

    private const string MutexName = "Global\\EngineeringManagerSttEngine"; // 与 LlamaCppGgufEngine 共用：整机单重推理
    private static readonly Mutex _osMutex = new(false, MutexName);
    private static readonly object _instanceLock = new();
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

        if (!string.IsNullOrWhiteSpace(context))
            Console.WriteLine("[MossTranscribeEngine] 热词提示暂不支持（cpp CLI 无 --prompt 参数），本次忽略");

        var sw = Stopwatch.StartNew();
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

                var all = await RunChunksAsync(chunks, durationSec, progress, ct);
                return all;
            }
            finally
            {
                try { Directory.Delete(tempDir, true); } catch { /* 临时目录清理失败不致命 */ }
            }
        }

        return await RunChunksAsync(chunks, durationSec, progress, ct);
    }

    private async Task<SttResult> RunChunksAsync(
        List<(string path, double offsetSec)> chunks,
        double durationSec,
        IProgress<int>? progress,
        CancellationToken ct)
    {
        var sw = Stopwatch.StartNew();
        var allSegments = new List<SttSegment>();

        for (var i = 0; i < chunks.Count; i++)
        {
            ct.ThrowIfCancellationRequested();
            var (path, offset) = chunks[i];
            var json = await RunSingleAsync(path, ct);
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

    /// <summary>单块推理：OS Mutex + PreJob 门 + 运行时保险丝（共享单实例纪律）。</summary>
    private async Task<string> RunSingleAsync(string chunkPath, CancellationToken ct)
    {
        var engineDir = GetEngineDir() ?? throw new InvalidOperationException("asr-engine/moss 未找到");
        var exePath = Path.Combine(engineDir, "moss-transcribe.exe");
        var ggufPath = Path.Combine(engineDir, "moss-transcribe-q8_0.gguf");

        return await SttMutexGuard.WithMutexAsync(
            _osMutex, _instanceLock, () => _isRunning, v => _isRunning = v,
            async () =>
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
                    Arguments = $"transcribe \"{ggufPath}\" \"{chunkPath}\" --format json",
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    StandardOutputEncoding = Encoding.UTF8,
                    StandardErrorEncoding = Encoding.UTF8,
                    WorkingDirectory = engineDir,
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
                using var fuseTimer = new System.Threading.Timer(_ =>
                {
                    try
                    {
                        if (process.HasExited) return;
                        process.Refresh();
                        if (process.PrivateMemorySize64 >= ProcessRssFuseBytes
                            || SttEngineSelector.GetAvailableMemoryBytes() < SttSafetyChecker.RuntimeMinAvailableBytes)
                        {
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
                        throw new InvalidOperationException(
                            $"MOSS 单块推理超过 {PerChunkTimeoutMin} 分钟被保险丝终止（音频块 {ChunkSec}s 内）");
                    throw;
                }

                if (process.ExitCode != 0)
                    throw new InvalidOperationException(
                        $"moss-transcribe.exe 失败 (exit={process.ExitCode}): {Truncate(stderrSb.ToString(), 500)}");

                return Encoding.UTF8.GetString(stdoutMs.ToArray());
            });
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

    private static string Truncate(string s, int max) =>
        string.IsNullOrWhiteSpace(s) ? "" : (s.Length <= max ? s : s[..max] + "…");
}
