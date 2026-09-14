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
/// R9-14 Z3：方案丙批次 3c —— B1 PUT /api/contracts/agreement，授权项目跨人可改 + audit，6 条测试。
///
/// 背景：方案丙大对齐批次 3c。既定裁决沿用（FREEZE-CONTRACT §6）：授权项目内可改不可删
/// + 跨人修改落 audit（fail-closed 必备件）+ 仅企业版（由 GetDataScope 天然承担）。
/// 设计澄清沿用：项目创建者 ≠ 行编辑权——Classify 无「项目创建者」分支。
/// 本端点无 G75 项目门（无 CanWriteProject），分层 = HasPermission(contracts:update) → Classify。
/// 与 B15 相同：收尾走 Common.WriteResult——不存在 404 / Denied 403（禁改 WriteResult 本体）。
///
/// 角色：accountant 默认集只有 contracts:read / contracts:export，没有 contracts:update——
/// 本轮用自定义角色（R9-6 先例）：id 与 name 同值（'r9-14-agr'），permissions JSON 含
/// "contracts:update"，走 HasPermission 按 roles.id 直通查 permissions；仅 INSERT 新 roles 行，
/// 禁 UPDATE/INSERT 四个内置角色（admin/manager/accountant/worker）。
/// 无锁列（agreement_contracts 无 paid_amount/payment_locked）故无 409 档。
/// 金额单位「元」直传直存（无 ToFen）。
/// RowWriteGate.Classify 四态：IsAdmin→AllowedOwn / uid null→Denied / rowCreatedBy==uid→
/// AllowedOwn / 授权项目+授权→AllowedViaAuthorization / 否则 Denied。
///
/// 行为人：B = 自定义角色用户（uid='r9-14-agr'，role_id='r9-14-agr'，密码 admin123）；
/// 项目行（id 9111，created_by='1'）+ 按用例需要 project_authorizations（9111→B，
/// granted_by='1'）——双种子形态照 R9-9/R9-11/R9-12/R9-13 既有写法。
/// 协议合同种子最低：name、amount（元）、project_id、created_by；
/// PUT body 最低：{ id, name, amount, projectId }。
///
/// 6 条（无 409 档；注意 Pin4 是 404）：Red1（授权跨人改 → 200 + audit，先红主体）
/// + Pin1（无授权 → 403）+ Pin2（本人行 → 200 无 audit）+ Pin3（admin → 200）
/// + Pin4（不存在行 → 404，WriteResult 语义钉住）+ Pin5（项目创建者改他人行 → 403）。
/// </summary>
public class R9AgreementCrossUserEditTests : ApiTestBase
{
    private const string AdminUid = "1";             // 基座种子 admin（username=admin）
    private const string AgrUid = "r9-14-agr";       // 自定义角色用户，非 admin
    private const string AgrRoleId = "r9-14-agr";    // 自定义角色 id == name（HasPermission id 直通）
    private const string Password = "admin123";
    private const long TestProjectId = 9111;         // 项目行（created_by='1'）
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

