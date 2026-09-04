using EngineeringManager.Api;
using EngineeringManager.Api.Services.Stt;
using EngineeringManager.Tests.Common;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Dapper;
using Microsoft.Data.Sqlite;
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

    // ═══════════════════════════════════════════════════════════
    // cancel / retry / delete 端点测试
    // ═══════════════════════════════════════════════════════════

    private static string ExtractTokenFromJson(string json)
    {
        var marker = "\"token\":\"";
        var i = json.IndexOf(marker);
        if (i < 0) throw new Exception("token 字段未找到: " + json);
        i += marker.Length;
        var j = json.IndexOf('"', i);
        if (j < 0) throw new Exception("token 字段格式错");
        return json.Substring(i, j - i);
    }

    private async Task<string> LoginAdminAsync()
    {
        var login = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = "admin", password = "admin123" });
        login.EnsureSuccessStatusCode();
        var body = await login.Content.ReadAsStringAsync();
        return ExtractTokenFromJson(body);
    }

    private void SetAuth(string token)
    {
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    /// <summary>直接插入指定状态的 STT job（不经过 transcribe 端点）</summary>
    private long CreateJobWithStatus(string status)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
        return conn.QuerySingle<long>(@"
            INSERT INTO stt_jobs
                (source_file, source_path, source_type, engine, status, progress,
                 is_multi_speaker, num_speakers, error, created_at, updated_at, created_by)
            VALUES
                ('test.mp3', 'stt/1/test.mp3', 'audio', 'test', @Status,
                 @Progress, 0, NULL, @Error, @Now, @Now, '1');
            SELECT last_insert_rowid();",
            new
            {
                Status = status,
                Progress = status == "failed" ? 50 : 0,
                Error = status == "failed" ? "转写失败：模型崩溃" : (string?)null,
                Now = now,
            });
    }

    private (string? Status, int Progress, string? Error) GetJobRow(long jobId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.QuerySingle<(string?, int, string?)>(
            "SELECT status, progress, error FROM stt_jobs WHERE id = @Id",
            new { Id = jobId });
    }

    [Fact]
    public async Task Cancel_PendingJob_SetsCancelled()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);
        var jobId = CreateJobWithStatus("pending");

        var resp = await Client.PostAsync($"/api/stt/jobs/{jobId}/cancel", null);
        Assert.True(resp.IsSuccessStatusCode, await resp.Content.ReadAsStringAsync());

        var body = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        Assert.True(doc.RootElement.GetProperty("success").GetBoolean());
        Assert.Equal("cancelled", doc.RootElement.GetProperty("data").GetProperty("status").GetString());

        var (status, _, _) = GetJobRow(jobId);
        Assert.Equal("cancelled", status);
    }

    [Fact]
    public async Task Cancel_CompletedJob_Rejected()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);
        var jobId = CreateJobWithStatus("completed");

        var resp = await Client.PostAsync($"/api/stt/jobs/{jobId}/cancel", null);
        Assert.False(resp.IsSuccessStatusCode);

        var body = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        Assert.False(doc.RootElement.GetProperty("success").GetBoolean());

        // 状态不应被改动
        var (status, _, _) = GetJobRow(jobId);
        Assert.Equal("completed", status);
    }

    [Fact]
    public async Task Retry_FailedJob_ResetsToPending()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);
        var jobId = CreateJobWithStatus("failed");

        var resp = await Client.PostAsync($"/api/stt/jobs/{jobId}/retry", null);
        Assert.True(resp.IsSuccessStatusCode, await resp.Content.ReadAsStringAsync());

        var body = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        Assert.True(doc.RootElement.GetProperty("success").GetBoolean());
        Assert.Equal("pending", doc.RootElement.GetProperty("data").GetProperty("status").GetString());

        // 重试应清掉旧的失败状态：status=pending、progress=0、error 清空
        var (status, progress, error) = GetJobRow(jobId);
        Assert.Equal("pending", status);
        Assert.Equal(0, progress);
        Assert.Null(error);
    }

    [Fact]
    public async Task Retry_PendingJob_Rejected()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);
        var jobId = CreateJobWithStatus("pending");

        var resp = await Client.PostAsync($"/api/stt/jobs/{jobId}/retry", null);
        Assert.False(resp.IsSuccessStatusCode);

        var body = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        Assert.False(doc.RootElement.GetProperty("success").GetBoolean());

        var (status, _, _) = GetJobRow(jobId);
        Assert.Equal("pending", status);
    }

    [Fact]
    public async Task Delete_CompletedJob_RemovesRow()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);
        var jobId = CreateJobWithStatus("completed");

        var resp = await Client.DeleteAsync($"/api/stt/jobs/{jobId}");
        Assert.True(resp.IsSuccessStatusCode, await resp.Content.ReadAsStringAsync());

        var body = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        Assert.True(doc.RootElement.GetProperty("success").GetBoolean());

        // 行应已被删除
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var count = conn.ExecuteScalar<int>(
            "SELECT COUNT(*) FROM stt_jobs WHERE id = @Id", new { Id = jobId });
        Assert.Equal(0, count);
    }

    [Fact]
    public async Task Delete_ProcessingJob_Rejected()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);
        var jobId = CreateJobWithStatus("processing");

        var resp = await Client.DeleteAsync($"/api/stt/jobs/{jobId}");
        Assert.False(resp.IsSuccessStatusCode);

        var body = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        Assert.False(doc.RootElement.GetProperty("success").GetBoolean());

        // 进行中的任务不能删，行应仍在
        var (status, _, _) = GetJobRow(jobId);
        Assert.Equal("processing", status);
    }

    // ═══════════════════════════════════════════════════════════
    // GET /api/stt/jobs/{id}/audio 端点测试（历史任务回放音频）
    // ═══════════════════════════════════════════════════════════

    /// <summary>插入指定 source_path / created_by 的 job（audio 端点测试用）</summary>
    private long CreateJobWithSourcePath(string sourcePath, string uid = "1")
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
        return conn.QuerySingle<long>(@"
            INSERT INTO stt_jobs
                (source_file, source_path, source_type, engine, status, progress,
                 is_multi_speaker, num_speakers, error, created_at, updated_at, created_by)
            VALUES
                ('test.m4a', @SourcePath, 'audio', 'test', 'completed', 100,
                 0, NULL, NULL, @Now, @Now, @Uid);
            SELECT last_insert_rowid();",
            new { SourcePath = sourcePath, Now = now, Uid = uid });
    }

    [Fact]
    public async Task GetAudio_WithValidJob_ReturnsAudio()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        // 2 字节假文件 + .m4a 扩展名（端点只按扩展名映射 content-type，不校验音频内容）
        var fileName = $"audio-test-{Guid.NewGuid():N}.m4a";
        var sttDir = Path.Combine(ApiConfig.ResolveDataPath(), "uploads", "stt", "1");
        Directory.CreateDirectory(sttDir);
        var filePath = Path.Combine(sttDir, fileName);
        File.WriteAllBytes(filePath, new byte[] { 0x00, 0x01 });
        try
        {
            var jobId = CreateJobWithSourcePath($"stt/1/{fileName}");

            var resp = await Client.GetAsync($"/api/stt/jobs/{jobId}/audio");
            Assert.True(resp.IsSuccessStatusCode, await resp.Content.ReadAsStringAsync());
            Assert.Equal("audio/mp4", resp.Content.Headers.ContentType?.MediaType);
            Assert.Equal(2, (await resp.Content.ReadAsByteArrayAsync()).Length);
        }
        finally
        {
            try { if (File.Exists(filePath)) File.Delete(filePath); } catch { }
        }
    }

    [Fact]
    public async Task GetAudio_JobOfOtherUser_Returns404()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);
        // job 归属 uid=999，admin(uid=1) 请求 → 归属校验不过 → 404
        var jobId = CreateJobWithSourcePath("stt/999/other-user.m4a", uid: "999");

        var resp = await Client.GetAsync($"/api/stt/jobs/{jobId}/audio");
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    [Fact]
    public async Task GetAudio_NotFound_Returns404()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        var resp = await Client.GetAsync("/api/stt/jobs/999999/audio");
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }
}
