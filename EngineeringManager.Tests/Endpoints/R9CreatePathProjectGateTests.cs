using Dapper;
using EngineeringManager.Tests.Common;
using Microsoft.Data.Sqlite;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// R9-3 Z3：创建路径项目级写入门坎（G75 修复）——5 个创建端点测试。
///
/// 背景：G75 登记「创建路径无项目归属校验」。修复形态 = CurrentUser.CanWriteProject
/// （方案丙创建侧门坎）：admin → true；projects.created_by==uid → true；
/// project_authorizations 含 (project, uid) → true；否则 false。
/// 五端点：POST /api/attendances（单条）、batch-create、generate、generate-v2、
/// batch-import（INSERT 分支项目级门）。
///
/// 用户：A = admin（项目创建者）；B = accountant（非 admin，默认权限集含 wages:create，
/// 不手动 UPDATE roles）。项目由 A 创建，B 无授权。
///
/// 12 条：反向×5（B 无授权 → 403 且行数不变）+ 正向×5（admin → 200 且行建成）
/// + 授权正向×2（B 有 project_authorizations → 200 且行建成，钉住方案丙第三分支）。
/// 修复前：5 条反向必须全红（实际 200 + 行已建）。
/// </summary>
public class R9CreatePathProjectGateTests : ApiTestBase
{
    private const string AdminUid = "1";             // 基座种子 admin（username=admin）
    private const string OtherUid = "r9-3-acc";      // accountant，非 admin
    private const string OtherUsername = "r9-3-acc";
    private const string Password = "admin123";
    private const long TestProjectId = 9103;         // A 创建的项目，B 无授权
    private const string TestYearMonth = "2026-08";  // 31 天
    private const string Now = "2026-08-01 00:00:00";

    private async Task<string> LoginAsync(string username)
    {
        var resp = await Client.PostAsJsonAsync("/api/auth/login", new { username, password = Password });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("data").GetProperty("token").GetString()!;
    }

