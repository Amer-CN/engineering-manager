using System.Diagnostics;
using System.Runtime.InteropServices;
using SherpaOnnx;

namespace EngineeringManager.Api.Services.Stt;

/// <summary>
/// 说话人分离服务（纯 C# 实现，使用 sherpa-onnx .NET 绑定，无 Python 依赖）
///
/// 流程：加载 WAV → sherpa-onnx pyannote 分割 + campplus 嵌入 → 聚类 → 段合并 → 输出
///
/// 段合并算法（解决 52 碎段问题）：
/// 1. 按 start 排序
/// 2. 合并相邻同说话人段（gap < 2s）
/// 3. 吸收超短段（duration < 1.2s）到时间上重叠最多的主导说话人段
/// 4. 最终输出"话轮"列表（通常 10-20 段）
///
/// 注意：sherpa-onnx C++ 库不支持含非 ASCII 字符的路径（如中文目录名），
/// 需通过 EnsureAsciiPath 将模型文件复制到纯 ASCII 路径后使用。
/// </summary>
public class DiarizationService
{
    private static OfflineSpeakerDiarization? _diarization;
    private static readonly object _initLock = new();

    // 指定人数管线缓存：_numClustersValue 记录当前缓存管线对应的 numSpeakers 值，
    // 避免每次 DiarizeAsync 都 new 一个 OfflineSpeakerDiarization（泄漏）
    private static OfflineSpeakerDiarization? _numClustersPipeline;
    private static int? _numClustersValue;

    // Win32 API: 获取 8.3 短路径名（可能仍含中文，不如复制可靠）
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern int GetShortPathName(string lpszLongPath, char[] lpszShortPath, int cchBuffer);

