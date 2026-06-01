using System.Data;
using Dapper;

namespace EngineeringManager.Api;

/// <summary>
/// 仪表盘 + 项目 + 项目成员端点
/// </summary>
public static class ProjectEndpoints
{
    public static void RegisterProjectEndpoints(this WebApplication app)
    {
        var now = () => DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

        // ═══════════════════════════════════════════════════════════
        // 仪表盘
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/dashboard/stats", (IDbConnection db) => Common.Ok(new
        {
            projectsCount = db.ExecuteScalar<int>("SELECT COUNT(*) FROM projects"),
            membersCount = db.ExecuteScalar<int>("SELECT COUNT(*) FROM members"),
            workersCount = db.ExecuteScalar<int>("SELECT COUNT(*) FROM workers"),
            invoicesCount = db.ExecuteScalar<int>("SELECT COUNT(*) FROM invoices"),
            settlementsCount = db.ExecuteScalar<int>("SELECT COUNT(*) FROM settlements"),
            inProgressProjects = db.ExecuteScalar<int>("SELECT COUNT(*) FROM projects WHERE status='active'"),
        }));

        // ═══════════════════════════════════════════════════════════
        // 项目
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/projects", (IDbConnection db) =>
            Common.Ok(db.Query(@"SELECT p.*, m.name as project_manager_name FROM projects p
                          LEFT JOIN members m ON p.project_manager_id=m.id ORDER BY p.created_at DESC")));

        app.MapGet("/api/projects/{id}", (long id, IDbConnection db) =>
        {
            var p = db.QueryFirstOrDefault(@"SELECT p.*, m.name as project_manager_name FROM projects p
                LEFT JOIN members m ON p.project_manager_id=m.id WHERE p.id=@Id", new { Id = id });
            return p is not null ? Common.Ok(p) : Common.Fail("项目不存在");
        });

        app.MapPost("/api/projects", async (ProjectDto dto, IDbConnection db) =>
        {
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO projects
                (name,description,address,start_date,end_date,status,budget,project_manager_id,created_at,updated_at)
                VALUES (@Name,@Description,@Address,@StartDate,@EndDate,@Status,@Budget,@ProjectManagerId,@Now,@Now);
                SELECT last_insert_rowid();",
                new { dto.Name, dto.Description, dto.Address, dto.StartDate, dto.EndDate,
                      Status = dto.Status ?? "planning", dto.Budget, dto.ProjectManagerId, Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/projects/{id}", async (long id, ProjectDto dto, IDbConnection db) =>
        {
            var affected = await db.ExecuteAsync(@"UPDATE projects SET name=@Name,description=@Description,
                address=@Address,start_date=@StartDate,end_date=@EndDate,status=@Status,budget=@Budget,
                project_manager_id=@ProjectManagerId,updated_at=@Now WHERE id=@Id",
                new { dto.Name, dto.Description, dto.Address, dto.StartDate, dto.EndDate,
                      dto.Status, dto.Budget, dto.ProjectManagerId, Now = now(), Id = id });
            return affected > 0 ? Common.Ok() : Common.Fail("项目不存在");
        });

        app.MapDelete("/api/projects/{id}", async (long id, IDbConnection db) =>
            (await db.ExecuteAsync("DELETE FROM projects WHERE id=@Id", new { Id = id })) > 0 ? Common.Ok() : Common.Fail("项目不存在"));

        // ═══════════════════════════════════════════════════════════
        // 项目成员
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/project-members/{projectId}", (long projectId, IDbConnection db) =>
            Common.Ok(db.Query(@"SELECT pm.*, m.name as member_name, m.role as member_role, m.member_type, m.phone
                          FROM project_members pm LEFT JOIN members m ON pm.member_id=m.id
                          WHERE pm.project_id=@ProjectId ORDER BY pm.joined_at DESC", new { ProjectId = projectId })));

        app.MapPost("/api/project-members", async (ProjectMemberDto dto, IDbConnection db) =>
        {
            var exists = db.ExecuteScalar<int>("SELECT COUNT(*) FROM project_members WHERE project_id=@ProjectId AND member_id=@MemberId",
                new { dto.ProjectId, dto.MemberId }) > 0;
            if (exists) return Common.Fail("该成员已在项目中");
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO project_members (project_id,member_id,joined_at)
                VALUES (@ProjectId,@MemberId,@JoinedAt); SELECT last_insert_rowid();",
                new { dto.ProjectId, dto.MemberId, JoinedAt = dto.JoinedAt ?? now() });
            return Common.Ok(id);
        });

        app.MapDelete("/api/project-members/{id}", async (long id, IDbConnection db) =>
            (await db.ExecuteAsync("DELETE FROM project_members WHERE id=@Id", new { Id = id })) > 0 ? Common.Ok() : Common.Fail("记录不存在"));
    }
}
