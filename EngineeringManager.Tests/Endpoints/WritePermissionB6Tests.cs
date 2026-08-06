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
/// 窗口 G2 B6：partners/supervisors 系写端点权限测试
/// 覆盖：单位/监管单位 CRUD（目标码 partners:create/update/delete）
/// —— worker（无 partners 写码）→ 403；admin → 200。
/// </summary>
public class WritePermissionB6Tests : ApiTestBase
{
    private const string AdminUser = "admin";
    private const string AdminPassword = "admin123";
    private const string WorkerUser = "worker";
    private const string WorkerPassword = "worker123";

    private void SeedWorkerWithJsonRoles()
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var salt = "b6-worker-salt-1234567890";
        var hash = EngineeringManager.Api.Common.HashPassword(WorkerPassword, salt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES ('2', @U, @P, @H, @S, 2, '工人', 'worker', 'active', @Now)",
            new { U = WorkerUser, P = WorkerPassword, H = hash, S = salt, Now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") });
        // worker 只读（无 partners 写码）
        conn.Execute("UPDATE roles SET permissions=@P WHERE id='worker'",
            new { P = "[\"dashboard:read\",\"projects:read\",\"wages:read\",\"members:read\",\"partners:read\",\"projects:export\",\"contracts:export\"]" });
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

    private static object PartnerBody() => new { name = "越权单位", category = "supplier", contact = "张三" };
    private static object SupervisorBody() => new { name = "越权监管单位", category = "government", contact = "李四" };

    [Fact]
    public async Task Worker_PartnerCreate_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/partners", PartnerBody());

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Worker_PartnerUpdate_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Put, "/api/partners", new { id = 1, name = "越权改" });

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Worker_PartnerDelete_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Delete, "/api/partners/1");

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Worker_SupervisorCreate_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/supervisors", SupervisorBody());

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Worker_SupervisorDelete_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Delete, "/api/supervisors/1");

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Admin_PartnerAndSupervisorCreate_Returns200()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(AdminUser, AdminPassword);

        var partner = await AuthedAsync(token, HttpMethod.Post, "/api/partners", PartnerBody());
        Assert.Equal(HttpStatusCode.OK, partner.StatusCode);

        var sup = await AuthedAsync(token, HttpMethod.Post, "/api/supervisors", SupervisorBody());
        Assert.Equal(HttpStatusCode.OK, sup.StatusCode);
    }

    [Fact]
    public async Task Admin_PartnerUpdate_Returns200()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(AdminUser, AdminPassword);
        var create = await AuthedAsync(token, HttpMethod.Post, "/api/partners", PartnerBody());
        var id = (await create.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetInt64();

        var resp = await AuthedAsync(token, HttpMethod.Put, "/api/partners", new { id, name = "改名单位" });

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }
}
