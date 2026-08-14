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
/// R9-11 Z3：PUT /api/attendances 方案丙更新侧（B38）——授权项目跨人可改 + audit，6 条测试。
///
/// 背景：方案丙大对齐批次 2。既定裁决沿用（FREEZE-CONTRACT §6）：授权项目内可改不可删
/// + 跨人修改落 audit（fail-closed 必备件）+ 仅企业版（由 GetDataScope 天然承担）。
/// 设计澄清沿用：项目创建者 ≠ 行编辑权——Classify 无「项目创建者」分支，改他人创建的
/// 行只认 project_authorizations。本端点无 G75 项目门（无 CanWriteProject），分层 =
/// HasPermission(wages:update) → Classify；无锁列（attendances 无 paid_amount/payment_locked），
/// 故无 409 档；不存在行与未授权都是 403（现状语义）。
/// RowWriteGate.Classify 四态：IsAdmin→AllowedOwn / uid null→Denied / rowCreatedBy==uid→
/// AllowedOwn / 授权项目+授权→AllowedViaAuthorization / 否则 Denied。
///
/// 行为人：B = accountant（uid='r9-11-acc'，默认集含 wages:update，禁止 UPDATE roles）；
/// 项目行（id 9108，created_by='1'）+ 按用例需要 project_authorizations（9108→B，
/// granted_by='1'）——双种子形态照 R9-9 既有写法。work_days 用天数（REAL），不是分。
///
/// 6 条（无 409 档）：Red1（授权跨人改 → 200 + audit 行，先红主体）+ Pin1（无授权 → 403
/// + 无 audit）+ Pin2（本人行 → 200 无 audit）+ Pin3（admin → 200）+ Pin4（不存在行 → 403）
/// + Pin5（项目创建者 B 改他人行 → 403，钉「项目创建者 ≠ 行编辑权」）。
/// </summary>
public class R9AttendanceCrossUserEditTests : ApiTestBase
{
    private const string AdminUid = "1";             // 基座种子 admin（username=admin）
    private const string AccUid = "r9-11-acc";       // accountant，非 admin
    private const string AccUsername = "r9-11-acc";
    private const string Password = "admin123";
    private const long TestProjectId = 9108;         // 项目行（created_by='1'）
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

