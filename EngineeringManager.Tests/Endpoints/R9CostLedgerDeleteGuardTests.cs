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
/// R9-20 Z3：A 桶 A4 —— DELETE /api/cost-ledger/{id} 收紧（A 桶唯一「收紧翻转」），4 条测试。
///
/// 背景：方案丙 = 授权项目内可改不可删。A4 现状 WHERE 含 UserFilterWithAuthorizedProjects——
/// 授权跨人删除现在是 200，与口径冲突。本轮收紧：UserFilter 移出 WHERE，回到
/// created_by/admin（DELETE 无 Classify、无 audit——删除本来就不对授权跨人开放），
/// 与 B 桶 DELETE 对齐「可改不可删」。helper / WriteResult 零改动。
/// 其余原样：软删 UPDATE（deleted_at=@Now）、deleted_at IS NULL 守卫、Ok/Forbid 收尾。
///
/// ★ 先红主体（Red1）：现状 UserFilter EXISTS 命中 → 200；目标 403——
/// 失败点 = Expected Forbidden / Actual OK（收紧翻转，方向与此前各轮相反）。
///
/// 角色：accountant 默认集含 costLedger:create/read/update **无 costLedger:delete**（Z1 实证）——
/// 行为人用自定义角色 id==name='r9-20-del'（permissions 含 costLedger:delete，
/// 走 HasPermission id 直通；仅 INSERT 新 roles 行，禁改内置角色）。
/// 项目行（id 9118，created_by='1'）+ 按用例需要 project_authorizations（9118→B）。
/// 台账种子最低同 R9-19（注意 deleted_at 列：默认 NULL，软删后非空）。
///
/// 4 条：Red1（授权跨人删 → 403，先红主体）+ Pin1（本人行 → 200 + deleted_at 非空）
/// + Pin2（admin → 200）+ Pin3（无授权 → 403 + deleted_at 仍 NULL）。
/// </summary>
public class R9CostLedgerDeleteGuardTests : ApiTestBase
{
    private const string AdminUid = "1";             // 基座种子 admin（username=admin）
    private const string DelUid = "r9-20-del";       // 自定义角色用户，非 admin
    private const string DelRoleId = "r9-20-del";    // 自定义角色 id == name（HasPermission id 直通）
    private const string Password = "admin123";
    private const long TestProjectId = 9118;         // 项目行（created_by='1'）
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

    /// <summary>seed 自定义角色（r9-20-del，name==id，permissions 含 costLedger:delete）+ 用户 + 项目行（created_by='1'）+ 可选授权（9118→B）</summary>
    private void SeedDelUserAndProject(bool withAuthz)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        // 自定义角色：仅 INSERT 新行（name==id，R9-6 起先例；禁改四个内置角色）
        conn.Execute(@"INSERT OR IGNORE INTO roles (id, name, permissions, is_system, created_at)
            VALUES (@Id, @Name, @Perms, 0, @Now)",
            new { Id = DelRoleId, Name = DelRoleId, Perms = "[\"costLedger:delete\",\"costLedger:read\"]", Now });
        Assert.Equal(1, conn.ExecuteScalar<int>("SELECT COUNT(*) FROM roles WHERE id=@Id", new { Id = DelRoleId }));
        var salt = "r9-20-del-salt-123456";
        var hash = EngineeringManager.Api.Common.HashPassword(Password, salt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
            new
            {
                Id = DelUid, Username = DelUid, Password, Hash = hash, Salt = salt,
                Version = 2, DisplayName = "台账管理", RoleId = DelRoleId, Status = "active", Now
            });
        conn.Execute("INSERT OR IGNORE INTO projects (id, name, created_by, created_at) VALUES (@P, 'R9-20项目', @By, @Now)",
            new { P = TestProjectId, By = AdminUid, Now });
        if (withAuthz)
            conn.Execute("INSERT OR IGNORE INTO project_authorizations (project_id, user_id, granted_by, granted_at) VALUES (@P, @U, @By, @Now)",
                new { P = TestProjectId, U = DelUid, By = AdminUid, Now });
    }

    /// <summary>seed 一条台账（deleted_at 默认 NULL），返回 cost_ledger.id</summary>
    private long SeedCostLedger(string createdBy)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.ExecuteScalar<long>(@"INSERT INTO cost_ledger
            (project_id,voucher_no,date,direction,category,amount,counterparty,channel,summary,notes,created_by,created_at,updated_at,version,last_modified_at,deleted_at)
            VALUES (@P,'V-001','2026-08-01','expense','材料',1000,'乙方','银行','待删台账',NULL,@By,@Now,@Now,1,@Now,NULL);
            SELECT last_insert_rowid();",
            new { P = TestProjectId, By = createdBy, Now });
    }

    private string? GetDeletedAt(long clId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.ExecuteScalar<string?>("SELECT deleted_at FROM cost_ledger WHERE id=@Id", new { Id = clId });
    }

    // ── Red1（先红主体）：B + 授权 + admin 建行 → DELETE → 403 + deleted_at 仍 NULL ──
    // ★ 收紧翻转：现状 UserFilter EXISTS 命中 → 200；目标 403（Expected Forbidden / Actual OK）。
    [Fact]
    public async Task Red1_AuthorizedCrossUserDelete_StillReturns403()
    {
        SeedDelUserAndProject(withAuthz: true);
        var clId = SeedCostLedger(AdminUid); // admin 建行
        SetAuth(await LoginAsync(DelUid));

        var resp = await Client.DeleteAsync($"/api/cost-ledger/{clId}");
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        Assert.Null(GetDeletedAt(clId));    // 行未被软删
    }

    // ── Pin1：B 自建行 → DELETE → 200 + deleted_at 非空（本人删除照常）──
    [Fact]
    public async Task Pin1_OwnerDelete_Returns200()
    {
        SeedDelUserAndProject(withAuthz: false);
        var clId = SeedCostLedger(DelUid); // B 自建行
        SetAuth(await LoginAsync(DelUid));

        var resp = await Client.DeleteAsync($"/api/cost-ledger/{clId}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.NotNull(GetDeletedAt(clId)); // 已软删（deleted_at 非空）
    }

    // ── Pin2：admin 删 → 200（IsAdmin 分支照常）──
    [Fact]
    public async Task Pin2_AdminDelete_Returns200()
    {
        var clId = SeedCostLedger(AdminUid);
        SetAuth(await LoginAsync("admin"));

        var resp = await Client.DeleteAsync($"/api/cost-ledger/{clId}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.NotNull(GetDeletedAt(clId)); // 已软删
    }

    // ── Pin3：B 无授权 + admin 建行 → 403 + deleted_at 仍 NULL（现状已成立）──
    [Fact]
    public async Task Pin3_UnauthorizedDelete_StillReturns403()
    {
        SeedDelUserAndProject(withAuthz: false);
        var clId = SeedCostLedger(AdminUid);
        SetAuth(await LoginAsync(DelUid));

        var resp = await Client.DeleteAsync($"/api/cost-ledger/{clId}");
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        Assert.Null(GetDeletedAt(clId));    // 行未被软删
    }
}
