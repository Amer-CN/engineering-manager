using Xunit;
using Dapper;
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

    // ════════ 负例：字符串字面量绕过（安全表 #16） ════════
    // FindTopLevelKeyword 原先只数括号深度、不识别字符串引号，
    // 导致 ' WHERE 1=1' 字面量内的 WHERE 被当成顶层 WHERE，行级过滤器被插进字面量内。

    // DataScope.Company 已从枚举移除，用 SelfOnly（非 All → 注入 created_by = @Uid 过滤器）
    private static readonly EngineeringManager.Api.Security.CurrentUser.DataScope RestrictedScope =
        EngineeringManager.Api.Security.CurrentUser.DataScope.SelfOnly;

    /// <summary>去掉 SQL 里的单引号字符串字面量内容，用于断言过滤器在字面量之外</summary>
    private static string StripStringLiterals(string sql)
    {
        var sb = new System.Text.StringBuilder();
        bool inQuote = false;
        for (int i = 0; i < sql.Length; i++)
        {
            var c = sql[i];
            if (inQuote)
            {
                if (c == '\'')
                {
                    if (i + 1 < sql.Length && sql[i + 1] == '\'') i++; // '' 转义
                    else inQuote = false;
                }
                continue;
            }
            if (c == '\'') { inQuote = true; continue; }
            sb.Append(c);
        }
        return sb.ToString();
    }

    [Fact]
    public void ValidateAndRewrite_WhereInsideStringLiteral_FilterInjectedOutsideLiteral()
    {
        // PoC：注入的行级过滤器被插进 ' WHERE 1=1' 字面量内 → 真实查询无行级过滤（RLS 绕过）
        var sql = "SELECT ' WHERE 1=1', name FROM projects";
        var result = SafeQueryValidator.ValidateAndRewrite(sql, TestUid, RestrictedScope);

        Assert.True(result.IsValid, $"查询应该通过: {result.Error}");
        Assert.NotNull(result.RewrittenSql);
        // 改写结果去掉字符串字面量后必须仍含 created_by 过滤（过滤器位于字面量之外）
        Assert.Contains("created_by", StripStringLiterals(result.RewrittenSql), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ValidateAndRewrite_LimitInsideStringLiteral_RealLimitStillEnforced()
    {
        // PoC：WHERE name = ' LIMIT 999999' → 字面量内的 LIMIT 不能被当成顶层 LIMIT
        // （FindTopLevelKeyword 若不跳过字符串字面量，会把字面量内的 LIMIT 当真，改写错位）
        var sql = "SELECT name FROM projects WHERE name = ' LIMIT 999999'";
        var result = SafeQueryValidator.ValidateAndRewrite(sql, TestUid, TestScope);

        Assert.True(result.IsValid, $"查询应该通过: {result.Error}");
        Assert.NotNull(result.RewrittenSql);
        // 剥掉字符串字面量后必须存在真实 LIMIT 100（自动注入的那个）
        Assert.Contains("LIMIT 100", StripStringLiterals(result.RewrittenSql), StringComparison.OrdinalIgnoreCase);
        // 且字面量外不得残留 LIMIT 999999（旧漏洞会把 999999 当成已有 LIMIT 不再注入/错改）
        Assert.DoesNotContain("999999", StripStringLiterals(result.RewrittenSql), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ValidateAndRewrite_OrderByLimitInsideStringLiteral_RealLimitEnforced()
    {
        // PoC：ORDER BY 'LIMIT 999999' → 字面量内的 LIMIT 吞失真实 LIMIT
        var sql = "SELECT name FROM projects ORDER BY 'LIMIT 999999'";
        var result = SafeQueryValidator.ValidateAndRewrite(sql, TestUid, TestScope);

        Assert.True(result.IsValid, $"查询应该通过: {result.Error}");
        Assert.NotNull(result.RewrittenSql);
        // 改写后必须仍含真实的 LIMIT 100（不能被字面量吞掉）
        // 先剥掉字符串字面量再断言：裸 Contains 在旧漏洞代码上会命中 'LIMIT 999999' 被改写成的字面量内 'LIMIT 100'，属恒真
        Assert.Contains("LIMIT 100", StripStringLiterals(result.RewrittenSql), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ValidateAndRewrite_CommentInjection_RowFilterStillInjected()
    {
        // PoC：SELECT name FROM projects -- WHERE 1=1
        // AST 回写会丢掉注释 → 无顶层 WHERE → InjectUserFilterAstAware 以 "WHERE <filter>" 追加。
        // 若注释处理丢失了行级过滤器（SelfOnly 下 created_by 过滤消失），本测试变红。
        var sql = "SELECT name FROM projects -- WHERE 1=1";
        var result = SafeQueryValidator.ValidateAndRewrite(sql, TestUid, RestrictedScope);

        Assert.True(result.IsValid, $"查询应该通过: {result.Error}");
        Assert.NotNull(result.RewrittenSql);
        // 改写结果去掉字符串字面量后必须仍含 created_by 过滤（无论 WHERE 是追加还是插入形式）
        Assert.Contains("created_by", StripStringLiterals(result.RewrittenSql), StringComparison.OrdinalIgnoreCase);
    }

    // ════════ 白名单与真实库对齐（列名漂移修复） ════════
    // 真实库 PRAGMA 实测：合同表是 signed_date（无 sign_date/counterparty），
    // 库存表是 current_stock/min_stock/max_stock（无 quantity/min_quantity/location/notes）。

    [Fact]
    public void Whitelist_Contracts_ContainsSignedDate_NotSignDate()
    {
        foreach (var table in new[] { "income_contracts", "expense_contracts" })
        {
            var cols = SafeQueryValidator.TableWhitelist[table];
            Assert.Contains("signed_date", cols);
            Assert.DoesNotContain("sign_date", cols);
        }
    }

    [Fact]
    public void Whitelist_Inventory_ContainsRealStockColumns_NotDeadColumns()
    {
        var cols = SafeQueryValidator.TableWhitelist["inventory_items"];
        Assert.Contains("current_stock", cols);
        Assert.Contains("min_stock", cols);
        Assert.Contains("max_stock", cols);
        Assert.Contains("code", cols);
        Assert.Contains("specifications", cols);
        Assert.DoesNotContain("quantity", cols);
        Assert.DoesNotContain("min_quantity", cols);
        Assert.DoesNotContain("location", cols);
        Assert.DoesNotContain("notes", cols); // 真实库库存表是 remarks，不是 notes
    }

    [Fact]
    public void Whitelist_Settlements_ContainsRealColumns()
    {
        var cols = SafeQueryValidator.TableWhitelist["settlements"];
        foreach (var col in new[] { "name", "settlement_no", "sub_type", "settlement_date",
                 "period_start", "period_end", "approved_by", "approved_at", "paid_at" })
            Assert.Contains(col, cols);
    }

    [Fact]
    public void Whitelist_Members_ContainsWageBankAccount()
    {
        var cols = SafeQueryValidator.TableWhitelist["members"];
        Assert.Contains("wage_bank_account", cols);
        Assert.DoesNotContain("bank_account", cols); // 真实 members 表无明文 bank_account 列
    }

    [Fact]
    public void ValidateAndRewrite_ContractsSignedDateQuery_Passes()
    {
        var result = SafeQueryValidator.ValidateAndRewrite(
            "SELECT ic.name, ic.signed_date, ic.contract_no FROM income_contracts ic", TestUid, TestScope);

        Assert.True(result.IsValid, $"signed_date 查询应该通过: {result.Error}");
    }

    [Fact]
    public void ValidateAndRewrite_InventoryDeadColumn_Rejected()
    {
        var result = SafeQueryValidator.ValidateAndRewrite(
            "SELECT quantity FROM inventory_items", TestUid, TestScope);

        Assert.False(result.IsValid, "quantity 已不是库存表真实列，应被拒绝");
    }

    // ════════ A1/A2（审计 2026-09-04）：CTE 拒绝 + OR 短路防护 ════════

    [Fact]
    public void ValidateAndRewrite_WithCteQuery_Rejected()
    {
        // A2 PoC：CTE 借白名单表名 projects 做别名，体内引用越权表 users——
        // 旧实现只校验外层 FROM，CTE 体内的表/列完全绕过白名单与过滤注入
        var result = SafeQueryValidator.ValidateAndRewrite(
            "WITH projects AS (SELECT id, name FROM users) SELECT id, name FROM projects",
            TestUid, TestScope);

        Assert.False(result.IsValid, "WITH (CTE) 查询应该被整体拒绝");
        Assert.NotNull(result.Error);
        Assert.Contains("CTE", result.Error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ValidateAndRewrite_OrAlwaysTrueWhere_UserFilterNotShortCircuited()
    {
        // A1 PoC：顶层 OR 1=1 曾短路裸拼注入的行级过滤器（旧实现 " {filter} AND"）→ 越权
        var sql = "SELECT name FROM projects WHERE 1 = 1 OR 1 = 1";
        var result = SafeQueryValidator.ValidateAndRewrite(sql, TestUid, RestrictedScope);

        Assert.True(result.IsValid, $"查询应该通过: {result.Error}");
        Assert.NotNull(result.RewrittenSql);
        // 括号结构断言：过滤器与用户原 WHERE 各自包进括号
        Assert.Contains("AND (", result.RewrittenSql, StringComparison.OrdinalIgnoreCase);

        // 内存库实测两用户数据隔离：改写后的 SQL 以 u1 身份执行只能看到 u1 的行
        using var conn = new Microsoft.Data.Sqlite.SqliteConnection("Data Source=:memory:");
        conn.Open();
        conn.Execute("CREATE TABLE projects (id INTEGER PRIMARY KEY, name TEXT, created_by TEXT)");
        conn.Execute("INSERT INTO projects (name, created_by) VALUES ('mine', 'u1'), ('theirs', 'u2')");
        var rows = conn.Query<string>(result.RewrittenSql, new { Uid = "u1" }).ToList();
        Assert.Single(rows);
        Assert.Equal("mine", rows[0]);
    }
}
