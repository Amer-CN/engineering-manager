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
/// R9-12 Z3：方案丙批次 3a —— B13 PUT /api/invoices + B37 PUT /api/invoices/{id}/status，
/// 授权项目跨人可改 + audit，10 条测试。
///
/// 背景：方案丙大对齐批次 3a（发票更新侧）。既定裁决沿用（FREEZE-CONTRACT §6）：授权项目内
/// 可改不可删 + 跨人修改落 audit（fail-closed 必备件）+ 仅企业版（由 GetDataScope 天然承担）。
/// 设计澄清沿用：项目创建者 ≠ 行编辑权——Classify 无「项目创建者」分支，改他人创建的行只认
/// project_authorizations。两端点均无 G75 项目门（无 CanWriteProject），分层 =
/// HasPermission(invoices:update) → Classify；无锁列（invoices 无 paid_amount/payment_locked），
/// 故无 409 档；不存在行与未授权都是 403（现状语义，未改 WriteResult 的 404）。
/// RowWriteGate.Classify 四态：IsAdmin→AllowedOwn / uid null→Denied / rowCreatedBy==uid→
/// AllowedOwn / 授权项目+授权→AllowedViaAuthorization / 否则 Denied。
///
/// 行为人：B = accountant（uid='r9-12-acc'，默认集含 invoices:update，禁止 UPDATE roles）；
/// 项目行（id 9109，created_by='1'）+ 按用例需要 project_authorizations（9109→B，
/// granted_by='1'）——双种子形态照 R9-9/R9-11 既有写法。
/// 发票金额分制（2026-09 契约：API 元 → ToFen 落库分），断言 name/amount/status（库断言用 MoneyUnit.ToFen 换算期望）。
///
/// 10 条（无 409 档）：B13 6 条（Red1 授权跨人改 → 200 + audit、Pin1 无授权 403、Pin2 本人 200
/// 无 audit、Pin3 admin 200、Pin4 不存在 403、Pin5 项目创建者改他人行 403）+ B37 4 条
/// （Red2 授权跨人改状态 → 200 + audit、Pin6 无授权 403、Pin7 本人 200 无 audit、Pin8 不存在 403）。
/// </summary>
public class R9InvoiceCrossUserEditTests : ApiTestBase
{
    private const string AdminUid = "1";             // 基座种子 admin（username=admin）
    private const string AccUid = "r9-12-acc";       // accountant，非 admin
    private const string AccUsername = "r9-12-acc";
    private const string Password = "admin123";
    private const long TestProjectId = 9109;         // 项目行（created_by='1'）
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

    /// <summary>seed accountant 用户 + 项目行（created_by='1'）+ 可选授权（9109→B）</summary>
    private void SeedAccountantAndProject(bool withAuthz)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var salt = "r9-12-acc-salt-123456";
        var hash = EngineeringManager.Api.Common.HashPassword(Password, salt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
            new
            {
                Id = AccUid, Username = AccUsername, Password, Hash = hash, Salt = salt,
                Version = 2, DisplayName = "财务", RoleId = "accountant", Status = "active", Now
            });
        conn.Execute("INSERT OR IGNORE INTO projects (id, name, created_by, created_at) VALUES (@P, 'R9-12项目', @By, @Now)",
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
        var salt = "r9-12-acc-salt-123456";
        var hash = EngineeringManager.Api.Common.HashPassword(Password, salt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
            new
            {
                Id = AccUid, Username = AccUsername, Password, Hash = hash, Salt = salt,
                Version = 2, DisplayName = "财务", RoleId = "accountant", Status = "active", Now
            });
        conn.Execute("INSERT OR IGNORE INTO projects (id, name, created_by, created_at) VALUES (@P, 'R9-12B创建项目', @By, @Now)",
            new { P = TestProjectId, By = AccUid, Now });
    }

