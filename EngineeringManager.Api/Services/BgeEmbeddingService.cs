using System.Runtime.InteropServices;
using EngineeringManager.Api.Services.Stt;
using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;

namespace EngineeringManager.Api.Services;

/// <summary>
/// BGE-small-zh-v1.5 ONNX 文本向量化服务
///
/// 架构:
///   1. 下载 bge-small-zh-v1.5 ONNX 模型 + vocab.txt (由 SttModelManager 统管)
///   2. 实现 BERT WordPiece tokenizer (纯 C#，无 Python 依赖)
///   3. ONNX Runtime 推理 → last_hidden_state → mean pool → L2 normalize
///   4. 输出 512 维 L2 归一化向量，检索时点积 = 余弦相似度
///
/// 模型状态机:
///   preparing  — 模型正在下载/校验中
///   ready      — 模型已加载，IsAvailable=true
///   unavailable — 模型文件不存在（首次使用前）
///   failed     — 模型文件存在但加载/校验失败（损坏等）
///
/// 关键设计:
///   - 模型不存在时 IsAvailable=false（unavailable），不永久缓存失败
///   - 模型补齐后调用 Reset() 可重新初始化
///   - 真正的损坏模型错误记录日志，状态=failed，但 Reset() 后仍可重试
///   - EnsureModelAsync() 由外部调用（如入库前）触发下载+校验
/// </summary>
public class BgeEmbeddingService : IEmbeddingService, IDisposable
{
    public int Dimension => 512;

    private InferenceSession? _session;
    private Dictionary<string, int>? _vocab;
    private readonly object _lock = new();
    private ModelStatus _status = ModelStatus.Unavailable;
    private string? _lastError;

    // BERT special tokens
    private const int PadId = 0;
    private const int UnkId = 100;
    private const int ClsId = 101;
    private const int SepId = 102;
    private const int MaxSeqLen = 512;

    // 模型文件路径（通过 SttModelManager 获取，支持测试注入）
    private static string ModelPath => SttModelManager.GetTextEmbeddingModelPaths().modelPath;
    private static string VocabPath => SttModelManager.GetTextEmbeddingModelPaths().vocabPath;

    /// <summary>模型当前状态</summary>
    public enum ModelStatus { Preparing, Ready, Unavailable, Failed }

    /// <summary>模型状态（线程安全读取）</summary>
    public ModelStatus Status
    {
        get { lock (_lock) return _status; }
    }

    /// <summary>最后一次错误信息（诊断用）</summary>
    public string? LastError
    {
        get { lock (_lock) return _lastError; }
    }

    public bool IsAvailable
    {
        get
        {
            lock (_lock)
            {
                if (_status == ModelStatus.Ready) return true;
                if (_status == ModelStatus.Unavailable || _status == ModelStatus.Preparing)
                {
                    // 尝试初始化（模型可能已补齐）
                    if (_status == ModelStatus.Unavailable)
                        TryInitialize();
                    return _status == ModelStatus.Ready;
                }
                // Failed 状态不自动重试，需显式 Reset
                return false;
            }
        }
    }

    /// <summary>
    /// 重置状态，允许重新初始化。
    /// 模型补齐后调用此方法，下次 IsAvailable/EmbedAsync 会重新加载。
    /// </summary>
    public void Reset()
    {
        lock (_lock)
        {
            _session?.Dispose();
            _session = null;
            _vocab = null;
            _status = ModelStatus.Unavailable;
            _lastError = null;
        }
    }

