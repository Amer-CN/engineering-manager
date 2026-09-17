using System.Collections.Concurrent;
using System.Diagnostics;
using System.Net;
using System.Net.Http.Headers;
using System.Threading;

namespace EngineeringManager.Api.Services.Stt;

/// <summary>
/// STT 模型管理器：检测本地模型是否存在、缺失时按镜像下载
/// ASR 模型直接复用项目根目录 asr-engine/（已跑通的 1.7B GGUF）
/// 说话人分离模型：sherpa-onnx-pyannote-segmentation-3-0 + 3dspeaker_speech_ember
/// M2: 文本嵌入模型 bge-small-zh-v1.5 ONNX
/// </summary>
public class SttModelManager
{
    // 防止并发重复下载
    private static readonly SemaphoreSlim EmbeddingDownloadLock = new(1, 1);

    // 现役两引擎的模型文件名（引擎目录相对 asr-engine/；与各引擎 IsAvailableAsync 同口径）——
    // 可用性检查与下载清单共用同一组字面量，避免两处漂移
    private const string MossDir = "moss";
    private const string MossExeFileName = "moss-transcribe.exe";
    private const string MossGgufFileName = "moss-transcribe-q8_0.gguf";
    private const string ParaformerDir = "paraformer";
    private const string ParaformerModelFileName = "model.int8.onnx";
    private const string ParaformerTokensFileName = "tokens.txt";

    // 说话人分离模型
    public const string SegmentationModelDir = "diarization/sherpa-onnx-pyannote-segmentation-3-0";
    public const string SegmentationModelFile = "diarization/sherpa-onnx-pyannote-segmentation-3-0/model.onnx";
    public const string EmbeddingModelFile = "diarization/3dspeaker_speech_campplus_sv_zh-cn_16k-common.onnx";

    // M2: 文本嵌入模型（bge-small-zh-v1.5 ONNX）
    public const string TextEmbeddingModelFile = "embedding/bge-small-zh-v1.5.onnx";
    public const string TextEmbeddingVocabFile = "embedding/vocab.txt";

    // 可测试注入：模型目录 provider（测试时替换为临时目录）
    private static Func<string>? _engineDirProvider;
    /// <summary>注入引擎目录 provider（仅测试用）</summary>
    public static void SetEngineDirProvider(Func<string>? provider) => _engineDirProvider = provider;

    // 可测试注入：HTTP 下载器 delegate（测试时替换为本地拷贝）
    private static Func<string, string, CancellationToken, Task>? _downloadDelegate;
    /// <summary>注入下载器 delegate（仅测试用）</summary>
    public static void SetDownloadDelegate(Func<string, string, CancellationToken, Task>? downloader) => _downloadDelegate = downloader;

    /// <summary>
    /// 现役引擎的必需文件（相对 asr-engine/）：MOSS（exe + gguf）、Paraformer（onnx + tokens）。
    /// 全部为纯 CPU 引擎，不需要独显 / Vulkan / 显存。
    /// </summary>
    private static readonly string[][] EngineRequiredFiles = new[]
    {
        new[] { $"{MossDir}/{MossExeFileName}", $"{MossDir}/{MossGgufFileName}" },
        new[] { $"{ParaformerDir}/{ParaformerModelFileName}", $"{ParaformerDir}/{ParaformerTokensFileName}" },
    };

    /// <summary>
    /// 候选引擎根目录（asr-engine/）：与 GetEngineDir 同查找顺序（项目根目录向上查找 → 数据存储路径），
    /// 但不以 transcribe.exe 作为有效性标记（Qwen 已退役，该文件不再存在）——只看目录是否存在。
    /// </summary>
    private static IEnumerable<string> GetEngineDirCandidates()
    {
        if (_engineDirProvider != null)
        {
            yield return _engineDirProvider();
            yield break;
        }

        var dir = AppContext.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        for (var i = 0; i < 8 && dir != null; i++)
        {
            var candidate = Path.Combine(dir, "asr-engine");
            if (Directory.Exists(candidate)) yield return candidate;
            dir = Path.GetDirectoryName(dir);
        }

        var dataCandidate = Path.Combine(ApiConfig.ResolveDataPath(), "asr-engine");
        if (Directory.Exists(dataCandidate)) yield return dataCandidate;
    }

