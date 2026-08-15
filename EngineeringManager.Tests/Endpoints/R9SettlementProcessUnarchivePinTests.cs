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
/// R9-16 Z3：方案丙例外钉住 —— B9 PUT /api/settlements/{id}/process + B10 PUT /api/settlements/{id}/unarchive。
///
/// 背景：审查方已裁 B9/B10 比照 B44/B45/B46——状态机不放宽（方案丙例外，R9-16）。
/// 本轮零生产代码：只钉住「授权项目内跨人调 process/unarchive 仍 403」+ 登记例外行。
///
/// 端点现状（ContractEndpoints.cs 以原文为准）：
///   B9  process   : MapPut /api/settlements/{id}/process   权限码 settlement:approve
///                   UPDATE ... status='processed' WHERE id=@Id AND deleted_at IS NULL
///                   AND (created_by=@Uid OR @IsAdmin=1) → WriteResult（affected=0 且行在 → 403）
///   B10 unarchive : MapPut /api/settlements/{id}/unarchive 权限码 settlement:update
///                   UPDATE ... status='pending'  WHERE id=@Id AND deleted_at IS NULL
///                   AND (created_by=@Uid OR @IsAdmin=1) → WriteResult（同上）
///   均无锁列、无项目门；授权跨人（有 project_authorizations 但非本人行）→ WHERE 不命中 →
///   affected=0 → WriteResult COUNT>0 → 403。
///
/// PinB9 行为人 = accountant uid='r9-16-acc'（默认集含 settlement:approve，禁改内置角色）；
/// PinB10 行为人 = 自定义角色 id==name='r9-16-una'（permissions 含 settlement:update，
/// 仅 INSERT 新 roles 行）。项目 id=9113（B10 用 9114），created_by='1'，授权按例 →B。
/// 无 cross_user_edit audit 断言：现状端点不写 audit（例外不放宽，钉住现状可观察）。
/// </summary>
public class R9SettlementProcessUnarchivePinTests : ApiTestBase
{
    private const string AdminUid = "1";             // 基座种子 admin（username=admin）
    private const string AccUid = "r9-16-acc";       // accountant（含 settlement:approve）
    private const string UnaUid = "r9-16-una";       // 自定义角色用户（含 settlement:update）
    private const string UnaRoleId = "r9-16-una";    // 自定义角色 id == name（HasPermission id 直通）
    private const string Password = "admin123";
    private const long TestProjectId = 9113;         // B9 项目行（created_by='1'）
    private const long UnaProjectId = 9114;          // B10 项目行（created_by='1'）
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