    /// <summary>seed accountant 用户 + 项目行（created_by='1'）+ 可选授权（9108→B）</summary>
    private void SeedAccountantAndProject(bool withAuthz)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var salt = "r9-11-acc-salt-123456";
        var hash = EngineeringManager.Api.Common.HashPassword(Password, salt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
            new
            {
                Id = AccUid, Username = AccUsername, Password, Hash = hash, Salt = salt,
                Version = 2, DisplayName = "财务", RoleId = "accountant", Status = "active", Now
            });
        conn.Execute("INSERT OR IGNORE INTO projects (id, name, created_by, created_at) VALUES (@P, 'R9-11项目', @By, @Now)",
            new { P = TestProjectId, By = AdminUid, Now });
        if (withAuthz)
            conn.Execute("INSERT OR IGNORE INTO project_authorizations (project_id, user_id, granted_by, granted_at) VALUES (@P, @U, @By, @Now)",
                new { P = TestProjectId, U = AccUid, By = AdminUid, Now });
    }

    /// <summary>Pin5 专用：项目创建者是 B（accountant），无授权种子（钉「项目创建者 ≠ 行编辑权」）</summary>
    private void SeedAccountantAsProjectOwner()
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var salt = "r9-11-acc-salt-123456";
        var hash = EngineeringManager.Api.Common.HashPassword(Password, salt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
            new
            {
                Id = AccUid, Username = AccUsername, Password, Hash = hash, Salt = salt,
                Version = 2, DisplayName = "财务", RoleId = "accountant", Status = "active", Now
            });
        conn.Execute("INSERT OR IGNORE INTO projects (id, name, created_by, created_at) VALUES (@P, 'R9-11B创建项目', @By, @Now)",
            new { P = TestProjectId, By = AccUid, Now });
    }

    /// <summary>seed 一个项目工人（workers + project_workers），返回 project_workers.id（照 Y1c 写法）</summary>
    private long SeedProjectWorker(string name, string createdBy)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var workerId = conn.ExecuteScalar<long>(
            "INSERT INTO workers (name, created_at) VALUES (@N, @Now); SELECT last_insert_rowid();",
            new { N = name, Now });
        conn.Execute(@"INSERT INTO project_workers (worker_id,project_id,team_id,daily_wage,worker_type,entry_date,status,created_by,created_at,last_modified_at)
            VALUES (@W,@P,NULL,300,'瓦工','2026-01-01','active',@By,@Now,@Now)",
            new { W = workerId, P = TestProjectId, By = createdBy, Now });
        return conn.ExecuteScalar<long>("SELECT last_insert_rowid();");
    }

    /// <summary>seed 一条考勤行（work_days 用天数），返回 attendances.id</summary>
    private long SeedAttendance(long pwId, double workDays, string createdBy)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.ExecuteScalar<long>(@"INSERT INTO attendances
            (member_id,project_id,project_worker_id,year_month,work_days,created_by,created_at,updated_at,version,last_modified_at)
            VALUES (NULL,@P,@PW,@Y,@W,@By,@Now,@Now,1,@Now);
            SELECT last_insert_rowid();",
            new { P = TestProjectId, PW = pwId, Y = TestYearMonth, W = workDays, By = createdBy, Now });
    }

    private long CountAuditForAttendance(long attId, string userId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.ExecuteScalar<long>(
            "SELECT COUNT(*) FROM audit_logs WHERE action='cross_user_edit' AND resource='attendances' AND resource_id=@Id AND user_id=@U",
            new { Id = attId.ToString(), U = userId });
    }

    private double GetWorkDays(long attId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.ExecuteScalar<double>("SELECT work_days FROM attendances WHERE id=@Id", new { Id = attId });
    }

    private async Task<HttpResponseMessage> PutAttendanceAsync(long attId, long pwId, double workDays)
    {
        return await Client.PutAsJsonAsync("/api/attendances", new
        {
            id = attId, projectId = TestProjectId, projectWorkerId = pwId,
            yearMonth = TestYearMonth, workDays,
        });
    }

    // ── Red1（先红主体）：B + 双种子 + admin 建的考勤行 → PUT workDays=22 → 200 + audit ──
    [Fact]
    public async Task Red1_AuthorizedCrossUserEdit_Returns200_WithAudit()
    {
        SeedAccountantAndProject(withAuthz: true);
        var pw = SeedProjectWorker("B-授权工人", AdminUid);
        var attId = SeedAttendance(pw, 10, AdminUid); // admin 建行 work_days=10
        SetAuth(await LoginAsync(AccUsername));

        var resp = await PutAttendanceAsync(attId, pw, 22.0);
        // 目标态：授权项目跨人可改 → 200 且库值变（10 → 22 天）
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal(22.0, GetWorkDays(attId));
        // 且 audit_logs 增一行（cross_user_edit、resource=attendances、resource_id=该行、user_id=B）
        Assert.Equal(1L, CountAuditForAttendance(attId, AccUid));
    }

    // ── Pin1：B 有项目行无授权 → 403 且库值不变 + 无 audit（本端点无项目门，「无授权」能打到 Classify）──
    [Fact]
    public async Task Pin1_UnauthorizedEdit_StillReturns403()
    {
        SeedAccountantAndProject(withAuthz: false);
        var pw = SeedProjectWorker("B-无授权工人", AdminUid);
        var attId = SeedAttendance(pw, 10, AdminUid);
        SetAuth(await LoginAsync(AccUsername));

        var resp = await PutAttendanceAsync(attId, pw, 22.0);
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        Assert.Equal(10.0, GetWorkDays(attId));   // 库值不变
        Assert.Equal(0L, CountAuditForAttendance(attId, AccUid)); // 无 audit
    }

    // ── Pin2：B 改自建行 → 200 且 audit 无新增（本人修改不落审计）──
    [Fact]
    public async Task Pin2_OwnerEdit_Returns200_NoAudit()
    {
        SeedAccountantAndProject(withAuthz: false);
        var pw = SeedProjectWorker("B-本人工人", AccUid);
        var attId = SeedAttendance(pw, 10, AccUid); // B 自建行
        SetAuth(await LoginAsync(AccUsername));

        var resp = await PutAttendanceAsync(attId, pw, 22.0);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal(22.0, GetWorkDays(attId));   // 库值改写
        Assert.Equal(0L, CountAuditForAttendance(attId, AccUid)); // 本人修改不落审计
    }

    // ── Pin3：admin 改 → 200 ──
    [Fact]
    public async Task Pin3_AdminEdit_Returns200()
    {
        var pw = SeedProjectWorker("admin工人", AdminUid);
        var attId = SeedAttendance(pw, 10, AdminUid);
        SetAuth(await LoginAsync("admin"));

        var resp = await PutAttendanceAsync(attId, pw, 22.0);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal(22.0, GetWorkDays(attId));
    }

    // ── Pin4：B + 双种子 PUT 不存在的 id → 403（现状语义钉住）──
    [Fact]
    public async Task Pin4_NonexistentRow_Returns403()
    {
        SeedAccountantAndProject(withAuthz: true);
        SetAuth(await LoginAsync(AccUsername));

        var resp = await Client.PutAsJsonAsync("/api/attendances", new
        {
            id = 999999, projectId = TestProjectId, projectWorkerId = 999999,
            yearMonth = TestYearMonth, workDays = 22.0,
        });
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    // ── Pin5：项目 created_by=B、无授权种子、考勤行 admin 建 → Classify Denied → 403 ──
    // 钉「项目创建者 ≠ 行编辑权」：B 是项目创建者但无授权，改 admin 建的行仍被拦。
    [Fact]
    public async Task Pin5_ProjectOwnerOtherRow_Returns403()
    {
        SeedAccountantAsProjectOwner();
        var pw = SeedProjectWorker("B-项目下他人行", AdminUid);
        var attId = SeedAttendance(pw, 10, AdminUid); // 考勤行 admin 建
        SetAuth(await LoginAsync(AccUsername));

        var resp = await PutAttendanceAsync(attId, pw, 22.0);
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        Assert.Equal(10.0, GetWorkDays(attId));   // 库值不变
        Assert.Equal(0L, CountAuditForAttendance(attId, AccUid)); // 无 audit
    }
}
