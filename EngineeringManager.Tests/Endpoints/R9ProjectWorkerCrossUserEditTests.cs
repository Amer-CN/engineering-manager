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
/// R9-22 Z3：批次 4 —— B36 PUT /api/project-workers 方案丙翻转（B 桶形态 403→200），6 条测试。
///
/// 现状：WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)——授权跨人 403（B 桶形态）。
/// 目标：预读 → Classify 单点 → 授权跨人可改 + ViaAuthz 同事务 audit。
/// 权限码 members:update；body 走 ProjectWorkerDto；收尾 affected>0?Ok:Forbid → 不存在 403（Pin4 是 403）。
/// daily_wage 沿用工资域惯例「分」，原样直传不换算。
/// 行为人：自定义角色 r9-22-b4（同批次 4 共用）。项目 9123，created_by='1'。
/// project_workers 列：001 worker_id/project_id/team_id/daily_wage/worker_type/entry_date/status
/// + 009 created_by + 024 version/last_modified_at。种子 worker_id 用 999001。
/// ★ 同文件有已对齐的 B37（PUT /api/invoices/{id}/status，40 行起）——破坏自证必须唯一定位 B36。
/// </summary>
public class R9ProjectWorkerCrossUserEditTests : ApiTestBase
{
    private const string AdminUid = "1";
    private const string B4Uid = "r9-22-b4";
    private const string B4RoleId = "r9-22-b4";
    private const string Password = "admin123";
    private const long TestProjectId = 9123;
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

