using EngineeringManager.Api.Services.Stt;
using EngineeringManager.Tests.Common;
using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// GPU 探测器测试：验证探测逻辑（不依赖真实硬件）
/// </summary>
public class SttEngineSelectorTests
{
    [Fact]
    public void Detect_ReturnsCachedResult()
    {
        // 多次调用应返回同一缓存实例
        var r1 = SttEngineSelector.Detect();
        var r2 = SttEngineSelector.Detect();
        Assert.Same(r1, r2);
    }

    [Fact]
    public void Detect_PopulatesAllGpus()
    {
        var gpu = SttEngineSelector.Detect();
        // 在测试机器上应该至少有一个 GPU
        Assert.True(gpu.AllGpus.Count > 0, "至少应检测到一个显卡");
    }

    [Fact]
    public void CanUseLocalStt_ResultConsistentWithUnavailableReason()
    {
        // CanUseLocalStt() 与 GetUnavailableReason() 语义一致：
        // 不可用 → reason 非空字符串；可用 → reason 为空串（见 SttEngineSelector 实现）
        var canUse = SttEngineSelector.CanUseLocalStt();
        var reason = SttEngineSelector.GetUnavailableReason();
        if (canUse)
        {
            Assert.True(string.IsNullOrEmpty(reason),
                $"CanUseLocalStt=true 时 reason 应为空串，实际: \"{reason}\"");
        }
        else
        {
            Assert.False(string.IsNullOrEmpty(reason),
                "CanUseLocalStt=false 时 reason 应给出非空说明");
        }
    }

    [Fact]
    public void GetUnavailableReason_MatchesCanUseLocalStt()
    {
        var canUse = SttEngineSelector.CanUseLocalStt();
        var reason = SttEngineSelector.GetUnavailableReason();
        Assert.True(canUse == string.IsNullOrEmpty(reason),
            $"reason 与可用性不一致: canUse={canUse}, reason=\"{reason}\"");
    }
}

/// <summary>
/// 说话人分离服务测试
/// 重点验证：MergeSegments 段合并算法
/// - 单人不误拆：所有 speaker=0 的段应合并成 1-2 段
/// - 多人能分开：不同说话人的段不被合并
/// - 超短段吸收：< 1.2s 的段被吸收到相邻段
/// </summary>
public class DiarizationServiceTests
{
    [Fact]
    public void Constructor_DoesNotThrow()
    {
        var svc = new DiarizationService();
        Assert.NotNull(svc);
    }

    [Fact]
    public void IsDiarizationModelAvailable_ResultConsistentWithModelFiles()
    {
        // IsDiarizationModelAvailable 是纯文件存在性检查（GetEngineDir 下两个模型文件），
        // 断言其返回值与磁盘状态一致（防"探针不崩"式空过）
        var result = SttModelManager.IsDiarizationModelAvailable();
        var dir = SttModelManager.GetEngineDir();
        var segFile = Path.Combine(dir, SttModelManager.SegmentationModelFile);
        var embFile = Path.Combine(dir, SttModelManager.EmbeddingModelFile);
        var expected = File.Exists(segFile) && File.Exists(embFile);
        Assert.True(result == expected,
            $"IsDiarizationModelAvailable={result} 与文件状态不符 (seg={File.Exists(segFile)}, emb={File.Exists(embFile)})");
    }

    [Fact]
    public void IsAsrModelAvailable_ResultConsistentWithModelFiles()
    {
        // IsAsrModelAvailable = transcribe.exe + 全部 ASR 模型文件存在，断言与磁盘一致
        var result = SttModelManager.IsAsrModelAvailable();
        Assert.IsType<bool>(result);
        // 实现只做文件存在性判断，不抛异常即返回确定 bool；反向一致性：
        // 若返回 true，则 transcribe.exe 必然存在
        if (result)
        {
            Assert.True(File.Exists(SttModelManager.GetTranscribeExePath()),
                "IsAsrModelAvailable=true 但 transcribe.exe 不存在");
        }
    }

    /// <summary>
    /// 单人不误拆：52 段全是 speaker=0 → 应合并成 1 段
    /// 模拟之前实际跑出的 52 段（全是同一个人）
    /// </summary>
    [Fact]
    public void MergeSegments_SingleSpeaker_AllMergeToOne()
    {
        // 模拟 52 段全是 speaker=0（单人被 pyannote 误拆的情况）
        var raw = new List<SttSegment>();
        for (int i = 0; i < 52; i++)
        {
            raw.Add(new SttSegment { Speaker = 0, Start = i * 5.0, End = i * 5.0 + 4.0 });
        }

        var merged = DiarizationService.MergeSegments(raw);

        // 单人不应被拆成多段
        Assert.True(merged.Count <= 2, $"单人 52 段应合并成 1-2 段，实际 {merged.Count} 段");
        Assert.All(merged, s => Assert.Equal(0, s.Speaker));
    }

