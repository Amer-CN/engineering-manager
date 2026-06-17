using System.Data;
using Dapper;
using EngineeringManager.Api.Security;

namespace EngineeringManager.Api;

public static class WageEndpoints
{
    public static void RegisterWageEndpoints(this WebApplication app)
    {
        var now = () => DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

        // ═══════════════════════════════════════════════════════════
        // 考勤
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/attendances", (HttpContext ctx, IDbConnection db, long? projectId, string? yearMonth) =>
        {
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
            if (conditions.Count > 0) sql += " WHERE " + string.Join(" AND ", conditions);
            sql += " ORDER BY a.updated_at DESC";
            return Common.Ok(db.Query(sql, new { ProjectId = projectId, YearMonth = yearMonth }));
        });

        app.MapPost("/api/attendances", async (HttpContext ctx, AttendanceDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO attendances
                (member_id,project_id,project_worker_id,year_month,work_days,days_off,is_full_attendance,
                 daily_status,file_url,file_name,created_at,updated_at)
                VALUES (@MemberId,@ProjectId,@ProjectWorkerId,@YearMonth,@WorkDays,@DaysOff,@IsFullAttendance,
                        @DailyStatus,@FileUrl,@FileName,@Now,@Now);
                SELECT last_insert_rowid();",
                new { dto.MemberId, dto.ProjectId, dto.ProjectWorkerId, dto.YearMonth,
                      dto.WorkDays, dto.DaysOff, dto.IsFullAttendance, dto.DailyStatus,
                      dto.FileUrl, dto.FileName, Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/attendances", async (HttpContext ctx, AttendanceDto dto, IDbConnection db) =>
        {
            var affected = await db.ExecuteAsync(@"UPDATE attendances SET work_days=@WorkDays,days_off=@DaysOff,
                is_full_attendance=@IsFullAttendance,daily_status=@DailyStatus,file_url=@FileUrl,
                file_name=@FileName,updated_at=@Now WHERE id=@Id",
                new { dto.Id, dto.WorkDays, dto.DaysOff, dto.IsFullAttendance, dto.DailyStatus,
                      dto.FileUrl, dto.FileName, Now = now() });
            return affected > 0 ? Common.Ok() : Common.NotFound("考勤记录不存在");
        });

        app.MapDelete("/api/attendances/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
            (await db.ExecuteAsync("DELETE FROM attendances WHERE id=@Id", new { Id = id })) > 0 ? Common.Ok() : Common.NotFound("考勤记录不存在"));

        // ═══════════════════════════════════════════════════════════
        // 考勤批量操作
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/attendances/member/{memberId}", (HttpContext ctx, long memberId, IDbConnection db, string? yearMonth) =>
        {
            var sql = "SELECT * FROM attendances WHERE member_id=@MemberId";
            if (!string.IsNullOrEmpty(yearMonth)) sql += " AND year_month=@YearMonth";
            sql += " ORDER BY updated_at DESC";
            return Common.Ok(db.Query(sql, new { MemberId = memberId, YearMonth = yearMonth }));
        });

        app.MapPost("/api/attendances/batch-delete", async (HttpContext ctx, List<long> ids, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var count = 0;
            foreach (var id in ids)
                count += await db.ExecuteAsync("DELETE FROM attendances WHERE id=@Id", new { Id = id });
            return Common.Ok(new { deleted = count });
        });

        app.MapPost("/api/attendances/batch-create", async (HttpContext ctx, List<dynamic> records, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var count = 0;
            foreach (var dto in records)
            {
                await db.ExecuteAsync(@"INSERT INTO attendances (member_id,project_id,project_worker_id,year_month,work_days,days_off,is_full_attendance,daily_status,created_at,updated_at)
                    VALUES (@MemberId,@ProjectId,@ProjectWorkerId,@YearMonth,@WorkDays,@DaysOff,@IsFullAttendance,@DailyStatus,@Now,@Now)",
                    new { Now = now() });
                count++;
            }
            return Common.Ok(new { count });
        });

        app.MapPost("/api/attendances/generate", (HttpContext ctx, dynamic dto, IDbConnection db) =>
            Common.Ok(new { count = 0 }));

        app.MapPost("/api/attendances/generate-v2", (HttpContext ctx, dynamic dto, IDbConnection db) =>
            Common.Ok(new { count = 0 }));

        app.MapPost("/api/attendances/batch-import", (HttpContext ctx, dynamic dto, IDbConnection db) =>
            Common.Ok(new { created = 0, updated = 0 }));

        // ═══════════════════════════════════════════════════════════
        // 工资
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/wages", (HttpContext ctx, IDbConnection db, long? projectId, string? yearMonth) =>
        {
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
            if (conditions.Count > 0) sql += " WHERE " + string.Join(" AND ", conditions);
            sql += " ORDER BY w.updated_at DESC";
            return Common.Ok(db.Query(sql, new { ProjectId = projectId, YearMonth = yearMonth }));
        });

