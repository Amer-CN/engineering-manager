using System.Text.Json;
using EngineeringManager.Api.Services.Stt;
using Xunit;

namespace EngineeringManager.Tests.Services;

/// <summary>
/// MossTranscribeEngine 纯逻辑单元测试：段解析 + 说话人编号解析。
/// 不运行真实模型 — 全部纯函数测试（夹具取自 2026-09-09 任务 #24 音频的真实 cpp 输出结构）。
/// </summary>
public class MossTranscribeEngineTests
{
    // 真实输出结构样例（moss-transcribe.cpp --format json，顶层即段数组）
    private const string RealSample = """
        [
          {"id":"seg_0001","start":0.28,"end":3.14,"speaker":"S01","text":"反馈过来的东西，第一又不是你们聊的内容。"},
          {"id":"seg_0002","start":3.14,"end":9.38,"speaker":"S02","text":"作为一个企业来说的话。"}
        ]
        """;

    [Fact]
    public void ParseSegmentsJson_RealShape_ParsesSpeakerStartEndText()
    {
        var segs = MossTranscribeEngine.ParseSegmentsJson(RealSample, offsetSec: 0);

        Assert.Equal(2, segs.Count);
        Assert.Equal(1, segs[0].Speaker);           // S01 → 1（1 基，SpeakerLabelNormalizer 预期一致）
        Assert.Equal(2, segs[1].Speaker);
        Assert.Equal(0.28, segs[0].Start, 3);
        Assert.Equal(9.38, segs[1].End, 3);
        Assert.Contains("反馈过来的东西", segs[0].Text);
        Assert.Equal(1, segs[0].OriginalSpeaker);    // 保留原始编号（诊断字段）
    }

    [Fact]
    public void ParseSegmentsJson_ChunkOffset_AddsOffsetToAllTimestamps()
    {
        // 切块偏移换算：块内相对时间 0.28s → 全局 600.28s
        var segs = MossTranscribeEngine.ParseSegmentsJson(RealSample, offsetSec: 600);

        Assert.Equal(600.28, segs[0].Start, 3);
        Assert.Equal(603.14, segs[0].End, 3);
        Assert.Equal(609.38, segs[1].End, 3);
    }

    [Fact]
    public void ParseSpeaker_EdgeCases_FallbackToOne()
    {
        static int Parse(string json)
        {
            using var doc = JsonDocument.Parse(json);
            return MossTranscribeEngine.ParseSpeaker(doc.RootElement);
        }

        Assert.Equal(1, Parse("""{"speaker":"S01"}"""));
        Assert.Equal(12, Parse("""{"speaker":"S12"}"""));
        Assert.Equal(3, Parse("""{"speaker":"s03"}"""));      // 小写 s 容忍
        Assert.Equal(1, Parse("""{"speaker":"XX"}"""));        // 非数字 → 回退 1
        Assert.Equal(1, Parse("""{"speaker":"S0"}"""));        // 0 非法（1 基）→ 回退 1
        Assert.Equal(1, Parse("{}"));                          // 缺字段 → 回退 1
        Assert.Equal(1, Parse("""{"speaker":7}"""));           // 数字形态 → 回退 1
    }

    [Fact]
    public void ParseSegmentsJson_EmptyArray_ReturnsEmptyList()
    {
        var segs = MossTranscribeEngine.ParseSegmentsJson("[]", offsetSec: 0);
        Assert.Empty(segs);
    }

    [Fact]
    public void ParseSegmentsJson_MissingOptionalFields_DoesNotThrow()
    {
        // 段缺 start/end/text：0 起点兜底 + 空文本，不抛异常（健壮性）
        var segs = MossTranscribeEngine.ParseSegmentsJson("""[{"id":"seg_0001","speaker":"S02"}]""", offsetSec: 120);
        Assert.Single(segs);
        Assert.Equal(2, segs[0].Speaker);
        Assert.Equal(0, segs[0].Text.Length);
    }

    [Fact]
    public void EngineId_IsStableContract()
    {
        // engine 列白名单依赖此常量字符串，改了会破坏存量任务/白名单
        Assert.Equal("moss-transcribe-0.9b", MossTranscribeEngine.EngineId);
        Assert.Equal(MossTranscribeEngine.EngineId, new MossTranscribeEngine().Name);
    }

    [Fact]
    public void SelectExeName_VkPresent_UsesVulkanExe()
    {
        // 后端选择：asr-engine/moss/ 下存在 moss-transcribe-vk.exe → 优先 Vulkan
        Assert.Equal("moss-transcribe-vk.exe", MossTranscribeEngine.SelectExeName(vkPresent: true));
    }

