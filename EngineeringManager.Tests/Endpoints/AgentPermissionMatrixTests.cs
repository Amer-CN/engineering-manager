using System.Security.Claims;
using System.Text.Json;
using Dapper;
using EngineeringManager.Api;
using EngineeringManager.Api.Services;
using EngineeringManager.Tests.Common;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// R6.7: runSafeQuery 权限矩阵——worker 默认权限不含 safeQuery:read（agent 工具路径
/// 二次校验拒绝），manager 含。钉住 GetUserPermissions（硬编码 GetDefaultPermissions）
/// 与工具 RequiredPermission 的一致性。G10（GetUserPermissions 硬编码默认值 vs
/// HasPermission 读取 DB roles.permissions 的不一致）仅登记 TD，不在本测试修复。
/// </summary>
public class AgentPermissionMatrixTests : ApiTestBase
{
    [Fact]
    public void DefaultPermissions_Worker_DoesNotContainSafeQueryRead()
    {
        var perms = EngineeringManager.Api.Common.GetDefaultPermissions("worker");
        Assert.DoesNotContain("safeQuery:read", perms);
        Assert.Contains("dashboard:read", perms);
    }

    [Fact]
    public void DefaultPermissions_Manager_ContainsSafeQueryRead()
    {
        var perms = EngineeringManager.Api.Common.GetDefaultPermissions("manager");
        Assert.Contains("safeQuery:read", perms);
    }

    /// <summary>
    /// worker 角色（工人）调 runSafeQuery：ExecuteToolAsync 二次权限校验必须拒绝，
    /// 错误文案与 RequiredPermission 一致（R6.7）。
    /// </summary>
    [Fact]
    public async Task ExecuteToolAsync_Worker_RunSafeQuery_PermissionDenied()
    {
        var ctx = new DefaultHttpContext();
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, "worker-r6-1"),
            new("uid", "worker-r6-1"),
            new(ClaimTypes.Role, "工人"),
        };
        ctx.User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"));

        var args = JsonDocument.Parse("{\"sql\":\"SELECT id FROM invoices\"}").RootElement;
        var tools = new AgentToolService(new FakeEmbeddingService());
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();

        var result = await tools.ExecuteToolAsync("runSafeQuery", args, ctx, conn);

        Assert.False(result.Success, "worker 调用 runSafeQuery 应被权限校验拒绝");
        Assert.Equal("权限不足：需要 safeQuery:read", result.Error);
    }

    /// <summary>
    /// 对照组：manager（经理）调用 runSafeQuery 能通过权限校验（权限不足的语义正确性，
    /// 而非所有角色都被拒）。查询本身走正常执行路径。
    /// </summary>
    [Fact]
    public async Task ExecuteToolAsync_Manager_RunSafeQuery_PermissionGranted()
    {
        var ctx = new DefaultHttpContext();
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, "mgr-r6-1"),
            new("uid", "mgr-r6-1"),
            new(ClaimTypes.Role, "经理"),
        };
        ctx.User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"));

        var args = JsonDocument.Parse("{\"sql\":\"SELECT id FROM invoices\"}").RootElement;
        var tools = new AgentToolService(new FakeEmbeddingService());
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();

        var result = await tools.ExecuteToolAsync("runSafeQuery", args, ctx, conn);

        Assert.True(result.Success, "manager 调用 runSafeQuery 应通过权限校验： " + (result.Error ?? ""));
    }
}