    /// <summary>某引擎的必需文件是否齐备（在所有候选根目录里找，同步文件存在性判断）。</summary>
    private static bool EngineFilesPresent(int engineIndex) =>
        GetEngineDirCandidates().Any(dir => EngineRequiredFiles[engineIndex].All(
            f => File.Exists(Path.Combine(dir, f.Replace('/', Path.DirectorySeparatorChar)))));

    /// <summary>任一引擎的模型文件齐备（同步文件存在性判断，供 CanUseLocalStt 使用）。</summary>
    public static bool AnyEngineModelAvailable() =>
        Enumerable.Range(0, EngineRequiredFiles.Length).Any(EngineFilesPresent);

    /// <summary>各引擎的模型文件就绪状态（只陈述事实，供状态接口展示）。</summary>
    public static (bool mossReady, bool paraformerReady) GetEngineModelReadiness()
        => (EngineFilesPresent(0), EngineFilesPresent(1)); // 0 = MOSS，1 = Paraformer（见 EngineRequiredFiles 顺序）

    // 下载计数器（测试用：验证并发只下载 1 次）
    private static int _downloadCount;
    /// <summary>下载调用次数（测试用）</summary>
    public static int DownloadCount => _downloadCount;

    // 下载镜像前缀
    private const string GithubMirror = "https://ghfast.top/";
    private const string SegmentationModelUrl =
        "https://github.com/k2-fsa/sherpa-onnx/releases/download/speaker-segmentation-models/sherpa-onnx-pyannote-segmentation-3-0.tar.bz2";
    private const string EmbeddingModelUrl =
        "https://github.com/k2-fsa/sherpa-onnx/releases/download/speaker-recongition-models/3dspeaker_speech_campplus_sv_zh-cn_16k-common.onnx";

    /// <summary>
    /// 获取 ASR 引擎根目录（asr-engine/）
    /// 查找顺序：项目根目录 → 数据存储路径
    /// </summary>
    public static string GetEngineDir()
    {
        // 1. 项目根目录（开发环境 + 本机测试）
        var dir = AppContext.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        // 向上查找 asr-engine 目录（bin/Debug/net8.0-windows → 项目根 → 工作区根）
        for (int i = 0; i < 8; i++)
        {
            var candidate = Path.Combine(dir, "asr-engine");
            if (Directory.Exists(candidate) && IsEngineContentPresent(candidate))
            {
                return candidate;
            }
            var parent = Path.GetDirectoryName(dir);
            if (parent == null || parent == dir) break;
            dir = parent;
        }

        // 2. 数据存储路径（生产环境 - 首次启动下载后存放位置）
        var dataPath = ApiConfig.ResolveDataPath();
        var dataCandidate = Path.Combine(dataPath, "asr-engine");
        if (Directory.Exists(dataCandidate) && IsEngineContentPresent(dataCandidate))
        {
            return dataCandidate;
        }

        // 3. 默认返回项目根目录路径（即使不存在，让调用方知道预期位置）
        return Path.Combine(dir, "asr-engine");
    }

    /// <summary>
    /// 引擎目录内容探针：任一现役引擎内容（moss/、paraformer/、diarization/ 任一子目录存在）
    /// 即认定，不再以已删除的 transcribe.exe 为唯一哨兵——否则该文件一删，
    /// 状态查询与分离模型路径解析会一起落空（2026-09-17 实测：模型全在但全报缺失）。
    /// transcribe.exe 保留在认可之列以兼容旧布局。
    /// </summary>
    private static bool IsEngineContentPresent(string candidate) =>
        File.Exists(Path.Combine(candidate, "transcribe.exe"))
        || Directory.Exists(Path.Combine(candidate, "moss"))
        || Directory.Exists(Path.Combine(candidate, "paraformer"))
        || Directory.Exists(Path.Combine(candidate, "diarization"));

    /// <summary>
    /// STT 可用的模型文件是否就绪：现役引擎（MOSS / Paraformer，均纯 CPU）任一齐备即真。
    /// </summary>
    public static bool IsAsrModelAvailable() => SttEngineSelector.AnyEngineReady();

    /// <summary>说话人分离模型是否齐全</summary>
    public static bool IsDiarizationModelAvailable()
    {
        var dir = GetEngineDir();
        return File.Exists(Path.Combine(dir, SegmentationModelFile))
            && File.Exists(Path.Combine(dir, EmbeddingModelFile));
    }

