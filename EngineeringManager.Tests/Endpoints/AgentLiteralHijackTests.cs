using System.Security.Claims;
using System.Text.Json;
using Dapper;
using EngineeringManager.Api.Services;
using EngineeringManager.Tests.Common;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// R7.2(c): 字符串字面量劫持注入点（G12）正式测试。
/// 修复前：SELECT 'WHERE' AS w, id, amount FROM invoices 的过滤片段被整段插进
/// 字面量（w 列可见），SQL 无任何过滤 → amount=300 全表泄漏（PoC-3 实证）。
/// 修复后：FindTopLevelKeyword/EnsureLimit 在字面量掩码副本上定位——字面量内的
/// WHERE/LIMIT/GROUP/ORDER 不再劫持注入点，过滤正常注入顶层 WHERE。
/// </summary>
public class AgentLiteralHijackTests : ApiTestBase
{
    private const string ManagerUid = "r7-mgr";
    private const string AdminUid = "1";

    private static HttpContext CreateManagerContext()
    {
        var ctx = new DefaultHttpContext();
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, ManagerUid),
            new("uid", ManagerUid),
            new(ClaimTypes.Role, "经理"),
        };
        ctx.User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"));
        return ctx;
    }

    private void SeedData()
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        using var tx = conn.BeginTransaction();
        var now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
        conn.Execute("INSERT INTO projects (id, name, created_by, created_at) VALUES (1, 'P1', @Admin, @Now)", new { Admin = AdminUid, Now = now }, tx);
        conn.Execute("INSERT INTO projects (id, name, created_by, created_at) VALUES (2, 'P2', @Admin, @Now)", new { Admin = AdminUid, Now = now }, tx);
        conn.Execute("INSERT INTO project_authorizations (project_id, user_id) VALUES (1, @Mgr)", new { Mgr = ManagerUid }, tx);
        conn.Execute(@"INSERT INTO invoices (id, project_id, name, amount, status, created_by, created_at, updated_at)
            VALUES (1, 2, 'own', 100, 'pending', @Mgr, @Now, @Now)", new { Mgr = ManagerUid, Now = now }, tx);
        conn.Execute(@"INSERT INTO invoices (id, project_id, name, amount, status, created_by, created_at, updated_at)
            VALUES (2, 1, 'authorized-other', 200, 'pending', @Admin, @Now, @Now)", new { Admin = AdminUid, Now = now }, tx);
        conn.Execute(@"INSERT INTO invoices (id, project_id, name, amount, status, created_by, created_at, updated_at)
            VALUES (3, 2, 'unauthorized-other', 300, 'pending', @Admin, @Now, @Now)", new { Admin = AdminUid, Now = now }, tx);
        tx.Commit();
    }

    private async Task<(bool toolOk, string inner)> Run(string sql)
    {
        var args = JsonDocument.Parse(JsonSerializer.Serialize(new { sql })).RootElement;
        var tools = new AgentToolService(new FakeEmbeddingService());
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var result = await tools.ExecuteToolAsync("runSafeQuery", args, CreateManagerContext(), conn);
        var inner = result.Success ? JsonSerializer.Serialize(result.Result) : $"{{error: {result.Error}}}";
        return (result.Success, inner);
    }

    /// <summary>
    /// 四个 token（WHERE / LIMIT / GROUP / ORDER）各一条字面量投影查询——
    /// 修复后过滤正常注入、字面量原样返回、可见数据 {100,200} 且 300 不出现。
    /// </summary>
    [Theory]
    [InlineData("SELECT 'WHERE' AS w, id, amount FROM invoices")]
    [InlineData("SELECT 'LIMIT 1' AS w, id, amount FROM invoices")]
    [InlineData("SELECT 'GROUP' AS w, id, amount FROM invoices")]
    [InlineData("SELECT 'ORDER' AS w, id, amount FROM invoices")]
    public async Task LiteralToken_NoHijack_ReturnsVisibleOnly(string sql)
    {
        SeedData();
        var (toolOk, inner) = await Run(sql);

        Assert.True(toolOk, $"字面量查询应成功：{sql}");
        Assert.Contains("\"success\":true", inner);
        using var doc = JsonDocument.Parse(inner);
        var rows = doc.RootElement.GetProperty("data").EnumerateArray().ToList();
        var amounts = rows.Select(r => r.GetProperty("amount").GetDouble()).ToList();
        // 反向断言：300 不得出现（修复前泄漏全表）
        Assert.DoesNotContain(300d, amounts);
        // 正向断言：可见数据 {100,200} 必须返回（修复前过滤片段被劫持进字面量）
        Assert.Contains(100d, amounts);
        Assert.Contains(200d, amounts);
        // w 列 = 字面量原文（不得夹带过滤片段）
        var w = rows[0].GetProperty("w").GetString();
        Assert.DoesNotContain("created_by", w);
    }

    /// <summary>
    /// 正向对照：无字面量的正常查询照常执行。
    /// </summary>
    [Fact]
    public async Task PlainSelect_PositiveControl()
    {
        SeedData();
        var (toolOk, inner) = await Run("SELECT id, amount FROM invoices");

        Assert.True(toolOk, "普通查询应成功");
        Assert.Contains("\"success\":true", inner);
        using var doc = JsonDocument.Parse(inner);
        var amounts = doc.RootElement.GetProperty("data").EnumerateArray()
            .Select(r => r.GetProperty("amount").GetDouble()).ToList();
        Assert.Equal(2, amounts.Count);
        Assert.DoesNotContain(300d, amounts);
    }
}