    /// <summary>
    /// 尝试初始化模型（线程安全，内部调用）
    /// </summary>
    private void TryInitialize()
    {
        // 注意: 调用方已持有 _lock
        if (_status == ModelStatus.Ready || _status == ModelStatus.Preparing) return;

        try
        {
            if (!File.Exists(ModelPath) || !File.Exists(VocabPath))
            {
                _status = ModelStatus.Unavailable;
                return;
            }

            // 加载 vocab
            _vocab = LoadVocab(VocabPath);

            // 校验 vocab 包含 special tokens
            if (!_vocab.ContainsKey("[PAD]") || !_vocab.ContainsKey("[UNK]") ||
                !_vocab.ContainsKey("[CLS]") || !_vocab.ContainsKey("[SEP]"))
            {
                _status = ModelStatus.Failed;
                _lastError = "vocab.txt 缺少 special tokens ([PAD]/[UNK]/[CLS]/[SEP])";
                Console.Error.WriteLine($"[BgeEmbeddingService] {_lastError}");
                return;
            }

            // ONNX 模型路径需 ASCII 安全（与 DiarizationService 一致）
            var modelPath = EnsureAsciiPath(ModelPath);

            var options = new Microsoft.ML.OnnxRuntime.SessionOptions();
            options.AppendExecutionProvider_CPU();
            _session = new InferenceSession(modelPath, options);

            // 校验输入名
            var inputNames = _session.InputMetadata.Keys.ToHashSet();
            if (!inputNames.Contains("input_ids") || !inputNames.Contains("attention_mask") ||
                !inputNames.Contains("token_type_ids"))
            {
                _status = ModelStatus.Failed;
                _lastError = $"ONNX 模型输入名不符合预期: {string.Join(", ", inputNames)}";
                Console.Error.WriteLine($"[BgeEmbeddingService] {_lastError}");
                _session.Dispose();
                _session = null;
                return;
            }

            // 校验输出维度
            var outputMeta = _session.OutputMetadata.Values.First();
            var outputDims = outputMeta.Dimensions;
            if (outputDims.Length < 3 || outputDims[2] != 512)
            {
                _status = ModelStatus.Failed;
                _lastError = $"ONNX 模型输出维度不符合预期: {string.Join(",", outputDims)} (期望 [..., 512])";
                Console.Error.WriteLine($"[BgeEmbeddingService] {_lastError}");
                _session.Dispose();
                _session = null;
                return;
            }

            _status = ModelStatus.Ready;
            _lastError = null;
            Console.WriteLine($"[BgeEmbeddingService] ONNX 模型加载完成: vocab={_vocab.Count} tokens, 状态=ready");
        }
        catch (Exception ex)
        {
            _status = ModelStatus.Failed;
            _lastError = ex.Message;
            Console.Error.WriteLine($"[BgeEmbeddingService] 模型加载失败: {Common.Sanitize(ex.Message)}");
        }
    }

    /// <summary>
    /// 确保模型已下载并校验通过。
    /// 由外部在需要语义向量前调用（如入库前）。
    /// 使用 SemaphoreSlim 防止并发重复下载。
    /// </summary>
    public async Task EnsureModelAsync(CancellationToken ct = default)
    {
        if (IsAvailable) return;

        lock (_lock)
        {
            if (_status == ModelStatus.Preparing)
            {
                // 另一个线程正在准备，等待完成
                while (_status == ModelStatus.Preparing)
                    Monitor.Wait(_lock, 1000);
                return;
            }
            _status = ModelStatus.Preparing;
        }

        try
        {
            // 下载模型（SttModelManager 内部有原子下载逻辑）
            await SttModelManager.EnsureEmbeddingModelAsync(null, ct);

            // 下载完成后重置状态，尝试初始化
            Reset();
            lock (_lock)
            {
                TryInitialize();
            }
        }
        finally
        {
            lock (_lock)
            {
                if (_status == ModelStatus.Preparing)
                {
                    // 初始化未成功，设为 unavailable 或 failed
                    _status = File.Exists(ModelPath) && File.Exists(VocabPath)
                        ? ModelStatus.Failed
                        : ModelStatus.Unavailable;
                }
                Monitor.PulseAll(_lock);
            }
        }
    }

    public Task<float[]> EmbedAsync(string text, CancellationToken ct = default)
    {
        if (!IsAvailable)
            throw new InvalidOperationException($"Embedding 模型未就绪 (状态={Status}, 错误={LastError})");

        var embedding = ComputeEmbedding(text);
        return Task.FromResult(embedding);
    }

    public Task<List<float[]>> EmbedBatchAsync(List<string> texts, CancellationToken ct = default)
    {
        if (!IsAvailable)
            throw new InvalidOperationException($"Embedding 模型未就绪 (状态={Status}, 错误={LastError})");

        var results = texts.Select(t => ComputeEmbedding(t)).ToList();
        return Task.FromResult(results);
    }