    /// <summary>获取说话人分离模型路径（前提：IsDiarizationModelAvailable() == true）</summary>
    public static (string segmentationModel, string embeddingModel) GetDiarizationModelPaths()
    {
        var dir = GetEngineDir();
        // 用 Path.GetFullPath 规范化路径分隔符，避免 / \ 混用导致 C++ 库找不到文件
        var segPath = Path.GetFullPath(Path.Combine(dir, SegmentationModelFile));
        var embPath = Path.GetFullPath(Path.Combine(dir, EmbeddingModelFile));
        return (segPath, embPath);
    }

    // ═══════════════════════════════════════════════════════════
    // M2: 文本嵌入模型 (bge-small-zh-v1.5 ONNX)
    // ═══════════════════════════════════════════════════════════

    private const string HfMirror = "https://hf-mirror.com";
    private const string TextEmbeddingModelUrl = "https://hf-mirror.com/Xenova/bge-small-zh-v1.5/resolve/main/onnx/model.onnx";
    private const string TextEmbeddingVocabUrl = "https://hf-mirror.com/BAAI/bge-small-zh-v1.5/resolve/main/vocab.txt";

    /// <summary>文本嵌入模型是否就绪（校验文件存在 + 大小 + vocab）</summary>
    public static bool IsEmbeddingModelAvailable()
    {
        var dir = _engineDirProvider?.Invoke() ?? GetEngineDir();
        var modelPath = Path.Combine(dir, TextEmbeddingModelFile);
        var vocabPath = Path.Combine(dir, TextEmbeddingVocabFile);

        if (!File.Exists(modelPath) || !File.Exists(vocabPath)) return false;

        // 校验文件大小（bge-small-zh-v1.5 ONNX 约 90-100MB）
        var modelSize = new FileInfo(modelPath).Length;
        if (modelSize < 50 * 1024 * 1024) return false;

        // 校验 vocab 包含 special tokens
        return ValidateVocab(vocabPath);
    }

    /// <summary>获取文本嵌入模型路径</summary>
    public static (string modelPath, string vocabPath) GetTextEmbeddingModelPaths()
    {
        var dir = _engineDirProvider?.Invoke() ?? GetEngineDir();
        return (Path.Combine(dir, TextEmbeddingModelFile), Path.Combine(dir, TextEmbeddingVocabFile));
    }

    /// <summary>
    /// 异步下载文本嵌入模型（如果缺失）
    /// 模型约 100MB，vocab 约 100KB
    ///
    /// 安全措施:
    ///   1. SemaphoreSlim 防止并发重复下载
    ///   2. 文件下载到 .tmp，校验成功后原子移动到最终路径
    ///   3. 校验: 文件大小合理 + vocab 包含 special tokens
    /// </summary>
    public static async Task EnsureEmbeddingModelAsync(
        IProgress<string>? progress = null,
        CancellationToken ct = default)
    {
        var dir = _engineDirProvider?.Invoke() ?? GetEngineDir();

        if (IsEmbeddingModelAvailable())
        {
            progress?.Report("文本嵌入模型已就绪");
            return;
        }

        // 防止并发下载
        await EmbeddingDownloadLock.WaitAsync(ct);
        try
        {
            // double-check: 另一个线程可能已经下载完
            if (IsEmbeddingModelAvailable())
            {
                progress?.Report("文本嵌入模型已就绪");
                return;
            }

            // 如果现有模型文件存在但不合法（损坏），删除后重新下载
            var modelPath = Path.Combine(dir, TextEmbeddingModelFile);
            var vocabPath = Path.Combine(dir, TextEmbeddingVocabFile);

            if (File.Exists(modelPath) && !IsModelFileValid(modelPath))
            {
                // 损坏模型：重命名为 .corrupt 后删除
                var corruptPath = modelPath + ".corrupt";
                try { if (File.Exists(corruptPath)) File.Delete(corruptPath); } catch { }
                try { File.Move(modelPath, corruptPath); } catch { }
                progress?.Report("检测到损坏的 ONNX 模型，已隔离为 .corrupt，重新下载");
            }

            if (File.Exists(vocabPath) && !ValidateVocab(vocabPath))
            {
                try { File.Delete(vocabPath); } catch { }
                progress?.Report("检测到损坏的 vocab.txt，重新下载");
            }

            var embeddingDir = Path.Combine(dir, "embedding");
            Directory.CreateDirectory(embeddingDir);

            // 1. 下载 vocab.txt（原子下载 + 校验）
            if (!File.Exists(vocabPath))
            {
                progress?.Report("正在下载 BGE vocab.txt...");
                Interlocked.Increment(ref _downloadCount);
                await DownloadFileAtomicAsync(TextEmbeddingVocabUrl, vocabPath, ct);

                // 校验 vocab 包含 special tokens
                if (!ValidateVocab(vocabPath))
                {
                    try { File.Delete(vocabPath); } catch { }
                    throw new InvalidOperationException("vocab.txt 校验失败: 缺少 special tokens");
                }
                progress?.Report("vocab.txt 下载完成");
            }

            // 2. 下载 ONNX 模型（原子下载 + 校验）
            if (!File.Exists(modelPath))
            {
                progress?.Report("正在下载 BGE-small-zh-v1.5 ONNX 模型（约 100MB）...");
                Interlocked.Increment(ref _downloadCount);
                await DownloadFileAtomicAsync(TextEmbeddingModelUrl, modelPath, ct);

                // 校验文件大小
                var modelSize = new FileInfo(modelPath).Length;
                if (modelSize < 50 * 1024 * 1024)
                {
                    try { File.Delete(modelPath); } catch { }
                    throw new InvalidOperationException($"ONNX 模型文件大小异常: {modelSize / 1024 / 1024}MB（期望 ~90MB）");
                }
                progress?.Report($"ONNX 模型下载完成 ({modelSize / 1024 / 1024}MB)");
            }
        }
        finally
        {
            EmbeddingDownloadLock.Release();
        }
    }

