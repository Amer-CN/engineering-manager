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
/// 窗口 G2 B9：cost-ledger 全家写端点权限测试
/// 覆盖：台账 CRUD/批量导入/分类/批次（含复制）/匹配规则/电子表格保存
/// （目标码 costLedger:create/update/delete；categories/reset 已在 C-4 T1 覆盖）
/// —— worker（无 costLedger 码）→ 403；admin → 200。
/// </summary>
public class WritePermissionB9Tests : ApiTestBase
{
    private const string AdminUser = "admin";
    private const string AdminPassword = "admin123";
    private const string WorkerUser = "worker";
    private const string WorkerPassword = "worker123";

    private void SeedWorkerWithJsonRoles()
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var salt = "b9-worker-salt-1234567890";
        var hash = EngineeringManager.Api.Common.HashPassword(WorkerPassword, salt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES ('2', @U, @P, @H, @S, 2, '工人', 'worker', 'active', @Now)",
            new { U = WorkerUser, P = WorkerPassword, H = hash, S = salt, Now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") });
        // worker 无 costLedger 写码
        conn.Execute("UPDATE roles SET permissions=@P WHERE id='worker'",
            new { P = "[\"dashboard:read\",\"projects:read\",\"wages:read\",\"projects:export\",\"contracts:export\"]" });
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

    private static object EntryBody() => new
    {
        projectId = 1, date = "2026-08-01", direction = "expense",
        category = "material", amount = 1000, summary = "测试条目",
    };

    private static object BatchBody() => new { projectId = 1, name = "测试批次" };
    private static object CategoryBody() => new { name = "测试分类", direction = "expense", level1 = "材料", color = "#ff0000" };

    [Fact]
    public async Task Worker_CostLedgerCreate_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/cost-ledger", EntryBody());

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Worker_CostLedgerUpdate_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Put, "/api/cost-ledger",
            new { id = 1, date = "2026-08-01", direction = "expense", amount = 1 });

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Worker_CostLedgerDelete_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Delete, "/api/cost-ledger/1");

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Worker_CostLedgerBatchImport_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/cost-ledger/batch", new object[] { EntryBody() });

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Worker_CostLedgerCategories_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        foreach (var (method, path, body) in new[]
        {
            (HttpMethod.Post, "/api/cost-ledger/categories", (object?)CategoryBody()),
            (HttpMethod.Put, "/api/cost-ledger/categories", (object?)new { id = 1, name = "改", direction = "expense" }),
            (HttpMethod.Delete, "/api/cost-ledger/categories/1", (object?)null),
        })
        {
            var resp = await AuthedAsync(token, method, path, body);
            Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        }
    }

    [Fact]
    public async Task Worker_CostLedgerBatches_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var create = await AuthedAsync(token, HttpMethod.Post, "/api/cost-ledger/batches", BatchBody());
        Assert.Equal(HttpStatusCode.Forbidden, create.StatusCode);

        var copy = await AuthedAsync(token, HttpMethod.Post, "/api/cost-ledger/batches/1/copy", new { newName = "副本" });
        Assert.Equal(HttpStatusCode.Forbidden, copy.StatusCode);

        var rename = await AuthedAsync(token, HttpMethod.Put, "/api/cost-ledger/batches/1", new { newName = "改名" });
        Assert.Equal(HttpStatusCode.Forbidden, rename.StatusCode);

        var del = await AuthedAsync(token, HttpMethod.Delete, "/api/cost-ledger/batches/1");
        Assert.Equal(HttpStatusCode.Forbidden, del.StatusCode);
    }

    [Fact]
    public async Task Worker_CostLedgerMatchRules_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/cost-ledger/match-rules",
            new { pattern = "材料费", category = "material", direction = "expense", priority = 1 });

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Worker_CostLedgerSheet_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/cost-ledger/1/sheet", new { entries = new object[0] });

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Admin_CostLedgerCrud_Returns200()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(AdminUser, AdminPassword);

        var create = await AuthedAsync(token, HttpMethod.Post, "/api/cost-ledger", EntryBody());
        Assert.Equal(HttpStatusCode.OK, create.StatusCode);
        var id = (await create.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetInt64();

        var del = await AuthedAsync(token, HttpMethod.Delete, $"/api/cost-ledger/{id}");
        Assert.Equal(HttpStatusCode.OK, del.StatusCode);
    }

    [Fact]
    public async Task Admin_CostLedgerBatchesAndCategories_Returns200()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(AdminUser, AdminPassword);

        var batch = await AuthedAsync(token, HttpMethod.Post, "/api/cost-ledger/batches", BatchBody());
        Assert.Equal(HttpStatusCode.OK, batch.StatusCode);
        var batchId = (await batch.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetInt64();

        var cat = await AuthedAsync(token, HttpMethod.Post, "/api/cost-ledger/categories", CategoryBody());
        Assert.Equal(HttpStatusCode.OK, cat.StatusCode);

        var sheet = await AuthedAsync(token, HttpMethod.Post, $"/api/cost-ledger/{batchId}/sheet",
            new { entries = new object[] { new { projectId = 1, batchId, date = "2026-08-01", direction = "expense", category = "material", amount = 1000, summary = "表格条目" } } });
        Assert.Equal(HttpStatusCode.OK, sheet.StatusCode);
    }
}
