using System.Data;
using Dapper;
using EngineeringManager.Api.Security;

namespace EngineeringManager.Api;

/// <summary>
/// 发票 + 收付款记录端点
/// </summary>
public static class InvoiceEndpoints
{
    public static void RegisterInvoiceEndpoints(this WebApplication app)
    {
        var now = () => DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

        // ═══════════════════════════════════════════════════════════
        // 发票
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/invoices", (HttpContext ctx, IDbConnection db, long? projectId) =>
        {
            var sql = @"SELECT i.*, p.name as project_name,
                               seller.name as sellerName, buyer.name as buyerName,
                               CASE WHEN i.type='invoice_in' THEN seller.name ELSE buyer.name END as partner_name
                        FROM invoices i
                        LEFT JOIN projects p ON i.project_id=p.id
                        LEFT JOIN partners seller ON i.seller_id=seller.id
                        LEFT JOIN partners buyer ON i.buyer_id=buyer.id";
            if (projectId.HasValue) sql += " WHERE i.project_id=@ProjectId";
            sql += " ORDER BY i.created_at DESC";
            return Common.Ok(db.Query(sql, new { ProjectId = projectId }));
        });

        app.MapPost("/api/invoices", async (HttpContext ctx, InvoiceDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO invoices
                (project_id,seller_id,buyer_id,contract_id,settlement_id,type,invoice_kind,invoice_no,invoice_code,name,
                 amount,price_amount,tax_rate,tax_amount,received_amount,issue_date,status,remarks,file_url,file_type,created_at,updated_at)
                VALUES (@ProjectId,@SellerId,@BuyerId,@ContractId,@SettlementId,@Type,@InvoiceKind,@InvoiceNo,@InvoiceCode,@Name,
                        @Amount,@PriceAmount,@TaxRate,@TaxAmount,@ReceivedAmount,@IssueDate,@Status,@Remarks,@FileUrl,@FileType,@Now,@Now);
                SELECT last_insert_rowid();",
                new { dto.ProjectId, dto.SellerId, dto.BuyerId, dto.ContractId, dto.SettlementId, dto.Type, dto.InvoiceKind, dto.InvoiceNo, dto.InvoiceCode,
                      dto.Name, dto.Amount, dto.PriceAmount, dto.TaxRate, dto.TaxAmount, dto.ReceivedAmount, dto.IssueDate,
                      Status = dto.Status ?? "pending", dto.Remarks, dto.FileUrl, dto.FileType, Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/invoices", async (HttpContext ctx, InvoiceDto dto, IDbConnection db) =>
        {
            var affected = await db.ExecuteAsync(@"UPDATE invoices SET project_id=@ProjectId,seller_id=@SellerId,
                buyer_id=@BuyerId,contract_id=@ContractId,settlement_id=@SettlementId,type=@Type,invoice_kind=@InvoiceKind,
                invoice_no=@InvoiceNo,invoice_code=@InvoiceCode,name=@Name,amount=@Amount,price_amount=@PriceAmount,
                tax_rate=@TaxRate,tax_amount=@TaxAmount,received_amount=@ReceivedAmount,issue_date=@IssueDate,
                status=@Status,remarks=@Remarks,file_url=@FileUrl,file_type=@FileType,updated_at=@Now WHERE id=@Id",
                new { dto.Id, dto.ProjectId, dto.SellerId, dto.BuyerId, dto.ContractId, dto.SettlementId, dto.Type, dto.InvoiceKind, dto.InvoiceNo,
                      dto.InvoiceCode, dto.Name, dto.Amount, dto.PriceAmount, dto.TaxRate, dto.TaxAmount, dto.ReceivedAmount, dto.IssueDate,
                      dto.Status, dto.Remarks, dto.FileUrl, dto.FileType, Now = now() });
            return affected > 0 ? Common.Ok() : Common.NotFound("发票不存在");
        });

        app.MapDelete("/api/invoices/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
            (await db.ExecuteAsync("DELETE FROM invoices WHERE id=@Id", new { Id = id })) > 0 ? Common.Ok() : Common.NotFound("发票不存在"));

        // ═══════════════════════════════════════════════════════════
        // 收付款记录
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/payment-records", (HttpContext ctx, IDbConnection db, string? paymentType, long? projectId) =>
        {
            var sql = @"SELECT pr.*, p.name as project_name, pt.name as partner_name
                        FROM payment_records pr
                        LEFT JOIN projects p ON pr.project_id=p.id
                        LEFT JOIN partners pt ON pr.partner_id=pt.id";
            var conditions = new List<string>();
            if (!string.IsNullOrEmpty(paymentType)) conditions.Add("pr.type=@PaymentType");
            if (projectId.HasValue) conditions.Add("pr.project_id=@ProjectId");
            if (conditions.Count > 0) sql += " WHERE " + string.Join(" AND ", conditions);
            sql += " ORDER BY pr.created_at DESC";
            var records = db.Query(sql, new { PaymentType = paymentType, ProjectId = projectId }).ToList();

            // 解析 invoice_details JSON 并关联发票信息
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
                            var invoice = db.QueryFirstOrDefault("SELECT invoice_no, amount FROM invoices WHERE id=@Id", new { Id = invoiceId });
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
                    Console.Error.WriteLine($"[InvoiceEndpoints/payment-record] 解析失败: {ex.Message}");
                }
                dict["invoice_infos"] = invoiceInfos;
                result.Add(record);
            }
            return Common.Ok(result);
        });

        app.MapPost("/api/payment-records", async (HttpContext ctx, dynamic dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO payment_records
                (type,amount,record_date,project_id,partner_id,contract_id,invoice_details,remarks,file_url,file_type,created_at)
                VALUES (@Type,@Amount,@RecordDate,@ProjectId,@PartnerId,@ContractId,@InvoiceDetails,@Remarks,@FileUrl,@FileType,@Now);
                SELECT last_insert_rowid();",
                new { Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/payment-records", async (HttpContext ctx, dynamic dto, IDbConnection db) =>
        {
            var affected = await db.ExecuteAsync(@"UPDATE payment_records SET type=@Type,amount=@Amount,record_date=@RecordDate,
                project_id=@ProjectId,partner_id=@PartnerId,contract_id=@ContractId,invoice_details=@InvoiceDetails,
                remarks=@Remarks,file_url=@FileUrl,file_type=@FileType WHERE id=@Id",
                new { Now = now() });
            return affected > 0 ? Common.Ok() : Common.NotFound("记录不存在");
        });

        app.MapDelete("/api/payment-records/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
            (await db.ExecuteAsync("DELETE FROM payment_records WHERE id=@Id", new { Id = id })) > 0 ? Common.Ok() : Common.NotFound("记录不存在"));
    }
}