    /// <summary>
    /// 校验 vocab.txt 包含 BERT special tokens
    /// </summary>
    private static bool ValidateVocab(string vocabPath)
    {
        try
        {
            var vocab = File.ReadAllLines(vocabPath);
            var required = new[] { "[PAD]", "[UNK]", "[CLS]", "[SEP]" };
            var vocabSet = new HashSet<string>(vocab.Select(l => l.Trim()));
            return required.All(t => vocabSet.Contains(t));
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// 异步下载说话人分离模型（如果缺失）
    /// </summary>
    public static async Task EnsureDiarizationModelsAsync(
        IProgress<string>? progress = null,
        CancellationToken ct = default)
    {
        if (IsDiarizationModelAvailable())
        {
            progress?.Report("说话人分离模型已就绪");
            return;
        }

        var dir = GetEngineDir();
        var diarizationDir = Path.Combine(dir, "diarization");
        Directory.CreateDirectory(diarizationDir);

        // 1. 下载 speaker embedding 模型（单文件）
        var embeddingPath = Path.Combine(dir, EmbeddingModelFile);
        if (!File.Exists(embeddingPath))
        {
            progress?.Report("正在下载说话人嵌入模型 (3dspeaker_campplus)...");
            var url = GithubMirror + EmbeddingModelUrl;
            await DownloadFileAsync(url, embeddingPath, ct);
            progress?.Report("说话人嵌入模型下载完成");
        }

        // 2. 下载 speaker segmentation 模型（tar.bz2）
        var segmentationModelPath = Path.Combine(dir, SegmentationModelFile);
        if (!File.Exists(segmentationModelPath))
        {
            progress?.Report("正在下载说话人分割模型 (pyannote-segmentation-3-0)...");
            var url = GithubMirror + SegmentationModelUrl;
            var tarPath = Path.Combine(diarizationDir, "pyannote-segmentation.tar.bz2");
            await DownloadFileAsync(url, tarPath, ct);

            // 解压：tar.exe -xjf file.tar.bz2 -C diarization/
            progress?.Report("正在解压说话人分割模型...");
            var psi = new ProcessStartInfo
            {
                FileName = "tar",
                Arguments = $"-xjf \"{tarPath}\" -C \"{diarizationDir}\"",
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardError = true,
            };
            using var proc = Process.Start(psi);
            if (proc != null)
            {
                await proc.WaitForExitAsync(ct);
                var stderr = await proc.StandardError.ReadToEndAsync(ct);
                if (proc.ExitCode != 0)
                    throw new Exception($"解压失败: {stderr}");
            }

            // 清理 tar.bz2
            try { File.Delete(tarPath); } catch { }
            progress?.Report("说话人分割模型下载并解压完成");
        }
    }

    /// <summary>
    /// 校验 ONNX 模型文件大小是否合理
    /// </summary>
    private static bool IsModelFileValid(string modelPath)
    {
        try
        {
            var size = new FileInfo(modelPath).Length;
            return size >= 50 * 1024 * 1024; // 至少 50MB
        }
        catch { return false; }
    }

    /// <summary>
    /// 原子下载: 下载到 .tmp 文件，成功后原子移动到最终路径
    /// 如果 .tmp 文件已存在（上次下载中断），先删除
    /// </summary>
    private static async Task DownloadFileAtomicAsync(string url, string destPath, CancellationToken ct)
    {
        var tmpPath = destPath + ".tmp";

        // 清理可能残留的临时文件
        try { if (File.Exists(tmpPath)) File.Delete(tmpPath); } catch { }

        if (_downloadDelegate != null)
        {
            // 测试模式：使用注入的下载器
            await _downloadDelegate(url, tmpPath, ct);
        }
        else
        {
            using var http = new HttpClient { Timeout = TimeSpan.FromMinutes(30) };
            using var resp = await http.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, ct);
            resp.EnsureSuccessStatusCode();

            Directory.CreateDirectory(Path.GetDirectoryName(destPath)!);
            using (var fs = File.Create(tmpPath))
            {
                await resp.Content.CopyToAsync(fs, ct);
            }
        }

        // 原子移动: .tmp → 最终路径
        if (File.Exists(destPath))
            File.Delete(destPath);
        File.Move(tmpPath, destPath);
    }

    private static async Task DownloadFileAsync(string url, string destPath, CancellationToken ct)
    {
        using var http = new HttpClient { Timeout = TimeSpan.FromMinutes(30) };
        using var resp = await http.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, ct);
        resp.EnsureSuccessStatusCode();

        Directory.CreateDirectory(Path.GetDirectoryName(destPath)!);
        using var fs = File.Create(destPath);
        await resp.Content.CopyToAsync(fs, ct);
    }

