using System.Data;
using System.Text.Json;
using Dapper;
using EngineeringManager.Api.Models;
using EngineeringManager.Api.Security;
using Microsoft.AspNetCore.Http;

namespace EngineeringManager.Api.Services;

/// <summary>
/// Agent 工具服务 — 注册与管理 OpenAI function calling 工具
///
/// 每个工具声明：
///   - Name / Description / Parameters（LLM 用）
///   - RequiredPermission（用户权限校验）
///   - Execute 逻辑（SQL 查询 + 结果脱敏）
///
/// 二次权限校验：GetAvailableTools 按用户权限过滤；ExecuteTool 不信任 LLM 返回的工具名再次校验
/// </summary>
public class AgentToolService
{
    private readonly List<AgentTool> _allTools;

    public AgentToolService()
    {
        _allTools = BuildToolRegistry();
    }

    /// <summary>
    /// 根据当前用户权限返回可用工具列表（OpenAI function calling 格式）
    /// </summary>
    public List<object> GetAvailableTools(HttpContext ctx)
    {
        var userPermissions = GetUserPermissions(ctx);

        return _allTools
            .Where(t => string.IsNullOrEmpty(t.RequiredPermission)
                        || userPermissions.Contains(t.RequiredPermission))
            .Select(t => new
            {
                type = "function",
                function = new
                {
                    name = t.Name,
                    description = t.Description,
                    parameters = t.Parameters,
                }
            })
            .Cast<object>()
            .ToList();
    }

