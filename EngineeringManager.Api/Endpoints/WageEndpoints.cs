using System.Data;
using Dapper;
using EngineeringManager.Api.Security;

namespace EngineeringManager.Api;

public static class WageEndpoints
{
    public static void RegisterWageEndpoints(this WebApplication app)
    {
        var now = () => DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

        // 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
        // 鑰冨嫟
        // 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?

        app.MapGet("/api/attendances", (HttpContext ctx, IDbConnection db, long? projectId, string? yearMonth) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var sql = @"SELECT a.*, COALESCE(m.name, wr.name) as member_name, m.member_type,
                        wt.name as team_name, pw.worker_id
                        FROM attendances a
                        LEFT JOIN members m ON a.member_id=m.id
                        LEFT JOIN project_workers pw ON a.project_worker_id=pw.id
                        LEFT JOIN workers wr ON pw.worker_id=wr.id
                        LEFT JOIN worker_teams wt ON pw.team_id=wt.id";
            var conditions = new List<string>();
            if (projectId.HasValue) conditions.Add("a.project_id=@ProjectId");
            if (!string.IsNullOrEmpty(yearMonth)) conditions.Add("a.year_month=@YearMonth");
            // v1.1.0 P0-4 Phase 2: 鎬绘槸鍔?user-dim 杩囨护
            conditions.Add(CurrentUser.UserFilterWithAuthorizedProjects(scope, "a.project_id", "a.created_by"));
            sql += " WHERE " + string.Join(" AND ", conditions);
            sql += " ORDER BY a.updated_at DESC";
            return Common.Ok(db.Query(sql, new { ProjectId = projectId, YearMonth = yearMonth, Uid = uid, IsAdmin = isAdmin }));
        });

