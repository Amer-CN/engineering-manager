using Dapper;
using EngineeringManager.Api.Services;
using Xunit;

namespace EngineeringManager.Tests.Services;

/// <summary>
/// D-B1 回归：KPI 过滤子句重构为 conditions + string.Join + {filter}。
/// 验证 filter 仅由常量列名 + @参数占位构成，scope/用户输入/ScopeId 原文绝不进入 SQL 文本（防注入），
/// 且日期/scope 各组合口径正确。8 个查询站点共用同一 BuildKpiFilter 输出，口径天然一致。
/// </summary>
public class ReportGenerationServiceFilterTests
{
    private static ReportRequest Req(string scope, int? scopeId = null, string? start = null, string? end = null)
        => new() { Scope = scope, ScopeId = scopeId, StartDate = start, EndDate = end, Period = "week" };

    private static List<string> ParamNames(DynamicParameters p) => p.ParameterNames.ToList();

    [Fact]
    public void User_scope_过滤_created_by_且用户id不进SQL文本()
    {
        var (filter, param) = ReportGenerationService.BuildKpiFilter(Req("user"), "user-secret", isAdmin: false);
        Assert.Contains("[created_by] = @UserId", filter);
        Assert.DoesNotContain("user-secret", filter);
        Assert.Contains("UserId", ParamNames(param));
    }

    [Fact]
    public void All_scope_admin_无额外scope过滤()
    {
        var (filter, _) = ReportGenerationService.BuildKpiFilter(Req("all"), "admin-1", isAdmin: true);
        Assert.DoesNotContain("[created_by]", filter);
        Assert.DoesNotContain("[project_id]", filter);
        Assert.StartsWith(" WHERE ", filter);
    }

    [Fact]
    public void All_scope_非admin_回落created_by_禁止全公司()
    {
        var (filter, _) = ReportGenerationService.BuildKpiFilter(Req("all"), "user-9", isAdmin: false);
        Assert.Contains("[created_by] = @UserId", filter);
    }

    [Fact]
    public void Project_scope_过滤project_id_且ScopeId值不进SQL文本()
    {
        var (filter, param) = ReportGenerationService.BuildKpiFilter(Req("project", scopeId: 42), "user-1", isAdmin: false);
        Assert.Contains("[project_id] = @ScopeId", filter);
        Assert.DoesNotContain("42", filter);
        Assert.DoesNotContain("[created_by]", filter);
        Assert.Contains("ScopeId", ParamNames(param));
    }

    [Fact]
    public void Project_scope_缺ScopeId_不加项目过滤()
    {
        var (filter, _) = ReportGenerationService.BuildKpiFilter(Req("project", scopeId: null), "user-1", isAdmin: true);
        Assert.DoesNotContain("[project_id]", filter);
    }

    [Fact]
    public void 日期条件_恒存在_且日期值走参数不进SQL文本()
    {
        // 显式日期
        var (f1, p1) = ReportGenerationService.BuildKpiFilter(Req("all", start: "2026-01-01", end: "2026-01-31"), "a", true);
        // Period 默认（无显式日期）
        var (f2, p2) = ReportGenerationService.BuildKpiFilter(Req("all"), "a", true);
        foreach (var f in new[] { f1, f2 })
        {
            Assert.Contains("[created_at] >= @StartDate", f);
            Assert.Contains("[created_at] <= @EndDate", f);
        }
        Assert.DoesNotContain("2026-01-01", f1);
        Assert.Contains("StartDate", ParamNames(p1));
        Assert.Contains("EndDate", ParamNames(p2));
    }

    [Fact]
    public void 非法scope_非admin_安全回落created_by_且scope原文不进SQL()
    {
        var (filter, _) = ReportGenerationService.BuildKpiFilter(Req("bogus"), "user-1", isAdmin: false);
        Assert.DoesNotContain("bogus", filter);
        Assert.Contains("[created_by] = @UserId", filter);
    }

    [Fact]
    public void 日期加project_scope_精确结构_仅常量列名与参数占位()
    {
        var (filter, param) = ReportGenerationService.BuildKpiFilter(
            Req("project", scopeId: 7, start: "2026-01-01", end: "2026-01-31"), "user-secret", isAdmin: false);
        // 精确断言：filter 只含常量列名 + @占位，无任何用户输入
        Assert.Equal(
            " WHERE [created_at] >= @StartDate AND [created_at] <= @EndDate AND [project_id] = @ScopeId",
            filter);
        Assert.DoesNotContain("user-secret", filter);
        Assert.DoesNotContain("7", filter);
        var names = ParamNames(param);
        Assert.Contains("StartDate", names);
        Assert.Contains("EndDate", names);
        Assert.Contains("ScopeId", names);
        Assert.DoesNotContain("UserId", names); // project scope 不绑定 UserId
    }
}
