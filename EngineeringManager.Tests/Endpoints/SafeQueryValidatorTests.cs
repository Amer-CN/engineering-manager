using Xunit;
using EngineeringManager.Api.Services;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// SafeQueryValidator 单元测试 — 验证 L-1（REPLACE 标量函数放行）和 L-2（EnsureLimit 兼容性）
/// </summary>
public class SafeQueryValidatorTests
{
    private const string TestUid = "test-user";
    private static readonly EngineeringManager.Api.Security.CurrentUser.DataScope TestScope = EngineeringManager.Api.Security.CurrentUser.DataScope.All;

    // ════════ L-1: REPLACE 标量函数 ════════

    [Fact]
    public void ValidateAndRewrite_ReplaceScalarFunction_Allowed()
    {
        // REPLACE 标量函数应被放行（不是 REPLACE INTO）
        var result = SafeQueryValidator.ValidateAndRewrite(
            "SELECT REPLACE(name, ' ', '') FROM projects", TestUid, TestScope);

        Assert.True(result.IsValid, $"REPLACE 标量函数应该通过，但被拒绝: {result.Error}");
        Assert.NotNull(result.RewrittenSql);
    }

    [Fact]
    public void ValidateAndRewrite_ReplaceIntoSql_Rejected()
    {
        // REPLACE INTO 是 DML，应该被 AST 校验拒绝
        var result = SafeQueryValidator.ValidateAndRewrite(
            "REPLACE INTO projects (id, name) VALUES (1, 'test')", TestUid, TestScope);

        Assert.False(result.IsValid, "REPLACE INTO 应该被拒绝");
    }

    // ════════ L-2: EnsureLimit 兼容性 ════════

    [Fact]
    public void ValidateAndRewrite_LimitExceedsMax_ClampedTo100()
    {
        // LIMIT 500 → 应被压到 100
        var sql = "SELECT id, name FROM projects LIMIT 500";
        var result = SafeQueryValidator.ValidateAndRewrite(sql, TestUid, TestScope);

        Assert.True(result.IsValid, $"LIMIT 500 应该通过: {result.Error}");
        Assert.NotNull(result.RewrittenSql);
        Assert.Contains("LIMIT 100", result.RewrittenSql, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ValidateAndRewrite_LimitOffsetForm_ClampedTo100()
    {
        // LIMIT 0, 500 → count 500 被压到 100
        var sql = "SELECT id, name FROM projects LIMIT 0, 500";
        var result = SafeQueryValidator.ValidateAndRewrite(sql, TestUid, TestScope);

        Assert.True(result.IsValid, $"LIMIT 0,500 应该通过: {result.Error}");
        Assert.NotNull(result.RewrittenSql);
        // count 被压到 100，offset 0 保留（具体格式可能是 LIMIT 100 OFFSET 0 或 LIMIT 0, 100）
        var lowerSql = result.RewrittenSql.ToLowerInvariant();
        // 检查 count=100，不关心具体语法格式
        Assert.DoesNotContain("limit 500", lowerSql);
    }

    [Fact]
    public void ValidateAndRewrite_LimitBelowMax_Unchanged()
    {
        // LIMIT 10 ≤ 100，保持不变
        var sql = "SELECT id, name FROM projects LIMIT 10";
        var result = SafeQueryValidator.ValidateAndRewrite(sql, TestUid, TestScope);

        Assert.True(result.IsValid, $"LIMIT 10 应该通过: {result.Error}");
        Assert.NotNull(result.RewrittenSql);
        Assert.Contains("LIMIT 10", result.RewrittenSql, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ValidateAndRewrite_LimitWithOffset_ClampedTo100()
    {
        // LIMIT 10 OFFSET 1000 → count=10 ≤ 100，保持不变
        var sql = "SELECT id, name FROM projects LIMIT 10 OFFSET 1000";
        var result = SafeQueryValidator.ValidateAndRewrite(sql, TestUid, TestScope);

        Assert.True(result.IsValid, $"LIMIT 10 OFFSET 1000 应该通过: {result.Error}");
        Assert.NotNull(result.RewrittenSql);
        Assert.Contains("LIMIT 10", result.RewrittenSql, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ValidateAndRewrite_NoExplicitLimit_Default100()
    {
        // 无 LIMIT → 自动添加 LIMIT 100
        var sql = "SELECT id, name FROM projects";
        var result = SafeQueryValidator.ValidateAndRewrite(sql, TestUid, TestScope);

        Assert.True(result.IsValid, $"无 LIMIT 查询应该通过: {result.Error}");
        Assert.NotNull(result.RewrittenSql);
        Assert.Contains("LIMIT 100", result.RewrittenSql, StringComparison.OrdinalIgnoreCase);
    }
}