    [Fact]
    public void SelectExeName_VkMissing_FallsBackToCpuExe()
    {
        // 无 Vulkan 版 → 回退 CPU 版（存量部署只有 moss-transcribe.exe，行为不变）
        Assert.Equal("moss-transcribe.exe", MossTranscribeEngine.SelectExeName(vkPresent: false));
    }

    // ═══════════ 热词接线（2026-09-10，任务书 task-moss-hotwords-wire）═══════════

    [Theory]
    [InlineData(true, false, "moss-transcribe-vk.exe")]         // 无热词：有 vk → Vulkan（存量行为）
    [InlineData(true, true, "moss-transcribe-hotwords.exe")]    // 热词路径固定走热词版（基线 vk 版无 --hotwords）
    [InlineData(false, false, "moss-transcribe.exe")]           // 无热词：无 vk → CPU 基线（存量行为）
    [InlineData(false, true, "moss-transcribe-hotwords.exe")]   // 无 vk 但有热词 → 热词版
    public void SelectExeName_WithHotwords_PicksHotwordsExeOverVulkan(bool vkPresent, bool hotwords, string expected)
    {
        Assert.Equal(expected, MossTranscribeEngine.SelectExeName(vkPresent, hotwords));
    }

    [Fact]
    public void NormalizeHotwords_EmptyOrNull_ReturnsNull()
    {
        // 空热词 → null → 不传 --hotwords，走无热词基线路径（与历史行为逐字节一致）
        Assert.Null(MossTranscribeEngine.NormalizeHotwords(null, out _));
        Assert.Null(MossTranscribeEngine.NormalizeHotwords("", out _));
        Assert.Null(MossTranscribeEngine.NormalizeHotwords("   \t ", out _));
    }

    [Fact]
    public void NormalizeHotwords_TrimsWhitespace()
    {
        var hw = MossTranscribeEngine.NormalizeHotwords("  谭俊、陈泽伟  ", out var truncated);
        Assert.Equal("谭俊、陈泽伟", hw);
        Assert.False(truncated);
    }

    [Fact]
    public void NormalizeHotwords_OverLimit_TruncatesAndFlags()
    {
        var long500 = new string('词', MossTranscribeEngine.HotwordsMaxChars);
        var hw500 = MossTranscribeEngine.NormalizeHotwords(long500, out var t500);
        Assert.Equal(long500, hw500);
        Assert.False(t500);                                     // 恰好 500 不截

        var long501 = long500 + "超";
        var hw501 = MossTranscribeEngine.NormalizeHotwords(long501, out var t501);
        Assert.Equal(long500, hw501);
        Assert.True(t501);                                      // 501 → 截到 500 + 标记
    }

    [Fact]
    public void BuildArguments_WithoutHotwords_ByteIdenticalToLegacy()
    {
        // 空热词命令行与历史逐字节一致（任务书技术要点 3）
        Assert.Equal(
            "transcribe \"C:\\m\\a.gguf\" \"C:\\t\\0.wav\" --format json",
            MossTranscribeEngine.BuildArguments("C:\\m\\a.gguf", "C:\\t\\0.wav", null));
        Assert.Equal(
            "transcribe \"C:\\m\\a.gguf\" \"C:\\t\\0.wav\" --format json",
            MossTranscribeEngine.BuildArguments("C:\\m\\a.gguf", "C:\\t\\0.wav", ""));
    }

    [Fact]
    public void BuildArguments_WithHotwords_AppendsFlag()
    {
        var args = MossTranscribeEngine.BuildArguments("C:\\m\\a.gguf", "C:\\t\\0.wav", "谭俊、陈泽伟");
        Assert.EndsWith(" --hotwords \"谭俊、陈泽伟\"", args);
        // 值原样传（.NET 按系统 ACP 编码，exe 侧 argv_acp_to_utf8 转回 UTF-8），禁止预转 UTF-8
        Assert.StartsWith("transcribe \"C:\\m\\a.gguf\" \"C:\\t\\0.wav\" --format json --hotwords", args);
    }

    [Fact]
    public void BuildArguments_WithEmbeddedQuote_EscapesIt()
    {
        var args = MossTranscribeEngine.BuildArguments("C:\\m\\a.gguf", "C:\\t\\0.wav", "甲\"乙方");
        Assert.Contains("--hotwords \"甲\\\"乙方\"", args);
    }

    [Fact]
    public void MossFuseException_IsInvalidOperationException_ButExcludedFromFallback()
    {
        // 熔断异常继承 InvalidOperationException（调用方现有 catch 不会漏），
        // 但回退过滤器用 `ex is not MossFuseException` 把它排除在 Vulkan→CPU 重试之外——
        // 超时/保险丝 kill 后 CPU 重跑必再熔断（内存只会更高），属纯浪费
        Exception ex = MossTranscribeEngine.CreateFuseExceptionForTest("fuse");
        Assert.True(ex is System.InvalidOperationException);
        Assert.True(MossTranscribeEngine.IsFallbackExcluded(ex));
        Assert.False(MossTranscribeEngine.IsFallbackExcluded(new System.InvalidOperationException("plain")));
    }