    /// <summary>
    /// 计算单条文本的 BGE 嵌入向量
    /// </summary>
    private float[] ComputeEmbedding(string text)
    {
        // 1. Tokenize
        var (inputIds, attentionMask) = Tokenize(text, MaxSeqLen);
        var tokenTypeIds = new long[MaxSeqLen]; // 全 0（单句）

        // 2. 创建输入张量
        var inputIdsTensor = new DenseTensor<long>(inputIds, new[] { 1, MaxSeqLen });
        var attentionMaskTensor = new DenseTensor<long>(attentionMask, new[] { 1, MaxSeqLen });
        var tokenTypeIdsTensor = new DenseTensor<long>(tokenTypeIds, new[] { 1, MaxSeqLen });

        var inputs = new List<NamedOnnxValue>
        {
            NamedOnnxValue.CreateFromTensor("input_ids", inputIdsTensor),
            NamedOnnxValue.CreateFromTensor("attention_mask", attentionMaskTensor),
            NamedOnnxValue.CreateFromTensor("token_type_ids", tokenTypeIdsTensor),
        };

        // 3. 推理
        using var results = _session!.Run(inputs);
        var output = results.First().AsTensor<float>();

        // 4. Mean pooling (使用 attention_mask)
        var hiddenSize = output.Dimensions[2]; // 512
        var pooled = new float[hiddenSize];
        var validTokens = 0;
        for (int t = 0; t < MaxSeqLen; t++)
        {
            if (attentionMask[t] == 1)
            {
                for (int d = 0; d < hiddenSize; d++)
                {
                    pooled[d] += output[0, t, d];
                }
                validTokens++;
            }
        }

        if (validTokens > 0)
        {
            for (int d = 0; d < hiddenSize; d++)
                pooled[d] /= validTokens;
        }

        // 5. L2 normalize
        L2Normalize(pooled);
        return pooled;
    }

    // ═══════════════════════════════════════════════════════════
    // BERT Tokenizer (WordPiece, 适配中文)
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 文本 → input_ids + attention_mask
    /// </summary>
    private (long[] inputIds, long[] attentionMask) Tokenize(string text, int maxLen)
    {
        // Basic tokenization: 空白分割 + CJK 逐字 + 标点分割
        var tokens = BasicTokenize(text);

        // WordPiece: 逐 token 贪婪最长匹配
        var wordPieceTokens = new List<string>();
        foreach (var token in tokens)
        {
            var subTokens = WordPieceTokenize(token);
            wordPieceTokens.AddRange(subTokens);
        }

        // 加 [CLS] + [SEP]，截断
        var allTokens = new List<string> { "[CLS]" };
        allTokens.AddRange(wordPieceTokens.Take(maxLen - 2));
        allTokens.Add("[SEP]");

        // 转 IDs
        var inputIds = new long[maxLen];
        var attentionMask = new long[maxLen];
        for (int i = 0; i < allTokens.Count && i < maxLen; i++)
        {
            inputIds[i] = TokenToId(allTokens[i]);
            attentionMask[i] = 1;
        }
        // 剩余位置为 [PAD] (id=0), attention_mask=0

        return (inputIds, attentionMask);
    }

    /// <summary>Basic tokenizer: 空白归一 + CJK 逐字 + 标点分割</summary>
    private static List<string> BasicTokenize(string text)
    {
        // 清理 + 小写
        text = text.Trim();
        var tokens = new List<string>();
        var current = new System.Text.StringBuilder();

        foreach (var ch in text)
        {
            if (char.IsWhiteSpace(ch))
            {
                if (current.Length > 0) { tokens.Add(current.ToString()); current.Clear(); }
                continue;
            }

            // CJK 字符逐字处理
            if (IsCjk(ch))
            {
                if (current.Length > 0) { tokens.Add(current.ToString()); current.Clear(); }
                tokens.Add(ch.ToString());
                continue;
            }

            // 标点符号分割
            if (IsPunctuation(ch))
            {
                if (current.Length > 0) { tokens.Add(current.ToString()); current.Clear(); }
                tokens.Add(ch.ToString());
                continue;
            }

            // ASCII 小写
            current.Append(char.ToLowerInvariant(ch));
        }
        if (current.Length > 0) tokens.Add(current.ToString());
        return tokens;
    }

