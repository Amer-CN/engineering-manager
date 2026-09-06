using Dapper;
using EngineeringManager.Tests.Common;
using Microsoft.Data.Sqlite;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;
using EngineeringManager.Api;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// R9-13 Z3：方案丙批次 3b —— B15 PUT /api/payment-records，授权项目跨人可改 + audit，6 条测试。
///
/// 背景：方案丙大对齐批次 3b。既定裁决沿用（FREEZE-CONTRACT §6）：授权项目内可改不可删
/// + 跨人修改落 audit（fail-closed 必备件）+ 仅企业版（由 GetDataScope 天然承担）。
/// 设计澄清沿用：项目创建者 ≠ 行编辑权——Classify 无「项目创建者」分支。
/// 本端点无 G75 项目门（无 CanWriteProject），分层 = HasPermission(invoices:update) → Classify。
/// 与 B13 的关键差异：收尾走 Common.WriteResult——行不存在 → 404，行在但越权 → 403；
/// 本轮维持这套可观察（禁改 WriteResult 本体，禁止把不存在改成 403）。
/// 无锁列（payment_records 无 paid_amount/payment_locked）故无 409 档。
/// 金额与发票一样「元」直传直存（无 ToFen）。
/// RowWriteGate.Classify 四态：IsAdmin→AllowedOwn / uid null→Denied / rowCreatedBy==uid→
/// AllowedOwn / 授权项目+授权→AllowedViaAuthorization / 否则 Denied。
///
/// 行为人：B = accountant（uid='r9-13-acc'，默认集含 invoices:update，禁止 UPDATE roles）；
/// 项目行（id 9110，created_by='1'）+ 按用例需要 project_authorizations（9110→B，
/// granted_by='1'）——双种子形态照 R9-9/R9-11/R9-12 既有写法。
/// 收付款种子最低：type='payment'、amount（元）、recordDate、projectId、created_by；
/// PUT body 最低：{ id, type, amount, recordDate, projectId }。
///
/// 6 条（无 409 档；注意 Pin4 是 404）：Red1（授权跨人改 → 200 + audit，先红主体）
/// + Pin1（无授权 → 403）+ Pin2（本人行 → 200 无 audit）+ Pin3（admin → 200）
/// + Pin4（不存在行 → 404，WriteResult 语义钉住）+ Pin5（项目创建者改他人行 → 403）。
/// </summary>
public class R9PaymentRecordCrossUserEditTests : ApiTestBase
{
    private const string AdminUid = "1";             // 基座种子 admin（username=admin）
    private const string AccUid = "r9-13-acc";       // accountant，非 admin
    private const string AccUsername = "r9-13-acc";
    private const string Password = "admin123";
    private const long TestProjectId = 9110;         // 项目行（created_by='1'）
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

    /// <summary>seed accountant 用户 + 项目行（created_by='1'）+ 可选授权（9110→B）</summary>
    private void SeedAccountantAndProject(bool withAuthz)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var salt = "r9-13-acc-salt-123456";
        var hash = EngineeringManager.Api.Common.HashPassword(Password, salt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
            new
            {
                Id = AccUid, Username = AccUsername, Password, Hash = hash, Salt = salt,
                Version = 2, DisplayName = "财务", RoleId = "accountant", Status = "active", Now
            });
        conn.Execute("INSERT OR IGNORE INTO projects (id, name, created_by, created_at) VALUES (@P, 'R9-13项目', @By, @Now)",
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
        var salt = "r9-13-acc-salt-123456";
        var hash = EngineeringManager.Api.Common.HashPassword(Password, salt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
            new
            {
                Id = AccUid, Username = AccUsername, Password, Hash = hash, Salt = salt,
                Version = 2, DisplayName = "财务", RoleId = "accountant", Status = "active", Now
            });
        conn.Execute("INSERT OR IGNORE INTO projects (id, name, created_by, created_at) VALUES (@P, 'R9-13B创建项目', @By, @Now)",
            new { P = TestProjectId, By = AccUid, Now });
    }

