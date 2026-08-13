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
/// R9-10 Z3：batch-payment（B48）/ batch-save（B50）方案丙更新侧——授权跨人可改 + audit。
///
/// 背景：方案丙大对齐批次 1b。行为人对 B = accountant（uid='r9-10-acc'，默认集含
/// wages:update，禁止 UPDATE roles）；项目行（id 9107，created_by='1'）+ 按例需要授权
/// （9107→B，granted_by='1'）——双种子形态照 R9-9 既有写法。金额断言一律用「分」。
///
/// 8 条：batch-payment（Red1 授权跨人 saved+audit / Pin1 无授权 skipped / Pin2 本人行
/// saved 无 audit / Pin3 admin saved）+ batch-save（Red2 授权跨人 saved+audit / Pin4 无授权
/// skipped / Pin5 本人行 saved 无 audit / Pin6 授权新建 INSERT saved 无 audit）。
/// 先红：Red1+Red2 双红（当前 saved==0 / skipped==1），其余 6 条绿。
/// </summary>
public class R9WageBatchCrossUserTests : ApiTestBase
{
    private const string AdminUid = "1";             // 基座种子 admin（username=admin）
    private const string AccUid = "r9-10-acc";       // accountant，非 admin
    private const string AccUsername = "r9-10-acc";
    private const string Password = "admin123";
    private const long TestProjectId = 9107;         // 项目行（created_by='1'）
    private const string TestYearMonth = "2026-08";
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