    private void SeedB4UserAndProject(bool withAuthz)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        conn.Execute(@"INSERT OR IGNORE INTO roles (id, name, permissions, is_system, created_at)
            VALUES (@Id, @Name, @Perms, 0, @Now)",
            new { Id = B4RoleId, Name = B4RoleId, Perms = "[\"drawings:update\",\"inventory:update\",\"members:update\",\"drawings:read\",\"inventory:read\"]", Now });
        Assert.Equal(1, conn.ExecuteScalar<int>("SELECT COUNT(*) FROM roles WHERE id=@Id", new { Id = B4RoleId }));
        var salt = "r9-22-b4-salt-123456";
        var hash = EngineeringManager.Api.Common.HashPassword(Password, salt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
            new { Id = B4Uid, Username = B4Uid, Password, Hash = hash, Salt = salt,
                  Version = 2, DisplayName = "批次4经办", RoleId = B4RoleId, Status = "active", Now });
        conn.Execute("INSERT OR IGNORE INTO projects (id, name, created_by, created_at) VALUES (@P, 'R9-22工人项目', @By, @Now)",
            new { P = TestProjectId, By = AdminUid, Now });
        if (withAuthz)
            conn.Execute("INSERT OR IGNORE INTO project_authorizations (project_id, user_id, granted_by, granted_at) VALUES (@P, @U, @By, @Now)",
                new { P = TestProjectId, U = B4Uid, By = AdminUid, Now });
    }

    private void SeedB4AsProjectOwner()
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        conn.Execute(@"INSERT OR IGNORE INTO roles (id, name, permissions, is_system, created_at)
            VALUES (@Id, @Name, @Perms, 0, @Now)",
            new { Id = B4RoleId, Name = B4RoleId, Perms = "[\"drawings:update\",\"inventory:update\",\"members:update\",\"drawings:read\",\"inventory:read\"]", Now });
        var salt = "r9-22-b4-salt-123456";
        var hash = EngineeringManager.Api.Common.HashPassword(Password, salt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
            new { Id = B4Uid, Username = B4Uid, Password, Hash = hash, Salt = salt,
                  Version = 2, DisplayName = "批次4经办", RoleId = B4RoleId, Status = "active", Now });
        conn.Execute("INSERT OR IGNORE INTO projects (id, name, created_by, created_at) VALUES (@P, 'R9-22工人B建项目', @By, @Now)",
            new { P = TestProjectId, By = B4Uid, Now });
    }

    private long SeedProjectWorker(string createdBy, long dailyWageFen = 30000)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.ExecuteScalar<long>(@"INSERT INTO project_workers (worker_id,project_id,team_id,daily_wage,worker_type,entry_date,status,created_by,created_at,updated_at,version,last_modified_at)
            VALUES (999001,@P,NULL,@D,'瓦工','2026-01-01','active',@By,@Now,@Now,1,@Now); SELECT last_insert_rowid();",
            new { P = TestProjectId, D = dailyWageFen, By = createdBy, Now });
    }

    private long CountAudit(long rowId, string userId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.ExecuteScalar<long>(
            "SELECT COUNT(*) FROM audit_logs WHERE action='cross_user_edit' AND resource='project_workers' AND resource_id=@Id AND user_id=@U",
            new { Id = rowId.ToString(), U = userId });
    }

    private long GetDailyWage(long rowId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.ExecuteScalar<long>("SELECT daily_wage FROM project_workers WHERE id=@Id", new { Id = rowId });
    }

    private async Task<HttpResponseMessage> PutWorkerAsync(long rowId, long dailyWageFen) =>
        await Client.PutAsJsonAsync("/api/project-workers", new
        {
            id = rowId, projectId = TestProjectId, dailyWage = dailyWageFen,
            workerType = "瓦工", entryDate = "2026-01-01", status = "active",
        });

    [Fact]
    public async Task Red1_AuthorizedCrossUserEdit_Returns200_WithAudit()
    {
        SeedB4UserAndProject(withAuthz: true);
        var rowId = SeedProjectWorker(AdminUid, 30000);
        SetAuth(await LoginAsync(B4Uid));

        var resp = await PutWorkerAsync(rowId, 35000);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal(35000L, GetDailyWage(rowId));
        Assert.Equal(1L, CountAudit(rowId, B4Uid));
    }

    [Fact]
    public async Task Pin1_UnauthorizedEdit_StillReturns403()
    {
        SeedB4UserAndProject(withAuthz: false);
        var rowId = SeedProjectWorker(AdminUid, 30000);
        SetAuth(await LoginAsync(B4Uid));

        var resp = await PutWorkerAsync(rowId, 35000);
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        Assert.Equal(30000L, GetDailyWage(rowId));
        Assert.Equal(0L, CountAudit(rowId, B4Uid));
    }

    [Fact]
    public async Task Pin2_OwnerEdit_Returns200_NoAudit()
    {
        SeedB4UserAndProject(withAuthz: false);
        var rowId = SeedProjectWorker(B4Uid, 30000);
        SetAuth(await LoginAsync(B4Uid));

        var resp = await PutWorkerAsync(rowId, 35000);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal(35000L, GetDailyWage(rowId));
        Assert.Equal(0L, CountAudit(rowId, B4Uid));
    }

    [Fact]
    public async Task Pin3_AdminEdit_Returns200()
    {
        var rowId = SeedProjectWorker(AdminUid, 30000);
        SetAuth(await LoginAsync("admin"));

        var resp = await PutWorkerAsync(rowId, 35000);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal(35000L, GetDailyWage(rowId));
    }

    [Fact]
    public async Task Pin4_NonexistentRow_Returns403()
    {
        SeedB4UserAndProject(withAuthz: true);
        SetAuth(await LoginAsync(B4Uid));

        var resp = await Client.PutAsJsonAsync("/api/project-workers", new
        {
            id = 999999, projectId = TestProjectId, dailyWage = 35000L,
            workerType = "瓦工", entryDate = "2026-01-01", status = "active",
        });
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Pin5_ProjectOwnerOtherRow_Returns403()
    {
        SeedB4AsProjectOwner();
        var rowId = SeedProjectWorker(AdminUid, 30000);
        SetAuth(await LoginAsync(B4Uid));

        var resp = await PutWorkerAsync(rowId, 35000);
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        Assert.Equal(30000L, GetDailyWage(rowId));
        Assert.Equal(0L, CountAudit(rowId, B4Uid));
    }
}