    /// <summary>seed 一条发票行（直插库，金额即分制存储值），返回 invoices.id</summary>
    private long SeedInvoice(string name, double amount, string createdBy, string status = "pending")
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.ExecuteScalar<long>(@"INSERT INTO invoices
            (project_id,name,amount,status,created_by,created_at,updated_at,version,last_modified_at)
            VALUES (@P,@N,@A,@S,@By,@Now,@Now,1,@Now);
            SELECT last_insert_rowid();",
            new { P = TestProjectId, N = name, A = amount, S = status, By = createdBy, Now });
    }

    private long CountAuditForInvoice(long invId, string userId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.ExecuteScalar<long>(
            "SELECT COUNT(*) FROM audit_logs WHERE action='cross_user_edit' AND resource='invoices' AND resource_id=@Id AND user_id=@U",
            new { Id = invId.ToString(), U = userId });
    }

    private dynamic? QueryInvoice(long invId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.QueryFirstOrDefault("SELECT name, amount, status FROM invoices WHERE id=@Id", new { Id = invId });
    }

    private async Task<HttpResponseMessage> PutInvoiceAsync(long invId, string name, double amount)
    {
        return await Client.PutAsJsonAsync("/api/invoices", new
        {
            id = invId, projectId = TestProjectId, name, amount,
        });
    }

    private async Task<HttpResponseMessage> PutStatusAsync(long invId, string status)
    {
        return await Client.PutAsJsonAsync($"/api/invoices/{invId}/status", new { status });
    }

    // ══ B13 PUT /api/invoices ══

    // ── Red1（先红主体）：B + 双种子 + admin 建的发票 → PUT name/amount → 200 + audit ──
    [Fact]
    public async Task Red1_AuthorizedCrossUserEdit_Returns200_WithAudit()
    {
        SeedAccountantAndProject(withAuthz: true);
        var invId = SeedInvoice("旧票", 1000, AdminUid); // admin 建行 name='旧票' amount=1000
        SetAuth(await LoginAsync(AccUsername));

        var resp = await PutInvoiceAsync(invId, "新票", 2000);
        // 目标态：授权项目跨人可改 → 200 且库值已改（name/amount 均改写）
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var row = QueryInvoice(invId)!;
        Assert.Equal("新票", (string)row.name);
        Assert.Equal(MoneyUnit.ToFen(2000.0), (double)row.amount); // PUT 2000 元 → 200000 分
        // 且 audit_logs 增一行（cross_user_edit、resource=invoices、resource_id=该行、user_id=B）
        Assert.Equal(1L, CountAuditForInvoice(invId, AccUid));
    }

    // ── Pin1：B 有项目行无授权 → 403 且库值不变 + 无 audit（无项目门，「无授权」能打到 Classify）──
    [Fact]
    public async Task Pin1_UnauthorizedEdit_StillReturns403()
    {
        SeedAccountantAndProject(withAuthz: false);
        var invId = SeedInvoice("旧票", 1000, AdminUid);
        SetAuth(await LoginAsync(AccUsername));

        var resp = await PutInvoiceAsync(invId, "新票", 2000);
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        var row = QueryInvoice(invId)!;
        Assert.Equal("旧票", (string)row.name);   // 库值不变
        Assert.Equal(1000.0, (double)row.amount);
        Assert.Equal(0L, CountAuditForInvoice(invId, AccUid)); // 无 audit
    }

    // ── Pin2：B 改自建行 → 200 且 audit 无新增（本人修改不落审计）──
    [Fact]
    public async Task Pin2_OwnerEdit_Returns200_NoAudit()
    {
        SeedAccountantAndProject(withAuthz: false);
        var invId = SeedInvoice("旧票", 1000, AccUid); // B 自建行
        SetAuth(await LoginAsync(AccUsername));

        var resp = await PutInvoiceAsync(invId, "新票", 2000);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var row = QueryInvoice(invId)!;
        Assert.Equal("新票", (string)row.name);   // 库值改写
        Assert.Equal(MoneyUnit.ToFen(2000.0), (double)row.amount); // PUT 2000 元 → 200000 分
        Assert.Equal(0L, CountAuditForInvoice(invId, AccUid)); // 本人修改不落审计
    }

    // ── Pin3：admin 改 → 200 ──
    [Fact]
    public async Task Pin3_AdminEdit_Returns200()
    {
        var invId = SeedInvoice("旧票", 1000, AdminUid);
        SetAuth(await LoginAsync("admin"));

        var resp = await PutInvoiceAsync(invId, "新票", 2000);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var row = QueryInvoice(invId)!;
        Assert.Equal("新票", (string)row.name);
        Assert.Equal(MoneyUnit.ToFen(2000.0), (double)row.amount); // PUT 2000 元 → 200000 分
    }

    // ── Pin4：B + 双种子 PUT 不存在的 id → 403（现状语义钉住，不要预期 404）──
    [Fact]
    public async Task Pin4_NonexistentRow_Returns403()
    {
        SeedAccountantAndProject(withAuthz: true);
        SetAuth(await LoginAsync(AccUsername));

        var resp = await Client.PutAsJsonAsync("/api/invoices", new
        {
            id = 999999, projectId = TestProjectId, name = "不存在", amount = 1.0,
        });
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    // ── Pin5：项目 created_by=B、无授权、发票 admin 建 → Classify Denied → 403 ──
    // 钉「项目创建者 ≠ 行编辑权」：B 是项目创建者但无授权，改 admin 建的行仍被拦。
    [Fact]
    public async Task Pin5_ProjectOwnerOtherRow_Returns403()
    {
        SeedAccountantAsProjectOwner();
        var invId = SeedInvoice("旧票", 1000, AdminUid); // 发票 admin 建
        SetAuth(await LoginAsync(AccUsername));

        var resp = await PutInvoiceAsync(invId, "新票", 2000);
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        var row = QueryInvoice(invId)!;
        Assert.Equal("旧票", (string)row.name);   // 库值不变
        Assert.Equal(1000.0, (double)row.amount);
        Assert.Equal(0L, CountAuditForInvoice(invId, AccUid)); // 无 audit
    }

    // ══ B37 PUT /api/invoices/{id}/status ══

    // ── Red2（先红主体）：B + 双种子 + admin 建的发票 status='pending' → 改 status → 200 + audit ──
    [Fact]
    public async Task Red2_AuthorizedStatusChange_Returns200_WithAudit()
    {
        SeedAccountantAndProject(withAuthz: true);
        var invId = SeedInvoice("旧票", 1000, AdminUid, status: "pending");
        SetAuth(await LoginAsync(AccUsername));

        var resp = await PutStatusAsync(invId, "issued");
        // 目标态：授权项目跨人可改状态 → 200 且库 status='issued'
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal("issued", (string)QueryInvoice(invId)!.status);
        // 且 audit_logs 增一行（resource 仍 'invoices'）
        Assert.Equal(1L, CountAuditForInvoice(invId, AccUid));
    }

    // ── Pin6：无授权 + admin 建行 → 403 且 status 不变 + 无 audit ──
    [Fact]
    public async Task Pin6_UnauthorizedStatusChange_Returns403()
    {
        SeedAccountantAndProject(withAuthz: false);
        var invId = SeedInvoice("旧票", 1000, AdminUid, status: "pending");
        SetAuth(await LoginAsync(AccUsername));

        var resp = await PutStatusAsync(invId, "issued");
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        Assert.Equal("pending", (string)QueryInvoice(invId)!.status); // status 不变
        Assert.Equal(0L, CountAuditForInvoice(invId, AccUid)); // 无 audit
    }

    // ── Pin7：B 自建行 → 200 且 audit 无新增（本人修改不落审计）──
    [Fact]
    public async Task Pin7_OwnerStatusChange_Returns200_NoAudit()
    {
        SeedAccountantAndProject(withAuthz: false);
        var invId = SeedInvoice("旧票", 1000, AccUid, status: "pending"); // B 自建行
        SetAuth(await LoginAsync(AccUsername));

        var resp = await PutStatusAsync(invId, "issued");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal("issued", (string)QueryInvoice(invId)!.status); // status 改写
        Assert.Equal(0L, CountAuditForInvoice(invId, AccUid)); // 本人修改不落审计
    }

    // ── Pin8：B + 双种子 PUT 不存在的 id/status → 403 ──
    [Fact]
    public async Task Pin8_NonexistentStatusChange_Returns403()
    {
        SeedAccountantAndProject(withAuthz: true);
        SetAuth(await LoginAsync(AccUsername));

        var resp = await PutStatusAsync(999999, "issued");
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }
}
