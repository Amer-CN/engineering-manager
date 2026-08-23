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
/// R3 写作中心文件夹集成测试：
///   · 建文件夹 → 建文档挂文件夹 → 列表 folderId 筛选（>0 该文件夹 / 0 未分组 / 缺省不过滤）
///   · 软删文件夹 → 其文档 folder_id 置 NULL（回到未分组）
///   · 改名 / 移出 / 归属隔离（非 admin 只能动自己 created_by 的文档）
/// 认证方式与 ApiTestBase 一致：登录拿 JWT → Authorization Bearer。
/// admin 拥有全部权限码（HasPermission 直通），故用 admin 走主链路。
/// </summary>
public class WritingFolderTests : ApiTestBase
{
    private const string AdminUser = "admin";
    private const string AdminPassword = "admin123";
    private const string WorkerUser = "worker";
    private const string WorkerPassword = "worker123";

    /// <summary>建 worker 用户（无 writing 写码，走 worker 角色默认权限）。</summary>
    private void SeedWorker()
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var salt = "worker-salt-1234567890123456";
        var hash = EngineeringManager.Api.Common.HashPassword(WorkerPassword, salt, 2);
        conn.Execute(@"
            INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
            new
            {
                Id = "2",
                Username = WorkerUser,
                Password = WorkerPassword,
                Hash = hash,
                Salt = salt,
                Version = 2,
                DisplayName = "工人",
                RoleId = "worker",
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

    private async Task<long> CreateFolder(string token, string name)
    {
        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/writing/folders", new { name });
        var data = await GetData(resp);
        return data.GetProperty("id").GetInt64();
    }

    private async Task<long> CreateDoc(string token, string title)
    {
        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/writing/documents",
            new { title, docType = "summary", contentMd = "" });
        var data = await GetData(resp);
        return data.GetProperty("id").GetInt64();
    }

    private async Task<JsonElement> ListDocs(string token, string? query = null)
    {
        var resp = await AuthedAsync(token, HttpMethod.Get, $"/api/writing/documents{query}");
        return await GetData(resp);
    }

    // ── 主链路：建文件夹 → 建文档挂文件夹 → folderId 筛选 → 软删 → 文档回未分组 ──

    [Fact]
    public async Task 建文件夹挂文档_列表folderId筛选_软删文件夹后文档回未分组()
    {
        var token = await LoginAsync(AdminUser, AdminPassword);
        var folderId = await CreateFolder(token, "安全资料");
        Assert.True(folderId > 0);

        // 建两个文档：一个挂文件夹，一个不挂
        var docIn = await CreateDoc(token, "文件夹内文档");
        var docOut = await CreateDoc(token, "未分组文档");
        var moveResp = await AuthedAsync(token, HttpMethod.Put, $"/api/writing/documents/{docIn}/folder",
            new { folderId });
        await GetData(moveResp);

        // 列表输出含 folderId
        var all = await ListDocs(token, "?size=100");
        var items = all.GetProperty("items");
        var inItem = items.EnumerateArray().First(i => i.GetProperty("id").GetInt64() == docIn);
        var outItem = items.EnumerateArray().First(i => i.GetProperty("id").GetInt64() == docOut);
        Assert.Equal(folderId, inItem.GetProperty("folderId").GetInt64());
        Assert.Equal(JsonValueKind.Null, outItem.GetProperty("folderId").ValueKind);

        // folderId=N → 只返回该文件夹文档
        var byFolder = await ListDocs(token, $"?folderId={folderId}&size=100");
        var byFolderTitles = byFolder.GetProperty("items").EnumerateArray()
            .Select(i => i.GetProperty("title").GetString()).ToList();
        Assert.Contains("文件夹内文档", byFolderTitles);
        Assert.DoesNotContain("未分组文档", byFolderTitles);

        // folderId=0 → 未分组（folder_id IS NULL）
        var ungrouped = await ListDocs(token, "?folderId=0&size=100");
        var ungroupedTitles = ungrouped.GetProperty("items").EnumerateArray()
            .Select(i => i.GetProperty("title").GetString()).ToList();
        Assert.Contains("未分组文档", ungroupedTitles);
        Assert.DoesNotContain("文件夹内文档", ungroupedTitles);

        // 缺省 → 不过滤，两个都在
        Assert.Equal(2, all.GetProperty("total").GetInt32());

        // 软删文件夹 → 文档 folder_id 置 NULL（回到未分组）
        var delResp = await AuthedAsync(token, HttpMethod.Delete, $"/api/writing/folders/{folderId}");
        await GetData(delResp);

        var afterDelete = await ListDocs(token, $"?folderId={folderId}&size=100");
        Assert.Equal(0, afterDelete.GetProperty("total").GetInt32());

        var afterUngrouped = await ListDocs(token, "?folderId=0&size=100");
        var afterUngroupedIds = afterUngrouped.GetProperty("items").EnumerateArray()
            .Select(i => i.GetProperty("id").GetInt64()).ToList();
        Assert.Contains(docIn, afterUngroupedIds); // 原文件夹内文档回到未分组
        Assert.Contains(docOut, afterUngroupedIds);
    }

    // ── 文件夹 CRUD：空名拒绝 / 改名 / 软删后列表不再出现 ──

    [Fact]
    public async Task 文件夹空名被拒绝_改名生效_软删后列表不出现()
    {
        var token = await LoginAsync(AdminUser, AdminPassword);
        var folderId = await CreateFolder(token, "原名");

        // 空名拒绝（400）
        var emptyResp = await AuthedAsync(token, HttpMethod.Post, "/api/writing/folders", new { name = "  " });
        Assert.Equal(HttpStatusCode.BadRequest, emptyResp.StatusCode);

        // 改名
        var renameResp = await AuthedAsync(token, HttpMethod.Put, $"/api/writing/folders/{folderId}", new { name = "新名" });
        await GetData(renameResp);

        // 列表可见新名
        var listResp = await AuthedAsync(token, HttpMethod.Get, "/api/writing/folders");
        var folders = await GetData(listResp);
        var names = folders.EnumerateArray().Select(f => f.GetProperty("name").GetString()).ToList();
        Assert.Contains("新名", names);
        Assert.DoesNotContain("原名", names);

        // 软删后列表不再出现
        await AuthedAsync(token, HttpMethod.Delete, $"/api/writing/folders/{folderId}");
        var listResp2 = await AuthedAsync(token, HttpMethod.Get, "/api/writing/folders");
        var folders2 = await GetData(listResp2);
        Assert.DoesNotContain("新名", folders2.EnumerateArray().Select(f => f.GetProperty("name").GetString()).ToList());
    }

    // ── 归属隔离：非 admin 只能动自己 created_by 的文档（照 WritingEndpoints PUT 语义）──

    [Fact]
    public async Task 非admin不能把别人的文档移入文件夹()
    {
        SeedWorker();
        var adminToken = await LoginAsync(AdminUser, AdminPassword);
        var workerToken = await LoginAsync(WorkerUser, WorkerPassword);

        // admin 建的文档（created_by=admin）
        var docId = await CreateDoc(adminToken, "admin 的文档");
        var folderId = await CreateFolder(adminToken, "admin 的文件夹");

        // worker（角色默认无 writing:update，HasPermission 查 roles.permissions）→ 403
        var resp = await AuthedAsync(workerToken, HttpMethod.Put, $"/api/writing/documents/{docId}/folder",
            new { folderId });
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);

        // 顺带验证：worker 无 writing:create → 建文件夹也 403
        var resp2 = await AuthedAsync(workerToken, HttpMethod.Post, "/api/writing/folders", new { name = "x" });
        Assert.Equal(HttpStatusCode.Forbidden, resp2.StatusCode);
    }

