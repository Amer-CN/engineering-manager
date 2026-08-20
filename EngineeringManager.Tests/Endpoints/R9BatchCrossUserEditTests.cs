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
/// R9-21 Z3：A 桶收尾 —— A5 PUT /api/cost-ledger/batches/{id}（B 桶形态翻转，6 条）
/// + A6 DELETE /api/cost-ledger/batches/{id}（PIN-ONLY 钉住现有 403，2 条）。
///
/// A5 背景：现状 WHERE 用 UserFilterCompany(scope)——All → (1=1)；否则 (created_by=@Uid)。
/// 批次有 project_id + created_by（020 迁移）——非 All 用户只能改自建批次，授权跨人现在 403
/// （B 桶形态，不是 A1–A3 的 200）。目标：对齐方案丙——预读 → Classify → 授权跨人可改 + 同事务 audit。
/// 分层 = HasPermission(costLedger:update) → Classify；无锁列、无 409；收尾 Ok/Forbid（不存在 403）。
///
/// A6 背景：DELETE 现状同 UserFilter——非 All = 仅创建者可删，已符合方案丙「可改不可删」，
/// 本轮只钉住现状不改码；accountant 无 costLedger:delete，行为人用自定义角色 r9-21-del（name==id）。
///
/// 行为人：A5 用内置 accountant uid='r9-21-bat'（默认集含 costLedger:update）；
/// A6 用自定义角色 uid='r9-21-del'（仅 INSERT 新 roles 行，禁改内置角色）。
/// 项目行（id 9119，created_by='1'）+ 按用例需要 project_authorizations（9119→B）。
/// 批次种子最低：project_id、name、created_by（020 表：project_id NOT NULL、name NOT NULL）。
///
/// A5 6 条（B 桶形态）：Red1（授权跨人 200+audit，先红主体）+ Pin1（无授权 403）
/// + Pin2（本人 200 无 audit）+ Pin3（admin 200）+ Pin4（不存在 403）+ Pin5（项目创建者改他人行 403）。
/// A6 2 条：Pin6（授权跨人 DELETE → 403 行仍在）+ Pin7（本人删 200）。
/// </summary>
public class R9BatchCrossUserEditTests : ApiTestBase
{
    private const string AdminUid = "1";             // 基座种子 admin（username=admin）
    private const string AccUid = "r9-21-bat";       // accountant（含 costLedger:update）
    private const string DelUid = "r9-21-del";       // 自定义角色（含 costLedger:delete，A6）
    private const string DelRoleId = "r9-21-del";    // == name（HasPermission id 直通）
    private const string Password = "admin123";
    private const long TestProjectId = 9119;
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

