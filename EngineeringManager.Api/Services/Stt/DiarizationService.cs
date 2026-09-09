using System.Collections.Concurrent;
using System.Diagnostics;
using System.Runtime.InteropServices;
using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;

namespace EngineeringManager.Api.Services.Stt;

/// <summary>
/// 说话人分离服务（ORT 直串三件套：pyannote 分割 → campplus 声纹 → C# 聚类/合并）
///
/// 用 ONNX Runtime（CPU EP）直接编排两个 ONNX 模型，替代 sherpa-onnx C++ 绑定的
/// process() 调用。实测背景（31.6 分钟音频）：sherpa 全程 262.6s，其中 pyannote 前向
/// 仅 3.8s、campplus 声纹 7.3s、聚类 1.4s——97% 是 sherpa Python/进程层的组织开销。
///
/// 管线（参数与沙箱原型 E:\moss-build\sandbox_ort_diar.py 一致）：
/// 1. pyannote 分割：输入原始波形 (1,1,T) fp32（模型内部自带 mel），输出 (F,7) logits，
///    argmax 后查 powerset 映射（class0=静音，1..3=单人，4..6=两人组合）。
///    帧数公式 F(T)=((T-251)/10-2)/3/3-8)/3+1（receptive_field_shift=270 样本/帧）。
///    长音频按 ≤1800s 分块直喂，块间 10s 重叠，重叠帧取均值 ≥0.5 二值化拼接（无边界断裂）。
/// 2. campplus 声纹：滑窗子段（1.5s 窗 / 1.0s 步长（0.5s 实测窗数过多，1.0s 归属精度等效且声纹耗时减半））逐窗 embedding（不支持整段一个
///    embedding——长段混多人会导致簇塌缩）。输入为 kaldi fbank 80 维（povey 窗 25ms/10ms、
///    preemph 0.97、512 点 FFT、mel 20Hz~Nyquist-400Hz、log）+ 逐窗 global-mean CMN。
/// 3. 聚类：余弦距离。
///    - 自动模式：平均链式凝聚聚类（NN-chain，O(n²)，与 scipy average 一致）+ 阈值 0.65 切树。
///    - 指定人数：球形 k-means（k-means++ 初始化、固定种子）。
/// 4. 段归属：按窗多数投票 → 段标签按首现顺序重排为连续 0..k-1。
/// 5. 合并：同说话人相邻段 gap&lt;2s 取时间并集（互斥区间写法，杜绝旧管线的 35.8% 重叠）、
///    吸收 &lt;1.2s 超短段、跨说话人互斥裁剪；保留 MergeRareSpeakers 15s/5% 低频吞并语义。
/// </summary>
public class DiarizationService
{
    // ── 模型与算法常量（来源：pyannote segmentation-3.0 ONNX metadata 实测值） ──
    private const int TargetSampleRate = 16000;
    private const int ReceptiveFieldShift = 270;    // 每输出帧对应的波形样本数
    private const int ReceptiveFieldSize = 991;     // 帧感受野（帧→时间映射的半窗偏移用）
    private const int NumPowersetClasses = 7;
    private const int PowersetMaxClasses = 2;
    private const int NumSegSpeakers = 3;           // pyannote 分割模型最多同时 3 人
    private const int MaxBlockFrames = 106000;      // 单块 ≤1800s（106000*270 = 1788.75s）
    private const int BlockOverlapFrames = 600;     // 块间重叠 10s（600*270 = 162000 样本）
    private const int MinRunFrames = 10;            // <10 帧（≈0.17s）的 run 丢弃（sherpa 同款）
    private const int FftSize = 512;                // fbank：帧长 400 → 补零到 512（round_to_power_of_two）
    private const double WindowSec = 1.5;           // 声纹滑窗：1.5s 窗
    private const double WindowStepSec = 1.0;       // 1.0s 步长（0.5s 实测 3060 窗/声纹 29s；1.0s 窗数减半，归属精度不受损——每窗仍 1.5s 音频）
    private const double MinWindowSec = 0.5;        // 窗尾最短 0.5s，否则丢弃
    internal const double ClusterThreshold = 0.65;  // 自动模式切树阈值（与旧管线 Threshold=0.65 一致）

    private static readonly int[][] PowersetMapping = BuildPowersetMapping();

    // ORT 会话单例缓存（聚类改为数据级参数，会话与 numSpeakers 解耦，无需按人数换管线）
    private static InferenceSession? _segSession;
    private static InferenceSession? _embSession;
    private static readonly object _initLock = new();

    // Win32 API: 获取 8.3 短路径名（模型路径 ASCII 兜底）
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern int GetShortPathName(string lpszLongPath, char[] lpszShortPath, int cchBuffer);

    // ═══════════════════════════════════════════════════════════
    // 纯函数：powerset 映射 / softmax / argmax / 帧数公式 / 二值化
    // ═══════════════════════════════════════════════════════════

    /// <summary>pyannote powerset 映射：class0=静音，1..3=单说话人，4..6=两人组合</summary>
    private static int[][] BuildPowersetMapping()
    {
        var map = new int[NumPowersetClasses][];
        map[0] = new int[NumSegSpeakers];
        int k = 1;
        for (int i = 1; i <= PowersetMaxClasses; i++)
        {
            if (i == 1)
            {
                for (int j = 0; j < NumSegSpeakers; j++, k++)
                {
                    map[k] = new int[NumSegSpeakers];
                    map[k][j] = 1;
                }
            }
            else
            {
                for (int j = 0; j < NumSegSpeakers; j++)
                {
                    for (int m = j + 1; m < NumSegSpeakers; m++, k++)
                    {
                        map[k] = new int[NumSegSpeakers];
                        map[k][j] = 1;
                        map[k][m] = 1;
                    }
                }
            }
        }
        return map;
    }

    /// <summary>softmax（数值稳定版）。纯函数，便于单元测试。</summary>
    internal static float[] SoftMax(float[] logits)
    {
        var result = new float[logits.Length];
        float max = float.MinValue;
        foreach (var v in logits) if (v > max) max = v;
        double sum = 0;
        for (int i = 0; i < logits.Length; i++) { result[i] = MathF.Exp(logits[i] - max); sum += result[i]; }
        for (int i = 0; i < result.Length; i++) result[i] = (float)(result[i] / sum);
        return result;
    }

    /// <summary>argmax（返回首个最大值下标）。纯函数，便于单元测试。
    /// 注：对 logits 做 argmax 与先 softmax 再 argmax 结果恒等（softmax 单调）。</summary>
    internal static int ArgMax(float[] values)
    {
        int best = 0;
        float bv = values.Length > 0 ? values[0] : float.MinValue;
        for (int i = 1; i < values.Length; i++)
        {
            if (values[i] > bv) { bv = values[i]; best = i; }
        }
        return best;
    }

    /// <summary>
    /// pyannote 分割模型输出帧数公式（SincNet 卷积栈下采样，实测与 ONNX 输出一致：
    /// T=160000→589, 16000→56, 160080→590, 159999→589, 30354432→112421）
    /// </summary>
    internal static int FrameCount(int samples)
    {
        if (samples <= 251) return 0;
        int a = (samples - 251) / 10;
        int b = (a - 2) / 3;
        int c = b / 3;
        int d = (c - 8) / 3;
        return d + 1;
    }