    // ═══════════════════════════════════════════════════════════
    // 模型下载中心：清单（缺啥显示啥）+ 状态 + 下载编排
    //
    // 清单纪律：地址只放经过真实 GET/HEAD 验证的直链；没有验证过地址的文件
    // 一律 Urls 为空 = 手动放置，UI 显示"找管理员拷"，禁止编地址。
    // ═══════════════════════════════════════════════════════════

    /// <summary>清单里的一项模型文件（RelPath 相对 asr-engine/）。</summary>
    public sealed class SttModelFileSpec
    {
        /// <summary>相对 asr-engine/ 的路径（如 paraformer/tokens.txt）。</summary>
        public required string RelPath { get; init; }
        /// <summary>期望字节数（用于校验下载完整性；0 = 无已知大小）。</summary>
        public required long Bytes { get; init; }
        /// <summary>直下候选地址（按顺序尝试，国内镜像在前）；空 = 手动放置。</summary>
        public IReadOnlyList<string> Urls { get; init; } = Array.Empty<string>();
        /// <summary>是否有一键下载地址。</summary>
        public bool Downloadable => Urls.Count > 0;
    }

    /// <summary>清单里的一个引擎（引擎 ID、展示名、所需文件）。</summary>
    public sealed class SttEngineModelSpec
    {
        public required string EngineId { get; init; }
        public required string DisplayName { get; init; }
        public required IReadOnlyList<SttModelFileSpec> Files { get; init; }
    }

    // ── 已验证地址（2026-09-15 真实 GET/HEAD 验证：状态码 + 字节数 + 首尾字节比对）──

    // MOSS gguf：魔搭优先（国内直连），HF 直链 fallback；两者首 16 字节与本地逐字节一致
    private const string MossGgufModelScopeUrl =
        "https://www.modelscope.cn/models/mudler/moss-transcribe.cpp-gguf/resolve/master/moss-transcribe-q8_0.gguf";
    private const string MossGgufHfUrl =
        "https://huggingface.co/mudler/moss-transcribe.cpp-gguf/resolve/main/moss-transcribe-q8_0.gguf";

    // 川话 int8（sherpa-onnx）：HF 官方仓；model.int8.onnx 首尾各 64KB 与本地逐字节一致
    private const string ParaformerHfBase =
        "https://huggingface.co/csukuangfj/sherpa-onnx-paraformer-zh-int8-2025-10-07/resolve/main";

