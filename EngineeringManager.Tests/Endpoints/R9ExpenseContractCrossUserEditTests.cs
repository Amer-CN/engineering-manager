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
/// R9-18 Z3：A 桶 A2 —— PUT /api/contracts/expense 补 audit，6 条测试（与 A1 同构）。
///
/// 背景：A 桶 WHERE 已含 UserFilterWithAuthorizedProjects——授权项目内跨人**现在就是 200**，
/// 本轮只补 Classify 单点 + ViaAuthz 同事务 audit。**不是从 403 放宽到 200**。
/// helper / WriteResult 零改动。分层 = HasPermission(contracts:update) → Classify。
/// 无锁列、无 409。收尾仍走 WriteResult：不存在 404 / Denied 403。
/// 知识库种子 fire-and-forget 保留在 Commit 后（原条件 affected>0 原样）。
///
/// 先红形态（Red1）：现状 HTTP 已是 200（UserFilter 授权命中），失败点是 **audit==0**
/// ——不要写成 Expected Forbidden。
///
/// 角色：accountant 无 contracts:update → 自定义角色 id==name='r9-18-exp'
/// （permissions 含 contracts:update，走 HasPermission id 直通；仅 INSERT 新 roles 行，
/// 禁改四个内置角色）。
/// 行为人：B = uid='r9-18-exp'，role_id='r9-18-exp'，密码 admin123；
/// 项目行（id 9116，created_by='1'）+ 按用例需要 project_authorizations（9116→B）。
/// 支出合同种子最低：name、amount（元）、project_id、created_by；
/// PUT body：{ id, name, amount }。
///
/// 6 条（与 A1 同构）：Red1（授权跨人 200 + audit，先红主体）+ Pin1（无授权 → 403）
/// + Pin2（本人行 → 200 无 audit）+ Pin3（admin → 200）+ Pin4（不存在 404）
/// + Pin5（项目创建者改他人行（无授权）→ 403）。
/// </summary>
public class R9ExpenseContractCrossUserEditTests : ApiTestBase
{
    private const string AdminUid = "1";             // 基座种子 admin（username=admin）
    private const string ExpUid = "r9-18-exp";       // 自定义角色用户，非 admin
    private const string ExpRoleId = "r9-18-exp";    // 自定义角色 id == name（HasPermission id 直通）
    private const string Password = "admin123";
    private const long TestProjectId = 9116;         // 项目行（created_by='1'）
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

