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
/// R9-6 W2：PUT /api/worker-teams 归属守卫（D3 修复）——3 条测试。
///
/// 背景：D3 登记「worker-teams PUT 的 WHERE 仅 id=@Id 无归属守卫」。worker_teams 有
/// created_by（GET 按 (wt.created_by=@Uid OR @IsAdmin=1) 过滤、DELETE 同守卫），
/// 唯独 PUT 缺。修复 = 对齐手足 DELETE 的行级守卫 (created_by=@Uid OR @IsAdmin=1)。
///
/// 行为人：members:update 默认仅 admin 持有（GetDefaultPermissions 查证），但企业版
/// 角色权限可编辑（PUT /api/roles）→ 路径现实可达。
///
/// 机制说明：反向行为人走自定义角色 r9-6-lead（name==id）——HasPermission 的四中文名
/// 白名单未命中时按 id 直通查 roles 表（CurrentUser.cs 实测），自定义角色 name≠id 会
/// fail-closed（roles 身份缺陷第⑤层，已登记 R9-SCOPE §2，042 轨道另修）。不动任何默认角色行。
///
/// 3 条：Reverse1（B 改 A 的行 → 403 且 name 未被改写）+ Forward1（admin → 200 生效）
/// + Forward2（B 改自己行 → 200 生效，守卫不误伤本人行）。
/// 修复前：Reverse1 必须红（Actual OK 且 name 已被改写——自定义角色持 members:update
/// 配置下的漏洞实证）。
/// </summary>
public class R9WorkerTeamGuardTests : ApiTestBase
{
    private const string AdminUid = "1";             // 基座种子 admin（username=admin）
    private const string LeadUid = "r9-6-lead";      // 自定义角色用户
    private const string LeadUsername = "r9-6-lead";
    private const string Password = "admin123";
    private const long TestProjectId = 9105;         // 哑值（worker-teams 无端点项目门）
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

    /// <summary>seed 自定义角色行 r9-6-lead（members:read + members:update，name==id 走 HasPermission id 直通）+ 用户行。不动任何默认角色行。</summary>
    private void SeedLeadRoleAndUser()
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        // 角色行：列集照 038 迁移 accountant 行；permissions 为 JSON 数组 TEXT（037 后形态）；
        // name==id（'r9-6-lead'）——HasPermission 四中文名白名单未命中时按 id 直通查 roles
        conn.Execute(@"INSERT OR IGNORE INTO roles (id, name, permissions, is_system, created_at)
            VALUES (@Id, @Name, @Perms, 0, @Now)",
            new { Id = "r9-6-lead", Name = "r9-6-lead", Perms = "[\"members:read\",\"members:update\"]", Now });
        // 自证断言：角色行确已建（未 UPDATE 任何默认角色行）
        Assert.Equal(1, conn.ExecuteScalar<int>("SELECT COUNT(*) FROM roles WHERE id='r9-6-lead'"));
        // 用户行：uid='r9-6-lead'，role_id='r9-6-lead'
        var salt = "r9-6-lead-salt-123456";
        var hash = EngineeringManager.Api.Common.HashPassword(Password, salt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
            new
            {
                Id = LeadUid, Username = LeadUsername, Password, Hash = hash, Salt = salt,
                Version = 2, DisplayName = "R9-6组长", RoleId = "r9-6-lead", Status = "active", Now
            });
    }

    /// <summary>seed 一条班组行（created_by 指定），返回 worker_teams.id</summary>
    private long SeedTeam(string name, string createdBy)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.ExecuteScalar<long>(@"INSERT INTO worker_teams (name, project_id, leader_id, created_by, created_at, updated_at, last_modified_at)
            VALUES (@N, @P, NULL, @By, @Now, @Now, @Now);
            SELECT last_insert_rowid();",
            new { N = name, P = TestProjectId, By = createdBy, Now });
    }

    private string QueryTeamName(long id)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.ExecuteScalar<string>("SELECT name FROM worker_teams WHERE id=@Id", new { Id = id })!;
    }

    // ── Reverse1：B（r9-6-lead，持 members:update）PUT A 创建的班组行 → 403 且 name 未被改写 ──
    [Fact]
    public async Task Reverse1_TeamLeadEditForeignRow_Returns403()
    {
        SeedLeadRoleAndUser();
        // A（admin）建行 name='原始班组'
        var teamId = SeedTeam("原始班组", AdminUid);
        SetAuth(await LoginAsync(LeadUsername));

        var resp = await Client.PutAsJsonAsync("/api/worker-teams",
            new { id = teamId, name = "被组长改写", leaderId = (long?)null });
        // 目标态：非 admin 非创建者 → 403 且 name 未被改写
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        Assert.Equal("原始班组", QueryTeamName(teamId));
    }

    // ── Forward1：admin PUT A 创建的行 → 200 且 name 改写生效 ──
    [Fact]
    public async Task Forward1_AdminEditForeignRow_Returns200()
    {
        var teamId = SeedTeam("正向1班组", AdminUid);
        SetAuth(await LoginAsync("admin"));

        var resp = await Client.PutAsJsonAsync("/api/worker-teams",
            new { id = teamId, name = "管理员改写", leaderId = (long?)null });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal("管理员改写", QueryTeamName(teamId));
    }

    // ── Forward2：B（r9-6-lead）PUT 自己创建的班组行 → 200 且 name 改写生效（守卫不误伤本人行）──
    [Fact]
    public async Task Forward2_TeamLeadEditOwnRow_Returns200()
    {
        SeedLeadRoleAndUser();
        // B 自建行 created_by='r9-6-lead'
        var teamId = SeedTeam("B自建班组", LeadUid);
        SetAuth(await LoginAsync(LeadUsername));

        var resp = await Client.PutAsJsonAsync("/api/worker-teams",
            new { id = teamId, name = "B自建改写", leaderId = (long?)null });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal("B自建改写", QueryTeamName(teamId));
    }
}
