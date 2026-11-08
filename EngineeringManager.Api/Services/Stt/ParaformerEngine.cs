using System.Diagnostics;
using SherpaOnnx;

namespace EngineeringManager.Api.Services.Stt;

/// <summary>
/// Paraformer 中文离线转写引擎（sherpa-onnx int8，Apache-2.0）。
///
/// 与 MOSS（一步成段）不同：该 int8 模型导出时裁掉了时间戳输出头，
/// 本体只出文字。时间戳与说话人全部来自分离管线
///（DiarizationService.DiarizeAsync → SplitAudioBySpeakersAsync），
/// 本引擎只负责逐段出文字（两段式管线的转写端）。
///
/// 运行形态：asr-engine/paraformer/model.int8.onnx（227MB）+ tokens.txt，
/// sherpa-onnx OfflineRecognizer（CPU，greedy_search），模型只加载一次并缓存
/// （N 段 N 次加载 2.7s 是性能灾难）。单实例纪律与现役引擎一致：
/// 与 MossTranscribeEngine 共用同一 OS Mutex。
///
/// 热词：本轮不支持（context 参数忽略，sherpa 热词另议）。
/// </summary>
public class ParaformerEngine : ISttEngine
{
    public const string EngineId = "paraformer-zh-int8";

    private const string ModelFileName = "model.int8.onnx";
    private const string TokensFileName = "tokens.txt";
    private const int SampleRate = 16000;

    private const string MutexName = "Global\\EngineeringManagerSttEngine"; // 与现役两引擎共用：整机单重推理
    private static readonly Mutex _osMutex = new(false, MutexName);
    private static readonly object _instanceLock = new();
    private static bool _isRunning;

    private static readonly object _initLock = new();
    private static OfflineRecognizer? _recognizer;
    private static string? _engineDirCache;

    public string Name => EngineId;

    /// <summary>线程数：CPU 核心数 clamp 到 [1, 8]（sherpa 解码用）。</summary>
    internal static int NumThreads => Math.Clamp(Environment.ProcessorCount, 1, 8);

    public Task<bool> IsAvailableAsync()
    {
        var dir = GetEngineDir();
        return Task.FromResult(
            dir != null
            && File.Exists(Path.Combine(dir, ModelFileName))
            && File.Exists(Path.Combine(dir, TokensFileName)));
    }

    /// <summary>
    /// 单文件转写（单人任务整段直转用）。context/热词本轮不支持，直接忽略。
    /// Segments 只占位（Speaker=0），SttWorker 单人分支会统一归为 Speaker=1
    /// 并按时长修正 End（单人任务口径）。
    /// </summary>
    public async Task<SttResult> TranscribeAsync(
        string wavPath,
        string? context,
        IProgress<int>? progress,
        CancellationToken ct)
    {
        if (!File.Exists(wavPath))
            throw new FileNotFoundException($"音频文件不存在: {wavPath}");
        if (!await IsAvailableAsync())
            throw new InvalidOperationException($"Paraformer 模型文件缺失，请检查 asr-engine/paraformer/ 目录（{ModelFileName} + {TokensFileName}）");

        var samples = ReadWavAsFloats(wavPath);
        var durationSec = samples.Length / (double)SampleRate;

        var sw = Stopwatch.StartNew();
        var text = await SttMutexGuard.WithMutexAsync(
            _osMutex, _instanceLock, () => _isRunning, v => _isRunning = v,
            () => Task.FromResult(DecodeOne(samples, ct)));
        sw.Stop();

        progress?.Report(100);

        return new SttResult
        {
            Text = text,
            Segments = new List<SttSegment> { new() { Speaker = 0, Start = 0, End = 0, Text = text } },
            DurationSec = durationSec,
            ElapsedSec = sw.Elapsed.TotalSeconds,
            Engine = EngineId,
        };
    }

