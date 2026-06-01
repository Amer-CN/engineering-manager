using System.Data;
using Dapper;

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

        app.MapGet("/api/invoices", (IDbConnection db, long? projectId) =>
        {
            var sql = @"SELECT i.*, p.name as project_name,
                               CASE WHEN i.type='invoice_in' THEN seller.name ELSE buyer.name END as partner_name
                        FROM invoices i
                        LEFT JOIN projects p ON i.project_id=p.id
                        LEFT JOIN partners seller ON i.seller_id=seller.id
                        LEFT JOIN partners buyer ON i.buyer_id=buyer.id";
            if (projectId.HasValue) sql += " WHERE i.project_id=@ProjectId";
            sql += " ORDER BY i.created_at DESC";
            return Common.Ok(db.Query(sql, new { ProjectId = projectId }));
        });

        app.MapPost("/api/invoices", async (InvoiceDto dto, IDbConnection db) =>
        {
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO invoices
                (project_id,partner_id,type,invoice_kind,invoice_no,invoice_code,name,amount,tax_rate,tax_amount,
                 issue_date,status,remarks,created_at,updated_at)
                VALUES (@ProjectId,@PartnerId,@Type,@InvoiceKind,@InvoiceNo,@InvoiceCode,@Name,@Amount,@TaxRate,
                        @TaxAmount,@IssueDate,@Status,@Remarks,@Now,@Now);
                SELECT last_insert_rowid();",
                new { dto.ProjectId, dto.PartnerId, dto.Type, dto.InvoiceKind, dto.InvoiceNo, dto.InvoiceCode,
                      dto.Name, dto.Amount, dto.TaxRate, dto.TaxAmount, dto.IssueDate,
                      Status = dto.Status ?? "pending", dto.Remarks, Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/invoices", async (InvoiceDto dto, IDbConnection db) =>
        {
            var affected = await db.ExecuteAsync(@"UPDATE invoices SET project_id=@ProjectId,partner_id=@PartnerId,
                type=@Type,invoice_kind=@InvoiceKind,invoice_no=@InvoiceNo,invoice_code=@InvoiceCode,name=@Name,
                amount=@Amount,tax_rate=@TaxRate,tax_amount=@TaxAmount,issue_date=@IssueDate,status=@Status,
                remarks=@Remarks,updated_at=@Now WHERE id=@Id",
                new { dto.Id, dto.ProjectId, dto.PartnerId, dto.Type, dto.InvoiceKind, dto.InvoiceNo,
                      dto.InvoiceCode, dto.Name, dto.Amount, dto.TaxRate, dto.TaxAmount, dto.IssueDate,
                      dto.Status, dto.Remarks, Now = now() });
            return affected > 0 ? Common.Ok() : Common.Fail("发票不存在");
        });

        app.MapDelete("/api/invoices/{id}", async (long id, IDbConnection db) =>
            (await db.ExecuteAsync("DELETE FROM invoices WHERE id=@Id", new { Id = id })) > 0 ? Common.Ok() : Common.Fail("发票不存在"));

        // ═══════════════════════════════════════════════════════════
        // 收付款记录
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/payment-records", (IDbConnection db, string? paymentType, long? projectId) =>
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
            return Common.Ok(db.Query(sql, new { PaymentType = paymentType, ProjectId = projectId }));
        });

        app.MapPost("/api/payment-records", async (dynamic dto, IDbConnection db) =>
        {
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO payment_records
                (project_id,partner_id,type,amount,record_date,method,remarks,created_at,updated_at)
                VALUES (@ProjectId,@PartnerId,@Type,@Amount,@RecordDate,@Method,@Remarks,@Now,@Now);
                SELECT last_insert_rowid();",
                new { Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/payment-records", async (dynamic dto, IDbConnection db) =>
        {
            var affected = await db.ExecuteAsync(@"UPDATE payment_records SET amount=@Amount,record_date=@RecordDate,method=@Method,remarks=@Remarks,updated_at=@Now WHERE id=@Id",
                new { Now = now() });
            return affected > 0 ? Common.Ok() : Common.Fail("记录不存在");
        });

        app.MapDelete("/api/payment-records/{id}", async (long id, IDbConnection db) =>
            (await db.ExecuteAsync("DELETE FROM payment_records WHERE id=@Id", new { Id = id })) > 0 ? Common.Ok() : Common.Fail("记录不存在"));
    }
}
