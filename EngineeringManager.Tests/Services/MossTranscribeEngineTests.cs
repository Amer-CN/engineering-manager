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
}
