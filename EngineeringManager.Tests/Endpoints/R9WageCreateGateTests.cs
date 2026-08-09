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
/// R9-4 Z3：wages 创建侧项目级写入门坎（G76 修复）——2 端点测试。
///
/// 背景：G76 登记「wages 创建侧同族无项目门坎」——POST /api/wages 与 batch-save 的
/// INSERT/upsert 分支可落在未授权项目。修复 = 复用 CurrentUser.CanWriteProject（零新增）。
///
/// 用户：A = admin（项目创建者）；B = accountant（非 admin，默认权限集含 wages:create，
/// 不手动 UPDATE roles）。项目由 A 创建，B 无授权（反向用例）/ 有授权（授权正向用例）。
///
/// 6 条：反向×2（B 无授权 → 403 且 wages 行数不变）+ 正向×2（admin → 200 且行建成，
/// 金额断言用「分」DB 原始值）+ 授权正向×2（B 有 projects 行 + project_authorizations 行
/// 两个种子 → 200 且行建成，钉住方案丙第三分支）。
/// 修复前：2 条反向必须全红（实际 200 + 行已建）。
/// </summary>
public class R9WageCreateGateTests : ApiTestBase
{
    private const string AdminUid = "1";             // 基座种子 admin（username=admin）
    private const string OtherUid = "r9-4-acc";      // accountant，非 admin
    private const string OtherUsername = "r9-4-acc";
    private const string Password = "admin123";
    private const long TestProjectId = 9104;         // A 创建的项目
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

