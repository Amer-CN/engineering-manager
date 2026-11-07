using System.Data;
using Dapper;
using EngineeringManager.Api.Security;

namespace EngineeringManager.Api;

/// <summary>
/// T6：按项目维度的只读金额聚合（成本台账 / 发票 / 结算）。
///
/// 口径（与库内真实类型一致）：
///   · invoices.amount                INTEGER 分
///   · cost_ledger.amount / settlements.amount  REAL 元（已知金额债务，聚合时 ROUND(x*100) 转分）→ INTEGER 分（053 分制迁移后统一为分，直接按分读）
/// 不新增字段、不引入第二个「项目」概念；项目唯一来源是 [projects]。
/// </summary>
public static class ProjectSummaryEndpoints
{
    public static void RegisterProjectSummaryEndpoints(this WebApplication app)
    {
        app.MapGet("/api/projects/financial-summary", (HttpContext ctx, IDbConnection db, long? projectId) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            // 与 GET /api/projects 同口径：projects 主键是 id，project_authorizations.project_id 引用它
            var filter = CurrentUser.UserFilterWithAuthorizedProjects(scope, "p.[id]", "p.[created_by]");
            var idClause = projectId.HasValue ? " AND p.[id]=@ProjectId" : "";

            var rows = db.Query($@"
                SELECT p.[id] AS ProjectId, p.[name] AS ProjectName,
                       COALESCE((SELECT SUM(c.[amount]) FROM [cost_ledger] c
                                 WHERE c.[project_id]=p.[id] AND c.[deleted_at] IS NULL), 0) AS CostFen,
                       (SELECT COUNT(*) FROM [cost_ledger] c
                        WHERE c.[project_id]=p.[id] AND c.[deleted_at] IS NULL) AS CostCount,
                       COALESCE((SELECT SUM(s.[amount]) FROM [settlements] s
                                 WHERE s.[project_id]=p.[id] AND s.[deleted_at] IS NULL), 0) AS SettlementFen,
                       (SELECT COUNT(*) FROM [settlements] s
                        WHERE s.[project_id]=p.[id] AND s.[deleted_at] IS NULL) AS SettlementCount,
                       COALESCE((SELECT SUM(i.[amount]) FROM [invoices] i
                                 WHERE i.[project_id]=p.[id] AND i.[deleted_at] IS NULL
                                   AND i.[status] NOT IN ('cancelled','red_flushed')), 0) AS InvoiceFen,
                       (SELECT COUNT(*) FROM [invoices] i
                        WHERE i.[project_id]=p.[id] AND i.[deleted_at] IS NULL
                          AND i.[status] NOT IN ('cancelled','red_flushed')) AS InvoiceCount
                FROM [projects] p
                WHERE {filter}{idClause}
                ORDER BY p.[id]",
                new { Uid = uid, ProjectId = projectId ?? 0 }).ToList();

            if (projectId.HasValue && rows.Count == 0)
                return Common.NotFound("项目不存在或无权访问");

            var result = rows.Select(r =>
            {
                long costFen = Convert.ToInt64(r.CostFen);
                long settlementFen = Convert.ToInt64(r.SettlementFen);
                long invoiceFen = Convert.ToInt64(r.InvoiceFen);
                return new
                {
                    projectId = Convert.ToInt64(r.ProjectId),
                    projectName = r.ProjectName as string,
                    costFen,
                    costAmount = costFen / 100m,
                    costCount = Convert.ToInt32(r.CostCount),
                    settlementFen,
                    settlementAmount = settlementFen / 100m,
                    settlementCount = Convert.ToInt32(r.SettlementCount),
                    invoiceFen,
                    invoiceAmount = invoiceFen / 100m,
                    invoiceCount = Convert.ToInt32(r.InvoiceCount)
                };
            }).ToList();

            return Common.Ok(result);
        });
    }
}
