using System.Data;
using System.Text.Json;
using Dapper;
using EngineeringManager.Api.Security;
using EngineeringManager.Api.Services;
using EngineeringManager.Api.Services.Stt;
using Microsoft.Extensions.DependencyInjection;

// ═══════════════════════════════════════════════════════════════
// wages 单位契约（v0.92.0 起强制执行）：
//   · 库内一律「分」：金额列 INTEGER 整数（迁移 003），含 wages 表金额列
//     （daily_wage / bonus / deduction / actual_wage / paid_amount）与
//     project_workers.daily_wage
//   · API 对外一律「元」：请求体接收元，响应返回元
//   · 换算只允许发生在 ToFen（元→分）/ ToYuan（分→元）两个 helper 内，
//     禁止在别处散写 ×100 / ÷100（含 SQL 表达式）
//   · work_days 是天数（REAL），不是金额，不参与换算
//   · salary_history / wage_history 是独立表，本契约不覆盖（各自保持现状）
//   · 新增端点若涉及 wages / project_workers 金额列，必须走 ToFen / ToYuan
// ═══════════════════════════════════════════════════════════════

namespace EngineeringManager.Api;

public static class WageEndpoints
{
    public static void RegisterWageEndpoints(this WebApplication app)
    {
        var now = () => DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

        // 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
        // 鑰冨嫟
        // 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?

        app.MapGet("/api/attendances", (HttpContext ctx, IDbConnection db, long? projectId, string? yearMonth, long? memberId) =>
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
            if (memberId.HasValue) conditions.Add("a.member_id = @MemberId");
            // v1.1.0 P0-4 Phase 2: 鎬绘槸鍔?user-dim 杩囨护
            conditions.Add(CurrentUser.UserFilterWithAuthorizedProjects(scope, "a.project_id", "a.created_by"));
            sql += " WHERE " + string.Join(" AND ", conditions);
            sql += " ORDER BY a.updated_at DESC";
            return Common.Ok(db.Query(sql, new { ProjectId = projectId, YearMonth = yearMonth, MemberId = memberId, Uid = uid, IsAdmin = isAdmin }));
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

        app.MapPost("/api/attendances/batch-create", async (HttpContext ctx, List<JsonElement> records, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var count = 0;
            foreach (var dto in records)
            {
                // 前端无调用方；字段名按 camelCase 约定（对应 AttendanceBatchItem）
                var item = JsonSerializer.Deserialize<AttendanceBatchItem>(dto.GetRawText(), WebJson) ?? throw new InvalidDataException("batch-create: 考勤记录反序列化失败");
                await db.ExecuteAsync(@"INSERT INTO attendances (member_id,project_id,project_worker_id,year_month,work_days,days_off,is_full_attendance,daily_status,created_by,created_at,updated_at, last_modified_at) VALUES (@MemberId,@ProjectId,@ProjectWorkerId,@YearMonth,@WorkDays,@DaysOff,@IsFullAttendance,@DailyStatus,@CreatedBy,@Now,@Now, @Now)",
                    new { item.MemberId, item.ProjectId, item.ProjectWorkerId, item.YearMonth, item.WorkDays, item.DaysOff, item.IsFullAttendance, item.DailyStatus, CreatedBy = uid, Now = now() });
                count++;
            }
            return Common.Ok(new { count });
        });

        app.MapPost("/api/attendances/generate", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            return Common.Ok(new { count = 0 });
        });

        app.MapPost("/api/attendances/generate-v2", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            return Common.Ok(new { count = 0 });
        });