    /// <summary>
    /// 重叠帧网格二值化：count/weight 均值 ≥0.5 置 1（块间重叠区取均值拼接）。
    /// 纯函数，便于单元测试。
    /// </summary>
    internal static byte[] BinarizeGrid(float[] count, float[] weight, int totalFrames)
    {
        var grid = new byte[totalFrames * NumSegSpeakers];
        for (int f = 0; f < totalFrames; f++)
        {
            var w = weight[f];
            if (w <= 0) continue;
            for (int spk = 0; spk < NumSegSpeakers; spk++)
            {
                if (count[f * NumSegSpeakers + spk] / w >= 0.5f)
                    grid[f * NumSegSpeakers + spk] = 1;
            }
        }
        return grid;
    }

    /// <summary>帧下标 → 秒（与 sherpa-onnx C++ ComputeResult 同款映射）</summary>
    private static double FrameToSec(int frame) =>
        frame * (double)ReceptiveFieldShift / TargetSampleRate + 0.5 * ReceptiveFieldSize / TargetSampleRate;

    // ═══════════════════════════════════════════════════════════
    // ORT 会话管理
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 初始化分离管线（线程安全单例，模型只加载一次）。
    /// 保持旧版 GetOrCreatePipeline 的模型路径解析（SttModelManager）与缓存纪律；
    /// 聚类参数不再烘焙进管线，会话与 numSpeakers 解耦。
    /// </summary>
    private static (InferenceSession seg, InferenceSession emb) GetOrCreateSessions()
    {
        lock (_initLock)
        {
            if (_segSession != null && _embSession != null) return (_segSession, _embSession);

            if (!SttModelManager.IsDiarizationModelAvailable())
                throw new InvalidOperationException("说话人分离模型未就绪");

            var (segModel, embModel) = SttModelManager.GetDiarizationModelPaths();

            if (!File.Exists(segModel))
                throw new FileNotFoundException($"分离模型文件不存在: {segModel}");
            if (!File.Exists(embModel))
                throw new FileNotFoundException($"嵌入模型文件不存在: {embModel}");

            // ORT 原生库对非 ASCII 路径同样不稳，沿用 ASCII 兜底策略
            var segPath = EnsureAsciiPath(segModel);
            var embPath = EnsureAsciiPath(embModel);

            var segOptions = new Microsoft.ML.OnnxRuntime.SessionOptions();
            segOptions.AppendExecutionProvider_CPU();
            _segSession = new InferenceSession(segPath, segOptions);

            var embOptions = new Microsoft.ML.OnnxRuntime.SessionOptions();
            embOptions.AppendExecutionProvider_CPU();
            _embSession = new InferenceSession(embPath, embOptions);

            Console.WriteLine("[DiarizationService] ORT 分离管线初始化完成 (pyannote-segmentation-3.0 + campplus, CPU EP)");
            return (_segSession, _embSession);
        }
    }

    /// <summary>
    /// 爆簇保险丝判定（纯函数，便于单元测试）：自动模式下聚类簇数异常多时返回错误消息，正常返回 null。
    /// 背景：重口音/混响录音实测自动模式爆出 54 簇（指定人数路径健康），随后 MergeRareSpeakers
    /// 会把垃圾归属吞并成 2 人。阈值为 8：正常会议很少超过 8 人，超过即为聚类失败信号。
    /// </summary>
    /// <returns>null=正常；非 null=应抛出的异常消息</returns>
    internal static string? CheckClusterExplosion(int? numSpeakers, int distinctSpeakers)
    {
        // 指定人数路径：用户已明确声纹簇数，信任输入（该路径实测质量良好）
        if (numSpeakers.HasValue) return null;

        // 自动模式：0（空音频等）与 ≤8 均视为正常
        if (distinctSpeakers <= 8) return null;

        return $"说话人自动估计失败（识别到 {distinctSpeakers} 个声纹簇，明显异常）。" +
               "请在创建任务时选择录音类型为多人会议并填写实际说话人数后重试。";
    }

    /// <summary>
    /// 对音频做说话人分离，返回合并后的分段列表
    /// </summary>
    /// <param name="wavPath">16kHz mono WAV 文件路径</param>
    /// <param name="numSpeakers">预期说话人数（null=自动）</param>
    /// <param name="ct">取消令牌</param>
    /// <returns>合并后的说话人分段列表</returns>
    public Task<List<SttSegment>> DiarizeAsync(
        string wavPath,
        int? numSpeakers = null,
        CancellationToken ct = default)
    {
        if (!SttModelManager.IsDiarizationModelAvailable())
            throw new InvalidOperationException("说话人分离模型未就绪，请先调用 SttModelManager.EnsureDiarizationModelsAsync()");

        ct.ThrowIfCancellationRequested();

        // 1. 加载音频（手动读取 16kHz mono WAV → float[]）
        var (samples, sampleRate) = ReadWavAsFloats(wavPath);

        ct.ThrowIfCancellationRequested();

        // 检查采样率（pyannote 分割模型固定 16kHz）
        if (sampleRate != TargetSampleRate)
        {
            throw new InvalidOperationException($"采样率不匹配: 期望 {TargetSampleRate}, 实际 {sampleRate}");
        }

        var (segSession, embSession) = GetOrCreateSessions();

        var totalSw = Stopwatch.StartNew();
        Console.WriteLine($"[DiarizationService] 开始分离 ({samples.Length / 16000.0:F1}s 音频, sampleRate={sampleRate})...");

        // 2. pyannote 分块前向 → 全局帧网格多标签（重叠区均值二值化拼接）
        var (grid, totalFrames) = BuildGlobalLabels(samples, segSession, ct);
        var segSw = totalSw.Elapsed.TotalSeconds;
        Console.WriteLine($"[DiarizationService] pyannote 前向完成: {totalFrames} 帧, 耗时 {segSw:F1}s");

        // 3. 帧网格 → 互斥 run 段（多说话人帧清零，每帧至多 1 个说话人）
        var rawSegments = ExtractRuns(grid, totalFrames);
        Console.WriteLine($"[DiarizationService] 原始段数: {rawSegments.Count}");

        ct.ThrowIfCancellationRequested();

        // 4. 滑窗声纹：1.5s 窗 / 1.0s 步长（0.5s 实测窗数过多，1.0s 归属精度等效且声纹耗时减半）逐窗 embedding（fbank 全时间轴一次算好，逐窗 CMN）
        var (winOwner, winEmb, dim) = ComputeWindowEmbeddings(samples, rawSegments, embSession, ct);
        var embSw = totalSw.Elapsed.TotalSeconds - segSw;
        Console.WriteLine($"[DiarizationService] 声纹完成: {winOwner.Count} 窗, 耗时 {embSw:F1}s");

        // 5. 聚类（自动=平均链式+阈值切树；指定人数=球形 k-means）
        var windowLabels = ClusterEmbeddings(winEmb, dim, numSpeakers);
        var cluSw = totalSw.Elapsed.TotalSeconds - segSw - embSw;
        Console.WriteLine($"[DiarizationService] 聚类完成: 耗时 {cluSw:F1}s");

        // 6. 按窗多数投票归属段 → 簇标签按首现顺序重排为连续编号
        var segments = AssignSegmentSpeakers(rawSegments, winOwner, windowLabels);
        var rawSpeakerCount = segments.Select(s => s.Speaker).Distinct().Count();
        Console.WriteLine($"[DiarizationService] 投票后段数: {segments.Count}, 说话人数: {rawSpeakerCount}");

        // 爆簇保险丝：自动模式下聚类爆出异常多簇（实测 54 簇）时，后续 MergeRareSpeakers
        // 会把垃圾归属粗暴吞并成 2 人 → 直接失败，提示用户改用指定人数（SttWorker 已有
        // failed 状态写回路径，此消息会展示给用户）
        var explosion = CheckClusterExplosion(numSpeakers, rawSpeakerCount);
        if (explosion != null)
            throw new InvalidOperationException(explosion);

        // 7. 互斥区间段合并
        var merged = MergeSegments(segments);

        // 8. 合并低频说话人（把只出现很少的说话人合并到主导说话人）
        merged = MergeRareSpeakers(merged);

        Console.WriteLine($"[DiarizationService] 合并后段数: {merged.Count}, 说话人数: {merged.Select(s => s.Speaker).Distinct().Count()}, 总耗时 {totalSw.Elapsed.TotalSeconds:F1}s");

        return Task.FromResult(merged);
    }

