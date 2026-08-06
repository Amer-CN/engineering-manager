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

    /// <summary>
    /// R8.15.1(b): 三态解析——任何路径都不许把「拿不到数据」翻译成「没泄漏」。
    /// 有数据 / 被拒绝 / 解析失败 显式区分，调用方必须按期望形态断言。
    /// </summary>
    private enum Outcome { HasData, Rejected, ParseFailure }

    private static Outcome Classify(string inner)
    {
        using var doc = JsonDocument.Parse(inner);
        if (doc.RootElement.TryGetProperty("data", out var data))
            return Outcome.HasData;
        if (doc.RootElement.TryGetProperty("error", out _))
            return Outcome.Rejected;
        return Outcome.ParseFailure;
    }

    /// <summary>
    /// R8.15.2 修复后：直接调 ValidateAndRewrite——不抛异常、返回固定拒绝文案
    /// （G32 实证：修复前此处抛 NRE，堆栈 5 帧见 R8.15 报告）。
    /// </summary>
    [Fact]
    public void R8152_DirectValidate_NoTableSubquery_RejectedNoThrow()
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
        conn.Execute("INSERT INTO projects (id, name, created_by, created_at) VALUES (1, 'P1', '1', @Now)", new { Now = now });
        conn.Execute("INSERT INTO invoices (id, project_id, name, amount, status, created_by, created_at, updated_at) VALUES (1, 1, 'x', 1, 'pending', '1', @Now, @Now)", new { Now = now });
        var r = SafeQueryValidator.ValidateAndRewrite(
            "SELECT id, amount FROM invoices WHERE id IN (SELECT 1 ORDER BY 1) OR 1 = 1",
            "u1", EngineeringManager.Api.Security.CurrentUser.DataScope.AuthorizedProjects);
        Assert.False(r.IsValid, "无表子查询必须被拒绝（G32 fail-closed）");
        Assert.Contains("无表子查询暂不支持", r.Error);
        Assert.DoesNotContain("Object reference", r.Error);
        Assert.DoesNotContain("NullReference", r.Error);
    }

    [Fact]
    public async Task PoC1_OrderByInsideSubqueryParens()
    {
        var (inner, audit) = await Run("SELECT id, amount FROM invoices WHERE id IN (SELECT 1 ORDER BY 1) OR 1 = 1");
        _output.WriteLine("=== PoC-1 inner ===");
        _output.WriteLine(inner);
        _output.WriteLine("=== PoC-1 audit ===");
        _output.WriteLine(audit);
        // R8.15.1(d): 设计性拒绝断言（不再是「没泄漏」）——当前必红（NRE 文案）
        var outcome = Classify(inner);
        Assert.Equal(Outcome.Rejected, outcome);
        using var doc = JsonDocument.Parse(inner);
        var error = doc.RootElement.GetProperty("error").GetString();
        Assert.DoesNotContain("Object reference", error);
        Assert.DoesNotContain("Exception", error);
        Assert.DoesNotContain("NullReference", error);
        Assert.Contains("无表子查询暂不支持", error); // R8.15.2 固定拒绝文案
    }

    [Fact]
    public async Task PoC2_OrderByInsideStringLiteral()
    {
        var (inner, audit) = await Run("SELECT id, amount FROM invoices WHERE name LIKE '%ORDER BY%' OR 1 = 1");
        _output.WriteLine("=== PoC-2 inner ===");
        _output.WriteLine(inner);
        _output.WriteLine("=== PoC-2 audit ===");
        _output.WriteLine(audit);
        // R8.15.1(c): 正向对照——不得只断言「坏东西不在」
        Assert.Equal(Outcome.HasData, Classify(inner));
        using var doc = JsonDocument.Parse(inner);
        var rows = doc.RootElement.GetProperty("data").EnumerateArray().ToList();
        Assert.Equal(2, rows.Count); // own(100) + authorized(200)
        var ids = rows.Select(r => r.GetProperty("id").GetInt64()).ToList();
        Assert.Contains(1L, ids);
        Assert.Contains(2L, ids);
        Assert.DoesNotContain(rows, r => r.GetProperty("amount").GetDouble() == 300);
    }

    [Fact]
    public async Task PoC3_GroupByInsideComment()
    {
        var (inner, audit) = await Run("SELECT id, amount FROM invoices WHERE id = 1 /* GROUP BY */ OR 1 = 1");
        _output.WriteLine("=== PoC-3 inner ===");
        _output.WriteLine(inner);
        _output.WriteLine("=== PoC-3 audit ===");
        _output.WriteLine(audit);
        // R8.15.1(c): 正向对照
        Assert.Equal(Outcome.HasData, Classify(inner));
        using var doc = JsonDocument.Parse(inner);
        var rows = doc.RootElement.GetProperty("data").EnumerateArray().ToList();
        Assert.Equal(2, rows.Count);
        var ids = rows.Select(r => r.GetProperty("id").GetInt64()).ToList();
        Assert.Contains(1L, ids);
        Assert.Contains(2L, ids);
        Assert.DoesNotContain(rows, r => r.GetProperty("amount").GetDouble() == 300);
    }

    /// <summary>R8.15.2(d): 三条零表子查询探针——设计性拒绝（文案匹配 + 无 NRE 字样）</summary>
    [Theory]
    [InlineData("SELECT id, amount FROM invoices WHERE id IN (SELECT 1 ORDER BY 1) OR 1 = 1")]
    [InlineData("SELECT id, amount FROM invoices WHERE id = (SELECT 1 LIMIT 1) OR 1 = 1")]
    [InlineData("SELECT id, amount FROM invoices WHERE EXISTS (SELECT 1) OR 1 = 1")]
    public async Task ZeroTableSubquery_Rejected_WithFixedWording(string sql)
    {
        var (inner, audit) = await Run(sql);
        _output.WriteLine("=== ZERO-TABLE inner ===");
        _output.WriteLine(inner);
        _output.WriteLine("=== ZERO-TABLE audit ===");
        _output.WriteLine(audit);
        Assert.Equal(Outcome.Rejected, Classify(inner));
        using var doc = JsonDocument.Parse(inner);
        var error = doc.RootElement.GetProperty("error").GetString();
        Assert.Contains("无表子查询暂不支持", error);
        Assert.DoesNotContain("Object reference", error);
        Assert.DoesNotContain("NullReference", error);
        Assert.DoesNotContain("Exception", error);
    }
}