    /// <summary>seed 自定义角色（r9-18-exp，name==id，permissions 含 contracts:update）+ 用户 + 项目行（created_by='1'）+ 可选授权（9116→B）</summary>
    private void SeedExpUserAndProject(bool withAuthz)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        // 自定义角色：仅 INSERT 新行（name==id，R9-6/R9-14/R9-17 先例；禁改四个内置角色）
        conn.Execute(@"INSERT OR IGNORE INTO roles (id, name, permissions, is_system, created_at)
            VALUES (@Id, @Name, @Perms, 0, @Now)",
            new { Id = ExpRoleId, Name = ExpRoleId, Perms = "[\"contracts:update\",\"contracts:read\"]", Now });
        Assert.Equal(1, conn.ExecuteScalar<int>("SELECT COUNT(*) FROM roles WHERE id=@Id", new { Id = ExpRoleId }));
        var salt = "r9-18-exp-salt-123456";
        var hash = EngineeringManager.Api.Common.HashPassword(Password, salt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
            new
            {
                Id = ExpUid, Username = ExpUid, Password, Hash = hash, Salt = salt,
                Version = 2, DisplayName = "支出经办", RoleId = ExpRoleId, Status = "active", Now
            });
        conn.Execute("INSERT OR IGNORE INTO projects (id, name, created_by, created_at) VALUES (@P, 'R9-18项目', @By, @Now)",
            new { P = TestProjectId, By = AdminUid, Now });
        if (withAuthz)
            conn.Execute("INSERT OR IGNORE INTO project_authorizations (project_id, user_id, granted_by, granted_at) VALUES (@P, @U, @By, @Now)",
                new { P = TestProjectId, U = ExpUid, By = AdminUid, Now });
    }

    /// <summary>Pin5 专用：项目创建者是 B（自定义角色用户），无授权种子（钉「项目创建者 ≠ 行编辑权」）</summary>
    private void SeedExpAsProjectOwner()
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        conn.Execute(@"INSERT OR IGNORE INTO roles (id, name, permissions, is_system, created_at)
            VALUES (@Id, @Name, @Perms, 0, @Now)",
            new { Id = ExpRoleId, Name = ExpRoleId, Perms = "[\"contracts:update\",\"contracts:read\"]", Now });
        var salt = "r9-18-exp-salt-123456";
        var hash = EngineeringManager.Api.Common.HashPassword(Password, salt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
            new
            {
                Id = ExpUid, Username = ExpUid, Password, Hash = hash, Salt = salt,
                Version = 2, DisplayName = "支出经办", RoleId = ExpRoleId, Status = "active", Now
            });
        conn.Execute("INSERT OR IGNORE INTO projects (id, name, created_by, created_at) VALUES (@P, 'R9-18B创建项目', @By, @Now)",
            new { P = TestProjectId, By = ExpUid, Now });
    }

    /// <summary>seed 一条支出合同（amount 用元直存），返回 expense_contracts.id</summary>
    private long SeedExpenseContract(string name, double amount, string createdBy)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.ExecuteScalar<long>(@"INSERT INTO expense_contracts
            (project_id,name,amount,status,created_by,created_at,updated_at,version,last_modified_at)
            VALUES (@P,@N,@A,'draft',@By,@Now,@Now,1,@Now);
            SELECT last_insert_rowid();",
            new { P = TestProjectId, N = name, A = amount, By = createdBy, Now });
    }

    private long CountAuditForExpenseContract(long expId, string userId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.ExecuteScalar<long>(
            "SELECT COUNT(*) FROM audit_logs WHERE action='cross_user_edit' AND resource='expense_contracts' AND resource_id=@Id AND user_id=@U",
            new { Id = expId.ToString(), U = userId });
    }

    private dynamic? QueryExpenseContract(long expId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.QueryFirstOrDefault("SELECT name, amount FROM expense_contracts WHERE id=@Id", new { Id = expId });
    }

    private async Task<HttpResponseMessage> PutExpenseContractAsync(long expId, string name, double amount)
    {
        return await Client.PutAsJsonAsync("/api/contracts/expense", new
        {
            id = expId, name, amount,
        });
    }

    // ── Red1（先红主体）：B + 双种子 + admin 建的支出合同 → PUT name/amount → 200 + audit ──
    // ★ 先红形态：现状 HTTP 已是 200（A 桶 UserFilter 授权命中），失败点是 audit==0，不是 403。
    [Fact]
    public async Task Red1_AuthorizedCrossUserEdit_Returns200_WithAudit()
    {
        SeedExpUserAndProject(withAuthz: true);
        var expId = SeedExpenseContract("旧支出", 1000, AdminUid); // admin 建行 name='旧支出' amount=1000
        SetAuth(await LoginAsync(ExpUid));

        var resp = await PutExpenseContractAsync(expId, "新支出", 2000);
        // 目标态：授权项目跨人可改（A 桶现状 200）+ 库值已改（name/amount 均改写）
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var row = QueryExpenseContract(expId)!;
        Assert.Equal("新支出", (string)row.name);
        Assert.Equal(2000.0, (double)row.amount);
        // 且 audit_logs 增一行（cross_user_edit、resource=expense_contracts、resource_id=该行、user_id=B）
        Assert.Equal(1L, CountAuditForExpenseContract(expId, ExpUid));
    }

    // ── Pin1：B 有项目行无授权 → 403 且库值不变 + 无 audit（无项目门，「无授权」能打到 Classify）──
    [Fact]
    public async Task Pin1_UnauthorizedEdit_StillReturns403()
    {
        SeedExpUserAndProject(withAuthz: false);
        var expId = SeedExpenseContract("旧支出", 1000, AdminUid);
        SetAuth(await LoginAsync(ExpUid));

        var resp = await PutExpenseContractAsync(expId, "新支出", 2000);
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        var row = QueryExpenseContract(expId)!;
        Assert.Equal("旧支出", (string)row.name);   // 库值不变
        Assert.Equal(1000.0, (double)row.amount);
        Assert.Equal(0L, CountAuditForExpenseContract(expId, ExpUid)); // 无 audit
    }

    // ── Pin2：B 改自建行 → 200 且 audit 无新增（本人修改不落审计）──
    [Fact]
    public async Task Pin2_OwnerEdit_Returns200_NoAudit()
    {
        SeedExpUserAndProject(withAuthz: false);
        var expId = SeedExpenseContract("旧支出", 1000, ExpUid); // B 自建行
        SetAuth(await LoginAsync(ExpUid));

        var resp = await PutExpenseContractAsync(expId, "新支出", 2000);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var row = QueryExpenseContract(expId)!;
        Assert.Equal("新支出", (string)row.name);   // 库值改写
        Assert.Equal(2000.0, (double)row.amount);
        Assert.Equal(0L, CountAuditForExpenseContract(expId, ExpUid)); // 本人修改不落审计
    }

    // ── Pin3：admin 改 → 200 ──
    [Fact]
    public async Task Pin3_AdminEdit_Returns200()
    {
        var expId = SeedExpenseContract("旧支出", 1000, AdminUid);
        SetAuth(await LoginAsync("admin"));

        var resp = await PutExpenseContractAsync(expId, "新支出", 2000);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var row = QueryExpenseContract(expId)!;
        Assert.Equal("新支出", (string)row.name);
        Assert.Equal(2000.0, (double)row.amount);
    }

    // ── Pin4：B + 双种子 PUT 不存在的 id → 404（WriteResult 语义钉住，不要预期 403）──
    [Fact]
    public async Task Pin4_NonexistentRow_Returns404()
    {
        SeedExpUserAndProject(withAuthz: true);
        SetAuth(await LoginAsync(ExpUid));

        var resp = await Client.PutAsJsonAsync("/api/contracts/expense", new
        {
            id = 999999, name = "不存在", amount = 1.0,
        });
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    // ── Pin5：项目 created_by=B、无授权、支出合同 admin 建 → Classify Denied → 403 ──
    // 钉「项目创建者 ≠ 行编辑权」：B 是项目创建者但无授权，改 admin 建的行仍被拦。
    [Fact]
    public async Task Pin5_ProjectOwnerOtherRow_Returns403()
    {
        SeedExpAsProjectOwner();
        var expId = SeedExpenseContract("旧支出", 1000, AdminUid); // 支出合同 admin 建
        SetAuth(await LoginAsync(ExpUid));

        var resp = await PutExpenseContractAsync(expId, "新支出", 2000);
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        var row = QueryExpenseContract(expId)!;
        Assert.Equal("旧支出", (string)row.name);   // 库值不变
        Assert.Equal(1000.0, (double)row.amount);
        Assert.Equal(0L, CountAuditForExpenseContract(expId, ExpUid)); // 无 audit
    }
}