    // ═══════════════════════════════════════════════════════════
    // 阶段 1：pyannote 分割（分块直喂 + 重叠帧网格拼接）
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 分块直喂 pyannote，输出全局帧多标签网格（0/1，长度 totalFrames*NumSegSpeakers）。
    /// 块长 ≤1800s，块间重叠 10s；重叠帧按贡献块数取均值 ≥0.5 二值化（无边界断裂）。
    /// </summary>
    private static (byte[] grid, int totalFrames) BuildGlobalLabels(
        float[] samples, InferenceSession segSession, CancellationToken ct)
    {
        int total = samples.Length;
        int totalFrames = FrameCount(total);
        if (totalFrames <= 0) return (Array.Empty<byte>(), 0);

        var count = new float[totalFrames * NumSegSpeakers];
        var weight = new float[totalFrames];
        var inputName = segSession.InputMetadata.Keys.First();

        int blockStart = 0;
        while (true)
        {
            ct.ThrowIfCancellationRequested();
            int s0 = blockStart * ReceptiveFieldShift;
            int s1 = Math.Min(total, (blockStart + MaxBlockFrames) * ReceptiveFieldShift);
            int len = s1 - s0;
            if (len <= 0) break;

            var tensor = new DenseTensor<float>(new[] { 1, 1, len });
            samples.AsSpan(s0, len).CopyTo(tensor.Buffer.Span);

            using var results = segSession.Run(new List<NamedOnnxValue>
            {
                NamedOnnxValue.CreateFromTensor(inputName, tensor),
            });
            var logits = results.First().AsTensor<float>(); // (1, F, 7)
            int frames = (int)logits.Dimensions[1];

            var buf = new float[NumPowersetClasses];
            for (int f = 0; f < frames; f++)
            {
                int gi = blockStart + f;
                if (gi >= totalFrames) break;
                for (int c = 0; c < NumPowersetClasses; c++) buf[c] = logits[0, f, c];
                // softmax 单调，argmax 可直接在 logits 上做（SoftMax 纯函数见上方，测试覆盖）
                var row = PowersetMapping[ArgMax(buf)];
                weight[gi] += 1;
                for (int spk = 0; spk < NumSegSpeakers; spk++)
                {
                    if (row[spk] != 0) count[gi * NumSegSpeakers + spk] += 1;
                }
            }

            if (s1 >= total) break;
            blockStart += MaxBlockFrames - BlockOverlapFrames;
        }

        return (BinarizeGrid(count, weight, totalFrames), totalFrames);
    }

    /// <summary>
    /// 帧网格 → 互斥 run 段：多说话人帧清零（sherpa ExcludeOverlap 同款），随后每说话人
    /// 连续 run（≥MinRunFrames）即一段。段与段天然两两互斥（同一帧至多归属一个说话人）。
    /// </summary>
    private static List<(double start, double end)> ExtractRuns(byte[] grid, int totalFrames)
    {
        var frameSpeaker = new sbyte[totalFrames]; // -1=静音/多说话人帧，否则=说话人
        for (int f = 0; f < totalFrames; f++)
        {
            int sum = 0, last = 0;
            for (int spk = 0; spk < NumSegSpeakers; spk++)
            {
                if (grid[f * NumSegSpeakers + spk] != 0) { sum++; last = spk; }
            }
            frameSpeaker[f] = sum == 1 ? (sbyte)last : (sbyte)-1;
        }

        var segments = new List<(double start, double end)>();
        for (int spk = 0; spk < NumSegSpeakers; spk++)
        {
            int runStart = -1;
            for (int f = 0; f <= totalFrames; f++)
            {
                bool active = f < totalFrames && frameSpeaker[f] == spk;
                if (active)
                {
                    if (runStart < 0) runStart = f;
                }
                else if (runStart >= 0)
                {
                    if (f - runStart >= MinRunFrames)
                        segments.Add((FrameToSec(runStart), FrameToSec(f)));
                    runStart = -1;
                }
            }
        }
        segments.Sort();
        return segments;
    }

