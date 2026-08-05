using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text.Json;
using Dapper;
using EngineeringManager.Api;
using EngineeringManager.Api.Services;
using EngineeringManager.Api.Services.Stt;
using EngineeringManager.Tests.Common;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// R5.1(d): agent 路径（runSafeQuery 工具）项目级表无别名查询的分支隔离覆盖。
///
/// 背景：R4.1 之前，退化 EXISTS 在 agent 路径上一直零覆盖；R4.1 的守卫对裸列
/// fail-closed 后，SafeQueryValidator.GetTableFilter 无别名时生成裸 "project_id"
/// 会触达守卫 throw（生产回归，admin 也一样坏，且失败不留审计）。
/// R5.1(a) 修复为无别名用表名限定后，本测试钉住 agent 路径的过滤行为。
///
/// 版本说明（纪律 17 偏差）：worker 角色默认权限不含 safeQuery:read（Common.cs），
/// runSafeQuery 对 worker 会被工具权限校验直接拒绝；本测试使用 manager
/// （非 admin、含 safeQuery:read、GetDataScope 同为 AuthorizedProjects，隔离语义一致）。
///
/// 数据布局（分支隔离法，照 ProjectAuthzIsolationTests）：
///   P1 = manager 被授权项目；P2 = 未授权项目
///   own（P2, created_by=manager）        → 仅 created_by 分支
///   other-authorized（P1, created_by=admin）→ 仅 EXISTS 分支
///   other-unauthorized（P2, created_by=admin）→ 两个分支都不可命中
/// 一次 ExecuteToolAsync 调用三断言。
/// </summary>
public class AgentRunSafeQueryIsolationTests : ApiTestBase
{
    private const string ManagerUid = "mgmt-1";
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

        conn.Execute("INSERT INTO projects (id, name, created_by, created_at) VALUES (1, '授权项目P1', @Admin, @Now)", new { Admin = AdminUid, Now = now }, tx);
        conn.Execute("INSERT INTO projects (id, name, created_by, created_at) VALUES (2, '未授权项目P2', @Admin, @Now)", new { Admin = AdminUid, Now = now }, tx);
        conn.Execute("INSERT INTO project_authorizations (project_id, user_id) VALUES (1, @Mgr)", new { Mgr = ManagerUid }, tx);