    /// <summary>
    /// 模型清单（每引擎所需文件 + 大小 + 下载地址）。
    /// 无验证地址的文件 Urls 为空 → 手动放置。引擎可执行文件（moss-transcribe.exe 等）
    /// 随安装包走、全网无预编译版，不在本清单内。
    /// </summary>
    public static readonly IReadOnlyList<SttEngineModelSpec> ModelManifest = new[]
    {
        new SttEngineModelSpec
        {
            EngineId = MossTranscribeEngine.EngineId,
            DisplayName = "MOSS-Transcribe-0.9B GGUF",
            Files = new[]
            {
                new SttModelFileSpec
                {
                    RelPath = $"{MossDir}/{MossGgufFileName}",
                    Bytes = 986881024L,
                    Urls = new[] { MossGgufModelScopeUrl, MossGgufHfUrl },
                },
            },
        },
        new SttEngineModelSpec
        {
            EngineId = ParaformerEngine.EngineId,
            DisplayName = "Paraformer 中文 int8（sherpa-onnx）",
            Files = new[]
            {
                new SttModelFileSpec
                {
                    RelPath = $"{ParaformerDir}/{ParaformerModelFileName}",
                    Bytes = 238429929L,
                    Urls = new[] { $"{ParaformerHfBase}/{ParaformerModelFileName}" },
                },
                new SttModelFileSpec
                {
                    RelPath = $"{ParaformerDir}/{ParaformerTokensFileName}",
                    Bytes = 75756L,
                    Urls = new[] { $"{ParaformerHfBase}/{ParaformerTokensFileName}" },
                },
            },
        },
    };

    /// <summary>按引擎 ID 取清单（未知引擎返回 null）。</summary>
    public static SttEngineModelSpec? FindEngineSpec(string engineId) =>
        ModelManifest.FirstOrDefault(s => string.Equals(s.EngineId, engineId, StringComparison.OrdinalIgnoreCase));

    /// <summary>缺失文件项（供状态接口与 UI 展示）。</summary>
    public sealed class SttMissingFile
    {
        public required string RelPath { get; init; }
        public required long Bytes { get; init; }
        /// <summary>false = 需手动放置（无已验证地址）。</summary>
        public required bool Downloadable { get; init; }
    }

    /// <summary>单个引擎的模型就绪状态。</summary>
    public sealed class SttEngineModelStatus
    {
        public required string EngineId { get; init; }
        public required string DisplayName { get; init; }
        /// <summary>清单内文件是否齐全。</summary>
        public required bool Ready { get; init; }
        public required IReadOnlyList<SttMissingFile> MissingFiles { get; init; }
        /// <summary>缺失字节总数。</summary>
        public required long MissingBytes { get; init; }
    }

    /// <summary>
    /// 各引擎模型文件就绪状态：逐文件判存在，汇总缺失项与缺失字节总数。
    /// 只陈述事实（存在/缺失 + 字节数），不做任何评测性排序。
    /// </summary>
    public static List<SttEngineModelStatus> GetModelStatus()
    {
        var dir = _engineDirProvider?.Invoke() ?? GetEngineDir();
        var result = new List<SttEngineModelStatus>(ModelManifest.Count);

        foreach (var spec in ModelManifest)
        {
            var missing = new List<SttMissingFile>();
            long missingBytes = 0;
            foreach (var f in spec.Files)
            {
                if (File.Exists(Path.Combine(dir, f.RelPath.Replace('/', Path.DirectorySeparatorChar))))
                    continue;
                missing.Add(new SttMissingFile { RelPath = f.RelPath, Bytes = f.Bytes, Downloadable = f.Downloadable });
                missingBytes += f.Bytes;
            }
            result.Add(new SttEngineModelStatus
            {
                EngineId = spec.EngineId,
                DisplayName = spec.DisplayName,
                Ready = missing.Count == 0,
                MissingFiles = missing,
                MissingBytes = missingBytes,
            });
        }
        return result;
    }

    // ═══ 下载进度与并发闸 ═══

    /// <summary>单个引擎的下载进度（阶段 + 当前文件 + 字节数）。</summary>
    public sealed class SttDownloadProgress
    {
        public string EngineId { get; set; } = "";
        /// <summary>idle|downloading|extracting|done|error</summary>
        public string Phase { get; set; } = "idle";
        /// <summary>当前文件（相对 asr-engine/）。</summary>
        public string? File { get; set; }
        public long BytesReceived { get; set; }
        public long TotalBytes { get; set; }
        /// <summary>本引擎整体进度（0-100）。</summary>
        public double? Percent => TotalBytes > 0
            ? Math.Round((double)BytesReceived / TotalBytes * 100, 1)
            : null;
        public string? Error { get; set; }
    }

