using System.Data;
using Dapper;
using EngineeringManager.Api.Security;

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

                app.MapGet("/api/dashboard/stats", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                var projectsCount = db.ExecuteScalar<int>("SELECT COUNT(*) FROM projects");
                var membersCount = db.ExecuteScalar<int>("SELECT COUNT(*) FROM members");
                var workersCount = db.ExecuteScalar<int>("SELECT COUNT(*) FROM workers");
                var invoicesCount = db.ExecuteScalar<int>("SELECT COUNT(*) FROM invoices");
                var settlementsCount = db.ExecuteScalar<int>("SELECT COUNT(*) FROM settlements");
                var inProgressProjects = db.ExecuteScalar<int>("SELECT COUNT(*) FROM projects WHERE status='active'");
                var totalExpenses = db.ExecuteScalar<double>("SELECT COALESCE(SUM(amount), 0) FROM cost_ledger WHERE direction='expense'");
                var inventoryItemsCount = db.ExecuteScalar<int>("SELECT COUNT(*) FROM inventory_items");

                // 最近项目
                var recentProjects = db.Query("SELECT id, name, address, status FROM projects ORDER BY created_at DESC LIMIT 5").ToList();

                // 支出分类统计
                Dictionary<string, double> expenseByCategory = new();
                try
                {
                    expenseByCategory = db.Query(@"
                        SELECT COALESCE(cl.category, '其他') as name, SUM(cl.amount) as amount
                        FROM cost_ledger cl
                        WHERE cl.direction = 'expense'
                        GROUP BY cl.category
                        ORDER BY amount DESC
                    ").ToDictionary(r => (string)r.name, r => (double)r.amount);
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine($"[ProjectEndpoints/expenseByCategory] 统计失败: {ex.Message}");
                    expenseByCategory = new();
                }

                return Common.Ok(new
                {
                    projectsCount, membersCount, workersCount, invoicesCount, settlementsCount,
                    inProgressProjects, totalExpenses, inventoryItemsCount, expenseByCategory, recentProjects
                });
            }
            catch (Exception)
            {
                return Common.Ok(new
                {
                    projectsCount = 0, membersCount = 0, workersCount = 0, invoicesCount = 0,
                    settlementsCount = 0, inProgressProjects = 0, totalExpenses = 0.0,
                    inventoryItemsCount = 0, expenseByCategory = new Dictionary<string, double>(),
                    recentProjects = new List<object>()
                });
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 项目
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/projects", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            // v1.1.0 P0-4 Phase 2: 项目级表过滤 (UserFilterWithAuthorizedProjects + p.created_by 表别名)
            // projects 表主键是 id (不是 project_id), project_authorizations.project_id 引用 projects.id
            var filter = CurrentUser.UserFilterWithAuthorizedProjects("p.id", "p.created_by");
            return Common.Ok(db.Query($@"SELECT p.*, m.name as project_manager_name FROM projects p
                          LEFT JOIN members m ON p.project_manager_id=m.id
                          WHERE {filter}
                          ORDER BY p.created_at DESC",
                          new { Uid = uid, IsAdmin = isAdmin }));
        });

        app.MapGet("/api/projects/{id}", (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            // v1.1.0 P0-4 Phase 2: 单条也加项目级过滤 (p.created_by + project_authorizations)
            var filter = CurrentUser.UserFilterWithAuthorizedProjects("p.id", "p.created_by");
            var p = db.QueryFirstOrDefault($@"SELECT p.*, m.name as project_manager_name FROM projects p
                LEFT JOIN members m ON p.project_manager_id=m.id
                WHERE p.id=@Id AND ({filter})",
                new { Id = id, Uid = uid, IsAdmin = isAdmin });
            return p is not null ? Common.Ok(p) : Common.NotFound("项目不存在");
        });

        app.MapPost("/api/projects", async (HttpContext ctx, ProjectDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO projects
                (name,description,address,start_date,end_date,status,budget,project_manager_id,created_by,created_at,updated_at)
                VALUES (@Name,@Description,@Address,@StartDate,@EndDate,@Status,@Budget,@ProjectManagerId,@CreatedBy,@Now,@Now);
                SELECT last_insert_rowid();",
                new { dto.Name, dto.Description, dto.Address, dto.StartDate, dto.EndDate,
                      Status = dto.Status ?? "planning", dto.Budget, dto.ProjectManagerId, CreatedBy = uid, Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/projects/{id}", async (HttpContext ctx, long id, ProjectDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var affected = await db.ExecuteAsync(@"UPDATE projects SET name=@Name,description=@Description,
                address=@Address,start_date=@StartDate,end_date=@EndDate,status=@Status,budget=@Budget,
                project_manager_id=@ProjectManagerId,updated_at=@Now WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { dto.Name, dto.Description, dto.Address, dto.StartDate, dto.EndDate,
                      dto.Status, dto.Budget, dto.ProjectManagerId, Now = now(), Id = id,
                      Uid = uid, IsAdmin = isAdmin });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapDelete("/api/projects/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            return (await db.ExecuteAsync("DELETE FROM projects WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });

        // ═══════════════════════════════════════════════════════════
        // 项目成员
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/project-members/{projectId}", (HttpContext ctx, long projectId, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // v0.75.0: 后端响应层不再 mask
            return Common.Ok(db.Query(@"SELECT pm.*, m.name as member_name, m.role as member_role, m.member_type, m.phone
                          FROM project_members pm LEFT JOIN members m ON pm.member_id=m.id
                          WHERE pm.project_id=@ProjectId ORDER BY pm.joined_at DESC", new { ProjectId = projectId }));
        });

        app.MapPost("/api/project-members", async (HttpContext ctx, ProjectMemberDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var exists = db.ExecuteScalar<int>("SELECT COUNT(*) FROM project_members WHERE project_id=@ProjectId AND member_id=@MemberId",
                new { dto.ProjectId, dto.MemberId }) > 0;
            if (exists) return Common.Fail("该成员已在项目中");
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO project_members (project_id,member_id,joined_at)
                VALUES (@ProjectId,@MemberId,@JoinedAt); SELECT last_insert_rowid();",
                new { dto.ProjectId, dto.MemberId, JoinedAt = dto.JoinedAt ?? now() });
            return Common.Ok(id);
        });

        app.MapDelete("/api/project-members/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            return (await db.ExecuteAsync("DELETE FROM project_members WHERE id=@Id", new { Id = id, Uid = uid })) > 0 ? Common.Ok() : Results.Forbid();
        });


    }
}
