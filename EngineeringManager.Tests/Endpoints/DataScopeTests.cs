using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// D-1 DataScope 枚举化 — 验证 GetDataScope 角色映射、UserFilter 片段输出
/// </summary>
public class DataScopeTests
{
    // ════════ GetDataScope 角色映射 ════════

    [Fact]
    public void UserFilterCompany_AllScope_ReturnsOneEqOne()
    {
        // All → (1 = 1)
        var sql = EngineeringManager.Api.Security.CurrentUser.UserFilterCompany(
            EngineeringManager.Api.Security.CurrentUser.DataScope.All, "created_by");
        Assert.Equal("(1 = 1)", sql);
    }

    [Fact]
    public void UserFilterCompany_AuthorizedProjects_ContainsNoIsAdmin()
    {
        // AuthorizedProjects → (created_by = @Uid)，不含 @IsAdmin
        var sql = EngineeringManager.Api.Security.CurrentUser.UserFilterCompany(
            EngineeringManager.Api.Security.CurrentUser.DataScope.AuthorizedProjects, "created_by");
        Assert.Equal("(created_by = @Uid)", sql);
        Assert.DoesNotContain("IsAdmin", sql);
    }

    [Fact]
    public void UserFilterCompany_AuthorizedProjects_UsesAlias()
    {
        // 带表别名
        var sql = EngineeringManager.Api.Security.CurrentUser.UserFilterCompany(
            EngineeringManager.Api.Security.CurrentUser.DataScope.AuthorizedProjects, "m.created_by");
        Assert.Equal("(m.created_by = @Uid)", sql);
    }

    [Fact]
    public void UserFilterWithAuthorizedProjects_AllScope_ReturnsOneEqOne()
    {
        // All → (1 = 1)（R4.1 起 projectCol 必填且须表限定，测试用限定名）
        var sql = EngineeringManager.Api.Security.CurrentUser.UserFilterWithAuthorizedProjects(
            EngineeringManager.Api.Security.CurrentUser.DataScope.All, "income_contracts.project_id");
        Assert.Equal("(1 = 1)", sql);
    }

    [Fact]
    public void UserFilterWithAuthorizedProjects_AuthorizedProjects_ContainsNoIsAdmin()
    {
        // AuthorizedProjects → (created_by = @Uid OR EXISTS ...)，不含 @IsAdmin
        var sql = EngineeringManager.Api.Security.CurrentUser.UserFilterWithAuthorizedProjects(
            EngineeringManager.Api.Security.CurrentUser.DataScope.AuthorizedProjects,
            "income_contracts.project_id", "created_by");
        Assert.Contains("created_by = @Uid", sql);
        Assert.Contains("EXISTS", sql);
        Assert.Contains("project_authorizations pa", sql);
        Assert.Contains("pa.project_id = income_contracts.project_id", sql);
        Assert.DoesNotContain("IsAdmin", sql);
    }

    [Fact]
    public void UserFilterWithAuthorizedProjects_AuthorizedProjects_UsesProjectCol()
    {
        // 自定义 projectCol
        var sql = EngineeringManager.Api.Security.CurrentUser.UserFilterWithAuthorizedProjects(
            EngineeringManager.Api.Security.CurrentUser.DataScope.AuthorizedProjects,
            "pw.project_id");
        Assert.Contains("pw.project_id", sql);
    }

    [Fact]
    public void UserFilterFragmentForProject_AllScope_ReturnsOneEqOne()
    {
        var sql = EngineeringManager.Api.Security.CurrentUser.UserFilterFragmentForProject(
            EngineeringManager.Api.Security.CurrentUser.DataScope.All);
        Assert.Equal("(1 = 1)", sql);
    }

    [Fact]
    public void UserFilterFragmentForProject_AuthorizedProjects_ContainsNoIsAdmin()
    {
        var sql = EngineeringManager.Api.Security.CurrentUser.UserFilterFragmentForProject(
            EngineeringManager.Api.Security.CurrentUser.DataScope.AuthorizedProjects);
        Assert.Contains("created_by = @Uid", sql);
        Assert.Contains("EXISTS", sql);
        Assert.DoesNotContain("IsAdmin", sql);
    }

    // ════════ SafeQueryValidator 不生成 @IsAdmin ════════

    [Fact]
    public void ValidateAndRewrite_AuthorizedProjects_NoIsAdminInSql()
    {
        // safeQuery 在 AuthorizedProjects 范围下，生成的 SQL 不含 @IsAdmin
        var result = EngineeringManager.Api.Services.SafeQueryValidator.ValidateAndRewrite(
            "SELECT id, name FROM projects",
            "test-user",
            EngineeringManager.Api.Security.CurrentUser.DataScope.AuthorizedProjects);

        Assert.True(result.IsValid, $"查询应通过: {result.Error}");
        Assert.NotNull(result.RewrittenSql);
        Assert.DoesNotContain("@IsAdmin", result.RewrittenSql);
    }

    [Fact]
    public void ValidateAndRewrite_AllScope_NoIsAdminInSql()
    {
        // All 范围下，生成的 SQL 不含 @IsAdmin
        var result = EngineeringManager.Api.Services.SafeQueryValidator.ValidateAndRewrite(
            "SELECT id, name FROM projects",
            "test-user",
            EngineeringManager.Api.Security.CurrentUser.DataScope.All);

        Assert.True(result.IsValid, $"查询应通过: {result.Error}");
        Assert.NotNull(result.RewrittenSql);
        Assert.DoesNotContain("@IsAdmin", result.RewrittenSql);
    }

    [Fact]
    public void GetTableFilter_CompanyTable_AllScope_ReturnsOneEqOne()
    {
        var sql = EngineeringManager.Api.Services.SafeQueryValidator.GetTableFilter(
            EngineeringManager.Api.Security.CurrentUser.DataScope.All,
            "projects");
        Assert.Equal("(1 = 1)", sql);
    }

    [Fact]
    public void GetTableFilter_CompanyTable_AuthorizedProjects_UsesCreatedBy()
    {
        var sql = EngineeringManager.Api.Services.SafeQueryValidator.GetTableFilter(
            EngineeringManager.Api.Security.CurrentUser.DataScope.AuthorizedProjects,
            "projects");
        Assert.Contains("created_by = @Uid", sql);
        Assert.DoesNotContain("IsAdmin", sql);
    }

    [Fact]
    public void GetTableFilter_ProjectTable_AuthorizedProjects_UsesProjectAuth()
    {
        var sql = EngineeringManager.Api.Services.SafeQueryValidator.GetTableFilter(
            EngineeringManager.Api.Security.CurrentUser.DataScope.AuthorizedProjects,
            "invoices");
        Assert.Contains("EXISTS", sql);
        Assert.Contains("project_authorizations", sql);
        Assert.DoesNotContain("IsAdmin", sql);
    }
}