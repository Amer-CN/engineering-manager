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
/// R8.1(c) + R8.2(c): G20 WHERE OR 优先级击穿修复 / G21 CTE 主体零校验 fail-closed 的正式覆盖。
/// 数据布局（分支隔离）：own(P2,100,created_by=manager) / authorized-other(P1,200) /
/// unauthorized-other(P2,300)；manager scope = AuthorizedProjects。
/// 修复后：注入形态 = WHERE ({filterClause}) AND ({userWhere})——用户 OR 无法击穿；
/// WITH/CTE 一律拒绝（4.5 步，G21）。
/// </summary>
public class AgentSqlInjectionPriorityTests : ApiTestBase
{
    private const string ManagerUid = "r8-mgr";
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

    private static List<double> Amounts(string inner)
    {
        using var doc = JsonDocument.Parse(inner);
        return doc.RootElement.GetProperty("data").EnumerateArray()
            .Select(r => r.GetProperty("amount").GetDouble()).ToList();
    }

    /// <summary>
    /// R8.1(c): OR 击穿两条（G20 PoC-A/B）——修复后 300 不得出现。
    /// PoC-A（id = 0 OR 1 = 1 恒真）→ 可见行 {100,200} 全返回；
    /// PoC-B（amount = 300 OR amount = 300 只匹配 300）→ 空集合法（300 不可见）。
    /// </summary>
    [Theory]
    [InlineData("SELECT id, amount FROM invoices WHERE id = 0 OR 1 = 1")]
    [InlineData("SELECT id, amount FROM invoices WHERE amount = 300 OR amount = 300")]
    public async Task OrLeak_NoLongerPiercesFilter(string sql)
    {
        SeedData();
        var (toolOk, inner) = await Run(sql);
        Assert.True(toolOk, $"查询应成功：{sql}");
        var amounts = Amounts(inner);
        Assert.DoesNotContain(300d, amounts);
    }

    /// <summary>
    /// R8.1(c): NOT 形态——WHERE NOT (id = 1)：排除 own(100)，仍受过滤约束 → {200}。
    /// </summary>
    [Fact]
    public async Task NotForm_FilterStillApplied()
    {
        SeedData();
        var (toolOk, inner) = await Run("SELECT id, amount FROM invoices WHERE NOT (id = 1)");
        Assert.True(toolOk, "NOT 形态应成功");
        var amounts = Amounts(inner);
        Assert.Equal(new[] { 200d }, amounts); // id=1(own) 被用户条件排除、id=3(300) 被过滤
    }

    /// <summary>
    /// R8.1(c): 与三个尾子句组合各一条——WHERE 段终点定位（GROUP/ORDER/LIMIT 最靠前）。
    /// </summary>
    [Theory]
    [InlineData("SELECT id, amount FROM invoices WHERE id = 1 OR id = 2 GROUP BY id")]
    [InlineData("SELECT id, amount FROM invoices WHERE id = 1 OR id = 2 ORDER BY id")]
    [InlineData("SELECT id, amount FROM invoices WHERE id = 1 OR id = 2 LIMIT 5")]
    public async Task TailClauseCombinations_FilterNotPierced(string sql)
    {
        SeedData();
        var (toolOk, inner) = await Run(sql);
        Assert.True(toolOk, $"组合查询应成功：{sql}");
        var amounts = Amounts(inner);
        Assert.DoesNotContain(300d, amounts);
        Assert.Contains(100d, amounts);
        Assert.Contains(200d, amounts);
    }

    /// <summary>
    /// R8.1(c): 正向对照——普通 WHERE（WHERE amount > 50）仍返回 {100,200}。
    /// </summary>
    [Fact]
    public async Task PlainWhere_PositiveControl()
    {
        SeedData();
        var (toolOk, inner) = await Run("SELECT id, amount FROM invoices WHERE amount > 50");
        Assert.True(toolOk, "普通 WHERE 应成功");
        var amounts = Amounts(inner);
        Assert.Equal(new[] { 100d, 200d }, amounts.OrderBy(x => x));
    }

    /// <summary>
    /// R8.2(c): CTE 三形态一律拒绝（白名单名伪装 / ForbiddenTables 主体 / 非白名单名）。
    /// </summary>
    [Theory]
    [InlineData("WITH invoices AS (SELECT s.id AS id, s.amount AS amount, 'r8-mgr' AS created_by, s.project_id AS project_id FROM settlements s) SELECT id, amount FROM invoices")]
    [InlineData("WITH invoices AS (SELECT id AS id, 0 AS amount, 'r8-mgr' AS created_by, '' AS project_id FROM audit_logs) SELECT id, amount FROM invoices")]
    [InlineData("WITH x AS (SELECT id FROM invoices) SELECT id FROM x")]
    public async Task CteForms_AllRejected_FailClosed(string sql)
    {
        SeedData();
        var (toolOk, inner) = await Run(sql);
        using var doc = JsonDocument.Parse(inner);
        var error = doc.RootElement.GetProperty("error").GetString();
        Assert.Contains("WITH/CTE", error);
        Assert.DoesNotContain("300", error);
    }

    /// <summary>
    /// R8.2(c): 顶层正向对照——普通 SELECT 不受 CTE 拒绝影响。
    /// </summary>
    [Fact]
    public async Task TopLevelSelect_PositiveControl_AfterCteRejection()
    {
        SeedData();
        var (toolOk, inner) = await Run("SELECT id, amount FROM invoices");
        Assert.True(toolOk, "普通 SELECT 应成功");
        var amounts = Amounts(inner);
        Assert.Equal(new[] { 100d, 200d }, amounts.OrderBy(x => x));
    }
}