    /// <summary>
    /// 初始化分离管线（线程安全单例，模型只加载一次）
    /// </summary>
    private static OfflineSpeakerDiarization GetOrCreatePipeline(int? numSpeakers = null)
    {
        lock (_initLock)
        {
            // 如果指定了说话人数，需要创建带 NumClusters 的管线
            // 如果没指定，用默认的 Threshold 管线
            if (_diarization != null && !numSpeakers.HasValue) return _diarization;

            // 指定人数模式：值与缓存相同且实例存在 → 复用（判定逻辑抽成纯函数便于测试）
            if (numSpeakers.HasValue && ShouldReusePipeline(numSpeakers, _numClustersValue, _numClustersPipeline != null))
            {
                return _numClustersPipeline!;
            }

            if (!SttModelManager.IsDiarizationModelAvailable())
                throw new InvalidOperationException("说话人分离模型未就绪");

            var (segModel, embModel) = SttModelManager.GetDiarizationModelPaths();

            // 确认文件确实存在（C++ 库找不到文件会返回无效 handle → 后续调用崩溃）
            if (!File.Exists(segModel))
                throw new FileNotFoundException($"分离模型文件不存在: {segModel}");
            if (!File.Exists(embModel))
                throw new FileNotFoundException($"嵌入模型文件不存在: {embModel}");

            // sherpa-onnx C++ 库不支持含非 ASCII 字符的路径（如 e:\测试\）
            // 如果路径含非 ASCII 字符，复制模型到纯 ASCII 临时目录
            var segModelAscii = EnsureAsciiPath(segModel);
            var embModelAscii = EnsureAsciiPath(embModel);

            var config = new OfflineSpeakerDiarizationConfig();
            config.Segmentation.Pyannote.Model = segModelAscii;
            config.Embedding.Model = embModelAscii;

            if (numSpeakers.HasValue)
            {
                config.Clustering.NumClusters = numSpeakers.Value;
            }
            else
            {
                // 0.5 太低会导致 2 人通话被拆成 16 个说话人
                // 0.65 实测能将 2 人通话正确识别为 2-3 个说话人
                config.Clustering.Threshold = 0.65f;
            }

            var pipeline = new OfflineSpeakerDiarization(config);

            if (!numSpeakers.HasValue)
            {
                _diarization = pipeline;
            }
            else
            {
                // 替换指定人数管线缓存。旧实例无法安全 Dispose（可能仍被并发使用），
                // 交给 GC 回收——与 _diarization 单例的进程生命周期语义一致
                _numClustersPipeline = pipeline;
                _numClustersValue = numSpeakers.Value;
            }

            Console.WriteLine($"[DiarizationService] 分离管线初始化完成 (numSpeakers={numSpeakers?.ToString() ?? "auto"})");
            return pipeline;
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
    /// 管线复用判定（纯函数，便于单元测试）：是否可复用缓存的 OfflineSpeakerDiarization 实例。
    /// 自动模式：缓存实例存在即复用；指定人数模式：缓存实例存在且记录值与请求值相同才复用。
    /// </summary>
    internal static bool ShouldReusePipeline(int? requested, int? cachedValue, bool cachedExists)
    {
        if (!cachedExists) return false;
        if (!requested.HasValue) return true;   // 自动管线：无值概念，缓存存在即复用
        return cachedValue == requested;         // 指定人数：值不同必须换管线（NumClusters 不可变）
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

        // 2. 运行分离
        var pipeline = GetOrCreatePipeline(numSpeakers);

        Console.WriteLine($"[DiarizationService] 开始分离 ({samples.Length / 16000.0:F1}s 音频, sampleRate={sampleRate})...");

        // 检查采样率
        if (pipeline.SampleRate != sampleRate)
        {
            throw new InvalidOperationException($"采样率不匹配: 期望 {pipeline.SampleRate}, 实际 {sampleRate}");
        }

        // Process 返回 OfflineSpeakerDiarizationSegment[]，按时间排序
        var rawSegments = pipeline.Process(samples);

        // 3. 提取原始段
        var segments = new List<SttSegment>();
        foreach (var seg in rawSegments)
        {
            segments.Add(new SttSegment
            {
                Speaker = (int)seg.Speaker,
                Start = seg.Start,
                End = seg.End,
            });
        }

        var rawSpeakerCount = segments.Select(s => s.Speaker).Distinct().Count();
        Console.WriteLine($"[DiarizationService] 原始段数: {segments.Count}, 说话人数: {rawSpeakerCount}");

        // 爆簇保险丝：自动模式下聚类爆出异常多簇（实测 54 簇）时，后续 MergeRareSpeakers
        // 会把垃圾归属粗暴吞并成 2 人 → 直接失败，提示用户改用指定人数（SttWorker 已有
        // failed 状态写回路径，此消息会展示给用户）
        var explosion = CheckClusterExplosion(numSpeakers, rawSpeakerCount);
        if (explosion != null)
            throw new InvalidOperationException(explosion);

        // 4. 段合并
        var merged = MergeSegments(segments);

        // 5. 合并低频说话人（把只出现很少的说话人合并到主导说话人）
        merged = MergeRareSpeakers(merged);

        Console.WriteLine($"[DiarizationService] 合并后段数: {merged.Count}, 说话人数: {merged.Select(s => s.Speaker).Distinct().Count()}");

        return Task.FromResult(merged);
    }

    /// <summary>
    /// 合并低频说话人：把说话时间占比 < 5% 或总时长 < 15s 的说话人合并到时间上最相邻的主导说话人。
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
    /// 段合并算法：把碎段合并成话轮
    ///
    /// 步骤：
    /// 1. 按 start 排序
    /// 2. 合并相邻同说话人段（gap < 2s）
    /// 3. 吸收超短段（duration < 1.2s）到时间上重叠最多的相邻段
    /// 4. 再合并一次（吸收后可能产生新的可合并对）
    /// </summary>
    public static List<SttSegment> MergeSegments(List<SttSegment> rawSegments, double shortThreshold = 1.2, double gapThreshold = 2.0)
    {
        if (rawSegments.Count == 0) return rawSegments;

        // 按 start 排序
        var sorted = rawSegments.OrderBy(s => s.Start).ToList();

        // Step 1: 吸收超短段
        var absorbed = new List<SttSegment>();
        for (int i = 0; i < sorted.Count; i++)
        {
            var seg = sorted[i];
            var duration = seg.End - seg.Start;

            if (duration < shortThreshold && sorted.Count > 2)
            {
                // 找时间上重叠或最近的邻居
                var prev = absorbed.Count > 0 ? absorbed[^1] : null;
                var next = i + 1 < sorted.Count ? sorted[i + 1] : null;

                // 优先合并到同说话人的邻居
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

                // 没有同说话人邻居 → 吸收到时间上重叠最多的不同说话人段
                if (prev != null && next != null)
                {
                    var overlapPrev = Math.Max(0, Math.Min(prev.End, seg.End) - Math.Max(prev.Start, seg.Start));
                    var overlapNext = Math.Max(0, Math.Min(next.End, seg.End) - Math.Max(next.Start, seg.Start));
                    if (overlapPrev >= overlapNext)
                    {
                        prev.End = Math.Max(prev.End, seg.End);
                    }
                    else
                    {
                        next.Start = seg.Start;
                    }
                    continue;
                }

                // 只有一个邻居
                if (prev != null) { prev.End = Math.Max(prev.End, seg.End); continue; }
                if (next != null) { next.Start = seg.Start; continue; }
            }

            absorbed.Add(new SttSegment { Speaker = seg.Speaker, Start = seg.Start, End = seg.End });
        }

        // Step 2: 合并相邻同说话人段（gap < threshold）
        var merged = new List<SttSegment>();
        foreach (var seg in absorbed.OrderBy(s => s.Start))
        {
            if (merged.Count > 0
                && merged[^1].Speaker == seg.Speaker
                && seg.Start - merged[^1].End < gapThreshold)
            {
                merged[^1].End = Math.Max(merged[^1].End, seg.End);
            }
            else
            {
                merged.Add(new SttSegment { Speaker = seg.Speaker, Start = seg.Start, End = seg.End });
            }
        }

        return merged;
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
    /// 确保路径只含 ASCII 字符。sherpa-onnx C++ 库用 std::string 传路径，
    /// 在中文 Windows 上会把 UTF-8/GBK 混编导致路径乱码 → 模型找不到 → 崩溃。
    ///
    /// 策略：
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
