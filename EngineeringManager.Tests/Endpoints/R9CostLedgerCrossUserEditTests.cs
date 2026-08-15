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
/// R9-19 Z3：A 桶 A3 —— PUT /api/cost-ledger 补 audit，6 条测试。
///
/// 背景：A 桶 WHERE 已含 UserFilterWithAuthorizedProjects——授权项目内跨人**现在就是 200**，
/// 本轮只补 Classify 单点 + ViaAuthz 同事务 audit。**不是从 403 放宽到 200**。
/// 与 A1/A2 的差异：
///   - 收尾不是 WriteResult，是 affected>0 ? Ok : Forbid → **不存在仍 403**（维持现状，Pin4 钉 403 不是 404）
///   - accountant 默认集含 costLedger:update，用内置 accountant，**禁改内置角色**
///   - 无知识库种子
///   - body 走 CostLedgerEntryDto（camelCase：id/amount/date/direction/…）
/// helper / WriteResult 零改动。无锁列、无 409。
/// PUT WHERE 现状无 deleted_at：预读也不加 deleted_at IS NULL（软删行若 UserFilter 命中，
/// 现状可被改——本轮不改这个可观察）。
/// 金额单位「元」（REAL，无 ToFen）。
///
/// 行为人：B = accountant uid='r9-19-acc'（默认集含 costLedger:update）；
/// 项目行（id 9117，created_by='1'）+ 按用例需要 project_authorizations（9117→B）。
/// 台账种子最低：project_id、created_by、amount（元）、date、direction（如 'expense'）。
///
/// 6 条（注意 Pin4 是 403）：Red1（授权跨人 200 + audit，先红主体）+ Pin1（无授权 → 403
/// + 库值不变 + 无 audit）+ Pin2（本人行 → 200 无 audit）+ Pin3（admin → 200）
/// + Pin4（不存在 id=999999 → 403 不要 404）+ Pin5（项目创建者改他人行 → 403）。
/// </summary>
public class R9CostLedgerCrossUserEditTests : ApiTestBase
{
    private const string AdminUid = "1";             // 基座种子 admin（username=admin）
    private const string AccUid = "r9-19-acc";       // accountant，非 admin（默认集含 costLedger:update）
    private const string AccUsername = "r9-19-acc";
    private const string Password = "admin123";
    private const long TestProjectId = 9117;         // 项目行（created_by='1'）
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

    /// <summary>seed accountant 用户（默认角色，禁改内置角色）+ 项目行（created_by='1'）+ 可选授权（9117→B）</summary>
    private void SeedAccountantAndProject(bool withAuthz)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var salt = "r9-19-acc-salt-123456";
        var hash = EngineeringManager.Api.Common.HashPassword(Password, salt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
            new
            {
                Id = AccUid, Username = AccUsername, Password, Hash = hash, Salt = salt,
                Version = 2, DisplayName = "财务", RoleId = "accountant", Status = "active", Now
            });
        conn.Execute("INSERT OR IGNORE INTO projects (id, name, created_by, created_at) VALUES (@P, 'R9-19项目', @By, @Now)",
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
        var salt = "r9-19-acc-salt-123456";
        var hash = EngineeringManager.Api.Common.HashPassword(Password, salt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
            new
            {
                Id = AccUid, Username = AccUsername, Password, Hash = hash, Salt = salt,
                Version = 2, DisplayName = "财务", RoleId = "accountant", Status = "active", Now
            });
        conn.Execute("INSERT OR IGNORE INTO projects (id, name, created_by, created_at) VALUES (@P, 'R9-19B创建项目', @By, @Now)",
            new { P = TestProjectId, By = AccUid, Now });
    }

