using System.Data;
using System.Text;
using Dapper;
using EngineeringManager.Api.Models;
using EngineeringManager.Api.Security;

namespace EngineeringManager.Api.Services;

/// <summary>
/// 报告生成服务 — 聚合 audit_logs + 业务 KPI，调用 LLM 生成 Markdown 报告
/// </summary>
public class ReportGenerationService
{
    private readonly ILlmChatService _llm;

    public ReportGenerationService(ILlmChatService llm)
    {
        _llm = llm;
    }

    // ═══════════════════════════════════════════════════════════
    // 公开方法
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 生成报告：聚合审计日志 + 业务 KPI → LLM 生成 Markdown
    /// </summary>
    public async Task<(bool success, string? markdown, string? error)> GenerateReportAsync(
        IDbConnection db, ReportRequest request, string userId, bool isAdmin)
    {
        try
        {
            // ⓪ Scope/Period 白名单校验（防拼写错误导致非预期分支）
            var validScopes = new[] { "all", "project", "user" };
            var validPeriods = new[] { "day", "week", "month" };
            if (!validScopes.Contains(request.Scope))
                return (false, null, $"无效的 scope 值：{Common.Sanitize(request.Scope ?? "null")}，允许: all/project/user");
            if (!validPeriods.Contains(request.Period))
                return (false, null, $"无效的 period 值：{Common.Sanitize(request.Period ?? "null")}，允许: day/week/month");

            // ① 权限校验：scope=all 仅 admin
            if (request.Scope == "all" && !isAdmin)
                return (false, null, "仅管理员可生成全系统报告");

            // B2 修复：scope=project 非 admin 需校验项目授权（创建者 OR 授权表）
            if (request.Scope == "project" && !isAdmin)
            {
                if (!request.ScopeId.HasValue)
                    return (false, null, "scope=project 时必须指定 scopeId");
                var isCreator = await db.ExecuteScalarAsync<int>(
                    "SELECT COUNT(*) FROM [projects] WHERE [id]=@ProjectId AND [created_by]=@UserId",
                    new { ProjectId = request.ScopeId.Value, UserId = userId });
                var isAuthorized = await db.ExecuteScalarAsync<int>(
                    "SELECT COUNT(*) FROM [project_authorizations] WHERE [project_id]=@ProjectId AND [user_id]=@UserId",
                    new { ProjectId = request.ScopeId.Value, UserId = userId });
                if (isCreator == 0 && isAuthorized == 0)
                    return (false, null, "无权访问该项目的报告数据");
            }

            // ② 聚合审计日志
            var auditData = await AggregateAuditLogsAsync(db, request, userId, isAdmin);

            // ③ 聚合业务 KPI（按 scope 过滤）
            var kpiData = await AggregateKpiAsync(db, request, userId, isAdmin);

            // ④ 组织 prompt
            var periodLabel = request.Period switch
            {
                "day" => "日报",
                "week" => "周报",
                "month" => "月报",
                _ => "报告"
            };

            var systemPrompt = $"你是工程管家报告助手，根据以下操作记录和业务数据生成{periodLabel}。" +
                "要求：使用 Markdown 格式，包含摘要、关键指标、操作明细、总结建议四个部分。" +
                "语言简洁专业，数据优先，避免空泛描述。";

            var userPrompt = BuildUserPrompt(request, auditData, kpiData, periodLabel);

            // ⑤ 调用 LLM
            var messages = new List<AgentMessage>
            {
                new() { Role = MessageRole.System, Content = systemPrompt },
                new() { Role = MessageRole.User, Content = userPrompt }
            };

            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
            var chatTask = _llm.ChatAsync(messages);
            var completed = await Task.WhenAny(chatTask, Task.Delay(Timeout.InfiniteTimeSpan, cts.Token));
            if (completed != chatTask)
                return (false, null, "报告生成超时（30s），请缩小时间范围或筛选条件后重试");
            var response = await chatTask;

            if (response?.Choices == null || response.Choices.Count == 0)
                return (false, null, "LLM 未返回有效内容，请重试");

            var content = response.Choices[0].Message?.Content;
            if (string.IsNullOrWhiteSpace(content))
                return (false, null, "LLM 返回内容为空，请重试");

            return (true, content.Trim(), null);
        }
        catch (OperationCanceledException)
        {
            return (false, null, "报告生成超时（30s），请缩小时间范围或筛选条件后重试");
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[ReportGeneration] 生成失败: {ex.Message}");
            return (false, null, $"报告生成失败: {Common.Sanitize(ex.Message)}");
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 私有方法
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 聚合审计日志：按 action/resource/user 分组统计 + 留痕明细（上限 50 条）
    /// </summary>
    private async Task<AuditAggregate> AggregateAuditLogsAsync(
        IDbConnection db, ReportRequest request, string userId, bool isAdmin)
    {
        var where = BuildAuditWhere(request, userId, isAdmin);
        var sql = where.sql;
        var param = where.param;

        // 分组统计：action
        var actionCounts = (await db.QueryAsync(
            $"SELECT [action], COUNT(*) AS [count] FROM [audit_logs] {sql} GROUP BY [action]", param)).ToList();

        // 分组统计：resource_type
        var resourceCounts = (await db.QueryAsync(
            $"SELECT [resource], COUNT(*) AS [count] FROM [audit_logs] {sql} GROUP BY [resource]", param)).ToList();

        // 分组统计：user
        var userCounts = (await db.QueryAsync(
            $"SELECT [user_id], [user_name], COUNT(*) AS [count] FROM [audit_logs] {sql} GROUP BY [user_id], [user_name] ORDER BY [count] DESC LIMIT 10",
            param)).ToList();

        // 留痕明细（上限 50 条）
        var details = (await db.QueryAsync(
            $"SELECT [action], [user_name], [resource], [resource_id], [details], [created_at] FROM [audit_logs] {sql} ORDER BY [created_at] DESC LIMIT 50",
            param)).ToList();

        // 总数
        var totalCount = await db.ExecuteScalarAsync<int>(
            $"SELECT COUNT(*) FROM [audit_logs] {sql}", param);

        return new AuditAggregate
        {
            TotalCount = totalCount,
            ActionCounts = actionCounts,
            ResourceCounts = resourceCounts,
            UserCounts = userCounts,
            Details = details,
        };
    }

    /// <summary>
    /// 聚合业务 KPI：合同/发票/结算/工资的 COUNT/SUM（按 scope 过滤防越权）
    /// </summary>
    private async Task<KpiAggregate> AggregateKpiAsync(IDbConnection db, ReportRequest request, string userId, bool isAdmin)
    {
        var (startDate, endDate) = ResolveDateRange(request);
        var param = new DynamicParameters();
        param.Add("StartDate", startDate);
        param.Add("EndDate", endDate);

        // 构建 scope 过滤条件（非 admin 不允许看全公司数据）
        var scopeFilter = "";
        if (request.Scope == "user" || (!isAdmin && request.Scope != "project"))
        {
            scopeFilter = " AND [created_by] = @UserId";
            param.Add("UserId", userId);
        }
        else if (request.Scope == "project" && request.ScopeId.HasValue)
        {
            // B2: 非 admin 的项目授权已在入口校验，此处安全地按 project_id 过滤
            scopeFilter = " AND [project_id] = @ScopeId";
            param.Add("ScopeId", request.ScopeId.Value);
        }
        // scope=all + isAdmin: 不加额外过滤

        var dateFilter = "[created_at] >= @StartDate AND [created_at] <= @EndDate";

        int contractCount = 0, invoiceCount = 0, settlementCount = 0, wageCount = 0;
        double contractAmount = 0, invoiceAmount = 0, settlementAmount = 0, wageAmount = 0;

        try
        {
            // 收入合同
            contractCount = await db.ExecuteScalarAsync<int>(
                $"SELECT COUNT(*) FROM [income_contracts] WHERE {dateFilter}{scopeFilter}", param);
            contractAmount = await db.ExecuteScalarAsync<double>(
                $"SELECT COALESCE(SUM([amount]), 0) FROM [income_contracts] WHERE {dateFilter}{scopeFilter}", param);

            // 发票
            invoiceCount = await db.ExecuteScalarAsync<int>(
                $"SELECT COUNT(*) FROM [invoices] WHERE {dateFilter}{scopeFilter}", param);
            invoiceAmount = await db.ExecuteScalarAsync<double>(
                $"SELECT COALESCE(SUM([amount]), 0) FROM [invoices] WHERE {dateFilter}{scopeFilter}", param);

            // 结算
            settlementCount = await db.ExecuteScalarAsync<int>(
                $"SELECT COUNT(*) FROM [settlements] WHERE {dateFilter}{scopeFilter}", param);
            settlementAmount = await db.ExecuteScalarAsync<double>(
                $"SELECT COALESCE(SUM([amount]), 0) FROM [settlements] WHERE {dateFilter}{scopeFilter}", param);

            // 工资
            wageCount = await db.ExecuteScalarAsync<int>(
                $"SELECT COUNT(*) FROM [wages] WHERE {dateFilter}{scopeFilter}", param);
            wageAmount = await db.ExecuteScalarAsync<double>(
                $"SELECT COALESCE(SUM([actual_wage]), 0) FROM [wages] WHERE {dateFilter}{scopeFilter}", param);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[ReportGeneration] KPI 聚合部分失败: {ex.Message}");
        }

        return new KpiAggregate
        {
            ContractCount = contractCount, ContractAmount = contractAmount,
            InvoiceCount = invoiceCount, InvoiceAmount = invoiceAmount,
            SettlementCount = settlementCount, SettlementAmount = settlementAmount,
            WageCount = wageCount, WageAmount = wageAmount,
        };
    }

    private static string BuildUserPrompt(
        ReportRequest request, AuditAggregate audit, KpiAggregate kpi, string periodLabel)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"请根据以下数据生成{periodLabel}（{request.StartDate} ~ {request.EndDate}）：");
        sb.AppendLine();

        // 审计汇总
        sb.AppendLine("## 操作日志汇总");
        sb.AppendLine($"总操作数: {audit.TotalCount}");
        sb.AppendLine();

        if (audit.ActionCounts.Count > 0)
        {
            sb.AppendLine("按操作类型:");
            foreach (var row in audit.ActionCounts)
                sb.AppendLine($"- {row.action}: {row.count} 次");
            sb.AppendLine();
        }

        if (audit.ResourceCounts.Count > 0)
        {
            sb.AppendLine("按资源类型:");
            foreach (var row in audit.ResourceCounts)
                sb.AppendLine($"- {row.resource_type}: {row.count} 次");
            sb.AppendLine();
        }

        if (audit.UserCounts.Count > 0)
        {
            sb.AppendLine("按用户:");
            foreach (var row in audit.UserCounts)
                sb.AppendLine($"- {row.user_name ?? row.user_id}: {row.count} 次");
            sb.AppendLine();
        }

        // 业务 KPI
        sb.AppendLine("## 业务指标");
        sb.AppendLine($"新签收入合同: {kpi.ContractCount} 份，金额 {kpi.ContractAmount:F2} 元");
        sb.AppendLine($"发票: {kpi.InvoiceCount} 张，金额 {kpi.InvoiceAmount:F2} 元");
        sb.AppendLine($"结算: {kpi.SettlementCount} 笔，金额 {kpi.SettlementAmount:F2} 元");
        sb.AppendLine($"工资: {kpi.WageCount} 条，实发 {kpi.WageAmount:F2} 元");
        sb.AppendLine();

        // 操作明细
        if (audit.Details.Count > 0)
        {
            sb.AppendLine("## 最近操作明细（最多 50 条）");
            foreach (var d in audit.Details)
            {
                sb.AppendLine($"- [{d.created_at}] {d.user_name} {d.action} {d.resource_type}({d.resource_id}) {d.details}");
            }
        }

        return sb.ToString();
    }

