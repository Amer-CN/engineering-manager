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
/// R9-9 Z3：PUT /api/wages 方案丙更新侧（B41）——授权项目跨人可改 + audit，6 条测试。
///
/// 背景：方案丙大对齐批次 1a。既定裁决（原作者 2026-08-10 拍板）：授权项目内可改不可删
/// + 跨人修改落 audit（fail-closed 必备件）+ 仅企业版（由 GetDataScope 天然承担）。
/// RowWriteGate.Classify 四态：IsAdmin→AllowedOwn / uid null→Denied / rowCreatedBy==uid→
/// AllowedOwn / 授权项目+授权→AllowedViaAuthorization / 否则 Denied。
///
/// 行为人：B = accountant（uid='r9-9-acc'，默认集含 wages:update，禁止 UPDATE roles）；
/// 项目行（id 9106，created_by='1'）+ 按用例需要 project_authorizations（9106→B，
/// granted_by='1'）——双种子形态照 R9-4 既有写法。金额断言一律用「分」。
///
/// 6 条：Red1（授权跨人改 → 200 + audit 行，先红主体）+ Pin1（无授权 → 403）
/// + Pin2（本人行 → 200 无 audit）+ Pin3（admin → 200）+ Pin4（锁行授权仍 409）
/// + Pin5（不存在行 → 403）。
/// </summary>
public class R9WageCrossUserEditTests : ApiTestBase
{
    private const string AdminUid = "1";             // 基座种子 admin（username=admin）
    private const string AccUid = "r9-9-acc";        // accountant，非 admin
    private const string AccUsername = "r9-9-acc";
    private const string Password = "admin123";
    private const long TestProjectId = 9106;         // 项目行（created_by='1'）
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

    /// <summary>seed accountant 用户 + 项目行（created_by='1'）+ 可选授权（9106→B）</summary>
    private void SeedAccountantAndProject(bool withAuthz)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var salt = "r9-9-acc-salt-123456";
        var hash = EngineeringManager.Api.Common.HashPassword(Password, salt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
            new
            {
                Id = AccUid, Username = AccUsername, Password, Hash = hash, Salt = salt,
                Version = 2, DisplayName = "财务", RoleId = "accountant", Status = "active", Now
            });
        conn.Execute("INSERT OR IGNORE INTO projects (id, name, created_by, created_at) VALUES (@P, 'R9-9项目', @By, @Now)",
            new { P = TestProjectId, By = AdminUid, Now });
        if (withAuthz)
            conn.Execute("INSERT OR IGNORE INTO project_authorizations (project_id, user_id, granted_by, granted_at) VALUES (@P, @U, @By, @Now)",
                new { P = TestProjectId, U = AccUid, By = AdminUid, Now });
    }

    /// <summary>seed 一条工资行（未发款未归档；金额分），返回 wages.id</summary>
    private long SeedWage(long dailyWageFen, string createdBy, bool paid = false, bool locked = false)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.ExecuteScalar<long>(@"INSERT INTO wages (project_id,project_worker_id,year_month,daily_wage,work_days,bonus,deduction,actual_wage,paid_amount,payment_locked,created_by,created_at,updated_at,version,last_modified_at)
            VALUES (@P,NULL,@Y,@D,22.0,0,0,@A,@Paid,@Locked,@By,@Now,@Now,1,@Now);
            SELECT last_insert_rowid();",
            new
            {
                P = TestProjectId, Y = TestYearMonth, D = dailyWageFen, A = dailyWageFen * 22,
                Paid = paid ? (long?)dailyWageFen : null, Locked = locked ? 1 : 0, By = createdBy, Now
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

    private async Task<HttpResponseMessage> PutWageAsync(long wageId, double dailyWageYuan)
    {
        return await Client.PutAsJsonAsync("/api/wages", new
        {
            id = wageId, projectId = TestProjectId, yearMonth = TestYearMonth,
            dailyWage = dailyWageYuan, workDays = 22.0, bonus = 0.0, deduction = 0.0, actualWage = dailyWageYuan * 22,
        });
    }

    // ── Red1（先红主体）：B + 双种子 + admin 建的工资行 → PUT 改 dailyWage → 200 + audit ──
    [Fact]
    public async Task Red1_AuthorizedCrossUserEdit_Returns200_WithAudit()
    {
        SeedAccountantAndProject(withAuthz: true);
        var wageId = SeedWage(20000, AdminUid); // admin 建行 daily_wage=20000 分
        SetAuth(await LoginAsync(AccUsername));

        var resp = await PutWageAsync(wageId, 300.0);
        // 目标态：授权项目跨人可改 → 200 且库值变（300 元 → 30000 分）
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal(30000L, GetDailyWageFen(wageId));
        // 且 audit_logs 增一行（cross_user_edit、resource=wages、resource_id=该行、user_id=B）
        Assert.Equal(1L, CountAuditForWage(wageId, AccUid));
    }

    // ── Pin1：B 只有项目行无授权 → 403 且库值不变（两阶段皆绿）──
    [Fact]
    public async Task Pin1_UnauthorizedEdit_StillReturns403()
    {
        SeedAccountantAndProject(withAuthz: false);
        var wageId = SeedWage(20000, AdminUid);
        SetAuth(await LoginAsync(AccUsername));

        var resp = await PutWageAsync(wageId, 300.0);
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        Assert.Equal(20000L, GetDailyWageFen(wageId)); // 库值不变
    }

    // ── Pin2：B 改自建行 → 200 且 audit 无新增（本人修改不落审计）──
    [Fact]
    public async Task Pin2_OwnerEdit_Returns200_NoAudit()
    {
        SeedAccountantAndProject(withAuthz: false);
        var wageId = SeedWage(20000, AccUid); // B 自建行
        SetAuth(await LoginAsync(AccUsername));

        var resp = await PutWageAsync(wageId, 300.0);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal(30000L, GetDailyWageFen(wageId));
        Assert.Equal(0L, CountAuditForWage(wageId, AccUid)); // 本人修改不落审计
    }

    // ── Pin3：admin 改 → 200 ──
    [Fact]
    public async Task Pin3_AdminEdit_Returns200()
    {
        var wageId = SeedWage(20000, AdminUid);
        SetAuth(await LoginAsync("admin"));

        var resp = await PutWageAsync(wageId, 300.0);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal(30000L, GetDailyWageFen(wageId));
    }

    // ── Pin4：B + 双种子 + 已发款行（paid_amount>0）→ 409（锁在授权分支之前）──
    [Fact]
    public async Task Pin4_LockedRow_AuthorizedStillReturns409()
    {
        SeedAccountantAndProject(withAuthz: true);
        var wageId = SeedWage(20000, AdminUid, paid: true); // 已发款
        SetAuth(await LoginAsync(AccUsername));

        var resp = await PutWageAsync(wageId, 300.0);
        Assert.Equal(HttpStatusCode.Conflict, resp.StatusCode);
        Assert.Equal(20000L, GetDailyWageFen(wageId)); // 未被改
    }

    // ── Pin5：B + 双种子 PUT 不存在的 id → 403（现状语义钉住）──
    [Fact]
    public async Task Pin5_NonexistentRow_Returns403()
    {
        SeedAccountantAndProject(withAuthz: true);
        SetAuth(await LoginAsync(AccUsername));

        var resp = await Client.PutAsJsonAsync("/api/wages", new
        {
            id = 999999, projectId = TestProjectId, yearMonth = TestYearMonth,
            dailyWage = 300.0, workDays = 22.0, bonus = 0.0, deduction = 0.0, actualWage = 6600.0,
        });
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }
}
