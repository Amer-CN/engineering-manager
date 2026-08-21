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
/// R9-22 Z3：批次 4 —— B12 PUT /api/drawings 方案丙翻转（B 桶形态 403→200），6 条测试。
///
/// 现状：WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)——授权跨人 403（B 桶形态）。
/// 目标：预读 → Classify 单点 → 授权跨人可改 + ViaAuthz 同事务 audit。
/// 权限码 drawings:update；body 走 StreamReader；收尾 WriteResult → 不存在 404（Pin4 是 404）。
/// 行为人：自定义角色 r9-22-b4（name==id，permissions 含 drawings/inventory/members 三码，
/// 一个用户复用批次 4 三端点；仅 INSERT 新 roles 行，禁改内置角色）。
/// 项目 9121，created_by='1'；drawings 列：001 project_id/name/created_at/updated_at
/// + 009 created_by + 024 version/last_modified_at + 031 category 等。
/// </summary>
public class R9DrawingCrossUserEditTests : ApiTestBase
{
    private const string AdminUid = "1";
    private const string B4Uid = "r9-22-b4";
    private const string B4RoleId = "r9-22-b4";
    private const string Password = "admin123";
    private const long TestProjectId = 9121;
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
        conn.Execute("INSERT OR IGNORE INTO projects (id, name, created_by, created_at) VALUES (@P, 'R9-22图纸项目', @By, @Now)",
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
        conn.Execute("INSERT OR IGNORE INTO projects (id, name, created_by, created_at) VALUES (@P, 'R9-22图纸B建项目', @By, @Now)",
            new { P = TestProjectId, By = B4Uid, Now });
    }

    private long SeedDrawing(string name, string createdBy)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.ExecuteScalar<long>(@"INSERT INTO drawings (project_id,name,category,remarks,created_by,created_at,updated_at,version,last_modified_at)
            VALUES (@P,@N,'建筑','备注',@By,@Now,@Now,1,@Now); SELECT last_insert_rowid();",
            new { P = TestProjectId, N = name, By = createdBy, Now });
    }

    private long CountAudit(long rowId, string userId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.ExecuteScalar<long>(
            "SELECT COUNT(*) FROM audit_logs WHERE action='cross_user_edit' AND resource='drawings' AND resource_id=@Id AND user_id=@U",
            new { Id = rowId.ToString(), U = userId });
    }

    private string? GetName(long rowId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.ExecuteScalar<string?>("SELECT name FROM drawings WHERE id=@Id", new { Id = rowId });
    }

    [Fact]
    public async Task Red1_AuthorizedCrossUserEdit_Returns200_WithAudit()
    {
        SeedB4UserAndProject(withAuthz: true);
        var rowId = SeedDrawing("旧图纸", AdminUid);
        SetAuth(await LoginAsync(B4Uid));

        var resp = await Client.PutAsJsonAsync("/api/drawings", new { id = rowId, name = "新图纸", category = "结构", remarks = "改", position = "A-1" });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal("新图纸", GetName(rowId));
        Assert.Equal(1L, CountAudit(rowId, B4Uid));
    }

    [Fact]
    public async Task Pin1_UnauthorizedEdit_StillReturns403()
    {
        SeedB4UserAndProject(withAuthz: false);
        var rowId = SeedDrawing("旧图纸", AdminUid);
        SetAuth(await LoginAsync(B4Uid));

        var resp = await Client.PutAsJsonAsync("/api/drawings", new { id = rowId, name = "新图纸" });
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        Assert.Equal("旧图纸", GetName(rowId));
        Assert.Equal(0L, CountAudit(rowId, B4Uid));
    }

    [Fact]
    public async Task Pin2_OwnerEdit_Returns200_NoAudit()
    {
        SeedB4UserAndProject(withAuthz: false);
        var rowId = SeedDrawing("旧图纸", B4Uid);
        SetAuth(await LoginAsync(B4Uid));

        var resp = await Client.PutAsJsonAsync("/api/drawings", new { id = rowId, name = "自改图纸" });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal("自改图纸", GetName(rowId));
        Assert.Equal(0L, CountAudit(rowId, B4Uid));
    }

    [Fact]
    public async Task Pin3_AdminEdit_Returns200()
    {
        var rowId = SeedDrawing("旧图纸", AdminUid);
        SetAuth(await LoginAsync("admin"));

        var resp = await Client.PutAsJsonAsync("/api/drawings", new { id = rowId, name = "管理员改" });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal("管理员改", GetName(rowId));
    }

    [Fact]
    public async Task Pin4_NonexistentRow_Returns404()
    {
        SeedB4UserAndProject(withAuthz: true);
        SetAuth(await LoginAsync(B4Uid));

        var resp = await Client.PutAsJsonAsync("/api/drawings", new { id = 999999, name = "不存在" });
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    [Fact]
    public async Task Pin5_ProjectOwnerOtherRow_Returns403()
    {
        SeedB4AsProjectOwner();
        var rowId = SeedDrawing("旧图纸", AdminUid);
        SetAuth(await LoginAsync(B4Uid));

        var resp = await Client.PutAsJsonAsync("/api/drawings", new { id = rowId, name = "越权改" });
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        Assert.Equal("旧图纸", GetName(rowId));
        Assert.Equal(0L, CountAudit(rowId, B4Uid));
    }
}