        app.MapPost("/api/attendances", async (HttpContext ctx, AttendanceDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO attendances (member_id,project_id,project_worker_id,year_month,work_days,days_off,is_full_attendance,
                 daily_status,file_url,file_name,created_by,created_at,updated_at, last_modified_at) VALUES (@MemberId,@ProjectId,@ProjectWorkerId,@YearMonth,@WorkDays,@DaysOff,@IsFullAttendance,
                        @DailyStatus,@FileUrl,@FileName,@CreatedBy,@Now,@Now, @Now);
                SELECT last_insert_rowid();",
                new { dto.MemberId, dto.ProjectId, dto.ProjectWorkerId, dto.YearMonth,
                      dto.WorkDays, dto.DaysOff, dto.IsFullAttendance, dto.DailyStatus,
                      dto.FileUrl, dto.FileName, CreatedBy = uid, Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/attendances", async (HttpContext ctx, AttendanceDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var affected = await db.ExecuteAsync(@"UPDATE attendances SET work_days=@WorkDays,days_off=@DaysOff,
                is_full_attendance=@IsFullAttendance,daily_status=@DailyStatus,file_url=@FileUrl,
                file_name=@FileName,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { dto.Id, dto.WorkDays, dto.DaysOff, dto.IsFullAttendance, dto.DailyStatus,
                      dto.FileUrl, dto.FileName, Uid = uid, IsAdmin = isAdmin, Now = now() });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapDelete("/api/attendances/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            return (await db.ExecuteAsync("DELETE FROM attendances WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapPost("/api/attendances/batch-delete", async (HttpContext ctx, List<long> ids, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var count = 0;
            foreach (var id in ids)
                count += await db.ExecuteAsync("DELETE FROM attendances WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin, Now = now() });
            return Common.Ok(new { deleted = count });
        });

        app.MapPost("/api/attendances/batch-create", async (HttpContext ctx, List<dynamic> records, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var count = 0;
            foreach (var dto in records)
            {
                await db.ExecuteAsync(@"INSERT INTO attendances (member_id,project_id,project_worker_id,year_month,work_days,days_off,is_full_attendance,daily_status,created_by,created_at,updated_at, last_modified_at) VALUES (@MemberId,@ProjectId,@ProjectWorkerId,@YearMonth,@WorkDays,@DaysOff,@IsFullAttendance,@DailyStatus,@CreatedBy,@Now,@Now, @Now)",
                    new { Now = now(), CreatedBy = uid });
                count++;
            }
            return Common.Ok(new { count });
        });

        app.MapPost("/api/attendances/generate", (HttpContext ctx, dynamic dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            return Common.Ok(new { count = 0 });
        });

        app.MapPost("/api/attendances/generate-v2", (HttpContext ctx, dynamic dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            return Common.Ok(new { count = 0 });
        });

        app.MapPost("/api/attendances/batch-import", (HttpContext ctx, dynamic dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            return Common.Ok(new { created = 0, updated = 0 });
        });

        // 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
        // 宸ヨ祫
        // 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?

        app.MapGet("/api/wages", (HttpContext ctx, IDbConnection db, long? projectId, string? yearMonth) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var sql = @"SELECT w.*, COALESCE(m.name, wr.name) as worker_name, p.name as project_name,
                        wt.name as team_name
                        FROM wages w
                        LEFT JOIN members m ON w.member_id=m.id
                        LEFT JOIN project_workers pw ON w.project_worker_id=pw.id
                        LEFT JOIN workers wr ON pw.worker_id=wr.id
                        LEFT JOIN worker_teams wt ON pw.team_id=wt.id
                        LEFT JOIN projects p ON w.project_id=p.id";
            var conditions = new List<string>();
            if (projectId.HasValue) conditions.Add("w.project_id=@ProjectId");
            if (!string.IsNullOrEmpty(yearMonth)) conditions.Add("w.year_month=@YearMonth");
            conditions.Add(CurrentUser.UserFilterWithAuthorizedProjects(scope, "w.project_id", "w.created_by"));
            conditions.Add("w.deleted_at IS NULL");
            sql += " WHERE " + string.Join(" AND ", conditions);
            sql += " ORDER BY w.updated_at DESC";
            return Common.Ok(db.Query(sql, new { ProjectId = projectId, YearMonth = yearMonth, Uid = uid, IsAdmin = isAdmin }));
        });

        app.MapGet("/api/wages/stats", (HttpContext ctx, IDbConnection db, long? projectId, string? yearMonth) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var where = new List<string>();
            if (projectId.HasValue) where.Add("project_id=@ProjectId");
            if (!string.IsNullOrEmpty(yearMonth)) where.Add("year_month=@YearMonth");
            where.Add(CurrentUser.UserFilterWithAuthorizedProjects(scope));
            where.Add("deleted_at IS NULL");
            var w = " WHERE " + string.Join(" AND ", where);
            return Common.Ok(new
            {
                totalWage = db.ExecuteScalar<decimal>($"SELECT COALESCE(SUM(actual_wage),0) FROM wages{w}", new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId, YearMonth = yearMonth }),
                count = db.ExecuteScalar<int>($"SELECT COUNT(*) FROM wages{w}", new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId, YearMonth = yearMonth }),
            });
        });

