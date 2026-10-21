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
                               CASE WHEN i.type='invoice_in' THEN seller.name ELSE buyer.name END as partner_name,
                               COALESCE((SELECT SUM(a.[amount_fen]) FROM [invoice_allocations] a
                                         JOIN [payment_records] pr ON pr.[id]=a.[payment_id]
                                         WHERE a.[invoice_id]=i.[id] AND pr.[deleted_at] IS NULL), 0) AS allocated_amount
                        FROM invoices i
                        LEFT JOIN projects p ON i.project_id=p.id
                        LEFT JOIN partners seller ON i.seller_id=seller.id
                        LEFT JOIN partners buyer ON i.buyer_id=buyer.id
                        WHERE (i.created_by=@Uid OR @IsAdmin=1 OR EXISTS(SELECT 1 FROM project_authorizations WHERE project_id=i.project_id AND user_id=@Uid)) AND i.deleted_at IS NULL";
            if (projectId.HasValue) sql += " AND i.project_id=@ProjectId";
            sql += " ORDER BY i.created_at DESC";
            // P0-b：deductible_tax 分→元；is_deducted 归一为 JSON bool（前端 Invoice.isDeducted）
            var rows = MoneyUnit.ToYuanRows(db.Query(sql, new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId }), "amount", "price_amount", "tax_amount", "received_amount", "deductible_tax", "allocated_amount");
            foreach (var row in rows)
                if (row.TryGetValue("is_deducted", out var deductedFlag) && deductedFlag != null && !(deductedFlag is DBNull))
                    row["is_deducted"] = Convert.ToInt64(deductedFlag) != 0;
            return Common.Ok(rows);
        });

        app.MapPost("/api/invoices", async (HttpContext ctx, InvoiceDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B4: 发票写操作 → invoices:create
            if (!CurrentUser.HasPermission(ctx, db, "invoices:create")) return Results.Forbid();
            // FP02：无发票代码时发票号码必须为 20 位纯数字（新版数电票）；有码旧票与空值放行
            if (!IsInvoiceNoValid(dto.InvoiceNo, dto.InvoiceCode))
                return Common.Fail("新版数电票发票号码为20位数字；旧版8位号码请一并填写发票代码", 400);
            // FP04：发票附件仅放行图片/PDF/XML/OFD，其余 400（空值无附件放行）
            if (!IsFileTypeAllowed(dto.FileType))
                return Common.Fail("仅支持 JPG、PNG、WebP、PDF、XML、OFD 格式的发票附件", 400);
            // P0-a' 阶段 1：票种两维校验（medium ∈ 2 值 / category ∈ 8 值；空值放行）
            var invoiceMedium = NormalizeInvoiceMedium(dto.InvoiceMedium);
            var invoiceCategory = NormalizeInvoiceCategory(dto.InvoiceCategory);
            if (!IsInvoiceMediumValid(invoiceMedium) || !IsInvoiceCategoryValid(invoiceCategory))
                return Common.Fail("发票介质/票种取值不合法", 400);
            // P0-a' 阶段 1：kind 与两维服务端单点派生（只传 kind 的旧客户端反推两维）
            var kindFields = ResolveInvoiceKindFields(dto.InvoiceKind, invoiceMedium, invoiceCategory, null, null, null);
            // FP06：红冲必须关联原蓝票；数电票不能作废（介质优先，legacy kind 兼容）
            var fp06 = await ValidateInvoiceFp06Async(db, dto.Status, kindFields.Kind, dto.OriginalInvoiceId, kindFields.Medium);
            if (fp06 != null) return Common.Fail(fp06, 400);
            // FP08：不得抵扣原因仅放行 NULL/空或六枚举之一，其余 400（空归一为 NULL=可抵扣）
            var nonDeductReason = NormalizeNonDeductibleReason(dto.NonDeductibleReason);
            if (!IsNonDeductibleReasonValid(nonDeductReason))
                return Common.Fail("进项税额不得抵扣原因取值不合法", 400);
            // P0-b：进项抵扣四字段（POST 用归一后的持久化票向判定；校验与落库同一值）
            var persistedType = NormalizeInvoiceType(dto.Type);
            var deduction = ResolveInvoiceDeduction(dto.IsDeducted, dto.DeductDate, dto.DeductPeriod, dto.DeductibleTax, persistedType);
            if (deduction.Error != null) return Common.Fail(deduction.Error, 400);
            // T3：税收分类编码 / 优惠政策（空白归一为 null；格式不合法 400）
            var taxCode = NormalizeTaxCode(dto.TaxCode);
            if (!IsTaxCodeValid(taxCode))
                return Common.Fail("税收分类编码格式不合法：最长 32 位，仅允许数字和字母", 400);
            var taxPolicy = NormalizeTaxPolicy(dto.TaxPolicy);
            if (!IsTaxPolicyValid(taxPolicy))
                return Common.Fail("优惠政策标识格式不合法：最长 64 位，不能包含控制字符", 400);
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO [invoices] (project_id,seller_id,buyer_id,contract_id,settlement_id,original_invoice_id,non_deductible_reason,is_deducted,deduct_date,deduct_period,deductible_tax,tax_code,tax_policy,type,invoice_kind,invoice_medium,invoice_category,invoice_no,invoice_code,name,
                 amount,price_amount,tax_rate,tax_amount,received_amount,issue_date,status,remarks,file_url,file_type,created_by,created_at,updated_at, last_modified_at) VALUES (@ProjectId,@SellerId,@BuyerId,@ContractId,@SettlementId,@OriginalInvoiceId,@NonDeductibleReason,@IsDeducted,@DeductDate,@DeductPeriod,@DeductibleTax,@TaxCode,@TaxPolicy,@Type,@InvoiceKind,@InvoiceMedium,@InvoiceCategory,@InvoiceNo,@InvoiceCode,@Name,
                        @Amount,@PriceAmount,@TaxRate,@TaxAmount,@ReceivedAmount,@IssueDate,@Status,@Remarks,@FileUrl,@FileType,@CreatedBy,@Now,@Now, @Now);
                SELECT last_insert_rowid();",
                new { dto.ProjectId, dto.SellerId, dto.BuyerId, dto.ContractId, dto.SettlementId, dto.OriginalInvoiceId, NonDeductibleReason = nonDeductReason,
                      IsDeducted = deduction.IsDeducted ? 1 : 0, deduction.DeductDate, deduction.DeductPeriod, DeductibleTax = deduction.DeductibleTaxFen, TaxCode = taxCode, TaxPolicy = taxPolicy, Type = persistedType,
                      InvoiceKind = kindFields.Kind, InvoiceMedium = kindFields.Medium, InvoiceCategory = kindFields.Category, dto.InvoiceNo, dto.InvoiceCode,
                      dto.Name, Amount = MoneyUnit.ToFen(dto.Amount), PriceAmount = MoneyUnit.ToFen(dto.PriceAmount), dto.TaxRate, TaxAmount = MoneyUnit.ToFen(dto.TaxAmount), ReceivedAmount = MoneyUnit.ToFen(dto.ReceivedAmount), dto.IssueDate,
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
            // FP02：无发票代码时发票号码必须为 20 位纯数字（新版数电票）；有码旧票与空值放行
            if (!IsInvoiceNoValid(dto.InvoiceNo, dto.InvoiceCode))
                return Common.Fail("新版数电票发票号码为20位数字；旧版8位号码请一并填写发票代码", 400);
            // FP04：发票附件仅放行图片/PDF/XML/OFD，其余 400（空值无附件放行）
            if (!IsFileTypeAllowed(dto.FileType))
                return Common.Fail("仅支持 JPG、PNG、WebP、PDF、XML、OFD 格式的发票附件", 400);
            // FP08：不得抵扣原因仅放行 NULL/空或六枚举之一，其余 400（空归一为 NULL；
            // 与 OriginalInvoiceId 同模式：NULL 经 COALESCE 保旧值，字段形状校验先行）
            var nonDeductReasonPut = NormalizeNonDeductibleReason(dto.NonDeductibleReason);
            if (!IsNonDeductibleReasonValid(nonDeductReasonPut))
                return Common.Fail("进项税额不得抵扣原因取值不合法", 400);
            // P0-a' 阶段 1：票种两维校验（medium ∈ 2 值 / category ∈ 8 值；空值放行）
            var invoiceMediumPut = NormalizeInvoiceMedium(dto.InvoiceMedium);
            var invoiceCategoryPut = NormalizeInvoiceCategory(dto.InvoiceCategory);
            if (!IsInvoiceMediumValid(invoiceMediumPut) || !IsInvoiceCategoryValid(invoiceCategoryPut))
                return Common.Fail("发票介质/票种取值不合法", 400);
            // R9-12 方案丙更新侧：授权项目跨人可改 + audit（B13）
            // 预读行归属（C# 单点裁决归属，SQL WHERE 不再含 created_by/IsAdmin）。
            // 本端点无 G75 项目门（无 CanWriteProject），分层 = HasPermission → Classify；
            // invoices 无锁列，故无 409 档；预读不加 deleted_at，与现状 WHERE 一致（Pin4 钉住）。
            if (!dto.Id.HasValue) return Results.Forbid();
            var row = db.QueryFirstOrDefault(
                "SELECT created_by, project_id, status, invoice_kind, invoice_medium, invoice_category, type FROM [invoices] WHERE id=@Id",
                new { Id = dto.Id.Value });
            // 行不存在 → 维持现状「不存在=403」语义（Pin4 钉住，未改 WriteResult 的 404）
            if (row == null) return Results.Forbid();
            // 归属裁决：Denied → 403；AllowedViaAuthorization → 跨人修改落 audit（同事务 fail-closed）
            var createdBy = row.created_by as string;
            var projectId = row.project_id as long?;
            var access = RowWriteGate.Classify(ctx, db, createdBy, projectId);
            if (access == RowWriteOutcome.Denied) return Results.Forbid();

            // P0-a' 阶段 1：kind 与两维服务端单点派生；三者都未传时保留库内语义
            // （旧客户端只传 kind → 反推两维；新客户端只传两维 → 派生 kind）。
            var currentStatus = row.status as string;
            var currentKind = row.invoice_kind as string;
            var currentMedium = row.invoice_medium as string;
            var currentCategory = row.invoice_category as string;
            var kindFieldsPut = ResolveInvoiceKindFields(dto.InvoiceKind, invoiceMediumPut, invoiceCategoryPut,
                currentKind, currentMedium, currentCategory);
            // FP06 生效介质：以本次解析后的最终生效值（dto/回填/反推）为准，而非库内旧值
            var effectiveMediumPut = invoiceMediumPut ?? kindFieldsPut.Medium;

            // P0-b：进项抵扣四字段（PUT 票向 = dto 归一值，空则沿用库内 type；
            // 校验与 UPDATE 落库共用该值，避免「校验用库内、落库用 dto」的反向伪造）
            var currentType = row.type as string;
            var persistedTypePut = NormalizeInvoiceType(dto.Type) ?? NormalizeInvoiceType(currentType);
            var deductionPut = ResolveInvoiceDeduction(dto.IsDeducted, dto.DeductDate, dto.DeductPeriod, dto.DeductibleTax, persistedTypePut);
            if (deductionPut.Error != null) return Common.Fail(deductionPut.Error, 400);

            // T3：税收分类编码 / 优惠政策（空白归一为 null；格式不合法 400）
            var taxCodePut = NormalizeTaxCode(dto.TaxCode);
            if (!IsTaxCodeValid(taxCodePut))
                return Common.Fail("税收分类编码格式不合法：最长 32 位，仅允许数字和字母", 400);
            var taxPolicyPut = NormalizeTaxPolicy(dto.TaxPolicy);
            if (!IsTaxPolicyValid(taxPolicyPut))
                return Common.Fail("优惠政策标识格式不合法：最长 64 位，不能包含控制字符", 400);

            // FP06：仅状态发生变更时门控；普通字段更新（状态不变/未传状态）不受影响（保历史数据兼容）。
            var statusChanged = !string.IsNullOrWhiteSpace(dto.Status)
                && !string.Equals(dto.Status.Trim(), (currentStatus ?? "").Trim(), StringComparison.Ordinal);
            if (statusChanged)
            {
                var fp06Put = await ValidateInvoiceFp06Async(db, dto.Status, kindFieldsPut.Kind, dto.OriginalInvoiceId, effectiveMediumPut);
                if (fp06Put != null) return Common.Fail(fp06Put, 400);
            }

            // 归属条件移出 SQL（C# 单点裁决）；无锁列故 WHERE 只留 id
            using var tx = db.BeginTransaction();
            var affected = await db.ExecuteAsync(@"UPDATE [invoices] SET project_id=@ProjectId,seller_id=@SellerId,
                buyer_id=@BuyerId,contract_id=@ContractId,settlement_id=@SettlementId,original_invoice_id=COALESCE(@OriginalInvoiceId,original_invoice_id),non_deductible_reason=COALESCE(@NonDeductibleReason,non_deductible_reason),
                is_deducted=@IsDeducted,deduct_date=@DeductDate,deduct_period=@DeductPeriod,deductible_tax=@DeductibleTax,tax_code=@TaxCode,tax_policy=@TaxPolicy,type=@Type,invoice_kind=@InvoiceKind,
                invoice_medium=@InvoiceMedium,invoice_category=@InvoiceCategory,
                invoice_no=@InvoiceNo,invoice_code=@InvoiceCode,name=@Name,amount=@Amount,price_amount=@PriceAmount,
                tax_rate=@TaxRate,tax_amount=@TaxAmount,received_amount=@ReceivedAmount,issue_date=@IssueDate,
                status=@Status,remarks=@Remarks,file_url=@FileUrl,file_type=@FileType,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id",
                new { dto.Id, dto.ProjectId, dto.SellerId, dto.BuyerId, dto.ContractId, dto.SettlementId, dto.OriginalInvoiceId, NonDeductibleReason = nonDeductReasonPut,
                      IsDeducted = deductionPut.IsDeducted ? 1 : 0, deductionPut.DeductDate, deductionPut.DeductPeriod, DeductibleTax = deductionPut.DeductibleTaxFen, TaxCode = taxCodePut, TaxPolicy = taxPolicyPut, Type = persistedTypePut,
                      InvoiceKind = kindFieldsPut.Kind, InvoiceMedium = kindFieldsPut.Medium, InvoiceCategory = kindFieldsPut.Category, dto.InvoiceNo,
                      dto.InvoiceCode, dto.Name, Amount = MoneyUnit.ToFen(dto.Amount), PriceAmount = MoneyUnit.ToFen(dto.PriceAmount), dto.TaxRate, TaxAmount = MoneyUnit.ToFen(dto.TaxAmount), ReceivedAmount = MoneyUnit.ToFen(dto.ReceivedAmount), dto.IssueDate,
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
                // 金额列分→元（amount）；invoice_details JSON 豁免分制恒为元（契约见 MoneyUnit）
                if (dict.TryGetValue("amount", out var amtObj) && amtObj != null && !(amtObj is DBNull))
                    dict["amount"] = MoneyUnit.ToYuanFromDb(amtObj);
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
                                invoiceAmount = MoneyUnit.ToYuanFromDb(invoice?.amount),
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
            var invoiceDetails = body.TryGetProperty("invoiceDetails", out var iv) ? (iv.ValueKind == System.Text.Json.JsonValueKind.String ? iv.GetString() : iv.GetRawText()) : null;
            // T4a：核销超额校验（新建尚无 payment_id，其他付款记录全部计入；等额允许）
            var paymentAmountFen = body.TryGetProperty("amount", out var payAmt) && payAmt.ValueKind == System.Text.Json.JsonValueKind.Number
                ? MoneyUnit.ToFen((decimal?)payAmt.GetDouble())
                : null;
            var allocationError = ValidateInvoiceAllocationLimit(ctx, db, null, invoiceDetails);
            if (allocationError != null) return Common.Fail(allocationError, 400);
            // T4b：0 元付款不得登记核销（PUT 为兼容历史数据仍跳过；新建必须拒绝，堵 API 旁路）
            if ((paymentAmountFen ?? 0) <= 0 && ParseInvoiceAllocations(invoiceDetails).Count > 0)
                return Common.Fail("付款金额必须大于 0 才能登记核销", 400);
            // T4b：核销合计不得超过付款记录金额（付款金额为 0 时跳过，兼容历史/未填数据）
            var allocationTotalError = ValidateAllocationTotalWithinPayment(invoiceDetails, paymentAmountFen);
            if (allocationTotalError != null) return Common.Fail(allocationTotalError, 400);
            // 付款记录与核销投影同一事务：任一失败都不留“付款已存、核销缺失”
            using var tx = db.BeginTransaction();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO payment_records (type,amount,record_date,project_id,partner_id,contract_id,invoice_details,remarks,file_url,file_type,created_by,created_at, last_modified_at) VALUES (@Type,@Amount,@RecordDate,@ProjectId,@PartnerId,@ContractId,@InvoiceDetails,@Remarks,@FileUrl,@FileType,@CreatedBy,@Now, @Now);
                SELECT last_insert_rowid();",
                new {
                    Type = body.TryGetProperty("type", out var ty) ? ty.GetString() : null,
                    Amount = MoneyUnit.ToFen(body.TryGetProperty("amount", out var a) && a.ValueKind == System.Text.Json.JsonValueKind.Number ? (decimal?)a.GetDouble() : null),
                    RecordDate = body.TryGetProperty("recordDate", out var rd) ? rd.GetString() : null,
                    ProjectId = body.TryGetProperty("projectId", out var p) && p.ValueKind == System.Text.Json.JsonValueKind.Number ? (long?)p.GetInt64() : null,
                    PartnerId = body.TryGetProperty("partnerId", out var pi) && pi.ValueKind == System.Text.Json.JsonValueKind.Number ? (long?)pi.GetInt64() : null,
                    ContractId = body.TryGetProperty("contractId", out var ci) && ci.ValueKind == System.Text.Json.JsonValueKind.Number ? (long?)ci.GetInt64() : null,
                    InvoiceDetails = invoiceDetails,
                    Remarks = body.TryGetProperty("remarks", out var rm) ? rm.GetString() : null,
                    FileUrl = body.TryGetProperty("fileUrl", out var fu) ? fu.GetString() : null,
                    FileType = body.TryGetProperty("fileType", out var ft) ? ft.GetString() : null,
                    CreatedBy = uid, Now = now()
                }, tx);
            // T4a：付款记录与核销投影同事务提交
            SyncInvoiceAllocations(db, id, invoiceDetails, tx);
            tx.Commit();
            return Common.Ok(id);
        });

        app.MapPut("/api/payment-records", async (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B4: 收付款记录 → invoices:update
            if (!CurrentUser.HasPermission(ctx, db, "invoices:update")) return Results.Forbid();
            // 修复: 原 dynamic dto + 参数只传 Uid/IsAdmin/Now 导致缺参必 500; 并补 404 语义
            using var reader = new System.IO.StreamReader(ctx.Request.Body);
            var bodyText = await reader.ReadToEndAsync();
            var body = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(bodyText);
            var invoiceDetails = body.TryGetProperty("invoiceDetails", out var iv) ? (iv.ValueKind == System.Text.Json.JsonValueKind.String ? iv.GetString() : iv.GetRawText()) : null;
            var recordId = body.TryGetProperty("id", out var idProp) ? idProp.GetInt64() : 0;
            // R9-13 方案丙更新侧：授权项目跨人可改 + audit（B15）
            // 预读行归属（C# 单点裁决归属，SQL WHERE 不再含 created_by/IsAdmin）。
            // 本端点无 G75 项目门（无 CanWriteProject），分层 = HasPermission → Classify；
            // payment_records 无锁列，故无 409 档；预读不加 deleted_at，与现状 WHERE 一致。
            var row = db.QueryFirstOrDefault(
                "SELECT created_by, project_id FROM payment_records WHERE id=@Id",
                new { Id = recordId });
            // 行不存在 → 404（照 WriteResult 语义，现状可观察保留；Pin4 钉住）
            if (row == null) return Results.NotFound(new { success = false, error = "记录不存在" });
            // 归属裁决：Denied → 403；AllowedViaAuthorization → 跨人修改落 audit（同事务 fail-closed）
            var createdBy = row.created_by as string;
            var projectId = row.project_id as long?;
            var access = RowWriteGate.Classify(ctx, db, createdBy, projectId);
            if (access == RowWriteOutcome.Denied) return Results.Forbid();

            // 归属条件移出 SQL（C# 单点裁决）；无锁列故 WHERE 只留 id
            // T4a：核销超额校验（排除本付款记录已核销部分；等额允许）
            var paymentAmountFen = body.TryGetProperty("amount", out var payAmt) && payAmt.ValueKind == System.Text.Json.JsonValueKind.Number
                ? MoneyUnit.ToFen((decimal?)payAmt.GetDouble())
                : null;
            var allocationError = ValidateInvoiceAllocationLimit(ctx, db, recordId, invoiceDetails);
            if (allocationError != null) return Common.Fail(allocationError, 400);
            // T4b：核销合计不得超过付款记录金额（付款金额为 0 时跳过，兼容历史/未填数据）
            var allocationTotalError = ValidateAllocationTotalWithinPayment(invoiceDetails, paymentAmountFen);
            if (allocationTotalError != null) return Common.Fail(allocationTotalError, 400);
            using var tx = db.BeginTransaction();
            var affected = await db.ExecuteAsync(@"UPDATE payment_records SET type=@Type,amount=@Amount,record_date=@RecordDate,
                project_id=@ProjectId,partner_id=@PartnerId,contract_id=@ContractId,invoice_details=@InvoiceDetails,
                remarks=@Remarks,file_url=@FileUrl,file_type=@FileType, version=version+1, last_modified_at=@Now WHERE id=@Id",
                new { Now = now(),
                    Id = recordId,
                    Type = body.TryGetProperty("type", out var ty) ? ty.GetString() : null,
                    Amount = MoneyUnit.ToFen(body.TryGetProperty("amount", out var a) && a.ValueKind == System.Text.Json.JsonValueKind.Number ? (decimal?)a.GetDouble() : null),
                    RecordDate = body.TryGetProperty("recordDate", out var rd) ? rd.GetString() : null,
                    ProjectId = body.TryGetProperty("projectId", out var p) && p.ValueKind == System.Text.Json.JsonValueKind.Number ? (long?)p.GetInt64() : null,
                    PartnerId = body.TryGetProperty("partnerId", out var pi) && pi.ValueKind == System.Text.Json.JsonValueKind.Number ? (long?)pi.GetInt64() : null,
                    ContractId = body.TryGetProperty("contractId", out var ci) && ci.ValueKind == System.Text.Json.JsonValueKind.Number ? (long?)ci.GetInt64() : null,
                    InvoiceDetails = invoiceDetails,
                    Remarks = body.TryGetProperty("remarks", out var rm) ? rm.GetString() : null,
                    FileUrl = body.TryGetProperty("fileUrl", out var fu) ? fu.GetString() : null,
                    FileType = body.TryGetProperty("fileType", out var ft) ? ft.GetString() : null
                }, tx);
            if (access == RowWriteOutcome.AllowedViaAuthorization)
            {
                // 跨人修改落审计（fail-closed：审计写不进 → 事务回滚 → 修改不生效）
                AuditWriter.CrossUserEdit(db, tx, ctx, "payment_records", recordId, "PUT /api/payment-records", createdBy, projectId);
            }
            // T4a：更新与核销重建同事务（避免付款已改、核销未同步）
            if (affected > 0) SyncInvoiceAllocations(db, recordId, invoiceDetails, tx);
            tx.Commit();
            // affected>0 → 200；竞态兜底走 WriteResult（404/403 现状语义）
            return await Common.WriteResult(affected, db, "payment_records", recordId);
        });

        app.MapDelete("/api/payment-records/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B4: 收付款记录 → invoices:delete
            if (!CurrentUser.HasPermission(ctx, db, "invoices:delete")) return Results.Forbid();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            // T4a：软删除与清除核销投影同事务，避免余额被继续占用或删除成功但投影残留
            using var tx = db.BeginTransaction();
            var affected = await db.ExecuteAsync("UPDATE payment_records SET deleted_at=@Now WHERE id=@Id AND deleted_at IS NULL AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin, Now = now() }, tx);
            if (affected <= 0) return Results.Forbid();
            await db.ExecuteAsync("DELETE FROM [invoice_allocations] WHERE [payment_id]=@Id", new { Id = id }, tx);
            tx.Commit();
            return Common.Ok();
        });

        // T4a：发票核销明细 + 已核销 / 未核销余额（分→元返回）
        app.MapGet("/api/invoices/{id}/allocations", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            // 与 GET /api/invoices 同口径的可见性（created_by / 管理员 / 项目授权），防越权读
            var invoice = await db.QueryFirstOrDefaultAsync(
                @"SELECT i.[id], i.[amount] FROM [invoices] i
                  WHERE i.[id]=@Id AND i.[deleted_at] IS NULL
                    AND (i.[created_by]=@Uid OR @IsAdmin=1
                         OR EXISTS(SELECT 1 FROM project_authorizations WHERE project_id=i.[project_id] AND user_id=@Uid))",
                new { Id = id, Uid = uid, IsAdmin = isAdmin });
            if (invoice == null) return Common.NotFound("发票不存在");

            // 汇总按“全部未软删除付款”计算（财务口径不随查看者变化）；
            // 明细再套用与 GET /api/payment-records 同款 user-dim，防越权读他人付款备注/金额。
            var scope = CurrentUser.GetDataScope(ctx);
            var visibleFilter = CurrentUser.UserFilterWithAuthorizedProjects(scope, "pr.[project_id]", "pr.[created_by]");
            var rows = (await db.QueryAsync(
                $@"SELECT a.[payment_id] AS payment_id, pr.[record_date] AS record_date, pr.[type] AS type,
                          a.[amount_fen] AS amount_fen, pr.[remarks] AS remarks,
                          CASE WHEN {visibleFilter} THEN 1 ELSE 0 END AS is_visible
                   FROM [invoice_allocations] a
                   JOIN [payment_records] pr ON pr.[id]=a.[payment_id]
                   WHERE a.[invoice_id]=@InvoiceId AND pr.[deleted_at] IS NULL
                   ORDER BY pr.[record_date], pr.[id]",
                new { InvoiceId = id, Uid = uid, IsAdmin = isAdmin })).ToList();

            long amountFen = ToFenFromDb(invoice.amount);
            long allocatedFen = 0;
            var items = new List<object>();
            var itemsFiltered = false;
            foreach (var r in rows)
            {
                allocatedFen += Convert.ToInt64(r.amount_fen);
                var isVisible = Convert.ToInt64(r.is_visible) == 1;
                if (!isVisible) { itemsFiltered = true; continue; }
                items.Add(new
                {
                    paymentId = Convert.ToInt64(r.payment_id),
                    recordDate = r.record_date as string,
                    type = r.type as string,
                    amount = MoneyUnit.ToYuan(Convert.ToInt64(r.amount_fen)),
                    remarks = r.remarks as string
                });
            }
            return Common.Ok(new
            {
                invoiceId = id,
                amount = MoneyUnit.ToYuan(amountFen),
                allocated = MoneyUnit.ToYuan(allocatedFen),
                outstanding = MoneyUnit.ToYuan(amountFen - allocatedFen),
                itemsFiltered,
                items
            });
        });
    }

    /// <summary>
    /// T4a：把 payment_records.invoice_details JSON（paymentAmount 单位元）投影到
    /// invoice_allocations（amount_fen 单位分）。先删本付款记录旧行再重建，
    /// 因而 PUT 改金额/换发票不会残留旧行；重复 invoiceId 先累加避免唯一索引冲突。
    /// 容错：null/空/非法 JSON/非数组 → 视为无核销（只清旧行）。
    /// </summary>
    private static void SyncInvoiceAllocations(IDbConnection db, long paymentId, string? invoiceDetailsJson, IDbTransaction tx)
    {
        // 由调用方事务统一提交：先删后建，中途失败整体回滚，不留“零核销”中间态
        db.Execute("DELETE FROM [invoice_allocations] WHERE [payment_id]=@PaymentId", new { PaymentId = paymentId }, tx);
        var allocations = ParseInvoiceAllocations(invoiceDetailsJson);
        var now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
        foreach (var pair in allocations)
        {
            db.Execute(
                @"INSERT INTO [invoice_allocations] ([invoice_id],[payment_id],[amount_fen],[created_at],[updated_at])
                  VALUES (@InvoiceId,@PaymentId,@AmountFen,@Now,@Now)",
                new { InvoiceId = pair.Key, PaymentId = paymentId, AmountFen = pair.Value, Now = now }, tx);
        }
    }

    /// <summary>
    /// T4a：解析 invoice_details JSON → { invoiceId: 分 }。元→分走 MoneyUnit.ToFen（四舍五入）。
    /// 容错：非法 JSON/非数组返回空；invoiceId&lt;=0 或金额&lt;=0 的条目丢弃；同一 invoiceId 累加。
    /// </summary>
    private static Dictionary<long, long> ParseInvoiceAllocations(string? invoiceDetailsJson)
    {
        var result = new Dictionary<long, long>();
        if (string.IsNullOrWhiteSpace(invoiceDetailsJson)) return result;
        try
        {
            using var doc = System.Text.Json.JsonDocument.Parse(invoiceDetailsJson);
            if (doc.RootElement.ValueKind != System.Text.Json.JsonValueKind.Array) return result;
            foreach (var item in doc.RootElement.EnumerateArray())
            {
                if (item.ValueKind != System.Text.Json.JsonValueKind.Object) continue;
                if (!item.TryGetProperty("invoiceId", out var idEl)
                    || idEl.ValueKind != System.Text.Json.JsonValueKind.Number
                    || !idEl.TryGetInt64(out var invoiceId)
                    || invoiceId <= 0) continue;
                if (!item.TryGetProperty("paymentAmount", out var amtEl)) continue;
                decimal amountYuan;
                if (amtEl.ValueKind == System.Text.Json.JsonValueKind.Number)
                {
                    if (!amtEl.TryGetDecimal(out amountYuan)) continue;
                }
                else if (amtEl.ValueKind == System.Text.Json.JsonValueKind.String)
                {
                    if (!decimal.TryParse(amtEl.GetString(), System.Globalization.NumberStyles.Number,
                            System.Globalization.CultureInfo.InvariantCulture, out amountYuan)) continue;
                }
                else continue;
                // 先按 2 位四舍五入（AwayFromZero，与 SQLite ROUND 同口径），再转分，避免 3 位小数差 1 分
                var amountYuanRounded = Math.Round(amountYuan, 2, MidpointRounding.AwayFromZero);
                var amountFen = MoneyUnit.ToFen((decimal?)amountYuanRounded) ?? 0;
                if (amountFen <= 0) continue;
                result[invoiceId] = result.GetValueOrDefault(invoiceId) + amountFen;
            }
        }
        catch (System.Text.Json.JsonException)
        {
            return new Dictionary<long, long>();
        }
        return result;
    }

    /// <summary>
    /// T4a：超额校验。「除本付款记录外已核销合计 + 本次」&gt; 发票 amount（分）→ 返回可读错误；
    /// 相等允许。paymentId 为 null（新建）时不排除任何记录。发票不存在/已删除不在此拦截。
    /// </summary>
    private static string? ValidateInvoiceAllocationLimit(HttpContext ctx, IDbConnection db, long? paymentId, string? invoiceDetailsJson)
    {
        var allocations = ParseInvoiceAllocations(invoiceDetailsJson);
        if (allocations.Count == 0) return null;
        var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
        var scope = CurrentUser.GetDataScope(ctx);
        // 与 GET /api/invoices 同口径：不可见的发票既不能挂核销，也不能通过错误信息泄露余额
        var visibility = CurrentUser.UserFilterWithAuthorizedProjects(scope, "i.[project_id]", "i.[created_by]");
        foreach (var pair in allocations)
        {
            var invoice = db.QueryFirstOrDefault(
                $@"SELECT i.[amount] FROM [invoices] i
                   WHERE i.[id]=@Id AND i.[deleted_at] IS NULL AND {visibility}",
                new { Id = pair.Key, Uid = uid });
            if (invoice == null) return $"发票 #{pair.Key} 不存在或无权访问";
            var invoiceAmountFen = ToFenFromDb(invoice.amount);
            // 排除本付款记录；已软删除付款记录的残留行不占额度
            var otherAllocatedFen = db.ExecuteScalar<long>(
                @"SELECT COALESCE(SUM(a.[amount_fen]),0)
                  FROM [invoice_allocations] a
                  JOIN [payment_records] pr ON pr.[id]=a.[payment_id]
                  WHERE a.[invoice_id]=@InvoiceId AND a.[payment_id]<>@PaymentId AND pr.[deleted_at] IS NULL",
                new { InvoiceId = pair.Key, PaymentId = paymentId ?? 0 });
            if (otherAllocatedFen + pair.Value > invoiceAmountFen)
            {
                var remainingFen = Math.Max(0, invoiceAmountFen - otherAllocatedFen);
                return $"核销金额超过发票金额（发票 #{pair.Key} 剩余 {MoneyUnit.ToYuanDecimal(remainingFen):0.00} 元）";
            }
        }
        return null;
    }

    /// <summary>
    /// T4b：核销合计不得超过付款记录金额。paymentAmountFen 为 null/0 时跳过（历史/未填付款金额）；
    /// 核销合计与付款金额均以【分】比较，避免浮点误差。
    /// </summary>
    private static string? ValidateAllocationTotalWithinPayment(string? invoiceDetailsJson, long? paymentAmountFen)
    {
        if (!paymentAmountFen.HasValue || paymentAmountFen.Value <= 0) return null;
        var allocations = ParseInvoiceAllocations(invoiceDetailsJson);
        if (allocations.Count == 0) return null;
        var totalFen = allocations.Values.Sum();
        if (totalFen <= paymentAmountFen.Value) return null;
        return $"核销合计（{MoneyUnit.ToYuanDecimal(totalFen):0.00} 元）不得超过付款金额（{MoneyUnit.ToYuanDecimal(paymentAmountFen.Value):0.00} 元）";
    }

    /// <summary>DB 金额列（分，兼容 INTEGER/REAL 亲和性）→ long 分。</summary>
    private static long ToFenFromDb(object? v) =>
        v == null || v is DBNull ? 0 : (long)Math.Round(Convert.ToDouble(v));

    /// <summary>
    /// FP02 后端校验（与前端 validateInvoiceNumber 同规则）：
    /// 无发票代码且发票号码非空时，号码必须为 20 位纯数字；有码旧票与空值放行。
    /// </summary>
    private static bool IsInvoiceNoValid(string? invoiceNo, string? invoiceCode)
    {
        if (!string.IsNullOrWhiteSpace(invoiceCode)) return true;
        if (string.IsNullOrWhiteSpace(invoiceNo)) return true;
        var no = invoiceNo.Trim();
        return no.Length == 20 && no.All(char.IsDigit);
    }

    /// <summary>
    /// FP04 后端校验（与前端 processFile 白名单同口径）：
    /// 仅放行 jpeg/png/webp/pdf/xml/ofd（短码/fileType/mime/带点扩展名均认）；
    /// 空值（无附件）放行，其余走 Common.Fail 约定 400。
    /// PaymentRecord 的 fileType 联合类型在 scope 外，此处只门控 invoices。
    /// </summary>
    private static bool IsFileTypeAllowed(string? fileType)
    {
        if (string.IsNullOrWhiteSpace(fileType)) return true;
        var t = fileType.Trim().ToLowerInvariant();
        return t is "image" or "pdf" or "xml" or "ofd"
            or "jpg" or "jpeg" or "png" or "webp"
            or ".jpg" or ".jpeg" or ".png" or ".webp" or ".pdf" or ".xml" or ".ofd"
            or "image/jpeg" or "image/png" or "image/webp" or "application/pdf"
            or "text/xml" or "application/xml" or "application/ofd" or "application/x-ofd";
    }

    /// <summary>
    /// FP06 票种判定：仅明确 electronic_* 视为数电票；空 kind 放行（保历史数据兼容）。
    /// </summary>
    private static bool IsElectronicKind(string? kind)
    {
        if (string.IsNullOrWhiteSpace(kind)) return false;
        var k = kind.Trim();
        return k.Equals("electronic_regular", StringComparison.OrdinalIgnoreCase)
            || k.Equals("electronic_special", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// P0-a' 阶段 1：发票介质两值（electronic=电子 / paper=纸质）。
    /// </summary>
    private static readonly HashSet<string> InvoiceMediums = new(StringComparer.Ordinal)
    {
        "electronic", "paper"
    };

    /// <summary>
    /// P0-a' 阶段 1：发票票种细分类八值（对齐金蝶 FINVOICETYPE 口径）：
    /// special=专票 regular=普票 passenger_transport=旅客运输 toll=过路费
    /// train=火车票 plane=飞机票 quota=定额发票 roll=卷式发票。
    /// </summary>
    private static readonly HashSet<string> InvoiceCategories = new(StringComparer.Ordinal)
    {
        "special", "regular", "passenger_transport", "toll",
        "train", "plane", "quota", "roll"
    };

    private static string? NormalizeInvoiceMedium(string? v) =>
        string.IsNullOrWhiteSpace(v) ? null : v.Trim().ToLowerInvariant();

    private static string? NormalizeInvoiceCategory(string? v) =>
        string.IsNullOrWhiteSpace(v) ? null : v.Trim().ToLowerInvariant();

    private static bool IsInvoiceMediumValid(string? v) => v == null || InvoiceMediums.Contains(v);

    private static bool IsInvoiceCategoryValid(string? v) => v == null || InvoiceCategories.Contains(v);

    /// <summary>FP06 介质判定：仅 electronic 视为数电票；空介质放行（回落 legacy kind）。</summary>
    private static bool IsElectronicMedium(string? medium) =>
        !string.IsNullOrWhiteSpace(medium)
        && medium.Trim().Equals("electronic", StringComparison.OrdinalIgnoreCase);

    /// <summary>由 legacy kind 反推介质：electronic_* / paper_*；无法识别返回 null。</summary>
    private static string? MediumFromKind(string? kind)
    {
        if (string.IsNullOrWhiteSpace(kind)) return null;
        var k = kind.Trim();
        if (k.StartsWith("electronic_", StringComparison.OrdinalIgnoreCase)) return "electronic";
        if (k.StartsWith("paper_", StringComparison.OrdinalIgnoreCase)) return "paper";
        return null;
    }

    /// <summary>由 legacy kind 反推票种：*_special / *_regular；其他返回 null。</summary>
    private static string? CategoryFromKind(string? kind)
    {
        if (string.IsNullOrWhiteSpace(kind)) return null;
        var k = kind.Trim();
        if (k.EndsWith("_special", StringComparison.OrdinalIgnoreCase)) return "special";
        if (k.EndsWith("_regular", StringComparison.OrdinalIgnoreCase)) return "regular";
        return null;
    }

    /// <summary>
    /// 由介质+票种派生 legacy kind：仅 special/regular 可折叠为 {medium}_{category}；
    /// 旅客运输/过路费/火车/飞机/定额/卷票等保留两维语义，kind 为 NULL。
    /// </summary>
    private static string? KindFromPair(string? medium, string? category) =>
        medium != null && (category == "special" || category == "regular")
            ? $"{medium}_{category}"
            : null;

    /// <summary>
    /// P0-a' 阶段 1：kind 与两维（medium/category）服务端单点派生。
    /// - 传 medium 或 category（新模型）：两维优先，忽略传入 kind，缺失侧从既有值/既有 kind
    ///   回填后由两维派生 kind（避免 kind 与两维自相矛盾）；
    /// - 只传 kind（旧客户端）：kind 原样保留，两维从 kind 反推（显式传值优先）；
    /// - 三者都未传：POST 全 NULL，PUT 保留库内原值（不覆盖已有语义）。
    /// </summary>
    private static (string? Kind, string? Medium, string? Category) ResolveInvoiceKindFields(
        string? kind, string? medium, string? category,
        string? existingKind, string? existingMedium, string? existingCategory)
    {
        var k = string.IsNullOrWhiteSpace(kind) ? null : kind.Trim();
        var m = NormalizeInvoiceMedium(medium);
        var c = NormalizeInvoiceCategory(category);

        // 未传任何两维：只传 kind 走旧客户端反推；三者都未传则保持既有（PUT）/ NULL（POST）
        if (m == null && c == null)
        {
            if (k == null)
                return (existingKind, existingMedium, existingCategory);
            return (k, MediumFromKind(k) ?? existingMedium, CategoryFromKind(k) ?? existingCategory);
        }

        // 新模型两维优先：忽略传入 kind，缺失侧回填后由两维派生 kind
        m ??= existingMedium ?? MediumFromKind(existingKind);
        c ??= existingCategory ?? CategoryFromKind(existingKind);
        return (KindFromPair(m, c), m, c);
    }

    /// <summary>
    /// FP08 不得抵扣原因（Wave 1B-4，仿 IsInvoiceNoValid 模式）：
    /// 可空枚举六值（simple_taxation/exempt/abnormal_loss/
    /// welfare_personal/catering_entertainment/other），NULL/空=可抵扣放行；
    /// 其余值由调用方走 Common.Fail 约定 400。
    /// 口径：docs/finance-knowledge/invoice/数电票与增值税规则.md 六项。
    /// </summary>
    private static readonly HashSet<string> NonDeductibleReasons = new(StringComparer.Ordinal)
    {
        "simple_taxation", "exempt", "abnormal_loss",
        "welfare_personal", "catering_entertainment", "other"
    };

    private static string? NormalizeNonDeductibleReason(string? v) =>
        string.IsNullOrWhiteSpace(v) ? null : v.Trim();

    /// <summary>
    /// P0-b：票向归一（空/空白 → null；否则 Trim）。POST/PUT 的抵扣校验与落库必须
    /// 共用同一个归一值；PUT 空值由调用方回落到库内 type（不得写 NULL）。
    /// </summary>
    private static string? NormalizeInvoiceType(string? v) =>
        string.IsNullOrWhiteSpace(v) ? null : v.Trim();

    /// <summary>
    /// T3：税收分类编码归一（空/空白 → null；否则 Trim）。
    /// 与 InvoiceMedium 等同模式：校验与落库必须共用同一归一值。
    /// </summary>
    private static string? NormalizeTaxCode(string? v) =>
        string.IsNullOrWhiteSpace(v) ? null : v.Trim();

    /// <summary>
    /// T3：优惠政策标识归一（空/空白 → null；否则 Trim）。
    /// </summary>
    private static string? NormalizeTaxPolicy(string? v) =>
        string.IsNullOrWhiteSpace(v) ? null : v.Trim();

    /// <summary>
    /// T3：税收分类编码校验（金蝶 FTAXCODE 口径）：
    /// 空放行；非空须长度 ≤32 且仅 [0-9A-Za-z]（编码为纯数字/字母，不含分隔符与空格）。
    /// </summary>
    private static bool IsTaxCodeValid(string? v) =>
        v == null || (v.Length <= 32 && v.All(c => (c >= '0' && c <= '9') || (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z')));

    /// <summary>
    /// T3：优惠政策标识校验（金蝶 FTAXPOLICY 口径）：
    /// 空放行；非空须长度 ≤64 且不含控制字符（政策文本可含中文/空格/标点）。
    /// </summary>
    private static bool IsTaxPolicyValid(string? v) =>
        v == null || (v.Length <= 64 && !v.Any(char.IsControl));

    private static bool IsNonDeductibleReasonValid(string? v) =>
        v == null || NonDeductibleReasons.Contains(v);

    /// <summary>
    /// P0-b：进项抵扣四字段归一 + 校验（发票票向由调用方传入「归一后的持久化 type」，
    /// POST 为 dto.Type 归一值，PUT 为 dto.Type 归一值或库内 type 回落值）。
    /// - isDeducted 归一：仅 true 视为已抵扣；false/缺省 → 三字段清空（date/period NULL、tax 0）；
    /// - 仅 type='invoice_in' 允许登记抵扣（开票/未知票向 → 400）；
    /// - 已抵扣时所属期必填且 YYYY-MM；抵扣日期可空，非空须 YYYY-MM-DD；
    /// - 可抵扣税额（元→分）不得为负。
    /// 返回 Error 非 null 表示 400 提示；否则为落库值（分制）。
    /// </summary>
    private static (string? Error, bool IsDeducted, string? DeductDate, string? DeductPeriod, long DeductibleTaxFen) ResolveInvoiceDeduction(
        bool? isDeductedRaw, string? deductDate, string? deductPeriod, double? deductibleTax, string? invoiceType)
    {
        if (deductibleTax.HasValue && deductibleTax.Value < 0)
            return ("可抵扣税额不能为负数", false, null, null, 0);

        var isDeducted = isDeductedRaw == true;
        // 取消抵扣/未登记：三字段清空（不保留历史登记值）
        if (!isDeducted) return (null, false, null, null, 0);

        if (!string.Equals((invoiceType ?? "").Trim(), "invoice_in", StringComparison.Ordinal))
            return ("仅进项发票可登记抵扣", false, null, null, 0);

        var period = string.IsNullOrWhiteSpace(deductPeriod) ? null : deductPeriod.Trim();
        if (period == null || !DeductPeriodPattern.IsMatch(period))
            return ("已抵扣发票的税款所属期格式应为 YYYY-MM", false, null, null, 0);

        var date = string.IsNullOrWhiteSpace(deductDate) ? null : deductDate.Trim();
        if (date != null && !DeductDatePattern.IsMatch(date))
            return ("抵扣日期格式应为 YYYY-MM-DD", false, null, null, 0);

        var fen = MoneyUnit.ToFen(deductibleTax ?? 0);
        return (null, true, date, period, fen);
    }

    private static readonly System.Text.RegularExpressions.Regex DeductPeriodPattern =
        new(@"^\d{4}-(0[1-9]|1[0-2])$");

    private static readonly System.Text.RegularExpressions.Regex DeductDatePattern =
        new(@"^\d{4}-\d{2}-\d{2}$");

    /// <summary>
    /// FP06 红冲/作废门控（Wave 1B-1，仿 IsInvoiceNoValid 模式）：
    /// (a) status==red_flushed 时 original_invoice_id 必须指向存在的、且自身非
    /// red_flushed/cancelled 的发票（软删视为不存在），否则返回中文错误；
    /// (b) status==cancelled 且 medium==electronic（或 legacy kind 为 electronic_*）时拒绝；
    /// 空 medium/kind 放行。
    /// 返回 null 表示通过，否则为走 Common.Fail 约定的中文提示。
    /// </summary>
    private static async Task<string?> ValidateInvoiceFp06Async(IDbConnection db, string? status, string? kind, long? originalInvoiceId, string? medium = null)
    {
        if (string.IsNullOrWhiteSpace(status)) return null;
        var s = status.Trim();
        if (s.Equals("cancelled", StringComparison.OrdinalIgnoreCase))
        {
            // P0-a' 阶段 1：介质优先（electronic=数电票），legacy kind 兜底
            if (IsElectronicMedium(medium) || IsElectronicKind(kind))
                return "数电票不能作废，请使用红冲方式冲销";
            return null;
        }
        if (!s.Equals("red_flushed", StringComparison.OrdinalIgnoreCase)) return null;
        if (!originalInvoiceId.HasValue)
            return "红冲必须关联原蓝票，请选择要冲销的蓝字发票";
        var orig = await db.QueryFirstOrDefaultAsync(
            "SELECT [status] FROM [invoices] WHERE [id]=@Id AND [deleted_at] IS NULL",
            new { Id = originalInvoiceId.Value });
        if (orig == null)
            return "关联的原发票不存在，请重新选择原蓝票";
        var origStatus = (orig as IDictionary<string, object>)?.TryGetValue("status", out var v) == true ? v as string : null;
        origStatus ??= (orig as dynamic)?.status as string;
        if (string.Equals(origStatus?.Trim(), "red_flushed", StringComparison.OrdinalIgnoreCase)
            || string.Equals(origStatus?.Trim(), "cancelled", StringComparison.OrdinalIgnoreCase))
            return "关联的原发票已红冲或已作废，不能重复红冲";
        return null;
    }
}