        // 三条发票（分支隔离：每条只被一个分支支撑）
        conn.Execute(@"INSERT INTO invoices (id, project_id, name, amount, status, created_by, created_at, updated_at)
            VALUES (1, 2, 'own', 100, 'pending', @Mgr, @Now, @Now)", new { Mgr = ManagerUid, Now = now }, tx);
        conn.Execute(@"INSERT INTO invoices (id, project_id, name, amount, status, created_by, created_at, updated_at)
            VALUES (2, 1, 'authorized-other', 200, 'pending', @Admin, @Now, @Now)", new { Admin = AdminUid, Now = now }, tx);
        conn.Execute(@"INSERT INTO invoices (id, project_id, name, amount, status, created_by, created_at, updated_at)
            VALUES (3, 2, 'unauthorized-other', 300, 'pending', @Admin, @Now, @Now)", new { Admin = AdminUid, Now = now }, tx);

        tx.Commit();
    }

    [Fact]
    public async Task RunSafeQuery_Manager_AliaslessInvoices_ThreeBranches()
    {
        SeedData();

        // manager 走 runSafeQuery 执行【无别名】项目级表查询（R5.1 回归路径）
        var args = JsonDocument.Parse("{\"sql\":\"SELECT id, amount FROM invoices\"}").RootElement;
        var tools = new AgentToolService(new FakeEmbeddingService());
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();

        var result = await tools.ExecuteToolAsync("runSafeQuery", args, CreateManagerContext(), conn);

        // 工具层必须成功（R5.1(a) 修复后不得触达守卫 throw）
        Assert.True(result.Success, "runSafeQuery 工具应成功： " + (result.Error ?? ""));

        var resultObj = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(
            JsonSerializer.Serialize(result.Result))!;
        Assert.True(resultObj["success"].GetBoolean(), "内层 success 应为 true");
        var rows = resultObj["data"].EnumerateArray().Select(r => r.GetProperty("id").GetInt64()).ToList();

        // 正向1（created_by 分支）：自己的行可见
        Assert.Contains(1L, rows);
        // 正向2（EXISTS 分支）：授权项目下他人行可见
        Assert.Contains(2L, rows);
        // 反向1：未授权项目下他人行不可见
        Assert.DoesNotContain(3L, rows);
    }

    /// <summary>
    /// R6.1(a): G1 self-join 泄漏实证——【修复前必须红】。
    /// 同一白名单表出现两次（FROM invoices a JOIN invoices b），
    /// InjectUserFilterAstAware 用 HashSet 折叠 + FirstOrDefault 只取第一个别名 → 只为 a
    /// 注入过滤，b 完全无过滤 → 未授权项目他人记录的 amount（300）直接可读。
    /// 断言：结果中不得出现 amount=300（unauthorized-other 的金额）。
    /// </summary>
    [Fact]
    public async Task RunSafeQuery_Manager_SelfJoinInvoices_NoUnauthorizedLeak()
    {
        SeedData(); // own(P2) / authorized-other(P1) / unauthorized-other(P2)，金额 100/200/300

        var args = JsonDocument.Parse("{\"sql\":\"SELECT a.id, b.amount FROM invoices a JOIN invoices b ON 1=1\"}").RootElement;
        var tools = new AgentToolService(new FakeEmbeddingService());
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();

        var result = await tools.ExecuteToolAsync("runSafeQuery", args, CreateManagerContext(), conn);

        Assert.True(result.Success, "runSafeQuery 工具应成功： " + (result.Error ?? ""));
        var resultObj = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(
            JsonSerializer.Serialize(result.Result))!;
        Assert.True(resultObj["success"].GetBoolean(), "内层 success 应为 true");
        var rows = resultObj["data"].EnumerateArray().ToList();

        // 反向1（泄漏断言）：未授权项目他人记录的 amount（300）不得出现在结果里
        Assert.DoesNotContain(rows, r => r.GetProperty("amount").GetDouble() == 300);
    }

    /// <summary>
    /// R6.5: 用户可控别名撞内部保留别名（pa_authz）——R5.1 必答更正。
    /// 修复前 "FROM invoices pa_authz" 能一路触达 CurrentUser guard throw（fail-closed 但属
    /// 意外路径，错误消息泄漏内部实现细节）。修复后验证层显式拒绝：
    /// 可解释错误 + audit_logs 有 safe_query warning 行。
    /// </summary>
    [Fact]
    public async Task RunSafeQuery_ReservedAlias_PaAuthz_RejectedWithExplanatoryError()
    {
        SeedData();

        var args = JsonDocument.Parse("{\"sql\":\"SELECT id, amount FROM invoices pa_authz\"}").RootElement;
        var tools = new AgentToolService(new FakeEmbeddingService());
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();

        var result = await tools.ExecuteToolAsync("runSafeQuery", args, CreateManagerContext(), conn);
        Assert.True(result.Success, "工具调用本身应成功（拒绝发生在内层）： " + (result.Error ?? ""));

        var resultObj = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(
            JsonSerializer.Serialize(result.Result))!;
        Assert.False(resultObj["success"].GetBoolean(), "内层 success 应为 false（保留别名拒绝）");
        var error = resultObj["error"].GetString();
        Assert.NotNull(error);
        // 可解释错误：明确说别名冲突，且不泄漏内部实现细节（R5.2 黑名单等字样）
        Assert.Contains("保留别名", error);
        Assert.DoesNotContain("R5.2 黑名单", error);
        Assert.DoesNotContain("校验异常", error);

        // 审计：audit_logs 有 safe_query warning 行（失败留痕，R5.1e 纪律）
        var auditCount = conn.ExecuteScalar<int>(
            "SELECT COUNT(*) FROM audit_logs WHERE action='safe_query' AND level='warning' AND user_id=@Uid AND details LIKE @Like",
            new { Uid = ManagerUid, Like = "%SELECT id, amount FROM invoices pa_authz%" });
        Assert.True(auditCount >= 1, "audit_logs 应有 safe_query warning 行");
    }

    /// <summary>
    /// R6.5: 用户别名撞内部表名（project_authorizations）同样验证层拒绝（R6.2 去引号归一化口径）。
    /// </summary>
    [Fact]
    public async Task RunSafeQuery_ReservedAlias_ProjectAuthorizations_RejectedWithExplanatoryError()
    {
        SeedData();

        var args = JsonDocument.Parse("{\"sql\":\"SELECT id FROM invoices project_authorizations\"}").RootElement;
        var tools = new AgentToolService(new FakeEmbeddingService());
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();

        var result = await tools.ExecuteToolAsync("runSafeQuery", args, CreateManagerContext(), conn);
        Assert.True(result.Success, "工具调用本身应成功（拒绝发生在内层）： " + (result.Error ?? ""));

        var resultObj = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(
            JsonSerializer.Serialize(result.Result))!;
        Assert.False(resultObj["success"].GetBoolean(), "内层 success 应为 false（保留别名拒绝）");
        var error = resultObj["error"].GetString();
        Assert.NotNull(error);
        Assert.Contains("保留别名", error);
        Assert.DoesNotContain("R5.2 黑名单", error);

        var auditCount = conn.ExecuteScalar<int>(
            "SELECT COUNT(*) FROM audit_logs WHERE action='safe_query' AND level='warning' AND user_id=@Uid AND details LIKE @Like",
            new { Uid = ManagerUid, Like = "%FROM invoices project_authorizations%" });
        Assert.True(auditCount >= 1, "audit_logs 应有 safe_query warning 行");
    }

    /// <summary>
    /// R6.5 穷举：用户可控输入触达 guard 的完整 input surface。
    /// 大小写 / 标识符引号（[] "" ``）/ 显式 AS / schema 前缀 / 同表多次引用——
    /// 全部必须在验证层被拒绝（可解释错误、不泄漏内部细节）。
    /// </summary>
    [Theory]
    [InlineData("SELECT id, amount FROM invoices PA_AUTHZ")]
    [InlineData("SELECT id, amount FROM invoices [pa_authz]")]
    [InlineData("SELECT id, amount FROM invoices \"pa_authz\"")]
    [InlineData("SELECT id, amount FROM invoices AS pa_authz")]
    [InlineData("SELECT id FROM main.invoices pa_authz")]
    [InlineData("SELECT id, amount FROM invoices pa_authz JOIN invoices b ON 1=1")]
    [InlineData("SELECT id FROM invoices PROJECT_AUTHORIZATIONS")]
    [InlineData("SELECT id FROM invoices [project_authorizations]")]
    public async Task RunSafeQuery_ReservedAlias_InputSurface_Rejected(string sql)
    {
        SeedData();
        var args = JsonDocument.Parse(JsonSerializer.Serialize(new { sql })).RootElement;
        var tools = new AgentToolService(new FakeEmbeddingService());
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();

        var result = await tools.ExecuteToolAsync("runSafeQuery", args, CreateManagerContext(), conn);
        Assert.True(result.Success, "工具调用本身应成功（拒绝发生在内层）： " + (result.Error ?? ""));

        var resultObj = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(
            JsonSerializer.Serialize(result.Result))!;
        Assert.False(resultObj["success"].GetBoolean(), $"内层 success 应为 false（保留别名拒绝）：{sql}");
        var error = resultObj["error"].GetString()!;
        Assert.Contains("保留别名", error);
        Assert.DoesNotContain("R5.2 黑名单", error);
        Assert.DoesNotContain("校验异常", error);
    }
}