    /// <summary>seed 用户（accountant 或自定义角色）+ 项目行（9119，created_by='1'）+ 可选授权（9119→actor）</summary>
    private void SeedActorAndProject(string actorUid, string? roleIdOrNull, bool withAuthz)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var salt = actorUid + "-salt-123456";
        var hash = EngineeringManager.Api.Common.HashPassword(Password, salt, 2);
        if (roleIdOrNull != null) // A6 自定义角色：仅 INSERT 新行（name==id；禁改内置角色）
            conn.Execute(@"INSERT OR IGNORE INTO roles (id, name, permissions, is_system, created_at)
                VALUES (@Id, @Name, @Perms, 0, @Now)",
                new { Id = roleIdOrNull, Name = roleIdOrNull, Perms = "[\"costLedger:delete\",\"costLedger:read\"]", Now });
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
            new
            {
                Id = actorUid, Username = actorUid, Password, Hash = hash, Salt = salt,
                Version = 2, DisplayName = roleIdOrNull == null ? "财务" : "批次管理",
                RoleId = roleIdOrNull ?? "accountant", Status = "active", Now
            });
        conn.Execute("INSERT OR IGNORE INTO projects (id, name, created_by, created_at) VALUES (@P, 'R9-21项目', @By, @Now)",
            new { P = TestProjectId, By = AdminUid, Now });
        if (withAuthz)
            conn.Execute("INSERT OR IGNORE INTO project_authorizations (project_id, user_id, granted_by, granted_at) VALUES (@P, @U, @By, @Now)",
                new { P = TestProjectId, U = actorUid, By = AdminUid, Now });
    }

    /// <summary>Pin5 专用：项目创建者是 B（accountant），无授权种子（钉「项目创建者 ≠ 编辑权」）</summary>
    private void SeedAccAsProjectOwner()
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var salt = AccUid + "-salt-123456";
        var hash = EngineeringManager.Api.Common.HashPassword(Password, salt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
            new
            {
                Id = AccUid, Username = AccUid, Password, Hash = hash, Salt = salt,
                Version = 2, DisplayName = "财务", RoleId = "accountant", Status = "active", Now
            });
        conn.Execute("INSERT OR IGNORE INTO projects (id, name, created_by, created_at) VALUES (@P, 'R9-21B创建项目', @By, @Now)",
            new { P = TestProjectId, By = AccUid, Now });
    }

    private long SeedBatch(string createdBy, string name = "初始批次")
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.ExecuteScalar<long>(@"INSERT INTO cost_ledger_batches (project_id,name,created_by,created_at,updated_at)
            VALUES (@P,@N,@By,@Now,@Now); SELECT last_insert_rowid();",
            new { P = TestProjectId, N = name, By = createdBy, Now });
    }

    private long CountAuditForBatch(long batchId, string userId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.ExecuteScalar<long>(
            "SELECT COUNT(*) FROM audit_logs WHERE action='cross_user_edit' AND resource='cost_ledger_batches' AND resource_id=@Id AND user_id=@U",
            new { Id = batchId.ToString(), U = userId });
    }

    private string? GetBatchName(long batchId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.ExecuteScalar<string?>("SELECT name FROM cost_ledger_batches WHERE id=@Id", new { Id = batchId });
    }

    private long BatchExists(long batchId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.ExecuteScalar<long>("SELECT COUNT(*) FROM cost_ledger_batches WHERE id=@Id", new { Id = batchId });
    }

    private async Task<HttpResponseMessage> PutBatchAsync(long batchId, string newName) =>
        await Client.PutAsJsonAsync($"/api/cost-ledger/batches/{batchId}", new { newName });

    // ══ A5：PUT /api/cost-ledger/batches/{id}（B 桶形态 403→200 翻转）══

    // ── Red1（先红主体）：B + 授权 + admin 建批次 → PUT 改批次名 → 200 + audit ──
    // ★ 先红形态：现状 UserFilterCompany → created_=@Uid 不含授权分支 → 403（B 桶形态，Expected OK / Actual Forbidden）。
    [Fact]
    public async Task Red1_AuthorizedCrossUserEdit_Returns200_WithAudit()
    {
        SeedActorAndProject(AccUid, null, withAuthz: true);
        var bId = SeedBatch(AdminUid); // admin 建批次
        SetAuth(await LoginAsync(AccUid));

        var resp = await PutBatchAsync(bId, "改后批次名");
        // 目标态：授权项目跨人可改 → 200 且库值已改
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal("改后批次名", GetBatchName(bId));
        // 且 audit_logs 增一行（cross_user_edit、resource=cost_ledger_batches、resource_id=该批次、user_id=B）
        Assert.Equal(1L, CountAuditForBatch(bId, AccUid));
    }

    // ── Pin1：B 有项目行无授权 → 403 且库值不变 + 无 audit ──
    [Fact]
    public async Task Pin1_UnauthorizedEdit_StillReturns403()
    {
        SeedActorAndProject(AccUid, null, withAuthz: false);
        var bId = SeedBatch(AdminUid);
        SetAuth(await LoginAsync(AccUid));

        var resp = await PutBatchAsync(bId, "改");
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        Assert.Equal("初始批次", GetBatchName(bId));
        Assert.Equal(0L, CountAuditForBatch(bId, AccUid));
    }

    // ── Pin2：B 改自建批次 → 200 + 无审计（本人修改不落审计）──
    [Fact]
    public async Task Pin2_OwnerEdit_Returns200_NoAudit()
    {
        SeedActorAndProject(AccUid, null, withAuthz: false);
        var bId = SeedBatch(AccUid); // B 自建批次
        SetAuth(await LoginAsync(AccUid));

        var resp = await PutBatchAsync(bId, "自改批次");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal("自改批次", GetBatchName(bId));
        Assert.Equal(0L, CountAuditForBatch(bId, AccUid));
    }

    // ── Pin3：admin 改 → 200 ──
    [Fact]
    public async Task Pin3_AdminEdit_Returns200()
    {
        var bId = SeedBatch(AdminUid);
        SetAuth(await LoginAsync("admin"));

        var resp = await PutBatchAsync(bId, "管理员改");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal("管理员改", GetBatchName(bId));
    }

    // ── Pin4：PUT 不存在的 id → 403（现状 Ok/Forbid 语义钉住）──
    [Fact]
    public async Task Pin4_NonexistentRow_Returns403()
    {
        SeedActorAndProject(AccUid, null, withAuthz: true);
        SetAuth(await LoginAsync(AccUid));

        var resp = await Client.PutAsJsonAsync("/api/cost-ledger/batches/999999", new { newName = "不存在" });
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    // ── Pin5：项目创建者=B（无授权）+ admin 建批次 → Classify Denied → 403 ──
    [Fact]
    public async Task Pin5_ProjectOwnerOtherRow_Returns403()
    {
        SeedAccAsProjectOwner();
        var bId = SeedBatch(AdminUid);
        SetAuth(await LoginAsync(AccUid));

        var resp = await PutBatchAsync(bId, "越权改");
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        Assert.Equal("初始批次", GetBatchName(bId));
        Assert.Equal(0L, CountAuditForBatch(bId, AccUid));
    }

    // ══ A6：DELETE /api/cost-ledger/batches/{id}（PIN-ONLY 钉住，零生产代码）══

    // ── Pin6：B（自定义角色 r9-21-del，含 costLedger:delete）+ 授权，删 admin 建批次 → 403 行仍在 ──
    [Fact]
    public async Task Pin6_AuthorizedCrossUserDelete_StillReturns403()
    {
        SeedActorAndProject(DelUid, DelRoleId, withAuthz: true);
        var bId = SeedBatch(AdminUid); // admin 建批次
        SetAuth(await LoginAsync(DelUid));

        var resp = await Client.DeleteAsync($"/api/cost-ledger/batches/{bId}");
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        Assert.Equal(1L, BatchExists(bId)); // 行仍在
    }

    // ── Pin7：B 自建批次 → DELETE → 200 已删 ──
    [Fact]
    public async Task Pin7_OwnerDelete_Returns200()
    {
        SeedActorAndProject(DelUid, DelRoleId, withAuthz: false);
        var bId = SeedBatch(DelUid); // B 自建批次
        SetAuth(await LoginAsync(DelUid));

        var resp = await Client.DeleteAsync($"/api/cost-ledger/batches/{bId}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal(0L, BatchExists(bId)); // 已删
    }
}