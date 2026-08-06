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
/// 窗口 G2 B1：settings 系写端点权限测试
/// 覆盖：快照创建/删除、备份（worker 403 断言在写文件前）、GPU 开关、读取模式、
///       模板 CRUD（目标码全部 settings:update）—— worker（无写码）→ 403；admin → 200。
/// 特任务 O1：POST /api/audit/logs 的 user_id/user_name 必须来自 JWT——DTO 伪造不落库。
/// 数据隔离：构造函数设置 ENGINEERING_MANAGER_DATA_PATH=临时目录（handler 运行时读取），
/// 避免快照/config.json 写入真实 AppData；backup 写桌面，仅测 worker 403（写前拦截）。
/// </summary>
public class WritePermissionB1Tests : ApiTestBase, IDisposable
{
    private const string AdminUser = "admin";
    private const string AdminPassword = "admin123";
    private const string WorkerUser = "worker";
    private const string WorkerPassword = "worker123";

    private readonly string _isolatedDataPath;
    private readonly string? _oldDataPath;

    public WritePermissionB1Tests()
    {
        _isolatedDataPath = Path.Combine(Path.GetTempPath(), $"g2-b1-data-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_isolatedDataPath);
        _oldDataPath = Environment.GetEnvironmentVariable("ENGINEERING_MANAGER_DATA_PATH");
        Environment.SetEnvironmentVariable("ENGINEERING_MANAGER_DATA_PATH", _isolatedDataPath);
        // 快照/备份 handler 复制 dataPath/engineering.db —— 测试库需要出现在隔离数据路径下
        File.Copy(DbPath, Path.Combine(_isolatedDataPath, "engineering.db"));
    }

    void IDisposable.Dispose()
    {
        Environment.SetEnvironmentVariable("ENGINEERING_MANAGER_DATA_PATH", _oldDataPath);
        try { if (Directory.Exists(_isolatedDataPath)) Directory.Delete(_isolatedDataPath, true); } catch { }
        base.Dispose();
    }

    /// <summary>建 worker 用户 + worker/admin 角色权限为 JSON 数组形态（037 后库形态）。worker 无 settings:update。</summary>
    private void SeedWorkerWithJsonRoles()
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var salt = "b1-worker-salt-1234567890";
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

    // ── 快照：创建 / 删除 → settings:update ──

    [Fact]
    public async Task Worker_SnapshotsCreate_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/snapshots");

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        // 403 在写文件前：快照目录不得产生新文件
        var snapDir = Path.Combine(_isolatedDataPath, "db-snapshots");
        Assert.False(Directory.Exists(snapDir), "worker 403 后不应产生快照目录");
    }

    [Fact]
    public async Task Admin_SnapshotsCreate_Returns200()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(AdminUser, AdminPassword);

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/snapshots");

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var snapDir = Path.Combine(_isolatedDataPath, "db-snapshots");
        Assert.True(Directory.Exists(snapDir) && Directory.GetFiles(snapDir, "*.db").Length > 0, "admin 创建快照后应产生 .db 快照文件");
    }

    [Fact]
    public async Task Worker_SnapshotsDelete_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Delete, "/api/snapshots/whatever");

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Admin_SnapshotsDelete_Returns200()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(AdminUser, AdminPassword);

        // 先建快照拿 id，再删——200 断言需要真实文件存在
        var create = await AuthedAsync(token, HttpMethod.Post, "/api/snapshots");
        Assert.Equal(HttpStatusCode.OK, create.StatusCode);
        var snapId = (await create.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetProperty("id").GetString();

        var resp = await AuthedAsync(token, HttpMethod.Delete, $"/api/snapshots/{snapId}");

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    // ── 备份 → settings:update（worker 403 在写桌面文件前；admin 200 会真实写桌面，不测）──

    [Fact]
    public async Task Worker_Backup_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/backup");

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    // ── GPU 开关 / 读取模式 → settings:update ──

    [Fact]
    public async Task Worker_GpuAcceleration_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Put, "/api/config/gpu-acceleration",
            new { enabled = false });

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        Assert.False(File.Exists(Path.Combine(_isolatedDataPath, "config.json")), "worker 403 后不应写 config.json");
    }

    [Fact]
    public async Task Admin_GpuAcceleration_Returns200()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(AdminUser, AdminPassword);

        var resp = await AuthedAsync(token, HttpMethod.Put, "/api/config/gpu-acceleration",
            new { enabled = true });

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.True(File.Exists(Path.Combine(_isolatedDataPath, "config.json")), "admin 应写 config.json");
    }

    [Fact]
    public async Task Worker_ReadMode_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Put, "/api/sqlite/read-mode",
            new { mode = "dual" });

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Admin_ReadMode_Returns200()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(AdminUser, AdminPassword);

        var resp = await AuthedAsync(token, HttpMethod.Put, "/api/sqlite/read-mode",
            new { mode = "dual" });

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    // ── 模板 CRUD → settings:update ──

    private static object TemplateBody(string name) => new
    {
        name,
        category = "contract",
        description = "B1 测试模板",
        fileName = "t.docx",
        storedFileName = "t.docx",
        fileType = "docx",
        variables = "[]",
    };

    [Fact]
    public async Task Worker_TemplatesCreate_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/templates", TemplateBody("w-create"));

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Admin_TemplatesCreate_Returns200()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(AdminUser, AdminPassword);

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/templates", TemplateBody("a-create"));

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task Worker_TemplatesUpdate_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Put, "/api/templates",
            new { id = 1, name = "w-update", category = "contract", description = "", variables = "[]" });

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Admin_TemplatesUpdate_Returns200()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(AdminUser, AdminPassword);
        var create = await AuthedAsync(token, HttpMethod.Post, "/api/templates", TemplateBody("a-update"));
        var id = (await create.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetInt64();

        var resp = await AuthedAsync(token, HttpMethod.Put, "/api/templates",
            new { id, name = "a-update-v2", category = "contract", description = "改", variables = "[]" });

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task Worker_TemplatesDelete_Returns403()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Delete, "/api/templates/1");

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Admin_TemplatesDelete_Returns200()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(AdminUser, AdminPassword);
        var create = await AuthedAsync(token, HttpMethod.Post, "/api/templates", TemplateBody("a-delete"));
        var id = (await create.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetInt64();

        var resp = await AuthedAsync(token, HttpMethod.Delete, $"/api/templates/{id}");

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    // ── O1：audit/logs 身份必须来自 JWT，DTO 伪造 user_id 不落库 ──

    [Fact]
    public async Task AuditLog_ForgedUserId_NotPersisted()
    {
        SeedWorkerWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        // DTO 伪造 userId=999 / userName=黑客 —— 落库身份必须以 JWT 为准（worker uid=2, user_name=worker）
        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/audit/logs",
            new { action = "test", level = "info", userId = "999", userName = "黑客", resource = "b1-test", resourceId = "1" });
        if (resp.StatusCode != HttpStatusCode.OK)
        {
            var body = await resp.Content.ReadAsStringAsync();
            throw new Xunit.Sdk.XunitException($"POST /api/audit/logs 返回 {resp.StatusCode}: {body}");
        }
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var row = conn.QueryFirst("SELECT user_id, user_name FROM audit_logs ORDER BY id DESC LIMIT 1");
        Assert.Equal("2", (string)row.user_id);
        Assert.Equal("worker", (string)row.user_name);
        Assert.NotEqual("999", (string)row.user_id);
    }
}