        app.MapPost("/api/attendances/batch-import", (HttpContext ctx, IDbConnection db) =>
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
            // 金额列分→元（单位契约：库内分、API 元）
            return Common.Ok(ToYuanRows(db.Query(sql, new { ProjectId = projectId, YearMonth = yearMonth, Uid = uid, IsAdmin = isAdmin })));
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
                totalWage = ToYuan(db.ExecuteScalar<decimal>($"SELECT COALESCE(SUM(actual_wage),0) FROM wages{w}", new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId, YearMonth = yearMonth })),
                count = db.ExecuteScalar<int>($"SELECT COUNT(*) FROM wages{w}", new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId, YearMonth = yearMonth }),
            });
        });

        app.MapPost("/api/wages", async (HttpContext ctx, WageDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            // WageDto 金额为元（double? 接收），落库前统一 ToFen 转分（单位契约）
            var (ok, actualWage, missing) = TryResolveActualWage(dto);
            if (!ok) return Results.BadRequest(new { success = false, error = $"POST /api/wages: actualWage 缺失且推算所需字段缺失: {missing}" });
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO wages (project_id,member_id,project_worker_id,year_month,daily_wage,work_days,bonus,deduction,
                 actual_wage,paid_amount,paid_date,created_by,created_at,updated_at, last_modified_at) VALUES (@ProjectId,@MemberId,@ProjectWorkerId,@YearMonth,@DailyWage,@WorkDays,@Bonus,@Deduction,
                        @ActualWage,@PaidAmount,@PaidDate,@CreatedBy,@Now,@Now, @Now);
                SELECT last_insert_rowid();",
                new { dto.ProjectId, dto.MemberId, dto.ProjectWorkerId, dto.YearMonth,
                      DailyWage = ToFen(dto.DailyWage ?? 0),
                      dto.WorkDays,
                      Bonus = ToFen(dto.Bonus ?? 0),
                      Deduction = ToFen(dto.Deduction ?? 0),
                      ActualWage = ToFen(actualWage),
                      PaidAmount = dto.PaidAmount.HasValue ? ToFen(dto.PaidAmount.Value) : (long?)null,
                      dto.PaidDate, CreatedBy = uid, Now = now() });
            // fire-and-forget: upsert 实体到知识库种子表
            var wageCapturedId = id;
            var wageProjectId = dto.ProjectId;
            _ = Task.Run(async () =>
            {
                try
                {
                    using var scope = ctx.RequestServices.CreateScope();
                    var sp = scope.ServiceProvider;
                    var bgDb = sp.GetRequiredService<IDbConnection>();
                    var bgEmb = sp.GetRequiredService<IEmbeddingService>();
                    var svc = new KnowledgeEntityService(bgDb, bgEmb);
                    // 从库中取 worker name
                    var workerName = bgDb.ExecuteScalar<string>("SELECT COALESCE(m.name, '未知') FROM wages w LEFT JOIN members m ON w.member_id=m.id WHERE w.id=@Id", new { Id = wageCapturedId }) ?? "未知";
                    var yearMonth = bgDb.ExecuteScalar<string>("SELECT year_month FROM wages WHERE id=@Id", new { Id = wageCapturedId }) ?? "";
                    await svc.UpsertEntityAsync("wage", wageCapturedId, $"{workerName} {yearMonth}工资".Trim(), wageProjectId);
                }
                catch (Exception ex) { Console.Error.WriteLine($"[EntitySeed] wage upsert 失败: {ex.Message}"); }
            });
            return Common.Ok(id);
        });

        app.MapPut("/api/wages", async (HttpContext ctx, WageDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var (ok, actualWage, missing) = TryResolveActualWage(dto);
            if (!ok) return Results.BadRequest(new { success = false, error = $"PUT /api/wages: actualWage 缺失且推算所需字段缺失: {missing}" });
            // WageDto 金额为元，落库前 ToFen 转分（单位契约）
            var affected = await db.ExecuteAsync(@"UPDATE wages SET daily_wage=@DailyWage,work_days=@WorkDays,
                bonus=@Bonus,deduction=@Deduction,actual_wage=@ActualWage,paid_amount=@PaidAmount,
                paid_date=@PaidDate,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { dto.Id,
                      DailyWage = ToFen(dto.DailyWage ?? 0),
                      dto.WorkDays,
                      Bonus = ToFen(dto.Bonus ?? 0),
                      Deduction = ToFen(dto.Deduction ?? 0),
                      ActualWage = ToFen(actualWage),
                      PaidAmount = dto.PaidAmount.HasValue ? ToFen(dto.PaidAmount.Value) : (long?)null,
                      dto.PaidDate,
                      Uid = uid, IsAdmin = isAdmin, Now = now() });
            // fire-and-forget: upsert 实体到知识库种子表
            if (affected > 0 && dto.Id.HasValue)
            {
                var wagePutId = dto.Id.Value;
                _ = Task.Run(async () =>
                {
                    try
                    {
                        using var scope = ctx.RequestServices.CreateScope();
                        var sp = scope.ServiceProvider;
                        var bgDb = sp.GetRequiredService<IDbConnection>();
                        var bgEmb = sp.GetRequiredService<IEmbeddingService>();
                        var svc = new KnowledgeEntityService(bgDb, bgEmb);
                        var workerName = bgDb.ExecuteScalar<string>("SELECT COALESCE(m.name, '未知') FROM wages w LEFT JOIN members m ON w.member_id=m.id WHERE w.id=@Id", new { Id = wagePutId }) ?? "未知";
                        var yearMonth = bgDb.ExecuteScalar<string>("SELECT year_month FROM wages WHERE id=@Id", new { Id = wagePutId }) ?? "";
                        var pid = bgDb.ExecuteScalar<long?>("SELECT project_id FROM wages WHERE id=@Id", new { Id = wagePutId });
                        await svc.UpsertEntityAsync("wage", wagePutId, $"{workerName} {yearMonth}工资".Trim(), pid);
                    }
                    catch (Exception ex) { Console.Error.WriteLine($"[EntitySeed] wage PUT upsert 失败: {ex.Message}"); }
                });
            }
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

        // 与 archive 对称的解锁端点：payment_locked 1 → 0（D-10-2）
        app.MapPost("/api/wages/batch-unarchive", async (HttpContext ctx, List<long> ids, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var count = 0;
            foreach (var id in ids)
                count += await db.ExecuteAsync("UPDATE wages SET payment_locked=0,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                    new { Id = id, Uid = uid, IsAdmin = isAdmin, Now = now() });
            return Common.Ok(new { unarchived = count });
        });

        app.MapPost("/api/wages/match-receipts", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            return Common.Ok(Array.Empty<object>()); // 绠€鍖栫増
        });

        app.MapPost("/api/wages/confirm-matches", (HttpContext ctx, IDbConnection db) =>
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
            // 金额列分→元（单位契约）
            return Common.Ok(ToYuanRows(db.Query(sql, new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId, YearMonth = yearMonth })));
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
                amount = ToYuan(db.ExecuteScalar<decimal>($"SELECT COALESCE(SUM(actual_wage),0) FROM wages{w}", new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId, CurrentMonth = DateTime.Now.ToString("yyyy-MM") })),
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
            // 金额列分→元（单位契约）
            return Common.Ok(ToYuanRows(db.Query(sql, new { ProjectId = projectId, CurrentMonth = DateTime.Now.ToString("yyyy-MM") })));
        });

        app.MapPost("/api/wages/batch-save", async (HttpContext ctx, List<JsonElement> records, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var saved = 0;
            var skipped = 0;
            var skippedItems = new List<object>();
            foreach (var dto in records)
            {
                // 字段名与前端 WageRecord（src/types/electron.d.ts）camelCase 一致；
                // 前端金额单位为元，wages 表金额列为 INTEGER（分，迁移 003）→ 入库前 ×100 转分
                var item = JsonSerializer.Deserialize<WageBatchItem>(dto.GetRawText(), WebJson) ?? throw new InvalidDataException("batch-save: 工资记录反序列化失败");
                // 必填校验：唯一索引 (project_id, project_worker_id, year_month) 三列均不允许 NULL
                //（SQLite 中 NULL 互不相等，含 NULL 的行会绕开唯一约束造成重复）
                // 直接返回 400：全局 UseExceptionHandler 会把异常包成 500 通用消息
                if (!item.ProjectId.HasValue || !item.ProjectWorkerId.HasValue || string.IsNullOrEmpty(item.YearMonth))
                    return Results.BadRequest(new { success = false, error = $"batch-save: projectId / projectWorkerId / yearMonth 必填（第 {saved + skipped + 1} 条）" });
                // 金额字段缺省（JSON 无此键）→ 400 指出缺哪些，不许静默当 0 保存
                var missingMoney = new List<string>();
                if (!item.DailyWage.HasValue) missingMoney.Add("dailyWage");
                if (!item.WorkDays.HasValue) missingMoney.Add("workDays");
                if (!item.Bonus.HasValue) missingMoney.Add("bonus");
                if (!item.Deduction.HasValue) missingMoney.Add("deduction");
                if (!item.ActualWage.HasValue) missingMoney.Add("actualWage");
                if (missingMoney.Count > 0)
                    return Results.BadRequest(new { success = false, error = $"batch-save: 第 {saved + skipped + 1} 条缺失金额字段: {string.Join(", ", missingMoney)}" });
                // 显式 upsert（035 部分唯一索引 ux_wages_pw_month 为冲突目标）：
                // DO UPDATE 只更新业务字段与 updated_at，绝不触碰 created_by / created_at /
                // paid_amount / paid_date / status / deleted_at 等列；
                // 跳过条件含两件事：paid_amount != 0（自动「已发款」保护）与
                // payment_locked = 1（人工归档锁定）——两个独立语义，不是同一事实两处
                var affected = await db.ExecuteAsync(@"INSERT INTO wages
                    (project_id,project_worker_id,year_month,daily_wage,work_days,bonus,deduction,actual_wage,created_by,created_at,updated_at)
                    VALUES (@ProjectId,@ProjectWorkerId,@YearMonth,@DailyWage,@WorkDays,@Bonus,@Deduction,@ActualWage,@CreatedBy,@Now,@Now)
                    ON CONFLICT(project_id, project_worker_id, year_month) WHERE deleted_at IS NULL
                    DO UPDATE SET
                        daily_wage = excluded.daily_wage,
                        work_days  = excluded.work_days,
                        bonus      = excluded.bonus,
                        deduction  = excluded.deduction,
                        actual_wage = excluded.actual_wage,
                        updated_at = excluded.updated_at
                    WHERE COALESCE(wages.paid_amount, 0) = 0
                      AND COALESCE(wages.payment_locked, 0) = 0",
                    new {
                        item.ProjectId, item.ProjectWorkerId, item.YearMonth,
                        DailyWage = ToFen(item.DailyWage!.Value),
                        WorkDays = item.WorkDays!.Value,
                        Bonus = ToFen(item.Bonus!.Value),
                        Deduction = ToFen(item.Deduction!.Value),
                        ActualWage = ToFen(item.ActualWage!.Value),
                        CreatedBy = uid, Now = now()
                    });
                if (affected > 0)
                {
                    saved++;
                }
                else
                {
                    skipped++;
                    skippedItems.Add(new { projectWorkerId = item.ProjectWorkerId, yearMonth = item.YearMonth });
                }
            }
            return Common.Ok(new { saved, skipped, skippedItems });
        });

        // POST /api/wages/batch-payment — 批量付款写入（D-9）
        // 付款列与工资列由两个端点分管：batch-save 只管工资列，本端点只管付款列。
        // 守卫是两件事：paid_amount（自动「已发款」保护）在 batch-save 侧；
        // payment_locked（人工归档锁定）在本端点侧。
        // 注意：PUT /api/wages 单条目前无守卫（既有行为，batch-payment 落地后收窄，见记档）
        app.MapPost("/api/wages/batch-payment", async (HttpContext ctx, List<JsonElement> records, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var saved = 0;
            var skipped = 0;
            var skippedItems = new List<object>();
            var index = 0;
            foreach (var dto in records)
            {
                index++;
                var item = JsonSerializer.Deserialize<WagePaymentItem>(dto.GetRawText(), WebJson) ?? throw new InvalidDataException("batch-payment: 付款记录反序列化失败");
                // 必填校验：id / paidAmount / paidDate（直接 400，全局 handler 会把异常吞成 500）
                var missing = new List<string>();
                if (!item.Id.HasValue) missing.Add("id");
                if (!item.PaidAmount.HasValue) missing.Add("paidAmount");
                if (string.IsNullOrEmpty(item.PaidDate)) missing.Add("paidDate");
                if (missing.Count > 0)
                    return Results.BadRequest(new { success = false, error = $"batch-payment: 第 {index} 条缺失字段: {string.Join(", ", missing)}" });
                // 只 SET 付款列 + 时间戳/版本；一个工资列都不许出现在 SET 里。
                // bank_receipt_path 缺省 = 不改（COALESCE），清空必须走 batch-clear-payments；
                // paid_date 为必填（上方 400 兜底），无缺省问题。
                // saved 取 ExecuteAsync 实际影响行数累加（不许用入参长度）
                var affected = await db.ExecuteAsync(@"UPDATE wages SET
                        paid_amount=@PaidAmount, paid_date=@PaidDate, bank_receipt_path=COALESCE(@BankReceiptPath, bank_receipt_path),
                        updated_at=@Now, version=version+1, last_modified_at=@Now
                    WHERE id=@Id AND deleted_at IS NULL
                      AND COALESCE(payment_locked, 0) = 0
                      AND (created_by=@Uid OR @IsAdmin=1)",
                    new {
                        Id = item.Id,
                        PaidAmount = ToFen(item.PaidAmount!.Value),
                        PaidDate = item.PaidDate,
                        BankReceiptPath = item.BankReceiptPath,
                        Uid = uid, IsAdmin = isAdmin, Now = now()
                    });
                if (affected > 0) saved++;
                else { skipped++; skippedItems.Add(new { id = item.Id }); }
            }
            return Common.Ok(new { saved, skipped, skippedItems });
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
            // SUM(w.actual_wage) 来自 wages 表 → 分，ToYuan 转元（单位契约）
            var teamTotal = details.Sum(d => ToYuan((decimal)(d.total_wage ?? 0)));
            var rows = details.Select(d => new
            {
                worker_name = (string)d.worker_name,
                // project_workers.daily_wage 仍为元直通（ProjectWorkerMiscEndpoints 写入侧
                // 未走 ToFen），库内是元；不做 ÷100，属全仓单位问题，不在 wages 收口范围
                daily_wage = d.daily_wage,
                months = d.months,
                work_days = d.work_days,
                total_wage = ToYuan((decimal)(d.total_wage ?? 0)),
            }).ToArray();
            return Common.Ok(new { workerCount, teamTotal, details = rows });
        });
    }

    // 前端金额单位为元；表列为 INTEGER（分，迁移 003）→ ×100 转分
    private static long ToFen(double yuan) => (long)Math.Round(yuan * 100);

    // actualWage 缺省推算：任一推算字段缺失 → 显式 400（不许静默归零：
    // 曾因 ?? 0 兜底导致前端少传 bonus 时落库 actual_wage=0，显示「实发 0 元」）
    // 注意：不能抛 BadHttpRequestException —— 全局 UseExceptionHandler 会把
    // 一切未处理异常包成 500 通用消息，400 与字段名都会丢失
    private static (bool Ok, double Value, string? Missing) TryResolveActualWage(WageDto dto)
    {
        if (dto.ActualWage.HasValue) return (true, dto.ActualWage.Value, null);
        var missing = new List<string>();
        if (!dto.DailyWage.HasValue) missing.Add("dailyWage");
        if (!dto.WorkDays.HasValue) missing.Add("workDays");
        if (!dto.Bonus.HasValue) missing.Add("bonus");
        if (!dto.Deduction.HasValue) missing.Add("deduction");
        if (missing.Count > 0) return (false, 0, string.Join(", ", missing));
        return (true, dto.DailyWage!.Value * dto.WorkDays!.Value + dto.Bonus!.Value - dto.Deduction!.Value, null);
    }

    // 分→元（API 响应侧，与 ToFen 配对；单位契约见文件头部）
    private static decimal ToYuan(long fen) => fen / 100m;
    private static decimal ToYuan(decimal fen) => fen / 100m;

    // 批量查询行：把 wages 金额列（分）转成元后输出；work_days 为天数不转。
    // 仅用于 SELECT w.* 类端点（GET /api/wages、payment-records、overdue-list）
    private static IDictionary<string, object?>[] ToYuanRows(IEnumerable<dynamic> rows)
    {
        var moneyCols = new[] { "daily_wage", "bonus", "deduction", "actual_wage", "paid_amount" };
        return rows.Select(r =>
        {
            var d = (IDictionary<string, object?>)r;
            foreach (var k in moneyCols)
                if (d.TryGetValue(k, out var v) && v != null && !(v is DBNull))
                    d[k] = ToYuan(Convert.ToInt64(v));
            return d;
        }).ToArray();
    }

    // 反序列化前端 camelCase 字段需用 Web 默认选项（camelCase + 大小写不敏感）
    private static readonly JsonSerializerOptions WebJson = new(JsonSerializerDefaults.Web);
}

// B-1: 批量写入 DTO —— 字段名与前端 WageRecord（src/types/electron.d.ts）camelCase 一致
// 金额字段前端单位为元；表列为 INTEGER（分，迁移 003），入库经 ToFen 转分。
// 金额字段用可空 double 接收：缺省（JSON 无此键）与 0（显式 0）区分，
// 缺省在 batch-save 中按缺失字段返回 400，不许静默当 0 保存
record WageBatchItem(long? ProjectId, long? ProjectWorkerId, string? YearMonth, double? DailyWage, double? WorkDays, double? Bonus, double? Deduction, double? ActualWage);

// batch-create 无前端调用方；camelCase 命名对齐 SQL 参数
record AttendanceBatchItem(long? MemberId, long? ProjectId, long? ProjectWorkerId, string? YearMonth, double WorkDays, long? DaysOff, long? IsFullAttendance, string? DailyStatus);

// batch-payment 入参：按 id 定位（行必然已存在），只写付款列；
// paidAmount 单位为元（ToFen 落库），用可空类型区分「缺省」与 0
record WagePaymentItem(long? Id, double? PaidAmount, string? PaidDate, string? BankReceiptPath);

