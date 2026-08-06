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
/// 窗口 G2 B3：contracts/settlements/contract-templates 系写端点权限测试
/// 覆盖：合同三类型创建、合同模板 CRUD、结算单创建/更新/取消归档、合同附件上传
/// （目标码 contracts:create / contracts:update / settlement:create / settlement:update）
/// —— worker（无写码）→ 403；admin → 200。
/// save-file 写 ResolveDataPath/uploads → 数据路径隔离到临时目录（同 B1 模式）。
/// </summary>
[Collection("G2 Env-Isolated WritePermission Tests")]
public class WritePermissionB3Tests : ApiTestBase, IDisposable
{
    private const string AdminUser = "admin";
    private const string AdminPassword = "admin123";
    private const string WorkerUser = "worker";
    private const string WorkerPassword = "worker123";

    private readonly string _isolatedDataPath;
    private readonly string? _oldDataPath;

    public WritePermissionB3Tests()
    {
        _isolatedDataPath = Path.Combine(Path.GetTempPath(), $"g2-b3-data-{Guid.NewGuid():N}");
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
        var salt = "b3-worker-salt-1234567890";
        var hash = EngineeringManager.Api.Common.HashPassword(WorkerPassword, salt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES ('2', @U, @P, @H, @S, 2, '工人', 'worker', 'active', @Now)",
            new { U = WorkerUser, P = WorkerPassword, H = hash, S = salt, Now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") });
        // worker 只读（无 contracts/settlement 写码）
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

    // ── 合同创建 → contracts:create ──

    [Theory]
    [InlineData("/api/contracts/income")]
    [InlineData("/api/contracts/expense")]
    [InlineData("/api/contracts/agreement")]
    public async Task Worker_ContractCreate_Returns403(string path)
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Post, path,
            new { projectId = 1, name = "越权合同", amount = 1000 });

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Admin_ContractIncomeCreate_Returns200()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(AdminUser, AdminPassword);

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/contracts/income",
            new { projectId = 1, name = "收入合同", amount = 1000 });

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    // ── 合同模板 CRUD → contracts:update ──

    private static object TemplateBody(string name) => new { name, type = "income", content = "模板内容", variables = "[]" };

    [Fact]
    public async Task Worker_ContractTemplateCreate_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/contract-templates", TemplateBody("w-tpl"));

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Worker_ContractTemplateUpdate_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Put, "/api/contract-templates",
            new { id = 1, name = "w-update", type = "income", content = "", variables = "[]" });

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Worker_ContractTemplateDelete_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Delete, "/api/contract-templates/1");

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Admin_ContractTemplateCrud_Returns200()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(AdminUser, AdminPassword);

        var create = await AuthedAsync(token, HttpMethod.Post, "/api/contract-templates", TemplateBody("a-tpl"));
        Assert.Equal(HttpStatusCode.OK, create.StatusCode);
        var id = (await create.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetInt64();

        var update = await AuthedAsync(token, HttpMethod.Put, "/api/contract-templates",
            new { id, name = "a-tpl-v2", type = "income", content = "改", variables = "[]" });
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);

        var del = await AuthedAsync(token, HttpMethod.Delete, $"/api/contract-templates/{id}");
        Assert.Equal(HttpStatusCode.OK, del.StatusCode);
    }

    // ── 结算单：create / update / unarchive → settlement:create/update ──

    private static object SettlementBody(string no) => new
    {
        projectId = 1, name = "进度款结算", amount = 5000, settlementNo = no,
        type = "progress", subType = "monthly", settlementDate = "2026-08-01",
    };

    [Fact]
    public async Task Worker_SettlementsCreate_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/settlements", SettlementBody("S-W-1"));

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Admin_SettlementsCreate_Returns200()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(AdminUser, AdminPassword);

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/settlements", SettlementBody("S-A-1"));

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task Worker_SettlementsUpdate_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Put, "/api/settlements",
            new { id = 1, name = "越权修改", amount = 1 });

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Worker_SettlementsUnarchive_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Put, "/api/settlements/1/unarchive");

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Admin_SettlementsUnarchive_Returns200()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(AdminUser, AdminPassword);
        // 先建结算单拿 id，再取消归档
        var create = await AuthedAsync(token, HttpMethod.Post, "/api/settlements", SettlementBody("S-A-2"));
        var id = (await create.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetInt64();

        var resp = await AuthedAsync(token, HttpMethod.Put, $"/api/settlements/{id}/unarchive");

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    // ── 合同附件上传 → contracts:update（写隔离数据路径）──

    [Fact]
    public async Task Worker_ContractSaveFile_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/contracts/save-file",
            new { fileName = "x.pdf", subCategory = "income", projectName = "测试项目", fileData = "" });

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        Assert.False(Directory.Exists(Path.Combine(_isolatedDataPath, "uploads")), "worker 403 后不应产生 uploads 目录");
    }

    [Fact]
    public async Task Admin_ContractSaveFile_Returns200()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(AdminUser, AdminPassword);

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/contracts/save-file",
            new { fileName = "a.pdf", subCategory = "income", projectName = "测试项目", fileData = "data:application/pdf;base64,QUFBQQ==" });

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.True(File.Exists(Path.Combine(_isolatedDataPath, "uploads", "测试项目", "合同", "收入", "a.pdf")), "admin 应写入合同附件");
    }
}