        app.MapGet("/api/wages/stats", (HttpContext ctx, IDbConnection db, long? projectId, string? yearMonth) =>
        {
            var where = new List<string>();
            if (projectId.HasValue) where.Add("project_id=@ProjectId");
            if (!string.IsNullOrEmpty(yearMonth)) where.Add("year_month=@YearMonth");
            var w = where.Count > 0 ? " WHERE " + string.Join(" AND ", where) : "";
            return Common.Ok(new
            {
                totalWage = db.ExecuteScalar<decimal>($"SELECT COALESCE(SUM(actual_wage),0) FROM wages{w}"),
                count = db.ExecuteScalar<int>($"SELECT COUNT(*) FROM wages{w}"),
            });
        });

        app.MapPost("/api/wages", async (HttpContext ctx, WageDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var actualWage = dto.ActualWage ?? (dto.DailyWage * dto.WorkDays + dto.Bonus - dto.Deduction);
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO wages
                (project_id,member_id,project_worker_id,year_month,daily_wage,work_days,bonus,deduction,
                 actual_wage,paid_amount,paid_date,created_at,updated_at)
                VALUES (@ProjectId,@MemberId,@ProjectWorkerId,@YearMonth,@DailyWage,@WorkDays,@Bonus,@Deduction,
                        @ActualWage,@PaidAmount,@PaidDate,@Now,@Now);
                SELECT last_insert_rowid();",
                new { dto.ProjectId, dto.MemberId, dto.ProjectWorkerId, dto.YearMonth, dto.DailyWage,
                      dto.WorkDays, dto.Bonus, dto.Deduction, ActualWage = actualWage,
                      dto.PaidAmount, dto.PaidDate, Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/wages", async (HttpContext ctx, WageDto dto, IDbConnection db) =>
        {
            var actualWage = dto.ActualWage ?? (dto.DailyWage * dto.WorkDays + dto.Bonus - dto.Deduction);
            var affected = await db.ExecuteAsync(@"UPDATE wages SET daily_wage=@DailyWage,work_days=@WorkDays,
                bonus=@Bonus,deduction=@Deduction,actual_wage=@ActualWage,paid_amount=@PaidAmount,
                paid_date=@PaidDate,updated_at=@Now WHERE id=@Id",
                new { dto.Id, dto.DailyWage, dto.WorkDays, dto.Bonus, dto.Deduction,
                      ActualWage = actualWage, dto.PaidAmount, dto.PaidDate, Now = now() });
            return affected > 0 ? Common.Ok() : Common.NotFound("工资记录不存在");
        });

        app.MapDelete("/api/wages/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
            (await db.ExecuteAsync("DELETE FROM wages WHERE id=@Id", new { Id = id })) > 0 ? Common.Ok() : Common.NotFound("工资记录不存在"));

        // ═══════════════════════════════════════════════════════════
        // 工资批量操作
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/wages/generate", (HttpContext ctx, dynamic dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // 简化版：从考勤生成工资
            return Common.Ok(new { newCount = 0, archivedSkipped = 0 });
        });

        app.MapPost("/api/wages/batch-delete", async (HttpContext ctx, List<long> ids, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var count = 0;
            foreach (var id in ids)
                count += await db.ExecuteAsync("DELETE FROM wages WHERE id=@Id AND (payment_locked=0 OR payment_locked IS NULL)", new { Id = id });
            return Common.Ok(new { deleted = count });
        });