    // ═══════════════════════════════════════════════════════════
    // 阶段 2+3：campplus 滑窗声纹（fbank 全时间轴一次计算 + 逐窗 CMN + 批量推理）
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 对每个原始段内部放滑窗（1.5s 窗/1.0s 步长（0.5s 实测窗数过多，1.0s 归属精度等效且声纹耗时减半），尾窗截短，&lt;0.5s 丢弃），逐窗 campplus embedding。
    /// 返回（窗所属段下标列表, 展平嵌入矩阵 n*dim, dim）。
    /// </summary>
    private static (List<int> winOwner, float[] embs, int dim) ComputeWindowEmbeddings(
        float[] samples,
        List<(double start, double end)> rawSegments,
        InferenceSession embSession,
        CancellationToken ct)
    {
        const int embedDim = 192;

        // 滑窗：段内 1.0s 步长（0.5s 实测窗数过多，1.0s 归属精度等效且声纹耗时减半）、1.5s 窗（尾窗截短；剩余不足 MinWindowSec 丢弃）
        var winStart = new List<double>();
        var winEnd = new List<double>();
        var winOwner = new List<int>();
        for (int i = 0; i < rawSegments.Count; i++)
        {
            var (s, e) = rawSegments[i];
            double w = s;
            while (w + MinWindowSec <= e + 1e-9)
            {
                winStart.Add(w);
                winEnd.Add(Math.Min(w + WindowSec, e));
                winOwner.Add(i);
                w += WindowStepSec;
            }
        }
        int n = winStart.Count;
        if (n == 0) return (winOwner, Array.Empty<float>(), embedDim);

        // fbank 在全时间轴上按 160 样本帧移一次算好（窗口起点与其对齐，仅末帧差 ±1）
        var feats = ComputeGlobalLogMel(samples, ct);
        int numFrames = feats.Length / FbankDim;

        // 逐窗切片 + global-mean CMN，按帧数分组批量推理
        var embs = new float[n * embedDim];
        var inputName = embSession.InputMetadata.Keys.First();

        var byLen = new Dictionary<int, List<int>>();
        for (int i = 0; i < n; i++)
        {
            int t0 = (int)(winStart[i] * TargetSampleRate) / 160;
            int t1 = Math.Max(t0 + 1, (int)(winEnd[i] * TargetSampleRate) / 160);
            int frames = Math.Min(t1 - t0, numFrames - t0);
            if (frames <= 0) frames = 1;
            if (!byLen.TryGetValue(frames, out var list)) { list = new List<int>(); byLen[frames] = list; }
            list.Add(i);
        }

        const int batchSize = 64;
        var meanBuf = new float[FbankDim];
        foreach (var (frames, indices) in byLen)
        {
            for (int off = 0; off < indices.Count; off += batchSize)
            {
                ct.ThrowIfCancellationRequested();
                int b = Math.Min(batchSize, indices.Count - off);
                var tensor = new DenseTensor<float>(new[] { b, frames, FbankDim });
                for (int bi = 0; bi < b; bi++)
                {
                    int wi = indices[off + bi];
                    int t0 = Math.Min((int)(winStart[wi] * TargetSampleRate) / 160, numFrames - frames);
                    // global-mean CMN（逐窗按 bin 减均值，campplus metadata: feature_normalize_type=global-mean）
                    Array.Clear(meanBuf);
                    for (int t = 0; t < frames; t++)
                    {
                        int src = (t0 + t) * FbankDim;
                        for (int d = 0; d < FbankDim; d++) meanBuf[d] += feats[src + d];
                    }
                    for (int d = 0; d < FbankDim; d++) meanBuf[d] /= frames;
                    for (int t = 0; t < frames; t++)
                    {
                        int src = (t0 + t) * FbankDim;
                        for (int d = 0; d < FbankDim; d++)
                            tensor[bi, t, d] = feats[src + d] - meanBuf[d];
                    }
                }

                using var results = embSession.Run(new List<NamedOnnxValue>
                {
                    NamedOnnxValue.CreateFromTensor(inputName, tensor),
                });
                var output = results.First().AsTensor<float>(); // (B, 192)
                for (int bi = 0; bi < b; bi++)
                {
                    int wi = indices[off + bi];
                    for (int d = 0; d < embedDim; d++) embs[wi * embedDim + d] = output[bi, d];
                }
            }
        }

        return (winOwner, embs, embedDim);
    }

    private const int FbankDim = 80;

    // ── kaldi fbank（与 sherpa-onnx FeatureExtractor 默认配置一致） ──

    private static readonly float[] PoveyWindow = BuildPoveyWindow();
    private static readonly float[] MelBank = BuildMelBank();
    private static readonly int[] FftBitRev = BuildBitRev();
    private static readonly float[] FftCosTable = BuildFftCosTable();
    private static readonly float[] FftSinTable = BuildFftSinTable();

    private static float[] BuildPoveyWindow()
    {
        var w = new float[400];
        for (int i = 0; i < 400; i++)
            w[i] = MathF.Pow(0.5f - 0.5f * MathF.Cos(2 * MathF.PI * i / 399), 0.85f);
        return w;
    }

    private static float[] BuildMelBank()
    {
        // kaldi MelBanks：三角滤波，mel 域线性（无 VTLN），low_freq=20, high_freq=Nyquist-400
        const int nfftHalf = FftSize / 2 + 1;
        var bank = new float[FbankDim * nfftHalf];
        double MelScale(double f) => 1127.0 * Math.Log(1.0 + f / 700.0);
        var hz = new double[FbankDim + 2];
        double lowMel = MelScale(20.0), highMel = MelScale(8000.0 - 400.0);
        for (int i = 0; i <= FbankDim + 1; i++)
            hz[i] = 700.0 * (Math.Exp((lowMel + (highMel - lowMel) * i / (FbankDim + 1)) / 1127.0) - 1.0);
        for (int b = 0; b < FbankDim; b++)
        {
            double left = hz[b], center = hz[b + 1], right = hz[b + 2];
            for (int k = 0; k < nfftHalf; k++)
            {
                double freq = k * (double)TargetSampleRate / FftSize;
                double up = (freq - left) / Math.Max(center - left, 1e-10);
                double down = (right - freq) / Math.Max(right - center, 1e-10);
                bank[b * nfftHalf + k] = (float)Math.Max(0, Math.Min(up, down));
            }
        }
        return bank;
    }

    private static int[] BuildBitRev()
    {
        var rev = new int[FftSize];
        int bits = 0; while ((1 << bits) < FftSize) bits++;
        for (int i = 0; i < FftSize; i++)
        {
            int r = 0;
            for (int b = 0; b < bits; b++) if ((i & (1 << b)) != 0) r |= 1 << (bits - 1 - b);
            rev[i] = r;
        }
        return rev;
    }

    private static float[] BuildFftCosTable()
    {
        var t = new float[FftSize / 2];
        for (int i = 0; i < FftSize / 2; i++) t[i] = MathF.Cos(2 * MathF.PI * i / FftSize);
        return t;
    }

    private static float[] BuildFftSinTable()
    {
        var t = new float[FftSize / 2];
        for (int i = 0; i < FftSize / 2; i++) t[i] = MathF.Sin(2 * MathF.PI * i / FftSize);
        return t;
    }

    /// <summary>512 点复数 FFT（迭代 radix-2，原位）</summary>
    private static void Fft(float[] re, float[] im)
    {
        for (int i = 0; i < FftSize; i++)
        {
            int j = FftBitRev[i];
            if (j > i)
            {
                (re[i], re[j]) = (re[j], re[i]);
                (im[i], im[j]) = (im[j], im[i]);
            }
        }
        for (int len = 2; len <= FftSize; len <<= 1)
        {
            int half = len >> 1, step = FftSize / len;
            for (int i = 0; i < FftSize; i += len)
            {
                for (int k = 0; k < half; k++)
                {
                    float wr = FftCosTable[k * step], wi = -FftSinTable[k * step];
                    int a = i + k, b = a + half;
                    float xr = re[b] * wr - im[b] * wi;
                    float xi = re[b] * wi + im[b] * wr;
                    re[b] = re[a] - xr; im[b] = im[a] - xi;
                    re[a] += xr; im[a] += xi;
                }
            }
        }
    }