    // ═══════════ 分块改造（2026-09-10，任务书 task-moss-chunk-overlap：30s 块 + 切口对齐静音点）═══════════

    [Fact]
    public void FindSilenceCut_LoudSilenceLoud_ReturnsSilenceCenter()
    {
        // 合成 10s PCM（1kHz 采样，帧 50ms）：[0,4) 响 8000，[4,6) 静音 0，[6,10) 响 8000
        const int rate = 1000;
        var samples = new short[10 * rate];
        for (var i = 0; i < samples.Length; i++)
            samples[i] = (i < 4 * rate || i >= 6 * rate) ? (short)8000 : (short)0;

        var cut = MossTranscribeEngine.FindSilenceCut(samples, rate, nominalOffsetInWindow: 5.0, searchSec: 3.0, frameSec: 0.05);

        // 最低能量帧中心落在静音段中心（5s）±1 帧内
        Assert.InRange(cut, 5.0 - 0.05, 5.0 + 0.05);
    }

    [Fact]
    public void FindSilenceCut_NoSilenceConstantLoud_FallsBackToNominal()
    {
        // 全程等幅响：窗口内没有任何能量差 → 回退 nominal（不引入无意义的偏移）
        const int rate = 1000;
        var samples = new short[10 * rate];
        Array.Fill(samples, (short)8000);

        var cut = MossTranscribeEngine.FindSilenceCut(samples, rate, nominalOffsetInWindow: 5.0, searchSec: 3.0, frameSec: 0.05);

        Assert.Equal(5.0, cut);
    }

    [Fact]
    public void FindSilenceCut_ClippedWindow_StaysInRangeAndFindsSilence()
    {
        // 窗口越界裁剪：样本仅 1.2s，nominal=1.5、searchSec=3 → 搜索范围裁剪到 [0, 1.2]
        const int rate = 1000;
        var samples = new short[(int)(1.2 * rate)];
        for (var i = 0; i < samples.Length; i++)
            samples[i] = (i >= 400 && i < 600) ? (short)0 : (short)8000;   // 静音 [0.4, 0.6)

        var cut = MossTranscribeEngine.FindSilenceCut(samples, rate, nominalOffsetInWindow: 1.5, searchSec: 3.0, frameSec: 0.05);

        Assert.InRange(cut, 0, 1.2);                    // 裁剪后仍返回合法值：不超出实际样本范围
        Assert.InRange(cut, 0.5 - 0.05, 0.5 + 0.05);    // 且仍找到静音中心 0.5 ±1 帧
    }

    [Fact]
    public void BuildChunkPlan_ChunksAreSeamlessAndNonOverlapping()
    {
        // 抖动 snapFn：切口在 nominal ±3s 内乱跳，仍必须首尾相接、无缝且不重叠
        static double Jitter(double nominal) => nominal + nominal % 7 - 3;
        foreach (var dur in new[] { 240.0, 100.0, 62.0, 99.0, 1897.0 })
        {
            var plan = MossTranscribeEngine.BuildChunkPlan(dur, Jitter);

            Assert.Equal(0, plan[0].offsetSec, 9);                                          // 首块从 0 起
            for (var i = 0; i + 1 < plan.Count; i++)
                Assert.Equal(plan[i + 1].offsetSec, plan[i].offsetSec + plan[i].lenSec, 9); // 块 i 末尾 == 块 i+1 起点
            Assert.Equal(dur, plan[^1].offsetSec + plan[^1].lenSec, 9);                    // 末块收在音频末尾
        }
    }

    [Fact]
    public void BuildChunkPlan_EveryChunkLengthWithinLegalBounds()
    {
        // 每块长度 ∈ [MinChunkSec, ChunkSec + SnapSearchSec] = [10, 33]：
        // 恒等 / 偏 +3s / 偏 -3s 三种 snap × 多种时长（含真机 1897s 与易碎尾的 35/62/64/99s）全部必须满足
        foreach (var dur in new[] { 240.0, 100.0, 62.0, 99.0, 1897.0, 35.0, 64.0 })
        {
            foreach (var snap in new Func<double, double>[] { n => n, n => n + 3, n => n - 3 })
            {
                var plan = MossTranscribeEngine.BuildChunkPlan(dur, snap);
                Assert.All(plan, c => Assert.InRange(c.lenSec, 10.0, 33.0));
            }
        }
    }