        app.MapPost("/api/wages/batch-clear-payments", async (HttpContext ctx, List<long> ids, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var count = 0;
            foreach (var id in ids)
                count += await db.ExecuteAsync("UPDATE wages SET paid_amount=NULL,paid_date=NULL,bank_receipt_path=NULL,updated_at=@Now WHERE id=@Id AND (payment_locked=0 OR payment_locked IS NULL)",
                    new { Id = id, Now = now() });
            return Common.Ok(new { cleared = count });
        });

        app.MapPost("/api/wages/archive", async (HttpContext ctx, List<long> ids, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var count = 0;
            foreach (var id in ids)
                count += await db.ExecuteAsync("UPDATE wages SET payment_locked=1,updated_at=@Now WHERE id=@Id",
                    new { Id = id, Now = now() });
            return Common.Ok(new { archived = count });
        });

        app.MapPost("/api/wages/match-receipts", (HttpContext ctx, dynamic dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            return Common.Ok(Array.Empty<object>()); // 简化版
        });

        app.MapPost("/api/wages/confirm-matches", (HttpContext ctx, dynamic dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            return Common.Ok(new { updated = 0 }); // 简化版
        });

        app.MapGet("/api/wages/payment-records", (HttpContext ctx, IDbConnection db, long? projectId, string? yearMonth) =>
        {
            var sql = @"SELECT w.*, COALESCE(m.name, wr.name) as worker_name, p.name as project_name,
                        wt.name as team_name
                        FROM wages w
                        LEFT JOIN members m ON w.member_id=m.id
                        LEFT JOIN project_workers pw ON w.project_worker_id=pw.id
                        LEFT JOIN workers wr ON pw.worker_id=wr.id
                        LEFT JOIN worker_teams wt ON pw.team_id=wt.id
                        LEFT JOIN projects p ON w.project_id=p.id
                        WHERE w.paid_amount IS NOT NULL";
            if (projectId.HasValue) sql += " AND w.project_id=@ProjectId";
            if (!string.IsNullOrEmpty(yearMonth)) sql += " AND w.year_month=@YearMonth";
            sql += " ORDER BY w.paid_date DESC";
            return Common.Ok(db.Query(sql, new { ProjectId = projectId, YearMonth = yearMonth }));
        });

        app.MapGet("/api/wages/overdue-stats", (HttpContext ctx, IDbConnection db, long? projectId) =>
        {
            var w = projectId.HasValue ? " WHERE project_id=@ProjectId AND paid_amount IS NULL AND year_month < @CurrentMonth" : " WHERE paid_amount IS NULL AND year_month < @CurrentMonth";
            return Common.Ok(new
            {
                count = db.ExecuteScalar<int>($"SELECT COUNT(*) FROM wages{w}", new { ProjectId = projectId, CurrentMonth = DateTime.Now.ToString("yyyy-MM") }),
                amount = db.ExecuteScalar<decimal>($"SELECT COALESCE(SUM(actual_wage),0) FROM wages{w}", new { ProjectId = projectId, CurrentMonth = DateTime.Now.ToString("yyyy-MM") }),
            });
        });

        app.MapGet("/api/wages/overdue-list", (HttpContext ctx, IDbConnection db, long? projectId) =>
        {
            var sql = @"SELECT w.*, COALESCE(m.name, wr.name) as worker_name
                        FROM wages w
                        LEFT JOIN members m ON w.member_id=m.id
                        LEFT JOIN project_workers pw ON w.project_worker_id=pw.id
                        LEFT JOIN workers wr ON pw.worker_id=wr.id
                        WHERE w.paid_amount IS NULL AND w.year_month < @CurrentMonth";
            if (projectId.HasValue) sql += " AND w.project_id=@ProjectId";
            sql += " ORDER BY w.year_month DESC";
            return Common.Ok(db.Query(sql, new { ProjectId = projectId, CurrentMonth = DateTime.Now.ToString("yyyy-MM") }));
        });