    /// <summary>
    /// 构建 audit_logs 查询的 WHERE 子句 + 参数
    /// </summary>
    private static (string sql, DynamicParameters param) BuildAuditWhere(
        ReportRequest request, string userId, bool isAdmin)
    {
        var param = new DynamicParameters();
        var conditions = new List<string>();

        // 时间范围
        var (startDate, endDate) = ResolveDateRange(request);
        conditions.Add("[created_at] >= @StartDate");
        conditions.Add("[created_at] <= @EndDate");
        param.Add("StartDate", startDate);
        param.Add("EndDate", endDate);

        // 作用域
        if (request.Scope == "user")
        {
            conditions.Add("[user_id] = @UserId");
            param.Add("UserId", userId);
        }
        else if (request.Scope == "project" && request.ScopeId.HasValue)
        {
            // B3 修复：audit_logs.resource_id 是具体资源 ID（发票/合同/工资…），不是 project_id。
            // 按项目筛审计日志语义不正确，改为按 user_id 过滤（非 admin）或不加额外过滤（admin）。
            if (!isAdmin)
            {
                conditions.Add("[user_id] = @UserId");
                param.Add("UserId", userId);
            }
            // admin + scope=project: 不加额外过滤（全量审计日志供 LLM 参考）
        }
        // scope=all: 不加额外过滤（admin only，已在入口校验）

        // action 过滤
        if (request.ActionFilter != null && request.ActionFilter.Length > 0)
        {
            var actionList = request.ActionFilter
                .Where(a => !string.IsNullOrWhiteSpace(a))
                .Take(20)
                .ToList();
            if (actionList.Count > 0)
            {
                var placeholders = string.Join(",", actionList.Select((_, i) => $"@Act{i}"));
                conditions.Add($"[action] IN ({placeholders})");
                for (int i = 0; i < actionList.Count; i++)
                    param.Add($"Act{i}", actionList[i]);
            }
        }

        var where = conditions.Count > 0 ? $"WHERE {string.Join(" AND ", conditions)}" : "";
        return (where, param);
    }