    [Fact]
    public void BuildChunkPlan_IdentitySnap_DegeneratesToStrict30sSplit()
    {
        // 注入「强制返回 nominal」的假 snapFn：240s 退化为严格 30s 等分（8 块）
        var plan = MossTranscribeEngine.BuildChunkPlan(240.0, n => n);

        Assert.Equal(8, plan.Count);
        Assert.Equal(new[] { 0, 30, 60, 90, 120, 150, 180, 210 }, plan.Select(c => (int)c.offsetSec));
        Assert.All(plan, c => Assert.Equal(30.0, c.lenSec, 9));
    }

    [Fact]
    public void SnapCutToSilence_SeeksToAudioWindow_FindsTargetSilenceNotFileOpening()
    {
        // 生产接线回归（2026-09-10 驳回修复）：窗口必须先 seek 到 nominal 附近再读——
        // ReadWavHeader 返回时流停在 dataOffset（文件开头），若不 seek，每次读到的都是
        // 文件头 6 秒，切口与真实静音点毫无关系，且不崩不越界、纯函数单测全测不出来。
        // 布局：开头 [0,6) 全零强静音；目标静音 [28.5,29.5)；其余随机人声样噪声。
        const int rate = 16000;
        var samples = new short[40 * rate];
        var openEnd = 6 * rate;
        var silStart = (int)(28.5 * rate);
        var silEnd = (int)(29.5 * rate);
        var rnd = new Random(42);
        for (var i = 0; i < samples.Length; i++)
            samples[i] = (i < openEnd || (i >= silStart && i < silEnd)) ? (short)0 : (short)rnd.Next(2000, 12000);

        var wav = Path.Combine(Path.GetTempPath(), $"moss_snap_regression_{Guid.NewGuid():N}.wav");
        try
        {
            WriteTestWav(wav, samples, rate);

            var cut = MossTranscribeEngine.SnapCutToSilence(wav, nominalSec: 30.0);

            // 正向：命中 nominal≈30s 附近的静音点 [28.5, 29.5)（中点 29.0 ±0.5s）
            Assert.True(Math.Abs(cut - 29.0) <= 0.5, $"切口应落在目标静音点 29.0s 附近，实际 {cut}");
            // 负向约束：显式排除「读到文件开头」的失效形态——不 seek 时读到开头 6s 全零，
            // FindSilenceCut 会回退 nominal（30.0）或返回开头静音的窗口映射值，都远离目标
            Assert.True(cut > 20.0, $"切口落在文件开头说明窗口 seek 失效，实际 {cut}");
            Assert.True(cut < 29.75, $"切口 ≈nominal 且远离目标静音：读到的是文件开头 0-6s（窗口 seek 失效），实际 {cut}");
        }
        finally
        {
            try { File.Delete(wav); } catch { /* 临时文件清理失败不致命 */ }
        }
    }

    /// <summary>手写规范 16k 单声道 s16 WAV（ReadWavHeader 可解析的最小 44 字节头），供生产接线回归测试用。</summary>
    private static void WriteTestWav(string path, short[] samples, int sampleRate)
    {
        using var bw = new BinaryWriter(new FileStream(path, FileMode.Create, FileAccess.Write));
        bw.Write("RIFF"u8);
        bw.Write(36 + samples.Length * 2);
        bw.Write("WAVE"u8);
        bw.Write("fmt "u8);
        bw.Write(16);
        bw.Write((short)1);          // PCM
        bw.Write((short)1);          // 单声道
        bw.Write(sampleRate);
        bw.Write(sampleRate * 2);    // byteRate
        bw.Write((short)2);          // blockAlign
        bw.Write((short)16);         // bitsPerSample
        bw.Write("data"u8);
        bw.Write(samples.Length * 2);
        var bytes = new byte[samples.Length * 2];
        Buffer.BlockCopy(samples, 0, bytes, 0, bytes.Length);
        bw.Write(bytes);
    }

    [Fact]
    public void IsSingleChunk_ThresholdIsChunkSecPlusOne_SameSemanticsAsLegacy()
    {
        // 短音频（≤31s = ChunkSec+1）单块直跑：原始 wav 整段直传、不切块——
        // 分支语义与旧版一致（旧版为 ≤121s），仅阈值数字随块长变小
        Assert.True(MossTranscribeEngine.IsSingleChunk(31));
        Assert.True(MossTranscribeEngine.IsSingleChunk(20.5));
        Assert.True(MossTranscribeEngine.IsSingleChunk(0));
        Assert.False(MossTranscribeEngine.IsSingleChunk(31.01));
        Assert.False(MossTranscribeEngine.IsSingleChunk(32));
    }
}