        app.MapPost("/api/wages/batch-save", async (HttpContext ctx, List<dynamic> records, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var count = 0;
            foreach (var dto in records)
            {
                await db.ExecuteAsync(@"INSERT OR REPLACE INTO wages
                    (project_id,project_worker_id,year_month,daily_wage,work_days,bonus,deduction,actual_wage,created_at,updated_at)
                    VALUES (@ProjectId,@ProjectWorkerId,@YearMonth,@DailyWage,@WorkDays,@Bonus,@Deduction,@ActualWage,@Now,@Now)",
                    new { Now = now() });
                count++;
            }
            return Common.Ok(new { saved = count });
        });

        // ═══════════════════════════════════════════════════════════
        // 薪资历史
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/salary-history/{memberId}", (HttpContext ctx, long memberId, IDbConnection db) =>
            Common.Ok(db.Query("SELECT * FROM salary_history WHERE member_id=@MemberId ORDER BY effective_date DESC",
                new { MemberId = memberId })));

        app.MapPost("/api/salary-history", async (HttpContext ctx, SalaryHistoryDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO salary_history
                (member_id,effective_date,base_salary,subsidy,subsidy_note,note,created_at)
                VALUES (@MemberId,@EffectiveDate,@BaseSalary,@Subsidy,@SubsidyNote,@Note,@Now);
                SELECT last_insert_rowid();",
                new { dto.MemberId, dto.EffectiveDate, dto.BaseSalary, dto.Subsidy, dto.SubsidyNote, dto.Note, Now = now() });
            return Common.Ok(id);
        });

        app.MapDelete("/api/salary-history/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
            (await db.ExecuteAsync("DELETE FROM salary_history WHERE id=@Id", new { Id = id })) > 0 ? Common.Ok() : Common.NotFound("记录不存在"));

        app.MapGet("/api/salary-history/{memberId}/effective", (HttpContext ctx, long memberId, string yearMonth, IDbConnection db) =>
        {
            var entry = db.QueryFirstOrDefault(@"SELECT * FROM salary_history
                WHERE member_id=@MemberId AND effective_date<=@Cutoff ORDER BY effective_date DESC LIMIT 1",
                new { MemberId = memberId, Cutoff = $"{yearMonth}-01" });
            return Common.Ok(entry);
        });

        // ═══════════════════════════════════════════════════════════
        // 工资历史
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/wage-history/{projectWorkerId}", (HttpContext ctx, long projectWorkerId, IDbConnection db) =>
            Common.Ok(db.Query("SELECT * FROM wage_history WHERE project_worker_id=@Id ORDER BY year_month DESC",
                new { Id = projectWorkerId })));

        app.MapGet("/api/wage-history/{projectWorkerId}/effective", (HttpContext ctx, long projectWorkerId, string yearMonth, IDbConnection db) =>
        {
            var entry = db.QueryFirstOrDefault(@"SELECT * FROM wage_history
                WHERE project_worker_id=@Id AND year_month<=@YearMonth ORDER BY year_month DESC LIMIT 1",
                new { Id = projectWorkerId, YearMonth = yearMonth });
            return Common.Ok(entry);
        });

        // ═══════════════════════════════════════════════════════════
        // 班组工资汇总
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/team-wages", (HttpContext ctx, IDbConnection db, long projectId, long teamId) =>
        {
            var sql = @"SELECT wr.name as worker_name, pw.daily_wage,
                        COUNT(DISTINCT w.year_month) as months,
                        COALESCE(SUM(w.work_days), 0) as work_days,
                        COALESCE(SUM(w.actual_wage), 0) as total_wage
                        FROM project_workers pw
                        JOIN workers wr ON pw.worker_id=wr.id
                        LEFT JOIN wages w ON w.project_worker_id=pw.id
                        WHERE pw.project_id=@ProjectId AND pw.team_id=@TeamId
                          AND (pw.status='active' OR pw.status IS NULL)
                        GROUP BY pw.worker_id, wr.name, pw.daily_wage
                        ORDER BY wr.name";
            var details = db.Query(sql, new { ProjectId = projectId, TeamId = teamId }).ToList();
            var workerCount = details.Count;
            var teamTotal = details.Sum(d => (double)(d.total_wage ?? 0));
            return Common.Ok(new { workerCount, teamTotal, details });
        });
    }
}
