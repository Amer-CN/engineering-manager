using System.Data;
using Dapper;
using EngineeringManager.Api.Security;

namespace EngineeringManager.Api;

/// <summary>
/// 杂项端点：项目工人批量 / 发票状态变更
/// </summary>
public static class ProjectWorkerMiscEndpoints
{
    public static void RegisterProjectWorkerMiscEndpoints(this WebApplication app)
    {
        app.MapPost("/api/project-workers/batch", async (HttpContext ctx, List<ProjectWorkerDto> records, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B5: 项目工人批量添加 → members:create
            if (!CurrentUser.HasPermission(ctx, db, "members:create")) return Results.Forbid();
            var count = 0;
            foreach (var dto in records)
            {
                await db.ExecuteAsync(@"INSERT INTO project_workers (worker_id,project_id,team_id,daily_wage,worker_type,entry_date,status,created_by,created_at, last_modified_at, contract_signer,contract_start,contract_end,safety_training,work_section,exit_date)
VALUES (@WorkerId,@ProjectId,@TeamId,@DailyWage,@WorkerType,@EntryDate,'active',@CreatedBy,@Now, @Now, @ContractSigner,@ContractStart,@ContractEnd,@SafetyTraining,@WorkSection,@ExitDate)",
                    new { dto.WorkerId, dto.ProjectId, dto.TeamId, DailyWage = MoneyUnit.ToFen(dto.DailyWage), dto.WorkerType, dto.EntryDate, CreatedBy = uid, Now = Common.NowString(),
                          dto.ContractSigner, dto.ContractStart, dto.ContractEnd,
                          SafetyTraining = dto.SafetyTraining == true ? 1 : 0,
                          dto.WorkSection, dto.ExitDate,
                    });
                count++;
            }
            return Common.Ok(new { count });
        });

        app.MapPut("/api/project-workers", async (HttpContext ctx, ProjectWorkerDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B5: 项目工人写操作 → members:update
            if (!CurrentUser.HasPermission(ctx, db, "members:update")) return Results.Forbid();
            // R9-22 批次 4 B36：B 桶形态翻转——现状 WHERE created_by/IsAdmin（授权跨人 403），
            // 对齐方案丙：预读行归属 → Classify 单点裁决 → 授权跨人可改（403→200）+ 同事务 audit。
            // 预读行归属（C# 单点裁决归属，SQL WHERE 不再含 created_by/IsAdmin）。
            // 注：现状该端点对任何请求恒 500（UPDATE 含 @Now 但参数对象从未传 Now，Dapper 抛
            // InvalidOperationException）——授权跨人 403 只是「从未被执行到的声明语义」，本轮
            // 修复顺带补传 Now 使端点首次可用（与 B12/B19 的差异，见 FREEZE-CONTRACT 批次 4 登记）。
            var row = db.QueryFirstOrDefault(
                "SELECT created_by, project_id FROM project_workers WHERE id=@Id",
                new { Id = dto.Id ?? 0 });
            // 行不存在 → 403（Ok/Forbid 收尾语义保持，未引入 WriteResult 404）
            if (row == null) return Results.Forbid();
            // 归属裁决：Denied → 403；AllowedViaAuthorization → 跨人修改落 audit（同事务 fail-closed）
            var createdBy = row.created_by as string;
            var projectId = row.project_id as long?;
            var access = RowWriteGate.Classify(ctx, db, createdBy, projectId);
            if (access == RowWriteOutcome.Denied) return Results.Forbid();

            // 归属条件移出 SQL（C# 单点裁决）；无锁列故无 409 档、WHERE 只留 id
            // （列集照原样：team_id/daily_wage/worker_type/entry_date/status + version+1/last_modified_at；
            //  daily_wage 2026-09 分制契约：API 元 → MoneyUnit.ToFen 转分落库；补传 Now——见上注）
            using var tx = db.BeginTransaction();
            var affected = await db.ExecuteAsync(@"UPDATE project_workers SET team_id=@TeamId,daily_wage=@DailyWage,worker_type=@WorkerType,entry_date=@EntryDate,status=@Status,
contract_signer=COALESCE(@ContractSigner, contract_signer),contract_start=COALESCE(@ContractStart, contract_start),contract_end=COALESCE(@ContractEnd, contract_end),
safety_training=COALESCE(@SafetyTraining, safety_training),work_section=COALESCE(@WorkSection, work_section),exit_date=COALESCE(@ExitDate, exit_date),
 version=version+1, last_modified_at=@Now WHERE id=@Id",
                new { dto.Id, dto.TeamId, DailyWage = MoneyUnit.ToFen(dto.DailyWage), dto.WorkerType, dto.EntryDate, dto.Status, Now = Common.NowString(),
                dto.ContractSigner, dto.ContractStart, dto.ContractEnd,
                SafetyTraining = dto.SafetyTraining.HasValue ? (int?)(dto.SafetyTraining.Value ? 1 : 0) : (int?)null,
                dto.WorkSection, dto.ExitDate,
                }, tx);
            if (access == RowWriteOutcome.AllowedViaAuthorization)
            {
                // 跨人修改落审计（fail-closed：审计写不进 → 事务回滚 → 修改不生效）
                AuditWriter.CrossUserEdit(db, tx, ctx, "project_workers", dto.Id ?? 0, "PUT /api/project-workers", createdBy, projectId);
            }
            tx.Commit();
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapPut("/api/invoices/{id}/status", async (HttpContext ctx, long id, InvoiceStatusDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B4: 发票状态切换 → invoices:update
            if (!CurrentUser.HasPermission(ctx, db, "invoices:update")) return Results.Forbid();
            // R9-12 方案丙更新侧：授权项目跨人可改 + audit（B37）
            // 预读行归属（C# 单点裁决归属，SQL WHERE 不再含 created_by/IsAdmin）。
            // 本端点无 G75 项目门（无 CanWriteProject），分层 = HasPermission → Classify；
            // invoices 无锁列，故无 409 档；预读不加 deleted_at，与现状 WHERE 一致（Pin8 钉住）。
            // FP06 快捷路径门控需库内 status + invoice_kind + invoice_medium（Wave 1B-1 第 2 轮，
            // P0-a' 阶段 1 补介质维度：kind=NULL + medium=electronic 也必须拦截）
            var row = db.QueryFirstOrDefault(
                "SELECT created_by, project_id, status, invoice_kind, invoice_medium FROM [invoices] WHERE id=@Id",
                new { Id = id });
            // 行不存在 → 维持现状「不存在=403」语义（Pin8 钉住，未改 WriteResult 的 404）
            if (row == null) return Results.Forbid();
            // 归属裁决：Denied → 403；AllowedViaAuthorization → 跨人修改落 audit（同事务 fail-closed）
            var createdBy = row.created_by as string;
            var projectId = row.project_id as long?;
            var access = RowWriteGate.Classify(ctx, db, createdBy, projectId);
            if (access == RowWriteOutcome.Denied) return Results.Forbid();

            // FP06 快捷路径门控（Wave 1B-1 第 2 轮 / P0-a' 阶段 1）：该 DTO 仅含 Status，天然无法携带
            // 原蓝票关联；生效介质取库内 invoice_medium（electronic 忽略大小写），legacy kind 兜底；
            // 空 medium/kind 放行（与全量路径同口径）。
            var targetStatus = (dto.Status ?? "").Trim();
            var currentStatus = ((row.status as string) ?? "").Trim();
            // 幂等：目标值==当前值直接 Ok
            if (string.Equals(targetStatus, currentStatus, StringComparison.Ordinal))
                return Common.Ok();
            if (string.Equals(targetStatus, "cancelled", StringComparison.OrdinalIgnoreCase)
                && (IsElectronicMedium(row.invoice_medium as string) || IsElectronicKind(row.invoice_kind as string)))
                return Common.Fail("数电票不能作废，请使用红冲方式冲销", 400);
            if (string.Equals(targetStatus, "red_flushed", StringComparison.OrdinalIgnoreCase))
                return Common.Fail("红冲需关联原蓝票，请在发票行内选择原蓝字发票后提交", 400);

            // 归属条件移出 SQL（C# 单点裁决）；无锁列故 WHERE 只留 id
            using var tx = db.BeginTransaction();
            var affected = await db.ExecuteAsync("UPDATE invoices SET status=@Status,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id",
                new { Status = dto.Status, Now = Common.NowString(), Id = id }, tx);
            if (access == RowWriteOutcome.AllowedViaAuthorization)
            {
                // 跨人修改落审计（fail-closed：审计写不进 → 事务回滚 → 修改不生效）
                AuditWriter.CrossUserEdit(db, tx, ctx, "invoices", id, "PUT /api/invoices/{id}/status", createdBy, projectId);
            }
            tx.Commit();
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });
    }

    /// <summary>
    /// FP06 介质判定（P0-a' 阶段 1 快捷路径复刻，与 InvoiceEndpoints.IsElectronicMedium 同口径）：
    /// electronic 忽略大小写视为数电票；空值返回 false。
    /// </summary>
    private static bool IsElectronicMedium(string? medium) =>
        !string.IsNullOrWhiteSpace(medium)
        && medium.Trim().Equals("electronic", StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// FP06 票种判定（快捷路径本地复刻，与 InvoiceEndpoints.IsElectronicKind 同口径）：
    /// 仅明确 electronic_* 视为数电票；空 kind 放行（保历史数据兼容）。
    /// </summary>
    private static bool IsElectronicKind(string? kind)
    {
        if (string.IsNullOrWhiteSpace(kind)) return false;
        var k = kind.Trim();
        return k.Equals("electronic_regular", StringComparison.OrdinalIgnoreCase)
            || k.Equals("electronic_special", StringComparison.OrdinalIgnoreCase);
    }
}
