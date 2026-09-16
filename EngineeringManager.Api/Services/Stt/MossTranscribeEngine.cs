using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using EngineeringManager.Api.Services.Stt;

namespace EngineeringManager.Api.Services.Stt;

/// <summary>
/// MOSS-Transcribe-Diarize 0.9B 引擎（OpenMOSS，Apache-2.0，社区 ggml 移植 moss-transcribe.cpp）。
///
/// 与逐段转写引擎的本质差异：一步成段——单个模型在一次推理中
/// 同时输出文本、说话人标签（[S01]…，1 基）与时间戳，因此**跳过 sherpa 分离阶段**，
/// 也不存在两段式管线的重叠巨段缺陷（2026-09-09 实测 #24 重叠率 35.8%）。
///
/// 运行形态：asr-engine/moss/moss-transcribe.exe（CPU 基线）+ moss-transcribe-q8_0.gguf（941MB，
/// 官方参考实现逐字节一致）；目录下若另有 moss-transcribe-vk.exe（Vulkan 后端，RX 580 实测
/// 1.44×）则优先使用，Vulkan 失败自动回退 CPU。安全机制沿用现役引擎纪律：
/// - 单实例：与 ParaformerEngine 共享同一 OS Mutex，整机同时只跑一个重推理
/// - PreJob 资源门：启动子进程前实时检查 RAM/Commit/可用内存
/// - 运行时保险丝：进程 RSS ≥8GB 或系统可用内存低于 SttSafetyChecker 运行时阈值 → 杀进程树
/// - 取消/异常路径一律杀进程树（任务 23 僵尸进程事故教训）
///
/// 长音频：切块顺序推理，CHUNK_SEC(30s)，切口在 30s 整数倍 ±3s 内取能量最低点（对齐静音，
/// #28 真实录音实测 63 个切口中 53 个落在明确静音）。块间严格无缝不重叠——无需任何去重逻辑，
/// 不重复也不丢内容。曾试「尾部重叠 2s + 按段去重」，同一录音实测两种规则均失败后废弃：
/// 按 start 去重丢 10.1% 内容（90 段命中里 67 段跨越重叠区边界），按 end 去重相邻段时间重叠
/// 211.4s（占音频 11%）整句重复——同一段音频两块各转写一次，段边界对不齐时必然二选一出错。
/// 块长实测（2026-09-10）：同一 240s 音频 15/30/45/60/120s 块耗时 195/186/190/202/250.5s，
/// U 形曲线谷底在 30s，120s 比谷底多花 35%。
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

    /// <summary>切块长度（秒）。实测谷底（240s 音频 186s；120s 为 250.5s）。</summary>
    private const int ChunkSec = 30;

    /// <summary>切口静音搜索半径（秒）：切口左右各搜 ±3s 找能量最低点（实测 53/63 个切口有明确静音）。</summary>
    private const double SnapSearchSec = 3.0;

    /// <summary>能量帧长（秒），50ms。</summary>
    private const double SnapFrameSec = 0.05;

    /// <summary>相邻切口最小间距保护（秒，防抖动把块切碎）。</summary>
    private const double MinChunkSec = 10.0;

    /// <summary>单块推理超时（分钟）。块长 ≤33s（切口可向 ±3s 静音点偏移），CPU RTF ~1.8 最坏约 1 分钟，45 分钟为超保守余量（沿用原值）。</summary>
    private const int PerChunkTimeoutMin = 45;

    /// <summary>运行时进程 RSS 保险丝（字节）。q8_0 大上下文实测峰值 5.6GB（600s 块时代），8GB 熔断留余量。</summary>
    private const long ProcessRssFuseBytes = 8L * 1024 * 1024 * 1024;

    private const string MutexName = "Global\\EngineeringManagerSttEngine"; // 与 ParaformerEngine 共用：整机单重推理
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

    /// <summary>显式接口实现：4 参签名精确匹配 ISttEngine（可选参数不参与隐式实现匹配，
    /// 无 checkpoint 续跑，语义与历史一致）。</summary>
    Task<SttResult> ISttEngine.TranscribeAsync(string wavPath, string? context,
        IProgress<int>? progress, CancellationToken ct)
        => TranscribeAsync(wavPath, context, progress, ct, checkpointKey: null);

    public async Task<SttResult> TranscribeAsync(
        string wavPath,
        string? context,
        IProgress<int>? progress,
        CancellationToken ct,
        string? checkpointKey = null)
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

        // ≤CHUNK_SEC 单次直跑（不设 checkpoint）；超长切块（临时文件放 Path.GetTempPath 下的独立目录）
        var chunks = new List<(string path, double offsetSec)>();
        if (IsSingleChunk(durationSec))
        {
            chunks.Add((wavPath, 0));
        }
        else
        {
            // 断块续跑：plan 物化一次（与原来内联求值语义一致），指纹据此 + durationSec + hotwords 生成；
            // 音频换了/切法变了/热词变了 → 指纹对不上 → 旧账作废重跑（慢但不错）
            var plan = BuildChunkPlan(durationSec, nominal => SnapCutToSilence(wavPath, nominal));
            var checkpointDir = ResolveCheckpointDir(checkpointKey);
            string? fingerprint = null;
            if (checkpointDir != null)
            {
                try
                {
                    fingerprint = BuildCheckpointFingerprint(plan, durationSec, hotwords);
                }
                catch (Exception ex)
                {
                    // checkpoint 基建失败不阻断转写：降级为无 checkpoint 跑完本次
                    Console.Error.WriteLine($"[SttEngine] MOSS checkpoint 指纹生成失败，本次不续跑: {Common.Sanitize(ex.Message)}");
                    checkpointDir = null;
                }
            }
            var tempDir = Path.Combine(Path.GetTempPath(), $"stt_moss_{Guid.NewGuid():N}");
            Directory.CreateDirectory(tempDir);
            try
            {
                foreach (var (offset, len) in plan)
                {
                    ct.ThrowIfCancellationRequested();
                    var chunkPath = Path.Combine(tempDir, $"chunk_{(int)offset:000000}.wav");
                    await CutWavAsync(wavPath, offset, len, chunkPath, ct);
                    chunks.Add((chunkPath, offset));
                }

                return await RunChunksCoreAsync(chunks, durationSec, hotwords, progress, ct,
                    (chunk, index, token) => RunSingleAsync(chunk.path, hotwords, token),
                    checkpointDir, fingerprint);
            }
            finally
            {
                try { Directory.Delete(tempDir, true); } catch (Exception ex) { Console.Error.WriteLine($"[SttEngine] MOSS 临时目录清理失败（不致命）: {Common.Sanitize(ex.Message)}"); }
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
        return await RunChunksCoreAsync(chunks, durationSec, hotwords, progress, ct,
            (chunk, index, token) => RunSingleAsync(chunk.path, hotwords, token),
            checkpointDir: null, fingerprint: null);
    }

    /// <summary>
    /// 断块续跑核心：逐块循环（RunChunksAsync 的生产入口 + 单测 stub 入口共用）。
    /// checkpointDir == null → 与历史行为一致，每块都跑 runner；非空时：
    /// - 启动先对 plan 指纹：对不上（音频换了/切法变了/热词变了）→ 清目录重跑（慢但不错）；
    /// - 有效落盘块（非空 + ParseSegmentsJson 能解析，空数组也算有效）→ 跳过 runner；
    /// - 无效落盘（解析抛错/空文件）→ 删文件重跑该块；
    /// - 全部块合并成功 → 删目录；失败保留；取消原样抛出并删目录（用户主动取消=不要续跑）。
    /// runner 委托接收 (块, 块下标, token)，返回子进程 stdout 原文。
    /// </summary>
    internal async Task<SttResult> RunChunksCoreAsync(
        List<(string path, double offsetSec)> chunks,
        double durationSec,
        string? hotwords,
        IProgress<int>? progress,
        CancellationToken ct,
        Func<(string path, double offsetSec), int, CancellationToken, Task<string>> runner,
        string? checkpointDir,
        string? fingerprint)
    {
        var sw = Stopwatch.StartNew();
        var allSegments = new List<SttSegment>();
        var perChunkJson = new string?[chunks.Count];

        // checkpoint 目录首次落盘时写 plan 指纹；重试认旧账的前置对账
        var doneCount = 0;
        if (checkpointDir != null)
        {
            AlignCheckpointDir(checkpointDir, fingerprint);
            for (var i = 0; i < chunks.Count; i++)
            {
                if (TryReadCheckpoint(checkpointDir, chunks[i].offsetSec, i, out var cached))
                {
                    perChunkJson[i] = cached;
                    doneCount++;
                }
            }
            if (doneCount > 0)
                progress?.Report(doneCount * 100 / chunks.Count);
        }

        try
        {
            for (var i = 0; i < chunks.Count; i++)
            {
                if (perChunkJson[i] != null)
                    continue; // 认旧账：跳过已完成块
                ct.ThrowIfCancellationRequested();
                var (path, offset) = chunks[i];
                string json;
                try
                {
                    json = await runner((path, offset), i, ct);
                }
                catch (MossFuseException ex)
                {
                    // 保险丝终止：失败信息追加已留存块数（供重试接着跑提示），类型必须保持
                    // MossFuseException（ShouldFallbackToCpu 靠它排除 CPU 回退，类型变了会误重跑）
                    throw new MossFuseException(
                        $"{ex.Message}；已留存 {CountCheckpoints(checkpointDir, chunks)}/{chunks.Count} 块，点重试可接着跑");
                }
                perChunkJson[i] = json;
                if (checkpointDir != null)
                    WriteCheckpoint(checkpointDir, fingerprint, offset, i, json);
                progress?.Report(++doneCount * 100 / chunks.Count);
            }
        }
        catch (OperationCanceledException)
        {
            // 用户主动取消=不要续跑：删目录，原样抛出（不追加提示语）
            DeleteCheckpointDir(checkpointDir);
            throw;
        }
        catch
        {
            // 失败（含保险丝 kill）保留 checkpoint 供重试认旧账
            throw;
        }

        // 切口对齐静音后块间严格无缝不重叠：全部段直接合并，无需任何去重。
        // offset 为该块在原音频中的起点，ParseSegmentsJson 已据此换算为全局时间。
        // 合并时顺带校验内存里的 json（无效则抛，保留 checkpoint 排查；走不到此处的 fuse 已在块循环内追加提示）
        foreach (var (json, idx) in perChunkJson.Select((j, idx) => (j, idx)))
            foreach (var seg in ParseSegmentsJson(json!, chunks[idx].offsetSec))
                allSegments.Add(seg);
        progress?.Report(100);

        DeleteCheckpointDir(checkpointDir); // 成功后清理
        return new SttResult
        {
            Text = string.Join("", allSegments.Select(s => s.Text)),
            Segments = allSegments,
            DurationSec = durationSec,
            ElapsedSec = sw.Elapsed.TotalSeconds,
            Engine = EngineId,
        };
    }

    // ═══════════════════════════════════════════════════════════
    // checkpoint 存取（断块续跑基建）
    // ═══════════════════════════════════════════════════════════

    /// <summary>checkpoint 目录：%TEMP%/stt_moss_ckpt_{key}，key 仅允许字母数字/_/-（其余过滤掉，为空则本次不设 checkpoint）。</summary>
    internal static string? ResolveCheckpointDir(string? checkpointKey)
    {
        if (string.IsNullOrEmpty(checkpointKey)) return null;
        var safe = new string(checkpointKey.Where(c => char.IsLetterOrDigit(c) || c == '_' || c == '-').ToArray());
        if (string.IsNullOrEmpty(safe)) return null;
        return Path.Combine(Path.GetTempPath(), $"stt_moss_ckpt_{safe}");
    }

    /// <summary>plan 指纹 = 各块(offset,len)+durationSec+hotwords。热词 null 与空串视为同一指纹（归一化后都走无热词路径）。</summary>
    internal static string BuildCheckpointFingerprint(
        List<(double offsetSec, double lenSec)> plan, double durationSec, string? hotwords)
    {
        var sb = new StringBuilder();
        foreach (var (offset, len) in plan)
            sb.Append($"{offset:0.###},{len:0.###};");
        sb.Append($"|dur={durationSec:0.###}|hw={hotwords ?? ""}");
        return sb.ToString();
    }

    internal static string CheckpointFilePath(string dir, double offsetSec, int index) =>
        Path.Combine(dir, $"chunk_{(int)offsetSec:000000}.json");

    private const string FingerprintFileName = "plan.json";

    /// <summary>
    /// 对账：目录不存在/指纹一致 → 建目录并确保指纹文件存在；指纹不一致（音频换了/切法变了/热词变了）
    /// → 清目录重跑。checkpoint 基建异常不阻断转写：调用方在 TranscribeAsync 侧 try 兜底，
    /// 此处的 IO 一律吞掉落日志（本次降级为无 checkpoint）。
    /// </summary>
    private static void AlignCheckpointDir(string checkpointDir, string? fingerprint)
    {
        try
        {
            if (!Directory.Exists(checkpointDir))
            {
                Directory.CreateDirectory(checkpointDir);
                if (fingerprint != null)
                    File.WriteAllText(Path.Combine(checkpointDir, FingerprintFileName), fingerprint);
                return;
            }
            var fpPath = Path.Combine(checkpointDir, FingerprintFileName);
            var existing = File.Exists(fpPath) ? File.ReadAllText(fpPath) : null;
            if (fingerprint != null && existing == fingerprint)
                return; // 认旧账
            foreach (var f in Directory.GetFiles(checkpointDir))
            {
                try { File.Delete(f); } catch { /* 逐个尽力删 */ }
            }
            if (fingerprint != null)
                File.WriteAllText(fpPath, fingerprint);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[SttEngine] MOSS checkpoint 对账失败（本次不续跑）: {Common.Sanitize(ex.Message)}");
        }
    }

    /// <summary>读盘有效性：文件非空且 ParseSegmentsJson 能解析（空数组也算有效，静音块合法）；无效（解析抛错/空文件）→ 删文件重跑该块。</summary>
    private static bool TryReadCheckpoint(string dir, double offsetSec, int index, out string? json)
    {
        json = null;
        try
        {
            var path = CheckpointFilePath(dir, offsetSec, index);
            if (!File.Exists(path) || new FileInfo(path).Length == 0)
            {
                try { if (File.Exists(path)) File.Delete(path); } catch { }
                return false;
            }
            var text = File.ReadAllText(path);
            if (string.IsNullOrWhiteSpace(text))
            {
                try { File.Delete(path); } catch { }
                return false;
            }
            ParseSegmentsJson(text, offsetSec); // 仅校验可解析性，合并时再按全局 offset 正式解析
            json = text;
            return true;
        }
        catch (Exception)
        {
            try { File.Delete(CheckpointFilePath(dir, offsetSec, index)); } catch { }
            return false;
        }
    }

    private static void WriteCheckpoint(string dir, string? fingerprint, double offsetSec, int index, string json)
    {
        try
        {
            if (!Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
                if (fingerprint != null)
                    File.WriteAllText(Path.Combine(dir, FingerprintFileName), fingerprint);
            }
            File.WriteAllText(CheckpointFilePath(dir, offsetSec, index), json);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[SttEngine] MOSS checkpoint 落盘失败（不致命，本块结果仍在内存）: {Common.Sanitize(ex.Message)}");
        }
    }

    /// <summary>与当前 plan 对得上的有效 checkpoint 数（fuse 提示语的 done；目录不存在/指纹不对 → 0）。</summary>
    private static int CountCheckpoints(string? checkpointDir, List<(string path, double offsetSec)> chunks)
    {
        if (checkpointDir == null || !Directory.Exists(checkpointDir)) return 0;
        var n = 0;
        for (var i = 0; i < chunks.Count; i++)
        {
            if (TryReadCheckpoint(checkpointDir, chunks[i].offsetSec, i, out _))
                n++;
        }
        return n;
    }

    private static void DeleteCheckpointDir(string? checkpointDir)
    {
        if (checkpointDir == null) return;
        try { if (Directory.Exists(checkpointDir)) Directory.Delete(checkpointDir, true); }
        catch (Exception ex) { Console.Error.WriteLine($"[SttEngine] MOSS checkpoint 清理失败（不致命）: {Common.Sanitize(ex.Message)}"); }
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
                    Console.Error.WriteLine($"[SttEngine] MOSS Vulkan 失败，回退 CPU 版: {Common.Sanitize(ex.Message)}");
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
                    catch (Exception ex) { Console.Error.WriteLine($"[SttEngine] MOSS 保险丝检查自身异常（不致命）: {Common.Sanitize(ex.Message)}"); }
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
                            $"MOSS 单块推理超过 {PerChunkTimeoutMin} 分钟被保险丝终止（音频块 {ChunkSec + 3}s 内）");
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

    /// <summary>是否单块直跑（不切块，原始 wav 整段直传）：时长 ≤ ChunkSec+1。与旧版阈值语义一致，仅数字随块长变小。</summary>
    public static bool IsSingleChunk(double durationSec) => durationSec <= ChunkSec + 1;

    /// <summary>
    /// 切块计划纯函数（单元测试覆盖）。块 i 覆盖 [cut_i, cut_{i+1})：首块起点 0、末块收在
    /// durationSec，并集恰好 [0, dur) 且严格互不重叠——合并时无需任何去重。
    /// 切口不钉死在 30s 整数倍：snapFn(nominal) 在 nominal ±SnapSearchSec 内返回静音点
    /// （无有效静音点时返回 nominal 本身），结果 clamp 进 [cut + MinChunkSec, nominal + SnapSearchSec]。
    /// 尾块保护（保证每块长度 ∈ [MinChunkSec, ChunkSec + SnapSearchSec]）：
    /// 1) 剩余音频已能装进一个合法块（dur - cut ≤ ChunkSec + SnapSearchSec）时停止切割；
    /// 2) 候选切点会让末尾剩余 &lt; MinChunkSec 时，把切点拉回 dur - MinChunkSec（必落在合法窗口内）。
    /// snapFn 可注入：单测注入恒等函数时退化为严格 30s 等分。
    /// </summary>
    public static List<(double offsetSec, double lenSec)> BuildChunkPlan(double durationSec, Func<double, double> snapFn)
    {
        var plan = new List<(double offsetSec, double lenSec)>();
        var cut = 0.0;
        while (cut + ChunkSec < durationSec)
        {
            if (durationSec - cut <= ChunkSec + SnapSearchSec)
                break; // 剩余 (30, 33]s：整段作末块，再切必产生 < MinChunkSec 的碎尾
            var nominal = cut + ChunkSec;
            var next = Math.Clamp(snapFn(nominal), cut + MinChunkSec, nominal + SnapSearchSec);
            if (next >= durationSec)
                break; // 切点触到音频末尾：当前剩余整段作末块（此时剩余必 ∈ (30, 33]s）
            if (durationSec - next < MinChunkSec)
                next = Math.Clamp(durationSec - MinChunkSec, cut + MinChunkSec, nominal + SnapSearchSec);
            plan.Add((cut, next - cut));
            cut = next;
        }
        plan.Add((cut, durationSec - cut));
        return plan;
    }

    /// <summary>
    /// 静音切口纯函数（单元测试覆盖）：在 [nominalOffsetInWindow - searchSec, +searchSec]
    /// （越界裁剪到样本实际范围）内按 frameSec 分帧，返回 RMS 最小帧的中心时间——窗口内
    /// 时间轴（秒），调用方需加上窗口在原音频中的起点。多帧同为最低能量时取中位帧
    /// （长停顿的中点，切口离两侧词句都最远）。回退：无样本/裁剪后不足一帧/全程等幅
    /// （无任何能量差）→ 返回 nominalOffsetInWindow。不做平滑/阈值判定——只取「最低能量点」。
    /// </summary>
    public static double FindSilenceCut(
        ReadOnlySpan<short> samples, int sampleRate, double nominalOffsetInWindow, double searchSec, double frameSec)
    {
        if (samples.IsEmpty || sampleRate <= 0 || frameSec <= 0)
            return nominalOffsetInWindow;

        var totalSec = samples.Length / (double)sampleRate;
        var fromSample = (int)Math.Round(Math.Max(0, nominalOffsetInWindow - searchSec) * sampleRate);
        var toSample = (int)Math.Round(Math.Min(totalSec, nominalOffsetInWindow + searchSec) * sampleRate);
        var frameLen = Math.Max(1, (int)Math.Round(frameSec * sampleRate));
        var frameCount = (toSample - fromSample) / frameLen; // 整数除法：只算完整落进搜索窗的帧

        double minRms = double.PositiveInfinity, maxRms = double.NegativeInfinity;
        var frames = new List<(int start, double rms)>();
        for (var k = 0; k < frameCount; k++)
        {
            var start = fromSample + k * frameLen;
            if (start + frameLen > samples.Length) break;
            double sumSqr = 0;
            for (var i = start; i < start + frameLen; i++)
                sumSqr += (double)samples[i] * samples[i];
            var rms = Math.Sqrt(sumSqr / frameLen);
            frames.Add((start, rms));
            if (rms < minRms) minRms = rms;
            if (rms > maxRms) maxRms = rms;
        }
        if (frames.Count == 0 || minRms == maxRms)
            return nominalOffsetInWindow; // 裁剪后无帧可算 / 全程等幅无能量差 → 回退 nominal

        var minFrames = frames.Where(f => f.rms == minRms).ToList();
        var mid = minFrames[minFrames.Count / 2];
        return (mid.start + frameLen / 2.0) / sampleRate;
    }

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
        catch (Exception ex) { Console.Error.WriteLine($"[SttEngine] MOSS %TEMP% junction 创建失败，回退原路径: {Common.Sanitize(ex.Message)}"); }
        _asciiDirCache = engineDir;
        return engineDir;
    }

    /// <summary>
    /// 生产静音切口函数：从预处理 WAV（AudioPreprocessor 保证 16kHz 单声道 s16）seek 只读
    /// nominal ±SnapSearchSec 的样本窗口（不整文件读入内存，源文件可达 130MB），
    /// 交给 FindSilenceCut 找最低能量点。WAV 解析/读取失败一律回退 nominal——
    /// 静音对齐是尽力而为，绝不阻断转写（BuildChunkPlan 会把结果 clamp 进合法窗口）。
    /// internal 仅供单测直测生产接线（窗口 seek 回归）。
    /// </summary>
    internal static double SnapCutToSilence(string wavPath, double nominalSec)
    {
        try
        {
            using var fs = new FileStream(wavPath, FileMode.Open, FileAccess.Read, FileShare.Read);
            var (sampleRate, dataOffset) = ReadWavHeader(fs);
            var windowStartSec = Math.Max(0, nominalSec - SnapSearchSec);
            var startByte = dataOffset + (long)Math.Round(windowStartSec * sampleRate) * sizeof(short);
            var wantBytes = (long)Math.Ceiling(2 * SnapSearchSec * sampleRate) * sizeof(short);
            var availBytes = Math.Max(0, fs.Length - startByte);
            if (availBytes <= 0) return nominalSec;
            var buf = new byte[(int)Math.Min(wantBytes, availBytes)];
            // 关键：ReadWavHeader 返回时流停在 dataOffset（文件开头），必须先 seek 到窗口起点，
            // 否则每次读到的都是文件头 6 秒，切口与真实静音点毫无关系（2026-09-10 生产接线缺陷）
            fs.Seek(startByte, SeekOrigin.Begin);
            var got = 0;
            while (got < buf.Length)
            {
                var n = fs.Read(buf, got, buf.Length - got);
                if (n <= 0) break;
                got += n;
            }
            var samples = MemoryMarshal.Cast<byte, short>(buf.AsSpan(0, got));
            var snapped = FindSilenceCut(samples, sampleRate, nominalSec - windowStartSec, SnapSearchSec, SnapFrameSec);
            return windowStartSec + snapped;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[SttEngine] MOSS 静音对齐读 WAV 失败，切回名义切点: {Common.Sanitize(ex.Message)}");
            return nominalSec; // WAV 异常/不可读：放弃静音对齐，切回 nominal
        }
    }

    /// <summary>
    /// 解析 WAV 头（RIFF/PCM）：定位 data chunk 起始偏移并取采样率。
    /// 仅接受 16bit 单声道 PCM（AudioPreprocessor 预处理保证）；其它格式抛异常，
    /// 由调用方回退 nominal，绝不阻断转写。
    /// </summary>
    private static (int sampleRate, long dataOffset) ReadWavHeader(FileStream fs)
    {
        using var br = new BinaryReader(fs, Encoding.UTF8, leaveOpen: true);
        if (br.ReadInt32() != 0x46464952) throw new InvalidOperationException("非 RIFF 文件"); // "RIFF"
        _ = br.ReadInt32();                                                   // RIFF size
        if (br.ReadInt32() != 0x45564157) throw new InvalidOperationException("非 WAV 文件"); // "WAVE"
        var sampleRate = 0;
        long dataOffset = -1;
        while (dataOffset < 0 && br.BaseStream.Position + 8 <= br.BaseStream.Length)
        {
            var chunkId = br.ReadInt32();
            var chunkSize = (long)br.ReadUInt32();
            if (chunkId == 0x20746D66) // "fmt "
            {
                if (chunkSize < 16) throw new InvalidOperationException("fmt chunk 过短");
                var fmt = br.ReadBytes(16);
                var audioFormat = BitConverter.ToInt16(fmt, 0);
                var channels = BitConverter.ToInt16(fmt, 2);
                sampleRate = BitConverter.ToInt32(fmt, 4);
                var bitsPerSample = BitConverter.ToInt16(fmt, 14);
                if (audioFormat != 1 || channels != 1 || bitsPerSample != 16)
                    throw new InvalidOperationException(
                        $"仅支持 16bit 单声道 PCM（实际 format={audioFormat}, ch={channels}, bits={bitsPerSample}）");
                br.BaseStream.Position += chunkSize - 16; // 跳过 fmt 尾部（cbSize/扩展字段）
            }
            else if (chunkId == 0x61746164) // "data"
            {
                dataOffset = br.BaseStream.Position;
            }
            else
            {
                br.BaseStream.Position += chunkSize + (chunkSize & 1); // 未知 chunk 跳过（奇数尺寸补 1 字节对齐）
            }
        }
        if (sampleRate <= 0 || dataOffset < 0)
            throw new InvalidOperationException("WAV 头缺少 fmt/data chunk");
        return (sampleRate, dataOffset);
    }

    private static async Task CutWavAsync(string src, double startSec, double lenSec, string dst, CancellationToken ct)
    {
        var psi = new ProcessStartInfo
        {
            FileName = "ffmpeg",
            Arguments = $"-y -v error -ss {startSec:0.###} -t {lenSec:0.###} -i \"{src}\" -ar 16000 -ac 1 -c:a pcm_s16le \"{dst}\"",
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
        catch (Exception ex) { Console.Error.WriteLine($"[SttEngine] MOSS 杀进程失败（尽力而为）: {Common.Sanitize(ex.Message)}"); }
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
