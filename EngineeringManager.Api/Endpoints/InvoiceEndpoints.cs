using System.Data;
using Dapper;
using EngineeringManager.Api.Security;
using EngineeringManager.Api.Services;
using EngineeringManager.Api.Services.Stt;
using Microsoft.Extensions.DependencyInjection;

namespace EngineeringManager.Api;

/// <summary>
/// 鍙戠エ + 鏀朵粯娆捐褰曠鐐?
/// </summary>
public static class InvoiceEndpoints
{
    public static void RegisterInvoiceEndpoints(this WebApplication app)
    {
        var now = () => DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

        // 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
        // 鍙戠エ
        // 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?

        app.MapGet("/api/invoices", (HttpContext ctx, IDbConnection db, long? projectId) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            // v1.1.0 P0-4 Phase 2: 鍐呰仈 SQL 閬垮厤 JOIN partners/projects 涔熸湁 created_by 鍒楃殑鍐茬獊
            var sql = @"SELECT i.*, p.name as project_name,
                               seller.name as sellerName, buyer.name as buyerName,
                               CASE WHEN i.type='invoice_in' THEN seller.name ELSE buyer.name END as partner_name
                        FROM invoices i
                        LEFT JOIN projects p ON i.project_id=p.id
                        LEFT JOIN partners seller ON i.seller_id=seller.id
                        LEFT JOIN partners buyer ON i.buyer_id=buyer.id
                        WHERE (i.created_by=@Uid OR @IsAdmin=1 OR EXISTS(SELECT 1 FROM project_authorizations WHERE project_id=i.project_id AND user_id=@Uid)) AND i.deleted_at IS NULL";
            if (projectId.HasValue) sql += " AND i.project_id=@ProjectId";
            sql += " ORDER BY i.created_at DESC";
            return Common.Ok(db.Query(sql, new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId }));
        });

        app.MapPost("/api/invoices", async (HttpContext ctx, InvoiceDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B4: 发票写操作 → invoices:create
            if (!CurrentUser.HasPermission(ctx, db, "invoices:create")) return Results.Forbid();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO invoices (project_id,seller_id,buyer_id,contract_id,settlement_id,type,invoice_kind,invoice_no,invoice_code,name,
                 amount,price_amount,tax_rate,tax_amount,received_amount,issue_date,status,remarks,file_url,file_type,created_by,created_at,updated_at, last_modified_at) VALUES (@ProjectId,@SellerId,@BuyerId,@ContractId,@SettlementId,@Type,@InvoiceKind,@InvoiceNo,@InvoiceCode,@Name,
                        @Amount,@PriceAmount,@TaxRate,@TaxAmount,@ReceivedAmount,@IssueDate,@Status,@Remarks,@FileUrl,@FileType,@CreatedBy,@Now,@Now, @Now);
                SELECT last_insert_rowid();",
                new { dto.ProjectId, dto.SellerId, dto.BuyerId, dto.ContractId, dto.SettlementId, dto.Type, dto.InvoiceKind, dto.InvoiceNo, dto.InvoiceCode,
                      dto.Name, dto.Amount, dto.PriceAmount, dto.TaxRate, dto.TaxAmount, dto.ReceivedAmount, dto.IssueDate,
                      Status = dto.Status ?? "pending", dto.Remarks, dto.FileUrl, dto.FileType, CreatedBy = uid, Now = now() });
            // fire-and-forget: upsert 实体到知识库种子表
            var invCapturedId = id;
            var invName = dto.Name ?? "";
            var invProjectId = dto.ProjectId;
            _ = Task.Run(async () =>
            {
                try
                {
                    using var scope = ctx.RequestServices.CreateScope();
                    var sp = scope.ServiceProvider;
                    var bgDb = sp.GetRequiredService<IDbConnection>();
                    var bgEmb = sp.GetRequiredService<IEmbeddingService>();
                    var svc = new KnowledgeEntityService(bgDb, bgEmb);
                    await svc.UpsertEntityAsync("invoice", invCapturedId, invName, invProjectId);
                }
                catch (Exception ex) { Console.Error.WriteLine($"[EntitySeed] invoice upsert 失败: {ex.Message}"); }
            });
            return Common.Ok(id);
        });

        app.MapPut("/api/invoices", async (HttpContext ctx, InvoiceDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B4: 发票写操作 → invoices:update
            if (!CurrentUser.HasPermission(ctx, db, "invoices:update")) return Results.Forbid();
            // R9-12 方案丙更新侧：授权项目跨人可改 + audit（B13）
            // 预读行归属（C# 单点裁决归属，SQL WHERE 不再含 created_by/IsAdmin）。
            // 本端点无 G75 项目门（无 CanWriteProject），分层 = HasPermission → Classify；
            // invoices 无锁列，故无 409 档；预读不加 deleted_at，与现状 WHERE 一致（Pin4 钉住）。
            if (!dto.Id.HasValue) return Results.Forbid();
            var row = db.QueryFirstOrDefault(
                "SELECT created_by, project_id FROM invoices WHERE id=@Id",
                new { Id = dto.Id.Value });
            // 行不存在 → 维持现状「不存在=403」语义（Pin4 钉住，未改 WriteResult 的 404）
            if (row == null) return Results.Forbid();
            // 归属裁决：Denied → 403；AllowedViaAuthorization → 跨人修改落 audit（同事务 fail-closed）
            var createdBy = row.created_by as string;
            var projectId = row.project_id as long?;
            var access = RowWriteGate.Classify(ctx, db, createdBy, projectId);
            if (access == RowWriteOutcome.Denied) return Results.Forbid();

            // 归属条件移出 SQL（C# 单点裁决）；无锁列故 WHERE 只留 id
            using var tx = db.BeginTransaction();
            var affected = await db.ExecuteAsync(@"UPDATE invoices SET project_id=@ProjectId,seller_id=@SellerId,
                buyer_id=@BuyerId,contract_id=@ContractId,settlement_id=@SettlementId,type=@Type,invoice_kind=@InvoiceKind,
                invoice_no=@InvoiceNo,invoice_code=@InvoiceCode,name=@Name,amount=@Amount,price_amount=@PriceAmount,
                tax_rate=@TaxRate,tax_amount=@TaxAmount,received_amount=@ReceivedAmount,issue_date=@IssueDate,
                status=@Status,remarks=@Remarks,file_url=@FileUrl,file_type=@FileType,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id",
                new { dto.Id, dto.ProjectId, dto.SellerId, dto.BuyerId, dto.ContractId, dto.SettlementId, dto.Type, dto.InvoiceKind, dto.InvoiceNo,
                      dto.InvoiceCode, dto.Name, dto.Amount, dto.PriceAmount, dto.TaxRate, dto.TaxAmount, dto.ReceivedAmount, dto.IssueDate,
                      dto.Status, dto.Remarks, dto.FileUrl, dto.FileType, Now = now() }, tx);
            if (access == RowWriteOutcome.AllowedViaAuthorization)
            {
                // 跨人修改落审计（fail-closed：审计写不进 → 事务回滚 → 修改不生效）
                AuditWriter.CrossUserEdit(db, tx, ctx, "invoices", dto.Id.Value, "PUT /api/invoices", createdBy, projectId);
            }
            tx.Commit();

            // fire-and-forget: upsert 实体到知识库种子表（Commit 后原条件原样）
            if (affected > 0 && dto.Id.HasValue)
            {
                var invPutId = dto.Id.Value;
                var invPutName = dto.Name ?? "";
                _ = Task.Run(async () =>
                {
                    try
                    {
                        using var scope = ctx.RequestServices.CreateScope();
                        var sp = scope.ServiceProvider;
                        var bgDb = sp.GetRequiredService<IDbConnection>();
                        var bgEmb = sp.GetRequiredService<IEmbeddingService>();
                        var svc = new KnowledgeEntityService(bgDb, bgEmb);
                        var pid = bgDb.ExecuteScalar<long?>("SELECT [project_id] FROM [invoices] WHERE [id]=@Id", new { Id = invPutId });
                        await svc.UpsertEntityAsync("invoice", invPutId, invPutName, pid);
                    }
                    catch (Exception ex) { Console.Error.WriteLine($"[EntitySeed] invoice PUT upsert 失败: {ex.Message}"); }
                });
            }
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapDelete("/api/invoices/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B4: 发票写操作 → invoices:delete
            if (!CurrentUser.HasPermission(ctx, db, "invoices:delete")) return Results.Forbid();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            return (await db.ExecuteAsync("UPDATE invoices SET deleted_at=@Now WHERE id=@Id AND deleted_at IS NULL AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin, Now = now() })) > 0 ? Common.Ok() : Results.Forbid();
        });

        // 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
        // 鏀朵粯娆捐褰?
        // 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?

        app.MapGet("/api/payment-records", (HttpContext ctx, IDbConnection db, string? paymentType, long? projectId) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            var sql = @"SELECT pr.*, p.name as project_name, pt.name as partner_name
                        FROM payment_records pr
                        LEFT JOIN projects p ON pr.project_id=p.id
                        LEFT JOIN partners pt ON pr.partner_id=pt.id";
            var conditions = new List<string>();
            if (!string.IsNullOrEmpty(paymentType)) conditions.Add("pr.type=@PaymentType");
            if (projectId.HasValue) conditions.Add("pr.project_id=@ProjectId");
            // v1.1.0 P0-4 Phase 2: 鎬诲姞 user-dim
            conditions.Add(CurrentUser.UserFilterWithAuthorizedProjects(scope, "pr.project_id", "pr.created_by"));
            conditions.Add("pr.deleted_at IS NULL");
            sql += " WHERE " + string.Join(" AND ", conditions);
            sql += " ORDER BY pr.created_at DESC";
            var records = db.Query(sql, new { Uid = uid, IsAdmin = isAdmin, PaymentType = paymentType, ProjectId = projectId }).ToList();

            // 瑙ｆ瀽 invoice_details JSON 骞跺叧鑱斿彂绁ㄤ俊鎭?
            var result = new List<dynamic>();
            foreach (var record in records)
            {
                var dict = (IDictionary<string, object>)record;
                var invoiceDetailsStr = dict.ContainsKey("invoice_details") ? dict["invoice_details"]?.ToString() : "[]";
                var invoiceInfos = new List<object>();
                try
                {
                    if (!string.IsNullOrEmpty(invoiceDetailsStr) && invoiceDetailsStr != "[]")
                    {
                        var details = System.Text.Json.JsonSerializer.Deserialize<List<System.Text.Json.JsonElement>>(invoiceDetailsStr) ?? [];
                        foreach (var detail in details)
                        {
                            var invoiceId = detail.GetProperty("invoiceId").GetInt64();
                            var paymentAmount = detail.GetProperty("paymentAmount").GetDouble();
                            var invoice = db.QueryFirstOrDefault("SELECT invoice_no, amount FROM invoices WHERE id=@Id AND deleted_at IS NULL", new { Id = invoiceId });
                            invoiceInfos.Add(new
                            {
                                invoiceId,
                                invoiceNo = invoice?.invoice_no ?? "",
                                invoiceAmount = invoice?.amount ?? 0,
                                paymentAmount
                            });
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine($"[InvoiceEndpoints/payment-record] 瑙ｆ瀽澶辫触: {ex.Message}");
                }
                dict["invoice_infos"] = invoiceInfos;
                result.Add(record);
            }
            return Common.Ok(result);
        });

        app.MapPost("/api/payment-records", async (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B4: 收付款记录 → invoices:create
            if (!CurrentUser.HasPermission(ctx, db, "invoices:create")) return Results.Forbid();
            // 修复: 原 dynamic dto + 参数只传 CreatedBy/Now 导致 10 个占位符全缺参必 500(与 contract-templates bug#10 同根因)
            using var reader = new System.IO.StreamReader(ctx.Request.Body);
            var bodyText = await reader.ReadToEndAsync();
            var body = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(bodyText);
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO payment_records (type,amount,record_date,project_id,partner_id,contract_id,invoice_details,remarks,file_url,file_type,created_by,created_at, last_modified_at) VALUES (@Type,@Amount,@RecordDate,@ProjectId,@PartnerId,@ContractId,@InvoiceDetails,@Remarks,@FileUrl,@FileType,@CreatedBy,@Now, @Now);
                SELECT last_insert_rowid();",
                new {
                    Type = body.TryGetProperty("type", out var ty) ? ty.GetString() : null,
                    Amount = body.TryGetProperty("amount", out var a) && a.ValueKind == System.Text.Json.JsonValueKind.Number ? (decimal?)a.GetDouble() : null,
                    RecordDate = body.TryGetProperty("recordDate", out var rd) ? rd.GetString() : null,
                    ProjectId = body.TryGetProperty("projectId", out var p) && p.ValueKind == System.Text.Json.JsonValueKind.Number ? (long?)p.GetInt64() : null,
                    PartnerId = body.TryGetProperty("partnerId", out var pi) && pi.ValueKind == System.Text.Json.JsonValueKind.Number ? (long?)pi.GetInt64() : null,
                    ContractId = body.TryGetProperty("contractId", out var ci) && ci.ValueKind == System.Text.Json.JsonValueKind.Number ? (long?)ci.GetInt64() : null,
                    InvoiceDetails = body.TryGetProperty("invoiceDetails", out var iv) ? (iv.ValueKind == System.Text.Json.JsonValueKind.String ? iv.GetString() : iv.GetRawText()) : null,
                    Remarks = body.TryGetProperty("remarks", out var rm) ? rm.GetString() : null,
                    FileUrl = body.TryGetProperty("fileUrl", out var fu) ? fu.GetString() : null,
                    FileType = body.TryGetProperty("fileType", out var ft) ? ft.GetString() : null,
                    CreatedBy = uid, Now = now()
                });
            return Common.Ok(id);
        });

        app.MapPut("/api/payment-records", async (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B4: 收付款记录 → invoices:update
            if (!CurrentUser.HasPermission(ctx, db, "invoices:update")) return Results.Forbid();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            // 修复: 原 dynamic dto + 参数只传 Uid/IsAdmin/Now 导致缺参必 500; 并补 404 语义
            using var reader = new System.IO.StreamReader(ctx.Request.Body);
            var bodyText = await reader.ReadToEndAsync();
            var body = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(bodyText);
            var recordId = body.TryGetProperty("id", out var idProp) ? idProp.GetInt64() : 0;
            var affected = await db.ExecuteAsync(@"UPDATE payment_records SET type=@Type,amount=@Amount,record_date=@RecordDate,
                project_id=@ProjectId,partner_id=@PartnerId,contract_id=@ContractId,invoice_details=@InvoiceDetails,
                remarks=@Remarks,file_url=@FileUrl,file_type=@FileType, version=version+1, last_modified_at=@Now WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { Uid = uid, IsAdmin = isAdmin, Now = now(),
                    Id = recordId,
                    Type = body.TryGetProperty("type", out var ty) ? ty.GetString() : null,
                    Amount = body.TryGetProperty("amount", out var a) && a.ValueKind == System.Text.Json.JsonValueKind.Number ? (decimal?)a.GetDouble() : null,
                    RecordDate = body.TryGetProperty("recordDate", out var rd) ? rd.GetString() : null,
                    ProjectId = body.TryGetProperty("projectId", out var p) && p.ValueKind == System.Text.Json.JsonValueKind.Number ? (long?)p.GetInt64() : null,
                    PartnerId = body.TryGetProperty("partnerId", out var pi) && pi.ValueKind == System.Text.Json.JsonValueKind.Number ? (long?)pi.GetInt64() : null,
                    ContractId = body.TryGetProperty("contractId", out var ci) && ci.ValueKind == System.Text.Json.JsonValueKind.Number ? (long?)ci.GetInt64() : null,
                    InvoiceDetails = body.TryGetProperty("invoiceDetails", out var iv) ? (iv.ValueKind == System.Text.Json.JsonValueKind.String ? iv.GetString() : iv.GetRawText()) : null,
                    Remarks = body.TryGetProperty("remarks", out var rm) ? rm.GetString() : null,
                    FileUrl = body.TryGetProperty("fileUrl", out var fu) ? fu.GetString() : null,
                    FileType = body.TryGetProperty("fileType", out var ft) ? ft.GetString() : null
                });
            return await Common.WriteResult(affected, db, "payment_records", recordId);
        });

        app.MapDelete("/api/payment-records/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B4: 收付款记录 → invoices:delete
            if (!CurrentUser.HasPermission(ctx, db, "invoices:delete")) return Results.Forbid();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            return (await db.ExecuteAsync("UPDATE payment_records SET deleted_at=@Now WHERE id=@Id AND deleted_at IS NULL AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin, Now = now() })) > 0 ? Common.Ok() : Results.Forbid();
        });
    }
}


