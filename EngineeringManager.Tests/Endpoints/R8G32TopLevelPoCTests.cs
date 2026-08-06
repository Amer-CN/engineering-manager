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
/// R8.16.1 G32 补完：顶层 CollectTables 调用点（ValidateAndRewrite 步骤 7）——
/// 无 FROM 查询（SELECT 1 / SELECT 1 ORDER BY 1）此前 NRE 穿透（该处 try 只 catch
/// ValidationException）。修复 = CollectTables 入口 `if (fromClause == null) return;`，
/// 落回「未找到有效的表名」设计拒绝。UNION 探针被步骤 4 集合操作分支先拒（如实记录）。
/// </summary>
public class R8G32TopLevelPoCTests : ApiTestBase
{
    private const string ManagerUid = "r8-mgr";

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
        conn.Execute("INSERT INTO projects (id, name, created_by, created_at) VALUES (1, 'P1', '1', @Now)", new { Now = now }, tx);
        conn.Execute("INSERT INTO projects (id, name, created_by, created_at) VALUES (2, 'P2', '1', @Now)", new { Now = now }, tx);
        conn.Execute("INSERT INTO project_authorizations (project_id, user_id) VALUES (1, @Mgr)", new { Mgr = ManagerUid }, tx);
        conn.Execute(@"INSERT INTO invoices (id, project_id, name, amount, status, created_by, created_at, updated_at)
            VALUES (1, 2, 'own', 100, 'pending', @Mgr, @Now, @Now)", new { Mgr = ManagerUid, Now = now }, tx);
        conn.Execute(@"INSERT INTO invoices (id, project_id, name, amount, status, created_by, created_at, updated_at)
            VALUES (2, 1, 'auth', 200, 'pending', '1', @Now, @Now)", new { Now = now }, tx);
        conn.Execute(@"INSERT INTO invoices (id, project_id, name, amount, status, created_by, created_at, updated_at)
            VALUES (3, 2, 'unauth', 300, 'pending', '1', @Now, @Now)", new { Now = now }, tx);
        tx.Commit();
    }

    private async Task<string> Run(string sql)
    {
        var args = JsonDocument.Parse(JsonSerializer.Serialize(new { sql })).RootElement;
        var tools = new AgentToolService(new FakeEmbeddingService());
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var result = await tools.ExecuteToolAsync("runSafeQuery", args, CreateManagerContext(), conn);
        return result.Success ? JsonSerializer.Serialize(result.Result) : $"{{error: {result.Error}}}";
    }

    /// <summary>
    /// R8.16.1(c): 无 FROM 顶层构造 → 设计拒绝「未找到有效的表名」，
    /// 不含任何 NRE 字样（修复前为「校验异常: Object reference...」）。
    /// </summary>
    [Theory]
    [InlineData("SELECT 1")]
    [InlineData("SELECT 1 ORDER BY 1")]
    public async Task TopLevelNoFrom_Rejected_NoNreWording(string sql)
    {
        SeedData();
        var inner = await Run(sql);
        using var doc = JsonDocument.Parse(inner);
        var error = doc.RootElement.GetProperty("error").GetString();
        Assert.Contains("未找到有效的表名", error);
        Assert.DoesNotContain("Object reference", error);
        Assert.DoesNotContain("NullReference", error);
        Assert.DoesNotContain("Exception", error);
    }

    /// <summary>
    /// R8.16.1(a) C 探针：UNION 被步骤 4 集合操作分支先拒（如实记录的先行分支），
    /// 与 G32 修复无冲突——设计拒绝且无 NRE。
    /// </summary>
    [Fact]
    public async Task TopLevel_Union_RejectedBySetOperationBranch()
    {
        SeedData();
        var inner = await Run("SELECT id FROM invoices WHERE id = 1 UNION SELECT 1");
        using var doc = JsonDocument.Parse(inner);
        var error = doc.RootElement.GetProperty("error").GetString();
        Assert.Contains("UNION", error);
        Assert.DoesNotContain("Object reference", error);
    }
}