    // ── 移出文件夹：folderId=null 置 NULL ──

    [Fact]
    public async Task 移出文件夹_folderId为null()
    {
        var token = await LoginAsync(AdminUser, AdminPassword);
        var folderId = await CreateFolder(token, "临时文件夹");
        var docId = await CreateDoc(token, "待移出文档");

        await AuthedAsync(token, HttpMethod.Put, $"/api/writing/documents/{docId}/folder", new { folderId });
        await AuthedAsync(token, HttpMethod.Put, $"/api/writing/documents/{docId}/folder", new { folderId = (int?)null });

        var all = await ListDocs(token, "?size=100");
        var doc = all.GetProperty("items").EnumerateArray().First(i => i.GetProperty("id").GetInt64() == docId);
        Assert.Equal(JsonValueKind.Null, doc.GetProperty("folderId").ValueKind);
    }

    // ── 删除仅限创建者（admin 豁免）：非创建者 403，创建者/admin 可删 ──

    /// <summary>建第二个有 writing:delete 权限的用户（manager 角色），用于验证「非创建者删除被拒」。</summary>
    private void SeedOtherManager()
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        const string otherPassword = "admin123";
        var salt = "other-manager-salt-12345678";
        var hash = EngineeringManager.Api.Common.HashPassword(otherPassword, salt, 2);
        conn.Execute(@"
            INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
            new
            {
                Id = "other-manager",
                Username = "folder-other",
                Password = otherPassword,
                Hash = hash,
                Salt = salt,
                Version = 2,
                DisplayName = "另一位经理",
                RoleId = "manager",
                Status = "active",
                Now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
            });
    }

    [Fact]
    public async Task 删除文件夹_仅创建者可删_他人403_admin豁免()
    {
        SeedOtherManager();
        var adminToken = await LoginAsync(AdminUser, AdminPassword);
        var otherToken = await LoginAsync("folder-other", "admin123");

        // admin 建的文件夹：非创建者 manager 有 writing:delete 也被拒，文件夹仍存在
        var adminFolder = await CreateFolder(adminToken, "admin 的文件夹");
        var denyResp = await AuthedAsync(otherToken, HttpMethod.Delete, $"/api/writing/folders/{adminFolder}");
        Assert.Equal(HttpStatusCode.Forbidden, denyResp.StatusCode);
        var foldersAfterDeny = await GetData(
            await AuthedAsync(adminToken, HttpMethod.Get, "/api/writing/folders"));
        Assert.Contains(foldersAfterDeny.EnumerateArray(), f => f.GetProperty("id").GetInt64() == adminFolder);

        // 创建者本人可删自己的
        var creatorToken = otherToken;
        var otherFolder = await CreateFolder(creatorToken, "other 自己的文件夹");
        var selfResp = await AuthedAsync(creatorToken, HttpMethod.Delete, $"/api/writing/folders/{otherFolder}");
        Assert.True(selfResp.IsSuccessStatusCode, $"创建者删除自己文件夹应成功：{selfResp.StatusCode}");

        // admin 豁免：可删他人文件夹
        var otherFolder2 = await CreateFolder(creatorToken, "other 的第二个文件夹");
        var adminResp = await AuthedAsync(adminToken, HttpMethod.Delete, $"/api/writing/folders/{otherFolder2}");
        Assert.True(adminResp.IsSuccessStatusCode, $"admin 删除他人文件夹应成功：{adminResp.StatusCode}");
    }

    // ── 数据库直查：软删文件夹事务正确落库 ──

    [Fact]
    public async Task 软删文件夹_数据库层面folder_id为NULL()
    {
        var token = await LoginAsync(AdminUser, AdminPassword);
        var folderId = await CreateFolder(token, "DB 校验文件夹");
        var docId = await CreateDoc(token, "DB 校验文档");
        await AuthedAsync(token, HttpMethod.Put, $"/api/writing/documents/{docId}/folder", new { folderId });

        await AuthedAsync(token, HttpMethod.Delete, $"/api/writing/folders/{folderId}");

        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var folderDeletedAt = conn.ExecuteScalar<string>(
            "SELECT deleted_at FROM writing_folders WHERE id = @Id", new { Id = folderId });
        Assert.NotNull(folderDeletedAt);
        var docFolderId = conn.ExecuteScalar<long?>(
            "SELECT folder_id FROM writing_documents WHERE id = @Id", new { Id = docId });
        Assert.Null(docFolderId);
    }
}