    private static (string startDate, string endDate) ResolveDateRange(ReportRequest request)
    {
        if (!string.IsNullOrEmpty(request.StartDate) && !string.IsNullOrEmpty(request.EndDate))
            return (request.StartDate, request.EndDate + " 23:59:59");

        var now = DateTime.Now;
        return request.Period switch
        {
            "day" => (now.ToString("yyyy-MM-dd"), now.ToString("yyyy-MM-dd") + " 23:59:59"),
            "week" => (now.AddDays(-7).ToString("yyyy-MM-dd"), now.ToString("yyyy-MM-dd") + " 23:59:59"),
            "month" => (now.AddMonths(-1).ToString("yyyy-MM-dd"), now.ToString("yyyy-MM-dd") + " 23:59:59"),
            _ => (now.AddDays(-7).ToString("yyyy-MM-dd"), now.ToString("yyyy-MM-dd") + " 23:59:59"),
        };
    }

    // ═══════════════════════════════════════════════════════════
    // 内部数据类型
    // ═══════════════════════════════════════════════════════════

    internal class AuditAggregate
    {
        public int TotalCount { get; set; }
        public List<dynamic> ActionCounts { get; set; } = new();
        public List<dynamic> ResourceCounts { get; set; } = new();
        public List<dynamic> UserCounts { get; set; } = new();
        public List<dynamic> Details { get; set; } = new();
    }

    internal class KpiAggregate
    {
        public int ContractCount { get; set; }
        public double ContractAmount { get; set; }
        public int InvoiceCount { get; set; }
        public double InvoiceAmount { get; set; }
        public int SettlementCount { get; set; }
        public double SettlementAmount { get; set; }
        public int WageCount { get; set; }
        public double WageAmount { get; set; }
    }
}

/// <summary>
/// 报告生成请求 DTO
/// </summary>
public record ReportRequest
{
    public string Period { get; init; } = "week"; // day | week | month
    public string? StartDate { get; init; }
    public string? EndDate { get; init; }
    public string Scope { get; init; } = "user"; // all | project | user
    public int? ScopeId { get; init; }
    public string[]? ActionFilter { get; init; }
}