    /// <summary>seed A 创建的项目 + 一个项目工人，返回 project_workers.id</summary>
    private long SeedProjectAndWorker(string workerName = "工资门坎工人")
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        conn.Execute("INSERT OR IGNORE INTO projects (id, name, created_by, created_at) VALUES (@P, @N, @By, @Now)",
            new { P = TestProjectId, N = "R9-4项目", By = AdminUid, Now });
        var workerId = conn.ExecuteScalar<long>(
            "INSERT INTO workers (name, created_at) VALUES (@N, @Now); SELECT last_insert_rowid();",
            new { N = workerName, Now });
        conn.Execute(@"INSERT INTO project_workers (worker_id,project_id,team_id,daily_wage,worker_type,entry_date,status,created_by,created_at,last_modified_at)
            VALUES (@W,@P,NULL,300,'瓦工','2026-01-01','active',@By,@Now,@Now)",
            new { W = workerId, P = TestProjectId, By = AdminUid, Now });
        return conn.ExecuteScalar<long>("SELECT last_insert_rowid();");
    }

    private long CountWageRows()
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.ExecuteScalar<long>(
            "SELECT COUNT(*) FROM wages WHERE project_id=@P", new { P = TestProjectId });
    }

    private void SeedAccountantB()
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var salt = "r9-4-acc-salt-123456";
        var hash = EngineeringManager.Api.Common.HashPassword(Password, salt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
            new
            {
                Id = OtherUid, Username = OtherUsername, Password, Hash = hash, Salt = salt,
                Version = 2, DisplayName = "财务", RoleId = "accountant", Status = "active", Now
            });
    }

    private void SeedAuthorizationForB()
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        conn.Execute("INSERT OR IGNORE INTO projects (id, name, created_by, created_at) VALUES (@P, 'R9-4项目', @By, @Now)",
            new { P = TestProjectId, By = AdminUid, Now });
        conn.Execute("INSERT OR IGNORE INTO project_authorizations (project_id, user_id, granted_by, granted_at) VALUES (@P, @U, @By, @Now)",
            new { P = TestProjectId, U = OtherUid, By = AdminUid, Now });
    }

    // ══════════ 反向 ×2：B 无授权 → 403 且行数不变 ══════════

    [Fact]
    public async Task Reverse1_SingleWageCreate_OtherUserUnauthorized_Returns403()
    {
        SeedAccountantB();
        var pw = SeedProjectAndWorker("反向1工资工人");
        SetAuth(await LoginAsync(OtherUsername));
        var before = CountWageRows();

        var resp = await Client.PostAsJsonAsync("/api/wages", new
        {
            projectId = TestProjectId, projectWorkerId = pw, yearMonth = TestYearMonth,
            dailyWage = 300.0, workDays = 22.0, bonus = 0.0, deduction = 0.0, actualWage = 6600.0,
        });
        // 目标态：B 无授权 → 403 且行数不变
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        Assert.Equal(before, CountWageRows());
    }

    [Fact]
    public async Task Reverse2_BatchSave_OtherUserUnauthorized_Returns403()
    {
        SeedAccountantB();
        var pw = SeedProjectAndWorker("反向2工资工人");
        SetAuth(await LoginAsync(OtherUsername));
        var before = CountWageRows();

        // 全新 project/worker/月份组合 → 走 INSERT 分支
        var resp = await Client.PostAsJsonAsync("/api/wages/batch-save",
            new[]
            {
                new { projectId = (long?)TestProjectId, projectWorkerId = (long?)pw, yearMonth = TestYearMonth,
                      dailyWage = 300.0, workDays = 22.0, bonus = 0.0, deduction = 0.0, actualWage = 6600.0 },
            });
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        Assert.Equal(before, CountWageRows());
    }

    // ══════════ 正向 ×2：admin → 200 且行建成 ══════════

    [Fact]
    public async Task Forward1_SingleWageCreate_Admin_Returns200()
    {
        var pw = SeedProjectAndWorker("正向1工资工人");
        SetAuth(await LoginAsync("admin"));
        var before = CountWageRows();

        var resp = await Client.PostAsJsonAsync("/api/wages", new
        {
            projectId = TestProjectId, projectWorkerId = pw, yearMonth = TestYearMonth,
            dailyWage = 300.0, workDays = 22.0, bonus = 0.0, deduction = 0.0, actualWage = 6600.0,
        });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal(before + 1, CountWageRows());
        // 金额断言用「分」DB 原始值：300 元 → 30000 分
        using (var conn = new SqliteConnection(ConnectionString))
        {
            Assert.Equal(30000L, conn.ExecuteScalar<long>(
                "SELECT daily_wage FROM wages WHERE project_id=@P AND project_worker_id=@W AND year_month=@Y",
                new { P = TestProjectId, W = pw, Y = TestYearMonth }));
            Assert.Equal(660000L, conn.ExecuteScalar<long>(
                "SELECT actual_wage FROM wages WHERE project_id=@P AND project_worker_id=@W AND year_month=@Y",
                new { P = TestProjectId, W = pw, Y = TestYearMonth }));
        }
    }

    [Fact]
    public async Task Forward2_BatchSave_Admin_Returns200()
    {
        var pw = SeedProjectAndWorker("正向2工资工人");
        SetAuth(await LoginAsync("admin"));
        var before = CountWageRows();

        var resp = await Client.PostAsJsonAsync("/api/wages/batch-save",
            new[]
            {
                new { projectId = (long?)TestProjectId, projectWorkerId = (long?)pw, yearMonth = TestYearMonth,
                      dailyWage = 300.0, workDays = 22.0, bonus = 0.0, deduction = 0.0, actualWage = 6600.0 },
            });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal(before + 1, CountWageRows());
        using (var conn = new SqliteConnection(ConnectionString))
        {
            Assert.Equal(30000L, conn.ExecuteScalar<long>(
                "SELECT daily_wage FROM wages WHERE project_id=@P AND project_worker_id=@W AND year_month=@Y",
                new { P = TestProjectId, W = pw, Y = TestYearMonth }));
        }
    }

    // ══════════ 授权正向 ×2：B 有 projects 行 + project_authorizations 行两个种子 → 200 ══════════

    [Fact]
    public async Task Authorized1_SingleWageCreate_AuthorizedUser_Returns200()
    {
        SeedAccountantB();
        var pw = SeedProjectAndWorker("授权1工资工人");
        SeedAuthorizationForB();
        SetAuth(await LoginAsync(OtherUsername));
        var before = CountWageRows();

        var resp = await Client.PostAsJsonAsync("/api/wages", new
        {
            projectId = TestProjectId, projectWorkerId = pw, yearMonth = TestYearMonth,
            dailyWage = 300.0, workDays = 22.0, bonus = 0.0, deduction = 0.0, actualWage = 6600.0,
        });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal(before + 1, CountWageRows()); // 授权项目可创建
    }

    [Fact]
    public async Task Authorized2_BatchSave_AuthorizedUser_Returns200()
    {
        SeedAccountantB();
        var pw = SeedProjectAndWorker("授权2工资工人");
        SeedAuthorizationForB();
        SetAuth(await LoginAsync(OtherUsername));
        var before = CountWageRows();

        var resp = await Client.PostAsJsonAsync("/api/wages/batch-save",
            new[]
            {
                new { projectId = (long?)TestProjectId, projectWorkerId = (long?)pw, yearMonth = TestYearMonth,
                      dailyWage = 300.0, workDays = 22.0, bonus = 0.0, deduction = 0.0, actualWage = 6600.0 },
            });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal(before + 1, CountWageRows()); // 授权项目可创建
    }
}
