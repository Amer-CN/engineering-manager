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

            // ②③ 聚合：theme=wage 走工资台账专项聚合（替代审计+KPI 注入）；general 主题原逻辑逐字不动
            var isWageTheme = string.Equals(request.Theme, "wage", StringComparison.OrdinalIgnoreCase);
            AuditAggregate auditData;
            KpiAggregate kpiData;
            WageAggregate wageData;
            if (isWageTheme)
            {
                auditData = null!;
                kpiData = null!;
                wageData = await AggregateWageAsync(db, request, userId);
            }
            else
            {
                wageData = null!;
                // ② 聚合审计日志
                auditData = await AggregateAuditLogsAsync(db, request, userId, isAdmin);

                // ③ 聚合业务 KPI（按 scope 过滤）
                kpiData = await AggregateKpiAsync(db, request, userId, isAdmin);
            }

            // ④ 组织 prompt（format=chart 走图形版结构化数据节提示词，缺省 text 文本版一字不动；
            //    theme=wage 切工资专项提示词：标题带「（工资专项）」后缀，聚焦薪酬与用工成本）
            var periodLabel = request.Period switch
            {
                "day" => "日报",
                "week" => "周报",
                "month" => "月报",
                _ => "报告"
            };

            string systemPrompt;
            string userPrompt;
            if (isWageTheme)
            {
                systemPrompt = string.Equals(request.Format, "chart", StringComparison.OrdinalIgnoreCase)
                    ? BuildWageChartSystemPrompt(periodLabel)
                    : $"你是工程管家工资分析助手，基于以下工资台账聚合数据生成{periodLabel}。" +
                    "聚焦薪酬总额、项目分布、走势与用工构成；数据优先，禁止编造；" +
                    "要求：使用 Markdown 格式，包含摘要、关键指标、明细构成、总结建议四个部分（四部分结构照旧），" +
                    "标题需带「（工资专项）」后缀。语言简洁专业，避免空泛描述。";
                userPrompt = BuildWageUserPrompt(request, wageData, periodLabel);
            }
            else
            {
                systemPrompt = string.Equals(request.Format, "chart", StringComparison.OrdinalIgnoreCase)
                    ? BuildChartSystemPrompt(periodLabel)
                    : $"你是工程管家报告助手，根据以下操作记录和业务数据生成{periodLabel}。" +
                    "要求：使用 Markdown 格式，包含摘要、关键指标、操作明细、总结建议四个部分。" +
                    "语言简洁专业，数据优先，避免空泛描述。";
                userPrompt = BuildUserPrompt(request, auditData, kpiData, periodLabel);
            }

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
            Console.Error.WriteLine("[ReportGeneration] 报告生成超时（30s，已取消）");
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
        var filter = where.sql;
        var param = where.param;

        // 分组统计：action
        var actionCounts = (await db.QueryAsync(
            $"SELECT [action], COUNT(*) AS [count] FROM [audit_logs] {filter} GROUP BY [action]", param)).ToList();

        // 分组统计：resource
        var resourceCounts = (await db.QueryAsync(
            $"SELECT [resource], COUNT(*) AS [count] FROM [audit_logs] {filter} GROUP BY [resource]", param)).ToList();

        // 分组统计：user
        var userCounts = (await db.QueryAsync(
            $"SELECT [user_id], [user_name], COUNT(*) AS [count] FROM [audit_logs] {filter} GROUP BY [user_id], [user_name] ORDER BY [count] DESC LIMIT 10",
            param)).ToList();

        // 留痕明细（上限 50 条）
        var details = (await db.QueryAsync(
            $"SELECT [action], [user_name], [resource], [resource_id], [details], [created_at] FROM [audit_logs] {filter} ORDER BY [created_at] DESC LIMIT 50",
            param)).ToList();

        // 总数
        var totalCount = await db.ExecuteScalarAsync<int>(
            $"SELECT COUNT(*) FROM [audit_logs] {filter}", param);

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
        var (filter, param) = BuildKpiFilter(request, userId, isAdmin);

        int contractCount = 0, invoiceCount = 0, settlementCount = 0, wageCount = 0;
        double contractAmount = 0, invoiceAmount = 0, settlementAmount = 0, wageAmount = 0;

        try
        {
            // 收入合同
            contractCount = await db.ExecuteScalarAsync<int>(
                $"SELECT COUNT(*) FROM [income_contracts]{filter}", param);
            contractAmount = await db.ExecuteScalarAsync<double>(
                $"SELECT COALESCE(SUM([amount]), 0) FROM [income_contracts]{filter}", param);

            // 发票
            invoiceCount = await db.ExecuteScalarAsync<int>(
                $"SELECT COUNT(*) FROM [invoices]{filter}", param);
            invoiceAmount = await db.ExecuteScalarAsync<double>(
                $"SELECT COALESCE(SUM([amount]), 0) FROM [invoices]{filter}", param);

            // 结算
            settlementCount = await db.ExecuteScalarAsync<int>(
                $"SELECT COUNT(*) FROM [settlements]{filter}", param);
            settlementAmount = await db.ExecuteScalarAsync<double>(
                $"SELECT COALESCE(SUM([amount]), 0) FROM [settlements]{filter}", param);

            // 工资
            wageCount = await db.ExecuteScalarAsync<int>(
                $"SELECT COUNT(*) FROM [wages]{filter}", param);
            wageAmount = await db.ExecuteScalarAsync<double>(
                $"SELECT COALESCE(SUM([actual_wage]), 0) FROM [wages]{filter}", param);
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

    /// <summary>
    /// 工资专项聚合（theme=wage）：当期总额笔数 / 按项目 TOP8 / 近 6 期走势 / 用工构成 TOP6。
    /// 权限：沿用 CurrentUser.UserFilterWithAuthorizedProjects（照抄 WageEndpoints /api/wages/stats 的 where 组装模式）+ deleted_at IS NULL。
    /// 期间口径：照抄 ResolveDateRange（KPI 同款）映射到 wages.year_month（yyyy-MM）。
    /// 单位契约：库内分、出参元（ToYuan 换算）。
    /// </summary>
    private async Task<WageAggregate> AggregateWageAsync(IDbConnection db, ReportRequest request, string userId)
    {
        var aggregate = new WageAggregate();

        // 权限过滤：scope=all 仅 admin（入口已校验）→ 全量；其余按「本人创建 OR 授权项目」过滤
        var dataScope = request.Scope == "all"
            ? CurrentUser.DataScope.All
            : CurrentUser.DataScope.AuthorizedProjects;
        // 第三参必须带表前缀：查询②④ JOIN projects/members，裸 created_by 会二义性报错（对照 WageEndpoints.cs:372）
        var permFilter = CurrentUser.UserFilterWithAuthorizedProjects(dataScope, "w.project_id", "w.created_by");
        var param = new DynamicParameters();
        param.Add("Uid", userId);

        // 期间：request 起止日期 / Period → year_month 区间（照抄 ResolveDateRange 口径）
        var (startYm, endYm) = ResolveWageMonthRange(request);
        aggregate.StartYm = startYm;
        aggregate.EndYm = endYm;
        param.Add("StartYm", startYm);
        param.Add("EndYm", endYm);

        var baseWhere = $" WHERE {permFilter} AND [w].[deleted_at] IS NULL";
        var currentWhere = $"{baseWhere} AND [w].[year_month] BETWEEN @StartYm AND @EndYm";

        // ① 当期总额与笔数
        aggregate.TotalWageYuan = ToYuan(await db.ExecuteScalarAsync<long>(
            $"SELECT COALESCE(SUM([w].[actual_wage]), 0) FROM [wages] w{currentWhere}", param));
        aggregate.TotalCount = await db.ExecuteScalarAsync<int>(
            $"SELECT COUNT(*) FROM [wages] w{currentWhere}", param);

        // ② 按项目分布 TOP8（金额降序）
        aggregate.ProjectRows = (await db.QueryAsync(
            "SELECT [w].[project_id] AS [project_id], [p].[name] AS [project_name], " +
            "SUM([w].[actual_wage]) AS [total_fen], COUNT(*) AS [count] " +
            "FROM [wages] w LEFT JOIN [projects] p ON [w].[project_id] = [p].[id]" +
            $"{currentWhere} GROUP BY [w].[project_id], [p].[name] ORDER BY [total_fen] DESC LIMIT 8",
            param)).ToList();

        // ③ 近 6 期走势（期间止月向前取 6 期，升序输出）
        var trendRows = (await db.QueryAsync(
            "SELECT [w].[year_month] AS [ym], SUM([w].[actual_wage]) AS [total_fen], COUNT(*) AS [count] " +
            $"FROM [wages] w{baseWhere} AND [w].[year_month] <= @EndYm " +
            "GROUP BY [w].[year_month] ORDER BY [w].[year_month] DESC LIMIT 6",
            param)).ToList();
        trendRows.Reverse();
        aggregate.TrendRows = trendRows;

        // ④ 用工构成 TOP6：members.role（管理人员=职位 / 农民工=工种，见 003 迁移与 Member 类型定义）
        aggregate.CompositionRows = (await db.QueryAsync(
            "SELECT COALESCE(NULLIF([m].[role], ''), '未标注') AS [role_name], " +
            "SUM([w].[actual_wage]) AS [total_fen], COUNT(*) AS [count] " +
            "FROM [wages] w LEFT JOIN [members] m ON [w].[member_id] = [m].[id]" +
            $"{currentWhere} GROUP BY COALESCE(NULLIF([m].[role], ''), '未标注') " +
            "ORDER BY [total_fen] DESC LIMIT 6",
            param)).ToList();

        return aggregate;
    }

    /// <summary>
    /// 工资专项（theme=wage）期间换算：照抄 ResolveDateRange 口径，映射到 wages.year_month（yyyy-MM）。
    /// </summary>
    private static (string startYm, string endYm) ResolveWageMonthRange(ReportRequest request)
    {
        if (!string.IsNullOrEmpty(request.StartDate) && !string.IsNullOrEmpty(request.EndDate))
            return (ToYearMonth(request.StartDate), ToYearMonth(request.EndDate));

        var now = DateTime.Now;
        return request.Period switch
        {
            "day" => (YearMonthOf(now), YearMonthOf(now)),
            "week" => (YearMonthOf(now.AddDays(-7)), YearMonthOf(now)),
            "month" => (YearMonthOf(now.AddMonths(-1)), YearMonthOf(now)),
            _ => (YearMonthOf(now.AddDays(-7)), YearMonthOf(now)),
        };
    }

    private static string YearMonthOf(DateTime date) => date.ToString("yyyy-MM");

    /// <summary>日期字符串（yyyy-MM-dd）取前 7 位年月；不足 7 位原样返回。</summary>
    private static string ToYearMonth(string date) => date.Length >= 7 ? date.Substring(0, 7) : date;

    /// <summary>
    /// 构建 KPI 聚合过滤子句：参数化 conditions + string.Join 组装，仅插值本地构造的 filter，
    /// 所有值经 Dapper @参数传递（B1：不插值用户输入 / 字段名 / 排序名 / scope 原文）。
    /// internal 暴露以供单测校验各 scope/日期组合口径一致。
    /// </summary>
    internal static (string Filter, DynamicParameters Param) BuildKpiFilter(ReportRequest request, string userId, bool isAdmin)
    {
        var (startDate, endDate) = ResolveDateRange(request);
        var param = new DynamicParameters();
        var conditions = new List<string>();

        // ResolveDateRange 保证返回非空日期区间（请求日期或 Period 默认值）
        conditions.Add("[created_at] >= @StartDate");
        param.Add("StartDate", startDate);
        conditions.Add("[created_at] <= @EndDate");
        param.Add("EndDate", endDate);

        // scope 过滤（非 admin 不允许看全公司数据）
        if (request.Scope == "user" || (!isAdmin && request.Scope != "project"))
        {
            conditions.Add("[created_by] = @UserId");
            param.Add("UserId", userId);
        }
        else if (request.Scope == "project" && request.ScopeId.HasValue)
        {
            // B2: 非 admin 的项目授权已在入口校验，此处安全地按 project_id 过滤
            conditions.Add("[project_id] = @ScopeId");
            param.Add("ScopeId", request.ScopeId.Value);
        }
        // scope=all + isAdmin: 不加额外过滤

        var filter = conditions.Count == 0 ? string.Empty : " WHERE " + string.Join(" AND ", conditions);
        return (filter, param);
    }

    /// <summary>
    /// 图形版（format=chart）systemPrompt：要求 AI 产出结构化数据节
    /// （结论句标题 + 要点 + ```chart-* JSON 数据块），前端按块类型渲染整页图形版。
    /// </summary>
    private static string BuildChartSystemPrompt(string periodLabel)
    {
        return string.Join('\n',
            $"你是工程管家报告助手，根据操作记录和业务数据生成{periodLabel}（图形版）。",
            "输出 Markdown，结构规则：",
            $"1. 首行 `# {periodLabel}标题`，次行 `> 期间：{{起}}~{{止}}`；",
            "2. 3-4 个小节，每节：`## 结论句标题`（一句可从数据验证的判断，禁止中性名词）→ 2-4 行 `- 要点`；",
            "3. 每节末尾放一个图表数据块（三选一，按数据形状选）：",
            "```chart-trend\n{\"label\":\"...\",\"points\":[{\"x\":\"9/1\",\"y\":18},...]}\n```（时间序列 ≥5 点）",
            "```chart-waffle\n{\"title\":\"...\",\"rows\":[{\"name\":\"...\",\"value\":33},...]}\n```（占比 ≤6 类，value 为百分比）",
            "```chart-bars\n{\"title\":\"...\",\"rows\":[{\"name\":\"...\",\"value\":12345},...]}\n```（类目金额比较 ≤8 条）",
            "x 用短日期、y/value 用真实数字（金额单位元、计数不带单位），禁止编造数据；",
            "4. 结尾 `## 值得记住的数字` 节：3-4 行 `- {数字}｜{一行说明}`。",
            "语言简洁专业，数据优先。"
        );
    }

    /// <summary>
    /// 工资专项（theme=wage）图形版 systemPrompt：结构规则沿 BuildChartSystemPrompt（结论句小节 + chart 块），
    /// 形状固定映射：trend=月度工资走势（近 6 期，y=金额元）、bars=按项目工资 TOP（y=金额元）、
    /// waffle=用工/项目构成占比（value=百分比）；某形状数据不足可不产该块。
    /// </summary>
    private static string BuildWageChartSystemPrompt(string periodLabel)
    {
        return string.Join('\n',
            $"你是工程管家工资分析助手，根据工资台账聚合数据生成{periodLabel}（工资专项，图形版）。",
            "聚焦薪酬总额、按项目分布、逐月走势与用工构成。输出 Markdown，结构规则：",
            $"1. 首行 `# {periodLabel}标题（工资专项）`，次行 `> 期间：{{起}}~{{止}}`；",
            "2. 3-4 个小节，每节：`## 结论句标题`（一句可从数据验证的判断，禁止中性名词）→ 2-4 行 `- 要点`；",
            "3. 每节末尾放一个图表数据块（三选一，按数据形状选）：",
            "```chart-trend\n{\"label\":\"月度工资走势（近 6 期）\",\"points\":[{\"x\":\"2026-04\",\"y\":123456},...]}\n```（时间序列近 6 期，y=金额元，数据不足 5 期可不产该块）",
            "```chart-waffle\n{\"title\":\"用工构成\",\"rows\":[{\"name\":\"工种\",\"value\":33},...]}\n```（用工/项目构成占比，value 为百分比，≤6 类）",
            "```chart-bars\n{\"title\":\"按项目工资 TOP\",\"rows\":[{\"name\":\"项目名\",\"value\":12345},...]}\n```（按项目工资比较 ≤8 条，金额单位元）",
            "x 用月份或短日期、y/value 用真实数字（金额单位元、百分比不带 % 号），禁止编造数据；某形状数据不足时可不产该块；",
            "4. 结尾 `## 值得记住的数字` 节：3-4 行 `- {数字}｜{一行说明}`。",
            "语言简洁专业，数据优先。"
        );
    }

    /// <summary>
    /// 工资专项（theme=wage）userPrompt：只注入工资台账四组聚合（替代审计日志 + 综合 KPI），
    /// 风格与现有 KPI 注入一致：字段名 + 数值 + 单位元。
    /// </summary>
    private static string BuildWageUserPrompt(
        ReportRequest request, WageAggregate wage, string periodLabel)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"请根据以下工资台账聚合数据生成{periodLabel}（工资专项）" +
            $"（{request.StartDate} ~ {request.EndDate}，工资月份 {wage.StartYm} ~ {wage.EndYm}）：");
        sb.AppendLine();

        // 当期总额与笔数
        sb.AppendLine("## 工资总额");
        sb.AppendLine($"当期实发工资: {wage.TotalWageYuan:F2} 元，工资条数: {wage.TotalCount} 笔");
        sb.AppendLine();

        // 按项目分布 TOP8
        if (wage.ProjectRows.Count > 0)
        {
            sb.AppendLine("## 按项目分布 TOP8（金额降序）");
            foreach (var r in wage.ProjectRows)
            {
                var name = (string?)r.project_name;
                sb.AppendLine($"- {(string.IsNullOrWhiteSpace(name) ? $"项目 #{(long)r.project_id}" : name)}" +
                    $": {ToYuan(Convert.ToInt64(r.total_fen)):F2} 元（{r.count} 笔）");
            }
            sb.AppendLine();
        }

        // 近 6 期走势
        if (wage.TrendRows.Count > 0)
        {
            sb.AppendLine("## 近 6 期工资走势（按月升序）");
            foreach (var r in wage.TrendRows)
                sb.AppendLine($"- {r.ym}: {ToYuan(Convert.ToInt64(r.total_fen)):F2} 元（{r.count} 笔）");
            sb.AppendLine();
        }

        // 用工构成 TOP6
        if (wage.CompositionRows.Count > 0)
        {
            sb.AppendLine("## 用工构成 TOP6（按工种/岗位）");
            foreach (var r in wage.CompositionRows)
                sb.AppendLine($"- {r.role_name}: {ToYuan(Convert.ToInt64(r.total_fen)):F2} 元（{r.count} 笔）");
            sb.AppendLine();
        }

        return sb.ToString();
    }

    // 单位契约：库内分、出参元（与 WageEndpoints.ToYuan 同口径）
    private static decimal ToYuan(long fen) => fen / 100m;

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
                sb.AppendLine($"- {row.resource}: {row.count} 次");
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
                sb.AppendLine($"- [{d.created_at}] {d.user_name} {d.action} {d.resource}({d.resource_id}) {d.details}");
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

    /// <summary>工资专项聚合结果（金额一律元，聚合查询内为分、出参前经 ToYuan 换算）</summary>
    internal class WageAggregate
    {
        public decimal TotalWageYuan { get; set; }
        public int TotalCount { get; set; }
        public string StartYm { get; set; } = string.Empty;
        public string EndYm { get; set; } = string.Empty;
        public List<dynamic> ProjectRows { get; set; } = new();
        public List<dynamic> TrendRows { get; set; } = new();
        public List<dynamic> CompositionRows { get; set; } = new();
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
    /// <summary>报告形式：text=文本版（缺省，旧调用方零影响）；chart=图形版（结构化数据节）</summary>
    public string Format { get; init; } = "text"; // text | chart
    /// <summary>报告主题：general=综合经营（缺省，全链路零改动）；wage=工资专项（工资台账聚合注入）</summary>
    public string Theme { get; init; } = "general"; // general | wage
}