    /// <summary>seed 一条收付款记录（amount 用元直存），返回 payment_records.id</summary>
    private long SeedPaymentRecord(double amount, string createdBy)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.ExecuteScalar<long>(@"INSERT INTO payment_records
            (type,amount,record_date,project_id,created_by,created_at,version,last_modified_at)
            VALUES ('payment',@A,'2026-08-05',@P,@By,@Now,1,@Now);
            SELECT last_insert_rowid();",
            new { A = amount, P = TestProjectId, By = createdBy, Now });
    }

    private long CountAuditForPaymentRecord(long recId, string userId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.ExecuteScalar<long>(
            "SELECT COUNT(*) FROM audit_logs WHERE action='cross_user_edit' AND resource='payment_records' AND resource_id=@Id AND user_id=@U",
            new { Id = recId.ToString(), U = userId });
    }

    private double GetAmount(long recId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.ExecuteScalar<double>("SELECT amount FROM payment_records WHERE id=@Id", new { Id = recId });
    }

    private async Task<HttpResponseMessage> PutPaymentRecordAsync(long recId, double amount)
    {
        return await Client.PutAsJsonAsync("/api/payment-records", new
        {
            id = recId, type = "payment", amount, recordDate = "2026-08-05", projectId = TestProjectId,
        });
    }

    // ── Red1（先红主体）：B + 双种子 + admin 建的收付款行 → PUT amount=800 → 200 + audit ──
    [Fact]
    public async Task Red1_AuthorizedCrossUserEdit_Returns200_WithAudit()
    {
        SeedAccountantAndProject(withAuthz: true);
        var recId = SeedPaymentRecord(500, AdminUid); // admin 建行 amount=500（元）
        SetAuth(await LoginAsync(AccUsername));

        var resp = await PutPaymentRecordAsync(recId, 800);
        // 目标态：授权项目跨人可改 → 200 且库值已改（500 → 800）
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal(MoneyUnit.ToFen(800.0), GetAmount(recId));
        // 且 audit_logs 增一行（cross_user_edit、resource=payment_records、resource_id=该行、user_id=B）
        Assert.Equal(1L, CountAuditForPaymentRecord(recId, AccUid));
    }

    // ── Pin1：B 有项目行无授权 → 403 且库值不变 + 无 audit（无项目门，「无授权」能打到 Classify）──
    [Fact]
    public async Task Pin1_UnauthorizedEdit_StillReturns403()
    {
        SeedAccountantAndProject(withAuthz: false);
        var recId = SeedPaymentRecord(500, AdminUid);
        SetAuth(await LoginAsync(AccUsername));

        var resp = await PutPaymentRecordAsync(recId, 800);
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        Assert.Equal(500.0, GetAmount(recId));    // 库值不变
        Assert.Equal(0L, CountAuditForPaymentRecord(recId, AccUid)); // 无 audit
    }

    // ── Pin2：B 改自建行 → 200 且 audit 无新增（本人修改不落审计）──
    [Fact]
    public async Task Pin2_OwnerEdit_Returns200_NoAudit()
    {
        SeedAccountantAndProject(withAuthz: false);
        var recId = SeedPaymentRecord(500, AccUid); // B 自建行
        SetAuth(await LoginAsync(AccUsername));

        var resp = await PutPaymentRecordAsync(recId, 800);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal(MoneyUnit.ToFen(800.0), GetAmount(recId));    // 库值改写
        Assert.Equal(0L, CountAuditForPaymentRecord(recId, AccUid)); // 本人修改不落审计
    }

    // ── Pin3：admin 改 → 200 ──
    [Fact]
    public async Task Pin3_AdminEdit_Returns200()
    {
        var recId = SeedPaymentRecord(500, AdminUid);
        SetAuth(await LoginAsync("admin"));

        var resp = await PutPaymentRecordAsync(recId, 800);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal(MoneyUnit.ToFen(800.0), GetAmount(recId));
    }

    // ── Pin4：B + 双种子 PUT 不存在的 id → 404（WriteResult 语义钉住，不要预期 403）──
    [Fact]
    public async Task Pin4_NonexistentRow_Returns404()
    {
        SeedAccountantAndProject(withAuthz: true);
        SetAuth(await LoginAsync(AccUsername));

        var resp = await Client.PutAsJsonAsync("/api/payment-records", new
        {
            id = 999999, type = "payment", amount = 800.0, recordDate = "2026-08-05", projectId = TestProjectId,
        });
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    // ── Pin5：项目 created_by=B、无授权、行 admin 建 → Classify Denied → 403 ──
    // 钉「项目创建者 ≠ 行编辑权」：B 是项目创建者但无授权，改 admin 建的行仍被拦。
    [Fact]
    public async Task Pin5_ProjectOwnerOtherRow_Returns403()
    {
        SeedAccountantAsProjectOwner();
        var recId = SeedPaymentRecord(500, AdminUid); // 行 admin 建
        SetAuth(await LoginAsync(AccUsername));

        var resp = await PutPaymentRecordAsync(recId, 800);
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        Assert.Equal(500.0, GetAmount(recId));    // 库值不变
        Assert.Equal(0L, CountAuditForPaymentRecord(recId, AccUid)); // 无 audit
    }
}
