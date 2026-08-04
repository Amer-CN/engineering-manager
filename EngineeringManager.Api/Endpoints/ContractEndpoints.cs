using System.Data;
using Dapper;
using EngineeringManager.Api.Security;
using EngineeringManager.Api.Services;
using EngineeringManager.Api.Services.Stt;
using Microsoft.Extensions.DependencyInjection;

namespace EngineeringManager.Api;

/// <summary>
/// 合同 + 合同模板 + 结算端点
/// </summary>
public static class ContractEndpoints
{
    public static void RegisterContractEndpoints(this WebApplication app)
    {
        var now = () => DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

        // ═══════════════════════════════════════
        // 合同
        // ═══════════════════════════════════════

        app.MapGet("/api/contracts/income", (HttpContext ctx, IDbConnection db, long? projectId) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.1.0 P0-4 Phase 2: 项目级过滤 (created_by OR admin OR project_authorizations)
            // projectId 是更窄的收窄条件, 不能漏
            var sql = $@"SELECT * FROM income_contracts WHERE {CurrentUser.UserFilterWithAuthorizedProjects(scope, "income_contracts.project_id")}";
            if (projectId.HasValue) sql += " AND project_id=@ProjectId";
            sql += " ORDER BY created_at DESC";
            return Common.Ok(db.Query(sql, new { ProjectId = projectId, Uid = uid, IsAdmin = isAdmin }));
        });

