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
/// 窗口 C T2：G1 写端点权限测试（前端已有权限码、后端补执行——零行为突变）
/// 覆盖：projects:create —— worker（无码）→ 403；admin → 200 + 库验证。
/// 其余 G1 端点（contracts:update/delete、settlement:delete/approve、inventory:delete）
/// 与 T1 高危端点见 WritePermissionT1Tests / 同机制。
/// 认证方式与 ApiTestBase 一致：登录拿 JWT → Authorization Bearer。
/// </summary>
public class WritePermissionTests : ApiTestBase
{
    private const string AdminUser = "admin";
    private const string AdminPassword = "admin123";
    private const string WorkerUser = "worker";
    private const string WorkerPassword = "worker123";

    /// <summary>建 worker 用户 + 把 worker/admin 角色权限更新为 JSON 格式（新格式库形态）。
    /// worker 只读（无 projects:create）；admin 权限由 HasPermission 直通。</summary>
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

    // ── G1: projects:create ──

    [Fact]
    public async Task Worker_CreateProject_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/projects",
            new { name = "越权项目", budget = 0 });

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Admin_CreateProject_Returns200_AndRowPersisted()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(AdminUser, AdminPassword);

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/projects",
            new { name = "权限测试项目", budget = 0 });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        // 库验证：确实落库（状态码 + 库双重断言）
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var count = conn.ExecuteScalar<int>(
            "SELECT COUNT(*) FROM projects WHERE name=@Name AND created_by=@Uid",
            new { Name = "权限测试项目", Uid = "1" });
        Assert.Equal(1, count);
    }
}
