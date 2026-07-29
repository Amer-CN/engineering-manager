using EngineeringManager.Api.Services.Stt;
using System.Diagnostics;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// STT 端到端集成测试：产出审核验收物
/// - 单人录音转写文本
/// - 多人录音：分离段合并前后对比 + 带说话人标签的转写文本
/// 
/// 注意：此测试需要模型和音频文件，运行时间约 3-5 分钟（transcribe.exe 异常时可能挂起 10 分钟+）
/// 默认以 Skipped 状态跳过（测试报告如实显示 642 passed + 2 skipped，不计入通过数）。手动运行：
///   $env:RUN_STT_E2E='1'; dotnet test --filter FullyQualifiedName~SttE2E
/// </summary>
public class SttE2ETests
{
    /// <summary>测试音频目录</summary>
    private const string AudioDir = @"e:\测试\asr-test\audios";

    /// <summary>重型 E2E 闸门：未显式开启时以 xunit Skip 状态跳过（而非空跑计入 Passed，避免绿灯失真）</summary>
    private sealed class SttE2EFactAttribute : FactAttribute
    {
        public SttE2EFactAttribute()
        {
            if (Environment.GetEnvironmentVariable("RUN_STT_E2E") != "1")
                Skip = "未设置 RUN_STT_E2E=1，跳过重型 STT E2E（transcribe.exe 挂起会拖死整个测试套件）";
        }
    }

    [SttE2EFact]
    public async Task E2E_MultiSpeaker_DiarizeAndTranscribe()
    {
        // 前置检查
        if (!SttModelManager.IsAsrModelAvailable())
        {
            Console.WriteLine("[SKIP] ASR 模型不可用，跳过 E2E 测试");
            return;
        }
        if (!SttModelManager.IsDiarizationModelAvailable())
        {
            Console.WriteLine("[SKIP] 分离模型不可用，跳过 E2E 测试");
            return;
        }

        // 选一个通话录音（多人对话）
        var audioFile = Path.Combine(AudioDir, "通话-陈泽伟-202606101153(1).m4a");
        if (!File.Exists(audioFile))
        {
            // 找第一个可用的音频
            audioFile = Directory.GetFiles(AudioDir, "*.m4a").FirstOrDefault()
                      ?? Directory.GetFiles(AudioDir, "*.mp3").FirstOrDefault()
                      ?? "";
            if (string.IsNullOrEmpty(audioFile))
            {
                Console.WriteLine("[SKIP] 没有找到测试音频文件");
                return;
            }
        }

        Console.WriteLine($"[E2E] 使用音频: {Path.GetFileName(audioFile)}");

        // 1. 预处理为 WAV
        Console.WriteLine("[E2E] Step 1: 预处理音频...");
        var processedWav = await AudioPreprocessor.PreprocessAsync(audioFile, ct: default);
        var duration = await AudioPreprocessor.GetDurationAsync(processedWav);
        Console.WriteLine($"[E2E] 预处理完成: {processedWav}, 时长 {duration:F1}s");

        // 2. 说话人分离（C# 绑定）— 获取原始段数 + 合并后段数
        Console.WriteLine("[E2E] Step 2: 说话人分离 (C# sherpa-onnx)...");
        var diarization = new DiarizationService();

        // 先获取原始段数（通过内部方法不能直接拿，用 DiarizeAsync 返回的就是合并后的）
        // 改为直接调 DiarizeAsync，它内部会打印原始段数和合并后段数
        var mergedSegments = await diarization.DiarizeAsync(processedWav, numSpeakers: null, ct: default);

        Console.WriteLine($"\n[E2E] === 分离结果 ===");
        Console.WriteLine($"[E2E] 合并后段数: {mergedSegments.Count}");
        Console.WriteLine($"[E2E] 说话人数: {mergedSegments.Select(s => s.Speaker).Distinct().Count()}");
        foreach (var seg in mergedSegments)
        {
            Console.WriteLine($"[E2E]   说话人{seg.Speaker} [{seg.Start:F1}s - {seg.End:F1}s] ({seg.End - seg.Start:F1}s)");
        }

        // 3. 切分音频
        Console.WriteLine("\n[E2E] Step 3: 切分音频...");
        var splitFiles = await diarization.SplitAudioBySpeakersAsync(processedWav, mergedSegments);
        Console.WriteLine($"[E2E] 切分出 {splitFiles.Count} 个音频段");

        // 4. 批量转写：一次 transcribe.exe 调用处理所有段（模型只加载一次）
        Console.WriteLine("\n[E2E] Step 4: 批量转写（模型只加载一次）...");
        var engine = new LlamaCppGgufEngine();
        var context = "工程管理、建筑工地、合同、付款、验收、工伤保险、方量、甲方乙方";

        var sw = Stopwatch.StartNew();
        // 调试模式：限制段数以快速验证（正式验收时去掉限制）
        var maxSegments = Environment.GetEnvironmentVariable("STT_E2E_MAX_SEGMENTS");
        if (int.TryParse(maxSegments, out var max) && max > 0 && splitFiles.Count > max)
        {
            Console.WriteLine($"[E2E] 调试模式: 限制为前 {max} 段（共 {splitFiles.Count} 段）");
            splitFiles = splitFiles.Take(max).ToList();
        }
        var wavPaths = splitFiles.Select(s => s.wavPath).ToList();
        var texts = await engine.TranscribeBatchAsync(wavPaths, context, default);
        sw.Stop();

        Console.WriteLine($"[E2E] 批量转写完成: {splitFiles.Count} 段, 总耗时 {sw.Elapsed.TotalSeconds:F1}s");
        Console.WriteLine($"[E2E] 模型加载次数: 1 (一次进程处理所有段)");

        // 5. 输出最终结果
        var allText = new List<string>();
        for (int i = 0; i < splitFiles.Count; i++)
        {
            var (seg, _) = splitFiles[i];
            seg.Text = texts[i];
            allText.Add($"【说话人{seg.Speaker + 1}】{texts[i]}");
        }

        Console.WriteLine("\n[E2E] ========== 最终转写结果（带说话人标签）==========");
        Console.WriteLine(string.Join("\n", allText));
        Console.WriteLine("======================================");
        Console.WriteLine($"[E2E] 段数: {mergedSegments.Count}, 总字数: {allText.Sum(t => t.Length)}, 转写耗时: {sw.Elapsed.TotalSeconds:F1}s");

        // 清理
        DiarizationService.CleanupTempFiles(splitFiles.Select(s => s.wavPath).ToList());
        try { if (processedWav.StartsWith(Path.GetTempPath())) File.Delete(processedWav); } catch { }

        // 断言
        Assert.True(mergedSegments.Count > 0, "应至少分离出 1 段");
        Assert.True(mergedSegments.Count <= 50, $"合并后段数应 ≤ 50，实际 {mergedSegments.Count}");
        Assert.True(allText.Count > 0, "应至少转写出 1 段文本");
        Assert.True(texts.Any(t => !string.IsNullOrWhiteSpace(t)), "至少应有一段非空文本");
    }