    /// <summary>
    /// 全时间轴 kaldi fbank（log-mel）：povey 窗 25ms/10ms、snip_edges=false（末帧零填充）、
    /// remove_dc_offset、preemph 0.97、512 点 FFT、power spectrum、80 mel、log。
    /// 配置与 sherpa-onnx SpeakerEmbeddingExtractor（campplus）一致。
    /// </summary>
    private static float[] ComputeGlobalLogMel(float[] samples, CancellationToken ct)
    {
        int n = samples.Length;
        int numFrames = (n + 80) / 160;
        if (numFrames <= 0) return Array.Empty<float>();
        var feats = new float[numFrames * FbankDim];
        const int nfftHalf = FftSize / 2 + 1;

        System.Threading.Tasks.Parallel.ForEach(
            System.Collections.Concurrent.Partitioner.Create(0, numFrames),
            new ParallelOptions { CancellationToken = ct },
            range =>
            {
                var frame = new float[400];
                var re = new float[FftSize];
                var im = new float[FftSize];
                var power = new float[nfftHalf];
                for (int t = range.Item1; t < range.Item2; t++)
                {
                    int off = t * 160;
                    // 取帧（越界部分零填充，snip_edges=false）
                    for (int i = 0; i < 400; i++)
                        frame[i] = off + i < n ? samples[off + i] : 0f;

                    // remove_dc_offset
                    float mean = 0;
                    for (int i = 0; i < 400; i++) mean += frame[i];
                    mean /= 400;
                    for (int i = 0; i < 400; i++) frame[i] -= mean;

                    // preemph 0.97（kaldi：首帧乘 (1-0.97)）
                    var pre0 = frame[0];
                    frame[0] = pre0 * 0.03f;
                    for (int i = 400 - 1; i >= 1; i--) frame[i] = frame[i] - 0.97f * frame[i - 1];

                    // povey 窗
                    for (int i = 0; i < 400; i++) frame[i] *= PoveyWindow[i];

                    // FFT → power spectrum
                    for (int i = 0; i < 400; i++) { re[i] = frame[i]; im[i] = 0; }
                    for (int i = 400; i < FftSize; i++) { re[i] = 0; im[i] = 0; }
                    Fft(re, im);
                    for (int k = 0; k < nfftHalf; k++) power[k] = re[k] * re[k] + im[k] * im[k];

                    // mel + log
                    int dst = t * FbankDim;
                    for (int b = 0; b < FbankDim; b++)
                    {
                        float e = 0;
                        int baseIdx = b * nfftHalf;
                        for (int k = 0; k < nfftHalf; k++) e += MelBank[baseIdx + k] * power[k];
                        feats[dst + b] = MathF.Log(Math.Max(e, 1e-10f));
                    }
                }
            });

        return feats;
    }

    // ═══════════════════════════════════════════════════════════
    // 阶段 4：聚类（自动=NN-chain 平均链式+阈值切树；指定人数=球形 k-means）
    // ═══════════════════════════════════════════════════════════

    /// <summary>返回每个窗口的簇标签（0 基）</summary>
    private static int[] ClusterEmbeddings(float[] embs, int dim, int? numSpeakers)
    {
        int n = embs.Length / dim;
        if (n == 0) return Array.Empty<int>();

        // L2 归一（FastClustering 同款：归一后点积=余弦）
        var x = new float[n * dim];
        Array.Copy(embs, x, embs.Length);
        for (int i = 0; i < n; i++)
        {
            double norm = 0;
            for (int d = 0; d < dim; d++) norm += (double)x[i * dim + d] * x[i * dim + d];
            norm = Math.Sqrt(norm);
            if (norm > 1e-12)
                for (int d = 0; d < dim; d++) x[i * dim + d] = (float)(x[i * dim + d] / norm);
        }

        int[] labels;
        if (numSpeakers.HasValue && numSpeakers.Value > 0)
        {
            labels = SphericalKMeans(x, n, dim, numSpeakers.Value);
        }
        else
        {
            var dist = CondensedCosineDistance(x, n, dim);
            var (heights, a, b) = NNChainAverage(dist, n);
            labels = CutTreeCdist(n, a, b, heights, ClusterThreshold);
        }

        // 簇号压缩为连续 0..k-1（按点序首现）
        return RemapByFirstAppearance(labels, n);
    }

    /// <summary>压缩凝聚距离矩阵（n*(n-1)/2）：1 - cosine（负值截 0，FastClustering 同款）</summary>
    internal static float[] CondensedCosineDistance(float[] x, int n, int dim)
    {
        var dist = new float[n * (n - 1) / 2];
        int idx = 0;
        for (int i = 0; i < n; i++)
        {
            for (int j = i + 1; j < n; j++)
            {
                double dot = 0;
                for (int d = 0; d < dim; d++) dot += (double)x[i * dim + d] * x[j * dim + d];
                var dissim = (float)(1.0 - dot);
                dist[idx++] = dissim < 0 ? 0 : dissim;
            }
        }
        return dist;
    }

    /// <summary>凝聚矩阵下标（i&lt;j）：n*i - i*(i+1)/2 + (j-i-1)；对称访问安全</summary>
    private static int CondensedIdx(int n, int i, int j) =>
        i < j ? n * i - i * (i + 1) / 2 + (j - i - 1)
              : n * j - j * (j + 1) / 2 + (i - j - 1);

    /// <summary>
    /// 平均链式（average linkage）凝聚聚类的 NN-chain 算法（O(n²)）。
    /// 移植自 fastcluster 语义，已在沙箱与 scipy linkage(method="average") 100% 划分一致验证。
    /// 返回按合并顺序的 (height, a, b)。
    /// </summary>
    internal static (float[] heights, int[] a, int[] b) NNChainAverage(float[] dist, int n)
    {
        var size = new double[n];
        var active = new bool[n];
        for (int i = 0; i < n; i++) { size[i] = 1; active[i] = true; }

        var heights = new float[n - 1];
        var aOf = new int[n - 1];
        var bOf = new int[n - 1];
        var chain = new List<int>(64);
        int remaining = n, m = 0;

        while (remaining > 1)
        {
            int start = 0;
            while (!active[start]) start++;
            chain.Clear();
            chain.Add(start);
            int i = start, j;
            while (true)
            {
                // 活跃簇中距 i 最近者
                float bd = float.MaxValue;
                j = -1;
                for (int z = 0; z < n; z++)
                {
                    if (!active[z] || z == i) continue;
                    float d = dist[CondensedIdx(n, i, z)];
                    if (d < bd) { bd = d; j = z; }
                }
                // j 已在链上（链倒数第二）→ i、j 互为最近邻，结束本链
                if (chain.Count >= 2 && j == chain[chain.Count - 2]) break;
                chain.Add(j);
                i = j;
            }

            float h = dist[CondensedIdx(n, i, j)];
            heights[m] = h; aOf[m] = i; bOf[m] = j; m++;

            // Lance-Williams 更新（average）：d(merged,z) = (ni*d(i,z)+nj*d(j,z))/(ni+nj)
            double ni = size[i], nj = size[j];
            int slot = Math.Min(i, j), dead = Math.Max(i, j);
            for (int z = 0; z < n; z++)
            {
                if (!active[z] || z == i || z == j) continue;
                float merged = (float)((ni * dist[CondensedIdx(n, i, z)] + nj * dist[CondensedIdx(n, j, z)]) / (ni + nj));
                dist[CondensedIdx(n, slot, z)] = merged;
            }
            active[dead] = false;
            size[slot] = ni + nj;
            remaining--;
        }

        return (heights, aOf, bOf);
    }

    /// <summary>按高度阈值切树（fastcluster cutree_cdist 同款）：height ≤ threshold 的合并生效</summary>
    internal static int[] CutTreeCdist(int n, int[] a, int[] b, float[] heights, double threshold)
    {
        var parent = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
        for (int m = 0; m < heights.Length; m++)
        {
            if (heights[m] > threshold) continue;
            int ra = FindRoot(parent, a[m]), rb = FindRoot(parent, b[m]);
            if (ra != rb) parent[Math.Max(ra, rb)] = Math.Min(ra, rb);
        }
        var labels = new int[n];
        for (int i = 0; i < n; i++) labels[i] = FindRoot(parent, i);
        return labels;
    }

