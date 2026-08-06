using System.Security.Claims;
using System.Text.Json;
using Dapper;
using EngineeringManager.Api.Services;
using EngineeringManager.Tests.Common;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;
using Xunit;
using Xunit.Abstractions;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// R8.14.3 G30 实测：尾子句定位器（FindTopLevelKeyword）是否被括号内/字面量/注释内关键字骗过。
/// 三条 PoC 用 manager + invoices 三行（own 100 / authorized 200 / unauthorized 300）。
/// </summary>
public class R8G30PoCTests : ApiTestBase
{
    private readonly ITestOutputHelper _output;
    public R8G30PoCTests(ITestOutputHelper output) => _output = output;

    private async Task<(string inner, string audit)> Run(string sql)
    {
        var ctx = new DefaultHttpContext();
        var claims = new List<Claim> { new(ClaimTypes.NameIdentifier, "r8-mgr"), new("uid", "r8-mgr"), new(ClaimTypes.Role, "经理") };
        ctx.User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"));
        var args = JsonDocument.Parse(JsonSerializer.Serialize(new { sql })).RootElement;
        var tools = new AgentToolService(new FakeEmbeddingService());
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        using var tx = conn.BeginTransaction();
        var now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
        conn.Execute("INSERT INTO projects (id, name, created_by, created_at) VALUES (1, 'P1', '1', @Now)", new { Now = now }, tx);
        conn.Execute("INSERT INTO projects (id, name, created_by, created_at) VALUES (2, 'P2', '1', @Now)", new { Now = now }, tx);
        conn.Execute("INSERT INTO project_authorizations (project_id, user_id) VALUES (1, 'r8-mgr')", tx);
        conn.Execute(@"INSERT INTO invoices (id, project_id, name, amount, status, created_by, created_at, updated_at)
            VALUES (1, 2, 'own', 100, 'pending', 'r8-mgr', @Now, @Now)", new { Now = now }, tx);
        conn.Execute(@"INSERT INTO invoices (id, project_id, name, amount, status, created_by, created_at, updated_at)
            VALUES (2, 1, 'auth', 200, 'pending', '1', @Now, @Now)", new { Now = now }, tx);
        conn.Execute(@"INSERT INTO invoices (id, project_id, name, amount, status, created_by, created_at, updated_at)
            VALUES (3, 2, 'unauth', 300, 'pending', '1', @Now, @Now)", new { Now = now }, tx);
        tx.Commit();
        var result = await tools.ExecuteToolAsync("runSafeQuery", args, ctx, conn);
        var inner = result.Success ? JsonSerializer.Serialize(result.Result) : $"{{error: {result.Error}}}";
        var audit = conn.ExecuteScalar<string>("SELECT details FROM audit_logs WHERE action='safe_query' ORDER BY rowid DESC LIMIT 1") ?? "(none)";
        return (inner, audit);
    }

    private static bool Has300(string inner)
    {
        using var doc = JsonDocument.Parse(inner);
        if (!doc.RootElement.TryGetProperty("data", out var data)) return false;
        return data.EnumerateArray().Any(r => r.GetProperty("amount").GetDouble() == 300);
    }

    [Fact]
    public async Task PoC1_OrderByInsideSubqueryParens()
    {
        var (inner, audit) = await Run("SELECT id, amount FROM invoices WHERE id IN (SELECT 1 ORDER BY 1) OR 1 = 1");
        _output.WriteLine("=== PoC-1 inner ===");
        _output.WriteLine(inner);
        _output.WriteLine("=== PoC-1 audit ===");
        _output.WriteLine(audit);
        Assert.False(Has300(inner), "PoC-1 泄漏 300（G30 成立）");
    }

    [Fact]
    public async Task PoC2_OrderByInsideStringLiteral()
    {
        var (inner, audit) = await Run("SELECT id, amount FROM invoices WHERE name LIKE '%ORDER BY%' OR 1 = 1");
        _output.WriteLine("=== PoC-2 inner ===");
        _output.WriteLine(inner);
        _output.WriteLine("=== PoC-2 audit ===");
        _output.WriteLine(audit);
        Assert.False(Has300(inner), "PoC-2 泄漏 300（G30 成立）");
    }

    [Fact]
    public async Task PoC3_GroupByInsideComment()
    {
        var (inner, audit) = await Run("SELECT id, amount FROM invoices WHERE id = 1 /* GROUP BY */ OR 1 = 1");
        _output.WriteLine("=== PoC-3 inner ===");
        _output.WriteLine(inner);
        _output.WriteLine("=== PoC-3 audit ===");
        _output.WriteLine(audit);
        Assert.False(Has300(inner), "PoC-3 泄漏 300（G30 成立）");
    }
}
