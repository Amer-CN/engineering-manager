using EngineeringManager.Tests.Common;
using System.Data;
using System.Net;
using System.Net.Http.Json;
using System.Net.Http.Headers;
using System.Text.Json;
using Dapper;
using Microsoft.Data.Sqlite;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// 窗口 C T1：高危/破坏性写端点权限测试（C-6）
/// 覆盖：users/roles 管理端点（提权路径：PUT /api/users 可自改 roleId）、
///       整库级破坏性端点（sqlite/migrate 全表重灌、restore 覆盖 db、categories/reset 全表清空）
///       —— worker（无写码）→ 403；admin → 200。
/// 认证方式与 ApiTestBase 一致：登录拿 JWT → Authorization Bearer。
/// </summary>
public class WritePermissionT1Tests : ApiTestBase
{
    private const string AdminUser = "admin";
    private const string AdminPassword = "admin123";
    private const string WorkerUser = "worker";
    private const string WorkerPassword = "worker123";

    /// <summary>建 worker 用户 + 把 worker/admin 角色权限更新为 JSON 格式（新格式库形态）。
    /// worker 只读（无任何写码）；admin 权限由 HasPermission 直通。</summary>
    private void SeedWorkerWithJsonRoles()
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
        // 新格式库：roles.permissions 为 JSON 数组（037 迁移后形态）
        conn.Execute("UPDATE roles SET permissions=@P WHERE id='worker'",
            new { P = "[\"dashboard:read\",\"projects:read\",\"wages:read\",\"projects:export\",\"contracts:export\"]" });
        conn.Execute("UPDATE roles SET permissions=@P WHERE id='admin'",
            new { P = "[\"dashboard:read\",\"projects:create\",\"projects:delete\",\"projects:export\",\"contracts:create\",\"contracts:update\",\"contracts:delete\",\"contracts:export\",\"settlement:create\",\"settlement:update\",\"settlement:delete\",\"settlement:approve\",\"inventory:create\",\"inventory:read\",\"inventory:update\",\"inventory:delete\",\"drawings:create\",\"drawings:update\",\"drawings:delete\",\"users:create\",\"users:read\",\"users:update\",\"users:delete\",\"roles:read\",\"roles:update\",\"settings:read\",\"settings:update\"]" });
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

    // ── 高危: roles:update（可改写任意角色权限 JSON）──

    [Fact]
    public async Task Worker_UpdateRoles_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Put, "/api/roles",
            new { roleId = "worker", permissions = "[]" });

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Admin_UpdateRoles_Returns200()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(AdminUser, AdminPassword);

        var resp = await AuthedAsync(token, HttpMethod.Put, "/api/roles",
            new { roleId = "worker", permissions = "[\"dashboard:read\"]" });

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    // ── 高危: users:update（提权路径：可把任意用户 roleId 改成 admin）──

    [Fact]
    public async Task Worker_UpdateOtherUser_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        // worker 尝试把 admin 用户改成自己 —— 必须 403
        var resp = await AuthedAsync(token, HttpMethod.Put, "/api/users",
            new { id = "1", username = "admin", displayName = "篡改" });

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Admin_UpdateUser_Returns200()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(AdminUser, AdminPassword);

        var resp = await AuthedAsync(token, HttpMethod.Put, "/api/users",
            new { id = "2", username = "worker", displayName = "工人-改名" });

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    // ── T1 破坏性端点: settings:update（仅 admin）──

    [Fact]
    public async Task Worker_SqliteMigrate_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        // sqlite/migrate 会 DELETE FROM 全表 + JSON 重灌 —— 任何非 admin 必须 403
        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/sqlite/migrate");

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Admin_SqliteMigrate_Returns200()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(AdminUser, AdminPassword);

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/sqlite/migrate");

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task Worker_CostLedgerCategoriesReset_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        // categories/reset 全表清空分类 —— 非 admin 必须 403
        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/cost-ledger/categories/reset");

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Admin_CostLedgerCategoriesReset_Returns200()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(AdminUser, AdminPassword);

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/cost-ledger/categories/reset");

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task Worker_Restore_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        // restore 用桌面备份覆盖 engineering.db —— 非 admin 必须 403（不得触碰到桌面文件）
        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/restore");

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    // ── fail-closed：旧格式权限（001 种子 'all'/逗号串）非 admin 一律 403 ──

    [Fact]
    public async Task Worker_LegacyRoleFormat_FailsClosed()
    {
        // 不调用 SeedWorkerWithJsonRoles —— roles 保持 001 迁移的旧格式种子（逗号串）
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var salt = "legacy-salt-1234567890123456";
        var hash = EngineeringManager.Api.Common.HashPassword("legacy123", salt, 2);
        conn.Execute(@"
            INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES ('3', 'legacy', 'legacy123', @Hash, @Salt, 2, '老工人', 'worker', 'active', @Now)",
            new { Hash = hash, Salt = salt, Now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") });

        var token = await LoginAsync("legacy", "legacy123");
        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/projects",
            new { name = "旧格式越权", budget = 0 });

        // 旧格式解析失败 → fail-closed → 403（不 FAIL-OPEN）
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }
}
