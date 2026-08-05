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
}
