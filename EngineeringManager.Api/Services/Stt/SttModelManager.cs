using System.Diagnostics;
using System.Threading;

namespace EngineeringManager.Api.Services.Stt;

/// <summary>
/// STT 模型管理器：检测本地模型是否存在、缺失时按镜像下载
/// ASR 模型直接复用项目根目录 asr-engine/（已跑通的 1.7B GGUF）
/// 说话人分离模型：sherpa-onnx-pyannote-segmentation-3-5 + 3dspeaker_speech_ember
/// M2: 文本嵌入模型 bge-small-zh-v1.5 ONNX
/// </summary>
public class SttModelManager
{
    // 防止并发重复下载
    private static readonly SemaphoreSlim EmbeddingDownloadLock = new(1, 1);
    private static readonly string[] AsrModelFiles = new[]
    {
        "model/qwen3_asr_llm.q4_k.gguf",
        "model/qwen3_asr_encoder_backend.int4.onnx",
        "model/qwen3_asr_encoder_frontend.int4.onnx",
    };

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
            if (Directory.Exists(candidate) && File.Exists(Path.Combine(candidate, "transcribe.exe")))
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
        if (Directory.Exists(dataCandidate) && File.Exists(Path.Combine(dataCandidate, "transcribe.exe")))
        {
            return dataCandidate;
        }

        // 3. 默认返回项目根目录路径（即使不存在，让调用方知道预期位置）
        return Path.Combine(dir, "asr-engine");
    }

    /// <summary>transcribe.exe 完整路径</summary>
    public static string GetTranscribeExePath() =>
        Path.Combine(GetEngineDir(), "transcribe.exe");

    /// <summary>ASR 模型是否齐全</summary>
    public static bool IsAsrModelAvailable()
    {
        var dir = GetEngineDir();
        if (!File.Exists(Path.Combine(dir, "transcribe.exe"))) return false;
        foreach (var f in AsrModelFiles)
        {
            if (!File.Exists(Path.Combine(dir, f))) return false;
        }
        return true;
    }

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
}
