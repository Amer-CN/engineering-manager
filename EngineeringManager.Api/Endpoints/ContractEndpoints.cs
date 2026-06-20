using System.Data;
using Dapper;
using EngineeringManager.Api.Security;

namespace EngineeringManager.Api;

/// <summary>
/// 合同 + 合同模板 + 结算端点
/// </summary>
public static class ContractEndpoints
{
    public static void RegisterContractEndpoints(this WebApplication app)
    {
        var now = () => DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

        // ═══════════════════════════════════════════════════════════
        // 合同
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/contracts/income", (HttpContext ctx, IDbConnection db, long? projectId) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            // v1.1.0 P0-4 Phase 2: 项目级表过滤 (created_by OR admin OR project_authorizations)
            // projectId 是更窄的收窄, 不能漏
            var sql = $@"SELECT * FROM income_contracts WHERE {CurrentUser.UserFilterWithAuthorizedProjects("project_id")}";
            if (projectId.HasValue) sql += " AND project_id=@ProjectId";
            sql += " ORDER BY created_at DESC";
            return Common.Ok(db.Query(sql, new { ProjectId = projectId, Uid = uid, IsAdmin = isAdmin }));
        });

        app.MapGet("/api/contracts/expense", (HttpContext ctx, IDbConnection db, long? projectId) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            // v1.1.0 P0-4 Phase 2: 项目级表过滤
            var sql = $@"SELECT * FROM expense_contracts WHERE {CurrentUser.UserFilterWithAuthorizedProjects("project_id")}";
            if (projectId.HasValue) sql += " AND project_id=@ProjectId";
            sql += " ORDER BY created_at DESC";
            return Common.Ok(db.Query(sql, new { ProjectId = projectId, Uid = uid, IsAdmin = isAdmin }));
        });

        app.MapGet("/api/contracts/agreement", (HttpContext ctx, IDbConnection db, long? projectId) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            // v1.1.0 P0-4 Phase 2: 项目级表过滤
            var sql = $@"SELECT * FROM agreement_contracts WHERE {CurrentUser.UserFilterWithAuthorizedProjects("project_id")}";
            if (projectId.HasValue) sql += " AND project_id=@ProjectId";
            sql += " ORDER BY created_at DESC";
            return Common.Ok(db.Query(sql, new { ProjectId = projectId, Uid = uid, IsAdmin = isAdmin }));
        });

        app.MapGet("/api/contracts/stats", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            // v1.1.0 P0-4 Phase 2: stats 也按 user-dim 过滤 (admin 看全表, 其他看自己+授权)
            return Common.Ok(new
            {
                incomeCount = db.ExecuteScalar<int>($"SELECT COUNT(*) FROM income_contracts WHERE {CurrentUser.UserFilterWithAuthorizedProjects()}", new { Uid = uid, IsAdmin = isAdmin }),
                expenseCount = db.ExecuteScalar<int>($"SELECT COUNT(*) FROM expense_contracts WHERE {CurrentUser.UserFilterWithAuthorizedProjects()}", new { Uid = uid, IsAdmin = isAdmin }),
                incomeTotal = db.ExecuteScalar<decimal>($"SELECT COALESCE(SUM(amount),0) FROM income_contracts WHERE {CurrentUser.UserFilterWithAuthorizedProjects()}", new { Uid = uid, IsAdmin = isAdmin }),
                expenseTotal = db.ExecuteScalar<decimal>($"SELECT COALESCE(SUM(amount),0) FROM expense_contracts WHERE {CurrentUser.UserFilterWithAuthorizedProjects()}", new { Uid = uid, IsAdmin = isAdmin }),
            });
        });

        app.MapPost("/api/contracts/income", async (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // v1.1.0 修: 改用 HttpRequest 读 body (原 dynamic dto 不被 dapper 自动绑定, INSERT 必失败)
            using var reader = new System.IO.StreamReader(ctx.Request.Body);
            var bodyText = await reader.ReadToEndAsync();
            var body = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(bodyText);
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO income_contracts (project_id,partner_id,contract_no,name,amount,signed_date,start_date,end_date,status,payment_method,remarks,created_by,created_at,updated_at, last_modified_at) VALUES (@ProjectId,@PartnerId,@ContractNo,@Name,@Amount,@SignedDate,@StartDate,@EndDate,@Status,@PaymentMethod,@Remarks,@CreatedBy,@Now,@Now, @Now);
                SELECT last_insert_rowid();",
                new {
                    ProjectId = body.TryGetProperty("projectId", out var p) ? (long?)p.GetInt64() : null,
                    PartnerId = body.TryGetProperty("partnerId", out var pp) ? (long?)pp.GetInt64() : null,
                    ContractNo = body.TryGetProperty("contractNo", out var c) ? c.GetString() : null,
                    Name = body.TryGetProperty("name", out var n) ? n.GetString() : null,
                    Amount = body.TryGetProperty("amount", out var a) ? (decimal?)a.GetDouble() : null,
                    SignedDate = body.TryGetProperty("signedDate", out var sd) ? sd.GetString() : null,
                    StartDate = body.TryGetProperty("startDate", out var sdt) ? sdt.GetString() : null,
                    EndDate = body.TryGetProperty("endDate", out var ed) ? ed.GetString() : null,
                    Status = body.TryGetProperty("status", out var st) ? st.GetString() ?? "draft" : "draft",
                    PaymentMethod = body.TryGetProperty("paymentMethod", out var pm) ? pm.GetString() : null,
                    Remarks = body.TryGetProperty("remarks", out var rm) ? rm.GetString() : null,
                    CreatedBy = uid,
                    Now = now()
                });
            return Common.Ok(id);
        });

        app.MapPost("/api/contracts/expense", async (HttpContext ctx, dynamic dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO expense_contracts (project_id,partner_id,contract_no,name,amount,signed_date,start_date,end_date,status,payment_method,remarks,created_by,created_at,updated_at, last_modified_at) VALUES (@ProjectId,@PartnerId,@ContractNo,@Name,@Amount,@SignedDate,@StartDate,@EndDate,@Status,@PaymentMethod,@Remarks,@CreatedBy,@Now,@Now, @Now);
                SELECT last_insert_rowid();",
                new { CreatedBy = uid, Now = now() });
            return Common.Ok(id);
        });

        app.MapPost("/api/contracts/agreement", async (HttpContext ctx, dynamic dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO agreement_contracts (project_id,partner_id,contract_no,name,amount,signed_date,start_date,end_date,status,remarks,created_by,created_at,updated_at, last_modified_at) VALUES (@ProjectId,@PartnerId,@ContractNo,@Name,@Amount,@SignedDate,@StartDate,@EndDate,@Status,@Remarks,@CreatedBy,@Now,@Now, @Now);
                SELECT last_insert_rowid();",
                new { CreatedBy = uid, Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/contracts/income", async (HttpContext ctx, dynamic dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var affected = await db.ExecuteAsync(@"UPDATE income_contracts SET name=@Name,amount=@Amount,status=@Status,remarks=@Remarks,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id AND " + CurrentUser.UserFilterFragment,
                new { Uid = uid, IsAdmin = isAdmin, Now = now() });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapPut("/api/contracts/expense", async (HttpContext ctx, dynamic dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var affected = await db.ExecuteAsync(@"UPDATE expense_contracts SET name=@Name,amount=@Amount,status=@Status,remarks=@Remarks,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id AND " + CurrentUser.UserFilterFragment,
                new { Uid = uid, IsAdmin = isAdmin, Now = now() });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapPut("/api/contracts/agreement", async (HttpContext ctx, dynamic dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var affected = await db.ExecuteAsync(@"UPDATE agreement_contracts SET name=@Name,amount=@Amount,status=@Status,remarks=@Remarks,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { Uid = uid, IsAdmin = isAdmin, Now = now() });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapDelete("/api/contracts/income/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            return (await db.ExecuteAsync("DELETE FROM income_contracts WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapDelete("/api/contracts/expense/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            return (await db.ExecuteAsync("DELETE FROM expense_contracts WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapDelete("/api/contracts/agreement/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            return (await db.ExecuteAsync("DELETE FROM agreement_contracts WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });

        // ═══════════════════════════════════════════════════════════
        // 合同模板 (无 created_by 列, 仅 var uid 强制鉴权)
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/contract-templates", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            // v1.1.0 P0-4 Phase 2: contract_templates 现在有 created_by
            return Common.Ok(db.Query($"SELECT * FROM contract_templates WHERE {CurrentUser.UserFilterCompany()} ORDER BY created_at DESC", new { Uid = uid, IsAdmin = isAdmin }));
        });

        app.MapPost("/api/contract-templates", async (HttpContext ctx, ContractTemplateDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO contract_templates (name,type,content,variables,created_by,created_at,updated_at, last_modified_at) VALUES (@Name,@Type,@Content,@Variables,@CreatedBy,@Now,@Now, @Now); SELECT last_insert_rowid();",
                new { dto.Name, Type = dto.Type ?? "contract", dto.Content, dto.Variables, CreatedBy = uid, Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/contract-templates", async (HttpContext ctx, dynamic dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var affected = await db.ExecuteAsync(@"UPDATE contract_templates SET name=@Name,type=@Type,content=@Content,variables=@Variables,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id",
                new { Now = now() });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapDelete("/api/contract-templates/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            return (await db.ExecuteAsync("DELETE FROM contract_templates WHERE id=@Id", new { Id = id })) > 0 ? Common.Ok() : Results.Forbid();
        });

        // ═══════════════════════════════════════════════════════════
        // 结算 (settlements 表无 created_by 列, 仅 var uid 强制鉴权)
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/settlements", (HttpContext ctx, IDbConnection db, long? projectId) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            // v1.1.0 P0-4 Phase 2: settlements 表现在有 created_by (migration 014)
            // 优先用内联 SQL 避免 LEFT JOIN projects 也有 created_by 列冲突
            var sql = @"SELECT s.*, p.name as project_name
                        FROM settlements s LEFT JOIN projects p ON s.project_id=p.id
                        WHERE (s.created_by=@Uid OR @IsAdmin=1 OR EXISTS(SELECT 1 FROM project_authorizations WHERE project_id=s.project_id AND user_id=@Uid))";
            if (projectId.HasValue) sql += " AND s.project_id=@ProjectId";
            sql += " ORDER BY s.created_at DESC";
            return Common.Ok(db.Query(sql, new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId }));
        });

        app.MapPost("/api/settlements", async (HttpContext ctx, dynamic dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO settlements (project_id,name,sub_type,status,settlement_no,amount,settler_id,remarks,created_by,created_at,updated_at, last_modified_at) VALUES (@ProjectId,@Name,@SubType,'pending',@SettlementNo,@Amount,@SettlerId,@Remarks,@CreatedBy,@Now,@Now, @Now);
                SELECT last_insert_rowid();",
                new { CreatedBy = uid, Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/settlements", async (HttpContext ctx, dynamic dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var affected = await db.ExecuteAsync(@"UPDATE settlements SET name=@Name,sub_type=@SubType,amount=@Amount,remarks=@Remarks,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id",
                new { Now = now() });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapDelete("/api/settlements/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            return (await db.ExecuteAsync("DELETE FROM settlements WHERE id=@Id", new { Id = id })) > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapPut("/api/settlements/{id}/process", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var affected = await db.ExecuteAsync(@"UPDATE settlements SET status='processed',updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id",
                new { Id = id, Now = now() });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapPut("/api/settlements/{id}/unarchive", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var affected = await db.ExecuteAsync(@"UPDATE settlements SET status='pending',updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id",
                new { Id = id, Now = now() });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });
    }
}
