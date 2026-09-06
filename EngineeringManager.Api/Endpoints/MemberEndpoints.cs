using System.Data;
using Dapper;
using EngineeringManager.Api.Security;

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

        app.MapGet("/api/members", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.1.0 P0-4 Phase 2: 公司维度表过滤 (created_by=@Uid OR @IsAdmin=1)
            var rows = db.Query($@"SELECT m.*, d.name as department_name FROM members m
                          LEFT JOIN departments d ON m.department_id=d.id
                          WHERE {CurrentUser.UserFilterCompany(scope, "m.created_by")}
                          ORDER BY m.created_at DESC",
                          new { Uid = uid, IsAdmin = isAdmin }).ToList();
            // v0.76.0 累计待办 #1: PII ACL — worker 角色只能看脱敏, 其他人明文
            var piiAccess = CurrentUser.GetPiiAccess(ctx);
            var masked = rows.Select(m => new
            {
                id = m.id, name = m.name, member_type = m.member_type, role = m.role, gender = m.gender,
                ethnicity = m.ethnicity, birth_date = m.birth_date, base_salary = MoneyUnit.ToYuanFromDb(m.base_salary), daily_wage = MoneyUnit.ToYuanFromDb(m.daily_wage),
                entry_date = m.entry_date, status = m.status, department_id = m.department_id, position = m.position,
                department_name = m.department_name, created_at = m.created_at, updated_at = m.updated_at,
                id_card = Common.MaskPiiField("idCard", m.id_card as string, piiAccess),
                phone = Common.MaskPiiField("phone", m.phone as string, piiAccess),
                email = m.email,
                id_card_address = Common.MaskPiiField("idCardAddress", m.id_card_address as string, piiAccess),
                bank_account = Common.MaskPiiField("bankAccount", m.bank_account as string, piiAccess),
                bank_name = m.bank_name, bank_line_no = m.bank_line_no, photo = m.photo
            });
            return Common.Ok(masked);
        });

        app.MapGet("/api/members/{id}", (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.1.0 P0-4 Phase 2: 单条也加 user-dim 过滤 (防 ID 枚举越权)
            var m = db.QueryFirstOrDefault($"SELECT * FROM members m WHERE id=@Id AND {CurrentUser.UserFilterCompany(scope, "m.created_by")}", new { Id = id, Uid = uid, IsAdmin = isAdmin });
            if (m is null) return Common.NotFound("成员不存在");
            // v0.76.0 累计待办 #1: PII ACL — 同上 /api/members, 返回 dict 屏蔽 PII
            var piiAccess = CurrentUser.GetPiiAccess(ctx);
            var result = ((IDictionary<string, object>)m).ToDictionary(k => k.Key, v => (object?)v.Value);
            result["id_card"] = Common.MaskPiiField("idCard", (string?)m.id_card, piiAccess);
            result["phone"] = Common.MaskPiiField("phone", (string?)m.phone, piiAccess);
            result["id_card_address"] = Common.MaskPiiField("idCardAddress", (string?)m.id_card_address, piiAccess);
                result["bank_account"] = Common.MaskPiiField("bankAccount", (string?)m.bank_account, piiAccess);
                // 金额列分→元（2026-09 分制契约）
                result["base_salary"] = MoneyUnit.ToYuanFromDb(result.ContainsKey("base_salary") ? result["base_salary"] : null);
                result["daily_wage"] = MoneyUnit.ToYuanFromDb(result.ContainsKey("daily_wage") ? result["daily_wage"] : null);
                return Common.Ok(result);
                        });