    private static readonly ConcurrentDictionary<string, SttDownloadProgress> _downloadProgress = new(StringComparer.OrdinalIgnoreCase);
    private static readonly ConcurrentDictionary<string, byte> _activeDownloads = new(StringComparer.OrdinalIgnoreCase);

    /// <summary>取某引擎的下载进度（无记录返回 null）。</summary>
    public static SttDownloadProgress? GetModelDownloadProgress(string engineId) =>
        _downloadProgress.TryGetValue(engineId, out var p) ? p : null;

    /// <summary>该引擎是否正在下载（内存闸，防重复触发）。</summary>
    public static bool IsModelDownloadActive(string engineId) => _activeDownloads.ContainsKey(engineId);

    /// <summary>
    /// 启动某引擎缺失模型的下载（立即返回，后台执行）。
    /// 同一引擎已有下载在跑 → 返回 false（内存闸，与单实例互斥纪律一致）。
    /// </summary>
    public static bool StartModelDownload(string engineId)
    {
        var spec = FindEngineSpec(engineId);
        if (spec == null) throw new InvalidOperationException($"未知引擎: {engineId}");

        // 内存闸：同引擎只允许一个下载在跑
        if (!_activeDownloads.TryAdd(spec.EngineId, 0)) return false;

        var progress = new SttDownloadProgress { EngineId = spec.EngineId, Phase = "idle" };
        _downloadProgress[spec.EngineId] = progress;

        _ = Task.Run(async () =>
        {
            try { await DownloadEngineModelsAsync(spec, progress, CancellationToken.None); }
            catch (Exception ex)
            {
                progress.Phase = "error";
                progress.Error = Common.Sanitize(ex.Message);
                Console.Error.WriteLine($"[SttModelManager] 模型下载失败({spec.EngineId}): {Common.Sanitize(ex.Message)}");
            }
            finally { _activeDownloads.TryRemove(spec.EngineId, out _); }
        });
        return true;
    }

    /// <summary>逐个下载该引擎缺失文件（逐个原子改名落盘）。</summary>
    private static async Task DownloadEngineModelsAsync(
        SttEngineModelSpec spec, SttDownloadProgress progress, CancellationToken ct)
    {
        var dir = _engineDirProvider?.Invoke() ?? GetEngineDir();
        var missing = spec.Files
            .Where(f => !File.Exists(Path.Combine(dir, f.RelPath.Replace('/', Path.DirectorySeparatorChar))))
            .ToList();

        if (missing.Count == 0)
        {
            progress.Phase = "done";
            progress.BytesReceived = 0;
            progress.TotalBytes = 0;
            return;
        }

        // 进度分母 = 本次要下的字节
        var total = missing.Where(f => f.Urls.Count > 0).Sum(f => f.Bytes);
        progress.TotalBytes = total;
        progress.BytesReceived = 0;
        progress.Phase = "downloading";

        long done = 0;
        void Report(long currentFileBytes)
        {
            progress.BytesReceived = done + currentFileBytes;
        }

        // 逐个直链文件：原子下载（老文件不删错：先落 .tmp，校验后 rename 覆盖）
        foreach (var f in missing)
        {
            if (f.Urls.Count == 0)
            {
                progress.Phase = "error";
                progress.Error = $"{f.RelPath} 没有已验证的下载地址，需要手动放置";
                return;
            }

            var destPath = Path.Combine(dir, f.RelPath.Replace('/', Path.DirectorySeparatorChar));
            var tmpPath = destPath + ".tmp";
            progress.File = f.RelPath;

            try
            {
                await DownloadToTmpResumableAsync(f.Urls, tmpPath, f.Bytes, Report, ct);

                // 校验后原子改名（覆盖旧文件只在成功之后）
                Directory.CreateDirectory(Path.GetDirectoryName(destPath)!);
                if (File.Exists(destPath)) File.Delete(destPath);
                File.Move(tmpPath, destPath);
            }
            finally
            {
                TryDelete(tmpPath);
            }

            done += f.Bytes;
            Report(0);
        }

        progress.Phase = "done";
        progress.File = null;
        progress.BytesReceived = total;
    }

