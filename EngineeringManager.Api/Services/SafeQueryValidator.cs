using System.Data;
using System.Text.RegularExpressions;
using Dapper;

namespace EngineeringManager.Api.Services;

/// <summary>
/// 安全查询验证器 — 为 runSafeQuery 工具提供 SQL 校验、改写和审计
///
/// 功能：
///   1. 语句类型校验（仅允许单条 SELECT）
///   2. 表/列白名单校验
///   3. 危险构造检测
///   4. 强制注入用户过滤
///   5. 强制 LIMIT
///   6. 审计日志
/// </summary>
public static class SafeQueryValidator
{
    // ═══════════════════════════════════════════════════════════
    // 白名单定义
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 表名 → 允许查询的列名集合
    /// </summary>
    public static readonly Dictionary<string, HashSet<string>> TableWhitelist = new(StringComparer.OrdinalIgnoreCase)
    {
        ["projects"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "id", "name", "description", "address", "start_date", "end_date",
            "status", "budget", "created_by", "created_at", "updated_at"
        },
        ["members"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "id", "name", "phone", "email", "member_type", "role", "gender",
            "ethnicity", "birth_date", "base_salary", "daily_wage",
            "entry_date", "status", "department_id", "position", "created_by", "created_at"
        },
        ["workers"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "id", "name", "gender", "phone", "address", "worker_type",
            "daily_wage", "created_by", "created_at"
        },
        ["invoices"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "id", "project_id", "seller_id", "buyer_id", "contract_id",
            "settlement_id", "type", "invoice_kind", "invoice_no", "invoice_code",
            "name", "amount", "price_amount", "tax_rate", "tax_amount",
            "received_amount", "issue_date", "status", "remarks", "created_by", "created_at"
        },
        ["settlements"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "id", "project_id", "partner_id", "contract_id", "type",
            "amount", "settlement_date", "status", "remarks", "created_by", "created_at"
        },
        ["cost_ledger"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "id", "project_id", "batch_id", "voucher_no", "date", "direction",
            "category", "amount", "counterparty", "channel", "summary", "notes", "created_by", "created_at"
        },
        ["income_contracts"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "id", "project_id", "partner_id", "name", "type", "amount",
            "sign_date", "status", "remarks", "created_by", "created_at"
        },
        ["expense_contracts"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "id", "project_id", "partner_id", "name", "type", "amount",
            "sign_date", "status", "remarks", "created_by", "created_at"
        },
        ["inventory_items"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "id", "name", "category", "unit", "quantity", "min_quantity",
            "location", "notes", "created_by", "created_at"
        },
        ["partners"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "id", "name", "category", "contact", "phone", "email",
            "address", "tax_number", "credit_code", "created_by", "created_at"
        },
    };

    /// <summary>
    /// 公司级表（无 project_id，使用 UserFilterCompany）
    /// </summary>
    private static readonly HashSet<string> CompanyLevelTables = new(StringComparer.OrdinalIgnoreCase)
    {
        "projects", "members", "workers", "partners", "inventory_items"
    };

    /// <summary>
    /// 项目级表（有 project_id，使用 UserFilterWithAuthorizedProjects）
    /// </summary>
    private static readonly HashSet<string> ProjectLevelTables = new(StringComparer.OrdinalIgnoreCase)
    {
        "invoices", "settlements", "cost_ledger", "income_contracts", "expense_contracts"
    };

    // ═══════════════════════════════════════════════════════════
    // 禁止的关键字和构造
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// DDL/DML/危险关键字（不区分大小写）
    /// </summary>
    private static readonly HashSet<string> ForbiddenKeywords = new(StringComparer.OrdinalIgnoreCase)
    {
        "INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "ATTACH",
        "DETACH", "PRAGMA", "VACUUM", "REPLACE", "TRUNCATE", "GRANT", "REVOKE"
    };

    /// <summary>
    /// 禁止访问的系统表
    /// </summary>
    private static readonly HashSet<string> ForbiddenTables = new(StringComparer.OrdinalIgnoreCase)
    {
        "sqlite_master", "sqlite_temp_master", "sqlite_sequence",
        "users", "roles", "audit_logs", "llm_config", "llm-config"
    };

    /// <summary>
    /// 禁止的函数
    /// </summary>
    private static readonly HashSet<string> ForbiddenFunctions = new(StringComparer.OrdinalIgnoreCase)
    {
        "load_extension", "edit", "fts3", "fts4", "fts5"
    };