    /// <summary>
    /// 执行工具 — 二次权限校验（不信任 LLM 返回的工具名）
    /// </summary>
    public async Task<ToolCallResult> ExecuteToolAsync(
        string toolName,
        JsonElement arguments,
        HttpContext ctx,
        IDbConnection db)
    {
        var tool = _allTools.FirstOrDefault(t => t.Name == toolName);
        if (tool == null)
            return new ToolCallResult
            {
                ToolName = toolName,
                ToolCallId = "",
                Success = false,
                Error = $"未知工具: {toolName}",
            };

        // 二次权限校验
        var userPermissions = GetUserPermissions(ctx);
        if (!string.IsNullOrEmpty(tool.RequiredPermission)
            && !userPermissions.Contains(tool.RequiredPermission))
        {
            return new ToolCallResult
            {
                ToolName = toolName,
                ToolCallId = "",
                Success = false,
                Error = $"权限不足：需要 {tool.RequiredPermission}",
            };
        }

        try
        {
            var uid = CurrentUser.GetUserId(ctx) ?? "";
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var canReadPii = CurrentUser.CanReadPii(ctx);

            object? result = toolName switch
            {
                "getDashboardStats" => await ExecuteGetDashboardStats(db, uid, isAdmin),
                "getProjects" => await ExecuteGetProjects(db, uid, isAdmin),
                "getProjectDetail" => await ExecuteGetProjectDetail(db, arguments, uid, isAdmin),
                "getInvoices" => await ExecuteGetInvoices(db, arguments, uid, isAdmin),
                "getPendingInvoices" => await ExecuteGetPendingInvoices(db, uid, isAdmin),
                "getSettlements" => await ExecuteGetSettlements(db, arguments, uid, isAdmin),
                "getPendingSettlements" => await ExecuteGetPendingSettlements(db, uid, isAdmin),
                "getMembers" => await ExecuteGetMembers(db, uid, isAdmin, canReadPii),
                "getWorkers" => await ExecuteGetWorkers(db, uid, isAdmin, canReadPii),
                "getContracts" => await ExecuteGetContracts(db, arguments, uid, isAdmin),
                "getInventory" => await ExecuteGetInventory(db),
                "getCostSummary" => await ExecuteGetCostSummary(db, arguments, uid, isAdmin),
                "getPartners" => await ExecuteGetPartners(db, uid, isAdmin),
                _ => null,
            };

            // PII 脱敏
            if (result != null && tool.PiiFields.Length > 0)
            {
                result = MaskPiiInResult(result, tool.PiiFields, canReadPii);
            }

            return new ToolCallResult
            {
                ToolName = toolName,
                ToolCallId = "",
                Success = true,
                Result = result,
            };
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[AgentToolService] 执行工具 {toolName} 失败: {ex.Message}");
            return new ToolCallResult
            {
                ToolName = toolName,
                ToolCallId = "",
                Success = false,
                Error = $"工具执行失败: {Common.Sanitize(ex.Message)}",
            };
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 工具执行方法
    // ═══════════════════════════════════════════════════════════

    private static Task<object> ExecuteGetDashboardStats(IDbConnection db, string uid, int isAdmin)
    {
        var projectsCount = db.ExecuteScalar<int>("SELECT COUNT(*) FROM projects");
        var membersCount = db.ExecuteScalar<int>("SELECT COUNT(*) FROM members");
        var workersCount = db.ExecuteScalar<int>("SELECT COUNT(*) FROM workers");
        var invoicesCount = db.ExecuteScalar<int>("SELECT COUNT(*) FROM invoices");
        var settlementsCount = db.ExecuteScalar<int>("SELECT COUNT(*) FROM settlements");
        var inProgressProjects = db.ExecuteScalar<int>("SELECT COUNT(*) FROM projects WHERE status='active'");
        var totalIncome = db.ExecuteScalar<double>("SELECT COALESCE(SUM(amount), 0) FROM cost_ledger WHERE direction='income'");
        var totalExpense = db.ExecuteScalar<double>("SELECT COALESCE(SUM(amount), 0) FROM cost_ledger WHERE direction='expense'");

        var recentProjects = db.Query(@"
            SELECT id, name, status FROM projects
            ORDER BY created_at DESC LIMIT 5
        ").ToList();

        return Task.FromResult<object>(new
        {
            projectsCount, membersCount, workersCount, invoicesCount,
            settlementsCount, inProgressProjects, totalIncome, totalExpense,
            recentProjects,
        });
    }

    private static Task<object> ExecuteGetProjects(IDbConnection db, string uid, int isAdmin)
    {
        var filter = CurrentUser.UserFilterCompany("p.created_by");
        var projects = db.Query($@"
            SELECT p.id, p.name, p.status, p.start_date, p.end_date, p.budget,
                   m.name as projectManager
            FROM projects p
            LEFT JOIN members m ON p.project_manager_id = m.id
            WHERE {filter}
            ORDER BY p.created_at DESC
            LIMIT 20
        ", new { Uid = uid, IsAdmin = isAdmin }).ToList();

        return Task.FromResult<object>(projects);
    }

    private static Task<object> ExecuteGetProjectDetail(IDbConnection db, JsonElement args, string uid, int isAdmin)
    {
        var projectId = GetIntArg(args, "projectId");
        var filter = CurrentUser.UserFilterWithAuthorizedProjects("p.id", "p.created_by");

        var project = db.QueryFirstOrDefault($@"
            SELECT p.*, m.name as project_manager_name
            FROM projects p
            LEFT JOIN members m ON p.project_manager_id = m.id
            WHERE p.id = @Id AND ({filter})
        ", new { Id = projectId, Uid = uid, IsAdmin = isAdmin });

        return Task.FromResult<object>(project ?? new { error = "项目不存在" });
    }

    private static Task<object> ExecuteGetInvoices(IDbConnection db, JsonElement args, string uid, int isAdmin)
    {
        var projectId = GetOptionalIntArg(args, "projectId");
        var filter = projectId.HasValue
            ? CurrentUser.UserFilterWithAuthorizedProjects("i.project_id", "i.created_by")
            : CurrentUser.UserFilterCompany("i.created_by");

        var sql = $@"
            SELECT i.id, i.invoice_no, i.name, i.amount, i.status, i.issue_date,
                   i.project_id, p.name as project_name
            FROM invoices i
            LEFT JOIN projects p ON i.project_id = p.id
            WHERE {filter}
            {(projectId.HasValue ? " AND i.project_id = @ProjectId" : "")}
            ORDER BY i.created_at DESC
            LIMIT 30
        ";

        var invoices = db.Query(sql,
            new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId }).ToList();

        return Task.FromResult<object>(invoices);
    }

    private static Task<object> ExecuteGetPendingInvoices(IDbConnection db, string uid, int isAdmin)
    {
        var filter = CurrentUser.UserFilterWithAuthorizedProjects("i.project_id", "i.created_by");
        var invoices = db.Query($@"
            SELECT i.id, i.invoice_no, i.name, i.amount, i.status, i.issue_date,
                   p.name as project_name
            FROM invoices i
            LEFT JOIN projects p ON i.project_id = p.id
            WHERE i.status = 'pending' AND ({filter})
            ORDER BY i.created_at DESC
            LIMIT 30
        ", new { Uid = uid, IsAdmin = isAdmin }).ToList();

        return Task.FromResult<object>(invoices);
    }

    private static Task<object> ExecuteGetSettlements(IDbConnection db, JsonElement args, string uid, int isAdmin)
    {
        var projectId = GetOptionalIntArg(args, "projectId");
        var filter = projectId.HasValue
            ? CurrentUser.UserFilterWithAuthorizedProjects("s.project_id", "s.created_by")
            : CurrentUser.UserFilterCompany("s.created_by");

        var sql = $@"
            SELECT s.id, s.name, s.amount, s.status, s.date,
                   s.project_id, p.name as project_name
            FROM settlements s
            LEFT JOIN projects p ON s.project_id = p.id
            WHERE {filter}
            {(projectId.HasValue ? " AND s.project_id = @ProjectId" : "")}
            ORDER BY s.created_at DESC
            LIMIT 30
        ";

        var settlements = db.Query(sql,
            new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId }).ToList();

        return Task.FromResult<object>(settlements);
    }

    private static Task<object> ExecuteGetPendingSettlements(IDbConnection db, string uid, int isAdmin)
    {
        var filter = CurrentUser.UserFilterWithAuthorizedProjects("s.project_id", "s.created_by");
        var settlements = db.Query($@"
            SELECT s.id, s.name, s.amount, s.status, s.date,
                   p.name as project_name
            FROM settlements s
            LEFT JOIN projects p ON s.project_id = p.id
            WHERE s.status = 'pending' AND ({filter})
            ORDER BY s.created_at DESC
            LIMIT 30
        ", new { Uid = uid, IsAdmin = isAdmin }).ToList();

        return Task.FromResult<object>(settlements);
    }

    private static Task<object> ExecuteGetMembers(IDbConnection db, string uid, int isAdmin, bool canReadPii)
    {
        var filter = CurrentUser.UserFilterCompany("m.created_by");
        var members = db.Query($@"
            SELECT m.id, m.name, m.phone, m.member_type, m.role, m.status, m.id_card, m.bank_account
            FROM members m
            WHERE {filter}
            ORDER BY m.created_at DESC
            LIMIT 30
        ", new { Uid = uid, IsAdmin = isAdmin }).ToList();

        return Task.FromResult<object>(members);
    }

    private static Task<object> ExecuteGetWorkers(IDbConnection db, string uid, int isAdmin, bool canReadPii)
    {
        var filter = CurrentUser.UserFilterCompany("w.created_by");
        var workers = db.Query($@"
            SELECT w.id, w.name, w.phone, w.worker_type, w.daily_wage,
                   w.id_card, w.bank_account, w.address
            FROM workers w
            WHERE {filter}
            ORDER BY w.created_at DESC
            LIMIT 30
        ", new { Uid = uid, IsAdmin = isAdmin }).ToList();

        return Task.FromResult<object>(workers);
    }

    private static Task<object> ExecuteGetContracts(IDbConnection db, JsonElement args, string uid, int isAdmin)
    {
        var projectId = GetOptionalIntArg(args, "projectId");

        // income_contracts
        var incomeFilter = projectId.HasValue
            ? CurrentUser.UserFilterWithAuthorizedProjects("ic.project_id", "ic.created_by")
            : CurrentUser.UserFilterCompany("ic.created_by");

        var income = db.Query($@"
            SELECT 'income' as type, ic.id, ic.name, ic.amount, ic.counterparty,
                   ic.sign_date, ic.status, p.name as project_name
            FROM income_contracts ic
            LEFT JOIN projects p ON ic.project_id = p.id
            WHERE {incomeFilter}
            {(projectId.HasValue ? " AND ic.project_id = @ProjectId" : "")}
            ORDER BY ic.created_at DESC
            LIMIT 15
        ", new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId }).ToList();

        var expenseFilter = projectId.HasValue
            ? CurrentUser.UserFilterWithAuthorizedProjects("ec.project_id", "ec.created_by")
            : CurrentUser.UserFilterCompany("ec.created_by");

        var expense = db.Query($@"
            SELECT 'expense' as type, ec.id, ec.name, ec.amount, ec.counterparty,
                   ec.sign_date, ec.status, p.name as project_name
            FROM expense_contracts ec
            LEFT JOIN projects p ON ec.project_id = p.id
            WHERE {expenseFilter}
            {(projectId.HasValue ? " AND ec.project_id = @ProjectId" : "")}
            ORDER BY ec.created_at DESC
            LIMIT 15
        ", new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId }).ToList();

        return Task.FromResult<object>(new { incomeContracts = income, expenseContracts = expense });
    }

    private static Task<object> ExecuteGetInventory(IDbConnection db)
    {
        var items = db.Query(@"
            SELECT id, name, category, unit, quantity, min_quantity, location
            FROM inventory_items
            ORDER BY name
            LIMIT 30
        ").ToList();

        return Task.FromResult<object>(items);
    }

    private static Task<object> ExecuteGetCostSummary(IDbConnection db, JsonElement args, string uid, int isAdmin)
    {
        var projectId = GetOptionalIntArg(args, "projectId");

        var whereClause = projectId.HasValue
            ? $"WHERE project_id = {projectId.Value}"
            : "";

        var byCategory = db.Query($@"
            SELECT category, SUM(amount) as total
            FROM cost_ledger
            {whereClause}
            GROUP BY category
            ORDER BY total DESC
            LIMIT 20
        ").ToList();

        var totalIncome = db.ExecuteScalar<double>($@"
            SELECT COALESCE(SUM(amount), 0) FROM cost_ledger
            WHERE direction = 'income'
            {(projectId.HasValue ? $" AND project_id = {projectId.Value}" : "")}
        ");

        var totalExpense = db.ExecuteScalar<double>($@"
            SELECT COALESCE(SUM(amount), 0) FROM cost_ledger
            WHERE direction = 'expense'
            {(projectId.HasValue ? $" AND project_id = {projectId.Value}" : "")}
        ");

        return Task.FromResult<object>(new
        {
            totalIncome,
            totalExpense,
            netTotal = totalIncome - totalExpense,
            byCategory,
            projectId,
        });
    }

    private static Task<object> ExecuteGetPartners(IDbConnection db, string uid, int isAdmin)
    {
        var filter = CurrentUser.UserFilterCompany("p.created_by");
        var partners = db.Query($@"
            SELECT p.id, p.name, p.category, p.contact, p.phone, p.bank_account
            FROM partners p
            WHERE {filter}
            ORDER BY p.created_at DESC
            LIMIT 30
        ", new { Uid = uid, IsAdmin = isAdmin }).ToList();

        return Task.FromResult<object>(partners);
    }

    // ═══════════════════════════════════════════════════════════
    // 辅助方法
    // ═══════════════════════════════════════════════════════════

    private static HashSet<string> GetUserPermissions(HttpContext ctx)
    {
        var roleClaims = ctx.User?.FindAll(System.Security.Claims.ClaimTypes.Role);
        if (roleClaims == null) return new HashSet<string>();

        foreach (var c in roleClaims)
        {
            var roleId = c.Value switch
            {
                "管理员" or "admin" => "admin",
                "经理" or "manager" => "manager",
                "财务" or "accountant" => "accountant",
                "工人" or "worker" => "worker",
                _ => null,
            };
            if (roleId != null)
            {
                var perms = Common.GetDefaultPermissions(roleId);
                return new HashSet<string>(perms);
            }
        }

        return new HashSet<string>();
    }

    private static long GetIntArg(JsonElement args, string name)
    {
        if (args.TryGetProperty(name, out var prop) && prop.ValueKind == JsonValueKind.Number)
            return prop.GetInt64();
        throw new InvalidOperationException($"缺少参数: {name}");
    }

    private static long? GetOptionalIntArg(JsonElement args, string name)
    {
        if (args.TryGetProperty(name, out var prop) && prop.ValueKind == JsonValueKind.Number)
            return prop.GetInt64();
        return null;
    }

    /// <summary>
    /// PII 脱敏：遍历结果对象，对指定字段进行脱敏
    /// DapperRow / FastExpando 实现了 IDictionary&lt;string, object&gt;，
    /// 用字典写入而非反射 SetValue（反射对只读属性无效）
    /// </summary>
    private static object MaskPiiInResult(object result, string[] piiFields, bool canReadPii)
    {
        if (canReadPii) return result;

        // 对列表中的每行进行脱敏
        if (result is IEnumerable<object> list)
        {
            var masked = new List<object>();
            foreach (var item in list)
            {
                masked.Add(MaskPiiRow(item, piiFields));
            }
            return masked;
        }

        // 单条记录
        return MaskPiiRow(result, piiFields);
    }

    private static object MaskPiiRow(object row, string[] piiFields)
    {
        // DapperRow / FastExpando 都实现了 IDictionary<string, object>
        if (row is IDictionary<string, object> dict)
        {
            foreach (var field in piiFields)
            {
                if (dict.TryGetValue(field, out var val) && val is string str && !string.IsNullOrEmpty(str))
                {
                    dict[field] = Common.MaskPiiField(field, str, false);
                }
            }
            return dict;
        }

        // fallback：匿名对象或其他类型，转成可修改的字典
        var props = row.GetType().GetProperties();
        var newDict = new Dictionary<string, object?>();
        foreach (var prop in props)
        {
            var val = prop.GetValue(row);
            if (piiFields.Contains(prop.Name) && val is string str && !string.IsNullOrEmpty(str))
            {
                newDict[prop.Name] = Common.MaskPiiField(prop.Name, str, false);
            }
            else
            {
                newDict[prop.Name] = val;
            }
        }
        return newDict;
    }

    // ═══════════════════════════════════════════════════════════
    // 工具注册表
    // ═══════════════════════════════════════════════════════════

    private static List<AgentTool> BuildToolRegistry()
    {
        var registry = new List<AgentTool>();

        // 通用 JSON Schema 构建辅助
        JsonElement BuildParams(Dictionary<string, object> properties, string[]? required = null)
        {
            var schema = new Dictionary<string, object>
            {
                ["type"] = "object",
                ["properties"] = properties,
            };
            if (required != null && required.Length > 0)
                schema["required"] = required;

            var json = JsonSerializer.Serialize(schema);
            return JsonDocument.Parse(json).RootElement;
        }

        // 1. getDashboardStats
        registry.Add(new AgentTool
        {
            Name = "getDashboardStats",
            Description = "获取仪表盘统计数据：项目数、成员数、工人数、发票数、结算数、进行中项目数、总收入/总支出、最近项目列表",
            Parameters = BuildParams(new Dictionary<string, object>()),
            RequiredPermission = "dashboard:read",
            PiiFields = Array.Empty<string>(),
        });

        // 2. getProjects
        registry.Add(new AgentTool
        {
            Name = "getProjects",
            Description = "获取项目列表：项目名称、状态、日期、预算、项目经理",
            Parameters = BuildParams(new Dictionary<string, object>()),
            RequiredPermission = "projects:read",
            PiiFields = Array.Empty<string>(),
        });

        // 3. getProjectDetail
        registry.Add(new AgentTool
        {
            Name = "getProjectDetail",
            Description = "获取单个项目的详细信息，需提供项目 ID",
            Parameters = BuildParams(new Dictionary<string, object>
            {
                ["projectId"] = new { type = "integer", description = "项目 ID" },
            }, new[] { "projectId" }),
            RequiredPermission = "projects:read",
            PiiFields = Array.Empty<string>(),
        });

        // 4. getInvoices
        registry.Add(new AgentTool
        {
            Name = "getInvoices",
            Description = "获取发票列表，可按项目筛选",
            Parameters = BuildParams(new Dictionary<string, object>
            {
                ["projectId"] = new { type = "integer", description = "项目 ID（可选）" },
            }),
            RequiredPermission = "invoices:read",
            PiiFields = Array.Empty<string>(),
        });

        // 5. getPendingInvoices
        registry.Add(new AgentTool
        {
            Name = "getPendingInvoices",
            Description = "获取所有待处理发票",
            Parameters = BuildParams(new Dictionary<string, object>()),
            RequiredPermission = "invoices:read",
            PiiFields = Array.Empty<string>(),
        });

        // 6. getSettlements
        registry.Add(new AgentTool
        {
            Name = "getSettlements",
            Description = "获取结算记录列表，可按项目筛选",
            Parameters = BuildParams(new Dictionary<string, object>
            {
                ["projectId"] = new { type = "integer", description = "项目 ID（可选）" },
            }),
            RequiredPermission = "settlement:read",
            PiiFields = Array.Empty<string>(),
        });

        // 7. getPendingSettlements
        registry.Add(new AgentTool
        {
            Name = "getPendingSettlements",
            Description = "获取所有待处理结算",
            Parameters = BuildParams(new Dictionary<string, object>()),
            RequiredPermission = "settlement:read",
            PiiFields = Array.Empty<string>(),
        });

        // 8. getMembers
        registry.Add(new AgentTool
        {
            Name = "getMembers",
            Description = "获取成员列表：姓名、电话、类型、角色、状态",
            Parameters = BuildParams(new Dictionary<string, object>()),
            RequiredPermission = "members:read",
            PiiFields = new[] { "id_card", "phone", "bank_account" },
        });

        // 9. getWorkers
        registry.Add(new AgentTool
        {
            Name = "getWorkers",
            Description = "获取工人列表：姓名、电话、工种、日薪",
            Parameters = BuildParams(new Dictionary<string, object>()),
            RequiredPermission = "labor:read",
            PiiFields = new[] { "id_card", "phone", "bank_account" },
        });

        // 10. getContracts
        registry.Add(new AgentTool
        {
            Name = "getContracts",
            Description = "获取合同列表（收入+支出），可按项目筛选",
            Parameters = BuildParams(new Dictionary<string, object>
            {
                ["projectId"] = new { type = "integer", description = "项目 ID（可选）" },
            }),
            RequiredPermission = "contracts:read",
            PiiFields = Array.Empty<string>(),
        });

        // 11. getInventory
        registry.Add(new AgentTool
        {
            Name = "getInventory",
            Description = "获取库存物料列表：名称、分类、单位、数量",
            Parameters = BuildParams(new Dictionary<string, object>()),
            RequiredPermission = "inventory:read",
            PiiFields = Array.Empty<string>(),
        });

        // 12. getCostSummary
        registry.Add(new AgentTool
        {
            Name = "getCostSummary",
            Description = "获取成本汇总：总收入/总支出、按分类统计，可按项目筛选",
            Parameters = BuildParams(new Dictionary<string, object>
            {
                ["projectId"] = new { type = "integer", description = "项目 ID（可选）" },
            }),
            RequiredPermission = "costLedger:read",
            PiiFields = Array.Empty<string>(),
        });

        // 13. getPartners
        registry.Add(new AgentTool
        {
            Name = "getPartners",
            Description = "获取合作伙伴列表：名称、分类、联系人、电话",
            Parameters = BuildParams(new Dictionary<string, object>()),
            RequiredPermission = "partners:read",
            PiiFields = new[] { "phone", "bank_account" },
        });

        return registry;
    }
}