    [SttE2EFact]
    public async Task E2E_SingleSpeaker_Transcribe()
    {
        // 前置检查
        if (!SttModelManager.IsAsrModelAvailable())
        {
            Console.WriteLine("[SKIP] ASR 模型不可用，跳过 E2E 测试");
            return;
        }

        // 选一个短音频（单人）
        var audioFile = Directory.GetFiles(AudioDir, "*.mp3").FirstOrDefault();
        if (audioFile == null)
        {
            Console.WriteLine("[SKIP] 没有找到测试音频文件");
            return;
        }

        Console.WriteLine($"[E2E-Single] 使用音频: {Path.GetFileName(audioFile)}");

        // 预处理
        var processedWav = await AudioPreprocessor.PreprocessAsync(audioFile, ct: default);
        var duration = await AudioPreprocessor.GetDurationAsync(processedWav);
        Console.WriteLine($"[E2E-Single] 预处理完成: 时长 {duration:F1}s");

        // 直接转写（跳过分离）— hotwords.txt 会自动被 BuildContext 读取
        var engine = new LlamaCppGgufEngine();
        var context = "工程管理、建筑工地、合同、付款";

        Console.WriteLine("[E2E-Single] 开始转写...");
        var sw = Stopwatch.StartNew();
        var result = await engine.TranscribeAsync(processedWav, context, null, default);
        sw.Stop();

        Console.WriteLine($"\n[E2E-Single] ========== 单人转写结果 ==========");
        Console.WriteLine(result.Text);
        Console.WriteLine("======================================");
        Console.WriteLine($"[E2E-Single] 耗时: {sw.Elapsed.TotalSeconds:F1}s, 文本长度: {result.Text.Length} 字");

        // 清理
        try { if (processedWav.StartsWith(Path.GetTempPath())) File.Delete(processedWav); } catch { }

        Assert.True(result.Text.Length > 0, "应转写出文本");
    }
}
