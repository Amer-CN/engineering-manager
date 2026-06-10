using System.Data;
using Dapper;

namespace EngineeringManager.Api;

/// <summary>
/// 成员 + 工人 + 项目工人 + 部门 + 班组端点
/// </summary>
public static class MemberEndpoints
{
    public static void RegisterMemberEndpoints(this WebApplication app)
    {
        var now = () => DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

        // ═══════════════════════════════════════════════════════════
        // 成员
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/members", (IDbConnection db) =>
            Common.Ok(db.Query(@"SELECT m.*, d.name as department_name FROM members m
                          LEFT JOIN departments d ON m.department_id=d.id ORDER BY m.created_at DESC")));

        app.MapGet("/api/members/{id}", (long id, IDbConnection db) =>
        {
            var m = db.QueryFirstOrDefault("SELECT * FROM members WHERE id=@Id", new { Id = id });
            return m is not null ? Common.Ok(m) : Common.NotFound("成员不存在");
        });

        app.MapPost("/api/members", async (MemberDto dto, IDbConnection db) =>
        {
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO members
                (name,phone,email,member_type,role,id_card,gender,ethnicity,birth_date,id_card_address,
                 base_salary,daily_wage,entry_date,status,department_id,position,created_at)
                VALUES (@Name,@Phone,@Email,@MemberType,@Role,@IdCard,@Gender,@Ethnicity,@BirthDate,
                        @IdCardAddress,@BaseSalary,@DailyWage,@EntryDate,@Status,@DepartmentId,@Position,@Now);
                SELECT last_insert_rowid();",
                new { dto.Name, dto.Phone, dto.Email, MemberType = dto.MemberType ?? "staff",
                      dto.Role, dto.IdCard, dto.Gender, dto.Ethnicity, dto.BirthDate, dto.IdCardAddress,
                      dto.BaseSalary, dto.DailyWage, dto.EntryDate, Status = dto.Status ?? "active",
                      dto.DepartmentId, dto.Position, Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/members", async (MemberDto dto, IDbConnection db) =>
        {
            var affected = await db.ExecuteAsync(@"UPDATE members SET name=@Name,phone=@Phone,email=@Email,
                member_type=@MemberType,role=@Role,id_card=@IdCard,gender=@Gender,ethnicity=@Ethnicity,
                birth_date=@BirthDate,id_card_address=@IdCardAddress,base_salary=@BaseSalary,daily_wage=@DailyWage,
                entry_date=@EntryDate,status=@Status,department_id=@DepartmentId,position=@Position WHERE id=@Id",
                new { dto.Id, dto.Name, dto.Phone, dto.Email, dto.MemberType, dto.Role, dto.IdCard,
                      dto.Gender, dto.Ethnicity, dto.BirthDate, dto.IdCardAddress, dto.BaseSalary,
                      dto.DailyWage, dto.EntryDate, dto.Status, dto.DepartmentId, dto.Position });
            return affected > 0 ? Common.Ok() : Common.NotFound("成员不存在");
        });

        app.MapDelete("/api/members/{id}", async (long id, IDbConnection db) =>
            (await db.ExecuteAsync("DELETE FROM members WHERE id=@Id", new { Id = id })) > 0 ? Common.Ok() : Common.NotFound("成员不存在"));

        // ═══════════════════════════════════════════════════════════
        // 工人
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/workers", (IDbConnection db) =>
            Common.Ok(db.Query("SELECT * FROM workers ORDER BY name")));

        app.MapGet("/api/workers/stats", (IDbConnection db) => Common.Ok(new
        {
            total = db.ExecuteScalar<int>("SELECT COUNT(*) FROM workers"),
            active = db.ExecuteScalar<int>("SELECT COUNT(*) FROM project_workers WHERE status='active'"),
        }));

        app.MapPost("/api/workers", async (WorkerDto dto, IDbConnection db) =>
        {
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO workers
                (name,id_card,gender,phone,address,bank_account,bank_name,worker_type,daily_wage,created_at)
                VALUES (@Name,@IdCard,@Gender,@Phone,@Address,@BankAccount,@BankName,@WorkerType,@DailyWage,@Now);
                SELECT last_insert_rowid();",
                new { dto.Name, dto.IdCard, dto.Gender, dto.Phone, dto.Address, dto.BankAccount,
                      dto.BankName, dto.WorkerType, dto.DailyWage, Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/workers", async (WorkerDto dto, IDbConnection db) =>
        {
            var affected = await db.ExecuteAsync(@"UPDATE workers SET name=@Name,id_card=@IdCard,gender=@Gender,
                phone=@Phone,address=@Address,bank_account=@BankAccount,bank_name=@BankName,
                worker_type=@WorkerType,daily_wage=@DailyWage WHERE id=@Id",
                new { dto.Id, dto.Name, dto.IdCard, dto.Gender, dto.Phone, dto.Address,
                      dto.BankAccount, dto.BankName, dto.WorkerType, dto.DailyWage });
            return affected > 0 ? Common.Ok() : Common.NotFound("工人不存在");
        });

        app.MapDelete("/api/workers/{id}", async (long id, IDbConnection db) =>
            (await db.ExecuteAsync("DELETE FROM workers WHERE id=@Id", new { Id = id })) > 0 ? Common.Ok() : Common.NotFound("工人不存在"));

        // ═══════════════════════════════════════════════════════════
        // 项目工人
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/project-workers", (IDbConnection db, long? projectId) =>
        {
            var sql = @"SELECT pw.*, w.name as worker_name, w.id_card, w.gender, w.phone,
                        w.address, w.bank_account, w.bank_name, w.worker_type, w.daily_wage,
                        w.birth_date, w.ethnicity,
                        wt.name as team_name
                        FROM project_workers pw
                        LEFT JOIN workers w ON pw.worker_id=w.id
                        LEFT JOIN worker_teams wt ON pw.team_id=wt.id";
            if (projectId.HasValue) sql += " WHERE pw.project_id=@ProjectId";
            sql += " ORDER BY pw.created_at DESC";
            return Common.Ok(db.Query(sql, new { ProjectId = projectId }));
        });

        app.MapPost("/api/project-workers", async (ProjectWorkerDto dto, IDbConnection db) =>
        {
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO project_workers
                (worker_id,project_id,team_id,daily_wage,worker_type,entry_date,status,created_at)
                VALUES (@WorkerId,@ProjectId,@TeamId,@DailyWage,@WorkerType,@EntryDate,@Status,@Now);
                SELECT last_insert_rowid();",
                new { dto.WorkerId, dto.ProjectId, dto.TeamId, dto.DailyWage, dto.WorkerType,
                      dto.EntryDate, Status = dto.Status ?? "active", Now = now() });
            return Common.Ok(id);
        });

        app.MapDelete("/api/project-workers/{id}", async (long id, IDbConnection db) =>
            (await db.ExecuteAsync("DELETE FROM project_workers WHERE id=@Id", new { Id = id })) > 0 ? Common.Ok() : Common.NotFound("记录不存在"));

        // ═══════════════════════════════════════════════════════════
        // 部门
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/departments", (IDbConnection db) =>
            Common.Ok(db.Query("SELECT * FROM departments ORDER BY name")));

        app.MapPost("/api/departments", async (DepartmentDto dto, IDbConnection db) =>
        {
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO departments (name,manager_id,positions,created_at)
                VALUES (@Name,@ManagerId,@Positions,@Now); SELECT last_insert_rowid();",
                new { dto.Name, dto.ManagerId, dto.Positions, Now = now() });
            return Common.Ok(id);
        });

        app.MapDelete("/api/departments/{id}", async (long id, IDbConnection db) =>
            (await db.ExecuteAsync("DELETE FROM departments WHERE id=@Id", new { Id = id })) > 0 ? Common.Ok() : Common.NotFound("部门不存在"));

        // ═══════════════════════════════════════════════════════════
        // 班组
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/worker-teams", (IDbConnection db, long? projectId) =>
        {
            var sql = @"SELECT wt.*, p.name as project_name,
                               (SELECT COUNT(*) FROM project_workers pw WHERE pw.team_id=wt.id) as worker_count
                        FROM worker_teams wt LEFT JOIN projects p ON wt.project_id=p.id";
            if (projectId.HasValue) sql += " WHERE wt.project_id=@ProjectId";
            sql += " ORDER BY wt.created_at DESC";
            return Common.Ok(db.Query(sql, new { ProjectId = projectId }));
        });

        app.MapPost("/api/worker-teams", async (WorkerTeamDto dto, IDbConnection db) =>
        {
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO worker_teams (name,project_id,leader_id,created_at,updated_at)
                VALUES (@Name,@ProjectId,@LeaderId,@Now,@Now); SELECT last_insert_rowid();",
                new { dto.Name, dto.ProjectId, dto.LeaderId, Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/worker-teams", async (WorkerTeamDto dto, IDbConnection db) =>
        {
            var affected = await db.ExecuteAsync(@"UPDATE worker_teams SET name=COALESCE(@Name,name),
                leader_id=@LeaderId,updated_at=@Now WHERE id=@Id",
                new { dto.Id, dto.Name, dto.LeaderId, Now = now() });
            return affected > 0 ? Common.Ok() : Common.NotFound("班组不存在");
        });

        app.MapDelete("/api/worker-teams/{id}", async (long id, IDbConnection db) =>
            (await db.ExecuteAsync("DELETE FROM worker_teams WHERE id=@Id", new { Id = id })) > 0 ? Common.Ok() : Common.NotFound("班组不存在"));
    }
}
