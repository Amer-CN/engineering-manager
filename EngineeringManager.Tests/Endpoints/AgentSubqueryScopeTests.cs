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
/// R7.1(c): 子查询作用域穿透防护（G11）正式测试。
/// 数据布局（分支隔离）：own(P2,100,created_by=manager) / authorized-other(P1,200) /
/// unauthorized-other(P2,300)；manager scope = AuthorizedProjects。
/// 修复后：深度>0 的 occurrence（Derived / IN / EXISTS / 标量子查询内的表）一律
/// fail-closed 拒绝（明确错误文案 + 审计 warning）；顶层查询维持逐实例注入。
/// 每个形态都有【正向对照】：顶层等价查询必须返回可见数据 {100,200} 且 300 不出现。
/// </summary>
public class AgentSubqueryScopeTests : ApiTestBase
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

    private async Task<(bool toolOk, string inner, string audit)> Run(string sql)
    {
        var args = JsonDocument.Parse(JsonSerializer.Serialize(new { sql })).RootElement;
        var tools = new AgentToolService(new FakeEmbeddingService());
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var result = await tools.ExecuteToolAsync("runSafeQuery", args, CreateManagerContext(), conn);
        var inner = result.Success ? JsonSerializer.Serialize(result.Result) : $"{{error: {result.Error}}}";
        var audit = conn.ExecuteScalar<string>(
            "SELECT details FROM audit_logs WHERE action='safe_query' ORDER BY rowid DESC LIMIT 1") ?? "(no audit row)";
        return (result.Success, inner, audit);
    }

    private static List<double> Amounts(string inner)
    {
        using var doc = JsonDocument.Parse(inner);
        return doc.RootElement.GetProperty("data").EnumerateArray()
            .Select(r => r.GetProperty("amount").GetDouble()).ToList();
    }

    /// <summary>
    /// 四种子查询形态（Derived / IN / EXISTS / 投影标量子查询）——修复后一律拒绝，
    /// 错误文案明确 + 审计 warning 留痕 + 无任何数据泄漏（300 不出现）。
    /// </summary>
    [Theory]
    [InlineData("SELECT a.id, b.amount FROM invoices a JOIN (SELECT id, amount FROM invoices) b ON a.id = b.id")]           // Derived
    [InlineData("SELECT i.amount FROM invoices i WHERE i.id IN (SELECT id FROM settlements)")]                                // IN 子查询
    [InlineData("SELECT i.amount FROM invoices i WHERE EXISTS (SELECT 1 FROM settlements s WHERE s.id = i.id)")]              // EXISTS
    [InlineData("SELECT (SELECT amount FROM invoices i WHERE i.id = 3) AS leaked, id FROM invoices o")]                       // 投影标量子查询
    public async Task SubqueryForms_Rejected_FailClosed_NoLeak(string sql)
    {
        SeedData();
        var (_, inner, audit) = await Run(sql);

        using var doc = JsonDocument.Parse(inner);
        var error = doc.RootElement.GetProperty("error").GetString();
        Assert.Contains("嵌套查询暂不支持", error);
        Assert.DoesNotContain("300", error); // 拒绝路径的明文错误不得泄漏任何数据
        Assert.Contains("Result: rejected", audit); // 审计 warning 留痕（R7.1 要求）
    }

    /// <summary>
    /// 正向对照：顶层单层 SELECT 正常执行——可见数据 {100,200} 必须返回、300 不得出现
    /// （证明拒绝不是「全拒」，顶层路径完好）。
    /// </summary>
    [Fact]
    public async Task TopLevelSelect_PositiveControl_ReturnsVisibleOnly()
    {
        SeedData();
        var (toolOk, inner, _) = await Run("SELECT id, amount FROM invoices");

        Assert.True(toolOk, "顶层单层 SELECT 应成功");
        Assert.Contains("\"success\":true", inner);
        var amounts = Amounts(inner);
        Assert.Contains(100d, amounts);
        Assert.Contains(200d, amounts);
        Assert.DoesNotContain(300d, amounts);
    }

    /// <summary>
    /// 正向对照 2：顶层 self-join（等值自连接 ON a.id = b.id）——3 行各自 join 自己，
    /// 过滤后仅 own/authorized 可见：2 行 {100,200}，300 不出现。
    /// </summary>
    [Fact]
    public async Task SelfJoin_TopLevel_PositiveControl()
    {
        SeedData();
        var (toolOk, inner, _) = await Run("SELECT a.id, b.amount FROM invoices a JOIN invoices b ON a.id = b.id");

        Assert.True(toolOk, "顶层 self-join 应成功");
        Assert.Contains("\"success\":true", inner);
        using var doc = JsonDocument.Parse(inner);
        var rows = doc.RootElement.GetProperty("data").EnumerateArray().ToList();
        Assert.Equal(2, rows.Count); // ON a.id = b.id 等值自连接：3 对 → 过滤后 2 行
        var amounts = rows.Select(r => r.GetProperty("amount").GetDouble()).ToList();
        Assert.Equal(new[] { 100d, 200d }, amounts.OrderBy(x => x));
    }
}