    /// <summary>
    /// 批量转写：一个 recognizer 实例顺序处理全部段（模型只加载一次）。
    /// 签名与 SttWorker 多人分支的批量转写调用一致，可直接替换。
    /// context/热词本轮不支持，直接忽略。
    /// </summary>
    public async Task<List<string>> TranscribeBatchAsync(
        List<string> wavPaths,
        string? context,
        CancellationToken ct)
    {
        if (wavPaths.Count == 0)
            return new List<string>();

        if (wavPaths.Count == 1)
        {
            var single = await TranscribeAsync(wavPaths[0], context, null, ct);
            return new List<string> { single.Text };
        }

        foreach (var path in wavPaths)
        {
            if (!File.Exists(path))
                throw new FileNotFoundException($"音频文件不存在: {path}");
        }

        if (!await IsAvailableAsync())
            throw new InvalidOperationException($"Paraformer 模型文件缺失，请检查 asr-engine/paraformer/ 目录（{ModelFileName} + {TokensFileName}）");

        // WAV 解码是纯 IO，提前在锁外完成，减少 Mutex 占用时间
        var allSamples = wavPaths.Select(ReadWavAsFloats).ToList();

        Console.WriteLine($"[ParaformerEngine] 批量转写 {allSamples.Count} 段（模型只加载一次）");
        var sw = Stopwatch.StartNew();
        var texts = await SttMutexGuard.WithMutexAsync(
            _osMutex, _instanceLock, () => _isRunning, v => _isRunning = v,
            () => Task.FromResult(DecodeAll(allSamples, ct)));
        sw.Stop();
        Console.WriteLine($"[ParaformerEngine] 批量转写 {texts.Count} 段完成，耗时 {sw.Elapsed.TotalSeconds:F1}s");

        return texts;
    }

    private static string DecodeOne(float[] samples, CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();
        var recognizer = GetOrCreateRecognizer();
        using var stream = recognizer.CreateStream();
        stream.AcceptWaveform(SampleRate, samples);
        recognizer.Decode(stream);
        return (stream.Result.Text ?? "").Trim();
    }

    private static List<string> DecodeAll(List<float[]> allSamples, CancellationToken ct)
    {
        var recognizer = GetOrCreateRecognizer();
        var texts = new List<string>(allSamples.Count);
        foreach (var samples in allSamples)
        {
            ct.ThrowIfCancellationRequested();
            using var stream = recognizer.CreateStream();
            stream.AcceptWaveform(SampleRate, samples);
            recognizer.Decode(stream);
            texts.Add((stream.Result.Text ?? "").Trim());
        }
        return texts;
    }

    /// <summary>
    /// 获取缓存的 recognizer（线程安全单例，模型只加载一次；约 2.7~3.1s）。
    /// 加载失败直接抛（止损：不硬凑，由调用方报告）。
    /// </summary>
    private static OfflineRecognizer GetOrCreateRecognizer()
    {
        lock (_initLock)
        {
            if (_recognizer != null) return _recognizer;

            var dir = GetEngineDir()
                ?? throw new InvalidOperationException("asr-engine/paraformer 未找到");
            var modelPath = Path.Combine(dir, ModelFileName);
            var tokensPath = Path.Combine(dir, TokensFileName);
            if (!File.Exists(modelPath) || !File.Exists(tokensPath))
                throw new InvalidOperationException($"Paraformer 模型文件缺失，请检查 asr-engine/paraformer/ 目录（{ModelFileName} + {TokensFileName}）");

            // sherpa-onnx 1.13.4 的 config 全是 struct（值类型），嵌套赋值必须
            // 先建好内层再整体装配，禁止 config.ModelConfig.Paraformer.Model = …（CS1612）。
            var paraformer = new OfflineParaformerModelConfig { Model = modelPath };
            var modelConfig = new OfflineModelConfig
            {
                Paraformer = paraformer,
                Tokens = tokensPath,
                NumThreads = NumThreads,
                Provider = "cpu",
                Debug = 0,
            };
            var config = new OfflineRecognizerConfig
            {
                ModelConfig = modelConfig,
                DecodingMethod = "greedy_search",
            };
            config.FeatConfig = new FeatureConfig { SampleRate = SampleRate, FeatureDim = 80 };

            Console.WriteLine($"[ParaformerEngine] 加载模型 {modelPath}（约 2.7~3.1s）...");
            var sw = Stopwatch.StartNew();
            _recognizer = new OfflineRecognizer(config);
            sw.Stop();
            Console.WriteLine($"[ParaformerEngine] 模型加载完成，耗时 {sw.Elapsed.TotalSeconds:F1}s");
            return _recognizer;
        }
    }

