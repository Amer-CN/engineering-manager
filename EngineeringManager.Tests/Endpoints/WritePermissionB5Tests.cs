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
/// 窗口 G2 B5：members/workers/project-workers/departments/worker-teams 系写端点权限测试
/// 覆盖：人员/工人/项目工人（含批量）/部门/班组 CRUD
/// （目标码 members:create/update/delete，矩阵 O4 观察项：member 写端点无前端码，本轮补齐）
/// —— worker（仅只读码）→ 403；admin → 200。
/// </summary>
public class WritePermissionB5Tests : ApiTestBase
{
    private const string AdminUser = "admin";
    private const string AdminPassword = "admin123";
    private const string WorkerUser = "worker";
    private const string WorkerPassword = "worker123";

    private void SeedWorkerWithJsonRoles()
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var salt = "b5-worker-salt-1234567890";
        var hash = EngineeringManager.Api.Common.HashPassword(WorkerPassword, salt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES ('2', @U, @P, @H, @S, 2, '工人', 'worker', 'active', @Now)",
            new { U = WorkerUser, P = WorkerPassword, H = hash, S = salt, Now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") });
        // worker 只读（无 members 写码）
        conn.Execute("UPDATE roles SET permissions=@P WHERE id='worker'",
            new { P = "[\"dashboard:read\",\"projects:read\",\"wages:read\",\"members:read\",\"projects:export\",\"contracts:export\"]" });
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

    private static object MemberBody(string name) => new { name, phone = "[已脱敏]", memberType = "staff", status = "active" };
    private static object WorkerBody(string name) => new { name, idCard = "510000199001010000", gender = "男", workerType = "other", dailyWage = 200 };
    private static object ProjectWorkerBody() => new { workerId = 1, projectId = 1, dailyWage = 200, workerType = "other", status = "active" };
    private static object DepartmentBody() => new { name = "工程部", positions = new string[] { "经理" } };
    private static object TeamBody() => new { name = "钢筋一班", projectId = 1 };

    [Theory]
    [InlineData("/api/members", "members")]
    [InlineData("/api/workers", "workers")]
    [InlineData("/api/project-workers", "project-workers")]
    [InlineData("/api/departments", "departments")]
    [InlineData("/api/worker-teams", "worker-teams")]
    public async Task Worker_Create_Returns403(string path, string kind)
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);
        var body = kind switch
        {
            "members" => MemberBody("越权成员"),
            "workers" => WorkerBody("越权工人"),
            "project-workers" => ProjectWorkerBody(),
            "departments" => DepartmentBody(),
            _ => TeamBody(),
        };

        var resp = await AuthedAsync(token, HttpMethod.Post, path, body);

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Worker_Update_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        foreach (var (path, body) in new[]
        {
            ("/api/members", (object)new { id = 1, name = "越权改" }),
            ("/api/workers", (object)new { id = 1, name = "越权改" }),
            ("/api/project-workers", (object)new { id = 1, teamId = 2 }),
            ("/api/departments", (object)new { id = 1, name = "越权改" }),
            ("/api/worker-teams", (object)new { id = 1, name = "越权改" }),
        })
        {
            var resp = await AuthedAsync(token, HttpMethod.Put, path, body);
            Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        }
    }

    [Fact]
    public async Task Worker_Delete_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        foreach (var path in new[]
        {
            "/api/members/1", "/api/workers/1", "/api/project-workers/1",
            "/api/departments/1", "/api/worker-teams/1",
        })
        {
            var resp = await AuthedAsync(token, HttpMethod.Delete, path);
            Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        }
    }

    [Fact]
    public async Task Worker_ProjectWorkersBatch_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/project-workers/batch",
            new object[] { ProjectWorkerBody() });

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Admin_MembersCrud_Returns200()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(AdminUser, AdminPassword);

        var create = await AuthedAsync(token, HttpMethod.Post, "/api/members", MemberBody("管理员员工"));
        Assert.Equal(HttpStatusCode.OK, create.StatusCode);
        var id = (await create.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetInt64();

        var update = await AuthedAsync(token, HttpMethod.Put, "/api/members", new { id, name = "改名", status = "active" });
        if (update.StatusCode != HttpStatusCode.OK)
        {
            var body = await update.Content.ReadAsStringAsync();
            throw new Xunit.Sdk.XunitException($"PUT /api/members 返回 {update.StatusCode}: {body}");
        }
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);

        var del = await AuthedAsync(token, HttpMethod.Delete, $"/api/members/{id}");
        if (del.StatusCode != HttpStatusCode.OK)
        {
            var body = await del.Content.ReadAsStringAsync();
            throw new Xunit.Sdk.XunitException($"DELETE /api/members/{id} 返回 {del.StatusCode}: {body}");
        }
        Assert.Equal(HttpStatusCode.OK, del.StatusCode);
    }

    [Fact]
    public async Task Admin_WorkersAndTeams_Returns200()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(AdminUser, AdminPassword);

        var worker = await AuthedAsync(token, HttpMethod.Post, "/api/workers", WorkerBody("管理员工人"));
        Assert.Equal(HttpStatusCode.OK, worker.StatusCode);

        var dept = await AuthedAsync(token, HttpMethod.Post, "/api/departments", DepartmentBody());
        Assert.Equal(HttpStatusCode.OK, dept.StatusCode);

        var team = await AuthedAsync(token, HttpMethod.Post, "/api/worker-teams", TeamBody());
        Assert.Equal(HttpStatusCode.OK, team.StatusCode);
    }
}
