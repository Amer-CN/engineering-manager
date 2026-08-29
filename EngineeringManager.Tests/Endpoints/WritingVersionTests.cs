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
/// T2 写作中心版本历史集成测试：
///   a. 保存留档：第一次保存留档旧内容；改上一条快照 created_at 到 6 分钟前再保存 → 再留档（共 2 条，内容正确）
///   b. 5min 节流：距上一条快照 &lt; 5min 的保存不新增快照
///   c. 上限清理：文档已有 51 条快照 → 保存触发裁剪到 50 条
///   d. restore：回滚写回版本 title/content_md，且回滚前的当前内容先入档（不节流）
///   e. 归属隔离：非本人文档 versions/restore → 404/403
/// 认证方式与 WritingFolderTests 一致：登录拿 JWT → Authorization Bearer。
/// </summary>
public class WritingVersionTests : ApiTestBase
{
    private const string AdminUser = "admin";
    private const string AdminPassword = "admin123";
    private const string ManagerUser = "version-manager";
    private const string ManagerPassword = "manager123";

    /// <summary>建 manager 用户（有 writing 全套权限码，走 manager 角色默认权限）。</summary>
    private void SeedManager()
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var salt = "version-manager-salt-123456";
        var hash = EngineeringManager.Api.Common.HashPassword(ManagerPassword, salt, 2);
        conn.Execute(@"
            INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
            new
            {
                Id = "version-manager",
                Username = ManagerUser,
                Password = ManagerPassword,
                Hash = hash,
                Salt = salt,
                Version = 2,
                DisplayName = "版本经理",
                RoleId = "manager",
                Status = "active",
                Now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
            });
    }

    private async Task<string> LoginAsync(string username, string password)
    {
        var resp = await Client.PostAsJsonAsync("/api/auth/login", new { username, password });
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

    private async Task<long> CreateDoc(string token, string contentMd)
    {
        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/writing/documents",
            new { title = "T2 版本测试文档", docType = "summary", contentMd });
        var data = await GetData(resp);
        return data.GetProperty("id").GetInt64();
    }

    private Task<HttpResponseMessage> SaveAsync(string token, long docId, string contentMd) =>
        AuthedAsync(token, HttpMethod.Put, $"/api/writing/documents/{docId}", new { contentMd });

    private async Task<JsonElement> ListVersions(string token, long docId, string query = "?size=50") =>
        await GetData(await AuthedAsync(token, HttpMethod.Get, $"/api/writing/documents/{docId}/versions{query}"));

    /// <summary>把该文档最新一条快照的 created_at 改到 6 分钟前（模拟节流窗口已过）。</summary>
    private void AgeLastSnapshot(long docId, int minutes = 6)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var last = conn.ExecuteScalar<long>(
            "SELECT id FROM writing_document_versions WHERE document_id = @Id ORDER BY id DESC LIMIT 1",
            new { Id = docId });
        var aged = DateTime.Now.AddMinutes(-minutes).ToString("yyyy-MM-dd HH:mm:ss");
        conn.Execute(
            "UPDATE writing_document_versions SET created_at = @CreatedAt WHERE id = @Id",
            new { CreatedAt = aged, Id = last });
    }

    // ── a. 保存留档：间隔 >5min 的两次保存各留一条旧内容 ──

    [Fact]
    public async Task 保存两次_间隔超5min_各留一条旧内容快照()
    {
        var token = await LoginAsync(AdminUser, AdminPassword);
        var docId = await CreateDoc(token, "初稿内容");

        // 第一次保存：留档"初稿内容"
        await GetData(await SaveAsync(token, docId, "第一版修改"));
        // 模拟距上一条快照 >5min（直接 DB 改 created_at 到 6 分钟前）
        AgeLastSnapshot(docId);

        // 第二次保存：留档"第一版修改"
        await GetData(await SaveAsync(token, docId, "第二版修改"));

        var data = await ListVersions(token, docId);
        Assert.Equal(2, data.GetProperty("total").GetInt32());
        var items = data.GetProperty("items").EnumerateArray().ToList();
        // created_at DESC：最新在前
        Assert.Equal("第一版修改", items[0].GetProperty("contentMd").GetString());
        Assert.Equal("初稿内容", items[1].GetProperty("contentMd").GetString());
        // 保存人（display_name，users JOIN）
        Assert.Equal("管理员", items[0].GetProperty("createdBy").GetString());
    }

    // ── b. 5min 节流：窗口内第二次保存不新增快照 ──

    [Fact]
    public async Task 五分钟内第二次保存_不新增快照()
    {
        var token = await LoginAsync(AdminUser, AdminPassword);
        var docId = await CreateDoc(token, "内容一");

        await GetData(await SaveAsync(token, docId, "内容二"));
        // 不改 created_at：距上一条快照 <5min
        await GetData(await SaveAsync(token, docId, "内容三"));

        var data = await ListVersions(token, docId);
        Assert.Equal(1, data.GetProperty("total").GetInt32());
        Assert.Equal("内容一", data.GetProperty("items")[0].GetProperty("contentMd").GetString());
    }

    // ── c. 上限清理：已有 51 条 → 保存触发裁剪到 50 ──

    [Fact]
    public async Task 超上限_保存后裁剪到最近50条()
    {
        var token = await LoginAsync(AdminUser, AdminPassword);
        var docId = await CreateDoc(token, "批量快照前置内容");

        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Open();
            // 直接插 51 条快照（绕过端点造数），created_at 一律设 6 分钟前：
            // 既满足节流窗口已过（本次保存会留档），也不会打乱 created_at DESC 的展示序
            var aged = DateTime.Now.AddMinutes(-6).ToString("yyyy-MM-dd HH:mm:ss");
            for (var i = 1; i <= 51; i++)
            {
                conn.Execute(@"INSERT INTO writing_document_versions
                    (document_id, title, content_md, created_by, created_at)
                    VALUES (@DocumentId, @Title, @Content, @Uid, @CreatedAt)",
                    new { DocumentId = docId, Title = "T2 版本测试文档", Content = $"历史第{i}版", Uid = "1", CreatedAt = aged });
            }
        }

        // 保存 → 插入第 52 条后裁掉最旧，剩 50 条
        await GetData(await SaveAsync(token, docId, "上限测试新内容"));

        var data = await ListVersions(token, docId);
        Assert.Equal(50, data.GetProperty("total").GetInt32());
        var items = data.GetProperty("items").EnumerateArray().ToList();
        // 最新 = 本次保存留档的"批量快照前置内容"；裁掉最旧 2 条（51+1=52 → 50），最旧留档 = "历史第3版"
        Assert.Equal("批量快照前置内容", items[0].GetProperty("contentMd").GetString());
        Assert.Equal("历史第3版", items[49].GetProperty("contentMd").GetString());
    }

    // ── d. restore：写回版本内容，当前内容先入档（不节流） ──

    [Fact]
    public async Task restore_内容回滚_且当前内容入档()
    {
        var token = await LoginAsync(AdminUser, AdminPassword);
        var docId = await CreateDoc(token, "回滚目标版本");

        // 保存产生一条快照（= 回滚目标），age 后再保存一次改变当前内容
        await GetData(await SaveAsync(token, docId, "改坏的版本"));
        AgeLastSnapshot(docId);
        await GetData(await SaveAsync(token, docId, "改得更坏"));

        var versions = await ListVersions(token, docId);
        var target = versions.GetProperty("items").EnumerateArray()
            .First(v => v.GetProperty("contentMd").GetString() == "回滚目标版本");

        // restore 到"回滚目标版本"
        var data = await GetData(await AuthedAsync(token, HttpMethod.Post,
            $"/api/writing/documents/{docId}/versions/{target.GetProperty("id").GetInt64()}/restore"));
        Assert.Equal("回滚目标版本", data.GetProperty("contentMd").GetString());

        // 文档内容已回滚（GET 详情直查）
        var doc = await GetData(await AuthedAsync(token, HttpMethod.Get, $"/api/writing/documents/{docId}"));
        Assert.Equal("回滚目标版本", doc.GetProperty("contentMd").GetString());

        // 回滚前的当前内容（"改得更坏"）已入档且立即可见（restore 不节流）
        var after = await ListVersions(token, docId);
        Assert.Equal(3, after.GetProperty("total").GetInt32());
        Assert.Equal("改得更坏", after.GetProperty("items")[0].GetProperty("contentMd").GetString());

        // 审计已写（resource=writing_documents，event=restore_version）
        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Open();
            var details = conn.ExecuteScalar<string>(
                "SELECT details FROM audit_logs WHERE resource = 'writing_documents' AND resource_id = @Id ORDER BY id DESC LIMIT 1",
                new { Id = docId.ToString() });
            Assert.NotNull(details);
            using var doc2 = JsonDocument.Parse(details!);
            Assert.Equal("restore_version", doc2.RootElement.GetProperty("event").GetString());
        }
    }

    // ── e. 归属隔离：非本人文档 versions/restore → 404/403 ──

    [Fact]
    public async Task 非本人文档_versions与restore_被拒()
    {
        SeedManager();
        var adminToken = await LoginAsync(AdminUser, AdminPassword);
        var managerToken = await LoginAsync(ManagerUser, ManagerPassword);

        // admin 的文档
        var docId = await CreateDoc(adminToken, "admin 的文档内容");
        await GetData(await SaveAsync(adminToken, docId, "admin 修改"));
        var versions = await ListVersions(adminToken, docId);
        var versionId = versions.GetProperty("items")[0].GetProperty("id").GetInt64();

        // manager（有 writing:read/update 码但非本人文档）→ versions 404 / restore 404
        var listResp = await AuthedAsync(managerToken, HttpMethod.Get, $"/api/writing/documents/{docId}/versions");
        Assert.Equal(HttpStatusCode.NotFound, listResp.StatusCode);
        var restoreResp = await AuthedAsync(managerToken, HttpMethod.Post,
            $"/api/writing/documents/{docId}/versions/{versionId}/restore");
        Assert.Equal(HttpStatusCode.NotFound, restoreResp.StatusCode);

        // admin 仍可访问（全量豁免）
        Assert.True((await ListVersions(adminToken, docId)).GetProperty("total").GetInt32() >= 1);
    }

    // ── 边界：restore 版本不属于该文档 → 404 ──

    [Fact]
    public async Task restore_版本不属于该文档_404()
    {
        var token = await LoginAsync(AdminUser, AdminPassword);
        var docA = await CreateDoc(token, "文档A内容");
        var docB = await CreateDoc(token, "文档B内容");
        await GetData(await SaveAsync(token, docA, "A 修改"));

        // B 没有任何快照：拿 A 的（不存在的）versionId 去恢复 B → 404
        var aVersions = await ListVersions(token, docA);
        var aVersionId = aVersions.GetProperty("items")[0].GetProperty("id").GetInt64();
        var resp = await AuthedAsync(token, HttpMethod.Post, $"/api/writing/documents/{docB}/versions/{aVersionId}/restore");
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    // ── 边界：分页 clamp（size 超 50 收到 50）──

    [Fact]
    public async Task versions_分页size超上限_收到50()
    {
        var token = await LoginAsync(AdminUser, AdminPassword);
        var docId = await CreateDoc(token, "分页内容");
        await GetData(await SaveAsync(token, docId, "分页修改"));

        var data = await ListVersions(token, docId, "?size=999");
        Assert.Equal(50, data.GetProperty("size").GetInt32());
        Assert.True(data.GetProperty("total").GetInt32() >= 1);
    }
}
