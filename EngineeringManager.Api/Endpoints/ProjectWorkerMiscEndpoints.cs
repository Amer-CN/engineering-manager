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
            var count = 0;
            foreach (var dto in records)
            {
                await db.ExecuteAsync(@"INSERT INTO project_workers (worker_id,project_id,team_id,daily_wage,worker_type,entry_date,status,created_by,created_at)
                    VALUES (@WorkerId,@ProjectId,@TeamId,@DailyWage,@WorkerType,@EntryDate,'active',@CreatedBy,@Now)",
                    new { dto.WorkerId, dto.ProjectId, dto.TeamId, dto.DailyWage, dto.WorkerType, dto.EntryDate, CreatedBy = uid, Now = Common.NowString() });
                count++;
            }
            return Common.Ok(new { count });
        });

        app.MapPut("/api/project-workers", async (HttpContext ctx, ProjectWorkerDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var affected = await db.ExecuteAsync(@"UPDATE project_workers SET team_id=@TeamId,daily_wage=@DailyWage,worker_type=@WorkerType,entry_date=@EntryDate,status=@Status WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { dto.Id, dto.TeamId, dto.DailyWage, dto.WorkerType, dto.EntryDate, dto.Status, Uid = uid, IsAdmin = isAdmin });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapPut("/api/invoices/{id}/status", async (HttpContext ctx, long id, InvoiceStatusDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var affected = await db.ExecuteAsync("UPDATE invoices SET status=@Status,updated_at=@Now WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { Status = dto.Status, Now = Common.NowString(), Id = id, Uid = uid, IsAdmin = isAdmin });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });
    }
}
