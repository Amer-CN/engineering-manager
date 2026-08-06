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
/// 窗口 G2 B7：projects/project-members 系写端点权限测试
/// 覆盖：项目编辑、项目成员添加/移除（目标码 projects:update）
/// —— worker（无 projects:update）→ 403；admin → 200。
/// </summary>
public class WritePermissionB7Tests : ApiTestBase
{
    private const string AdminUser = "admin";
    private const string AdminPassword = "admin123";
    private const string WorkerUser = "worker";
    private const string WorkerPassword = "worker123";

    private void SeedWorkerWithJsonRoles()
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var salt = "b7-worker-salt-1234567890";
        var hash = EngineeringManager.Api.Common.HashPassword(WorkerPassword, salt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES ('2', @U, @P, @H, @S, 2, '工人', 'worker', 'active', @Now)",
            new { U = WorkerUser, P = WorkerPassword, H = hash, S = salt, Now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") });
        // worker 有 projects:read/export，无 projects:update
        conn.Execute("UPDATE roles SET permissions=@P WHERE id='worker'",
            new { P = "[\"dashboard:read\",\"projects:read\",\"projects:export\",\"wages:read\",\"contracts:export\"]" });
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

    [Fact]
    public async Task Worker_ProjectUpdate_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Put, "/api/projects/1", new { name = "越权改" });

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Worker_ProjectMemberAdd_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/project-members",
            new { projectId = 1, memberId = 1 });

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Worker_ProjectMemberRemove_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Delete, "/api/project-members/1");

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Admin_ProjectUpdate_Returns200()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(AdminUser, AdminPassword);
        // 先建项目拿 id
        var create = await AuthedAsync(token, HttpMethod.Post, "/api/projects", new { name = "测试项目" });
        Assert.Equal(HttpStatusCode.OK, create.StatusCode);
        var id = (await create.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetInt64();

        var resp = await AuthedAsync(token, HttpMethod.Put, $"/api/projects/{id}", new { name = "改名项目" });

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task Admin_ProjectMemberAdd_Returns200()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(AdminUser, AdminPassword);
        var create = await AuthedAsync(token, HttpMethod.Post, "/api/projects", new { name = "成员项目" });
        var projectId = (await create.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetInt64();
        // 成员行需要存在（无 FK 强制，直接插）
        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Open();
            conn.Execute("INSERT OR IGNORE INTO members (id, name, member_type, status, created_at) VALUES (1, '成员甲', 'staff', 'active', @Now)",
                new { Now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") });
        }

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/project-members",
            new { projectId, memberId = 1 });

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }
}
