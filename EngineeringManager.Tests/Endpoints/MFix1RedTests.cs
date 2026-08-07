using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Dapper;
using EngineeringManager.Tests.Common;
using Microsoft.Data.Sqlite;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// M-FIX1 F1: 退化 EXISTS 恒真先红实证（master 企业版 + 非 admin）。
/// 数据布局：manager mfix-mgr 仅授权 P1；income_contracts 三行——
///   id1 项目2 created_by=mfix-mgr（本人未授权）→ 可见
///   id2 项目1 created_by=other（他人已授权）→ 可见
///   id3 项目2 created_by=other（他人未授权）→ 绝不该出现（恒真泄漏判据）
/// </summary>
public class MFix1RedTests : ApiTestBase
{
    private const string MgrUid = "mfix-mgr";

    private static string ExtractToken(string json)
    {
        var marker = "\"token\":\"";
        var i = json.IndexOf(marker, StringComparison.Ordinal);
        if (i < 0) throw new Exception("token not found: " + json);
        var start = i + marker.Length;
        var end = json.IndexOf('\"', start);
        return json.Substring(start, end - start);
    }

    private void SetAuth(string token) =>
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private void Seed()
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
        conn.Execute("INSERT INTO projects (id, name, created_by, created_at) VALUES (1, 'P1', '1', @Now)", new { Now = now });
        conn.Execute("INSERT INTO projects (id, name, created_by, created_at) VALUES (2, 'P2', '1', @Now)", new { Now = now });
        conn.Execute("INSERT INTO project_authorizations (project_id, user_id) VALUES (1, @Mgr)", new { Mgr = MgrUid });
        conn.Execute(@"INSERT INTO income_contracts (id, project_id, name, amount, status, created_by, created_at, updated_at)
            VALUES (1, 2, 'own-P2', 100, 'draft', @Mgr, @Now, @Now)", new { Mgr = MgrUid, Now = now });
        conn.Execute(@"INSERT INTO income_contracts (id, project_id, name, amount, status, created_by, created_at, updated_at)
            VALUES (2, 1, 'auth-other-P1', 200, 'draft', 'other', @Now, @Now)", new { Now = now });
        conn.Execute(@"INSERT INTO income_contracts (id, project_id, name, amount, status, created_by, created_at, updated_at)
            VALUES (3, 2, 'unauth-other-P2', 300, 'draft', 'other', @Now, @Now)", new { Now = now });
    }

    private async Task LoginAsManager()
    {
        var login = await Client.PostAsJsonAsync("/api/auth/login", new { username = "mfix-mgr", password = "admin123" });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        SetAuth(ExtractToken(await login.Content.ReadAsStringAsync()));
    }

    private void CreateManagerUser()
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var salt = "test-salt-1234567890123456";
        var hash = EngineeringManager.Api.Common.HashPassword("admin123", salt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
            new { Id = MgrUid, Username = "mfix-mgr", Password = "admin123", Hash = hash, Salt = salt, Version = 2, DisplayName = "经理", RoleId = "manager", Status = "active", Now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") });
    }

    [Fact]
    public async Task F1b_ContractsIncomeGet_LeaksUnauthorizedRow()
    {
        CreateManagerUser();
        Seed();
        await LoginAsManager();

        var resp = await Client.GetAsync("/api/contracts/income");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        var rows = json.GetProperty("data").EnumerateArray().ToList();
        var names = rows.Select(r => r.GetProperty("name").GetString()).ToList();
        // 恒真泄漏判据：id3 (unauth-other-P2) 不得出现
        Assert.DoesNotContain("unauth-other-P2", names);
        // 可见数据：own-P2 + auth-other-P1
        Assert.Contains("own-P2", names);
        Assert.Contains("auth-other-P1", names);
    }

    [Fact]
    public async Task F1c_ContractsStats_IncomeCountLeaks()
    {
        CreateManagerUser();
        Seed();
        await LoginAsManager();

        var resp = await Client.GetAsync("/api/contracts/stats");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        var incomeCount = json.GetProperty("data").GetProperty("incomeCount").GetInt64();
        // 恒真泄漏判据：count 应为 2（仅 own + auth），非 3
        Assert.Equal(2, incomeCount);
    }

    [Fact]
    public async Task F1d_ContractsIncomePut_Manager_AuthorizedOk_UnauthorizedRejected()
    {
        // M-FIX3 Y5：Y3 基座 JSON 化后 manager 的 contracts:update=True（GetDefaultPermissions 含），
        // 可走企业版非 admin 真路径。改 P1（已授权）合同成功；P2（未授权）合同不成功。
        CreateManagerUser();
        Seed();
        await LoginAsManager();

        // 正向：P1 合同（id2，授权项目）可改
        var okPut = await Client.PutAsJsonAsync("/api/contracts/income",
            new { id = 2L, name = "P1-改后", amount = 250, status = "draft", remarks = "ok" });
        Assert.Equal(HttpStatusCode.OK, okPut.StatusCode);
        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Open();
            var name = conn.ExecuteScalar<string>("SELECT name FROM income_contracts WHERE id=2");
            Assert.Equal("P1-改后", name); // 改到了
        }

        // 反向：P2 合同（id3，未授权）不可改
        var badPut = await Client.PutAsJsonAsync("/api/contracts/income",
            new { id = 3L, name = "P2-越权改", amount = 350, status = "draft", remarks = "bad" });
        Assert.Equal(HttpStatusCode.Forbidden, badPut.StatusCode); // 越权被拒
    }
}