        app.MapGet("/api/contracts/expense", (HttpContext ctx, IDbConnection db, long? projectId) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.1.0 P0-4 Phase 2: 项目级过滤
            var sql = $@"SELECT * FROM expense_contracts WHERE {CurrentUser.UserFilterWithAuthorizedProjects(scope, "expense_contracts.project_id")}";
            if (projectId.HasValue) sql += " AND project_id=@ProjectId";
            sql += " ORDER BY created_at DESC";
            return Common.Ok(db.Query(sql, new { ProjectId = projectId, Uid = uid, IsAdmin = isAdmin }));
        });

        app.MapGet("/api/contracts/agreement", (HttpContext ctx, IDbConnection db, long? projectId) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.1.0 P0-4 Phase 2: 项目级过滤
            var sql = $@"SELECT * FROM agreement_contracts WHERE {CurrentUser.UserFilterWithAuthorizedProjects(scope, "agreement_contracts.project_id")}";
            if (projectId.HasValue) sql += " AND project_id=@ProjectId";
            sql += " ORDER BY created_at DESC";
            return Common.Ok(db.Query(sql, new { ProjectId = projectId, Uid = uid, IsAdmin = isAdmin }));
        });

        app.MapGet("/api/contracts/stats", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.1.0 P0-4 Phase 2: stats 涔熸寜 user-dim 杩囨护 (admin 鐪嬪叏琛? 鍏朵粬鐪嬭嚜宸?鎺堟潈)
            return Common.Ok(new
            {
                incomeCount = db.ExecuteScalar<int>($"SELECT COUNT(*) FROM income_contracts WHERE {CurrentUser.UserFilterWithAuthorizedProjects(scope, "income_contracts.project_id")}", new { Uid = uid, IsAdmin = isAdmin }),
                expenseCount = db.ExecuteScalar<int>($"SELECT COUNT(*) FROM expense_contracts WHERE {CurrentUser.UserFilterWithAuthorizedProjects(scope, "expense_contracts.project_id")}", new { Uid = uid, IsAdmin = isAdmin }),
                incomeTotal = db.ExecuteScalar<decimal>($"SELECT COALESCE(SUM(amount),0) FROM income_contracts WHERE {CurrentUser.UserFilterWithAuthorizedProjects(scope, "income_contracts.project_id")}", new { Uid = uid, IsAdmin = isAdmin }),
                expenseTotal = db.ExecuteScalar<decimal>($"SELECT COALESCE(SUM(amount),0) FROM expense_contracts WHERE {CurrentUser.UserFilterWithAuthorizedProjects(scope, "expense_contracts.project_id")}", new { Uid = uid, IsAdmin = isAdmin }),
            });
        });

        app.MapPost("/api/contracts/income", async (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // v1.1.0 修复: 改用 HttpRequest 读 body (原 dynamic dto 不被 dapper 自动绑定, INSERT 必失败)
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
            // fire-and-forget: upsert 实体到知识库种子表
            var contractName = body.TryGetProperty("name", out var cn) ? cn.GetString() ?? "" : "";
            var contractProjectId = body.TryGetProperty("projectId", out var cp) ? (long?)cp.GetInt64() : null;
            var capturedId = id;
            _ = Task.Run(async () =>
            {
                try
                {
                    using var scope = ctx.RequestServices.CreateScope();
                    var sp = scope.ServiceProvider;
                    var bgDb = sp.GetRequiredService<IDbConnection>();
                    var bgEmb = sp.GetRequiredService<IEmbeddingService>();
                    var svc = new KnowledgeEntityService(bgDb, bgEmb);
                    await svc.UpsertEntityAsync("income_contract", capturedId, contractName, contractProjectId);
                }
                catch (Exception ex) { Console.Error.WriteLine($"[EntitySeed] income_contract upsert 失败: {ex.Message}"); }
            });
            return Common.Ok(id);
        });

        app.MapPost("/api/contracts/expense", async (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            using var reader = new System.IO.StreamReader(ctx.Request.Body);
            var bodyText = await reader.ReadToEndAsync();
            var body = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(bodyText);
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO expense_contracts (project_id,partner_id,contract_no,name,amount,signed_date,start_date,end_date,status,payment_method,remarks,created_by,created_at,updated_at, last_modified_at) VALUES (@ProjectId,@PartnerId,@ContractNo,@Name,@Amount,@SignedDate,@StartDate,@EndDate,@Status,@PaymentMethod,@Remarks,@CreatedBy,@Now,@Now, @Now);
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
            // fire-and-forget: upsert 实体到知识库种子表
            var expContractName = body.TryGetProperty("name", out var ecn) ? ecn.GetString() ?? "" : "";
            var expContractProjectId = body.TryGetProperty("projectId", out var ecp) ? (long?)ecp.GetInt64() : null;
            var expCapturedId = id;
            _ = Task.Run(async () =>
            {
                try
                {
                    using var scope = ctx.RequestServices.CreateScope();
                    var sp = scope.ServiceProvider;
                    var bgDb = sp.GetRequiredService<IDbConnection>();
                    var bgEmb = sp.GetRequiredService<IEmbeddingService>();
                    var svc = new KnowledgeEntityService(bgDb, bgEmb);
                    await svc.UpsertEntityAsync("expense_contract", expCapturedId, expContractName, expContractProjectId);
                }
                catch (Exception ex) { Console.Error.WriteLine($"[EntitySeed] expense_contract upsert 失败: {ex.Message}"); }
            });
            return Common.Ok(id);
        });

        app.MapPost("/api/contracts/agreement", async (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            using var reader = new System.IO.StreamReader(ctx.Request.Body);
            var bodyText = await reader.ReadToEndAsync();
            var body = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(bodyText);
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO agreement_contracts (project_id,partner_id,contract_no,name,amount,signed_date,start_date,end_date,status,remarks,created_by,created_at,updated_at, last_modified_at) VALUES (@ProjectId,@PartnerId,@ContractNo,@Name,@Amount,@SignedDate,@StartDate,@EndDate,@Status,@Remarks,@CreatedBy,@Now,@Now, @Now);
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
                    Remarks = body.TryGetProperty("remarks", out var rm) ? rm.GetString() : null,
                    CreatedBy = uid,
                    Now = now()
                });
            return Common.Ok(id);
        });

        app.MapPut("/api/contracts/income", async (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            // 修复: 原 dynamic dto + 参数只传 Uid/IsAdmin/Now 导致 @Id/@Name 等全部缺参必 500(与 expense/agreement 同批改造时漏改)
            using var reader = new System.IO.StreamReader(ctx.Request.Body);
            var bodyText = await reader.ReadToEndAsync();
            var body = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(bodyText);
            var recordId = body.TryGetProperty("id", out var idProp) ? idProp.GetInt64() : 0;
            var affected = await db.ExecuteAsync(@"UPDATE income_contracts SET name=@Name,amount=@Amount,status=@Status,remarks=@Remarks,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id AND " + CurrentUser.UserFilterWithAuthorizedProjects(scope, "income_contracts.project_id"),
                new { Uid = uid, IsAdmin = isAdmin, Now = now(),
                    Id = recordId,
                    Name = body.TryGetProperty("name", out var n) ? n.GetString() : null,
                    Amount = body.TryGetProperty("amount", out var a) ? (decimal?)a.GetDouble() : null,
                    Status = body.TryGetProperty("status", out var st) ? st.GetString() : null,
                    Remarks = body.TryGetProperty("remarks", out var rm) ? rm.GetString() : null
                });
            // fire-and-forget: upsert 实体到知识库种子表
            if (affected > 0)
            {
                var putName = body.TryGetProperty("name", out var pn) ? pn.GetString() ?? "" : "";
                var putRecordId = recordId;
                _ = Task.Run(async () =>
                {
                    try
                    {
                        using var scope = ctx.RequestServices.CreateScope();
                        var sp = scope.ServiceProvider;
                        var bgDb = sp.GetRequiredService<IDbConnection>();
                        var bgEmb = sp.GetRequiredService<IEmbeddingService>();
                        var svc = new KnowledgeEntityService(bgDb, bgEmb);
                        // 从库中取最新的 project_id
                        var pid = bgDb.ExecuteScalar<long?>("SELECT [project_id] FROM [income_contracts] WHERE [id]=@Id", new { Id = putRecordId });
                        await svc.UpsertEntityAsync("income_contract", putRecordId, putName, pid);
                    }
                    catch (Exception ex) { Console.Error.WriteLine($"[EntitySeed] income_contract PUT upsert 失败: {ex.Message}"); }
                });
            }
            return await Common.WriteResult(affected, db, "income_contracts", recordId);
        });

        app.MapPut("/api/contracts/expense", async (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            using var reader = new System.IO.StreamReader(ctx.Request.Body);
            var bodyText = await reader.ReadToEndAsync();
            var body = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(bodyText);
            var recordId = body.TryGetProperty("id", out var idProp) ? idProp.GetInt64() : 0;
            var affected = await db.ExecuteAsync(@"UPDATE expense_contracts SET name=@Name,amount=@Amount,status=@Status,remarks=@Remarks,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id AND " + CurrentUser.UserFilterWithAuthorizedProjects(scope, "expense_contracts.project_id"),
                new { Uid = uid, IsAdmin = isAdmin, Now = now(),
                    Id = recordId,
                    Name = body.TryGetProperty("name", out var n) ? n.GetString() : null,
                    Amount = body.TryGetProperty("amount", out var a) ? (decimal?)a.GetDouble() : null,
                    Status = body.TryGetProperty("status", out var st) ? st.GetString() : null,
                    Remarks = body.TryGetProperty("remarks", out var rm) ? rm.GetString() : null
                });
            // fire-and-forget: upsert 实体到知识库种子表
            if (affected > 0)
            {
                var putName = body.TryGetProperty("name", out var pn) ? pn.GetString() ?? "" : "";
                var putRecordId = recordId;
                _ = Task.Run(async () =>
                {
                    try
                    {
                        using var scope = ctx.RequestServices.CreateScope();
                        var sp = scope.ServiceProvider;
                        var bgDb = sp.GetRequiredService<IDbConnection>();
                        var bgEmb = sp.GetRequiredService<IEmbeddingService>();
                        var svc = new KnowledgeEntityService(bgDb, bgEmb);
                        var pid = bgDb.ExecuteScalar<long?>("SELECT [project_id] FROM [expense_contracts] WHERE [id]=@Id", new { Id = putRecordId });
                        await svc.UpsertEntityAsync("expense_contract", putRecordId, putName, pid);
                    }
                    catch (Exception ex) { Console.Error.WriteLine($"[EntitySeed] expense_contract PUT upsert 失败: {ex.Message}"); }
                });
            }
            return await Common.WriteResult(affected, db, "expense_contracts", recordId);
        });

        app.MapPut("/api/contracts/agreement", async (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            using var reader = new System.IO.StreamReader(ctx.Request.Body);
            var bodyText = await reader.ReadToEndAsync();
            var body = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(bodyText);
            var recordId = body.TryGetProperty("id", out var idProp) ? idProp.GetInt64() : 0;
            var affected = await db.ExecuteAsync(@"UPDATE agreement_contracts SET name=@Name,amount=@Amount,status=@Status,remarks=@Remarks,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { Uid = uid, IsAdmin = isAdmin, Now = now(),
                    Id = recordId,
                    Name = body.TryGetProperty("name", out var n) ? n.GetString() : null,
                    Amount = body.TryGetProperty("amount", out var a) ? (decimal?)a.GetDouble() : null,
                    Status = body.TryGetProperty("status", out var st) ? st.GetString() : null,
                    Remarks = body.TryGetProperty("remarks", out var rm) ? rm.GetString() : null
                });
            return await Common.WriteResult(affected, db, "agreement_contracts", recordId);
        });

        app.MapDelete("/api/contracts/income/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            return await Common.WriteResult(await db.ExecuteAsync("DELETE FROM income_contracts WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin }), db, "income_contracts", id);
        });

        app.MapDelete("/api/contracts/expense/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            return await Common.WriteResult(await db.ExecuteAsync("DELETE FROM expense_contracts WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin }), db, "expense_contracts", id);
        });

        app.MapDelete("/api/contracts/agreement/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            return await Common.WriteResult(await db.ExecuteAsync("DELETE FROM agreement_contracts WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin }), db, "agreement_contracts", id);
        });

        // ═══════════════════════════════════════
        // 合同模板 (以 created_by 列 + var uid 强制鉴权)
        // ═══════════════════════════════════════

        app.MapGet("/api/contract-templates", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.1.0 P0-4 Phase 2: contract_templates 鐜板湪鏈?created_by
            return Common.Ok(db.Query($"SELECT * FROM contract_templates WHERE {CurrentUser.UserFilterCompany(scope)} ORDER BY created_at DESC", new { Uid = uid, IsAdmin = isAdmin }));
        });

        app.MapPost("/api/contract-templates", async (HttpContext ctx, ContractTemplateDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO contract_templates (name,type,content,variables,created_by,created_at,updated_at, last_modified_at) VALUES (@Name,@Type,@Content,@Variables,@CreatedBy,@Now,@Now, @Now); SELECT last_insert_rowid();",
                new { dto.Name, Type = dto.Type ?? "other", dto.Content, dto.Variables, CreatedBy = uid, Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/contract-templates", async (HttpContext ctx, ContractTemplateDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            // 修复: 原 dynamic dto + 参数只传 Now 导致 @Name/@Id 等全部缺参必 500; 并对齐 DELETE 的 user-dim 越权保护
            var affected = await db.ExecuteAsync(@"UPDATE contract_templates SET name=@Name,type=@Type,content=@Content,variables=@Variables,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { dto.Id, dto.Name, Type = dto.Type ?? "other", dto.Content, dto.Variables, Now = now(), Uid = uid, IsAdmin = isAdmin });
            return await Common.WriteResult(affected, db, "contract_templates", dto.Id ?? 0);
        });

        app.MapDelete("/api/contract-templates/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            return await Common.WriteResult(await db.ExecuteAsync("DELETE FROM contract_templates WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin }), db, "contract_templates", id);
        });
        // ═══════════════════════════════════════
        // 结算 (settlements 表有 created_by 列, 以 var uid 强制鉴权)
        // ═══════════════════════════════════════

        app.MapGet("/api/settlements", (HttpContext ctx, IDbConnection db, long? projectId) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.1.0 P0-4 Phase 2: settlements 琛ㄧ幇鍦ㄦ湁 created_by (migration 014)
            // 优先用内联 SQL 避免 LEFT JOIN projects 时 created_by 列冲突
            var sql = @"SELECT s.*, p.name as project_name
                        FROM settlements s LEFT JOIN projects p ON s.project_id=p.id
                        WHERE (s.created_by=@Uid OR @IsAdmin=1 OR EXISTS(SELECT 1 FROM project_authorizations WHERE project_id=s.project_id AND user_id=@Uid)) AND s.deleted_at IS NULL";
            if (projectId.HasValue) sql += " AND s.project_id=@ProjectId";
            sql += " ORDER BY s.created_at DESC";
            return Common.Ok(db.Query(sql, new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId }));
        });

        app.MapPost("/api/settlements", async (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // 修复: 原 dynamic dto + 参数只传 CreatedBy/Now 导致 8 个占位符全缺参必 500; 且 INSERT 引用了真库不存在的 settler_id 列
            using var reader = new System.IO.StreamReader(ctx.Request.Body);
            var bodyText = await reader.ReadToEndAsync();
            var body = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(bodyText);
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO settlements (project_id,contract_id,partner_id,type,sub_type,status,settlement_no,name,amount,settlement_date,remarks,items,files,created_by,created_at,updated_at, last_modified_at) VALUES (@ProjectId,@ContractId,@PartnerId,@Type,@SubType,'pending',@SettlementNo,@Name,@Amount,@SettlementDate,@Remarks,@Items,@Files,@CreatedBy,@Now,@Now, @Now);
                SELECT last_insert_rowid();",
                new {
                    ProjectId = body.TryGetProperty("projectId", out var p) && p.ValueKind == System.Text.Json.JsonValueKind.Number ? (long?)p.GetInt64() : null,
                    ContractId = body.TryGetProperty("contractId", out var ci) && ci.ValueKind == System.Text.Json.JsonValueKind.Number ? (long?)ci.GetInt64() : null,
                    PartnerId = body.TryGetProperty("partnerId", out var pi) && pi.ValueKind == System.Text.Json.JsonValueKind.Number ? (long?)pi.GetInt64() : null,
                    Type = body.TryGetProperty("type", out var ty) ? ty.GetString() : null,
                    SubType = body.TryGetProperty("subType", out var sub) ? sub.GetString() : null,
                    SettlementNo = body.TryGetProperty("settlementNo", out var sn) ? sn.GetString() : null,
                    Name = body.TryGetProperty("name", out var n) ? n.GetString() : null,
                    Amount = body.TryGetProperty("amount", out var a) && a.ValueKind == System.Text.Json.JsonValueKind.Number ? (decimal?)a.GetDouble() : null,
                    SettlementDate = body.TryGetProperty("settlementDate", out var sd) ? sd.GetString() : null,
                    Remarks = body.TryGetProperty("remarks", out var rm) ? rm.GetString() : null,
                    Items = body.TryGetProperty("items", out var it) ? it.GetRawText() : "[]",
                    Files = body.TryGetProperty("files", out var f) ? f.GetRawText() : "[]",
                    CreatedBy = uid, Now = now()
                });
            // fire-and-forget: upsert 实体到知识库种子表
            var stlName = body.TryGetProperty("name", out var sn2) ? sn2.GetString() ?? "" : "";
            var stlProjectId = body.TryGetProperty("projectId", out var sp2) && sp2.ValueKind == System.Text.Json.JsonValueKind.Number ? (long?)sp2.GetInt64() : null;
            var stlCapturedId = id;
            _ = Task.Run(async () =>
            {
                try
                {
                    using var scope = ctx.RequestServices.CreateScope();
                    var ssp = scope.ServiceProvider;
                    var bgDb = ssp.GetRequiredService<IDbConnection>();
                    var bgEmb = ssp.GetRequiredService<IEmbeddingService>();
                    var svc = new KnowledgeEntityService(bgDb, bgEmb);
                    await svc.UpsertEntityAsync("settlement", stlCapturedId, stlName, stlProjectId);
                }
                catch (Exception ex) { Console.Error.WriteLine($"[EntitySeed] settlement upsert 失败: {ex.Message}"); }
            });
            return Common.Ok(id);
        });

        app.MapPut("/api/settlements", async (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            // 修复: 原 dynamic dto + 参数只传 Now 导致缺参必 500; 并补 user-dim 越权保护(对齐 DELETE)
            using var reader = new System.IO.StreamReader(ctx.Request.Body);
            var bodyText = await reader.ReadToEndAsync();
            var body = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(bodyText);
            var recordId = body.TryGetProperty("id", out var idProp) ? idProp.GetInt64() : 0;
            var affected = await db.ExecuteAsync(@"UPDATE settlements SET name=@Name,sub_type=@SubType,amount=@Amount,settlement_date=@SettlementDate,remarks=@Remarks,items=@Items,files=@Files,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id AND deleted_at IS NULL AND (created_by=@Uid OR @IsAdmin=1)",
                new { Uid = uid, IsAdmin = isAdmin, Now = now(),
                    Id = recordId,
                    Name = body.TryGetProperty("name", out var n) ? n.GetString() : null,
                    SubType = body.TryGetProperty("subType", out var sub) ? sub.GetString() : null,
                    Amount = body.TryGetProperty("amount", out var a) && a.ValueKind == System.Text.Json.JsonValueKind.Number ? (decimal?)a.GetDouble() : null,
                    SettlementDate = body.TryGetProperty("settlementDate", out var sd) ? sd.GetString() : null,
                    Remarks = body.TryGetProperty("remarks", out var rm) ? rm.GetString() : null,
                    Items = body.TryGetProperty("items", out var it) ? it.GetRawText() : "[]",
                    Files = body.TryGetProperty("files", out var f) ? f.GetRawText() : "[]"
                });
            // fire-and-forget: upsert 实体到知识库种子表
            if (affected > 0)
            {
                var stlPutName = body.TryGetProperty("name", out var spn) ? spn.GetString() ?? "" : "";
                var stlPutRecordId = recordId;
                _ = Task.Run(async () =>
                {
                    try
                    {
                        using var scope = ctx.RequestServices.CreateScope();
                        var ssp = scope.ServiceProvider;
                        var bgDb = ssp.GetRequiredService<IDbConnection>();
                        var bgEmb = ssp.GetRequiredService<IEmbeddingService>();
                        var svc = new KnowledgeEntityService(bgDb, bgEmb);
                        var pid = bgDb.ExecuteScalar<long?>("SELECT [project_id] FROM [settlements] WHERE [id]=@Id", new { Id = stlPutRecordId });
                        await svc.UpsertEntityAsync("settlement", stlPutRecordId, stlPutName, pid);
                    }
                    catch (Exception ex) { Console.Error.WriteLine($"[EntitySeed] settlement PUT upsert 失败: {ex.Message}"); }
                });
            }
            return await Common.WriteResult(affected, db, "settlements", recordId);
        });

        app.MapDelete("/api/settlements/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            return await Common.WriteResult(await db.ExecuteAsync("UPDATE settlements SET deleted_at=@Now WHERE id=@Id AND deleted_at IS NULL AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin, Now = now() }), db, "settlements", id);
        });
        app.MapPut("/api/settlements/{id}/process", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            // 补 user-dim 越权保护(对齐 DELETE)
            var affected = await db.ExecuteAsync(@"UPDATE settlements SET status='processed',updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id AND deleted_at IS NULL AND (created_by=@Uid OR @IsAdmin=1)",
                new { Id = id, Uid = uid, IsAdmin = isAdmin, Now = now() });
            return await Common.WriteResult(affected, db, "settlements", id);
        });

        app.MapPut("/api/settlements/{id}/unarchive", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            // 补 user-dim 越权保护(对齐 DELETE)
            var affected = await db.ExecuteAsync(@"UPDATE settlements SET status='pending',updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id AND deleted_at IS NULL AND (created_by=@Uid OR @IsAdmin=1)",
                new { Id = id, Uid = uid, IsAdmin = isAdmin, Now = now() });
            return await Common.WriteResult(affected, db, "settlements", id);
        });
    }
}