    /// <summary>PinB9 专用：seed accountant 用户 + 项目行（9113，created_by='1'）+ 授权（9113→B）</summary>
    private void SeedAccountantAndProject()
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var salt = "r9-16-acc-salt-123456";
        var hash = EngineeringManager.Api.Common.HashPassword(Password, salt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
            new
            {
                Id = AccUid, Username = AccUid, Password, Hash = hash, Salt = salt,
                Version = 2, DisplayName = "财务", RoleId = "accountant", Status = "active", Now
            });
        conn.Execute("INSERT OR IGNORE INTO projects (id, name, created_by, created_at) VALUES (@P, 'R9-16项目', @By, @Now)",
            new { P = TestProjectId, By = AdminUid, Now });
        conn.Execute("INSERT OR IGNORE INTO project_authorizations (project_id, user_id, granted_by, granted_at) VALUES (@P, @U, @By, @Now)",
            new { P = TestProjectId, U = AccUid, By = AdminUid, Now });
    }

    /// <summary>PinB10 专用：seed 自定义角色（r9-16-una，name==id，permissions 含 settlement:update）+ 用户 + 项目行（9114，created_by='1'）+ 授权（9114→B）</summary>
    private void SeedCustomRoleAndProject()
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        // 自定义角色：仅 INSERT 新行（name==id，R9-6/R9-14/R9-15 先例；禁改四个内置角色）
        conn.Execute(@"INSERT OR IGNORE INTO roles (id, name, permissions, is_system, created_at)
            VALUES (@Id, @Name, @Perms, 0, @Now)",
            new { Id = UnaRoleId, Name = UnaRoleId, Perms = "[\"settlement:update\",\"settlement:read\"]", Now });
        Assert.Equal(1, conn.ExecuteScalar<int>("SELECT COUNT(*) FROM roles WHERE id=@Id", new { Id = UnaRoleId }));
        var salt = "r9-16-una-salt-123456";
        var hash = EngineeringManager.Api.Common.HashPassword(Password, salt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
            new
            {
                Id = UnaUid, Username = UnaUid, Password, Hash = hash, Salt = salt,
                Version = 2, DisplayName = "结算经办", RoleId = UnaRoleId, Status = "active", Now
            });
        conn.Execute("INSERT OR IGNORE INTO projects (id, name, created_by, created_at) VALUES (@P, 'R9-16项目B10', @By, @Now)",
            new { P = UnaProjectId, By = AdminUid, Now });
        conn.Execute("INSERT OR IGNORE INTO project_authorizations (project_id, user_id, granted_by, granted_at) VALUES (@P, @U, @By, @Now)",
            new { P = UnaProjectId, U = UnaUid, By = AdminUid, Now });
    }

    /// <summary>seed 一条结算（未软删；status 可指定，用于 unarchive 前置），返回 settlements.id</summary>
    private long SeedSettlement(long projectId, string status, string createdBy)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.ExecuteScalar<long>(@"INSERT INTO settlements
            (project_id,name,amount,status,created_by,created_at,updated_at,version,last_modified_at)
            VALUES (@P,'例外钉住结算',1000,@S,@By,@Now,@Now,1,@Now);
            SELECT last_insert_rowid();",
            new { P = projectId, S = status, By = createdBy, Now });
    }

    private long CountAuditForSettlement(long stlId, string userId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.ExecuteScalar<long>(
            "SELECT COUNT(*) FROM audit_logs WHERE action='cross_user_edit' AND resource='settlements' AND resource_id=@Id AND user_id=@U",
            new { Id = stlId.ToString(), U = userId });
    }

    private string GetStatus(long stlId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.ExecuteScalar<string>("SELECT status FROM settlements WHERE id=@Id", new { Id = stlId }) ?? "";
    }

    // ── PinB9：B（accountant，有 settlement:approve + 项目授权）调 process 改 admin 建行 → 403 ──
    // 方案丙例外（B9 状态机不放宽）：授权项目跨人 process 仍被 created_by 守卫拦 → WriteResult 403。
    [Fact]
    public async Task PinB9_AuthorizedCrossUserProcess_StillReturns403()
    {
        SeedAccountantAndProject();
        var stlId = SeedSettlement(TestProjectId, "pending", AdminUid); // admin 建行（未软删）
        SetAuth(await LoginAsync(AccUid));

        var resp = await Client.PutAsync($"/api/settlements/{stlId}/process", null);
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        Assert.Equal("pending", GetStatus(stlId));   // 库 status 不变（未被 process 成 processed）
        Assert.Equal(0L, CountAuditForSettlement(stlId, AccUid)); // 无 cross_user_edit audit
    }

    // ── PinB10：B（自定义角色 r9-16-una，有 settlement:update + 项目授权）调 unarchive 改 admin 建行 → 403 ──
    // 方案丙例外（B10 状态机不放宽）：授权项目跨人 unarchive 仍被 created_by 守卫拦 → WriteResult 403。
    [Fact]
    public async Task PinB10_AuthorizedCrossUserUnarchive_StillReturns403()
    {
        SeedCustomRoleAndProject();
        // unarchive 前置：status 非 pending（端点把 status 改成 'pending'；无 status 前置条件，seed 'processed' 可观察「不变」）
        var stlId = SeedSettlement(UnaProjectId, "processed", AdminUid); // admin 建行（未软删）
        SetAuth(await LoginAsync(UnaUid));

        var resp = await Client.PutAsync($"/api/settlements/{stlId}/unarchive", null);
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        Assert.Equal("processed", GetStatus(stlId)); // 库 status 不变（未被 unarchive 成 pending）
        Assert.Equal(0L, CountAuditForSettlement(stlId, UnaUid)); // 无 cross_user_edit audit
    }
}
