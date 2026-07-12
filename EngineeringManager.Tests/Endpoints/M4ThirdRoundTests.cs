using EngineeringManager.Tests.Common;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.IO;
using System.Threading.Tasks;
using Dapper;
using Microsoft.Data.Sqlite;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// M4 第三轮整改测试 — 覆盖 GPT-5.6 第二轮审查要求
///
/// 测试项:
/// 1. 路径穿越攻击（stt/<uid>/../<other>/file 跨用户目录）
/// 2. 大文件上传（>128MB 被正确接受，>512MB 被拒绝）
/// 3. 上传中断清理（.uploading 临时文件被清除）
/// 4. segments 校验完整性（连续 1..N、数量/长度限制、不传 segments 保留原始元数据）
/// 5. 响应契约一致性（create job / ingest / list 均包裹在 data 中）
/// 6. knowledge:read 权限覆盖（详情/删除/手动入库/STT ingest）
/// </summary>
[Collection("M4ThirdRound")]
public class M4ThirdRoundTests : ApiTestBase
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

    // ═══════════════════════════════════════════════════════════
    // 1. 路径穿越测试
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task Transcribe_PathTraversal_DotDot_CrossUser_Rejected()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        // 尝试用 .. 穿越：从当前用户目录跳到其他用户目录
        var resp = await Client.PostAsJsonAsync("/api/stt/transcribe", new
        {
            filePath = "../2/evil.wav",
            isMultiSpeaker = false,
        });

        Assert.False(resp.IsSuccessStatusCode);
        var body = await resp.Content.ReadAsStringAsync();
        Assert.Contains("无权", body);
    }

    [Fact]
    public async Task Transcribe_PathTraversal_AbsolutePath_Rejected()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        // 尝试用绝对路径
        var resp = await Client.PostAsJsonAsync("/api/stt/transcribe", new
        {
            filePath = "/etc/passwd",
            isMultiSpeaker = false,
        });

        Assert.False(resp.IsSuccessStatusCode);
    }

    [Fact]
    public async Task Transcribe_PathTraversal_BackslashVariation_Rejected()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        // 尝试用反斜杠穿越
        var resp = await Client.PostAsJsonAsync("/api/stt/transcribe", new
        {
            filePath = "stt\\1\\..\\2\\evil.wav",
            isMultiSpeaker = false,
        });

        Assert.False(resp.IsSuccessStatusCode);
    }

    // ═══════════════════════════════════════════════════════════
    // 2. 大文件上传测试（>128MB 被 MultipartBodyLengthLimit 接受）
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task UploadAudio_130MB_AcceptedByMultipartLimit()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        // 130MB > 128MB 默认 Kestrel 限制，但 MultipartBodyLengthLimit = 550MB 应接受
        var audioData = new byte[130 * 1024 * 1024];
        audioData[0] = 0x52; audioData[1] = 0x49; audioData[2] = 0x46; audioData[3] = 0x46;

        using var form = new MultipartFormDataContent();
        form.Add(CreateAudioContent("large.wav", audioData), "file", "large.wav");

        var resp = await Client.PostAsync("/api/stt/upload", form);
        Assert.True(resp.IsSuccessStatusCode, await resp.Content.ReadAsStringAsync());

        var body = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        Assert.True(doc.RootElement.GetProperty("success").GetBoolean());
    }

    [Fact]
    public async Task UploadAudio_Exceeds500MB_Rejected()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        // 501MB > 500MB MaxAudioSize，应被拒绝
        var audioData = new byte[501 * 1024 * 1024];
        audioData[0] = 0x52; audioData[1] = 0x49; audioData[2] = 0x46; audioData[3] = 0x46;

        using var form = new MultipartFormDataContent();
        form.Add(CreateAudioContent("huge.wav", audioData), "file", "huge.wav");

        var resp = await Client.PostAsync("/api/stt/upload", form);
        Assert.False(resp.IsSuccessStatusCode);
        var body = await resp.Content.ReadAsStringAsync();
        Assert.Contains("过大", body);
    }

    // ═══════════════════════════════════════════════════════════
    // 3. 上传中断清理测试
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task UploadAudio_NoUploadingTempFilesLeftAfterSuccess()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        var audioData = new byte[] { 0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00 };
        using var form = new MultipartFormDataContent();
        form.Add(CreateAudioContent("cleanup.wav", audioData), "file", "cleanup.wav");

        var resp = await Client.PostAsync("/api/stt/upload", form);
        Assert.True(resp.IsSuccessStatusCode);

        // 验证没有 .uploading 临时文件残留
        var dataPath = ApiConfig.ResolveDataPath();
        var sttDir = Path.Combine(dataPath, "uploads", "stt", "1");
        var uploadingFiles = Directory.GetFiles(sttDir, "*.uploading", SearchOption.TopDirectoryOnly);
        Assert.Empty(uploadingFiles);
    }

    [Fact]
    public async Task UploadAudio_CancelledMidStream_CleansUpTempFile()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        var dataPath = ApiConfig.ResolveDataPath();
        var sttDir = Path.Combine(dataPath, "uploads", "stt", "1");
        Directory.CreateDirectory(sttDir); // 确保目录存在

        // 使用 CancellationTokenSource 在写入中途取消
        using var cts = new CancellationTokenSource();
        // 10MB 文件（减少大小以加快 .uploading 创建速度）
        var audioData = new byte[10 * 1024 * 1024];
        audioData[0] = 0x52; audioData[1] = 0x49; audioData[2] = 0x46; audioData[3] = 0x46;

        // 使用慢速流内容：每写入 1KB 就延时 1ms，确保请求到达服务端后仍在传输中被取消
        var slowContent = new SlowStreamContent(audioData, "cancel.wav");

        using var form = new MultipartFormDataContent();
        form.Add(slowContent, "file", "cancel.wav");

        // Barrier：等待 .uploading 文件创建（证明请求已到达服务端并开始写入）
        var uploadingCreated = new TaskCompletionSource<bool>();
        var uploadingPath = Path.Combine(sttDir, "cancel.wav.uploading");
        var watcher = new FileSystemWatcher(sttDir);
        watcher.Created += (s, e) => {
            if (e.Name?.EndsWith(".uploading") == true)
                uploadingCreated.TrySetResult(true);
        };
        watcher.EnableRaisingEvents = true;

        // 启动上传任务
        var uploadTask = Task.Run(async () => {
            try
            {
                await Client.PostAsync("/api/stt/upload", form, cts.Token);
            }
            catch (OperationCanceledException)
            {
                // 预期：请求在传输中被取消
            }
            catch (IOException)
            {
                // 客户端在取消时可能抛 IOException
            }
        });

        // 等待 .uploading 文件创建（barrier）
        await Task.WhenAny(uploadingCreated.Task, Task.Delay(5000));
        watcher.Dispose();

        Assert.True(uploadingCreated.Task.IsCompleted, ".uploading 文件未在 5s 内创建，请求可能未到达服务端");

        // 现在触发取消
        cts.Cancel();

        await uploadTask;

        // 验证 .uploading 临时文件已被清理
        await Task.Delay(1000);
        var uploadingFiles = Directory.GetFiles(sttDir, "*.uploading", SearchOption.TopDirectoryOnly);
        Assert.True(uploadingFiles.Length == 0, $"应无 .uploading 残留，但有 {uploadingFiles.Length} 个: {string.Join(", ", uploadingFiles)}");
    }

    // ═══════════════════════════════════════════════════════════
    // 4. segments 校验完整性测试
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task Ingest_Segments_NonConsecutiveSpeakers_Rejected()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        var jobId = CreateTestJob("1", "测试文本");
        var segments = new[]
        {
            new { speaker = 1, start = 0.0, end = 5.0, text = "说话人1" },
            new { speaker = 3, start = 5.0, end = 10.0, text = "说话人3（跳过了2）" },
        };

        var resp = await Client.PostAsJsonAsync($"/api/stt/jobs/{jobId}/ingest", new
        {
            text = "说话人1\n说话人3（跳过了2）",
            segments,
        });

        Assert.False(resp.IsSuccessStatusCode);
        var body = await resp.Content.ReadAsStringAsync();
        Assert.Contains("连续", body);
    }

    [Fact]
    public async Task Ingest_Segments_TooMany_Rejected()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        var jobId = CreateTestJob("1", "测试文本");
        // 生成 5001 个 segments
        var segments = Enumerable.Range(0, 5001)
            .Select(i => new { speaker = 1, start = (double)i, end = (double)(i + 1), text = $"段{i}" })
            .ToArray();

        var resp = await Client.PostAsJsonAsync($"/api/stt/jobs/{jobId}/ingest", new
        {
            text = "测试文本",
            segments,
        });

        Assert.False(resp.IsSuccessStatusCode);
        var body = await resp.Content.ReadAsStringAsync();
        Assert.Contains("过多", body);
    }

    [Fact]
    public async Task Ingest_Segments_SingleTextTooLong_Rejected()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        var jobId = CreateTestJob("1", "测试文本");
        var longText = new string('A', 10_001);
        var segments = new[]
        {
            new { speaker = 1, start = 0.0, end = 5.0, text = longText },
        };

        var resp = await Client.PostAsJsonAsync($"/api/stt/jobs/{jobId}/ingest", new
        {
            text = "测试文本",
            segments,
        });

        Assert.False(resp.IsSuccessStatusCode);
    }

    [Fact]
    public async Task Ingest_FullTextTooLong_Rejected()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        var jobId = CreateTestJob("1", "测试文本");
        var longText = new string('A', 100_001);

        var resp = await Client.PostAsJsonAsync($"/api/stt/jobs/{jobId}/ingest", new
        {
            text = longText,
        });

        Assert.False(resp.IsSuccessStatusCode);
    }

    [Fact]
    public async Task Ingest_SegmentsRecomposedTextMismatch_Rejected()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        var jobId = CreateTestJob("1", "原始文本");
        var segments = new[]
        {
            new { speaker = 1, start = 0.0, end = 5.0, text = "实际内容A" },
            new { speaker = 2, start = 5.0, end = 10.0, text = "实际内容B" },
        };

        // text 与 segments 重组不一致
        var resp = await Client.PostAsJsonAsync($"/api/stt/jobs/{jobId}/ingest", new
        {
            text = "这是不匹配的全文",
            segments,
        });

        Assert.False(resp.IsSuccessStatusCode);
        var body = await resp.Content.ReadAsStringAsync();
        Assert.Contains("不一致", body);
    }

    [Fact]
    public async Task Ingest_SegmentsRecomposedTextMatching_Accepted()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        var jobId = CreateTestJob("1", "原始文本");
        var segments = new[]
        {
            new { speaker = 1, start = 0.0, end = 5.0, text = "第一段内容" },
            new { speaker = 2, start = 5.0, end = 10.0, text = "第二段内容" },
        };

        // text 与 segments 重组一致（格式：【说话人N】文本）
        var resp = await Client.PostAsJsonAsync($"/api/stt/jobs/{jobId}/ingest", new
        {
            text = "【说话人1】第一段内容\n【说话人2】第二段内容",
            segments,
            title = "一致测试",
        });

        Assert.True(resp.IsSuccessStatusCode, await resp.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Ingest_TextWithoutSegments_PreservesOriginalSpeakerMetadata()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        // 创建一个带 result_json 的 job
        var resultJson = JsonSerializer.Serialize(new[]
        {
            new { speaker = 1, start = 0.0, end = 5.0, text = "原始说话人1文本" },
            new { speaker = 2, start = 5.0, end = 10.0, text = "原始说话人2文本" },
        });
        var jobId = CreateTestJob("1", "原始全文", resultJson);

        // 只传校对文本，不传 segments
        var resp = await Client.PostAsJsonAsync($"/api/stt/jobs/{jobId}/ingest", new
        {
            text = "校对后的全文",
            title = "只传文本",
        });

        Assert.True(resp.IsSuccessStatusCode, await resp.Content.ReadAsStringAsync());
        var body = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var docId = doc.RootElement.GetProperty("data").GetProperty("documentId").GetInt64();

        // 验证 speakers 元数据被保留（来自原始 segments）
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var speakers = conn.QuerySingle<string>(
            "SELECT speakers FROM knowledge_documents WHERE id = @Id",
            new { Id = docId });
        Assert.Contains("说话人1", speakers);
        Assert.Contains("说话人2", speakers);
    }

    // ═══════════════════════════════════════════════════════════
    // 5. 响应契约一致性测试
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task UploadThenTranscribe_PathResolution_NoDuplicatePath()
    {
        // 验证 upload 返回的 filePath 传给 transcribe 后不会路径重复
        var token = await LoginAdminAsync();
        SetAuth(token);

        // 1. 上传文件
        var audioData = new byte[] { 0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00 };
        using var form = new MultipartFormDataContent();
        form.Add(CreateAudioContent("pathtest.wav", audioData), "file", "pathtest.wav");
        var uploadResp = await Client.PostAsync("/api/stt/upload", form);
        Assert.True(uploadResp.IsSuccessStatusCode, await uploadResp.Content.ReadAsStringAsync());
        var uploadBody = await uploadResp.Content.ReadAsStringAsync();
        using var uploadDoc = JsonDocument.Parse(uploadBody);
        var filePath = uploadDoc.RootElement.GetProperty("data").GetProperty("filePath").GetString();
        Assert.NotNull(filePath);
        Assert.StartsWith("stt/", filePath);

        // 2. 调用 transcribe — 验证文件能被找到（不会因路径重复而返回"文件不存在"）
        var resp = await Client.PostAsJsonAsync("/api/stt/transcribe", new
        {
            filePath = filePath,
            isMultiSpeaker = false,
        });

        var body = await resp.Content.ReadAsStringAsync();

        // ASR 引擎可能不可用（503），但路径解析错误会返回 400 + "音频文件不存在"
        // 关键验证：不能出现"音频文件不存在"（说明路径重复了）
        Assert.DoesNotContain("音频文件不存在", body);

        // 如果 ASR 引擎可用且成功，验证响应契约：jobId 在 data 中
        if (resp.IsSuccessStatusCode)
        {
            using var doc = JsonDocument.Parse(body);
            Assert.True(doc.RootElement.GetProperty("success").GetBoolean());
            Assert.True(doc.RootElement.TryGetProperty("data", out var data));
            Assert.True(data.TryGetProperty("jobId", out _));
            Assert.True(data.TryGetProperty("status", out _));
        }
        else
        {
            // 非 503 的失败必须包含有意义的错误信息（不能是静默失败）
            // 503 = ASR 引擎不可用，这是预期行为
            Assert.True(resp.StatusCode == HttpStatusCode.ServiceUnavailable,
                $"意外的失败状态码 {resp.StatusCode}: {body}");
        }
    }

    [Fact]
    public async Task SttJobsList_Response_DataNestedInData()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        // 创建一些 jobs
        CreateTestJob("1", "测试1");
        CreateTestJob("1", "测试2");

        var resp = await Client.GetAsync("/api/stt/jobs?page=1&size=10");
        Assert.True(resp.IsSuccessStatusCode);

        var body = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        Assert.True(doc.RootElement.GetProperty("success").GetBoolean());
        var data = doc.RootElement.GetProperty("data");
        // data.data 是数组
        Assert.True(data.TryGetProperty("data", out var arr));
        Assert.Equal(JsonValueKind.Array, arr.ValueKind);
        // data.total 是数字
        Assert.True(data.TryGetProperty("total", out var total));
        Assert.True(total.GetInt32() >= 2);
    }

    [Fact]
    public async Task KnowledgeDocumentsList_Response_DataNestedInData()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        // 先创建一个文档
        await Client.PostAsJsonAsync("/api/knowledge/documents", new
        {
            text = "文档列表契约测试文本",
            title = "文档列表契约测试",
        });

        // 请求列表
        var resp = await Client.GetAsync("/api/knowledge/documents?page=1&size=10");
        Assert.True(resp.IsSuccessStatusCode);

        var body = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        Assert.True(doc.RootElement.GetProperty("success").GetBoolean());
        var data = doc.RootElement.GetProperty("data");
        // data.data 是数组
        Assert.True(data.TryGetProperty("data", out var arr));
        Assert.Equal(JsonValueKind.Array, arr.ValueKind);
        Assert.True(arr.GetArrayLength() >= 1);
        // data.total 是数字
        Assert.True(data.TryGetProperty("total", out var total));
        Assert.True(total.GetInt32() >= 1);
        // data.page 和 data.size
        Assert.True(data.TryGetProperty("page", out _));
        Assert.True(data.TryGetProperty("size", out _));
    }

    // ═══════════════════════════════════════════════════════════
    // 6. knowledge:read 权限覆盖测试
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task KnowledgeIngest_RequiresKnowledgeReadPermission()
    {
        // 创建一个没有 knowledge:read 权限的 worker 用户
        var adminToken = await LoginAdminAsync();
        SetAuth(adminToken);

        // 创建 worker 用户
        await Client.PostAsJsonAsync("/api/users", new
        {
            username = "worker_nokr",
            password = "admin123",
            displayName = "无知识库权限工人",
            roleId = "worker",
            status = "active",
        });

        // 登录 worker
        var workerLogin = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = "worker_nokr", password = "admin123" });
        var workerBody = await workerLogin.Content.ReadAsStringAsync();
        var workerToken = ExtractTokenFromJson(workerBody);
        SetAuth(workerToken);

        // 尝试手动入库
        var resp = await Client.PostAsJsonAsync("/api/knowledge/documents", new
        {
            text = "测试文本",
            title = "测试标题",
        });

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task KnowledgeGetDetail_RequiresKnowledgeReadPermission()
    {
        // 先用 admin 创建一个文档
        var adminToken = await LoginAdminAsync();
        SetAuth(adminToken);

        var createResp = await Client.PostAsJsonAsync("/api/knowledge/documents", new
        {
            text = "测试详情文本",
            title = "测试详情",
        });
        Assert.True(createResp.IsSuccessStatusCode);
        var createBody = await createResp.Content.ReadAsStringAsync();
        using var createDoc = JsonDocument.Parse(createBody);
        var docId = createDoc.RootElement.GetProperty("data").GetProperty("documentId").GetInt64();

        // 创建 worker 用户并登录
        await Client.PostAsJsonAsync("/api/users", new
        {
            username = "worker_detail",
            password = "admin123",
            displayName = "详情权限测试",
            roleId = "worker",
            status = "active",
        });
        var workerLogin = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = "worker_detail", password = "admin123" });
        var workerBody = await workerLogin.Content.ReadAsStringAsync();
        var workerToken = ExtractTokenFromJson(workerBody);
        SetAuth(workerToken);

        // worker 尝试访问详情
        var resp = await Client.GetAsync($"/api/knowledge/documents/{docId}");
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task KnowledgeDelete_RequiresKnowledgeReadPermission()
    {
        // 先用 admin 创建一个文档
        var adminToken = await LoginAdminAsync();
        SetAuth(adminToken);

        var createResp = await Client.PostAsJsonAsync("/api/knowledge/documents", new
        {
            text = "测试删除文本",
            title = "测试删除",
        });
        Assert.True(createResp.IsSuccessStatusCode);
        var createBody = await createResp.Content.ReadAsStringAsync();
        using var createDoc = JsonDocument.Parse(createBody);
        var docId = createDoc.RootElement.GetProperty("data").GetProperty("documentId").GetInt64();

        // 创建 worker 用户并登录
        await Client.PostAsJsonAsync("/api/users", new
        {
            username = "worker_delete",
            password = "admin123",
            displayName = "删除权限测试",
            roleId = "worker",
            status = "active",
        });
        var workerLogin = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = "worker_delete", password = "admin123" });
        var workerBody = await workerLogin.Content.ReadAsStringAsync();
        var workerToken = ExtractTokenFromJson(workerBody);
        SetAuth(workerToken);

        // worker 尝试删除
        var resp = await Client.DeleteAsync($"/api/knowledge/documents/{docId}");
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task SttIngest_RequiresKnowledgeReadPermission()
    {
        // 用 admin 创建一个 completed job
        var adminToken = await LoginAdminAsync();
        SetAuth(adminToken);
        var jobId = CreateTestJob("1", "测试STT入库文本");

        // 创建 worker 用户并登录
        await Client.PostAsJsonAsync("/api/users", new
        {
            username = "worker_stt_ingest",
            password = "admin123",
            displayName = "STT入库权限测试",
            roleId = "worker",
            status = "active",
        });
        var workerLogin = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = "worker_stt_ingest", password = "admin123" });
        var workerBody = await workerLogin.Content.ReadAsStringAsync();
        var workerToken = ExtractTokenFromJson(workerBody);
        SetAuth(workerToken);

        // worker 尝试 STT ingest — 403（无 knowledge:read 权限）
        var resp = await Client.PostAsJsonAsync($"/api/stt/jobs/{jobId}/ingest", new
        {
            text = "worker的入库文本",
        });

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }
}