app.MapPost("/api/members", async (HttpContext ctx, MemberDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B5: 人员写操作 → members:create
            if (!CurrentUser.HasPermission(ctx, db, "members:create")) return Results.Forbid();
            // v1.2.0: PII 字段加密
            var pii = ctx.RequestServices.GetRequiredService<EngineeringManager.Api.Security.PiiProtector>();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO members (name,phone,email,member_type,role,id_card,gender,ethnicity,birth_date,id_card_address,
                 base_salary,daily_wage,entry_date,status,department_id,position,created_by,created_at,
                 id_card_enc,id_card_address_enc,phone_enc,bank_account_enc, last_modified_at) VALUES (@Name,@Phone,@Email,@MemberType,@Role,@IdCard,@Gender,@Ethnicity,@BirthDate,
                        @IdCardAddress,@BaseSalary,@DailyWage,@EntryDate,@Status,@DepartmentId,@Position,@CreatedBy,@Now,
                        @IdCardEnc,@IdCardAddressEnc,@PhoneEnc,@BankAccountEnc, @Now);
                SELECT last_insert_rowid();",
                new { dto.Name, dto.Phone, dto.Email, MemberType = dto.MemberType ?? "staff",
                      dto.Role, dto.IdCard, dto.Gender, dto.Ethnicity, dto.BirthDate, dto.IdCardAddress,
                      BaseSalary = MoneyUnit.ToFen(dto.BaseSalary), DailyWage = MoneyUnit.ToFen(dto.DailyWage), dto.EntryDate, Status = dto.Status ?? "active",
                      dto.DepartmentId, dto.Position, CreatedBy = uid, Now = now(),
                      IdCardEnc = pii.Encrypt(dto.IdCard ?? ""), IdCardAddressEnc = pii.Encrypt(dto.IdCardAddress ?? ""),
                      PhoneEnc = pii.Encrypt(dto.Phone ?? ""), BankAccountEnc = pii.Encrypt("") });
            return Common.Ok(id);
        });
                app.MapPut("/api/members", async (HttpContext ctx, MemberDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B5: 人员写操作 → members:update
            if (!CurrentUser.HasPermission(ctx, db, "members:update")) return Results.Forbid();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.2.0: PII 字段加密
            var pii = ctx.RequestServices.GetRequiredService<EngineeringManager.Api.Security.PiiProtector>();
            var affected = await db.ExecuteAsync(@"UPDATE members SET name=@Name,phone=@Phone,email=@Email,
                member_type=@MemberType,role=@Role,id_card=@IdCard,gender=@Gender,ethnicity=@Ethnicity,
                birth_date=@BirthDate,id_card_address=@IdCardAddress,base_salary=@BaseSalary,daily_wage=@DailyWage,
                entry_date=@EntryDate,status=@Status,department_id=@DepartmentId,position=@Position,
                id_card_enc=@IdCardEnc,id_card_address_enc=@IdCardAddressEnc,phone_enc=@PhoneEnc,bank_account_enc=@BankAccountEnc, version=version+1, last_modified_at=@Now
                WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { dto.Id, dto.Name, dto.Phone, dto.Email, dto.MemberType, dto.Role, dto.IdCard,
                      Uid = uid, IsAdmin = isAdmin, dto.Gender, dto.Ethnicity, dto.BirthDate, dto.IdCardAddress,
                      BaseSalary = MoneyUnit.ToFen(dto.BaseSalary), DailyWage = MoneyUnit.ToFen(dto.DailyWage),
                      dto.EntryDate, dto.Status, dto.DepartmentId, dto.Position,
                      IdCardEnc = pii.Encrypt(dto.IdCard ?? ""), IdCardAddressEnc = pii.Encrypt(dto.IdCardAddress ?? ""),
                      PhoneEnc = pii.Encrypt(dto.Phone ?? ""), BankAccountEnc = pii.Encrypt(""), Now = now() });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });
        app.MapDelete("/api/members/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B5: 人员写操作 → members:delete
            if (!CurrentUser.HasPermission(ctx, db, "members:delete")) return Results.Forbid();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            return (await db.ExecuteAsync("DELETE FROM members WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });

        // ═══════════════════════════════════════════════════════════
        // 工人 (workers 表有 created_by)
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/workers", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.1.0 P0-4 Phase 2: 公司维度表过滤
            var rows = db.Query($@"SELECT * FROM workers WHERE {CurrentUser.UserFilterCompany(scope)} ORDER BY name",
                new { Uid = uid, IsAdmin = isAdmin }).ToList();
            // v0.76.0 累计待办 #1: PII ACL — worker 角色只能看脱敏, 其他人明文
            var piiAccess = CurrentUser.GetPiiAccess(ctx);
            var masked = rows.Select(w => new
            {
                id = w.id, name = w.name, gender = w.gender, worker_type = w.worker_type, daily_wage = MoneyUnit.ToYuanFromDb(w.daily_wage),
                address = Common.MaskPiiField("address", w.address as string, piiAccess),
                created_at = w.created_at,
                id_card = Common.MaskPiiField("idCard", w.id_card as string, piiAccess),
                phone = Common.MaskPiiField("phone", w.phone as string, piiAccess),
                bank_account = Common.MaskPiiField("bankAccount", w.bank_account as string, piiAccess),
                bank_name = w.bank_name, bank_line_no = w.bank_line_no,
                current_address = Common.MaskPiiField("currentAddress", w.current_address as string, piiAccess)
            });
            return Common.Ok(masked);
        });

        app.MapGet("/api/workers/stats", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.1.0 P0-4 Phase 2: 统计也带过滤 (admin 看全量, 非 admin 只看自己建的)
            return Common.Ok(new
            {
                total = db.ExecuteScalar<int>($"SELECT COUNT(*) FROM workers WHERE {CurrentUser.UserFilterCompany(scope)}", new { Uid = uid, IsAdmin = isAdmin }),
                active = db.ExecuteScalar<int>($"SELECT COUNT(*) FROM project_workers pw WHERE pw.status='active' AND {CurrentUser.UserFilterWithAuthorizedProjects(scope, "pw.project_id")}", new { Uid = uid, IsAdmin = isAdmin }),
            });
        });

                app.MapPost("/api/workers", async (HttpContext ctx, WorkerDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B5: 工人写操作 → members:create
            if (!CurrentUser.HasPermission(ctx, db, "members:create")) return Results.Forbid();
            // v1.2.0: PII 字段加密 (PiiProtector 注入)
            var pii = ctx.RequestServices.GetRequiredService<EngineeringManager.Api.Security.PiiProtector>();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO workers (name,id_card,gender,phone,address,bank_account,bank_name,worker_type,daily_wage,current_address,current_address_enc,
                 id_card_enc,phone_enc,address_enc,bank_account_enc,created_by,created_at, last_modified_at) VALUES (@Name,@IdCard,@Gender,@Phone,@Address,@BankAccount,@BankName,@WorkerType,@DailyWage,@CurrentAddress,@CurrentAddressEnc,
                        @IdCardEnc,@PhoneEnc,@AddressEnc,@BankAccountEnc,@CreatedBy,@Now, @Now);
                SELECT last_insert_rowid();",
                new { dto.Name, dto.IdCard, dto.Gender, dto.Phone, dto.Address, dto.BankAccount,
                      dto.BankName, dto.WorkerType, DailyWage = MoneyUnit.ToFen(dto.DailyWage),
                      CurrentAddress = dto.CurrentAddress ?? "",
                      IdCardEnc = pii.Encrypt(dto.IdCard ?? ""), PhoneEnc = pii.Encrypt(dto.Phone ?? ""),
                      AddressEnc = pii.Encrypt(dto.Address ?? ""), BankAccountEnc = pii.Encrypt(dto.BankAccount ?? ""),
                      CurrentAddressEnc = pii.Encrypt(dto.CurrentAddress ?? ""),
                      CreatedBy = uid, Now = now() });
            return Common.Ok(id);
        });
                app.MapPut("/api/workers", async (HttpContext ctx, WorkerDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B5: 工人写操作 → members:update
            if (!CurrentUser.HasPermission(ctx, db, "members:update")) return Results.Forbid();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.2.0: PII 字段加密
            var pii = ctx.RequestServices.GetRequiredService<EngineeringManager.Api.Security.PiiProtector>();
            var affected = await db.ExecuteAsync(@"UPDATE workers SET name=@Name,id_card=@IdCard,gender=@Gender,
                phone=@Phone,address=@Address,bank_account=@BankAccount,bank_name=@BankName,
                worker_type=@WorkerType,daily_wage=@DailyWage,current_address=@CurrentAddress,
                id_card_enc=@IdCardEnc,phone_enc=@PhoneEnc,address_enc=@AddressEnc,bank_account_enc=@BankAccountEnc,current_address_enc=@CurrentAddressEnc, version=version+1, last_modified_at=@Now
                WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { dto.Id, dto.Name, dto.IdCard, dto.Gender, dto.Phone, dto.Address, dto.BankAccount,
                      dto.BankName, dto.WorkerType, DailyWage = MoneyUnit.ToFen(dto.DailyWage), Uid = uid, IsAdmin = isAdmin,
                      CurrentAddress = dto.CurrentAddress ?? "",
                      IdCardEnc = pii.Encrypt(dto.IdCard ?? ""), PhoneEnc = pii.Encrypt(dto.Phone ?? ""),
                      AddressEnc = pii.Encrypt(dto.Address ?? ""), BankAccountEnc = pii.Encrypt(dto.BankAccount ?? ""),
                      CurrentAddressEnc = pii.Encrypt(dto.CurrentAddress ?? ""), Now = now() });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });
        app.MapDelete("/api/workers/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B5: 工人写操作 → members:delete
            if (!CurrentUser.HasPermission(ctx, db, "members:delete")) return Results.Forbid();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            return (await db.ExecuteAsync("DELETE FROM workers WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });

        // ═══════════════════════════════════════════════════════════
        // 项目工人 (project_workers 表有 created_by)
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/project-workers", (HttpContext ctx, IDbConnection db, long? projectId) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var sql = @"SELECT pw.*, w.name as worker_name, w.gender, w.address, w.bank_name, w.worker_type, w.daily_wage,
                        w.birth_date, w.ethnicity,
                        wt.name as team_name
                        FROM project_workers pw
                        LEFT JOIN workers w ON pw.worker_id=w.id
                        LEFT JOIN worker_teams wt ON pw.team_id=wt.id";
            // v1.1.0 P0-4 Phase 2: 总加 user-dim
            var conditions = new List<string>();
            if (projectId.HasValue) conditions.Add("pw.project_id=@ProjectId");
            conditions.Add(CurrentUser.UserFilterWithAuthorizedProjects(scope, "pw.project_id", "pw.created_by"));
            sql += " WHERE " + string.Join(" AND ", conditions);
            sql += " ORDER BY pw.created_at DESC";
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var piiAccess = CurrentUser.GetPiiAccess(ctx);
            var rows = db.Query(sql, new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId }).ToList();
            // v0.75.0: 后端响应层不再 mask
            var masked = rows.Select(pw => new
            {
                id = pw.id, worker_id = pw.worker_id, project_id = pw.project_id, team_id = pw.team_id,
                daily_wage = MoneyUnit.ToYuanFromDb(pw.daily_wage), worker_type = pw.worker_type, entry_date = pw.entry_date, status = pw.status,
                created_at = pw.created_at, updated_at = pw.updated_at,
                worker_name = pw.worker_name, gender = pw.gender, address = Common.MaskPiiField("address", pw.address as string, piiAccess),
                bank_name = pw.bank_name,
                birth_date = pw.birth_date, ethnicity = pw.ethnicity, team_name = pw.team_name,
                id_card = Common.MaskPiiField("idCard", pw.id_card as string, piiAccess),
                phone = Common.MaskPiiField("phone", pw.phone as string, piiAccess),
                bank_account = Common.MaskPiiField("bankAccount", pw.bank_account as string, piiAccess),
                contract_signer = pw.contract_signer,
                contract_start = pw.contract_start,
                contract_end = pw.contract_end,
                safety_training = pw.safety_training,
                work_section = pw.work_section,
                exit_date = pw.exit_date,
            });
            return Common.Ok(masked);
        });

                app.MapPost("/api/project-workers", async (HttpContext ctx, ProjectWorkerDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B5: 项目工人写操作 → members:create
            if (!CurrentUser.HasPermission(ctx, db, "members:create")) return Results.Forbid();
            // v1.2.0: project-workers 不直接存 PII (JOIN workers 表), 加密仍加 0 _enc 列
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO project_workers (worker_id,project_id,team_id,daily_wage,worker_type,entry_date,status,created_by,created_at, last_modified_at, contract_signer,contract_start,contract_end,safety_training,work_section,exit_date) VALUES (@WorkerId,@ProjectId,@TeamId,@DailyWage,@WorkerType,@EntryDate,@Status,@CreatedBy,@Now, @Now, @ContractSigner,@ContractStart,@ContractEnd,@SafetyTraining,@WorkSection,@ExitDate);
                SELECT last_insert_rowid();",
                new { dto.WorkerId, dto.ProjectId, dto.TeamId, DailyWage = MoneyUnit.ToFen(dto.DailyWage), dto.WorkerType,
                      dto.EntryDate, Status = dto.Status ?? "active", CreatedBy = uid, Now = now(),
                      dto.ContractSigner, dto.ContractStart, dto.ContractEnd,
                      SafetyTraining = dto.SafetyTraining == true ? 1 : 0,
                      dto.WorkSection, dto.ExitDate,
                });
            return Common.Ok(id);
        });
        app.MapDelete("/api/project-workers/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B5: 项目工人写操作 → members:delete
            if (!CurrentUser.HasPermission(ctx, db, "members:delete")) return Results.Forbid();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            return (await db.ExecuteAsync("DELETE FROM project_workers WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });

        // ═══════════════════════════════════════════════════════════
        // 部门 (departments 表无 created_by, 仅 var uid 强制鉴权)
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/departments", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.1.0 P0-4 Phase 2: departments 现在有 created_by
            var rows = db.Query($"SELECT * FROM departments WHERE {CurrentUser.UserFilterCompany(scope)} ORDER BY name", new { Uid = uid, IsAdmin = isAdmin }).ToList();
            // positions 存为 JSON TEXT，返回前 parse 为数组供前端使用
            foreach (var row in rows)
            {
                var dict = (IDictionary<string, object>)row;
                if (dict.TryGetValue("positions", out var pos) && pos is string posStr && !string.IsNullOrEmpty(posStr))
                {
                    try { dict["positions"] = System.Text.Json.JsonSerializer.Deserialize<List<string>>(posStr) ?? new List<string>(); }
                    catch { dict["positions"] = new List<string>(); }
                }
            }
            return Common.Ok(rows);
        });

        app.MapPost("/api/departments", async (HttpContext ctx, DepartmentDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B5: 部门写操作 → members:create
            if (!CurrentUser.HasPermission(ctx, db, "members:create")) return Results.Forbid();
            var positionsJson = System.Text.Json.JsonSerializer.Serialize(dto.Positions ?? new List<string>());
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO departments (name,manager_id,positions,created_by,created_at, last_modified_at) VALUES (@Name,@ManagerId,@Positions,@CreatedBy,@Now, @Now); SELECT last_insert_rowid();",
                new { dto.Name, dto.ManagerId, Positions = positionsJson, CreatedBy = uid, Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/departments", async (HttpContext ctx, DepartmentUpdateDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B5: 部门写操作 → members:update
            if (!CurrentUser.HasPermission(ctx, db, "members:update")) return Results.Forbid();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            var positionsJson = System.Text.Json.JsonSerializer.Serialize(dto.Positions ?? new List<string>());
            var affected = await db.ExecuteAsync(
                @"UPDATE departments SET name=@Name, manager_id=@ManagerId, positions=@Positions,
                  version=version+1, last_modified_at=@Now
                  WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { dto.Id, dto.Name, dto.ManagerId, Positions = positionsJson,
                      Uid = uid, IsAdmin = isAdmin, Now = now() });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapDelete("/api/departments/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B5: 部门写操作 → members:delete
            if (!CurrentUser.HasPermission(ctx, db, "members:delete")) return Results.Forbid();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            return (await db.ExecuteAsync("DELETE FROM departments WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });

        // ═══════════════════════════════════════════════════════════
        // 班组 (worker_teams 表有 created_by（v1.1.0 起），写侧守卫见 PUT/DELETE)
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/worker-teams", (HttpContext ctx, IDbConnection db, long? projectId) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.1.0 P0-4 Phase 2: worker_teams 现在有 created_by
            // LEFT JOIN projects 也有 created_by 列, 改用 wt. 表别名
            var conditions = new List<string>();
            if (projectId.HasValue) conditions.Add("wt.project_id=@ProjectId");
            conditions.Add("(wt.created_by=@Uid OR @IsAdmin=1)");
            var sql = @"SELECT wt.*, p.name as project_name,
                               (SELECT COUNT(*) FROM project_workers pw WHERE pw.team_id=wt.id) as worker_count
                        FROM worker_teams wt LEFT JOIN projects p ON wt.project_id=p.id
                        WHERE " + string.Join(" AND ", conditions) + @"
                        ORDER BY wt.created_at DESC";
            return Common.Ok(db.Query(sql, new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId }));
        });

        app.MapPost("/api/worker-teams", async (HttpContext ctx, WorkerTeamDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B5: 班组写操作 → members:create
            if (!CurrentUser.HasPermission(ctx, db, "members:create")) return Results.Forbid();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO worker_teams (name,project_id,leader_id,created_by,created_at,updated_at, last_modified_at) VALUES (@Name,@ProjectId,@LeaderId,@CreatedBy,@Now,@Now, @Now); SELECT last_insert_rowid();",
                new { dto.Name, dto.ProjectId, dto.LeaderId, CreatedBy = uid, Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/worker-teams", async (HttpContext ctx, WorkerTeamDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B5: 班组写操作 → members:update
            if (!CurrentUser.HasPermission(ctx, db, "members:update")) return Results.Forbid();
            // R9-6 D3 归属守卫（对齐同文件 DELETE /api/worker-teams/{id}）
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var affected = await db.ExecuteAsync(@"UPDATE worker_teams SET name=COALESCE(@Name,name),
                leader_id=@LeaderId,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { dto.Id, dto.Name, dto.LeaderId, Uid = uid, IsAdmin = isAdmin, Now = now() });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapDelete("/api/worker-teams/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B5: 班组写操作 → members:delete
            if (!CurrentUser.HasPermission(ctx, db, "members:delete")) return Results.Forbid();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            return (await db.ExecuteAsync("DELETE FROM worker_teams WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });
    }
}