    private void SeedAccountantAndProject(bool withAuthz)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var salt = "r9-10-acc-salt-123456";
        var hash = EngineeringManager.Api.Common.HashPassword(Password, salt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
            new
            {
                Id = AccUid, Username = AccUsername, Password, Hash = hash, Salt = salt,
                Version = 2, DisplayName = "财务", RoleId = "accountant", Status = "active", Now
            });
        conn.Execute("INSERT OR IGNORE INTO projects (id, name, created_by, created_at) VALUES (@P, 'R9-10项目', @By, @Now)",
            new { P = TestProjectId, By = AdminUid, Now });
        if (withAuthz)
            conn.Execute("INSERT OR IGNORE INTO project_authorizations (project_id, user_id, granted_by, granted_at) VALUES (@P, @U, @By, @Now)",
                new { P = TestProjectId, U = AccUid, By = AdminUid, Now });
    }

    /// <summary>seed accountant 用户 + 项目行 created_by = B 本人（过 G76 门 created_by 分支），无授权种子</summary>
    private void SeedAccountantAsProjectOwner()
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var salt = "r9-10-acc-salt-123456";
        var hash = EngineeringManager.Api.Common.HashPassword(Password, salt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
            new
            {
                Id = AccUid, Username = AccUsername, Password, Hash = hash, Salt = salt,
                Version = 2, DisplayName = "财务", RoleId = "accountant", Status = "active", Now
            });
        conn.Execute("INSERT OR IGNORE INTO projects (id, name, created_by, created_at) VALUES (@P, 'R9-10项目', @By, @Now)",
            new { P = TestProjectId, By = AccUid, Now });
    }

    /// <summary>seed 一条工资行（未发款未归档；金额分），返回 wages.id</summary>
    private long SeedWage(long dailyWageFen, string createdBy, bool paid = false)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.ExecuteScalar<long>(@"INSERT INTO wages (project_id,project_worker_id,year_month,daily_wage,work_days,bonus,deduction,actual_wage,paid_amount,payment_locked,created_by,created_at,updated_at,version,last_modified_at)
            VALUES (@P,@PW,@Y,@D,22.0,0,0,@A,@Paid,0,@By,@Now,@Now,1,@Now);
            SELECT last_insert_rowid();",
            new
            {
                P = TestProjectId, PW = 1L, Y = TestYearMonth, D = dailyWageFen, A = dailyWageFen * 22,
                Paid = paid ? (long?)dailyWageFen : null, By = createdBy, Now
            });
    }

    private long CountAuditForWage(long wageId, string userId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.ExecuteScalar<long>(
            "SELECT COUNT(*) FROM audit_logs WHERE action='cross_user_edit' AND resource='wages' AND resource_id=@Id AND user_id=@U",
            new { Id = wageId.ToString(), U = userId });
    }

    private long GetDailyWageFen(long wageId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.ExecuteScalar<long>("SELECT daily_wage FROM wages WHERE id=@Id", new { Id = wageId });
    }

    private long GetPaidAmountFen(long wageId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.ExecuteScalar<long>("SELECT COALESCE(paid_amount,0) FROM wages WHERE id=@Id", new { Id = wageId });
    }

    // ══════════ batch-payment（B48）══════════

    // ── Red1（先红主体）：B + 双种子 + admin 建未付款行 → batch-payment → 200 + saved==1 + paid 落账 + audit ──
    [Fact]
    public async Task Red1_AuthorizedCrossUser_SavedWithAudit()
    {
        SeedAccountantAndProject(withAuthz: true);
        var wageId = SeedWage(20000, AdminUid); // admin 建行，未付款
        SetAuth(await LoginAsync(AccUsername));

        var resp = await Client.PostAsJsonAsync("/api/wages/batch-payment",
            new[] { new { id = wageId, paidAmount = 4400.0, paidDate = "2026-08-15", bankReceiptPath = "r1.jpg" } });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(1, json.GetProperty("data").GetProperty("saved").GetInt32());
        Assert.Equal(0, json.GetProperty("data").GetProperty("skipped").GetInt32());
        Assert.Equal(440000L, GetPaidAmountFen(wageId)); // 4400 元 → 440000 分
        Assert.Equal(1L, CountAuditForWage(wageId, AccUid));
    }

    // ── Pin1：B 无授权 → saved==0 skipped==1 库值不变（两阶段皆绿）──
    [Fact]
    public async Task Pin1_Unauthorized_Skipped()
    {
        SeedAccountantAndProject(withAuthz: false);
        var wageId = SeedWage(20000, AdminUid);
        SetAuth(await LoginAsync(AccUsername));

        var resp = await Client.PostAsJsonAsync("/api/wages/batch-payment",
            new[] { new { id = wageId, paidAmount = 4400.0, paidDate = "2026-08-15", bankReceiptPath = "r1.jpg" } });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(0, json.GetProperty("data").GetProperty("saved").GetInt32());
        Assert.Equal(1, json.GetProperty("data").GetProperty("skipped").GetInt32());
        Assert.Equal(0L, GetPaidAmountFen(wageId)); // 库值不变
    }

    // ── Pin2：B 本人行 → saved==1 无 audit 新增 ──
    [Fact]
    public async Task Pin2_OwnerRow_SavedNoAudit()
    {
        SeedAccountantAndProject(withAuthz: false);
        var wageId = SeedWage(20000, AccUid); // B 自建行
        SetAuth(await LoginAsync(AccUsername));

        var resp = await Client.PostAsJsonAsync("/api/wages/batch-payment",
            new[] { new { id = wageId, paidAmount = 4400.0, paidDate = "2026-08-15", bankReceiptPath = "r1.jpg" } });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(1, json.GetProperty("data").GetProperty("saved").GetInt32());
        Assert.Equal(440000L, GetPaidAmountFen(wageId));
        Assert.Equal(0L, CountAuditForWage(wageId, AccUid)); // 本人修改不落审计
    }

    // ── Pin3：admin → saved==1 ──
    [Fact]
    public async Task Pin3_Admin_Saved()
    {
        var wageId = SeedWage(20000, AdminUid);
        SetAuth(await LoginAsync("admin"));

        var resp = await Client.PostAsJsonAsync("/api/wages/batch-payment",
            new[] { new { id = wageId, paidAmount = 4400.0, paidDate = "2026-08-15", bankReceiptPath = "r1.jpg" } });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(1, json.GetProperty("data").GetProperty("saved").GetInt32());
        Assert.Equal(440000L, GetPaidAmountFen(wageId));
    }

    // ══════════ batch-save（B50）══════════

    // ── Red2（先红主体）：B + 双种子 + admin 建行（同唯一键）→ batch-save → 200 + saved==1 + 库值改写 + audit ──
    [Fact]
    public async Task Red2_AuthorizedCrossOwner_SavedWithAudit()
    {
        SeedAccountantAndProject(withAuthz: true);
        SeedWage(20000, AdminUid); // admin 建行 daily_wage=20000 分（同唯一键 1/2026-08）
        SetAuth(await LoginAsync(AccUsername));

        var resp = await Client.PostAsJsonAsync("/api/wages/batch-save",
            new[]
            {
                new { projectId = (long?)TestProjectId, projectWorkerId = (long?)1, yearMonth = TestYearMonth,
                      dailyWage = 300.0, workDays = 22.0, bonus = 0.0, deduction = 0.0, actualWage = 6600.0 },
            });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(1, json.GetProperty("data").GetProperty("saved").GetInt32());
        Assert.Equal(0, json.GetProperty("data").GetProperty("skipped").GetInt32());
        var wageId = GetWageIdByKey(1, TestYearMonth);
        Assert.Equal(30000L, GetDailyWageFen(wageId)); // 300 元 → 30000 分
        Assert.Equal(1L, CountAuditForWage(wageId, AccUid));
    }

    // ── Pin4：B 是项目创建者（过 G76 门 created_by 分支）+ 改 admin 建的行 → Denied → skipped ──
    // 语义注释：项目创建者可创建（G76 放行）但改他人创建的行 → Classify Denied →
    // skipped（方案丙：跨人改只认 project_authorizations，不认项目创建者）。
    [Fact]
    public async Task Pin4_ProjectOwnerOtherRow_Skipped()
    {
        // projects 行 9107 created_by = B 本人（过 G76 门）；工资行 created_by='1'（admin 建行）；
        // 不建 project_authorizations。唯一键对齐（project_id+project_worker_id+year_month）。
        SeedAccountantAsProjectOwner();
        SeedWage(20000, AdminUid);
        SetAuth(await LoginAsync(AccUsername));

        var resp = await Client.PostAsJsonAsync("/api/wages/batch-save",
            new[]
            {
                new { projectId = (long?)TestProjectId, projectWorkerId = (long?)1, yearMonth = TestYearMonth,
                      dailyWage = 300.0, workDays = 22.0, bonus = 0.0, deduction = 0.0, actualWage = 6600.0 },
            });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        // 项目创建者改他人行 → Classify Denied → skipped==1
        Assert.Equal(0, json.GetProperty("data").GetProperty("saved").GetInt32());
        Assert.Equal(1, json.GetProperty("data").GetProperty("skipped").GetInt32());
        var wageId = GetWageIdByKey(1, TestYearMonth);
        Assert.Equal(20000L, GetDailyWageFen(wageId)); // 库值不变
        Assert.Equal(0L, CountAuditForWage(wageId, AccUid)); // 无 audit 新增
    }

    // ── Pin5：B + 授权种子 + B 本人工资行 → saved==1 无 audit（授权在场但改本人行 → AllowedOwn 短路）──
    [Fact]
    public async Task Pin5_OwnerRow_SavedNoAudit()
    {
        SeedAccountantAndProject(withAuthz: true);
        SeedWage(20000, AccUid); // B 自建行（唯一键对齐）
        SetAuth(await LoginAsync(AccUsername));

        var resp = await Client.PostAsJsonAsync("/api/wages/batch-save",
            new[]
            {
                new { projectId = (long?)TestProjectId, projectWorkerId = (long?)1, yearMonth = TestYearMonth,
                      dailyWage = 300.0, workDays = 22.0, bonus = 0.0, deduction = 0.0, actualWage = 6600.0 },
            });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(1, json.GetProperty("data").GetProperty("saved").GetInt32());
        var wageId = GetWageIdByKey(1, TestYearMonth);
        Assert.Equal(30000L, GetDailyWageFen(wageId));
        Assert.Equal(0L, CountAuditForWage(wageId, AccUid));
    }

    // ── Pin6：B + 双种子 + 全新组合 → INSERT 建行（行数 +1，无 audit——创建路径不受更新侧影响）──
    [Fact]
    public async Task Pin6_AuthorizedFreshInsert_CreatedNoAudit()
    {
        SeedAccountantAndProject(withAuthz: true);
        SetAuth(await LoginAsync(AccUsername));
        var before = CountWageRows();

        // 全新组合：projectWorkerId=999（无既有行）→ 走 INSERT
        var resp = await Client.PostAsJsonAsync("/api/wages/batch-save",
            new[]
            {
                new { projectId = (long?)TestProjectId, projectWorkerId = (long?)999, yearMonth = TestYearMonth,
                      dailyWage = 300.0, workDays = 22.0, bonus = 0.0, deduction = 0.0, actualWage = 6600.0 },
            });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(1, json.GetProperty("data").GetProperty("saved").GetInt32());
        Assert.Equal(before + 1, CountWageRows()); // 新建行
        var wageId = GetWageIdByKey(999, TestYearMonth);
        Assert.Equal(0L, CountAuditForWage(wageId, AccUid)); // 创建不落审计
    }

    private long CountWageRows()
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.ExecuteScalar<long>("SELECT COUNT(*) FROM wages WHERE project_id=@P", new { P = TestProjectId });
    }

    private long GetWageIdByKey(long pwId, string yearMonth)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.ExecuteScalar<long>(
            "SELECT id FROM wages WHERE project_id=@P AND project_worker_id=@W AND year_month=@Y",
            new { P = TestProjectId, W = pwId, Y = yearMonth });
    }
}