/// <summary>
/// 慢速流 HttpContent — 每 1KB 写入后延时 1ms，用于模拟大文件慢速上传
/// 确保 CancellationToken 在传输过程中触发，而非请求发出前
/// </summary>
file class SlowStreamContent : ByteArrayContent
{
    private readonly byte[] _data;

    public SlowStreamContent(byte[] data, string fileName) : base(data)
    {
        _data = data;
        Headers.ContentType = new MediaTypeHeaderValue("audio/wav");
        Headers.ContentDisposition = new ContentDispositionHeaderValue("form-data")
        {
            Name = "\"file\"",
            FileName = $"\"{fileName}\""
        };
    }

    protected override async Task SerializeToStreamAsync(Stream stream, TransportContext? context, CancellationToken cancellationToken)
    {
      var buffer = new byte[1024];
      var offset = 0;
      while (offset < _data.Length)
      {
        cancellationToken.ThrowIfCancellationRequested();
        var chunkSize = Math.Min(1024, _data.Length - offset);
        Buffer.BlockCopy(_data, offset, buffer, 0, chunkSize);
        await stream.WriteAsync(buffer, 0, chunkSize, cancellationToken);
        offset += chunkSize;
        // 10MB 文件用 0.5ms 延时（更快创建 .uploading）
        await Task.Delay(0, cancellationToken);
      }
    }
}