    /// <summary>WordPiece: 贪婪最长匹配</summary>
    private List<string> WordPieceTokenize(string token)
    {
        if (string.IsNullOrEmpty(token)) return new List<string>();

        // 如果整个 token 在 vocab 中，直接返回
        if (_vocab!.ContainsKey(token))
            return new List<string> { token };

        // 贪婪最长匹配
        var subTokens = new List<string>();
        var start = 0;
        while (start < token.Length)
        {
            var end = token.Length;
            var curSubToken = (string?)null;

            while (start < end)
            {
                var subStr = token.Substring(start, end - start);
                var candidate = start == 0 ? subStr : "##" + subStr;
                if (_vocab.ContainsKey(candidate))
                {
                    curSubToken = candidate;
                    break;
                }
                end--;
            }

            if (curSubToken == null)
            {
                // 无法匹配，整个 token 标记为 [UNK]
                return new List<string> { "[UNK]" };
            }

            subTokens.Add(curSubToken);
            start = end;
        }

        return subTokens;
    }

    private int TokenToId(string token) =>
        _vocab!.TryGetValue(token, out var id) ? id : UnkId;

    // ═══════════════════════════════════════════════════════════
    // 辅助方法
    // ═══════════════════════════════════════════════════════════

    private static Dictionary<string, int> LoadVocab(string path)
    {
        var vocab = new Dictionary<string, int>();
        foreach (var (line, idx) in File.ReadLines(path).Select((l, i) => (l, i)))
        {
            var token = line.Trim();
            if (token.Length > 0)
                vocab[token] = idx;
        }
        return vocab;
    }

    private static void L2Normalize(float[] v)
    {
        var norm = 0f;
        for (int i = 0; i < v.Length; i++) norm += v[i] * v[i];
        norm = MathF.Sqrt(norm);
        if (norm > 0)
        {
            for (int i = 0; i < v.Length; i++) v[i] /= norm;
        }
    }

    private static bool IsCjk(char c) =>
        c >= 0x4E00 && c <= 0x9FFF ||   // CJK Unified
        c >= 0x3400 && c <= 0x4DBF ||   // CJK Extension A
        c >= 0xF900 && c <= 0xFAFF;     // CJK Compatibility

    private static bool IsPunctuation(char c) =>
        char.IsPunctuation(c) ||
        c == '，' || c == '。' || c == '！' || c == '？' || c == '；' || c == '：' ||
        c == '、' || c == '「' || c == '」' || c == '『' || c == '』' || c == '（' || c == '）' ||
        c == '【' || c == '】' || c == '《' || c == '》';

    /// <summary>
    /// 确保路径只含 ASCII 字符（与 DiarizationService.EnsureAsciiPath 一致策略）
    /// </summary>
    private static string EnsureAsciiPath(string originalPath)
    {
        if (originalPath.All(c => c < 128))
            return originalPath;

        // 尝试 8.3 短路径
        var buffer = new char[260];
        var len = GetShortPathName(originalPath, buffer, buffer.Length);
        if (len > 0)
        {
            var shortPath = new string(buffer, 0, len);
            if (shortPath.All(c => c < 128))
                return shortPath;
        }

        // 复制到 ASCII 安全目录
        var asciiBase = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
            "EngineeringManager", "embedding-model");
        Directory.CreateDirectory(asciiBase);
        var fileName = Path.GetFileName(originalPath);
        var asciiPath = Path.Combine(asciiBase, fileName);

        if (!File.Exists(asciiPath) || new FileInfo(asciiPath).Length != new FileInfo(originalPath).Length)
            File.Copy(originalPath, asciiPath, overwrite: true);

        return asciiPath;
    }

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern int GetShortPathName(string lpszLongPath, char[] lpszShortPath, int cchBuffer);

    public void Dispose()
    {
        _session?.Dispose();
    }
}
