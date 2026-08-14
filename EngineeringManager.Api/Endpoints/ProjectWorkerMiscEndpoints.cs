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
                await db.ExecuteAsync(@"INSERT INTO project_workers (worker_id,project_id,team_id,daily_wage,worker_type,entry_date,status,created_by,created_at, last_modified_at) VALUES (@WorkerId,@ProjectId,@TeamId,@DailyWage,@WorkerType,@EntryDate,'active',@CreatedBy,@Now, @Now)",
                    new { dto.WorkerId, dto.ProjectId, dto.TeamId, dto.DailyWage, dto.WorkerType, dto.EntryDate, CreatedBy = uid, Now = Common.NowString() });
                count++;
            }
            return Common.Ok(new { count });
        });

        app.MapPut("/api/project-workers", async (HttpContext ctx, ProjectWorkerDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B5: 项目工人写操作 → members:update
            if (!CurrentUser.HasPermission(ctx, db, "members:update")) return Results.Forbid();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var affected = await db.ExecuteAsync(@"UPDATE project_workers SET team_id=@TeamId,daily_wage=@DailyWage,worker_type=@WorkerType,entry_date=@EntryDate,status=@Status, version=version+1, last_modified_at=@Now WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { dto.Id, dto.TeamId, dto.DailyWage, dto.WorkerType, dto.EntryDate, dto.Status, Uid = uid, IsAdmin = isAdmin });
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
            var row = db.QueryFirstOrDefault(
                "SELECT created_by, project_id FROM invoices WHERE id=@Id",
                new { Id = id });
            // 行不存在 → 维持现状「不存在=403」语义（Pin8 钉住，未改 WriteResult 的 404）
            if (row == null) return Results.Forbid();
            // 归属裁决：Denied → 403；AllowedViaAuthorization → 跨人修改落 audit（同事务 fail-closed）
            var createdBy = row.created_by as string;
            var projectId = row.project_id as long?;
            var access = RowWriteGate.Classify(ctx, db, createdBy, projectId);
            if (access == RowWriteOutcome.Denied) return Results.Forbid();

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
}
