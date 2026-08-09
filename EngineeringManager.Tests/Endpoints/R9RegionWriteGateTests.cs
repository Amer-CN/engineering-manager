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
/// R9-5 Z3：regions 写端点权限码门（D6 修复）——4 条测试。
///
/// 背景：D6 登记「regions 写端点无权限码」。regions 是全局省市区字典（无 project_id /
/// created_by），行级守卫与项目级门均不适用，修复形态 = 权限码门 settings:update
/// （admin 默认持有；worker/accountant 默认无——GetDefaultPermissions 查证，非手动 UPDATE roles）。
///
/// 用户：A = admin（settings:update 持有者）；worker = 自建用户（uid='r9-5-worker'，
/// role_id='worker'，默认集无 settings:update）。
///
/// 4 条：反向×2（worker POST / 删除 → 403 且行数不变）+ 正向×2（admin → 200 且副作用发生）。
/// 修复前：2 条反向必须全红（Actual OK + 副作用已发生）。
/// </summary>
public class R9RegionWriteGateTests : ApiTestBase
{
    private const string WorkerUid = "r9-5-worker";
    private const string WorkerUsername = "r9-5-worker";
    private const string Password = "admin123";
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

    private void SeedWorker()
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var salt = "r9-5-worker-salt-123456";
        var hash = EngineeringManager.Api.Common.HashPassword(Password, salt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
            new
            {
                Id = WorkerUid, Username = WorkerUsername, Password, Hash = hash, Salt = salt,
                Version = 2, DisplayName = "工人", RoleId = "worker", Status = "active", Now
            });
    }

    private long CountRegionRows(string province, string city, string district)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.ExecuteScalar<long>(
            "SELECT COUNT(*) FROM regions WHERE province=@P AND city=@C AND district=@D",
            new { P = province, C = city, D = district });
    }

    private long SeedRegion(string province, string city, string district)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.ExecuteScalar<long>(@"INSERT INTO regions (province, city, district)
            VALUES (@P, @C, @D); SELECT last_insert_rowid();",
            new { P = province, C = city, D = district });
    }

    // ══════════ 反向 ×2：worker（无 settings:update）→ 403 且副作用不发生 ══════════

    [Fact]
    public async Task Reverse1_RegionCreate_Worker_Returns403()
    {
        SeedWorker();
        SetAuth(await LoginAsync(WorkerUsername));

        const string province = "R9-5省", city = "R9-5市", district = "R9-5区";
        var before = CountRegionRows(province, city, district);

        var resp = await Client.PostAsJsonAsync("/api/regions",
            new { province, city, district });
        // 目标态：worker 无 settings:update → 403 且行数不变
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        Assert.Equal(before, CountRegionRows(province, city, district));
    }

    [Fact]
    public async Task Reverse2_RegionDelete_Worker_Returns403()
    {
        SeedWorker();
        SetAuth(await LoginAsync(WorkerUsername));

        // seed 一行唯一三元组，worker 删它
        var regionId = SeedRegion("R9-5删省", "R9-5删市", "R9-5删区");

        var resp = await Client.DeleteAsync($"/api/regions/{regionId}");
        // 目标态：worker 无 settings:update → 403 且该行仍在
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        using (var conn = new SqliteConnection(ConnectionString))
        {
            Assert.Equal(1L, conn.ExecuteScalar<long>("SELECT COUNT(*) FROM regions WHERE id=@Id", new { Id = regionId }));
        }
    }

    // ══════════ 正向 ×2：admin（有 settings:update）→ 200 且副作用发生 ══════════

    [Fact]
    public async Task Forward1_RegionCreate_Admin_Returns200()
    {
        SetAuth(await LoginAsync("admin"));

        const string province = "R9-5正省", city = "R9-5正市", district = "R9-5正区";
        var before = CountRegionRows(province, city, district);

        var resp = await Client.PostAsJsonAsync("/api/regions",
            new { province, city, district });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal(before + 1, CountRegionRows(province, city, district));
    }

    [Fact]
    public async Task Forward2_RegionDelete_Admin_Returns200()
    {
        SetAuth(await LoginAsync("admin"));

        var regionId = SeedRegion("R9-5正删省", "R9-5正删市", "R9-5正删区");

        var resp = await Client.DeleteAsync($"/api/regions/{regionId}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        using (var conn = new SqliteConnection(ConnectionString))
        {
            Assert.Equal(0L, conn.ExecuteScalar<long>("SELECT COUNT(*) FROM regions WHERE id=@Id", new { Id = regionId }));
        }
    }
}
