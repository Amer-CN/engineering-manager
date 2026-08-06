using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Dapper;
using EngineeringManager.Api.Services;
using EngineeringManager.Tests.Common;
using Microsoft.Data.Sqlite;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// M-FIX2 X2(a): G43/G44 表名错配先红实证（企业版 + manager mfix-mgr + 只授权 P1）。
/// 三条路径：sheet POST 批次归属校验 / getDashboardStats / getCostSummary——
/// 修复前误用跨表限定列 → SQLite「no such column」。
/// </summary>
public class MFix2RedTests : ApiTestBase
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
        conn.Execute("INSERT INTO cost_ledger_batches (id, project_id, name, created_by, created_at, last_modified_at) VALUES (10, 1, 'B1', '1', @Now, @Now)", new { Now = now });
        conn.Execute(@"INSERT INTO cost_ledger (id, project_id, batch_id, voucher_no, date, direction, category, amount, summary, created_by, created_at, updated_at)
            VALUES (1, 1, 10, 'V1', '2026-08-06', 'out', '测试', 100, 'F2', '1', @Now, @Now)", new { Now = now });
        // manager 用户（roles 表需 manager 行有 dashboard:read/costLedger:read）
        var salt = "test-salt-1234567890123456";
        var hash = EngineeringManager.Api.Common.HashPassword("admin123", salt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
            new { Id = MgrUid, Username = "mfix-mgr", Password = "admin123", Hash = hash, Salt = salt, Version = 2, DisplayName = "经理", RoleId = "manager", Status = "active", Now = now });
    }

    private async Task LoginAsManager()
    {
        var login = await Client.PostAsJsonAsync("/api/auth/login", new { username = "mfix-mgr", password = "admin123" });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        SetAuth(ExtractToken(await login.Content.ReadAsStringAsync()));
    }

    [Fact]
    public async Task SheetPost_BatchVerification_NoSqlError()
    {
        Seed();
        await LoginAsManager();
        var post = await Client.PostAsJsonAsync("/api/cost-ledger/10/sheet", new
        {
            entries = new[] { new { amount = 100.0, date = "2026-08-06", direction = "out", category = "测试", summary = "X2" } },
        });
        // 修复前：批次归属校验误用 cost_ledger.project_id（FROM cost_ledger_batches）→ no such column
        Assert.NotEqual(HttpStatusCode.InternalServerError, post.StatusCode);
    }

    [Fact]
    public async Task Agent_GetDashboardStats_NoSqlError()
    {
        Seed();
        await LoginAsManager();
        var ctx = new DefaultHttpContext();
        var claims = new List<System.Security.Claims.Claim>
        {
            new(System.Security.Claims.ClaimTypes.NameIdentifier, MgrUid),
            new("uid", MgrUid),
            new(System.Security.Claims.ClaimTypes.Role, "经理"),
        };
        ctx.User = new System.Security.Claims.ClaimsPrincipal(new System.Security.Claims.ClaimsIdentity(claims, "Test"));
        var tools = new AgentToolService(new FakeEmbeddingService());
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var result = await tools.ExecuteToolAsync("getDashboardStats", JsonDocument.Parse("{}").RootElement, ctx, conn);
        // 修复前：settlements/cost_ledger 查询用 invoices.project_id → no such column
        Assert.True(result.Success, "getDashboardStats 不应报 SQL 错误: " + (result.Error ?? ""));
        Assert.DoesNotContain("no such column", (result.Error ?? "").ToLowerInvariant());
    }

    [Fact]
    public async Task Agent_GetCostSummary_NoSqlError()
    {
        Seed();
        await LoginAsManager();
        var ctx = new DefaultHttpContext();
        var claims = new List<System.Security.Claims.Claim>
        {
            new(System.Security.Claims.ClaimTypes.NameIdentifier, MgrUid),
            new("uid", MgrUid),
            new(System.Security.Claims.ClaimTypes.Role, "经理"),
        };
        ctx.User = new System.Security.Claims.ClaimsPrincipal(new System.Security.Claims.ClaimsIdentity(claims, "Test"));
        var tools = new AgentToolService(new FakeEmbeddingService());
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var result = await tools.ExecuteToolAsync("getCostSummary", JsonDocument.Parse("{}").RootElement, ctx, conn);
        // 修复前：FROM cost_ledger 但 filter 用 invoices.project_id → no such column
        Assert.True(result.Success, "getCostSummary 不应报 SQL 错误: " + (result.Error ?? ""));
        Assert.DoesNotContain("no such column", (result.Error ?? "").ToLowerInvariant());
    }
}