        app.MapPost("/api/wages", async (HttpContext ctx, WageDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var actualWage = dto.ActualWage ?? (dto.DailyWage * dto.WorkDays + dto.Bonus - dto.Deduction);
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO wages (project_id,member_id,project_worker_id,year_month,daily_wage,work_days,bonus,deduction,
                 actual_wage,paid_amount,paid_date,created_by,created_at,updated_at, last_modified_at) VALUES (@ProjectId,@MemberId,@ProjectWorkerId,@YearMonth,@DailyWage,@WorkDays,@Bonus,@Deduction,
                        @ActualWage,@PaidAmount,@PaidDate,@CreatedBy,@Now,@Now, @Now);
                SELECT last_insert_rowid();",
                new { dto.ProjectId, dto.MemberId, dto.ProjectWorkerId, dto.YearMonth, dto.DailyWage,
                      dto.WorkDays, dto.Bonus, dto.Deduction, ActualWage = actualWage,
                      dto.PaidAmount, dto.PaidDate, CreatedBy = uid, Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/wages", async (HttpContext ctx, WageDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var actualWage = dto.ActualWage ?? (dto.DailyWage * dto.WorkDays + dto.Bonus - dto.Deduction);
            var affected = await db.ExecuteAsync(@"UPDATE wages SET daily_wage=@DailyWage,work_days=@WorkDays,
                bonus=@Bonus,deduction=@Deduction,actual_wage=@ActualWage,paid_amount=@PaidAmount,
                paid_date=@PaidDate,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { dto.Id, dto.DailyWage, dto.WorkDays, dto.Bonus, dto.Deduction,
                      ActualWage = actualWage, dto.PaidAmount, dto.PaidDate,
                      Uid = uid, IsAdmin = isAdmin, Now = now() });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapDelete("/api/wages/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            return (await db.ExecuteAsync("UPDATE wages SET deleted_at=@Now WHERE id=@Id AND deleted_at IS NULL AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin, Now = now() })) > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapPost("/api/wages/batch-delete", async (HttpContext ctx, List<long> ids, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var count = 0;
            foreach (var id in ids)
                count += await db.ExecuteAsync("UPDATE wages SET deleted_at=@Now WHERE id=@Id AND deleted_at IS NULL AND (created_by=@Uid OR @IsAdmin=1) AND (payment_locked=0 OR payment_locked IS NULL)", new { Id = id, Uid = uid, IsAdmin = isAdmin, Now = now() });
            return Common.Ok(new { deleted = count });
        });

        app.MapPost("/api/wages/batch-clear-payments", async (HttpContext ctx, List<long> ids, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var count = 0;
            foreach (var id in ids)
                count += await db.ExecuteAsync("UPDATE wages SET paid_amount=NULL,paid_date=NULL,bank_receipt_path=NULL,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1) AND (payment_locked=0 OR payment_locked IS NULL)",
                    new { Id = id, Uid = uid, IsAdmin = isAdmin, Now = now() });
            return Common.Ok(new { cleared = count });
        });

        app.MapPost("/api/wages/archive", async (HttpContext ctx, List<long> ids, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var count = 0;
            foreach (var id in ids)
                count += await db.ExecuteAsync("UPDATE wages SET payment_locked=1,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                    new { Id = id, Uid = uid, IsAdmin = isAdmin, Now = now() });
            return Common.Ok(new { archived = count });
        });

        app.MapPost("/api/wages/match-receipts", (HttpContext ctx, dynamic dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            return Common.Ok(Array.Empty<object>()); // 绠€鍖栫増
        });

        app.MapPost("/api/wages/confirm-matches", (HttpContext ctx, dynamic dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            return Common.Ok(new { updated = 0 }); // 绠€鍖栫増
        });

        app.MapGet("/api/wages/payment-records", (HttpContext ctx, IDbConnection db, long? projectId, string? yearMonth) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var sql = @"SELECT w.*, COALESCE(m.name, wr.name) as worker_name, p.name as project_name,
                        wt.name as team_name
                        FROM wages w
                        LEFT JOIN members m ON w.member_id=m.id
                        LEFT JOIN project_workers pw ON w.project_worker_id=pw.id
                        LEFT JOIN workers wr ON pw.worker_id=wr.id
                        LEFT JOIN worker_teams wt ON pw.team_id=wt.id
                        LEFT JOIN projects p ON w.project_id=p.id
                        WHERE w.paid_amount IS NOT NULL AND w.deleted_at IS NULL";
            if (projectId.HasValue) sql += " AND w.project_id=@ProjectId";
            if (!string.IsNullOrEmpty(yearMonth)) sql += " AND w.year_month=@YearMonth";
            // v1.1.0 P0-4 Phase 2: 鍔?user-dim 杩囨护 (闈?admin 鐪嬩笉鍒板埆浜哄彂鐨勫伐璧勫崟)
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            sql += " AND " + CurrentUser.UserFilterWithAuthorizedProjects(scope, "w.project_id", "w.created_by");
            sql += " ORDER BY w.paid_date DESC";
            return Common.Ok(db.Query(sql, new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId, YearMonth = yearMonth }));
        });

