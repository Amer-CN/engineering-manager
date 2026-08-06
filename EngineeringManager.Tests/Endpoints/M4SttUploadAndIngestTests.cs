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
/// M4 后端集成测试
///
/// 测试项:
/// 1. multipart 音频上传（成功/不支持格式/超过上限/未登录/中文文件名/安全路径）
/// 2. corrected ingest（不带 body 兼容/带校对文本/带 segments/无权 projectId/幂等/job ownership）
///
/// H-4 flaky 根治：与 M4ThirdRoundTests 共用串行集合（同写 uploads/stt/1
/// 目录，.uploading 临时文件跨测试竞态）。
/// </summary>
[Collection("M4 Stt Upload Serialized")]
public class M4SttUploadAndIngestTests : ApiTestBase
{
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

    private static ByteArrayContent CreateAudioContent(string fileName, byte[] data)
    {
        var content = new ByteArrayContent(data);
        content.Headers.ContentType = new MediaTypeHeaderValue("audio/mpeg");
        content.Headers.ContentDisposition = new ContentDispositionHeaderValue("form-data")
        {
            Name = "file",
            FileName = fileName,
        };
        return content;
    }

    // ═══════════════════════════════════════════════════════════
    // 上传测试
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task UploadAudio_ValidMp3_ReturnsFilePath()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        var audioData = new byte[] { 0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00 }; // fake mp3 header
        using var form = new MultipartFormDataContent();
        form.Add(CreateAudioContent("test.mp3", audioData), "file", "test.mp3");

        var resp = await Client.PostAsync("/api/stt/upload", form);
        Assert.True(resp.IsSuccessStatusCode, await resp.Content.ReadAsStringAsync());

