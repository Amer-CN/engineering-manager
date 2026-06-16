using System.Data;
using Dapper;

namespace EngineeringManager.Api;

/// <summary>
/// 杂项端点：项目工人批量 / 发票状态变更
/// </summary>
public static class ProjectWorkerMiscEndpoints
{
    public static void RegisterProjectWorkerMiscEndpoints(this WebApplication app)
    {
        

        app.MapPost("/api/project-workers/batch", async (List<ProjectWorkerDto> records, IDbConnection db) =>
        {
            var count = 0;
            foreach (var dto in records)
            {
                await db.ExecuteAsync(@"INSERT INTO project_workers (worker_id,project_id,team_id,daily_wage,worker_type,entry_date,status,created_at)
                    VALUES (@WorkerId,@ProjectId,@TeamId,@DailyWage,@WorkerType,@EntryDate,'active',@Now)",
                    new { dto.WorkerId, dto.ProjectId, dto.TeamId, dto.DailyWage, dto.WorkerType, dto.EntryDate, Now = Common.NowString() });
                count++;
            }
            return Common.Ok(new { count });
        });

        app.MapPut("/api/project-workers", async (ProjectWorkerDto dto, IDbConnection db) =>
        {
            var affected = await db.ExecuteAsync(@"UPDATE project_workers SET team_id=@TeamId,daily_wage=@DailyWage,worker_type=@WorkerType,entry_date=@EntryDate,status=@Status WHERE id=@Id",
                new { dto.Id, dto.TeamId, dto.DailyWage, dto.WorkerType, dto.EntryDate, dto.Status, Now = Common.NowString() });
            return affected > 0 ? Common.Ok() : Common.NotFound("记录不存在");
        });

        app.MapPut("/api/invoices/{id}/status", async (long id, InvoiceStatusDto dto, IDbConnection db) =>
        {
            var affected = await db.ExecuteAsync("UPDATE invoices SET status=@Status,updated_at=@Now WHERE id=@Id",
                new { Status = dto.Status, Now = Common.NowString(), Id = id });
            return affected > 0 ? Common.Ok() : Common.NotFound("发票不存在");
        });
    }
}