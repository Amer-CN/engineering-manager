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
/// R9-15 Z3：方案丙批次 3d —— B7 PUT /api/settlements，授权项目跨人可改 + audit，7 条测试。
///
/// 背景：方案丙大对齐批次 3d。既定裁决沿用（FREEZE-CONTRACT §6）：授权项目内可改不可删
/// + 跨人修改落 audit（fail-closed 必备件）+ 仅企业版（由 GetDataScope 天然承担）。
/// 设计澄清沿用：项目创建者 ≠ 行编辑权——Classify 无「项目创建者」分支。
/// 本端点无 G75 项目门（无 CanWriteProject），分层 = HasPermission(settlement:update) → Classify。
/// 收尾走 Common.WriteResult：真不存在 404 / 行在（含软删）但改不了 → 403（禁改 WriteResult 本体；
/// WriteResult 的 COUNT 只按 id、不加 deleted_at——软删行 UPDATE 0 行但 COUNT>0 → 403）。
///
/// 角色：accountant 默认集只有 settlement:read / settlement:approve，没有 settlement:update——
/// 本轮用自定义角色（R9-6/R9-14 先例）：id 与 name 同值（'r9-15-set'），permissions JSON 含
/// "settlement:update"，走 HasPermission 按 roles.id 直通查 permissions；仅 INSERT 新 roles 行，
/// 禁 UPDATE/INSERT 四个内置角色。
/// 无锁列（settlements 无 paid_amount/payment_locked）故无 409 档。
/// 金额单位「元」直传直存（无 ToFen）。
/// RowWriteGate.Classify 四态：IsAdmin→AllowedOwn / uid null→Denied / rowCreatedBy==uid→
/// AllowedOwn / 授权项目+授权→AllowedViaAuthorization / 否则 Denied。
///
/// 行为人：B = 自定义角色用户（uid='r9-15-set'，role_id='r9-15-set'，密码 admin123）；
/// 项目行（id 9112，created_by='1'）+ 按用例需要 project_authorizations（9112→B，
/// granted_by='1'）——双种子形态照 R9-9 起既有写法。
/// 结算种子最低：project_id、created_by；PUT body 改 name/amount（可观察列）。
///
/// 7 条（比 B1 多一条软删）：Red1（授权跨人改 → 200 + audit，先红主体）
/// + Pin1（无授权 → 403）+ Pin2（本人行 → 200 无 audit）+ Pin3（admin → 200）
/// + Pin4（不存在行 → 404，WriteResult 语义钉住）+ Pin5（项目创建者改他人行 → 403）
/// + Pin6（软删行 deleted_at 非空、id 仍在 → 403 不是 404 + 库值不变 + 无 audit）。
/// </summary>
public class R9SettlementCrossUserEditTests : ApiTestBase
{
    private const string AdminUid = "1";             // 基座种子 admin（username=admin）
    private const string SetUid = "r9-15-set";       // 自定义角色用户，非 admin
    private const string SetRoleId = "r9-15-set";    // 自定义角色 id == name（HasPermission id 直通）
    private const string Password = "admin123";
    private const long TestProjectId = 9112;         // 项目行（created_by='1'）
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