    /// <summary>seed 一条台账（amount 用元直存），返回 cost_ledger.id</summary>
    private long SeedCostLedger(double amount, string createdBy)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.ExecuteScalar<long>(@"INSERT INTO cost_ledger
            (project_id,voucher_no,date,direction,category,amount,counterparty,channel,summary,notes,created_by,created_at,updated_at,version,last_modified_at)
            VALUES (@P,'V-001','2026-08-01','expense','材料',@A,'乙方','银行','旧台账',NULL,@By,@Now,@Now,1,@Now);
            SELECT last_insert_rowid();",
            new { P = TestProjectId, A = amount, By = createdBy, Now });
    }

    private long CountAuditForCostLedger(long clId, string userId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.ExecuteScalar<long>(
            "SELECT COUNT(*) FROM audit_logs WHERE action='cross_user_edit' AND resource='cost_ledger' AND resource_id=@Id AND user_id=@U",
            new { Id = clId.ToString(), U = userId });
    }

    private double GetAmount(long clId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.ExecuteScalar<double>("SELECT amount FROM cost_ledger WHERE id=@Id", new { Id = clId });
    }

    private async Task<HttpResponseMessage> PutCostLedgerAsync(long clId, double amount)
    {
        return await Client.PutAsJsonAsync("/api/cost-ledger", new
        {
            id = clId, date = "2026-08-01", direction = "expense", amount,
        });
    }

    // ── Red1（先红主体）：B + 双种子 + admin 建的台账 → PUT amount=2000 → 200 + audit ──
    // ★ 先红形态：现状 HTTP 已是 200（A 桶 UserFilter 授权命中），失败点是 audit==0，不是 403。
    [Fact]
    public async Task Red1_AuthorizedCrossUserEdit_Returns200_WithAudit()
    {
        SeedAccountantAndProject(withAuthz: true);
        var clId = SeedCostLedger(1000, AdminUid); // admin 建行 amount=1000
        SetAuth(await LoginAsync(AccUsername));

        var resp = await PutCostLedgerAsync(clId, 2000);
        // 目标态：授权项目跨人可改（A 桶现状 200）+ 库值已改（1000 → 2000）
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal(2000.0, GetAmount(clId));
        // 且 audit_logs 增一行（cross_user_edit、resource=cost_ledger、resource_id=该行、user_id=B）
        Assert.Equal(1L, CountAuditForCostLedger(clId, AccUid));
    }

    // ── Pin1：B 有项目行无授权 → 403 且库值不变 + 无 audit（无项目门，「无授权」能打到 Classify）──
    [Fact]
    public async Task Pin1_UnauthorizedEdit_StillReturns403()
    {
        SeedAccountantAndProject(withAuthz: false);
        var clId = SeedCostLedger(1000, AdminUid);
        SetAuth(await LoginAsync(AccUsername));

        var resp = await PutCostLedgerAsync(clId, 2000);
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        Assert.Equal(1000.0, GetAmount(clId));    // 库值不变
        Assert.Equal(0L, CountAuditForCostLedger(clId, AccUid)); // 无 audit
    }

    // ── Pin2：B 改自建行 → 200 且 audit 无新增（本人修改不落审计）──
    [Fact]
    public async Task Pin2_OwnerEdit_Returns200_NoAudit()
    {
        SeedAccountantAndProject(withAuthz: false);
        var clId = SeedCostLedger(1000, AccUid); // B 自建行
        SetAuth(await LoginAsync(AccUsername));

        var resp = await PutCostLedgerAsync(clId, 2000);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal(2000.0, GetAmount(clId));    // 库值改写
        Assert.Equal(0L, CountAuditForCostLedger(clId, AccUid)); // 本人修改不落审计
    }

    // ── Pin3：admin 改 → 200 ──
    [Fact]
    public async Task Pin3_AdminEdit_Returns200()
    {
        var clId = SeedCostLedger(1000, AdminUid);
        SetAuth(await LoginAsync("admin"));

        var resp = await PutCostLedgerAsync(clId, 2000);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal(2000.0, GetAmount(clId));
    }

    // ── Pin4：B + 双种子 PUT 不存在的 id → 403（现状 Forbid 语义钉住，不要预期 404）──
    [Fact]
    public async Task Pin4_NonexistentRow_Returns403()
    {
        SeedAccountantAndProject(withAuthz: true);
        SetAuth(await LoginAsync(AccUsername));

        var resp = await Client.PutAsJsonAsync("/api/cost-ledger", new
        {
            id = 999999, date = "2026-08-01", direction = "expense", amount = 2000.0,
        });
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    // ── Pin5：项目 created_by=B、无授权、台账 admin 建 → Classify Denied → 403 ──
    // 钉「项目创建者 ≠ 行编辑权」：B 是项目创建者但无授权，改 admin 建的行仍被拦。
    [Fact]
    public async Task Pin5_ProjectOwnerOtherRow_Returns403()
    {
        SeedAccountantAsProjectOwner();
        var clId = SeedCostLedger(1000, AdminUid); // 台账 admin 建
        SetAuth(await LoginAsync(AccUsername));

        var resp = await PutCostLedgerAsync(clId, 2000);
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        Assert.Equal(1000.0, GetAmount(clId));    // 库值不变
        Assert.Equal(0L, CountAuditForCostLedger(clId, AccUid)); // 无 audit
    }
}