    /// <summary>
    /// 下载到 .tmp（支持断点续下）：已有 .tmp 时带 Range 续传，服务器不支持 Range
    /// （非 206）则整下；下完校验字节数。任一地址成功即返回，全部失败抛最后一个原因。
    /// </summary>
    internal static async Task DownloadToTmpResumableAsync(
        IReadOnlyList<string> urls, string tmpPath, long expectedBytes,
        Action<long> onBytes, CancellationToken ct)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(tmpPath)!);

        var existing = File.Exists(tmpPath) ? new FileInfo(tmpPath).Length : 0;
        if (expectedBytes > 0 && existing == expectedBytes)
        {
            onBytes(existing); // 上次已下完（如改名失败），无需重下
            return;
        }
        if (expectedBytes > 0 && existing > expectedBytes)
        {
            TryDelete(tmpPath); // 超出期望：残留不可信，重下
            existing = 0;
        }

        // 测试注入：delegate 负责把内容写到 tmpPath（与既有 DownloadFileAtomicAsync 同套路，
        // 测试模式无续传语义，先清残留）
        if (_downloadDelegate != null)
        {
            TryDelete(tmpPath);
            await _downloadDelegate(urls[0], tmpPath, ct);
            onBytes(File.Exists(tmpPath) ? new FileInfo(tmpPath).Length : 0);
            VerifySize(tmpPath, expectedBytes);
            return;
        }

        Exception? last = null;
        foreach (var url in urls)
        {
            ct.ThrowIfCancellationRequested();
            try
            {
                await DownloadOnceToTmpAsync(url, tmpPath, existing, onBytes, ct);
                VerifySize(tmpPath, expectedBytes);
                return;
            }
            catch (OperationCanceledException) { throw; }
            catch (Exception ex)
            {
                last = ex;
                // 该源失败：保留已下部分（换源仍可续传），记录原因继续下一个源
                existing = File.Exists(tmpPath) ? new FileInfo(tmpPath).Length : 0;
                if (existing >= expectedBytes && expectedBytes > 0) break; // 已够，交给校验
                Console.Error.WriteLine($"[SttModelManager] 下载源失败，尝试下一个: {Common.Sanitize(ex.Message)}");
            }
        }

        throw new InvalidOperationException(
            $"所有下载源均失败（共 {urls.Count} 个）：{Common.Sanitize(last?.Message ?? "未知原因")}", last);
    }

    /// <summary>单源下载：带 Range 续传；返回后 .tmp 为该源能提供的全部内容。</summary>
    private static async Task DownloadOnceToTmpAsync(
        string url, string tmpPath, long existing, Action<long> onBytes, CancellationToken ct)
    {
        using var http = new HttpClient { Timeout = TimeSpan.FromMinutes(30) };
        using var req = new HttpRequestMessage(HttpMethod.Get, url);
        if (existing > 0) req.Headers.Range = new RangeHeaderValue(existing, null);

        using var resp = await http.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, ct);

        if (!resp.IsSuccessStatusCode)
            throw new InvalidOperationException(
                $"HTTP {(int)resp.StatusCode} {resp.StatusCode} — {ShortUrl(url)}");

        // 请求了 Range 但服务器给 200（不支持续传）→ 从头整下，丢弃残留
        var append = existing > 0 && resp.StatusCode == HttpStatusCode.PartialContent;
        if (existing > 0 && !append) TryDelete(tmpPath);

        var written = append ? existing : 0L;
        onBytes(written);

        await using (var fs = new FileStream(
            tmpPath, append ? FileMode.Append : FileMode.Create, FileAccess.Write, FileShare.None))
        await using (var src = await resp.Content.ReadAsStreamAsync(ct))
        {
            var buf = new byte[81920];
            int n;
            while ((n = await src.ReadAsync(buf, ct)) > 0)
            {
                await fs.WriteAsync(buf.AsMemory(0, n), ct);
                written += n;
                onBytes(written);
            }
            await fs.FlushAsync(ct);
        }
    }

    /// <summary>下载完校验字节数（期望 0 = 无已知大小，跳过校验）。</summary>
    private static void VerifySize(string tmpPath, long expectedBytes)
    {
        if (expectedBytes <= 0) return;
        var actual = File.Exists(tmpPath) ? new FileInfo(tmpPath).Length : 0;
        if (actual != expectedBytes)
            throw new InvalidOperationException($"下载字节数不符：实际 {actual}，期望 {expectedBytes}（{Path.GetFileName(tmpPath)}）");
    }

    private static void TryDelete(string path)
    {
        try { if (File.Exists(path)) File.Delete(path); } catch (Exception ex) { Console.Error.WriteLine($"[SttModelManager] 临时文件清理失败（不致命）: {Common.Sanitize(ex.Message)}"); }
    }

    private static string ShortUrl(string url) => url.Length > 90 ? url[..90] + "..." : url;
}