    // ═══════════════════════════════════════════════════════════
    // 公开方法
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 验证并改写 SQL 查询
    /// </summary>
    /// <param name="sql">原始 SQL</param>
    /// <param name="uid">当前用户 ID</param>
    /// <param name="isAdmin">是否管理员</param>
    /// <returns>验证结果，包含改写后的 SQL 或错误信息</returns>
    public static ValidationResult ValidateAndRewrite(string sql, string uid, int isAdmin)
    {
        // 1. 基本清理
        sql = sql.Trim().TrimEnd(';').Trim();

        if (string.IsNullOrWhiteSpace(sql))
            return new ValidationResult(false, null, null, "SQL 不能为空");

        // 2. 语句类型检查：必须是 SELECT
        if (!sql.StartsWith("SELECT", StringComparison.OrdinalIgnoreCase))
            return new ValidationResult(false, null, null, "只允许 SELECT 查询");

        // 3. 拒绝多语句
        if (sql.Contains(';'))
            return new ValidationResult(false, null, null, "不允许多条语句");

        // 4. 检查禁止关键字
        foreach (var keyword in ForbiddenKeywords)
        {
            // 使用单词边界匹配，避免误匹配列名中的子串
            if (Regex.IsMatch(sql, $@"\b{keyword}\b", RegexOptions.IgnoreCase))
                return new ValidationResult(false, null, null, $"禁止使用 {keyword} 关键字");
        }

        // 5. 检查禁止函数
        foreach (var func in ForbiddenFunctions)
        {
            if (Regex.IsMatch(sql, $@"\b{func}\s*\(", RegexOptions.IgnoreCase))
                return new ValidationResult(false, null, null, $"禁止使用 {func} 函数");
        }

        // 6. 检查 SELECT *（不允许，拦截 t.* / id, * / *, id 等变体，放行 COUNT(*)）
        // 提取 SELECT…FROM 之间的子句
        var selectMatch = Regex.Match(sql, @"SELECT\s+(.*?)\s+FROM", RegexOptions.IgnoreCase | RegexOptions.Singleline);
        if (selectMatch.Success)
        {
            var selectClause = selectMatch.Groups[1].Value;
            // 先剔除函数内的 (*)，避免 COUNT(*) 等被误伤
            var clause = Regex.Replace(selectClause, @"\(\s*\*\s*\)", "()");
            // 匹配独立的 * token（前面不是字母/数字/下划线/点，后面也不是字母/数字/下划线）
            if (Regex.IsMatch(clause, @"(?<![A-Za-z0-9_.])\*(?![A-Za-z0-9_])"))
                return new ValidationResult(false, null, null, "不允许 SELECT *，请明确指定列名");
            // 额外拦截 alias.* 形式（如 p.*）
            if (Regex.IsMatch(clause, @"\w+\.\s*\*"))
                return new ValidationResult(false, null, null, "不允许 SELECT *，请明确指定列名");
        }

        // 7. 提取并验证表名
        var referencedTables = ExtractTableNames(sql);
        if (referencedTables.Count == 0)
            return new ValidationResult(false, null, null, "未找到有效的表名");

        foreach (var table in referencedTables)
        {
            if (ForbiddenTables.Contains(table))
                return new ValidationResult(false, null, null, $"禁止访问表 {table}");

            if (!TableWhitelist.ContainsKey(table))
                return new ValidationResult(false, null, null, $"表 {table} 不在白名单中");
        }

        // 7.1 拒绝多表查询
        if (referencedTables.Count > 1)
            return new ValidationResult(false, null, null, "暂仅支持单表查询，请拆分后重试");

        // 7.2 拒绝子查询（SELECT 关键字出现超过 1 次即认定含子查询）
        var selectCount = 0;
        var upperSql = sql.ToUpperInvariant();
        for (var i = 0; i <= upperSql.Length - 6; i++)
        {
            if (upperSql[i] == 'S' && upperSql.Substring(i, 6) == "SELECT"
                && (i == 0 || !char.IsLetterOrDigit(upperSql[i - 1])))
            {
                selectCount++;
                if (selectCount > 1)
                    return new ValidationResult(false, null, null, "暂不支持子查询");
            }
        }

        // 8. 验证列名（强制列白名单校验）
        // 构造所有被引用表的白名单列并集
        var allowedColumns = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var table in referencedTables)
        {
            if (TableWhitelist.TryGetValue(table, out var cols))
            {
                foreach (var col in cols)
                    allowedColumns.Add(col);
            }
        }

