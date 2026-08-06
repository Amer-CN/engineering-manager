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
/// 窗口 G2 B8：inventory/materials/transactions/drawings 系写端点权限测试
/// 覆盖：物料项/材料/出入库/图纸 CRUD（目标码 inventory:create/update、drawings:create/update/delete）
/// —— worker（仅只读码）→ 403；admin → 200。
/// drawings 写 ResolveDataPath/uploads → 数据路径隔离（G2 集合串行）。
/// </summary>
[Collection("G2 Env-Isolated WritePermission Tests")]
public class WritePermissionB8Tests : ApiTestBase, IDisposable
{
    private const string AdminUser = "admin";
    private const string AdminPassword = "admin123";
    private const string WorkerUser = "worker";
    private const string WorkerPassword = "worker123";

    private readonly string _isolatedDataPath;
    private readonly string? _oldDataPath;

    public WritePermissionB8Tests()
    {
        _isolatedDataPath = Path.Combine(Path.GetTempPath(), $"g2-b8-data-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_isolatedDataPath);
        _oldDataPath = Environment.GetEnvironmentVariable("ENGINEERING_MANAGER_DATA_PATH");
        Environment.SetEnvironmentVariable("ENGINEERING_MANAGER_DATA_PATH", _isolatedDataPath);
    }

    void IDisposable.Dispose()
    {
        Environment.SetEnvironmentVariable("ENGINEERING_MANAGER_DATA_PATH", _oldDataPath);
        try { if (Directory.Exists(_isolatedDataPath)) Directory.Delete(_isolatedDataPath, true); } catch { }
        base.Dispose();
    }

    private void SeedWorkerWithJsonRoles()
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var salt = "b8-worker-salt-1234567890";
        var hash = EngineeringManager.Api.Common.HashPassword(WorkerPassword, salt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES ('2', @U, @P, @H, @S, 2, '工人', 'worker', 'active', @Now)",
            new { U = WorkerUser, P = WorkerPassword, H = hash, S = salt, Now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") });
        // worker 有 inventory:read/drawings:read，无写码
        conn.Execute("UPDATE roles SET permissions=@P WHERE id='worker'",
            new { P = "[\"dashboard:read\",\"projects:read\",\"wages:read\",\"inventory:read\",\"drawings:read\",\"projects:export\",\"contracts:export\"]" });
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

    private static object ItemBody() => new { name = "越权物料", category = "五金", unit = "个", currentStock = 10 };
    private static object MaterialBody() => new { name = "越权材料", projectId = 1, quantity = 5, price = 100 };
    private static object DrawingBody() => new { name = "越权图纸", projectId = 1, category = "施工图", fileName = "w.pdf", fileData = "" };

    [Fact]
    public async Task Worker_InventoryCreate_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/inventory", ItemBody());

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Worker_InventoryUpdate_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Put, "/api/inventory", new { id = 1, name = "越权改" });

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Worker_MaterialCreate_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/materials", MaterialBody());

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Worker_InventoryTransactionCreate_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/inventory/transactions",
            new { itemId = 1, type = "purchase", quantity = 5, transactionDate = "2026-08-01" });

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Worker_DrawingsCreate_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/drawings", DrawingBody());

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Worker_DrawingsUpdate_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Put, "/api/drawings", new { id = 1, name = "越权改" });

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Worker_DrawingsDelete_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Delete, "/api/drawings/1");

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Admin_InventoryAndMaterials_Returns200()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(AdminUser, AdminPassword);

        var item = await AuthedAsync(token, HttpMethod.Post, "/api/inventory", ItemBody());
        Assert.Equal(HttpStatusCode.OK, item.StatusCode);

        var mat = await AuthedAsync(token, HttpMethod.Post, "/api/materials", MaterialBody());
        Assert.Equal(HttpStatusCode.OK, mat.StatusCode);
    }

    [Fact]
    public async Task Admin_DrawingsCreate_Returns200()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(AdminUser, AdminPassword);

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/drawings",
            new { name = "admin图纸", projectId = 1, category = "施工图", fileName = "a.pdf", fileData = "data:application/pdf;base64,QUFBQQ==" });

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.True(Directory.Exists(Path.Combine(_isolatedDataPath, "uploads", "图纸")), "admin 上传图纸应建目录");
    }
}