        app.MapGet("/api/wages/overdue-stats", (HttpContext ctx, IDbConnection db, long? projectId) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            // v1.1.0 P0-4 Phase 2: 鎬绘槸鍔?user-dim
            var w = projectId.HasValue
                ? " WHERE project_id=@ProjectId AND deleted_at IS NULL AND paid_amount IS NULL AND year_month < @CurrentMonth AND " + CurrentUser.UserFilterWithAuthorizedProjects(scope)
                : " WHERE deleted_at IS NULL AND paid_amount IS NULL AND year_month < @CurrentMonth AND " + CurrentUser.UserFilterWithAuthorizedProjects(scope);
            return Common.Ok(new
            {
                count = db.ExecuteScalar<int>($"SELECT COUNT(*) FROM wages{w}", new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId, CurrentMonth = DateTime.Now.ToString("yyyy-MM") }),
                amount = db.ExecuteScalar<decimal>($"SELECT COALESCE(SUM(actual_wage),0) FROM wages{w}", new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId, CurrentMonth = DateTime.Now.ToString("yyyy-MM") }),
            });
        });

        app.MapGet("/api/wages/overdue-list", (HttpContext ctx, IDbConnection db, long? projectId) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var sql = @"SELECT w.*, COALESCE(m.name, wr.name) as worker_name
                        FROM wages w
                        LEFT JOIN members m ON w.member_id=m.id
                        LEFT JOIN project_workers pw ON w.project_worker_id=pw.id
                        LEFT JOIN workers wr ON pw.worker_id=wr.id
                        WHERE w.paid_amount IS NULL AND w.deleted_at IS NULL AND w.year_month < @CurrentMonth";
            if (projectId.HasValue) sql += " AND w.project_id=@ProjectId";
            // v1.1.0 P0-4 Phase 2: 鍔?user-dim
            sql += " AND " + CurrentUser.UserFilterWithAuthorizedProjects(scope, "w.project_id");
            sql += " ORDER BY w.year_month DESC";
            return Common.Ok(db.Query(sql, new { ProjectId = projectId, CurrentMonth = DateTime.Now.ToString("yyyy-MM") }));
        });

        app.MapPost("/api/wages/batch-save", async (HttpContext ctx, List<dynamic> records, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var count = 0;
            foreach (var dto in records)
            {
                await db.ExecuteAsync(@"INSERT OR REPLACE INTO wages
                    (project_id,project_worker_id,year_month,daily_wage,work_days,bonus,deduction,actual_wage,created_by,created_at,updated_at)
                    VALUES (@ProjectId,@ProjectWorkerId,@YearMonth,@DailyWage,@WorkDays,@Bonus,@Deduction,@ActualWage,@CreatedBy,@Now,@Now)",
                    new { Now = now(), CreatedBy = uid });
                count++;
            }
            return Common.Ok(new { saved = count });
        });

        // 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
        // 钖祫鍘嗗彶 (鏃?created_by 鍒? 浠呭姞 var uid 寮哄埗閴存潈)
        // 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?

        app.MapGet("/api/salary-history/{memberId}", (HttpContext ctx, long memberId, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            // v1.1.0 P0-4 Phase 2: salary_history 鐜板湪鏈?created_by (migration 014)
            return Common.Ok(db.Query($"SELECT * FROM salary_history WHERE member_id=@MemberId AND {CurrentUser.UserFilterCompany(scope)} ORDER BY effective_date DESC",
                new { MemberId = memberId, Uid = uid, IsAdmin = isAdmin }));
        });

        app.MapDelete("/api/salary-history/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            return (await db.ExecuteAsync("DELETE FROM salary_history WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapPost("/api/salary-history", async (HttpContext ctx, SalaryHistoryDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO salary_history (member_id,effective_date,base_salary,subsidy,subsidy_note,note,created_by,created_at, last_modified_at) VALUES (@MemberId,@EffectiveDate,@BaseSalary,@Subsidy,@SubsidyNote,@Note,@CreatedBy,@Now, @Now);
                SELECT last_insert_rowid();",
                new { dto.MemberId, dto.EffectiveDate, dto.BaseSalary, dto.Subsidy, dto.SubsidyNote, dto.Note, CreatedBy = uid, Now = now() });
            return Common.Ok(id);
        });
        app.MapGet("/api/salary-history/{memberId}/effective", (HttpContext ctx, long memberId, string yearMonth, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            // v1.1.0 P0-4 Phase 2: salary_history 鐜板湪鏈?created_by
            var entry = db.QueryFirstOrDefault($@"SELECT * FROM salary_history
                WHERE member_id=@MemberId AND effective_date<=@Cutoff AND {CurrentUser.UserFilterCompany(scope)}
                ORDER BY effective_date DESC LIMIT 1",
                new { MemberId = memberId, Cutoff = $"{yearMonth}-01", Uid = uid, IsAdmin = isAdmin });
            return Common.Ok(entry);
        });

        // 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
        // 宸ヨ祫鍘嗗彶 (绯荤粺琛? 鏃?created_by)
        // 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?

        app.MapGet("/api/wage-history/{projectWorkerId}", (HttpContext ctx, long projectWorkerId, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            // v1.1.0 P0-4 Phase 2: wage_history 鐜板湪鏈?created_by
            return Common.Ok(db.Query($"SELECT * FROM wage_history WHERE project_worker_id=@Id AND {CurrentUser.UserFilterCompany(scope)} ORDER BY year_month DESC",
                new { Id = projectWorkerId, Uid = uid, IsAdmin = isAdmin }));
        });

        app.MapGet("/api/wage-history/{projectWorkerId}/effective", (HttpContext ctx, long projectWorkerId, string yearMonth, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            // v1.1.0 P0-4 Phase 2: wage_history 鐜板湪鏈?created_by
            var entry = db.QueryFirstOrDefault($@"SELECT * FROM wage_history
                WHERE project_worker_id=@Id AND year_month<=@YearMonth AND {CurrentUser.UserFilterCompany(scope)}
                ORDER BY year_month DESC LIMIT 1",
                new { Id = projectWorkerId, YearMonth = yearMonth, Uid = uid, IsAdmin = isAdmin });
            return Common.Ok(entry);
        });

        // 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
        // 鐝粍宸ヨ祫姹囨€?
        // 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?

        app.MapGet("/api/team-wages", (HttpContext ctx, IDbConnection db, long projectId, long teamId) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            // v1.1.0 P0-4 Phase 2: 鍔?user-dim 杩囨护 (闄愬埗闈?admin 鐪嬪埌闈炴巿鏉冮」鐩?
            var sql = $@"SELECT wr.name as worker_name, pw.daily_wage,
                        COUNT(DISTINCT w.year_month) as months,
                        COALESCE(SUM(w.work_days), 0) as work_days,
                        COALESCE(SUM(w.actual_wage), 0) as total_wage
                        FROM project_workers pw
                        JOIN workers wr ON pw.worker_id=wr.id
                        LEFT JOIN wages w ON w.project_worker_id=pw.id AND w.deleted_at IS NULL
                        WHERE pw.project_id=@ProjectId AND pw.team_id=@TeamId
                          AND (pw.status='active' OR pw.status IS NULL)
                          AND {CurrentUser.UserFilterWithAuthorizedProjects(scope, "pw.project_id", "pw.created_by")}
                        GROUP BY pw.worker_id, wr.name, pw.daily_wage
                        ORDER BY wr.name";
            var details = db.Query(sql, new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId, TeamId = teamId }).ToList();
            var workerCount = details.Count;
            var teamTotal = details.Sum(d => (double)(d.total_wage ?? 0));
            return Common.Ok(new { workerCount, teamTotal, details });
        });
    }
}