    /// <summary>seed 自定义角色（r9-15-set，name==id，permissions 含 settlement:update）+ 用户 + 项目行（created_by='1'）+ 可选授权（9112→B）</summary>
    private void SeedSetUserAndProject(bool withAuthz)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        // 自定义角色：仅 INSERT 新行（name==id，R9-6/R9-14 先例；禁改四个内置角色）
        conn.Execute(@"INSERT OR IGNORE INTO roles (id, name, permissions, is_system, created_at)
            VALUES (@Id, @Name, @Perms, 0, @Now)",
            new { Id = SetRoleId, Name = SetRoleId, Perms = "[\"settlement:update\",\"settlement:read\"]", Now });
        Assert.Equal(1, conn.ExecuteScalar<int>("SELECT COUNT(*) FROM roles WHERE id=@Id", new { Id = SetRoleId }));
        var salt = "r9-15-set-salt-123456";
        var hash = EngineeringManager.Api.Common.HashPassword(Password, salt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
            new
            {
                Id = SetUid, Username = SetUid, Password, Hash = hash, Salt = salt,
                Version = 2, DisplayName = "结算经办", RoleId = SetRoleId, Status = "active", Now
            });
        conn.Execute("INSERT OR IGNORE INTO projects (id, name, created_by, created_at) VALUES (@P, 'R9-15项目', @By, @Now)",
            new { P = TestProjectId, By = AdminUid, Now });
        if (withAuthz)
            conn.Execute("INSERT OR IGNORE INTO project_authorizations (project_id, user_id, granted_by, granted_at) VALUES (@P, @U, @By, @Now)",
                new { P = TestProjectId, U = SetUid, By = AdminUid, Now });
    }

    /// <summary>Pin5 专用：项目创建者是 B（自定义角色用户），无授权种子（钉「项目创建者 ≠ 行编辑权」）</summary>
    private void SeedSetAsProjectOwner()
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        conn.Execute(@"INSERT OR IGNORE INTO roles (id, name, permissions, is_system, created_at)
            VALUES (@Id, @Name, @Perms, 0, @Now)",
            new { Id = SetRoleId, Name = SetRoleId, Perms = "[\"settlement:update\",\"settlement:read\"]", Now });
        var salt = "r9-15-set-salt-123456";
        var hash = EngineeringManager.Api.Common.HashPassword(Password, salt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
            new
            {
                Id = SetUid, Username = SetUid, Password, Hash = hash, Salt = salt,
                Version = 2, DisplayName = "结算经办", RoleId = SetRoleId, Status = "active", Now
            });
        conn.Execute("INSERT OR IGNORE INTO projects (id, name, created_by, created_at) VALUES (@P, 'R9-15B创建项目', @By, @Now)",
            new { P = TestProjectId, By = SetUid, Now });
    }

    /// <summary>seed 一条结算（amount 用元直存），返回 settlements.id；softDeleted=true 时 deleted_at 非空（Pin6）</summary>
    private long SeedSettlement(string name, double amount, string createdBy, bool softDeleted = false)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.ExecuteScalar<long>(@"INSERT INTO settlements
            (project_id,name,amount,status,created_by,created_at,updated_at,version,last_modified_at,deleted_at)
            VALUES (@P,@N,@A,'pending',@By,@Now,@Now,1,@Now,@Deleted);
            SELECT last_insert_rowid();",
            new { P = TestProjectId, N = name, A = amount, By = createdBy, Now,
                  Deleted = softDeleted ? (string?)"2026-08-02 00:00:00" : null });
    }

    private long CountAuditForSettlement(long stlId, string userId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.ExecuteScalar<long>(
            "SELECT COUNT(*) FROM audit_logs WHERE action='cross_user_edit' AND resource='settlements' AND resource_id=@Id AND user_id=@U",
            new { Id = stlId.ToString(), U = userId });
    }

    private dynamic? QuerySettlement(long stlId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.QueryFirstOrDefault("SELECT name, amount FROM settlements WHERE id=@Id", new { Id = stlId });
    }

    private async Task<HttpResponseMessage> PutSettlementAsync(long stlId, string name, double amount)
    {
        return await Client.PutAsJsonAsync("/api/settlements", new
        {
            id = stlId, name, amount, projectId = TestProjectId,
        });
    }

    // ── Red1（先红主体）：B + 双种子 + admin 建的结算 → PUT name/amount → 200 + audit ──
    [Fact]
    public async Task Red1_AuthorizedCrossUserEdit_Returns200_WithAudit()
    {
        SeedSetUserAndProject(withAuthz: true);
        var stlId = SeedSettlement("旧结算", 1000, AdminUid); // admin 建行 name='旧结算' amount=1000
        SetAuth(await LoginAsync(SetUid));

        var resp = await PutSettlementAsync(stlId, "新结算", 2000);
        // 目标态：授权项目跨人可改 → 200 且库值已改（name/amount 均改写）
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var row = QuerySettlement(stlId)!;
        Assert.Equal("新结算", (string)row.name);
        Assert.Equal(MoneyUnit.ToFen(2000.0), (double)row.amount);
        // 且 audit_logs 增一行（cross_user_edit、resource=settlements、resource_id=该行、user_id=B）
        Assert.Equal(1L, CountAuditForSettlement(stlId, SetUid));
    }

    // ── Pin1：B 有项目行无授权 → 403 且库值不变 + 无 audit（无项目门，「无授权」能打到 Classify）──
    [Fact]
    public async Task Pin1_UnauthorizedEdit_StillReturns403()
    {
        SeedSetUserAndProject(withAuthz: false);
        var stlId = SeedSettlement("旧结算", 1000, AdminUid);
        SetAuth(await LoginAsync(SetUid));

        var resp = await PutSettlementAsync(stlId, "新结算", 2000);
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        var row = QuerySettlement(stlId)!;
        Assert.Equal("旧结算", (string)row.name);   // 库值不变
        Assert.Equal(1000.0, (double)row.amount);
        Assert.Equal(0L, CountAuditForSettlement(stlId, SetUid)); // 无 audit
    }

    // ── Pin2：B 改自建行 → 200 且 audit 无新增（本人修改不落审计）──
    [Fact]
    public async Task Pin2_OwnerEdit_Returns200_NoAudit()
    {
        SeedSetUserAndProject(withAuthz: false);
        var stlId = SeedSettlement("旧结算", 1000, SetUid); // B 自建行
        SetAuth(await LoginAsync(SetUid));

        var resp = await PutSettlementAsync(stlId, "新结算", 2000);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var row = QuerySettlement(stlId)!;
        Assert.Equal("新结算", (string)row.name);   // 库值改写
        Assert.Equal(MoneyUnit.ToFen(2000.0), (double)row.amount);
        Assert.Equal(0L, CountAuditForSettlement(stlId, SetUid)); // 本人修改不落审计
    }

    // ── Pin3：admin 改 → 200 ──
    [Fact]
    public async Task Pin3_AdminEdit_Returns200()
    {
        var stlId = SeedSettlement("旧结算", 1000, AdminUid);
        SetAuth(await LoginAsync("admin"));

        var resp = await PutSettlementAsync(stlId, "新结算", 2000);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var row = QuerySettlement(stlId)!;
        Assert.Equal("新结算", (string)row.name);
        Assert.Equal(MoneyUnit.ToFen(2000.0), (double)row.amount);
    }

    // ── Pin4：B + 双种子 PUT 不存在的 id → 404（WriteResult 语义钉住，不要预期 403）──
    [Fact]
    public async Task Pin4_NonexistentRow_Returns404()
    {
        SeedSetUserAndProject(withAuthz: true);
        SetAuth(await LoginAsync(SetUid));

        var resp = await Client.PutAsJsonAsync("/api/settlements", new
        {
            id = 999999, name = "不存在", amount = 1.0, projectId = TestProjectId,
        });
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    // ── Pin5：项目 created_by=B、无授权、结算 admin 建 → Classify Denied → 403 ──
    // 钉「项目创建者 ≠ 行编辑权」：B 是项目创建者但无授权，改 admin 建的行仍被拦。
    [Fact]
    public async Task Pin5_ProjectOwnerOtherRow_Returns403()
    {
        SeedSetAsProjectOwner();
        var stlId = SeedSettlement("旧结算", 1000, AdminUid); // 结算 admin 建
        SetAuth(await LoginAsync(SetUid));

        var resp = await PutSettlementAsync(stlId, "新结算", 2000);
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        var row = QuerySettlement(stlId)!;
        Assert.Equal("旧结算", (string)row.name);   // 库值不变
        Assert.Equal(1000.0, (double)row.amount);
        Assert.Equal(0L, CountAuditForSettlement(stlId, SetUid)); // 无 audit
    }

    // ── Pin6：软删行（deleted_at 非空、id 仍在）→ 403（不是 404）+ 库值不变 + 无 audit ──
    // WriteResult 的 COUNT 只按 id、不加 deleted_at：软删行 COUNT>0 → 403（行还在但改不了）。
    [Fact]
    public async Task Pin6_SoftDeletedRow_Returns403()
    {
        SeedSetUserAndProject(withAuthz: true);
        var stlId = SeedSettlement("旧结算", 1000, AdminUid, softDeleted: true); // deleted_at 非空
        SetAuth(await LoginAsync(SetUid));

        var resp = await PutSettlementAsync(stlId, "新结算", 2000);
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode); // 不要预期 404
        var row = QuerySettlement(stlId)!;
        Assert.Equal("旧结算", (string)row.name);   // 库值不变
        Assert.Equal(1000.0, (double)row.amount);
        Assert.Equal(0L, CountAuditForSettlement(stlId, SetUid)); // 无 audit
    }
}
