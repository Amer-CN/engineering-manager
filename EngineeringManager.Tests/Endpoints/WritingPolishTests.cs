using EngineeringManager.Tests.Common;
using System.Data;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Dapper;
using Microsoft.Data.Sqlite;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// R9 写作中心体验清扫后端修复集成测试：
///   a. 空 PUT 不假更新：全空 body → success 且 updated_at 不变（不 UPDATE / 不 bump / 不写审计）
///   b. docType 归一化：POST docType="SUMMARY"（大小写不敏感命中）→ 库中标准 "summary" → next-style 能命中该文档
///   c. 非法 styleId POST → 400
///   d. 含双引号文件夹名创建成功且 audit_logs.details 可被 JsonSerializer 解析（DB 直查反序列化断言）
/// 认证方式与 WritingFolderTests 一致：登录拿 JWT → Authorization Bearer。
/// </summary>
public class WritingPolishTests : ApiTestBase
{
    private const string AdminUser = "admin";
    private const string AdminPassword = "admin123";

    private async Task<string> LoginAsync()
    {
        var resp = await Client.PostAsJsonAsync("/api/auth/login", new { username = AdminUser, password = AdminPassword });
        resp.EnsureSuccessStatusCode();
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("data").GetProperty("token").GetString()!;
    }

    private async Task<HttpResponseMessage> AuthedAsync(string token, HttpMethod method, string path, object? body = null)
    {
        var req = new HttpRequestMessage(method, path);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        if (body != null) req.Content = JsonContent.Create(body);
        return await Client.SendAsync(req);
    }

    private static async Task<JsonElement> GetData(HttpResponseMessage resp)
    {
        resp.EnsureSuccessStatusCode();
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean(), json.ToString());
        return json.GetProperty("data");
    }

    private async Task<long> CreateDoc(string token, string docType, string? styleId = null)
    {
        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/writing/documents",
            new { title = "R9 清扫测试文档", docType, styleId, contentMd = "" });
        var data = await GetData(resp);
        return data.GetProperty("id").GetInt64();
    }

    private Task<string> GetUpdatedAt(long docId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return Task.FromResult(conn.ExecuteScalar<string>(
            "SELECT updated_at FROM writing_documents WHERE id = @Id", new { Id = docId })!);
    }

    // ── a. 空 PUT 不假更新 ──

    [Fact]
    public async Task 空PUT_返回success且updated_at不变()
    {
        var token = await LoginAsync();
        var docId = await CreateDoc(token, "summary");

        var before = await GetUpdatedAt(docId);
        // SQLite updated_at 粒度为秒：等 1.1s 保证若真 UPDATE 则值必然变化
        await Task.Delay(1100);

        // 全空 PUT（Title 空白 / ContentMd null / ProjectId null）
        var resp = await AuthedAsync(token, HttpMethod.Put, $"/api/writing/documents/{docId}",
            new { title = "  ", contentMd = (string?)null, projectId = (int?)null });
        await GetData(resp);

        var after = await GetUpdatedAt(docId);
        Assert.Equal(before, after);
    }

    [Fact]
    public async Task 非空PUT_照旧更新updated_at()
    {
        var token = await LoginAsync();
        var docId = await CreateDoc(token, "summary");

        var before = await GetUpdatedAt(docId);
        await Task.Delay(1100); // updated_at 粒度为秒，确保必然跨秒

        var resp = await AuthedAsync(token, HttpMethod.Put, $"/api/writing/documents/{docId}",
            new { title = "新标题", contentMd = "新内容" });
        await GetData(resp);

        var after = await GetUpdatedAt(docId);
        Assert.NotEqual(before, after);
    }

    // ── b. docType 归一化："SUMMARY" → 库中标准 "summary"，next-style 能命中 ──

    [Fact]
    public async Task 大写docType变体_入库为标准形式_nextStyle能命中()
    {
        var token = await LoginAsync();
        // 注册表键为 OrdinalIgnoreCase（"SUMMARY" 命中 "summary"）
        var docId = await CreateDoc(token, "SUMMARY", "S3");

        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Open();
            var stored = conn.ExecuteScalar<string>(
                "SELECT doc_type FROM writing_documents WHERE id = @Id", new { Id = docId });
            Assert.Equal("summary", stored);
        }

        // next-style 按标准 "summary" 查询 → 能命中该文档的 S3（下一篇 S4）
        var resp = await AuthedAsync(token, HttpMethod.Get, "/api/writing/next-style?docType=summary");
        var data = await GetData(resp);
        Assert.Equal("S3", data.GetProperty("lastStyleId").GetString());
        Assert.Equal("S4", data.GetProperty("styleId").GetString());
    }

    [Fact]
    public async Task 大写styleId变体_入库为标准形式()
    {
        var token = await LoginAsync();
        var docId = await CreateDoc(token, "summary", "s3");

        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var stored = conn.ExecuteScalar<string>(
            "SELECT style_id FROM writing_documents WHERE id = @Id", new { Id = docId });
        Assert.Equal("S3", stored);
    }

    // ── c. 非法 styleId POST → 400 ──

    [Fact]
    public async Task 非法styleId建文档_返回400()
    {
        var token = await LoginAsync();
        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/writing/documents",
            new { title = "坏风格文档", docType = "summary", styleId = "S99", contentMd = "" });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    // ── d. 含双引号文件夹名创建成功且 audit_logs.details 可被 JsonSerializer 解析 ──

    [Fact]
    public async Task 双引号文件夹名_创建成功且审计details为合法JSON()
    {
        var token = await LoginAsync();
        const string name = "含\"引号\"的文件夹";

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/writing/folders", new { name });
        var data = await GetData(resp);
        var folderId = data.GetProperty("id").GetInt64();
        Assert.True(folderId > 0);

        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var details = conn.ExecuteScalar<string>(
            "SELECT details FROM audit_logs WHERE resource = 'writing_folders' AND resource_id = @Id ORDER BY id DESC LIMIT 1",
            new { Id = folderId.ToString() });
        Assert.NotNull(details);
        // 合法 JSON：可被 JsonSerializer 解析，且 name 字段值保留双引号
        using var doc = JsonDocument.Parse(details!);
        Assert.Equal("create_folder", doc.RootElement.GetProperty("event").GetString());
        Assert.Equal(name, doc.RootElement.GetProperty("name").GetString());
    }
}