    private static int FindRoot(int[] parent, int x)
    {
        while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; }
        return x;
    }

    /// <summary>
    /// 球形 k-means（余弦，k-means++ 初始化，固定种子 + 3 次重启取最优）。
    /// 用于指定人数路径：实测平均链式树的树顶会被离群窗占据（两主簇互距 0.68 &lt; 离群距离
    /// 0.70+），maxclust 切树会塌成 1+N 单例；质心式聚类对离群稳健。
    /// </summary>
    internal static int[] SphericalKMeans(float[] x, int n, int dim, int k)
    {
        var rng = new Random(12345);
        if (n <= k)
        {
            var trivial = new int[n];
            for (int i = 0; i < n; i++) trivial[i] = i;
            return trivial;
        }

        int[]? bestLabels = null;
        double bestInertia = double.NegativeInfinity;

        for (int restart = 0; restart < 3; restart++)
        {
            // k-means++ 初始化
            var centroids = new float[k * dim];
            var chosen = new List<int> { rng.Next(n) };
            for (int c = 0; c < k; c++)
            {
                if (c < chosen.Count)
                {
                    for (int d = 0; d < dim; d++) centroids[c * dim + d] = x[chosen[c] * dim + d];
                }
                if (c == k - 1) break;
                // D² 加权选下一个（余弦距离 = 1 - 点积）
                var mind = new double[n];
                double total = 0;
                for (int i = 0; i < n; i++)
                {
                    double best = double.MaxValue;
                    foreach (var ci in chosen)
                    {
                        double dot = 0;
                        for (int d = 0; d < dim; d++) dot += (double)x[i * dim + d] * x[ci * dim + d];
                        double dd = 1.0 - dot;
                        if (dd < best) best = dd;
                    }
                    mind[i] = Math.Max(0, best);
                    total += mind[i];
                }
                int next;
                if (total <= 1e-12) next = rng.Next(n);
                else
                {
                    double r = rng.NextDouble() * total, acc = 0;
                    next = n - 1;
                    for (int i = 0; i < n; i++) { acc += mind[i]; if (acc >= r) { next = i; break; } }
                }
                chosen.Add(next);
            }

            // Lloyd 迭代
            var labels = new int[n];
            for (int iter = 0; iter < 50; iter++)
            {
                for (int i = 0; i < n; i++)
                {
                    double bd = double.NegativeInfinity; int bj = 0;
                    for (int c = 0; c < k; c++)
                    {
                        double dot = 0;
                        for (int d = 0; d < dim; d++) dot += (double)x[i * dim + d] * centroids[c * dim + d];
                        if (dot > bd) { bd = dot; bj = c; }
                    }
                    labels[i] = bj;
                }
                var sums = new double[k * dim];
                var counts = new int[k];
                for (int i = 0; i < n; i++)
                {
                    counts[labels[i]]++;
                    for (int d = 0; d < dim; d++) sums[labels[i] * dim + d] += x[i * dim + d];
                }
                for (int c = 0; c < k; c++)
                {
                    if (counts[c] == 0)
                    {
                        // 空簇：取离当前质心最远的点
                        int far = 0; double fd = double.MaxValue;
                        for (int i = 0; i < n; i++)
                        {
                            double dot = 0;
                            for (int d = 0; d < dim; d++) dot += (double)x[i * dim + d] * centroids[labels[i] * dim + d];
                            if (dot < fd) { fd = dot; far = i; }
                        }
                        for (int d = 0; d < dim; d++) sums[c * dim + d] = x[far * dim + d];
                        counts[c] = 1;
                    }
                    double norm = 0;
                    for (int d = 0; d < dim; d++) norm += sums[c * dim + d] * sums[c * dim + d];
                    norm = Math.Sqrt(Math.Max(norm, 1e-12));
                    for (int d = 0; d < dim; d++) centroids[c * dim + d] = (float)(sums[c * dim + d] / norm);
                }
            }

            double inertia = 0;
            for (int i = 0; i < n; i++)
            {
                for (int d = 0; d < dim; d++)
                    inertia += (double)x[i * dim + d] * centroids[labels[i] * dim + d];
            }
            if (inertia > bestInertia) { bestInertia = inertia; bestLabels = labels; }
        }

        // 簇号压缩（k-means 标签已 0..k-1，但可能有空簇 → 重排为实际出现的编号）
        return RemapByFirstAppearance(bestLabels!, n);
    }

    /// <summary>簇标签压缩：按点序首现顺序映射为连续 0..k-1。纯函数，便于单元测试。</summary>
    internal static int[] RemapByFirstAppearance(int[] labels, int n)
    {
        var mapping = new Dictionary<int, int>();
        var result = new int[n];
        for (int i = 0; i < n; i++)
        {
            if (!mapping.TryGetValue(labels[i], out var mapped)) { mapped = mapping.Count; mapping[labels[i]] = mapped; }
            result[i] = mapped;
        }
        return result;
    }

    // ═══════════════════════════════════════════════════════════
    // 阶段 5：投票归属 + 互斥区间合并
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 按窗多数投票归属段：每段的说话人 = 其全部窗口簇标签的多数（窗口都在段内）。
    /// 无窗口的段（&lt;0.5s）归属时间上最近的有票段。随后簇标签按首现顺序重排为连续编号。
    /// 纯逻辑（不含模型调用），便于单元测试。
    /// </summary>
    internal static List<SttSegment> AssignSegmentSpeakers(
        List<(double start, double end)> rawSegments,
        List<int> winOwner,
        int[] windowLabels)
    {
        var votes = new Dictionary<int, int>[rawSegments.Count];
        for (int i = 0; i < votes.Length; i++) votes[i] = new Dictionary<int, int>();
        for (int w = 0; w < winOwner.Count && w < windowLabels.Length; w++)
        {
            var v = votes[winOwner[w]];
            v.TryGetValue(windowLabels[w], out var c);
            v[windowLabels[w]] = c + 1;
        }

        var labels = new int?[rawSegments.Count];
        for (int i = 0; i < rawSegments.Count; i++)
        {
            int best = -1, bestCount = 0;
            foreach (var (cluster, c) in votes[i])
            {
                if (c > bestCount) { bestCount = c; best = cluster; }
            }
            labels[i] = best < 0 ? null : best;
        }

        // 无票段 → 时间上最近的有票段
        var voted = new List<int>();
        for (int i = 0; i < rawSegments.Count; i++) if (labels[i].HasValue) voted.Add(i);
        for (int i = 0; i < rawSegments.Count; i++)
        {
            if (labels[i].HasValue || voted.Count == 0) continue;
            int nearest = voted[0];
            double bd = double.MaxValue;
            foreach (var v in voted)
            {
                var gap = Math.Min(
                    Math.Abs(rawSegments[v].start - rawSegments[i].end),
                    Math.Abs(rawSegments[i].start - rawSegments[v].end));
                if (gap < bd) { bd = gap; nearest = v; }
            }
            labels[i] = labels[nearest];
        }

        var segments = new List<SttSegment>();
        for (int i = 0; i < rawSegments.Count; i++)
        {
            var lbl = labels[i];
            if (!lbl.HasValue) continue;
            segments.Add(new SttSegment
            {
                Speaker = lbl.Value,
                Start = rawSegments[i].start,
                End = rawSegments[i].end,
            });
        }

        // 簇标签 → 连续编号（按段首现顺序）
        var remap = new Dictionary<int, int>();
        foreach (var seg in segments)
        {
            if (!remap.TryGetValue(seg.Speaker, out var mapped)) { mapped = remap.Count; remap[seg.Speaker] = mapped; }
            seg.Speaker = mapped;
        }
        return segments;
    }

    /// <summary>
    /// 互斥区间段合并：把碎段合并成话轮。
    /// 步骤：1) 同说话人相邻段 gap&lt;gapThreshold 取时间并集（互斥区间写法，替代旧实现产生
    /// 35.8% 重叠的扩张式合并）；2) 吸收超短段（duration&lt;shortThreshold）到相邻段（保持旧语义）；
    /// 3) 跨说话人互斥裁剪（后段起点不得早于前段终点，保证输出两两 overlap=0）。
    /// </summary>
    public static List<SttSegment> MergeSegments(List<SttSegment> rawSegments, double shortThreshold = 1.2, double gapThreshold = 2.0)
    {
        if (rawSegments.Count == 0) return rawSegments;

        // Step 1: 同说话人相邻段取时间并集（gap < gapThreshold，严格小于保持旧管线边界语义）
        var unioned = new List<SttSegment>();
        foreach (var group in rawSegments.GroupBy(s => s.Speaker))
        {
            SttSegment? cur = null;
            foreach (var seg in group.OrderBy(s => s.Start))
            {
                if (cur != null && seg.Start - cur.End < gapThreshold)
                {
                    if (seg.End > cur.End) cur.End = seg.End;
                }
                else
                {
                    cur = new SttSegment { Speaker = seg.Speaker, Start = seg.Start, End = seg.End };
                    unioned.Add(cur);
                }
            }
        }
        unioned.Sort((x, y) => x.Start.CompareTo(y.Start));

        // Step 2: 吸收超短段（总数 >2 时才吸收，保持旧语义）
        if (unioned.Count > 2)
        {
            var absorbed = new List<SttSegment>();
            for (int i = 0; i < unioned.Count; i++)
            {
                var seg = unioned[i];
                if (seg.End - seg.Start < shortThreshold)
                {
                    var prev = absorbed.Count > 0 ? absorbed[^1] : null;
                    var next = i + 1 < unioned.Count ? unioned[i + 1] : null;

                    if (prev != null && prev.Speaker == seg.Speaker && seg.Start - prev.End < gapThreshold)
                    {
                        prev.End = Math.Max(prev.End, seg.End);
                        continue;
                    }
                    if (next != null && next.Speaker == seg.Speaker && next.Start - seg.End < gapThreshold)
                    {
                        next.Start = seg.Start;
                        continue;
                    }
                    if (prev != null && next != null)
                    {
                        var overlapPrev = Math.Max(0, Math.Min(prev.End, seg.End) - Math.Max(prev.Start, seg.Start));
                        var overlapNext = Math.Max(0, Math.Min(next.End, seg.End) - Math.Max(next.Start, seg.Start));
                        if (overlapPrev >= overlapNext) prev.End = Math.Max(prev.End, seg.End);
                        else next.Start = seg.Start;
                        continue;
                    }
                    if (prev != null) { prev.End = Math.Max(prev.End, seg.End); continue; }
                    if (next != null) { next.Start = seg.Start; continue; }
                }
                absorbed.Add(new SttSegment { Speaker = seg.Speaker, Start = seg.Start, End = seg.End });
            }
            absorbed.Sort((x, y) => x.Start.CompareTo(y.Start));
            unioned = absorbed;
        }

        // Step 3: 互斥裁剪——后段起点不得早于前段终点（保证两两 overlap=0）
        var result = new List<SttSegment>();
        foreach (var seg in unioned)
        {
            var start = seg.Start;
            if (result.Count > 0 && start < result[^1].End) start = result[^1].End;
            if (seg.End - start <= 0) continue;
            result.Add(new SttSegment { Speaker = seg.Speaker, Start = start, End = seg.End });
        }
        return result;
    }

    /// <summary>
    /// 合并低频说话人：把说话时间占比 &lt; 5% 或总时长 &lt; 15s 的说话人合并到时间上最相邻的主导说话人。
    /// 解决聚类阈值不够导致 2 人通话被拆成 8+ 人的问题。
    /// </summary>
    public static List<SttSegment> MergeRareSpeakers(List<SttSegment> segments, double minDurationSec = 15.0, double minRatio = 0.05)
    {
        if (segments.Count == 0) return segments;

        var totalDuration = segments.Sum(s => s.End - s.Start);
        if (totalDuration <= 0) return segments;

        // 计算每个说话人的总时长
        var speakerDurations = segments
            .GroupBy(s => s.Speaker)
            .ToDictionary(g => g.Key, g => g.Sum(s => s.End - s.Start));

        // 找出低频说话人
        var rareSpeakers = speakerDurations
            .Where(kvp => kvp.Value < minDurationSec || kvp.Value / totalDuration < minRatio)
            .Select(kvp => kvp.Key)
            .ToList();

        if (rareSpeakers.Count == 0) return segments;

        // 找出主导说话人（时长最长的 2 个）
        var dominantSpeakers = speakerDurations
            .Where(kvp => !rareSpeakers.Contains(kvp.Key))
            .OrderByDescending(kvp => kvp.Value)
            .Select(kvp => kvp.Key)
            .ToList();

        // 如果没有主导说话人（所有都是低频），保留时长最长的 2 个
        if (dominantSpeakers.Count == 0)
        {
            dominantSpeakers = speakerDurations
                .OrderByDescending(kvp => kvp.Value)
                .Take(2)
                .Select(kvp => kvp.Key)
                .ToList();
            rareSpeakers = speakerDurations.Keys
                .Where(s => !dominantSpeakers.Contains(s))
                .ToList();
        }

        if (rareSpeakers.Count == 0) return segments;

        // 为每个低频说话人找最相邻的主导说话人
        var speakerMap = new Dictionary<int, int>(); // rare → dominant
        foreach (var rare in rareSpeakers)
        {
            var rareSegments = segments.Where(s => s.Speaker == rare).OrderBy(s => s.Start).ToList();
            if (rareSegments.Count == 0) continue;

            // 找时间上最相邻的主导说话人段
            int bestDominant = dominantSpeakers.First();
            double bestOverlap = -1;

            foreach (var dominant in dominantSpeakers)
            {
                var dominantSegments = segments.Where(s => s.Speaker == dominant).OrderBy(s => s.Start).ToList();
                double overlapScore = 0;

                foreach (var rSeg in rareSegments)
                {
                    foreach (var dSeg in dominantSegments)
                    {
                        // 计算时间接近度：gap 越小越好
                        var gap = Math.Max(0, Math.Max(rSeg.Start - dSeg.End, dSeg.Start - rSeg.End));
                        overlapScore += 1.0 / (1.0 + gap);
                    }
                }

                if (overlapScore > bestOverlap)
                {
                    bestOverlap = overlapScore;
                    bestDominant = dominant;
                }
            }

            speakerMap[rare] = bestDominant;
        }

        // 应用映射
        var result = segments.Select(s => new SttSegment
        {
            Speaker = speakerMap.TryGetValue(s.Speaker, out var mapped) ? mapped : s.Speaker,
            Start = s.Start,
            End = s.End,
        }).ToList();

        // 重新合并（因为合并后可能产生新的可合并段）
        result = MergeSegments(result);

        Console.WriteLine($"[DiarizationService] 低频说话人合并: {rareSpeakers.Count} 个 → 主导说话人, 映射: {string.Join(", ", speakerMap.Select(kvp => $"{kvp.Key}→{kvp.Value}"))}");

        return result;
    }

    /// <summary>
    /// 按说话人分段切分音频，每段输出一个临时 WAV 文件
    /// </summary>
    public async Task<List<(SttSegment segment, string wavPath)>> SplitAudioBySpeakersAsync(
        string wavPath,
        List<SttSegment> segments,
        CancellationToken ct = default)
    {
        var result = new List<(SttSegment, string)>();
        var tempDir = Path.Combine(Path.GetTempPath(), $"stt_split_{Guid.NewGuid():N}");
        Directory.CreateDirectory(tempDir);

        for (int i = 0; i < segments.Count; i++)
        {
            ct.ThrowIfCancellationRequested();
            var seg = segments[i];
            var segWavPath = Path.Combine(tempDir, $"seg_{i:000}_spk{seg.Speaker}.wav");

            // 用 ffmpeg 切分
            var args = $"-y -i \"{wavPath}\" -ss {seg.Start:F3} -to {seg.End:F3} -ac 1 -ar 16000 -c:a pcm_s16le \"{segWavPath}\"";
            var psi = new ProcessStartInfo
            {
                FileName = "ffmpeg",
                Arguments = args,
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardError = true,
            };
            using var process = Process.Start(psi);
            if (process != null)
            {
                // 先启动 stderr 排水再等退出：否则 stderr 写满管道缓冲区（约 4KB）
                // 后 ffmpeg 阻塞在写入上永不退出 → 父进程 WaitForExitAsync 死锁
                var errTask = process.StandardError.ReadToEndAsync(ct);
                await process.WaitForExitAsync(ct);
                var stderr = await errTask;
                if (process.ExitCode != 0)
                {
                    Console.Error.WriteLine($"[DiarizationService] 切分段 {i} 失败: {Common.Sanitize(stderr)}");
                    continue;
                }
            }

            if (File.Exists(segWavPath))
                result.Add((seg, segWavPath));
        }

        return result;
    }

    /// <summary>
    /// 读取 16kHz mono WAV 文件为 float[] 数组（-1.0 ~ 1.0 范围）
    /// </summary>
    private static (float[] samples, int sampleRate) ReadWavAsFloats(string wavPath)
    {
        using var fs = File.OpenRead(wavPath);
        using var br = new BinaryReader(fs);

        // RIFF header
        var riff = br.ReadBytes(4);
        if (System.Text.Encoding.ASCII.GetString(riff) != "RIFF")
            throw new ArgumentException("不是有效的 WAV 文件");
        br.ReadUInt32(); // file size
        var wave = br.ReadBytes(4);
        if (System.Text.Encoding.ASCII.GetString(wave) != "WAVE")
            throw new ArgumentException("不是有效的 WAV 文件");

        // Parse chunks
        int sampleRate = 0, bitsPerSample = 0, numChannels = 0;
        byte[]? dataBytes = null;

        while (br.BaseStream.Position < br.BaseStream.Length)
        {
            var chunkId = System.Text.Encoding.ASCII.GetString(br.ReadBytes(4));
            var chunkSize = br.ReadInt32();

            if (chunkId == "fmt ")
            {
                var audioFormat = br.ReadUInt16();
                numChannels = br.ReadUInt16();
                sampleRate = (int)br.ReadUInt32();
                br.ReadUInt32(); // byte rate
                br.ReadUInt16(); // block align
                bitsPerSample = br.ReadUInt16();
                if (chunkSize > 16) br.ReadBytes(chunkSize - 16);
            }
            else if (chunkId == "data")
            {
                dataBytes = br.ReadBytes(chunkSize);
            }
            else
            {
                br.ReadBytes(chunkSize);
            }
        }

        if (dataBytes == null) throw new ArgumentException("WAV 文件没有 data chunk");
        if (bitsPerSample != 16) throw new ArgumentException($"只支持 16-bit PCM, 当前 {bitsPerSample}");

        var numSamples = dataBytes.Length / (bitsPerSample / 8);
        var samples = new float[numSamples];
        for (int i = 0; i < numSamples; i++)
        {
            short val = BitConverter.ToInt16(dataBytes, i * 2);
            samples[i] = val / 32768f;
        }

        // 如果是多通道，取第一个通道
        if (numChannels > 1)
        {
            var mono = new float[numSamples / numChannels];
            for (int i = 0; i < mono.Length; i++)
                mono[i] = samples[i * numChannels];
            samples = mono;
        }

        return (samples, sampleRate);
    }

    /// <summary>
    /// 确保路径只含 ASCII 字符。ONNX Runtime 原生库在中文 Windows 上对非 ASCII 路径不稳，
    /// 策略与旧版一致：
    /// 1. 路径全 ASCII → 直接返回
    /// 2. 尝试 GetShortPathName（8.3 短路径）→ 如果短路径全 ASCII → 返回
    /// 3. 短路径仍含中文 → 复制文件到 C:\ProgramData\EngineeringManager\stt-models\
    /// </summary>
    private static string EnsureAsciiPath(string originalPath)
    {
        // 1. 全 ASCII → 直接返回
        if (originalPath.All(c => c < 128))
            return originalPath;

        // 2. 尝试 8.3 短路径
        var buffer = new char[260];
        var len = GetShortPathName(originalPath, buffer, buffer.Length);
        if (len > 0)
        {
            var shortPath = new string(buffer, 0, len);
            if (shortPath.All(c => c < 128))
            {
                Console.WriteLine($"[DiarizationService] 路径含非 ASCII，使用短路径: {shortPath}");
                return shortPath;
            }
        }

        // 3. 复制到 ASCII 安全目录
        var asciiBase = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
            "EngineeringManager", "stt-models");
        Directory.CreateDirectory(asciiBase);

        var fileName = Path.GetFileName(originalPath);
        var asciiPath = Path.Combine(asciiBase, fileName);

        if (!File.Exists(asciiPath) || new FileInfo(asciiPath).Length != new FileInfo(originalPath).Length)
        {
            File.Copy(originalPath, asciiPath, overwrite: true);
            Console.WriteLine($"[DiarizationService] 模型文件已复制到 ASCII 路径: {asciiPath}");
        }

        return asciiPath;
    }

    /// <summary>清理切分的临时音频文件</summary>
    public static void CleanupTempFiles(List<string> tempPaths)
    {
        foreach (var path in tempPaths)
        {
            try
            {
                if (File.Exists(path)) File.Delete(path);
                var dir = Path.GetDirectoryName(path);
                if (dir != null && Directory.Exists(dir) && !Directory.EnumerateFileSystemEntries(dir).Any())
                    Directory.Delete(dir);
            }
            catch { }
        }
    }
}