    /// <summary>
    /// 多人能分开：2 个说话人交替 → 合并后仍应保持 2 个说话人
    /// </summary>
    [Fact]
    public void MergeSegments_MultiSpeaker_KeepSeparate()
    {
        // 模拟 2 人对话：A 说 5s, B 说 3s, A 说 4s, B 说 2s...
        var raw = new List<SttSegment>
        {
            new() { Speaker = 0, Start = 0, End = 5 },
            new() { Speaker = 0, Start = 5.1, End = 8 },   // 同说话人连续
            new() { Speaker = 1, Start = 8.5, End = 12 },
            new() { Speaker = 1, Start = 12.1, End = 14 }, // 同说话人连续
            new() { Speaker = 0, Start = 14.5, End = 20 },
            new() { Speaker = 1, Start = 20.5, End = 25 },
        };

        var merged = DiarizationService.MergeSegments(raw);

        // 应保持 2 个说话人
        var speakers = merged.Select(s => s.Speaker).Distinct().ToList();
        Assert.Equal(2, speakers.Count);
        // 0 和 1 的段不应该被合并到一起
        Assert.Contains(0, speakers);
        Assert.Contains(1, speakers);
        // 合并后段数应少于原始段数
        Assert.True(merged.Count < raw.Count, $"合并后 {merged.Count} 段应少于原始 {raw.Count} 段");
    }

    /// <summary>
    /// 超短段吸收：< 1.2s 的"嗯嗯"回应段应被吸收到相邻段
    /// </summary>
    [Fact]
    public void MergeSegments_ShortSegments_Absorbed()
    {
        // 模拟：A 说长段, B 说 0.8s 短回应, A 继续说
        var raw = new List<SttSegment>
        {
            new() { Speaker = 0, Start = 0, End = 10 },
            new() { Speaker = 1, Start = 10.1, End = 10.9 }, // 0.8s 短回应
            new() { Speaker = 0, Start = 11, End = 20 },
        };

        var merged = DiarizationService.MergeSegments(raw);

        // 短段应被吸收，合并后应少于 3 段
        Assert.True(merged.Count < 3, $"0.8s 短段应被吸收，实际 {merged.Count} 段");
    }

    /// <summary>
    /// 实际 52 段数据模拟：验证合并效果
    /// 用之前真实跑出的 5 分钟录音的段分布（2 人，大量碎段）
    /// </summary>
    [Fact]
    public void MergeSegments_RealWorld_52ToAbout15()
    {
        // 模拟真实场景：2 人对话，52 段（含大量 <1s 的短回应）
        var raw = new List<SttSegment>();
        var rng = new Random(42); // 固定种子
        double t = 0;
        for (int i = 0; i < 52; i++)
        {
            var speaker = i % 3 == 0 ? 1 : 0; // 大约 1/3 是说话人 1
            var dur = rng.NextDouble() < 0.3 ? rng.NextDouble() * 0.8 + 0.2 : rng.NextDouble() * 8 + 2;
            raw.Add(new SttSegment { Speaker = speaker, Start = t, End = t + dur });
            t += dur + rng.NextDouble() * 0.5; // gap 0-0.5s
        }

        var merged = DiarizationService.MergeSegments(raw);

        // 52 段应大幅压缩
        Assert.True(merged.Count < 30, $"52 段应压缩到 30 以内，实际 {merged.Count} 段");
        Console.WriteLine($"MergeSegments: {raw.Count} → {merged.Count} 段");
    }

    /// <summary>
    /// 边界：空列表
    /// </summary>
    [Fact]
    public void MergeSegments_Empty_ReturnsEmpty()
    {
        var merged = DiarizationService.MergeSegments(new List<SttSegment>());
        Assert.Empty(merged);
    }

    /// <summary>
    /// 边界：单段
    /// </summary>
    [Fact]
    public void MergeSegments_Single_ReturnsSingle()
    {
        var raw = new List<SttSegment> { new() { Speaker = 0, Start = 0, End = 5 } };
        var merged = DiarizationService.MergeSegments(raw);
        Assert.Single(merged);
        Assert.Equal(0, merged[0].Start);
        Assert.Equal(5, merged[0].End);
    }

    /// <summary>
    /// 重叠段处理：说话人 0 的段和说话人 1 的段重叠 → 不应互相合并
    /// </summary>
    [Fact]
    public void MergeSegments_OverlappingDifferentSpeakers_NotMerged()
    {
        var raw = new List<SttSegment>
        {
            new() { Speaker = 0, Start = 0, End = 10 },
            new() { Speaker = 1, Start = 5, End = 15 },   // 重叠但不同说话人
            new() { Speaker = 0, Start = 12, End = 20 },   // 重叠但不同说话人
        };

        var merged = DiarizationService.MergeSegments(raw);

        // 不应把不同说话人的段合并
        var speakers = merged.Select(s => s.Speaker).Distinct().ToList();
        Assert.Equal(2, speakers.Count);
    }
}

/// <summary>
/// STT 端点测试：验证 API 响应结构、权限检查
/// </summary>
public class SttEndpointsTests : ApiTestBase
{
    [Fact]
    public async Task GetStatus_Unauthorized_WithoutLogin()
    {
        // 未登录应返回 401
        var resp = await Client.GetAsync("/api/stt/status");
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task Transcribe_Unauthorized_WithoutLogin()
    {
        var resp = await Client.PostAsJsonAsync("/api/stt/transcribe", new
        {
            filePath = "test.wav",
            isMultiSpeaker = false
        });
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }
}