    /// <summary>向上查找 asr-engine/paraformer（bin→项目根→工作区根），与 MossTranscribeEngine 同套路。</summary>
    public static string? GetEngineDir()
    {
        if (_engineDirCache != null) return _engineDirCache;
        var dir = AppContext.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        for (var i = 0; i < 8 && dir != null; i++)
        {
            var candidate = Path.Combine(dir, "asr-engine", "paraformer");
            if (Directory.Exists(candidate))
            {
                _engineDirCache = candidate;
                return candidate;
            }
            dir = Path.GetDirectoryName(dir);
        }
        return null;
    }

    /// <summary>16k mono s16 PCM → float[]（÷32768）。含 RIFF 头校验与采样率/格式断言。</summary>
    internal static float[] ReadWavAsFloats(string wavPath)
    {
        using var fs = new FileStream(wavPath, FileMode.Open, FileAccess.Read, FileShare.Read);
        using var br = new BinaryReader(fs);
        if (br.ReadInt32() != 0x46464952) throw new InvalidOperationException("非 RIFF 文件"); // "RIFF"
        _ = br.ReadInt32();
        if (br.ReadInt32() != 0x45564157) throw new InvalidOperationException("非 WAV 文件"); // "WAVE"

        var sampleRate = 0;
        var channels = 0;
        var bitsPerSample = 0;
        byte[]? dataBytes = null;
        while (br.BaseStream.Position + 8 <= br.BaseStream.Length)
        {
            var chunkId = br.ReadInt32();
            var chunkSize = (long)br.ReadUInt32();
            if (chunkId == 0x20746D66) // "fmt "
            {
                if (chunkSize < 16) throw new InvalidOperationException("fmt chunk 过短");
                var fmt = br.ReadBytes(16);
                var audioFormat = BitConverter.ToInt16(fmt, 0);
                channels = BitConverter.ToInt16(fmt, 2);
                sampleRate = BitConverter.ToInt32(fmt, 4);
                bitsPerSample = BitConverter.ToInt16(fmt, 14);
                if (audioFormat != 1)
                    throw new InvalidOperationException($"仅支持 PCM（实际 format={audioFormat}）");
                if (channels != 1)
                    throw new InvalidOperationException($"仅支持单声道（实际 ch={channels}）");
                if (bitsPerSample != 16)
                    throw new InvalidOperationException($"仅支持 16bit（实际 bits={bitsPerSample}）");
                br.BaseStream.Position += chunkSize - 16;
            }
            else if (chunkId == 0x61746164) // "data"
            {
                if (chunkSize > int.MaxValue) throw new InvalidOperationException("data chunk 过大");
                dataBytes = br.ReadBytes((int)chunkSize);
                break;
            }
            else
            {
                br.BaseStream.Position += chunkSize + (chunkSize & 1);
            }
        }

        if (dataBytes == null) throw new InvalidOperationException("WAV 头缺少 data chunk");
        if (sampleRate != SampleRate)
            throw new InvalidOperationException($"采样率不匹配: 期望 {SampleRate}, 实际 {sampleRate}");

        var samples = new float[dataBytes.Length / 2];
        for (var i = 0; i < samples.Length; i++)
            samples[i] = BitConverter.ToInt16(dataBytes, i * 2) / 32768f;
        return samples;
    }

    /// <summary>仅测试用：清引擎目录与 recognizer 缓存。</summary>
    internal static void ClearCacheForTest()
    {
        lock (_initLock)
        {
            _engineDirCache = null;
            _recognizer?.Dispose();
            _recognizer = null;
        }
    }
}