    /// <summary>seed 自定义角色（r9-14-agr，name==id，permissions 含 contracts:update）+ 用户 + 项目行（created_by='1'）+ 可选授权（9111→B）</summary>
    private void SeedAgrUserAndProject(bool withAuthz)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        // 自定义角色：仅 INSERT 新行（name==id，R9-6 先例；禁改四个内置角色）
        conn.Execute(@"INSERT OR IGNORE INTO roles (id, name, permissions, is_system, created_at)
            VALUES (@Id, @Name, @Perms, 0, @Now)",
            new { Id = AgrRoleId, Name = AgrRoleId, Perms = "[\"contracts:update\",\"contracts:read\"]", Now });
        Assert.Equal(1, conn.ExecuteScalar<int>("SELECT COUNT(*) FROM roles WHERE id=@Id", new { Id = AgrRoleId }));
        var salt = "r9-14-agr-salt-123456";
        var hash = EngineeringManager.Api.Common.HashPassword(Password, salt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
            new
            {
                Id = AgrUid, Username = AgrUid, Password, Hash = hash, Salt = salt,
                Version = 2, DisplayName = "协议经办", RoleId = AgrRoleId, Status = "active", Now
            });
        conn.Execute("INSERT OR IGNORE INTO projects (id, name, created_by, created_at) VALUES (@P, 'R9-14项目', @By, @Now)",
            new { P = TestProjectId, By = AdminUid, Now });
        if (withAuthz)
            conn.Execute("INSERT OR IGNORE INTO project_authorizations (project_id, user_id, granted_by, granted_at) VALUES (@P, @U, @By, @Now)",
                new { P = TestProjectId, U = AgrUid, By = AdminUid, Now });
    }

    /// <summary>Pin5 专用：项目创建者是 B（自定义角色用户），无授权种子（钉「项目创建者 ≠ 行编辑权」）</summary>
    private void SeedAgrAsProjectOwner()
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        conn.Execute(@"INSERT OR IGNORE INTO roles (id, name, permissions, is_system, created_at)
            VALUES (@Id, @Name, @Perms, 0, @Now)",
            new { Id = AgrRoleId, Name = AgrRoleId, Perms = "[\"contracts:update\",\"contracts:read\"]", Now });
        var salt = "r9-14-agr-salt-123456";
        var hash = EngineeringManager.Api.Common.HashPassword(Password, salt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
            new
            {
                Id = AgrUid, Username = AgrUid, Password, Hash = hash, Salt = salt,
                Version = 2, DisplayName = "协议经办", RoleId = AgrRoleId, Status = "active", Now
            });
        conn.Execute("INSERT OR IGNORE INTO projects (id, name, created_by, created_at) VALUES (@P, 'R9-14B创建项目', @By, @Now)",
            new { P = TestProjectId, By = AgrUid, Now });
    }

    /// <summary>seed 一条协议合同（amount 用元直存），返回 agreement_contracts.id</summary>
    private long SeedAgreement(string name, double amount, string createdBy)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.ExecuteScalar<long>(@"INSERT INTO agreement_contracts
            (project_id,name,amount,status,created_by,created_at,updated_at,version,last_modified_at)
            VALUES (@P,@N,@A,'draft',@By,@Now,@Now,1,@Now);
            SELECT last_insert_rowid();",
            new { P = TestProjectId, N = name, A = amount, By = createdBy, Now });
    }

    private long CountAuditForAgreement(long agrId, string userId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.ExecuteScalar<long>(
            "SELECT COUNT(*) FROM audit_logs WHERE action='cross_user_edit' AND resource='agreement_contracts' AND resource_id=@Id AND user_id=@U",
            new { Id = agrId.ToString(), U = userId });
    }

    private dynamic? QueryAgreement(long agrId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.QueryFirstOrDefault("SELECT name, amount FROM agreement_contracts WHERE id=@Id", new { Id = agrId });
    }

    private async Task<HttpResponseMessage> PutAgreementAsync(long agrId, string name, double amount)
    {
        return await Client.PutAsJsonAsync("/api/contracts/agreement", new
        {
            id = agrId, name, amount, projectId = TestProjectId,
        });
    }

    // ── Red1（先红主体）：B + 双种子 + admin 建的协议 → PUT name/amount → 200 + audit ──
    [Fact]
    public async Task Red1_AuthorizedCrossUserEdit_Returns200_WithAudit()
    {
        SeedAgrUserAndProject(withAuthz: true);
        var agrId = SeedAgreement("旧协议", 1000, AdminUid); // admin 建行 name='旧协议' amount=1000
        SetAuth(await LoginAsync(AgrUid));

        var resp = await PutAgreementAsync(agrId, "新协议", 2000);
        // 目标态：授权项目跨人可改 → 200 且库值已改（name/amount 均改写）
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var row = QueryAgreement(agrId)!;
        Assert.Equal("新协议", (string)row.name);
        Assert.Equal(MoneyUnit.ToFen(2000.0), (double)row.amount);
        // 且 audit_logs 增一行（cross_user_edit、resource=agreement_contracts、resource_id=该行、user_id=B）
        Assert.Equal(1L, CountAuditForAgreement(agrId, AgrUid));
    }

    // ── Pin1：B 有项目行无授权 → 403 且库值不变 + 无 audit（无项目门，「无授权」能打到 Classify）──
    [Fact]
    public async Task Pin1_UnauthorizedEdit_StillReturns403()
    {
        SeedAgrUserAndProject(withAuthz: false);
        var agrId = SeedAgreement("旧协议", 1000, AdminUid);
        SetAuth(await LoginAsync(AgrUid));

        var resp = await PutAgreementAsync(agrId, "新协议", 2000);
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        var row = QueryAgreement(agrId)!;
        Assert.Equal("旧协议", (string)row.name);   // 库值不变
        Assert.Equal(1000.0, (double)row.amount);
        Assert.Equal(0L, CountAuditForAgreement(agrId, AgrUid)); // 无 audit
    }

    // ── Pin2：B 改自建行 → 200 且 audit 无新增（本人修改不落审计）──
    [Fact]
    public async Task Pin2_OwnerEdit_Returns200_NoAudit()
    {
        SeedAgrUserAndProject(withAuthz: false);
        var agrId = SeedAgreement("旧协议", 1000, AgrUid); // B 自建行
        SetAuth(await LoginAsync(AgrUid));

        var resp = await PutAgreementAsync(agrId, "新协议", 2000);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var row = QueryAgreement(agrId)!;
        Assert.Equal("新协议", (string)row.name);   // 库值改写
        Assert.Equal(MoneyUnit.ToFen(2000.0), (double)row.amount);
        Assert.Equal(0L, CountAuditForAgreement(agrId, AgrUid)); // 本人修改不落审计
    }

    // ── Pin3：admin 改 → 200 ──
    [Fact]
    public async Task Pin3_AdminEdit_Returns200()
    {
        var agrId = SeedAgreement("旧协议", 1000, AdminUid);
        SetAuth(await LoginAsync("admin"));

        var resp = await PutAgreementAsync(agrId, "新协议", 2000);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var row = QueryAgreement(agrId)!;
        Assert.Equal("新协议", (string)row.name);
        Assert.Equal(MoneyUnit.ToFen(2000.0), (double)row.amount);
    }

    // ── Pin4：B + 双种子 PUT 不存在的 id → 404（WriteResult 语义钉住，不要预期 403）──
    [Fact]
    public async Task Pin4_NonexistentRow_Returns404()
    {
        SeedAgrUserAndProject(withAuthz: true);
        SetAuth(await LoginAsync(AgrUid));

        var resp = await Client.PutAsJsonAsync("/api/contracts/agreement", new
        {
            id = 999999, name = "不存在", amount = 1.0, projectId = TestProjectId,
        });
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    // ── Pin5：项目 created_by=B、无授权、协议 admin 建 → Classify Denied → 403 ──
    // 钉「项目创建者 ≠ 行编辑权」：B 是项目创建者但无授权，改 admin 建的行仍被拦。
    [Fact]
    public async Task Pin5_ProjectOwnerOtherRow_Returns403()
    {
        SeedAgrAsProjectOwner();
        var agrId = SeedAgreement("旧协议", 1000, AdminUid); // 协议 admin 建
        SetAuth(await LoginAsync(AgrUid));

        var resp = await PutAgreementAsync(agrId, "新协议", 2000);
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        var row = QueryAgreement(agrId)!;
        Assert.Equal("旧协议", (string)row.name);   // 库值不变
        Assert.Equal(1000.0, (double)row.amount);
        Assert.Equal(0L, CountAuditForAgreement(agrId, AgrUid)); // 无 audit
    }
}
