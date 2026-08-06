using System.Data;
using System.Text.RegularExpressions;
using Dapper;
using SqlParser;
using SqlParser.Ast;
using SqlParser.Dialects;

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
    /// <summary>
    /// R6.1(G1): 表出现点（每个 FROM/JOIN 实例一条，含子查询合并），用于逐实例注入过滤——
    /// 同一张表多次引用（self-join / JOIN 同表）时每个实例都必须被过滤，
    /// Qualifier = 别名（有别名时）或表名（无别名时）。
    /// </summary>
    private readonly record struct TableOccurrence(string Qualifier, string Table, int Depth);
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
        "DETACH", "PRAGMA", "VACUUM", "TRUNCATE", "GRANT", "REVOKE"
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
    /// <param name="scope">数据范围(替代原 isAdmin 布尔)</param>
    /// <returns>验证结果，包含改写后的 SQL 或错误信息</returns>
    public static ValidationResult ValidateAndRewrite(string sql, string uid, Security.CurrentUser.DataScope scope)
    {
        // 1. 基本清理
        sql = sql.Trim().TrimEnd(';').Trim();

        if (string.IsNullOrWhiteSpace(sql))
            return new ValidationResult(false, null, null, "SQL 不能为空");

        // 2. AST 解析
        Sequence<Statement> statements;
        try
        {
            var options = new ParserOptions();
            var parser = new SqlQueryParser();
            statements = parser.Parse(sql, new SQLiteDialect(), options);
        }
        catch (Exception ex)
        {
            return new ValidationResult(false, null, null, $"SQL 解析失败: {ex.Message}");
        }

        // 3. 必须恰好一条语句且为 Query
        if (statements.Count != 1)
            return new ValidationResult(false, null, null, "不允许多条语句");

        var stmt = statements[0];
        Query query;
        try
        {
            query = stmt.AsQuery();
        }
        catch
        {
            return new ValidationResult(false, null, null, "只允许 SELECT 查询");
        }

        // 4. Body 必须是 Select（拒绝 SetOperation 如 UNION）
        Select select;
        try
        {
            select = query.Body.AsSelect();
        }
        catch
        {
            return new ValidationResult(false, null, null, "不支持 UNION/INTERSECT/EXCEPT 等集合操作");
        }

        // 4.5 R8.2(G21): CTE 主体零校验——WITH 子句的 Query 不在 select.From 里，从未被
        // CollectTables/ForbiddenTables 校验（PoC-C 实测：CTE 名伪装白名单表名穿透过滤读
        // settlements；PoC-D 实测：CTE 主体 FROM audit_logs 穿透 ForbiddenTables）。
        // fail-closed：一切 WITH 形态拒绝，文案与 7.6 同族并写明暂不支持。
        if (query.With != null)
        {
            return new ValidationResult(false, null, null,
                "暂不支持 WITH/CTE（R8.2 fail-closed）：CTE 主体无法被逐表校验（G21）。请将查询改写为普通 SELECT。");
        }

        // 5. ForbiddenKeywords 二次兜底（检查原始 SQL）
        foreach (var keyword in ForbiddenKeywords)
        {
            if (Regex.IsMatch(sql, $@"\b{keyword}\b", RegexOptions.IgnoreCase))
                return new ValidationResult(false, null, null, $"禁止使用 {keyword} 关键字");
        }

        // 6. ForbiddenFunctions 二次兜底
        foreach (var func in ForbiddenFunctions)
        {
            if (Regex.IsMatch(sql, $@"\b{func}\s*\(", RegexOptions.IgnoreCase))
                return new ValidationResult(false, null, null, $"禁止使用 {func} 函数");
        }

        // 7. 收集所有被引用表并校验
        var aliasToTable = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var referencedTables = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        // R6.1(G1): 逐实例出现点（self-join / JOIN 同表时每实例一条）
        var occurrences = new List<TableOccurrence>();

        try
        {
            CollectTables(select.From, aliasToTable, referencedTables, occurrences, 0);
        }
        catch (ValidationException ex)
        {
            return new ValidationResult(false, null, null, ex.Message);
        }

        if (referencedTables.Count == 0)
            return new ValidationResult(false, null, null, "未找到有效的表名");

        // 7.5 R6.5: 用户别名撞内部保留别名——验证层显式拒绝（可解释错误 + 审计），
        // 不让用户可控输入触达 CurrentUser guard throw。
        // R5.1 必答更正：此前 "FROM invoices pa_authz" 能一路触达 guard（fail-closed 但属
        // 意外路径，异常消息泄漏内部实现细节如 R5.2 黑名单）。现在验证层返回明确错误，
        // guard throw 退化为纯内部兜底（仅防御未来非用户输入路径）。
        foreach (var occ in occurrences)
        {
            var q = occ.Qualifier.Trim();
            while (q.Length >= 2
                   && ((q[0] == '[' && q[^1] == ']')
                       || (q[0] == '"' && q[^1] == '"')
                       || (q[0] == '`' && q[^1] == '`')))
                q = q.Substring(1, q.Length - 2).Trim();
            if (string.Equals(q, "pa_authz", StringComparison.OrdinalIgnoreCase)
                || string.Equals(q, "project_authorizations", StringComparison.OrdinalIgnoreCase))
            {
                return new ValidationResult(false, null, null,
                    $"别名 '{occ.Qualifier}' 与内部授权子查询保留别名冲突，请更换别名（R6.5 fail-closed）");
            }
        }

        // 8. 校验列白名单
        try
        {
            ValidateProjection(select.Projection, aliasToTable, referencedTables, occurrences, 0);
        }
        catch (ValidationException ex)
        {
            return new ValidationResult(false, null, null, ex.Message);
        }

        // 8.4 收集投影别名（供 ORDER BY / HAVING 引用放行）
        var projectionAliases = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var item in select.Projection)
        {
            if (item is SelectItem.ExpressionWithAlias ewa)
                projectionAliases.Add(ewa.Alias.Value);
        }

        // 8.5 校验 WHERE / GROUP BY / HAVING / ORDER BY（与投影同等的列/表/子查询校验）
        try
        {
            if (select.Selection != null)
                ValidateExpressionColumns(select.Selection, aliasToTable, referencedTables, occurrences, 0);

            // HAVING 引用投影别名时放行（SQLite 允许）
            if (!(select.Having is Expression.Identifier hid
                  && projectionAliases.Contains(hid.Ident.Value)))
            {
                if (select.Having != null)
                    ValidateExpressionColumns(select.Having, aliasToTable, referencedTables, occurrences, 0);
            }

            if (select.GroupBy is GroupByExpression.Expressions groupByExprs)
            {
                foreach (var ge in groupByExprs.ColumnNames)
                    ValidateExpressionColumns(ge, aliasToTable, referencedTables, occurrences, 0);
            }

            // ORDER BY 引用投影别名的标识符放行
            if (query.OrderBy != null)
            {
                foreach (var ob in query.OrderBy.Expressions)
                {
                    if (ob.Expression is Expression.Identifier oid
                        && projectionAliases.Contains(oid.Ident.Value))
                        continue;
                    ValidateExpressionColumns(ob.Expression, aliasToTable, referencedTables, occurrences, 0);
                }
            }
        }
        catch (ValidationException ex)
        {
            return new ValidationResult(false, null, null, ex.Message);
        }

        // 7.6 R7.1(b): 作用域穿透防护——子查询（深度>0）内的表在顶层 WHERE 注入不到
        // 自己的过滤（G11 PoC-1 实测 leaked=300 泄漏）。修复：深度>0 的 occurrence 一律
        // 拒绝整条查询（fail-closed + 明确文案）；顶层 occurrence 维持 R6.1 逐实例注入。
        // 代价：runSafeQuery 暂不支持子查询（Derived / IN / EXISTS / 标量子查询），
        // 工具描述已同步更新（AgentToolService.runSafeQuery）。
        // 位置说明（R7.1 实测修正）：IN/EXISTS/标量子查询的 occurrence 在【列校验阶段】
        // （ValidateProjection/ValidateExpressionColumns）递归收集，故本检查必须放在
        // 8.5 全部校验完成之后（Derived 在 CollectTables 阶段已收集，两种来源都覆盖）。
        var nestedOcc = occurrences.FirstOrDefault(o => o.Depth > 0);
        if (!nestedOcc.Equals(default(TableOccurrence)))
        {
            return new ValidationResult(false, null, null,
                $"嵌套查询暂不支持：子查询内的表 '{nestedOcc.Qualifier}'（深度 {nestedOcc.Depth}）无法在顶层注入过滤（R7.1 fail-closed）。请将查询拆分为单层 SELECT。");
        }

        // 9. 使用 AST 回写 SQL 作为基础
        var rewrittenSql = query.ToSql();

        // 10. 强制注入用户过滤（字符串层面，逐实例——R6.1 G1 修复）
        rewrittenSql = InjectUserFilterAstAware(rewrittenSql, occurrences, scope);

        // 11. 强制 LIMIT（字符串兜底）
        rewrittenSql = EnsureLimit(rewrittenSql, 100);

        return new ValidationResult(true, rewrittenSql, referencedTables, null);
    }

    /// <summary>
    /// 获取表的过滤 SQL 片段
    /// </summary>
    public static string GetTableFilter(Security.CurrentUser.DataScope scope, string table, string tableAlias = "")
    {
        // R5.1: 无别名时用【表名】做限定符（R4.1 守卫对裸列 fail-closed，生产路径不允许触达守卫 throw）。
        // 副作用：createdByCol 同样变为 "{table}.created_by"（SQLite 表名限定合法）。
        var colPrefix = string.IsNullOrEmpty(tableAlias) ? $"{table}." : $"{tableAlias}.";
        var createdByCol = $"{colPrefix}created_by";

        if (CompanyLevelTables.Contains(table))
            return Security.CurrentUser.UserFilterCompany(scope, createdByCol);

        if (ProjectLevelTables.Contains(table))
        {
            var projectCol = $"{colPrefix}project_id";
            return Security.CurrentUser.UserFilterWithAuthorizedProjects(scope, projectCol, createdByCol);
        }

        // 默认使用公司级过滤
        return Security.CurrentUser.UserFilterCompany(scope, createdByCol);
    }

    // ═══════════════════════════════════════════════════════════
    // 私有方法 — AST 遍历与校验
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 递归收集 FROM 和 JOIN 中出现的表，校验表名白名单。
    /// 对 Derived（子查询）递归校验内部 Select。
    /// </summary>
    private static void CollectTables(
        Sequence<TableWithJoins> fromClause,
        Dictionary<string, string> aliasToTable,
        HashSet<string> referencedTables,
        List<TableOccurrence> occurrences,
        int depth)
    {
        // R8.16.1(G32 补完): 顶层无 FROM 查询（SELECT 1 / SELECT 1 ORDER BY 1）→
        // fromClause 为 null → foreach 直接 NRE（此前仅防了 ValidateDerivedQuery 的调用点，
        // ValidateAndRewrite 步骤 7 的 CollectTables(select.From, ...) 未防，且该处 try 只
        // catch ValidationException，NRE 穿透整个校验器——探针 A/B 实测「校验异常: Object
        // reference...」）。在空引用点本身防，任何调用点传 null 都不再 NRE。
        // 注意：子查询路径的 null 由 ValidateDerivedQuery 的无表子查询 throw 显式拒绝
        // （不许 return 空过——空过会让 depth>0 的 occurrence 收不到，7.6 就拦不住）。
        if (fromClause == null) return;
        foreach (var tableWithJoins in fromClause)
        {
            CollectTableFromFactor(tableWithJoins.Relation, aliasToTable, referencedTables, occurrences, depth);

            if (tableWithJoins.Joins != null)
            {
                foreach (var join in tableWithJoins.Joins)
                {
                    CollectTableFromFactor(join.Relation, aliasToTable, referencedTables, occurrences, depth);
                }
            }
        }
    }

    /// <summary>
    /// 从单个 TableFactor 中提取表信息（R6.1: 每个出现点记入 occurrences——self-join 时每实例一条）
    /// </summary>
    private static void CollectTableFromFactor(
        TableFactor factor,
        Dictionary<string, string> aliasToTable,
        HashSet<string> referencedTables,
        List<TableOccurrence> occurrences,
        int depth)
    {
        if (factor is TableFactor.Table table)
        {
            var tableName = GetObjectNameSimpleName(table.Name);

            string? alias = null;
            if (table.Alias != null)
                alias = table.Alias.Name.Value;

            referencedTables.Add(tableName);
            occurrences.Add(new TableOccurrence(string.IsNullOrEmpty(alias) ? tableName : alias!, tableName, depth));

            if (!string.IsNullOrEmpty(alias))
                aliasToTable[alias] = tableName;

            if (ForbiddenTables.Contains(tableName))
                throw new ValidationException($"禁止访问表 {tableName}");

            if (!TableWhitelist.ContainsKey(tableName))
                throw new ValidationException($"表 {tableName} 不在白名单中");
        }
        else if (factor is TableFactor.Derived derived)
        {
            ValidateDerivedQuery(derived.SubQuery, aliasToTable, referencedTables, occurrences, depth + 1);
        }
        else
        {
            throw new ValidationException("不支持的表类型（子查询/表函数等）");
        }
    }

    /// <summary>
    /// 递归校验子查询（Derived 中的 SubQuery）
    /// </summary>
    private static void ValidateDerivedQuery(
        Query subQuery,
        Dictionary<string, string> parentAliasToTable,
        HashSet<string> parentReferencedTables,
        List<TableOccurrence> parentOccurrences,
        int depth)
    {
        Select subSelect;
        try
        {
            subSelect = subQuery.Body.AsSelect();
        }
        catch
        {
            throw new ValidationException("子查询中不支持集合操作");
        }

        // R8.15.2(G32): 无表子查询（如 SELECT 1 ORDER BY 1）→ subSelect.From 为 null →
        // CollectTables 的 foreach 直接 NRE（堆栈实测抛出点 CollectTables:380，被外层
        // catch 兜成「校验异常: Object reference...」文案）。此处显式 fail-closed，
        // 不许靠 catch 兜（NRE 文案会回传前端）。
        if (subSelect.From == null)
        {
            throw new ValidationException(
                "无表子查询暂不支持：子查询必须引用白名单内的表（R8.15.2 fail-closed）。");
        }
        CollectTables(subSelect.From, parentAliasToTable, parentReferencedTables, parentOccurrences, depth);
        ValidateProjection(subSelect.Projection, parentAliasToTable, parentReferencedTables, parentOccurrences, depth);

        // 额外校验子查询自己的 WHERE/GROUP/ORDER（嵌套子查询的场景）
        if (subSelect.Selection != null)
            ValidateExpressionColumns(subSelect.Selection, parentAliasToTable, parentReferencedTables, parentOccurrences, depth);
        if (subSelect.Having != null)
            ValidateExpressionColumns(subSelect.Having, parentAliasToTable, parentReferencedTables, parentOccurrences, depth);
        if (subSelect.GroupBy is GroupByExpression.Expressions gbSub)
        {
            foreach (var ge in gbSub.ColumnNames)
                ValidateExpressionColumns(ge, parentAliasToTable, parentReferencedTables, parentOccurrences, depth);
        }
        if (subQuery.OrderBy != null)
        {
            foreach (var ob in subQuery.OrderBy.Expressions)
                ValidateExpressionColumns(ob.Expression, parentAliasToTable, parentReferencedTables, parentOccurrences, depth);
        }
    }

    /// <summary>
    /// 校验 SELECT 投影列表中的列是否在白名单内
    /// </summary>
    private static void ValidateProjection(
        Sequence<SelectItem> projection,
        Dictionary<string, string> aliasToTable,
        HashSet<string> referencedTables,
        List<TableOccurrence> occurrences,
        int depth)
    {
        foreach (var item in projection)
        {
            if (item is SelectItem.Wildcard)
            {
                throw new ValidationException("不允许 SELECT *，请明确指定列名");
            }

            if (item is SelectItem.QualifiedWildcard)
            {
                throw new ValidationException("不允许 SELECT *，请明确指定列名");
            }

            Expression expr;
            if (item is SelectItem.UnnamedExpression unnamed)
            {
                expr = unnamed.Expression;
            }
            else if (item is SelectItem.ExpressionWithAlias aliased)
            {
                expr = aliased.Expression;
            }
            else
            {
                // R8.16.2(G35): fail-closed——未知 SelectItem 类型不再静默跳过列白名单校验
                // （R8.4 G23 在兄弟函数里的同款分支漏改）。若未来新增 SelectItem 子类型
                // 且未枚举，此 throw 会暴露并拒绝查询。
                throw new ValidationException(
                    $"不支持的投影项类型：{item.GetType().Name}（R8.16.2 fail-closed）");
            }

            ValidateExpressionColumns(expr, aliasToTable, referencedTables, occurrences, depth);
        }
    }

    /// <summary>
    /// 递归校验表达式中的 Identifier / CompoundIdentifier / Function
    /// </summary>
    private static void ValidateExpressionColumns(
        Expression expr,
        Dictionary<string, string> aliasToTable,
        HashSet<string> referencedTables,
        List<TableOccurrence> occurrences,
        int depth)
    {
        if (expr is Expression.Identifier ident)
        {
            var columnName = ident.Ident.Value;
            if (!IsColumnAllowedInAnyTable(columnName, referencedTables))
                throw new ValidationException($"列 \"{columnName}\" 不在允许查询范围");
        }
        else if (expr is Expression.CompoundIdentifier compound)
        {
            var idents = compound.Idents;
            if (idents.Count < 2)
            {
                var columnName = idents[0].Value;
                if (!IsColumnAllowedInAnyTable(columnName, referencedTables))
                    throw new ValidationException($"列 \"{columnName}\" 不在允许查询范围");
                return;
            }

            var columnName2 = idents[^1].Value;
            var tableRef = idents[^2].Value;

            if (aliasToTable.TryGetValue(tableRef, out var actualTable))
            {
                if (!IsColumnAllowedInTable(columnName2, actualTable))
                    throw new ValidationException($"列 \"{columnName2}\" 不在表 {actualTable} 允许查询范围");
            }
            else if (referencedTables.Contains(tableRef))
            {
                if (!IsColumnAllowedInTable(columnName2, tableRef))
                    throw new ValidationException($"列 \"{columnName2}\" 不在表 {tableRef} 允许查询范围");
            }
            else
            {
                if (!IsColumnAllowedInAnyTable(columnName2, referencedTables))
                    throw new ValidationException($"列 \"{columnName2}\" 不在允许查询范围");
            }
        }
        else if (expr is Expression.Function func)
        {
            var funcName = func.Name.ToSql();
            if (ForbiddenFunctions.Contains(funcName))
                throw new ValidationException($"禁止使用 {funcName} 函数");

            // 校验函数参数中的列引用（COUNT(*) 的 * 是 Wildcard，天然放行）
            if (func.Args is FunctionArguments.List argList)
            {
                foreach (var arg in argList.ArgumentList.Args)
                {
                    if (arg is FunctionArg.Unnamed unnamed)
                    {
                        if (unnamed.FunctionArgExpression is FunctionArgExpression.FunctionExpression fe)
                        {
                            ValidateExpressionColumns(fe.Expression, aliasToTable, referencedTables, occurrences, depth);
                        }
                    }
                }
            }
        }
        else if (expr is Expression.BinaryOp binOp)
        {
            ValidateExpressionColumns(binOp.Left, aliasToTable, referencedTables, occurrences, depth);
            ValidateExpressionColumns(binOp.Right, aliasToTable, referencedTables, occurrences, depth);
        }
        else if (expr is Expression.UnaryOp unaryOp)
        {
            ValidateExpressionColumns(unaryOp.Expression, aliasToTable, referencedTables, occurrences, depth);
        }
        else if (expr is Expression.Case caseExpr)
        {
            if (caseExpr.Operand != null)
                ValidateExpressionColumns(caseExpr.Operand, aliasToTable, referencedTables, occurrences, depth);
            foreach (var cond in caseExpr.Conditions)
                ValidateExpressionColumns(cond, aliasToTable, referencedTables, occurrences, depth);
            foreach (var res in caseExpr.Results)
                ValidateExpressionColumns(res, aliasToTable, referencedTables, occurrences, depth);
            if (caseExpr.ElseResult != null)
                ValidateExpressionColumns(caseExpr.ElseResult, aliasToTable, referencedTables, occurrences, depth);
        }
        else if (expr is Expression.Cast cast)
        {
            ValidateExpressionColumns(cast.Expression, aliasToTable, referencedTables, occurrences, depth);
        }
        else if (expr is Expression.Extract extract)
        {
            ValidateExpressionColumns(extract.Expression, aliasToTable, referencedTables, occurrences, depth);
        }
        else if (expr is Expression.Substring substring)
        {
            ValidateExpressionColumns(substring.Expression, aliasToTable, referencedTables, occurrences, depth);
            if (substring.SubstringFrom != null)
                ValidateExpressionColumns(substring.SubstringFrom, aliasToTable, referencedTables, occurrences, depth);
            if (substring.SubstringFor != null)
                ValidateExpressionColumns(substring.SubstringFor, aliasToTable, referencedTables, occurrences, depth);
        }
        else if (expr is Expression.InList inList)
        {
            ValidateExpressionColumns(inList.Expression, aliasToTable, referencedTables, occurrences, depth);
            foreach (var item in inList.List)
                ValidateExpressionColumns(item, aliasToTable, referencedTables, occurrences, depth);
        }
        else if (expr is Expression.InSubquery inSubquery)
        {
            ValidateExpressionColumns(inSubquery.Expression, aliasToTable, referencedTables, occurrences, depth);
            ValidateDerivedQuery(inSubquery.SubQuery, aliasToTable, referencedTables, occurrences, depth + 1);
        }
        else if (expr is Expression.Exists exists)
        {
            ValidateDerivedQuery(exists.SubQuery, aliasToTable, referencedTables, occurrences, depth + 1);
        }
        else if (expr is Expression.Between between)
        {
            ValidateExpressionColumns(between.Expression, aliasToTable, referencedTables, occurrences, depth);
            ValidateExpressionColumns(between.Low, aliasToTable, referencedTables, occurrences, depth);
            ValidateExpressionColumns(between.High, aliasToTable, referencedTables, occurrences, depth);
        }
        else if (expr is Expression.Like like)
        {
            ValidateExpressionColumns(like.Expression, aliasToTable, referencedTables, occurrences, depth);
            ValidateExpressionColumns(like.Pattern, aliasToTable, referencedTables, occurrences, depth);
        }
        else if (expr is Expression.IsNull isNull)
        {
            ValidateExpressionColumns(isNull.Expression, aliasToTable, referencedTables, occurrences, depth);
        }
        else if (expr is Expression.IsNotNull isNotNull)
        {
            ValidateExpressionColumns(isNotNull.Expression, aliasToTable, referencedTables, occurrences, depth);
        }
        else if (expr is Expression.IsTrue isTrue)
        {
            ValidateExpressionColumns(isTrue.Expression, aliasToTable, referencedTables, occurrences, depth);
        }
        else if (expr is Expression.IsNotTrue isNotTrue)
        {
            ValidateExpressionColumns(isNotTrue.Expression, aliasToTable, referencedTables, occurrences, depth);
        }
        else if (expr is Expression.IsFalse isFalse)
        {
            ValidateExpressionColumns(isFalse.Expression, aliasToTable, referencedTables, occurrences, depth);
        }
        else if (expr is Expression.IsNotFalse isNotFalse)
        {
            ValidateExpressionColumns(isNotFalse.Expression, aliasToTable, referencedTables, occurrences, depth);
        }
        else if (expr is Expression.IsUnknown isUnknown)
        {
            ValidateExpressionColumns(isUnknown.Expression, aliasToTable, referencedTables, occurrences, depth);
        }
        else if (expr is Expression.IsNotUnknown isNotUnknown)
        {
            ValidateExpressionColumns(isNotUnknown.Expression, aliasToTable, referencedTables, occurrences, depth);
        }
        else if (expr is Expression.IsDistinctFrom isDistinct)
        {
            ValidateExpressionColumns(isDistinct.Expression1, aliasToTable, referencedTables, occurrences, depth);
            ValidateExpressionColumns(isDistinct.Expression2, aliasToTable, referencedTables, occurrences, depth);
        }
        else if (expr is Expression.IsNotDistinctFrom isNotDistinct)
        {
            ValidateExpressionColumns(isNotDistinct.Expression1, aliasToTable, referencedTables, occurrences, depth);
            ValidateExpressionColumns(isNotDistinct.Expression2, aliasToTable, referencedTables, occurrences, depth);
        }
        else if (expr is Expression.Nested nested)
        {
            ValidateExpressionColumns(nested.Expression, aliasToTable, referencedTables, occurrences, depth);
        }
        else if (expr is Expression.Subquery subquery)
        {
            ValidateDerivedQuery(subquery.Query, aliasToTable, referencedTables, occurrences, depth + 1);
        }
        else if (expr is Expression.LiteralValue
                 || expr is Expression.Wildcard
                 || expr is Expression.QualifiedWildcard)
        {
            // R8.4 处置（补进枚举）：LiteralValue（标量常量：数字/字符串/布尔/NULL）、
            // Wildcard/QualifiedWildcard（如 COUNT(*) 参数）不含列引用、无数据范围风险，
            // 原注释「无需递归」声明的语义——补显式枚举让声明成为代码（14 个变红测试
            // 全系 LiteralValue 分支缺失所致，REPLACE 函数参数 / 1 = 1 / i.id = 3 等）。
        }
        else
        {
            // R8.4(G23): fail-closed default——未知表达式类型不再静默放行。
            // 静态推断会被 TDD 测试钉住：新增表达式类型若未枚举，此 throw 会暴露
            // （同时拒绝该查询，宁可 500/拒绝也不静默跳过列校验）。
            throw new ValidationException(
                $"不支持的表达式类型：{expr.GetType().Name}（R8.4 fail-closed，未枚举的表达式分支）");
        }
        // LiteralValue / Wildcard / QualifiedWildcard / 等不含列引用，无需递归
    }

    /// <summary>
    /// 检查列名是否在任一被引用表的白名单中
    /// </summary>
    private static bool IsColumnAllowedInAnyTable(string columnName, HashSet<string> referencedTables)
    {
        foreach (var table in referencedTables)
        {
            if (TableWhitelist.TryGetValue(table, out var cols) && cols.Contains(columnName))
                return true;
        }
        return false;
    }

    /// <summary>
    /// 检查列名是否在指定表的白名单中
    /// </summary>
    private static bool IsColumnAllowedInTable(string columnName, string tableName)
    {
        return TableWhitelist.TryGetValue(tableName, out var cols) && cols.Contains(columnName);
    }

    /// <summary>
    /// 从 ObjectName 中提取简单表名（忽略 schema）
    /// </summary>
    private static string GetObjectNameSimpleName(ObjectName name)
    {
        if (name.Values.Count > 0)
            return name.Values[^1].Value;
        return name.ToSql();
    }

    // ═══════════════════════════════════════════════════════════
    // SQL 改写（字符串层面，因为 AST 属性为 init-only）
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 注入用户过滤条件 — 使用 AST 收集的别名信息，
    /// 在字符串层面注入 WHERE 过滤。
    /// </summary>
    private static string InjectUserFilterAstAware(
        string sql,
        List<TableOccurrence> occurrences,
        Security.CurrentUser.DataScope scope)
    {
        var filters = new List<string>();

        // R6.1(G1): 逐实例注入——同一张白名单表多次引用（self-join / JOIN 同表 / 子查询合并）时，
        // 每个出现点都生成自己的过滤片段（无别名实例用表名限定、有别名用别名限定）。
        // 修复前：referencedTables 是 HashSet（同表折叠成一条）+ FirstOrDefault 只取第一个别名
        // → 第二个实例完全无过滤 → 他人数据经未过滤实例直接可读（R6.1(a) 实证）。
        foreach (var occ in occurrences)
        {
            if (!TableWhitelist.ContainsKey(occ.Table)) continue;
            filters.Add(GetTableFilter(scope, occ.Table, occ.Qualifier));
        }

        // R8.16.3(G36): 零过滤器兜底 fail-closed——拿不到过滤器就原样返回未注入过滤的
        // SQL 是 fail-open（若未来某表不在白名单分支漏判，整条查询无过滤执行）。
        // 改 throw ValidationException，由 ValidateAndRewrite 既有 catch 转 ValidationResult。
        if (filters.Count == 0)
            throw new ValidationException("未能为任何表生成过滤条件，拒绝执行（R8.16.3 fail-closed）");

        var filterClause = string.Join(" AND ", filters);

        // 使用括号深度感知的顶层关键字定位（R7.2: 在字面量掩码副本上定位——投影里的
        // 字符串字面量含 WHERE/LIMIT 等关键字会劫持注入点，G12 PoC-3 实测过滤被整段
        // 插进字面量、SQL 无任何过滤）
        var masked = MaskSqlLiterals(sql);
        var whereIdx = FindTopLevelKeyword(masked, "WHERE");
        if (whereIdx >= 0)
        {
            // R8.1(G20): 用户 WHERE 段整体括起——WHERE ({filterClause}) AND ({userWhere})。
            // 不括则 "WHERE (过滤) AND id = 0 OR 1 = 1" 被 OR 击穿恒真（G20 PoC-A/B 实测
            // 全表/直出 300）。userWhere 终点 = 顶层 GROUP/ORDER/LIMIT 最靠前者或串尾
            // （终点定位在掩码副本上算，偏移与原文一致——G12 教训）。
            var insertAt = whereIdx + "WHERE".Length;
            var gIdx = FindTopLevelKeyword(masked, "GROUP");
            var oIdx = FindTopLevelKeyword(masked, "ORDER");
            var lIdx = FindTopLevelKeyword(masked, "LIMIT");
            var ends = new[] { gIdx, oIdx, lIdx }.Where(x => x >= 0).ToArray();
            var whereEnd = ends.Length > 0 ? ends.Min() : sql.Length;
            var userWhere = sql.Substring(insertAt, whereEnd - insertAt);
            return sql.Substring(0, insertAt) + $" ({filterClause}) AND ({userWhere})" + sql.Substring(whereEnd);
        }

        // 无顶层 WHERE：在顶层 GROUP BY / ORDER BY / LIMIT 之前插入
        var groupIdx = FindTopLevelKeyword(masked, "GROUP");
        var orderIdx = FindTopLevelKeyword(masked, "ORDER");
        var limitIdx = FindTopLevelKeyword(masked, "LIMIT");
        var candidates = new[] { groupIdx, orderIdx, limitIdx }.Where(x => x >= 0).ToArray();
        var pos = candidates.Length > 0 ? candidates.Min() : -1;

        if (pos >= 0)
            return sql.Substring(0, pos) + $"WHERE {filterClause} " + sql.Substring(pos);
        return sql + $" WHERE {filterClause}";
    }

    /// <summary>
    /// R7.2(G12): 掩码单引号字符串字面量（保留长度与换行）——FindTopLevelKeyword/EnsureLimit
    /// 在掩码副本上定位偏移（偏移与原文一致），字面量内的 WHERE/LIMIT/GROUP/ORDER 不再劫持
    /// 注入点。SQLite 字符串字面量转义 = 双单引号（''）。
    /// </summary>
    private static string MaskSqlLiterals(string sql)
    {
        var chars = sql.ToCharArray();
        var i = 0;
        while (i < chars.Length)
        {
            if (chars[i] == '\'')
            {
                var j = i + 1;
                while (j < chars.Length)
                {
                    if (chars[j] == '\'')
                    {
                        if (j + 1 < chars.Length && chars[j + 1] == '\'') { j += 2; continue; } // '' 转义
                        break;
                    }
                    j++;
                }
                var end = j < chars.Length ? j : chars.Length - 1;
                for (var k = i; k <= end; k++)
                    if (chars[k] != '\n') chars[k] = ' ';
                i = end + 1;
            }
            else
            {
                i++;
            }
        }
        return new string(chars);
    }

    /// <summary>
    /// 返回顶层（括号深度 0）第一个关键字的位置，没有则 -1。
    /// 避免命中子查询内的同名关键字。
    /// </summary>
    private static int FindTopLevelKeyword(string sql, string keyword)
    {
        int depth = 0;
        for (int i = 0; i + keyword.Length <= sql.Length; i++)
        {
            var c = sql[i];
            if (c == '(') { depth++; continue; }
            if (c == ')') { depth--; continue; }
            if (depth != 0) continue;

            if (string.Compare(sql, i, keyword, 0, keyword.Length, StringComparison.OrdinalIgnoreCase) == 0
                && (i == 0 || !char.IsLetterOrDigit(sql[i - 1]))
                && (i + keyword.Length == sql.Length || !char.IsLetterOrDigit(sql[i + keyword.Length])))
            {
                return i;
            }
        }
        return -1;
    }

    /// <summary>
    /// 确保 SQL 有 LIMIT 子句，且不超过最大值（使用顶层 LIMIT 定位）
    /// </summary>
    private static string EnsureLimit(string sql, int maxLimit)
    {
        // R7.2(G12): 在字面量掩码副本上定位 LIMIT——投影字面量里的 'LIMIT 1' 不再被
        // 误认为真实 LIMIT 子句（PoC-4 实测过滤前无 LIMIT 保护全表返回）
        var limitIdx = FindTopLevelKeyword(MaskSqlLiterals(sql), "LIMIT");
        if (limitIdx < 0)
            return sql + $" LIMIT {maxLimit}";

        // 保留原始偏移，不要先 TrimStart，否则后续 Substring 偏移会算错
        var afterPos = limitIdx + "LIMIT".Length;
        var rest = sql.Substring(afterPos);

        // 兼容两种形式：LIMIT count / LIMIT offset, count
        var m = Regex.Match(rest, @"^(\s*)(\d+)(\s*,\s*(\d+))?");
        if (!m.Success)
            return sql + $" LIMIT {maxLimit}";

        var hasComma = m.Groups[4].Success;
        // 逗号形式 LIMIT offset, count → 取 count;否则取唯一的数字
        var currentLimit = int.Parse(hasComma ? m.Groups[4].Value : m.Groups[2].Value);
        if (currentLimit <= maxLimit)
            return sql;

        // 用绝对偏移精确替换整个 "<ws><offset?,><count>" 片段(m.Index 因 ^ 锚定恒为 0)
        var matchEnd = afterPos + m.Length;
        if (hasComma)
        {
            // 保留原 offset，仅把 count 压到 maxLimit
            var offset = m.Groups[2].Value;
            return sql.Substring(0, limitIdx) + $"LIMIT {offset}, {maxLimit}" + sql.Substring(matchEnd);
        }
        return sql.Substring(0, limitIdx) + $"LIMIT {maxLimit}" + sql.Substring(matchEnd);
    }

    // ═══════════════════════════════════════════════════════════
    // dry-run 预检
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// dry-run 预检 — 对改写后的 SQL 执行 EXPLAIN，验证语法和表/列存在性。
    /// 只读操作，不产生业务数据。异常则判定校验失败。
    /// </summary>
    public static string? DryRun(IDbConnection db, string rewrittenSql, object? queryParams = null)
    {
        try
        {
            if (queryParams != null)
                db.Execute($"EXPLAIN {rewrittenSql}", queryParams);
            else
                db.Execute($"EXPLAIN {rewrittenSql}");
            return null; // 成功，无错误
        }
        catch (Exception ex)
        {
            return $"SQL 预检失败: {Common.Sanitize(ex.Message)}";
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 审计日志
    // ═══════════════════════════════════════════════════════════

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
            // R6.5: 修正 INSERT 列——audit_logs 表无 description 列（表结构：action/level/
            // user_id/user_name/resource/resource_id/details/ip_address/created_at），
            // 旧语句含 description 列导致 INSERT 恒失败被 catch 吞掉、审计从未落库
            // （R6.5 测试首度暴露）。结果信息并入 details。
            db.Execute(@"
                INSERT INTO audit_logs (action, level, user_id, resource, details, created_at)
                VALUES (@Action, @Level, @UserId, @Resource, @Details, @CreatedAt)",
                new
                {
                    Action = "safe_query",
                    Level = success ? "info" : "warning",
                    UserId = uid,
                    Resource = "agent_tool",
                    Details = $"Original: {originalSql}\nRewritten: {rewrittenSql}\nResult: {(success ? "success" : $"rejected: {error}")}",
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

/// <summary>
/// 验证器内部抛出的校验异常，用于提前退出多层递归
/// </summary>
internal class ValidationException : Exception
{
    public ValidationException(string message) : base(message) { }
}