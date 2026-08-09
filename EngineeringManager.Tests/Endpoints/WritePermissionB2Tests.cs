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
/// 窗口 G2 B2：wages/attendances/salary-history 系写端点权限测试
/// 覆盖：考勤 CRUD/生成/导入、工资 CRUD/批量/生成、薪资历史（目标码 wages:create/update/delete）
/// —— worker（无 wages 码）→ 403；admin → 200。
/// 特任务 O3：batch-save 的 DO UPDATE 增加 created_by 归属守卫——同一项目内他人创建的行
///           不再被你的批量保存覆盖（会计有 wages:update 但非行创建者 → skipped）。
/// 特任务：generate-v2 pwId 归属校验——不属于 projectId 的 pwId 跳过并记响应。
/// </summary>
public class WritePermissionB2Tests : ApiTestBase
{
    private const string AdminUser = "admin";
    private const string AdminPassword = "admin123";
    private const string WorkerUser = "worker";
    private const string WorkerPassword = "worker123";
    private const string AccountantUser = "accountant";
    private const string AccountantPassword = "accountant123";

    /// <summary>建 worker（无 wages 码）+ accountant（wages:create/update，无 delete）用户，
    /// 角色权限为 JSON 数组形态（037 后库形态）。</summary>
    private void SeedUsersWithJsonRoles()
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var salt = "b2-salt-1234567890123456";
        var hash = EngineeringManager.Api.Common.HashPassword(WorkerPassword, salt, 2);
        var accSalt = "b2-acc-salt-123456789012";
        var accHash = EngineeringManager.Api.Common.HashPassword(AccountantPassword, accSalt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES ('2', @U, @P, @H, @S, 2, '工人', 'worker', 'active', @Now)",
            new { U = WorkerUser, P = WorkerPassword, H = hash, S = salt, Now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") });
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES ('3', @U, @P, @H, @S, 2, '财务', 'accountant', 'active', @Now)",
            new { U = AccountantUser, P = AccountantPassword, H = accHash, S = accSalt, Now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") });
        // 038（窗口 H P1）落地后：accountant 角色行由迁移建（permissions =
        // GetDefaultPermissions("accountant") 原样 JSON，含 wages:create/read/update），
        // 001 时代的 finance 种子行已删、finance 用户已重映射为 accountant。
        // 此处不再补建/改写 accountant 行（旧临时方案已清，见 H-1 commit）。
        conn.Execute("UPDATE roles SET permissions=@P WHERE id='worker'",
            new { P = "[\"dashboard:read\",\"projects:read\",\"wages:read\",\"projects:export\",\"contracts:export\"]" });
        conn.Execute("UPDATE roles SET permissions=@P WHERE id='admin'",
            new { P = "[\"dashboard:read\",\"projects:create\",\"projects:read\",\"projects:update\",\"projects:delete\",\"projects:export\",\"contracts:create\",\"contracts:read\",\"contracts:update\",\"contracts:delete\",\"contracts:approve\",\"contracts:export\",\"settlement:create\",\"settlement:read\",\"settlement:update\",\"settlement:delete\",\"settlement:approve\",\"inventory:create\",\"inventory:read\",\"inventory:update\",\"inventory:delete\",\"drawings:create\",\"drawings:read\",\"drawings:update\",\"drawings:delete\",\"users:create\",\"users:read\",\"users:update\",\"users:delete\",\"roles:read\",\"roles:update\",\"settings:read\",\"settings:update\",\"wages:create\",\"wages:read\",\"wages:update\",\"wages:delete\",\"wages:approve\",\"members:create\",\"members:read\",\"members:update\",\"members:delete\"]" });
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

    private void SeedProjectWorker(long id, long projectId, double dailyWage)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        conn.Execute(@"INSERT OR IGNORE INTO project_workers (id, project_id, daily_wage, status, created_at)
            VALUES (@Id, @ProjectId, @DailyWage, 'active', @Now)",
            new { Id = id, ProjectId = projectId, DailyWage = dailyWage, Now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") });
    }

    private void SeedWage(long id, long projectId, long pwId, string yearMonth, long actualWageFen, string createdBy)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        conn.Execute(@"INSERT INTO wages (id, project_id, project_worker_id, year_month, daily_wage, work_days, bonus, deduction, actual_wage, paid_amount, status, created_by, created_at, updated_at)
            VALUES (@Id, @ProjectId, @PwId, @YearMonth, @DailyWage, 22, 0, 0, @ActualWage, 0, 'pending', @CreatedBy, @Now, @Now)",
            new { Id = id, ProjectId = projectId, PwId = pwId, YearMonth = yearMonth, DailyWage = 20000, ActualWage = actualWageFen, CreatedBy = createdBy, Now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") });
    }

    private void SeedAttendance(long id, long projectId, long pwId, string yearMonth, string createdBy)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        conn.Execute(@"INSERT INTO attendances (id, member_id, project_id, project_worker_id, year_month, work_days, days_off, is_full_attendance, daily_status, created_by, created_at, updated_at)
            VALUES (@Id, NULL, @ProjectId, @PwId, @YearMonth, 22, 0, 1, '{}', @CreatedBy, @Now, @Now)",
            new { Id = id, ProjectId = projectId, PwId = pwId, YearMonth = yearMonth, CreatedBy = createdBy, Now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") });
    }

    // ── 考勤：create / update / delete → wages:create/update/delete ──

    [Fact]
    public async Task Worker_AttendancesCreate_Returns403()
    {
        SeedUsersWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/attendances",
            new { memberId = 1, projectId = 1, yearMonth = "2026-08", workDays = 22, daysOff = 0, isFullAttendance = true, dailyStatus = "{}" });

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Admin_AttendancesCreate_Returns200()
    {
        SeedUsersWithJsonRoles();
        var token = await LoginAsync(AdminUser, AdminPassword);

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/attendances",
            new { memberId = 1, projectId = 1, yearMonth = "2026-08", workDays = 22, daysOff = 0, isFullAttendance = true, dailyStatus = "{}" });

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task Worker_AttendancesUpdate_Returns403()
    {
        SeedUsersWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Put, "/api/attendances",
            new { id = 1, memberId = 1, projectId = 1, yearMonth = "2026-08", workDays = 20 });

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Worker_AttendancesDelete_Returns403()
    {
        SeedUsersWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Delete, "/api/attendances/1");

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    // ── 工资：create / update / delete / batch → wages:create/update/delete ──

    private static object WageBody() => new
    {
        projectId = 1, projectWorkerId = 1, yearMonth = "2026-08",
        dailyWage = 200.0, workDays = 22, bonus = 0.0, deduction = 0.0, actualWage = 4400.0,
    };

    [Fact]
    public async Task Worker_WagesCreate_Returns403()
    {
        SeedUsersWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/wages", WageBody());

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Admin_WagesCreate_Returns200()
    {
        SeedUsersWithJsonRoles();
        var token = await LoginAsync(AdminUser, AdminPassword);

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/wages", WageBody());

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task Worker_WagesUpdate_Returns403()
    {
        SeedUsersWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Put, "/api/wages",
            new { id = 1, projectId = 1, yearMonth = "2026-08", dailyWage = 200.0, workDays = 22, actualWage = 4400.0 });

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Worker_WagesDelete_Returns403()
    {
        SeedUsersWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Delete, "/api/wages/1");

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Worker_WagesBatchSave_Returns403()
    {
        SeedUsersWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/wages/batch-save",
            new object[] { new { projectId = 1, projectWorkerId = 1, yearMonth = "2026-08", dailyWage = 200.0, workDays = 22, bonus = 0.0, deduction = 0.0, actualWage = 4400.0 } });

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Admin_WagesBatchSave_Returns200()
    {
        SeedUsersWithJsonRoles();
        var token = await LoginAsync(AdminUser, AdminPassword);

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/wages/batch-save",
            new object[] { new { projectId = 1, projectWorkerId = 1, yearMonth = "2026-08", dailyWage = 200.0, workDays = 22, bonus = 0.0, deduction = 0.0, actualWage = 4400.0 } });

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(1, json.GetProperty("data").GetProperty("saved").GetInt32());
    }

    [Fact]
    public async Task Worker_WagesBatchPayment_Returns403()
    {
        SeedUsersWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/wages/batch-payment",
            new object[] { new { id = 1, paidAmount = 4400.0, paidDate = "2026-08-31" } });

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Worker_WagesGenerate_Returns403()
    {
        SeedUsersWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/wages/generate",
            new { projectId = 1, yearMonth = "2026-08" });

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Admin_WagesGenerate_Returns200()
    {
        SeedUsersWithJsonRoles();
        SeedProjectWorker(1, 1, 200);
        SeedAttendance(1, 1, 1, "2026-08", "1");
        var token = await LoginAsync(AdminUser, AdminPassword);

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/wages/generate",
            new { projectId = 1, yearMonth = "2026-08" });

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(1, json.GetProperty("newCount").GetInt32());
    }

    // ── 薪资历史：create / delete → wages:create/delete ──

    [Fact]
    public async Task Worker_SalaryHistoryCreate_Returns403()
    {
        SeedUsersWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/salary-history",
            new { memberId = 1, effectiveDate = "2026-08-01", baseSalary = 8000.0, subsidy = 0.0 });

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Admin_SalaryHistoryCreate_Returns200()
    {
        SeedUsersWithJsonRoles();
        var token = await LoginAsync(AdminUser, AdminPassword);

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/salary-history",
            new { memberId = 1, effectiveDate = "2026-08-01", baseSalary = 8000.0, subsidy = 0.0 });

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task Worker_SalaryHistoryDelete_Returns403()
    {
        SeedUsersWithJsonRoles();
        var token = await LoginAsync(WorkerUser, WorkerPassword);

        var resp = await AuthedAsync(token, HttpMethod.Delete, "/api/salary-history/1");

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    // ── O3：batch-save 归属守卫——他人创建的行不再被覆盖 ──

    [Fact]
    public async Task Accountant_BatchSave_OtherOwnersRow_Skipped()
    {
        SeedUsersWithJsonRoles();
        // R9-4 G76 两层防线适配：补 projects 行 + 授权种子使 accountant
        // 过项目级门（CanWriteProject 授权分支）、抵达 DO UPDATE 行级守卫——
        // skipped/saved 证明拦截发生在行级而非项目级（与 R9-3 Y1b 同款适配）
        using (var seedConn = new SqliteConnection(ConnectionString))
        {
            seedConn.Open();
            var now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
            seedConn.Execute("INSERT OR IGNORE INTO projects (id, name, created_by, created_at) VALUES (1, @Name, '1', @Now)",
                new { Name = "B2 项目", Now = now });
            seedConn.Execute("INSERT OR IGNORE INTO project_authorizations (project_id, user_id, granted_by, granted_at) VALUES (1, '3', '1', @Now)",
                new { Now = now });
        }
        // admin(uid=1) 创建工资行，会计(uid=3) 有 wages:update 但非行创建者
        SeedProjectWorker(1, 1, 200);
        SeedWage(1, 1, 1, "2026-07", 440000, "1");
        var token = await LoginAsync(AccountantUser, AccountantPassword);

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/wages/batch-save",
            new object[] { new { projectId = 1, projectWorkerId = 1, yearMonth = "2026-07", dailyWage = 300.0, workDays = 22, bonus = 0.0, deduction = 0.0, actualWage = 6600.0 } });

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        // 他人行 → DO UPDATE 不命中（created_by 守卫）→ saved=0, skipped=1
        Assert.Equal(0, json.GetProperty("data").GetProperty("saved").GetInt32());
        Assert.Equal(1, json.GetProperty("data").GetProperty("skipped").GetInt32());

        // 库中该行未被覆盖：daily_wage 仍为 20000 分（=200 元），actual_wage 仍为 440000 分
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var row = conn.QueryFirst("SELECT daily_wage, actual_wage FROM wages WHERE id=1");
        Assert.Equal(20000L, Convert.ToInt64(row.daily_wage));
        Assert.Equal(440000L, Convert.ToInt64(row.actual_wage));
    }

    [Fact]
    public async Task Accountant_BatchSave_OwnRow_Saved()
    {
        SeedUsersWithJsonRoles();
        // R9-4 G76 两层防线适配：补 projects 行 + 授权种子使 accountant
        // 过项目级门（CanWriteProject 授权分支）、抵达 DO UPDATE 行级守卫——
        // skipped/saved 证明拦截发生在行级而非项目级（与 R9-3 Y1b 同款适配）
        using (var seedConn = new SqliteConnection(ConnectionString))
        {
            seedConn.Open();
            var now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
            seedConn.Execute("INSERT OR IGNORE INTO projects (id, name, created_by, created_at) VALUES (1, @Name, '1', @Now)",
                new { Name = "B2 项目", Now = now });
            seedConn.Execute("INSERT OR IGNORE INTO project_authorizations (project_id, user_id, granted_by, granted_at) VALUES (1, '3', '1', @Now)",
                new { Now = now });
        }
        // 会计自己创建的行（created_by='3'）→ 本人行可保存（O3 守卫不误伤）
        SeedProjectWorker(1, 1, 200);
        SeedWage(1, 1, 1, "2026-07", 440000, "3");
        var token = await LoginAsync(AccountantUser, AccountantPassword);

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/wages/batch-save",
            new object[] { new { projectId = 1, projectWorkerId = 1, yearMonth = "2026-07", dailyWage = 300.0, workDays = 22, bonus = 0.0, deduction = 0.0, actualWage = 6600.0 } });

        if (resp.StatusCode != HttpStatusCode.OK)
        {
            var body = await resp.Content.ReadAsStringAsync();
            using var conn = new SqliteConnection(ConnectionString);
            conn.Open();
            var rolePerms = conn.QueryFirstOrDefault<string>("SELECT permissions FROM roles WHERE id='accountant'");
            throw new Xunit.Sdk.XunitException($"batch-save 返回 {resp.StatusCode}: {body} | accountant role permissions: {rolePerms}");
        }
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(1, json.GetProperty("data").GetProperty("saved").GetInt32());

        using var conn2 = new SqliteConnection(ConnectionString);
        conn2.Open();
        var row = conn2.QueryFirst("SELECT daily_wage FROM wages WHERE id=1");
        Assert.Equal(30000L, Convert.ToInt64(row.daily_wage));
    }

    // ── generate-v2 pwId 归属校验：不属于 projectId 的 pwId 跳过并记响应 ──

    [Fact]
    public async Task Admin_GenerateV2_CrossProjectPwId_Skipped()
    {
        SeedUsersWithJsonRoles();
        // 只有 id=1 属于 project 1；999 不存在/不属于 → 跳过
        SeedProjectWorker(1, 1, 200);
        var token = await LoginAsync(AdminUser, AdminPassword);

        var resp = await AuthedAsync(token, HttpMethod.Post, "/api/attendances/generate-v2",
            new { projectId = 1, yearMonth = "2026-08", projectWorkerIds = new long[] { 1, 999 } });

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(1, json.GetProperty("data").GetProperty("count").GetInt32());
        var skipped = json.GetProperty("data").GetProperty("skipped").EnumerateArray().Select(e => e.GetInt64()).ToArray();
        Assert.Equal(new long[] { 999 }, skipped);

        // 库中不得出现 pwId=999 的考勤行
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var cross = conn.ExecuteScalar<int>("SELECT COUNT(*) FROM attendances WHERE project_worker_id=999");
        Assert.Equal(0, cross);
    }
}
