using EngineeringManager.Tests.Common;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// R4 风格轮换集成测试：GET /api/writing/next-style?docType=xxx
///   · 「上次风格」= 本人 + 该文体 + 有 style_id + 未软删 的最新一篇
///   · 下一个 = Styles 数组顺序 +1（S6 回绕 S1）；无历史 / 历史 style_id 非法 → S1
/// 认证方式与 WritingFolderTests 一致：登录拿 JWT → Authorization Bearer。
/// </summary>
public class WritingStyleRotationTests : ApiTestBase
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

    private async Task<HttpResponseMessage> AuthedGet(string token, string path)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, path);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return await Client.SendAsync(req);
    }

    /// <summary>建文档（style_id 直接入库，照 POST /api/writing/documents 语义）。</summary>
    private async Task<long> CreateDoc(string token, string docType, string styleId)
    {
        var req = new HttpRequestMessage(HttpMethod.Post, "/api/writing/documents")
        {
            Content = JsonContent.Create(new { title = $"轮换测试-{docType}-{styleId}", docType, styleId, contentMd = "" }),
        };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var resp = await Client.SendAsync(req);
        resp.EnsureSuccessStatusCode();
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean(), json.ToString());
        return json.GetProperty("data").GetProperty("id").GetInt64();
    }

    private async Task<JsonElement> GetNext(string token, string docType)
    {
        var resp = await AuthedGet(token, $"/api/writing/next-style?docType={docType}");
        resp.EnsureSuccessStatusCode();
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean(), json.ToString());
        return json.GetProperty("data");
    }

    // ── ① 无历史 → S1，lastStyleId 为 null ──

    [Fact]
    public async Task 无历史_返回S1且lastStyleId为null()
    {
        var token = await LoginAsync();
        var data = await GetNext(token, "weekly_report");
        Assert.Equal("S1", data.GetProperty("styleId").GetString());
        Assert.Equal("数据驱动型", data.GetProperty("styleName").GetString());
        Assert.Equal(JsonValueKind.Null, data.GetProperty("lastStyleId").ValueKind);
    }

    // ── ② 建一篇周报 style_id=S3 → 下一篇 S4 ──

    [Fact]
    public async Task 建周报S3_下一篇为S4()
    {
        var token = await LoginAsync();
        await CreateDoc(token, "weekly_report", "S3");
        var data = await GetNext(token, "weekly_report");
        Assert.Equal("S4", data.GetProperty("styleId").GetString());
        Assert.Equal("故事叙事型", data.GetProperty("styleName").GetString());
    }

    // ── ③ lastStyleId 回显上次风格 ──

    [Fact]
    public async Task lastStyleId回显上一篇风格()
    {
        var token = await LoginAsync();
        await CreateDoc(token, "weekly_report", "S3");
        var data = await GetNext(token, "weekly_report");
        Assert.Equal("S3", data.GetProperty("lastStyleId").GetString());
    }

    // ── ④ S6 → 回绕 S1 ──

    [Fact]
    public async Task S6下一篇回绕S1()
    {
        var token = await LoginAsync();
        await CreateDoc(token, "weekly_report", "S6");
        var data = await GetNext(token, "weekly_report");
        Assert.Equal("S1", data.GetProperty("styleId").GetString());
        Assert.Equal("S6", data.GetProperty("lastStyleId").GetString());
    }

    // ── ⑤ 端点通用：非周报文体同样轮换，且文体间历史互不干扰 ──

    [Fact]
    public async Task 非周报文体同样轮换_文体间历史隔离()
    {
        var token = await LoginAsync();
        await CreateDoc(token, "minutes_items", "S2");
        var minutes = await GetNext(token, "minutes_items");
        Assert.Equal("S3", minutes.GetProperty("styleId").GetString());

        // meeting_minutes 的历史不影响 weekly_report：无该文体历史 → S1
        var weekly = await GetNext(token, "weekly_report");
        Assert.Equal("S1", weekly.GetProperty("styleId").GetString());
    }

    // ── ⑥ 无效 docType / 缺参 → 400 ──

    [Fact]
    public async Task 无效或缺失docType返回400()
    {
        var token = await LoginAsync();
        var resp = await AuthedGet(token, "/api/writing/next-style?docType=not_a_type");
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);

        var resp2 = await AuthedGet(token, "/api/writing/next-style");
        Assert.Equal(HttpStatusCode.BadRequest, resp2.StatusCode);
    }
}