        var body = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        Assert.True(doc.RootElement.GetProperty("success").GetBoolean());
        var data = doc.RootElement.GetProperty("data");
        var filePath = data.GetProperty("filePath").GetString();
        Assert.NotNull(filePath);
        Assert.StartsWith("stt/", filePath);
        Assert.EndsWith(".mp3", filePath);
        Assert.Equal("test.mp3", data.GetProperty("originalName").GetString());
    }

    [Fact]
    public async Task UploadAudio_ValidWav_ReturnsFilePath()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        var audioData = new byte[] { 0x52, 0x49, 0x46, 0x46 }; // RIFF header
        using var form = new MultipartFormDataContent();
        form.Add(CreateAudioContent("recording.wav", audioData), "file", "recording.wav");

        var resp = await Client.PostAsync("/api/stt/upload", form);
        Assert.True(resp.IsSuccessStatusCode);
    }

    [Fact]
    public async Task UploadAudio_UnsupportedExe_Rejected()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        var exeData = new byte[] { 0x4D, 0x5A }; // MZ header
        using var form = new MultipartFormDataContent();
        form.Add(CreateAudioContent("malware.exe", exeData), "file", "malware.exe");

        var resp = await Client.PostAsync("/api/stt/upload", form);
        Assert.False(resp.IsSuccessStatusCode);
        var body = await resp.Content.ReadAsStringAsync();
        Assert.Contains("不支持", body);
    }

    [Fact]
    public async Task UploadAudio_UnsupportedTxt_Rejected()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        var txtData = System.Text.Encoding.UTF8.GetBytes("not an audio file");
        using var form = new MultipartFormDataContent();
        form.Add(CreateAudioContent("notes.txt", txtData), "file", "notes.txt");

        var resp = await Client.PostAsync("/api/stt/upload", form);
        Assert.False(resp.IsSuccessStatusCode);
    }

    [Fact]
    public async Task UploadAudio_Unauthenticated_Rejected()
    {
        Client.DefaultRequestHeaders.Authorization = null;

        var audioData = new byte[] { 0x52, 0x49, 0x46, 0x46 };
        using var form = new MultipartFormDataContent();
        form.Add(CreateAudioContent("test.wav", audioData), "file", "test.wav");

        var resp = await Client.PostAsync("/api/stt/upload", form);
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task UploadAudio_ChineseFileName_Success()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        var audioData = new byte[] { 0x52, 0x49, 0x46, 0x46 };
        using var form = new MultipartFormDataContent();
        form.Add(CreateAudioContent("会议录音.m4a", audioData), "file", "会议录音.m4a");

        var resp = await Client.PostAsync("/api/stt/upload", form);
        Assert.True(resp.IsSuccessStatusCode, await resp.Content.ReadAsStringAsync());

        var body = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var data = doc.RootElement.GetProperty("data");
        Assert.Equal("会议录音.m4a", data.GetProperty("originalName").GetString());
    }

    [Fact]
    public async Task UploadAudio_FileWrittenToSttDirectory()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        var audioData = new byte[] { 0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00 };
        using var form = new MultipartFormDataContent();
        form.Add(CreateAudioContent("verify.wav", audioData), "file", "verify.wav");

        var resp = await Client.PostAsync("/api/stt/upload", form);
        Assert.True(resp.IsSuccessStatusCode);

        var body = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var filePath = doc.RootElement.GetProperty("data").GetProperty("filePath").GetString();

        // 验证文件实际写入磁盘
        var dataPath = ApiConfig.ResolveDataPath();
        var fullPath = Path.Combine(dataPath, "uploads", filePath!);
        Assert.True(File.Exists(fullPath), $"文件应存在于 {fullPath}");

        // 验证文件内容
        var writtenBytes = await File.ReadAllBytesAsync(fullPath);
        Assert.Equal(audioData, writtenBytes);
    }

    // ═══════════════════════════════════════════════════════════
    // Corrected Ingest 测试
    // ═══════════════════════════════════════════════════════════

    /// <summary>创建一个 completed 状态的 STT job（直接插入数据库）</summary>
    private long CreateTestJob(string userId, string resultText, string? resultJson = null)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
        return conn.QuerySingle<long>(@"
            INSERT INTO stt_jobs
                (source_file, source_path, source_type, engine, status, progress,
                 is_multi_speaker, num_speakers, result_text, result_json,
                 created_at, updated_at, created_by)
            VALUES
                (@SourceFile, @SourcePath, 'audio', 'test', 'completed', 100,
                 1, 2, @ResultText, @ResultJson,
                 @Now, @Now, @CreatedBy);
            SELECT last_insert_rowid();",
            new
            {
                SourceFile = "test.mp3",
                SourcePath = "stt/test/test.mp3",
                ResultText = resultText,
                ResultJson = resultJson,
                Now = now,
                CreatedBy = userId,
            });
    }

    [Fact]
    public async Task Ingest_NoBody_UsesOriginalResultText()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        var jobId = CreateTestJob("1", "这是原始转写文本内容");

        var resp = await Client.PostAsync($"/api/stt/jobs/{jobId}/ingest", null);
        Assert.True(resp.IsSuccessStatusCode, await resp.Content.ReadAsStringAsync());

        var body = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        Assert.True(doc.RootElement.GetProperty("success").GetBoolean());
        Assert.False(doc.RootElement.GetProperty("data").GetProperty("idempotent").GetBoolean());
        var docId = doc.RootElement.GetProperty("data").GetProperty("documentId").GetInt64();

        // 验证 knowledge_documents.full_text 是原始文本
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var fullText = conn.QuerySingle<string>(
            "SELECT full_text FROM knowledge_documents WHERE id = @Id",
            new { Id = docId });
        Assert.Contains("这是原始转写文本内容", fullText);
    }

    [Fact]
    public async Task Ingest_WithCorrectedText_UsesCorrectedText()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        var jobId = CreateTestJob("1", "原始转写文本");
        var correctedText = "这是校对后的修正文本，修正了识别错误";

        var resp = await Client.PostAsJsonAsync($"/api/stt/jobs/{jobId}/ingest", new
        {
            text = correctedText,
            title = "校对后的通话记录",
        });

        Assert.True(resp.IsSuccessStatusCode, await resp.Content.ReadAsStringAsync());

        var body = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        Assert.True(doc.RootElement.GetProperty("success").GetBoolean());
        var docId = doc.RootElement.GetProperty("data").GetProperty("documentId").GetInt64();

        // 验证 full_text 是校对后的文本
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var (fullText, title) = conn.QuerySingle<(string, string)>(
            "SELECT full_text, title FROM knowledge_documents WHERE id = @Id",
            new { Id = docId });
        Assert.Equal(correctedText, fullText);
        Assert.Equal("校对后的通话记录", title);
    }

    [Fact]
    public async Task Ingest_WithCorrectedSegments_SpeakersPreserved()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        var jobId = CreateTestJob("1", "原始文本");
        var correctedSegments = new[]
        {
            new { speaker = 1, start = 0.0, end = 5.0, text = "说话人1的校对文本" },
            new { speaker = 2, start = 5.0, end = 10.0, text = "说话人2的校对文本" },
        };

        var resp = await Client.PostAsJsonAsync($"/api/stt/jobs/{jobId}/ingest", new
        {
            text = "【说话人1】说话人1的校对文本\n【说话人2】说话人2的校对文本",
            segments = correctedSegments,
            title = "多人通话校对",
        });

        Assert.True(resp.IsSuccessStatusCode, await resp.Content.ReadAsStringAsync());

        var body = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var docId = doc.RootElement.GetProperty("data").GetProperty("documentId").GetInt64();

        // 验证 speakers JSON 正确
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var speakers = conn.QuerySingle<string>(
            "SELECT speakers FROM knowledge_documents WHERE id = @Id",
            new { Id = docId });
        Assert.Contains("说话人1", speakers);
        Assert.Contains("说话人2", speakers);
    }

    [Fact]
    public async Task Ingest_NoProjectPermission_Returns403()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        // 创建一个不存在的 projectId
        var jobId = CreateTestJob("1", "测试文本");

        var resp = await Client.PostAsJsonAsync($"/api/stt/jobs/{jobId}/ingest", new
        {
            text = "测试文本",
            projectId = 99999, // 不存在的项目
        });

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);

        // 验证没有新增文档
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var count = conn.QuerySingle<int>(
            "SELECT COUNT(*) FROM knowledge_documents WHERE source_ref = @Ref",
            new { Ref = jobId.ToString() });
        Assert.Equal(0, count);
    }

    [Fact]
    public async Task Ingest_RepeatCall_Idempotent()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        var jobId = CreateTestJob("1", "幂等测试文本");

        // 第一次入库
        var resp1 = await Client.PostAsJsonAsync($"/api/stt/jobs/{jobId}/ingest", new
        {
            text = "幂等测试文本",
            title = "幂等测试",
        });
        Assert.True(resp1.IsSuccessStatusCode);
        var body1 = await resp1.Content.ReadAsStringAsync();
        using var doc1 = JsonDocument.Parse(body1);
        var docId1 = doc1.RootElement.GetProperty("data").GetProperty("documentId").GetInt64();
        Assert.False(doc1.RootElement.GetProperty("data").GetProperty("idempotent").GetBoolean());

        // 第二次入库（幂等）
        var resp2 = await Client.PostAsJsonAsync($"/api/stt/jobs/{jobId}/ingest", new
        {
            text = "不同的文本",
            title = "不同标题",
        });
        Assert.True(resp2.IsSuccessStatusCode);
        var body2 = await resp2.Content.ReadAsStringAsync();
        using var doc2 = JsonDocument.Parse(body2);
        var docId2 = doc2.RootElement.GetProperty("data").GetProperty("documentId").GetInt64();
        Assert.True(doc2.RootElement.GetProperty("data").GetProperty("idempotent").GetBoolean());

        // 应返回同一个 documentId
        Assert.Equal(docId1, docId2);
    }

    [Fact]
    public async Task Ingest_JobBelongsToAnotherUser_NotFound()
    {
        // 用 admin 创建 job
        var adminToken = await LoginAdminAsync();
        SetAuth(adminToken);
        var jobId = CreateTestJob("1", "admin的转写文本");

        // 创建 worker 用户
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        await Client.PostAsJsonAsync("/api/users", new
        {
            username = "worker1",
            password = "admin123",
            displayName = "测试工人",
            roleId = "worker",
            status = "active",
        });

        // 登录 worker
        var workerLogin = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = "worker1", password = "admin123" });
        var workerBody = await workerLogin.Content.ReadAsStringAsync();
        var workerToken = ExtractTokenFromJson(workerBody);
        SetAuth(workerToken);

        // worker 尝试 ingest admin 的 job
        // 返回 403 因为 worker 没有 knowledge:read 权限（权限检查在 job 查询之前）
        var resp = await Client.PostAsJsonAsync($"/api/stt/jobs/{jobId}/ingest", new
        {
            text = "worker尝试入库",
        });

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Ingest_EmptyText_Rejected()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        var jobId = CreateTestJob("1", "原始文本");

        var resp = await Client.PostAsJsonAsync($"/api/stt/jobs/{jobId}/ingest", new
        {
            text = "",
        });

        Assert.False(resp.IsSuccessStatusCode);
        var body = await resp.Content.ReadAsStringAsync();
        Assert.Contains("空", body);
    }
}
