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
            // G2 B2: 考勤写操作 → wages:create
            if (!CurrentUser.HasPermission(ctx, db, "wages:create")) return Results.Forbid();
            // R9-3 G75 项目级写入门：单条考勤创建必须落在可写项目（projectId 必填）
            if (!dto.ProjectId.HasValue) return Results.BadRequest(new { success = false, error = "attendances: projectId 必填" });
            if (!CurrentUser.CanWriteProject(ctx, db, dto.ProjectId.Value)) return Results.Forbid();
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
            // G2 B2: 考勤写操作 → wages:update
            if (!CurrentUser.HasPermission(ctx, db, "wages:update")) return Results.Forbid();
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
            // G2 B2: 考勤写操作 → wages:delete
            if (!CurrentUser.HasPermission(ctx, db, "wages:delete")) return Results.Forbid();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            return (await db.ExecuteAsync("DELETE FROM attendances WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapPost("/api/attendances/batch-delete", async (HttpContext ctx, List<long> ids, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B2: 考勤写操作 → wages:delete
            if (!CurrentUser.HasPermission(ctx, db, "wages:delete")) return Results.Forbid();
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
            // G2 B2: 考勤写操作 → wages:create
            if (!CurrentUser.HasPermission(ctx, db, "wages:create")) return Results.Forbid();
            // R9-3 G75 项目级写入门：先收集 distinct ProjectId；空 → 400；任一门不过 → 整单 403
            var projectIds = new HashSet<long>();
            foreach (var r in records)
            {
                var item0 = JsonSerializer.Deserialize<AttendanceBatchItem>(r.GetRawText(), WebJson) ?? throw new InvalidDataException("batch-create: 考勤记录反序列化失败");
                if (item0.ProjectId.HasValue) projectIds.Add(item0.ProjectId.Value);
            }
            if (projectIds.Count == 0) return Results.BadRequest(new { success = false, error = "batch-create: 所有记录缺 projectId" });
            foreach (var pid in projectIds)
                if (!CurrentUser.CanWriteProject(ctx, db, pid)) return Results.Forbid();
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

        // POST /api/attendances/generate — 生成默认考勤（staff 路径，窗口 E 接通本体）
        // 语义：为 (projectId, yearMonth) 下尚未有考勤行的 memberId 补一行
        //   「默认全勤」记录（work_days=当月天数，daily_status 全 work，与人事模块
        //   「生成默认考勤 → 全勤 → 编辑调整」行为一致）；已有行一律跳过，天然幂等。
        // 响应 = { success, data: { count } }，count 为本轮新建行数
        // （2026-08-07 原作者拍板：维持全勤预填，与人事模块一致）
        app.MapPost("/api/attendances/generate", (HttpContext ctx, AttendanceGenerateDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B2: 考勤生成 → wages:create
            if (!CurrentUser.HasPermission(ctx, db, "wages:create")) return Results.Forbid();
            var scope = CurrentUser.GetDataScope(ctx);
            if (dto is null || !dto.ProjectId.HasValue || string.IsNullOrEmpty(dto.YearMonth))
                return Results.BadRequest(new { success = false, error = "generate: projectId / yearMonth 必填" });
            if (!TryParseYearMonth(dto.YearMonth, out var year, out var month))
                return Results.BadRequest(new { success = false, error = $"generate: yearMonth 格式须为 YYYY-MM，收到: {dto.YearMonth}" });
            var projectId = dto.ProjectId.Value;
            // R9-3 G75 项目级写入门（循环之前）
            if (!CurrentUser.CanWriteProject(ctx, db, projectId)) return Results.Forbid();
            var days = DateTime.DaysInMonth(year, month);
            var count = 0;
            foreach (var memberId in dto.MemberIds ?? new List<long>())
            {
                var exists = db.ExecuteScalar<int>("SELECT COUNT(*) FROM attendances WHERE project_id=@ProjectId AND year_month=@YearMonth AND member_id=@MemberId",
                    new { ProjectId = projectId, YearMonth = dto.YearMonth, MemberId = memberId });
                if (exists > 0) continue;
                db.Execute(@"INSERT INTO attendances (member_id,project_id,year_month,work_days,days_off,is_full_attendance,daily_status,created_by,created_at,updated_at,last_modified_at)
                    VALUES (@MemberId,@ProjectId,@YearMonth,@WorkDays,0,1,@DailyStatus,@CreatedBy,@Now,@Now,@Now)",
                    new { MemberId = memberId, ProjectId = projectId, YearMonth = dto.YearMonth,
                          WorkDays = days, DailyStatus = AllWorkStatusJson(days), CreatedBy = uid, Now = now() });
                count++;
            }
            return Common.Ok(new { count });
        });

        // POST /api/attendances/generate-v2 — 生成默认考勤（worker 路径，窗口 E 接通本体）
        // 语义同上，按 project_worker_id 定位（工资页「生成考勤」按钮走此端点，
        // 前端传该项目活跃工人的 pwIds）；worker 行 member_id 为 NULL
        // （2026-08-07 原作者拍板：维持全勤预填，与人事模块一致）
        app.MapPost("/api/attendances/generate-v2", (HttpContext ctx, AttendanceGenerateV2Dto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B2: 考勤生成 → wages:create
            if (!CurrentUser.HasPermission(ctx, db, "wages:create")) return Results.Forbid();
            var scope = CurrentUser.GetDataScope(ctx);
            if (dto is null || !dto.ProjectId.HasValue || string.IsNullOrEmpty(dto.YearMonth))
                return Results.BadRequest(new { success = false, error = "generate-v2: projectId / yearMonth 必填" });
            if (!TryParseYearMonth(dto.YearMonth, out var year, out var month))
                return Results.BadRequest(new { success = false, error = $"generate-v2: yearMonth 格式须为 YYYY-MM，收到: {dto.YearMonth}" });
            var projectId = dto.ProjectId.Value;
            // R9-3 G75 项目级写入门（循环之前）
            if (!CurrentUser.CanWriteProject(ctx, db, projectId)) return Results.Forbid();
            var days = DateTime.DaysInMonth(year, month);
            var count = 0;
            var skipped = new List<long>();
            foreach (var pwId in dto.ProjectWorkerIds ?? new List<long>())
            {
                // G2 B2 特任务: pwId 必须属于 projectId（防跨项目写入他人考勤），不属于的跳过并记响应
                var belongs = db.ExecuteScalar<int>("SELECT COUNT(*) FROM project_workers WHERE id=@PwId AND project_id=@ProjectId",
                    new { PwId = pwId, ProjectId = projectId });
                if (belongs == 0) { skipped.Add(pwId); continue; }
                var exists = db.ExecuteScalar<int>("SELECT COUNT(*) FROM attendances WHERE project_id=@ProjectId AND year_month=@YearMonth AND project_worker_id=@PwId",
                    new { ProjectId = projectId, YearMonth = dto.YearMonth, PwId = pwId });
                if (exists > 0) continue;
                db.Execute(@"INSERT INTO attendances (member_id,project_id,project_worker_id,year_month,work_days,days_off,is_full_attendance,daily_status,created_by,created_at,updated_at,last_modified_at)
                    VALUES (NULL,@ProjectId,@PwId,@YearMonth,@WorkDays,0,1,@DailyStatus,@CreatedBy,@Now,@Now,@Now)",
                    new { ProjectId = projectId, PwId = pwId, YearMonth = dto.YearMonth,
                          WorkDays = days, DailyStatus = AllWorkStatusJson(days), CreatedBy = uid, Now = now() });
                count++;
            }
            return Common.Ok(new { count, skipped });
        });

        // POST /api/attendances/batch-import — 按出勤天数批量导入（Excel 导入路径）
        // 语义：按 (projectId, yearMonth, projectWorkerId) 定位；存在 → 只刷新 work_days
        //   （不动手工 daily_status / days_off），updated++；不存在 → 新建行，created++
        // UPDATE 分支归属守卫（R9-1 G73 修复，对齐 PUT /api/attendances）。
        // 响应 = { success, data: { created, updated, skipped } }
        app.MapPost("/api/attendances/batch-import", (HttpContext ctx, AttendanceImportDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B2: 考勤导入 → wages:create
            if (!CurrentUser.HasPermission(ctx, db, "wages:create")) return Results.Forbid();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            if (dto is null || !dto.ProjectId.HasValue || string.IsNullOrEmpty(dto.YearMonth))
                return Results.BadRequest(new { success = false, error = "batch-import: projectId / yearMonth 必填" });
            var projectId = dto.ProjectId.Value;
            // R9-3 G75 项目级写入门（循环之前；UPDATE 行级守卫 R9-1 第二层防线原地保留）
            if (!CurrentUser.CanWriteProject(ctx, db, projectId)) return Results.Forbid();
            var created = 0;
            var updated = 0;
            var skipped = new List<long>();
            var index = 0;
            foreach (var item in dto.Records ?? new List<AttendanceImportItem>())
            {
                index++;
                if (!item.ProjectWorkerId.HasValue || !item.WorkDays.HasValue)
                    return Results.BadRequest(new { success = false, error = $"batch-import: 第 {index} 条缺失 projectWorkerId / workDays" });
                var existingId = db.ExecuteScalar<long?>("SELECT id FROM attendances WHERE project_id=@ProjectId AND year_month=@YearMonth AND project_worker_id=@PwId",
                    new { ProjectId = projectId, YearMonth = dto.YearMonth, PwId = item.ProjectWorkerId });
                if (existingId.HasValue)
                {
                    // 归属守卫：非 admin 只能刷新自己创建的行（对齐 PUT /api/attendances）；未命中 → skipped
                    var affected = db.Execute(@"UPDATE attendances SET work_days=@WorkDays,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                        new { WorkDays = item.WorkDays.Value, Id = existingId.Value, Uid = uid, IsAdmin = isAdmin, Now = now() });
                    if (affected > 0) updated++;
                    else skipped.Add(item.ProjectWorkerId.Value);
                }
                else
                {
                    db.Execute(@"INSERT INTO attendances (member_id,project_id,project_worker_id,year_month,work_days,created_by,created_at,updated_at,last_modified_at)
                        VALUES (NULL,@ProjectId,@PwId,@YearMonth,@WorkDays,@CreatedBy,@Now,@Now,@Now)",
                        new { ProjectId = projectId, PwId = item.ProjectWorkerId, YearMonth = dto.YearMonth,
                              WorkDays = item.WorkDays.Value, CreatedBy = uid, Now = now() });
                    created++;
                }
            }
            return Common.Ok(new { created, updated, skipped });
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
            where.Add(CurrentUser.UserFilterWithAuthorizedProjects(scope, "wages.project_id"));
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
            // G2 B2: 工资写操作 → wages:create
            if (!CurrentUser.HasPermission(ctx, db, "wages:create")) return Results.Forbid();
            // R9-4 G76 项目级写入门：创建工资行必须落在可写项目（projectId 必填）
            if (!dto.ProjectId.HasValue) return Results.BadRequest(new { success = false, error = "POST /api/wages: projectId 必填" });
            if (!CurrentUser.CanWriteProject(ctx, db, dto.ProjectId.Value)) return Results.Forbid();
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
            // G2 B2: 工资写操作 → wages:update
            if (!CurrentUser.HasPermission(ctx, db, "wages:update")) return Results.Forbid();
            var (ok, actualWage, missing) = TryResolveActualWage(dto);
            if (!ok) return Results.BadRequest(new { success = false, error = $"PUT /api/wages: actualWage 缺失且推算所需字段缺失: {missing}" });
            // R9-9 方案丙更新侧：授权项目跨人可改 + audit（B41）
            // 预读行归属与锁状态（C# 单点裁决归属，SQL WHERE 不再含 created_by/IsAdmin）
            if (!dto.Id.HasValue) return Results.Forbid();
            var row = db.QueryFirstOrDefault(
                "SELECT created_by, project_id, COALESCE(paid_amount,0) AS paid, COALESCE(payment_locked,0) AS locked FROM wages WHERE id=@Id AND deleted_at IS NULL",
                new { Id = dto.Id.Value });
            // 行不存在 → 维持现状「不存在=403」语义（Pin5 钉住）
            if (row == null) return Results.Forbid();
            // 锁最先：已发款/已归档 → 409（admin/授权也不例外）
            var paid = Convert.ToInt64(row.paid ?? 0);
            var locked = Convert.ToInt64(row.locked ?? 0);
            if (paid != 0 || locked != 0)
                return Results.Json(new { success = false, error = "该行已发款或已归档，工资列不可再单条修改（付款请走批量付款，归档请先解锁）" }, statusCode: 409);
            // 归属裁决：Denied → 403；AllowedViaAuthorization → 跨人修改落 audit（同事务 fail-closed）
            var createdBy = row.created_by as string;
            var projectId = row.project_id as long?;
            var access = RowWriteGate.Classify(ctx, db, createdBy, projectId);
            if (access == RowWriteOutcome.Denied) return Results.Forbid();

            // 窗口 H-2（D-9 落地）：PUT 只管工资列（D-6 契约「PUT 只管工资列，
            // 付款走 batch-payment」）。SET 不含 paid_amount/paid_date/bank_receipt_path；
            // 锁条件保留在 WHERE（行级兜底，理论不可达）；归属条件移出 SQL（C# 单点裁决）。
            using var tx = db.BeginTransaction();
            var affected = await db.ExecuteAsync(@"UPDATE wages SET daily_wage=@DailyWage,work_days=@WorkDays,
                bonus=@Bonus,deduction=@Deduction,actual_wage=@ActualWage,updated_at=@Now,
                version=version+1, last_modified_at=@Now
                WHERE id=@Id AND deleted_at IS NULL
                  AND COALESCE(paid_amount,0)=0 AND COALESCE(payment_locked,0)=0",
                new { dto.Id,
                      DailyWage = ToFen(dto.DailyWage ?? 0),
                      dto.WorkDays,
                      Bonus = ToFen(dto.Bonus ?? 0),
                      Deduction = ToFen(dto.Deduction ?? 0),
                      ActualWage = ToFen(actualWage),
                      Now = now() }, tx);
            if (access == RowWriteOutcome.AllowedViaAuthorization)
            {
                // 跨人修改落审计（fail-closed：审计写不进 → 事务回滚 → 修改不生效）
                AuditWriter.CrossUserEdit(db, tx, ctx, "wages", dto.Id.Value, "PUT /api/wages", createdBy, projectId);
            }
            tx.Commit();

            // fire-and-forget: upsert 实体到知识库种子表（Commit 后原条件原样）
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
            if (affected > 0) return Common.Ok();
            // affected=0（锁竞态兜底，理论不可达——锁已在预读拦截）→ 409 消息原文
            return Results.Json(new { success = false, error = "该行已发款或已归档，工资列不可再单条修改（付款请走批量付款，归档请先解锁）" }, statusCode: 409);
        });

        app.MapDelete("/api/wages/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B2: 工资写操作 → wages:delete
            if (!CurrentUser.HasPermission(ctx, db, "wages:delete")) return Results.Forbid();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            return (await db.ExecuteAsync("UPDATE wages SET deleted_at=@Now WHERE id=@Id AND deleted_at IS NULL AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin, Now = now() })) > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapPost("/api/wages/batch-delete", async (HttpContext ctx, List<long> ids, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B2: 工资写操作 → wages:delete
            if (!CurrentUser.HasPermission(ctx, db, "wages:delete")) return Results.Forbid();
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
            // G2 B2: 工资写操作 → wages:update
            if (!CurrentUser.HasPermission(ctx, db, "wages:update")) return Results.Forbid();
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
            // G2 B2: 工资写操作 → wages:update
            if (!CurrentUser.HasPermission(ctx, db, "wages:update")) return Results.Forbid();
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
            // G2 B2: 工资写操作 → wages:update
            if (!CurrentUser.HasPermission(ctx, db, "wages:update")) return Results.Forbid();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var count = 0;
            foreach (var id in ids)
                count += await db.ExecuteAsync("UPDATE wages SET payment_locked=0,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                    new { Id = id, Uid = uid, IsAdmin = isAdmin, Now = now() });
            return Common.Ok(new { unarchived = count });
        });

        // ═══════════════════════════════════════════════════════════
        // I-2: 回单批量匹配 / 确认（propose-confirm，绝不自动写）
        // 匹配是纯读打分（wages:read），确认才写付款列（wages:update，
        // 守卫与 batch-payment 完全一致）——两个端点分管「建议」与「落库」两步
        // ═══════════════════════════════════════════════════════════

        // POST /api/wages/match-receipts — 批量回单匹配（纯读，一行不写）
        // 入参 = { projectId, yearMonth?, receipts: [{ amount(元), date, counterparty, receiptPath }] }
        // 对每张回单在项目范围内找候选工资行（deleted_at IS NULL AND paid_amount IS NULL
        // 且未归档；已发款/已归档行永不进候选），按优先级打分：
        //   ①金额分相等（ToFen 后等值）—— 候选准入，容差外不进候选
        //   ②工人姓名与 counterparty 互相包含（任一方向）
        //   ③回单日期与 year_month 同月或相邻月
        // 响应 = 每回单一个 candidates 数组（wageId/workerName/amount(元)/yearMonth/score
        // + 命中理由文案），无候选给空数组
        app.MapPost("/api/wages/match-receipts", (HttpContext ctx, MatchReceiptsDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B2: 回单匹配是工资读取操作（纯读）→ wages:read
            if (!CurrentUser.HasPermission(ctx, db, "wages:read")) return Results.Forbid();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            if (dto is null || !dto.ProjectId.HasValue || dto.Receipts is null)
                return Results.BadRequest(new { success = false, error = "match-receipts: projectId / receipts 必填" });
            var projectId = dto.ProjectId.Value;
            // 候选行：项目内、未软删、未发款（paid_amount IS NULL）、未归档（payment_locked=0）；
            // user-dim 过滤与 GET /api/wages 同规则
            var rows = db.Query(@"SELECT w.id, w.year_month, w.actual_wage,
                            COALESCE(m.name, wr.name) AS worker_name
                            FROM wages w
                            LEFT JOIN members m ON w.member_id=m.id
                            LEFT JOIN project_workers pw ON w.project_worker_id=pw.id
                            LEFT JOIN workers wr ON pw.worker_id=wr.id
                            WHERE w.project_id=@ProjectId AND w.deleted_at IS NULL
                              AND w.paid_amount IS NULL AND COALESCE(w.payment_locked,0)=0
                              AND " + CurrentUser.UserFilterWithAuthorizedProjects(scope, "w.project_id", "w.created_by"),
                new { ProjectId = projectId, Uid = uid, IsAdmin = isAdmin }).ToList();
            var matches = new List<object>();
            foreach (var receipt in dto.Receipts)
            {
                // 单张回单缺金额 → 无法参与金额匹配，按空候选返回（不整单 400）
                if (receipt is null || !receipt.Amount.HasValue)
                {
                    matches.Add(new { receiptPath = receipt?.ReceiptPath, date = receipt?.Date,
                                      counterparty = receipt?.Counterparty, amount = receipt?.Amount,
                                      candidates = Array.Empty<object>() });
                    continue;
                }
                var amountFen = ToFen(receipt.Amount.Value);
                var candidates = new List<(long WageId, string? WorkerName, decimal Amount, string? YearMonth, int Score, List<string> Reasons)>();
                foreach (var r in rows)
                {
                    var actualFen = Convert.ToInt64(r.actual_wage ?? 0);
                    if (actualFen != amountFen) continue; // ① 金额分相等（容差外不进候选）
                    var workerName = (string?)r.worker_name;
                    var score = 3; // ① 金额分相等（候选准入，最高优先级）
                    var reasons = new List<string> { "金额分相等" };
                    // ② 工人姓名与 counterparty 互相包含（任一方向）
                    var nameHit = !string.IsNullOrWhiteSpace(workerName)
                        && !string.IsNullOrWhiteSpace(receipt.Counterparty)
                        && (workerName.Contains(receipt.Counterparty) || receipt.Counterparty.Contains(workerName));
                    if (nameHit) { score += 2; reasons.Add("姓名互相包含"); }
                    // ③ 回单日期与 year_month 同月或相邻月
                    if (IsSameOrAdjacentMonth(receipt.Date, (string?)r.year_month)) { score += 1; reasons.Add("日期与工资月份同月或相邻"); }
                    candidates.Add((Convert.ToInt64(r.id), workerName, ToYuan(actualFen), (string?)r.year_month, score, reasons));
                }
                // 分数高（命中规则多）排前：等值金额+姓名命中排第一
                candidates.Sort((a, b) => b.Score.CompareTo(a.Score));
                matches.Add(new
                {
                    receiptPath = receipt.ReceiptPath, date = receipt.Date,
                    counterparty = receipt.Counterparty, amount = receipt.Amount,
                    candidates = candidates.Select(c => new { wageId = c.WageId, workerName = c.WorkerName,
                        amount = c.Amount, yearMonth = c.YearMonth, score = c.Score, reasons = c.Reasons })
                });
            }
            return Common.Ok(new { matches });
        });

        // POST /api/wages/confirm-matches — 批量回单确认（显式配对，绝不自动匹配写库）
        // 入参 = 显式配对数组 [{ wageId, paidAmount(元), paidDate, bankReceiptPath }]
        // 逐对写入，守卫与 batch-payment 完全一致（行存在、deleted_at IS NULL、
        // payment_locked=0、created_by/admin）；缺字段逐条 400；语义等价于
        // 「带回单路径的 batch-payment」（bankReceiptPath 必填，区别于 batch-payment 的可选）
        app.MapPost("/api/wages/confirm-matches", async (HttpContext ctx, List<ConfirmMatchPairDto> pairs, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B2: 回单确认写付款列 → wages:update
            if (!CurrentUser.HasPermission(ctx, db, "wages:update")) return Results.Forbid();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var saved = 0;
            var skipped = 0;
            var skippedItems = new List<object>();
            var index = 0;
            foreach (var pair in pairs ?? new List<ConfirmMatchPairDto>())
            {
                index++;
                // 缺字段逐条 400（与 batch-payment 同风格），不许静默跳过
                var missing = new List<string>();
                if (!pair.WageId.HasValue) missing.Add("wageId");
                if (!pair.PaidAmount.HasValue) missing.Add("paidAmount");
                if (string.IsNullOrEmpty(pair.PaidDate)) missing.Add("paidDate");
                if (string.IsNullOrEmpty(pair.BankReceiptPath)) missing.Add("bankReceiptPath");
                if (missing.Count > 0)
                    return Results.BadRequest(new { success = false, error = $"confirm-matches: 第 {index} 条缺失字段: {string.Join(", ", missing)}" });
                // 只 SET 付款列 + 回单路径 + 时间戳/版本；守卫与 batch-payment 完全一致
                var affected = await db.ExecuteAsync(@"UPDATE wages SET
                        paid_amount=@PaidAmount, paid_date=@PaidDate, bank_receipt_path=@BankReceiptPath,
                        updated_at=@Now, version=version+1, last_modified_at=@Now
                    WHERE id=@Id AND deleted_at IS NULL
                      AND COALESCE(payment_locked, 0) = 0
                      AND (created_by=@Uid OR @IsAdmin=1)",
                    new { Id = pair.WageId, PaidAmount = ToFen(pair.PaidAmount!.Value), PaidDate = pair.PaidDate,
                          BankReceiptPath = pair.BankReceiptPath, Uid = uid, IsAdmin = isAdmin, Now = now() });
                if (affected > 0) saved++;
                else { skipped++; skippedItems.Add(new { id = pair.WageId }); }
            }
            return Common.Ok(new { saved, skipped, skippedItems });
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
                ? " WHERE project_id=@ProjectId AND deleted_at IS NULL AND paid_amount IS NULL AND year_month < @CurrentMonth AND " + CurrentUser.UserFilterWithAuthorizedProjects(scope, "wages.project_id")
                : " WHERE deleted_at IS NULL AND paid_amount IS NULL AND year_month < @CurrentMonth AND " + CurrentUser.UserFilterWithAuthorizedProjects(scope, "wages.project_id");
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
            // G2 B2: 工资批量保存 → wages:update
            if (!CurrentUser.HasPermission(ctx, db, "wages:update")) return Results.Forbid();
            // R9-4 G76 项目级写入门：先收集 distinct ProjectId；空 → 400；任一门不过 → 整单 403
            var projectIds = new HashSet<long>();
            foreach (var r in records)
            {
                var item0 = JsonSerializer.Deserialize<WageBatchItem>(r.GetRawText(), WebJson) ?? throw new InvalidDataException("batch-save: 工资记录反序列化失败");
                if (item0.ProjectId.HasValue) projectIds.Add(item0.ProjectId.Value);
            }
            if (projectIds.Count == 0) return Results.BadRequest(new { success = false, error = "batch-save: 所有记录缺 projectId" });
            foreach (var pid in projectIds)
                if (!CurrentUser.CanWriteProject(ctx, db, pid)) return Results.Forbid();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
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
                      AND COALESCE(wages.payment_locked, 0) = 0
                      AND (wages.created_by = @Uid OR @IsAdmin = 1)",
                    new {
                        item.ProjectId, item.ProjectWorkerId, item.YearMonth,
                        DailyWage = ToFen(item.DailyWage!.Value),
                        WorkDays = item.WorkDays!.Value,
                        Bonus = ToFen(item.Bonus!.Value),
                        Deduction = ToFen(item.Deduction!.Value),
                        ActualWage = ToFen(item.ActualWage!.Value),
                        CreatedBy = uid, Uid = uid, IsAdmin = isAdmin, Now = now()
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
        // 窗口 H-2（D-9 落地）：PUT /api/wages 单条已收窄为工资列 only——
        // SET 无付款列 + WHERE 守卫已发款/已归档行；付款写入一律走本端点
        // 或 batch-clear-payments（取消发放）。
        app.MapPost("/api/wages/batch-payment", async (HttpContext ctx, List<JsonElement> records, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B2: 批量付款写入 → wages:update
            if (!CurrentUser.HasPermission(ctx, db, "wages:update")) return Results.Forbid();
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

        // POST /api/wages/generate — 生成工资表（窗口 D：接通「生成工资表」全链路）
        // 语义：
        //   · 源 = (projectId, yearMonth) 的考勤行；逐行 upsert 工资行，天然幂等
        //   · 日薪来源：worker 路径取 project_workers.daily_wage，staff 路径取
        //     members.daily_wage。两者读到的都是「元」直通值（ProjectWorkerMisc/
        //     MemberEndpoints 写入侧未走 ToFen，库内是元；与工人工库页面显示一致），
        //     落 wages 前 ToFen 转分 —— wages 金额列按单位契约必须是分
        //   · 已存在工资行：paid_amount≠0 或 payment_locked=1（已发款/已归档）
        //     → 跳过（archivedSkipped++），绝不触碰；可写行 → 只刷新
        //     daily_wage / work_days / actual_wage，保留手工录入的 bonus/deduction
        //   · 响应 = { success, data: 全量工资行(元), newCount, archivedSkipped, ownershipSkipped }
        //     data 为数组 + 顶层计数，对齐前端 electron.d.ts generateProjectWages
        //     契约（result.data 直接用 .length）；不用 Common.Ok 是为了让
        //     newCount / archivedSkipped / ownershipSkipped 与 data 同层
        app.MapPost("/api/wages/generate", (HttpContext ctx, WageGenerateDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B2: 生成工资表 → wages:create
            if (!CurrentUser.HasPermission(ctx, db, "wages:create")) return Results.Forbid();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            if (dto is null || dto.ProjectId is not long projectId || string.IsNullOrEmpty(dto.YearMonth))
                return Results.BadRequest(new { success = false, error = "generate: projectId / yearMonth 必填" });
            var atts = db.Query(@"SELECT a.project_worker_id, a.member_id, COALESCE(a.work_days, 0) AS work_days,
                                  COALESCE(pw.daily_wage, 0) AS pw_daily_wage, COALESCE(m.daily_wage, 0) AS m_daily_wage
                                  FROM attendances a
                                  LEFT JOIN project_workers pw ON a.project_worker_id = pw.id
                                  LEFT JOIN members m ON a.member_id = m.id
                                  WHERE a.project_id=@ProjectId AND a.year_month=@YearMonth
                                    AND " + CurrentUser.UserFilterWithAuthorizedProjects(scope, "a.project_id", "a.created_by"),
                new { ProjectId = projectId, YearMonth = dto.YearMonth, Uid = uid, IsAdmin = isAdmin }).ToList();
            var newCount = 0;
            var archivedSkipped = 0;
            var ownershipSkipped = 0;
            foreach (var att in atts)
            {
                var pwId = att.project_worker_id as long?;
                var memberId = att.member_id as long?;
                // 两 id 均空的行无法归属，不生成
                double? dailyWageYuan = pwId.HasValue ? Convert.ToDouble(att.pw_daily_wage ?? 0)
                    : memberId.HasValue ? Convert.ToDouble(att.m_daily_wage ?? 0) : null;
                if (dailyWageYuan is null) continue;
                var workDays = Convert.ToDouble(att.work_days ?? 0);
                var dailyFen = ToFen(dailyWageYuan.Value);
                // 唯一键定位既有行：worker 路径按 project_worker_id（035 唯一索引同键），
                // staff 路径（无 project_worker_id）按 member_id；@PwId 为 NULL 时
                // project_worker_id=@PwId 不命中任何行，两路径互不串扰
                var existing = db.QueryFirstOrDefault(@"SELECT id, bonus, deduction,
                        COALESCE(paid_amount, 0) AS paid_amount, COALESCE(payment_locked, 0) AS payment_locked
                        FROM wages
                        WHERE project_id=@ProjectId AND year_month=@YearMonth AND deleted_at IS NULL
                          AND (project_worker_id=@PwId OR (project_worker_id IS NULL AND member_id=@MemberId))",
                    new { ProjectId = projectId, YearMonth = dto.YearMonth, PwId = pwId, MemberId = memberId });
                if (existing != null
                    && (Convert.ToInt64(existing!.paid_amount ?? 0) != 0 || Convert.ToInt64(existing!.payment_locked ?? 0) == 1))
                { archivedSkipped++; continue; }
                var bonusFen = existing != null ? Convert.ToInt64(existing.bonus ?? 0) : 0L;
                var deductionFen = existing != null ? Convert.ToInt64(existing.deduction ?? 0) : 0L;
                var actualFen = (long)Math.Round(dailyFen * workDays) + bonusFen - deductionFen;
                if (existing != null)
                {
                    // UPDATE 归属守卫（R9-2 D2 修复，对齐 PUT /api/wages）：
                    // 非 admin 只能重算自己创建的工资行；被归属拦截（affected=0）→ ownershipSkipped++
                    var affected = db.Execute(@"UPDATE wages SET daily_wage=@DailyFen, work_days=@WorkDays,
                            actual_wage=@ActualFen, updated_at=@Now, version=version+1, last_modified_at=@Now
                        WHERE id=@Id AND deleted_at IS NULL
                          AND COALESCE(paid_amount,0)=0 AND COALESCE(payment_locked,0)=0
                          AND (created_by=@Uid OR @IsAdmin=1)",
                        new { DailyFen = dailyFen, WorkDays = workDays, ActualFen = actualFen, Id = (long)existing.id, Uid = uid, IsAdmin = isAdmin, Now = now() });
                    if (affected == 0) ownershipSkipped++;
                }
                else
                {
                    db.Execute(@"INSERT INTO wages (project_id,member_id,project_worker_id,year_month,daily_wage,work_days,bonus,deduction,
                         actual_wage,created_by,created_at,updated_at,last_modified_at) VALUES (@ProjectId,@MemberId,@ProjectWorkerId,@YearMonth,@DailyFen,@WorkDays,@BonusFen,@DeductionFen,
                                @ActualFen,@CreatedBy,@Now,@Now,@Now)",
                        new { ProjectId = projectId, MemberId = memberId, ProjectWorkerId = pwId, YearMonth = dto.YearMonth,
                              DailyFen = dailyFen, WorkDays = workDays, BonusFen = 0L, DeductionFen = 0L,
                              ActualFen = actualFen, CreatedBy = uid, Now = now() });
                    newCount++;
                }
            }
            // 返回生成后该项目+月份的工资全量（与 GET /api/wages 同型，金额分→元）
            var rows = db.Query(@"SELECT w.*, COALESCE(m.name, wr.name) as worker_name, p.name as project_name,
                            wt.name as team_name
                            FROM wages w
                            LEFT JOIN members m ON w.member_id=m.id
                            LEFT JOIN project_workers pw ON w.project_worker_id=pw.id
                            LEFT JOIN workers wr ON pw.worker_id=wr.id
                            LEFT JOIN worker_teams wt ON pw.team_id=wt.id
                            LEFT JOIN projects p ON w.project_id=p.id
                            WHERE w.project_id=@ProjectId AND w.year_month=@YearMonth AND w.deleted_at IS NULL
                              AND " + CurrentUser.UserFilterWithAuthorizedProjects(scope, "w.project_id", "w.created_by") + @"
                            ORDER BY w.updated_at DESC",
                new { ProjectId = projectId, YearMonth = dto.YearMonth, Uid = uid, IsAdmin = isAdmin });
            return Results.Ok(new { success = true, data = ToYuanRows(rows), newCount, archivedSkipped, ownershipSkipped });
        });

        // 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
        // 钖祫鍘嗗彶 (鏃?created_by 鍒? 浠呭姞 var uid 寮哄埗閴存潈)
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
            // G2 B2: 薪资历史 → wages:delete
            if (!CurrentUser.HasPermission(ctx, db, "wages:delete")) return Results.Forbid();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            return (await db.ExecuteAsync("DELETE FROM salary_history WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapPost("/api/salary-history", async (HttpContext ctx, SalaryHistoryDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B2: 薪资历史 → wages:create
            if (!CurrentUser.HasPermission(ctx, db, "wages:create")) return Results.Forbid();
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

    // 窗口 E：考勤默认全勤的 daily_status JSON（{"1":"work",...,"N":"work"}）
    private static string AllWorkStatusJson(int days) =>
        JsonSerializer.Serialize(Enumerable.Range(1, days).ToDictionary(d => d, _ => "work"));

    // 窗口 E：yearMonth 严格 YYYY-MM 校验（非法 → 400，不许 DaysInMonth 抛 500）
    private static bool TryParseYearMonth(string yearMonth, out int year, out int month)
    {
        year = 0;
        month = 0;
        if (string.IsNullOrEmpty(yearMonth)) return false;
        var parts = yearMonth.Split('-');
        if (parts.Length != 2) return false;
        return int.TryParse(parts[0], out year) && int.TryParse(parts[1], out month)
            && year is >= 1 and <= 9999 && month is >= 1 and <= 12;
    }

    // I-2: 回单日期（yyyy-MM-dd / yyyy-MM）与工资 year_month（yyyy-MM）同月或相邻月
    private static bool IsSameOrAdjacentMonth(string? date, string? yearMonth)
    {
        if (string.IsNullOrEmpty(date) || string.IsNullOrEmpty(yearMonth)) return false;
        var d = date.Split('-');
        var m = yearMonth.Split('-');
        if (d.Length < 2 || m.Length != 2) return false;
        if (!int.TryParse(d[0], out var dYear) || !int.TryParse(d[1], out var dMonth)
            || !int.TryParse(m[0], out var mYear) || !int.TryParse(m[1], out var mMonth)) return false;
        return Math.Abs((dYear * 12 + dMonth) - (mYear * 12 + mMonth)) <= 1;
    }
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

// generate 入参：projectId + yearMonth（camelCase 由 Web 默认反序列化绑定）
record WageGenerateDto(long? ProjectId, string? YearMonth);

// 窗口 E：考勤生成/导入入参 —— camelCase 对齐 tauri-bridge 载荷
// （generate 传 memberIds，generate-v2 传 projectWorkerIds，batch-import 传 records）
record AttendanceGenerateDto(long? ProjectId, string? YearMonth, List<long>? MemberIds);
record AttendanceGenerateV2Dto(long? ProjectId, string? YearMonth, List<long>? ProjectWorkerIds);
record AttendanceImportDto(long? ProjectId, string? YearMonth, List<AttendanceImportItem>? Records);
record AttendanceImportItem(long? ProjectWorkerId, double? WorkDays);

// I-2: 回单批量匹配入参（match-receipts）—— receipts 每项为一张 OCR 回单
// （amount 单位为元，候选准入走 ToFen 后等值）；yearMonth 为契约兼容保留，
// 候选范围按设计仅限项目内，月份关系走规则③打分
record ReceiptMatchDto(string? Date, double? Amount, string? Counterparty, string? ReceiptPath);
record MatchReceiptsDto(long? ProjectId, string? YearMonth, List<ReceiptMatchDto>? Receipts);

// I-2: 回单确认配对（confirm-matches）—— 与 batch-payment 同守卫，
// 但 bankReceiptPath 必填（本端点语义 = 带回单路径的付款，区别于 batch-payment 的可选）
record ConfirmMatchPairDto(long? WageId, double? PaidAmount, string? PaidDate, string? BankReceiptPath);