    private void SetAuth(string token) =>
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    /// <summary>seed A 创建的项目（B 无授权）+ 一个项目工人，返回 project_workers.id</summary>
    private long SeedProjectAndWorker(string workerName = "门坎工人")
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        conn.Execute("INSERT OR IGNORE INTO projects (id, name, created_by, created_at) VALUES (@P, @N, @By, @Now)",
            new { P = TestProjectId, N = "R9-3项目", By = AdminUid, Now });
        var workerId = conn.ExecuteScalar<long>(
            "INSERT INTO workers (name, created_at) VALUES (@N, @Now); SELECT last_insert_rowid();",
            new { N = workerName, Now });
        conn.Execute(@"INSERT INTO project_workers (worker_id,project_id,team_id,daily_wage,worker_type,entry_date,status,created_by,created_at,last_modified_at)
            VALUES (@W,@P,NULL,300,'瓦工','2026-01-01','active',@By,@Now,@Now)",
            new { W = workerId, P = TestProjectId, By = AdminUid, Now });
        return conn.ExecuteScalar<long>("SELECT last_insert_rowid();");
    }

    private long CountAttendanceRows()
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.ExecuteScalar<long>(
            "SELECT COUNT(*) FROM attendances WHERE project_id=@P", new { P = TestProjectId });
    }

    private void SeedAccountantB()
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var salt = "r9-3-acc-salt-123456";
        var hash = EngineeringManager.Api.Common.HashPassword(Password, salt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
            new
            {
                Id = OtherUid, Username = OtherUsername, Password, Hash = hash, Salt = salt,
                Version = 2, DisplayName = "财务", RoleId = "accountant", Status = "active", Now
            });
    }

    // ══════════ 反向 ×5：B 无授权 → 403 且行数不变 ══════════

    [Fact]
    public async Task Reverse1_SingleCreate_OtherUserUnauthorized_Returns403()
    {
        SeedAccountantB();
        var pw = SeedProjectAndWorker("反向1工人");
        SetAuth(await LoginAsync(OtherUsername));
        var before = CountAttendanceRows();

        var resp = await Client.PostAsJsonAsync("/api/attendances", new
        {
            projectId = TestProjectId, projectWorkerId = pw, yearMonth = TestYearMonth, workDays = 20.0,
        });
        // 目标态：B 无授权 → 403 且行数不变
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        Assert.Equal(before, CountAttendanceRows());
    }

    [Fact]
    public async Task Reverse2_BatchCreate_OtherUserUnauthorized_Returns403()
    {
        SeedAccountantB();
        var pw = SeedProjectAndWorker("反向2工人");
        SetAuth(await LoginAsync(OtherUsername));
        var before = CountAttendanceRows();

        var resp = await Client.PostAsJsonAsync("/api/attendances/batch-create",
            new[] { new { memberId = (long?)null, projectId = (long?)TestProjectId, projectWorkerId = (long?)pw, yearMonth = TestYearMonth, workDays = 20.0, daysOff = (long?)0, isFullAttendance = 1L, dailyStatus = (string?)null } });
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        Assert.Equal(before, CountAttendanceRows());
    }

    [Fact]
    public async Task Reverse3_Generate_OtherUserUnauthorized_Returns403()
    {
        SeedAccountantB();
        var pw = SeedProjectAndWorker("反向3工人");
        SetAuth(await LoginAsync(OtherUsername));
        var before = CountAttendanceRows();

        var resp = await Client.PostAsJsonAsync("/api/attendances/generate",
            new { projectId = TestProjectId, yearMonth = TestYearMonth, memberIds = new long[] { } });
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        Assert.Equal(before, CountAttendanceRows());
    }

    [Fact]
    public async Task Reverse4_GenerateV2_OtherUserUnauthorized_Returns403()
    {
        SeedAccountantB();
        var pw = SeedProjectAndWorker("反向4工人");
        SetAuth(await LoginAsync(OtherUsername));
        var before = CountAttendanceRows();

        var resp = await Client.PostAsJsonAsync("/api/attendances/generate-v2",
            new { projectId = TestProjectId, yearMonth = TestYearMonth, projectWorkerIds = new[] { pw } });
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        Assert.Equal(before, CountAttendanceRows());
    }

    [Fact]
    public async Task Reverse5_BatchImport_OtherUserUnauthorized_Returns403()
    {
        SeedAccountantB();
        var pw = SeedProjectAndWorker("反向5工人");
        SetAuth(await LoginAsync(OtherUsername));
        var before = CountAttendanceRows();

        var resp = await Client.PostAsJsonAsync("/api/attendances/batch-import",
            new { projectId = TestProjectId, yearMonth = TestYearMonth, records = new[] { new { projectWorkerId = pw, workDays = 20.0 } } });
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        Assert.Equal(before, CountAttendanceRows());
    }

    // ══════════ 正向 ×5：admin → 200 且行建成 ══════════

    [Fact]
    public async Task Forward1_SingleCreate_Admin_Returns200()
    {
        var pw = SeedProjectAndWorker("正向1工人");
        SetAuth(await LoginAsync("admin"));
        var before = CountAttendanceRows();

        var resp = await Client.PostAsJsonAsync("/api/attendances", new
        {
            projectId = TestProjectId, projectWorkerId = pw, yearMonth = TestYearMonth, workDays = 20.0,
        });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal(before + 1, CountAttendanceRows());
    }

    [Fact]
    public async Task Forward2_BatchCreate_Admin_Returns200()
    {
        var pw = SeedProjectAndWorker("正向2工人");
        SetAuth(await LoginAsync("admin"));
        var before = CountAttendanceRows();

        var resp = await Client.PostAsJsonAsync("/api/attendances/batch-create",
            new[] { new { memberId = (long?)null, projectId = (long?)TestProjectId, projectWorkerId = (long?)pw, yearMonth = TestYearMonth, workDays = 20.0, daysOff = (long?)0, isFullAttendance = 1L, dailyStatus = (string?)null } });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal(before + 1, CountAttendanceRows());
    }

    [Fact]
    public async Task Forward3_Generate_Admin_Returns200()
    {
        var pw = SeedProjectAndWorker("正向3工人");
        SetAuth(await LoginAsync("admin"));
        var before = CountAttendanceRows();

        var resp = await Client.PostAsJsonAsync("/api/attendances/generate",
            new { projectId = TestProjectId, yearMonth = TestYearMonth, memberIds = new long[] { } });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal(before, CountAttendanceRows()); // memberIds 空 → 不建行，但门放行
    }

    [Fact]
    public async Task Forward4_GenerateV2_Admin_Returns200()
    {
        var pw = SeedProjectAndWorker("正向4工人");
        SetAuth(await LoginAsync("admin"));
        var before = CountAttendanceRows();

        var resp = await Client.PostAsJsonAsync("/api/attendances/generate-v2",
            new { projectId = TestProjectId, yearMonth = TestYearMonth, projectWorkerIds = new[] { pw } });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal(before + 1, CountAttendanceRows()); // 生成默认全勤行
    }

    [Fact]
    public async Task Forward5_BatchImport_Admin_Returns200()
    {
        var pw = SeedProjectAndWorker("正向5工人");
        SetAuth(await LoginAsync("admin"));
        var before = CountAttendanceRows();

        var resp = await Client.PostAsJsonAsync("/api/attendances/batch-import",
            new { projectId = TestProjectId, yearMonth = TestYearMonth, records = new[] { new { projectWorkerId = pw, workDays = 20.0 } } });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal(before + 1, CountAttendanceRows()); // 新建行
    }

    // ══════════ 授权正向 ×2：B 有 project_authorizations → 200 且行建成 ══════════

    [Fact]
    public async Task Authorized1_BatchImport_AuthorizedUser_Returns200()
    {
        SeedAccountantB();
        var pw = SeedProjectAndWorker("授权1工人");
        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Open();
            conn.Execute("INSERT OR IGNORE INTO project_authorizations (project_id, user_id, granted_by, granted_at) VALUES (@P, @U, '1', @Now)",
                new { P = TestProjectId, U = OtherUid, Now });
        }
        SetAuth(await LoginAsync(OtherUsername));
        var before = CountAttendanceRows();

        var resp = await Client.PostAsJsonAsync("/api/attendances/batch-import",
            new { projectId = TestProjectId, yearMonth = TestYearMonth, records = new[] { new { projectWorkerId = pw, workDays = 20.0 } } });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal(before + 1, CountAttendanceRows()); // 授权项目可创建
    }

    [Fact]
    public async Task Authorized2_Generate_AuthorizedUser_Returns200()
    {
        SeedAccountantB();
        var pw = SeedProjectAndWorker("授权2工人");
        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Open();
            conn.Execute("INSERT OR IGNORE INTO project_authorizations (project_id, user_id, granted_by, granted_at) VALUES (@P, @U, '1', @Now)",
                new { P = TestProjectId, U = OtherUid, Now });
        }
        SetAuth(await LoginAsync(OtherUsername));
        var before = CountAttendanceRows();

        var resp = await Client.PostAsJsonAsync("/api/attendances/generate",
            new { projectId = TestProjectId, yearMonth = TestYearMonth, memberIds = new long[] { } });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal(before, CountAttendanceRows()); // 门放行（memberIds 空）
    }
}