        // 提取 SELECT 子句中的所有裸列引用并逐一校验
        var referencedColumns = ExtractColumnNames(sql);
        foreach (var col in referencedColumns)
        {
            if (col == "*") continue; // 已在步骤 6 或 FIX-3 拒绝
            if (!allowedColumns.Contains(col))
                return new ValidationResult(false, null, null, $"列 \"{col}\" 不在允许查询范围");
        }

        // 9. 强制注入用户过滤
        var rewrittenSql = InjectUserFilter(sql, referencedTables, uid, isAdmin);

        // 10. 强制 LIMIT
        rewrittenSql = EnsureLimit(rewrittenSql, 100);

        return new ValidationResult(true, rewrittenSql, referencedTables, null);
    }

    /// <summary>
    /// 获取表的过滤 SQL 片段
    /// </summary>
    public static string GetTableFilter(string table, string tableAlias = "")
    {
        var colPrefix = string.IsNullOrEmpty(tableAlias) ? "" : $"{tableAlias}.";
        var createdByCol = $"{colPrefix}created_by";

        if (CompanyLevelTables.Contains(table))
            return Security.CurrentUser.UserFilterCompany(createdByCol);

        if (ProjectLevelTables.Contains(table))
        {
            var projectCol = $"{colPrefix}project_id";
            return Security.CurrentUser.UserFilterWithAuthorizedProjects(projectCol, createdByCol);
        }

        // 默认使用公司级过滤
        return Security.CurrentUser.UserFilterCompany(createdByCol);
    }

    // ═══════════════════════════════════════════════════════════
    // 私有方法
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 从 SQL 中提取表名（简化版，处理常见的 FROM/JOIN 子句）
    /// </summary>
    private static HashSet<string> ExtractTableNames(string sql)
    {
        var tables = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // 匹配 FROM table 或 JOIN table
        var fromPattern = @"(?:FROM|JOIN)\s+(\w+)";
        var matches = Regex.Matches(sql, fromPattern, RegexOptions.IgnoreCase);

        foreach (Match match in matches)
        {
            if (match.Groups.Count > 1)
            {
                var tableName = match.Groups[1].Value;
                tables.Add(tableName);
            }
        }

        return tables;
    }

    /// <summary>
    /// 从 SELECT 子句中提取列名（简化版）
    /// </summary>
    private static HashSet<string> ExtractColumnNames(string sql)
    {
        var columns = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // 提取 SELECT 和 FROM 之间的内容
        var selectMatch = Regex.Match(sql, @"SELECT\s+(.*?)\s+FROM", RegexOptions.IgnoreCase | RegexOptions.Singleline);
        if (selectMatch.Success)
        {
            var selectClause = selectMatch.Groups[1].Value;
            // 简单分割逗号，去除别名和函数
            var parts = selectClause.Split(',');
            foreach (var part in parts)
            {
                var trimmed = part.Trim();
                // 跳过聚合函数
                if (Regex.IsMatch(trimmed, @"^\w+\s*\(", RegexOptions.IgnoreCase))
                    continue;

                // 提取列名（可能带表别名前缀）
                var colMatch = Regex.Match(trimmed, @"(?:\w+\.)?(\w+)$");
                if (colMatch.Success)
                {
                    var colName = colMatch.Groups[1].Value;
                    // 跳过 SQL 关键字
                    if (!IsSqlKeyword(colName))
                        columns.Add(colName);
                }
            }
        }

        return columns;
    }

    /// <summary>
    /// 注入用户过滤条件 — 只替换第一个顶层 WHERE，计算表别名
    /// </summary>
    private static string InjectUserFilter(string sql, HashSet<string> tables, string uid, int isAdmin)
    {
        // 从 FROM 子句解析表别名: 匹配 "FROM table [AS] alias" 或 "FROM table"
        var aliasMap = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        // SQL 关键字集合 — 匹配到的候选别名命中这些关键字则视为无别名
        var sqlKeywords = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "WHERE", "ORDER", "GROUP", "LIMIT", "HAVING", "AS", "ON", "JOIN",
            "INNER", "LEFT", "RIGHT", "OUTER", "CROSS", "FULL", "UNION",
            "INTO", "FROM", "AND", "OR", "NOT", "IN", "IS", "NULL",
            "BETWEEN", "LIKE", "EXISTS", "CASE", "WHEN", "THEN", "ELSE", "END"
        };

        foreach (var table in tables)
        {
            if (!TableWhitelist.ContainsKey(table)) continue;
            // 匹配 "FROM table alias" 或 "FROM table AS alias"（单词边界）
            var aliasMatch = Regex.Match(sql,
                $@"\b{table}\b\s+(?:AS\s+)?(\w+)", RegexOptions.IgnoreCase);
            if (aliasMatch.Success)
            {
                var candidate = aliasMatch.Groups[1].Value;
                // 排除 SQL 关键字，避免 WHERE/ORDER/LIMIT 等被误当别名
                if (!sqlKeywords.Contains(candidate))
                    aliasMap[table] = candidate;
            }
        }

        var filters = new List<string>();
        foreach (var table in tables)
        {
            if (TableWhitelist.ContainsKey(table))
            {
                var alias = aliasMap.TryGetValue(table, out var a) ? a : "";
                filters.Add(GetTableFilter(table, alias));
            }
        }

        if (filters.Count == 0)
            return sql;

        var filterClause = string.Join(" AND ", filters);

        // 只替换第一个顶层 WHERE
        var whereRegex = new Regex(@"\bWHERE\b", RegexOptions.IgnoreCase);
        if (whereRegex.IsMatch(sql))
        {
            return whereRegex.Replace(sql, $"WHERE {filterClause} AND", 1);
        }
        else
        {
            // 在 GROUP BY / ORDER BY / LIMIT 前插入 WHERE
            var insertPoint = Regex.Match(sql, @"\b(GROUP\s+BY|ORDER\s+BY|LIMIT)\b", RegexOptions.IgnoreCase);
            if (insertPoint.Success)
            {
                var pos = insertPoint.Index;
                return sql.Substring(0, pos) + $" WHERE {filterClause} " + sql.Substring(pos);
            }
            else
            {
                return sql + $" WHERE {filterClause}";
            }
        }
    }

    /// <summary>
    /// 确保 SQL 有 LIMIT 子句，且不超过最大值
    /// </summary>
    private static string EnsureLimit(string sql, int maxLimit)
    {
        var limitMatch = Regex.Match(sql, @"LIMIT\s+(\d+)", RegexOptions.IgnoreCase);

        if (limitMatch.Success)
        {
            var currentLimit = int.Parse(limitMatch.Groups[1].Value);
            if (currentLimit > maxLimit)
            {
                // 替换为最大限制
                return sql.Substring(0, limitMatch.Index) + $"LIMIT {maxLimit}" +
                       sql.Substring(limitMatch.Index + limitMatch.Length);
            }
            return sql;
        }
        else
        {
            // 没有 LIMIT，添加
            return sql + $" LIMIT {maxLimit}";
        }
    }

    /// <summary>
    /// 检查是否为 SQL 关键字
    /// </summary>
    private static bool IsSqlKeyword(string word)
    {
        var keywords = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "AS", "AND", "OR", "NOT", "IN", "ON", "IS", "NULL", "TRUE", "FALSE",
            "DISTINCT", "ALL", "CASE", "WHEN", "THEN", "ELSE", "END"
        };
        return keywords.Contains(word);
    }

    /// <summary>
    /// 记录审计日志
    /// </summary>
    public static void LogAudit(
        System.Data.IDbConnection db,
        string uid,
        string originalSql,
        string? rewrittenSql,
        bool success,
        string? error)
    {
        try
        {
            db.Execute(@"
                INSERT INTO audit_logs (action, level, user_id, resource, details, description, created_at)
                VALUES (@Action, @Level, @UserId, @Resource, @Details, @Description, @CreatedAt)",
                new
                {
                    Action = "safe_query",
                    Level = success ? "info" : "warning",
                    UserId = uid,
                    Resource = "agent_tool",
                    Details = $"Original: {originalSql}\nRewritten: {rewrittenSql}",
                    Description = success ? "Safe query executed" : $"Safe query rejected: {error}",
                    CreatedAt = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
                });
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[SafeQueryValidator] 审计日志写入失败: {ex.Message}");
        }
    }
}

/// <summary>
/// 验证结果
/// </summary>
public record ValidationResult(
    bool IsValid,
    string? RewrittenSql,
    HashSet<string>? ReferencedTables,
    string? Error
);
