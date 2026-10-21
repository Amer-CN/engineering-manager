using System.Data;
using System.Text.Json;
using Dapper;
using EngineeringManager.Api.Security;
using EngineeringManager.Api.Services;

namespace EngineeringManager.Api;

/// <summary>
/// 凭证模板与凭证预览端点（T5a）。
///
/// 只读 + 预览：不建凭证表、不生成凭证号、不过账；模板来自 066 迁移的
/// [voucher_templates] / [voucher_template_entries] / [voucher_account_maps]。
/// 金额：库内发票为 INTEGER 分，预览返回元（2 位）；平衡校验在分上做。
/// </summary>
public static class VoucherEndpoints
{
    public static void RegisterVoucherEndpoints(this WebApplication app)
    {
        // 模板列表（只读，登录即可）
        app.MapGet("/api/voucher-templates", async (HttpContext ctx, IDbConnection db) =>
        {
            _ = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var templates = (await db.QueryAsync(
                @"SELECT [id],[code],[name],[business_type] AS businessType,[description],[enabled]
                  FROM [voucher_templates] WHERE [enabled]=1 ORDER BY [code]")).ToList();
            var result = new List<object>();
            foreach (var t in templates)
            {
                long templateId = Convert.ToInt64(t.id);
                var entries = (await db.QueryAsync(
                    @"SELECT [id],[template_id] AS templateId,[line_no] AS lineNo,[dc] AS dc,
                             [summary_template] AS summaryTemplate,[amount_expr] AS amountExpr,[filter_expr] AS filterExpr
                      FROM [voucher_template_entries] WHERE [template_id]=@Id ORDER BY [line_no]",
                    new { Id = templateId })).ToList();
                var entryList = new List<object>();
                foreach (var e in entries)
                {
                    long entryId = Convert.ToInt64(e.id);
                    var maps = (await db.QueryAsync(
                        @"SELECT [id],[account_code] AS accountCode,[account_name] AS accountName,
                                 [priority],[filter_expr] AS filterExpr
                          FROM [voucher_account_maps] WHERE [entry_id]=@Id ORDER BY [priority],[id]",
                        new { Id = entryId })).ToList();
                    entryList.Add(new
                    {
                        id = entryId,
                        lineNo = Convert.ToInt32(e.lineNo),
                        dc = Convert.ToInt32(e.dc),
                        summaryTemplate = e.summaryTemplate as string,
                        amountExpr = e.amountExpr as string,
                        filterExpr = e.filterExpr as string,
                        accountMaps = maps.Select(m => new
                        {
                            id = Convert.ToInt64(m.id),
                            accountCode = m.accountCode as string,
                            accountName = m.accountName as string,
                            priority = Convert.ToInt32(m.priority),
                            filterExpr = m.filterExpr as string
                        })
                    });
                }
                result.Add(new
                {
                    id = templateId,
                    code = t.code as string,
                    name = t.name as string,
                    businessType = t.businessType as string,
                    description = t.description as string,
                    entries = entryList
                });
            }
            return Common.Ok(result);
        });

        // 凭证预览（纯计算，不落库）。POST 仅用于承载 invoiceId；
        // 门禁 5 按 HTTP 动词要求写端点有权限检查，这里挂读权限 invoices:read。
        app.MapPost("/api/voucher-templates/{code}/generate-preview", async (HttpContext ctx, string code, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            if (!CurrentUser.HasPermission(ctx, db, "invoices:read")) return Results.Forbid();

            using var reader = new StreamReader(ctx.Request.Body);
            var bodyText = await reader.ReadToEndAsync();
            JsonElement body;
            try
            {
                body = JsonSerializer.Deserialize<JsonElement>(bodyText);
            }
            catch (JsonException)
            {
                return Common.Fail("请求体不是合法 JSON", 400);
            }
            if (body.ValueKind != JsonValueKind.Object)
                return Common.Fail("请求体必须是 JSON 对象", 400);
            if (!body.TryGetProperty("invoiceId", out var idEl) || idEl.ValueKind != JsonValueKind.Number
                || !idEl.TryGetInt64(out var invoiceId) || invoiceId <= 0)
                return Common.Fail("invoiceId 必须为正整数", 400);

            var template = await db.QueryFirstOrDefaultAsync(
                @"SELECT [id],[code],[name],[business_type] AS businessType
                  FROM [voucher_templates] WHERE [code]=@Code AND [enabled]=1",
                new { Code = code });
            if (template == null) return Common.NotFound($"凭证模板 {code} 不存在或已停用");

            // 与 GET /api/invoices 同口径的可见性（created_by / 管理员 / 项目授权），防越权读
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var invoice = await db.QueryFirstOrDefaultAsync(
                @"SELECT i.[id],i.[type],i.[name],i.[invoice_no] AS invoiceNo,
                         i.[amount],i.[tax_amount] AS taxAmount,i.[price_amount] AS priceAmount,
                         i.[invoice_category] AS invoiceCategory
                  FROM [invoices] i
                  WHERE i.[id]=@Id AND i.[deleted_at] IS NULL
                    AND (i.[created_by]=@Uid OR @IsAdmin=1
                         OR EXISTS(SELECT 1 FROM project_authorizations WHERE project_id=i.[project_id] AND user_id=@Uid))",
                new { Id = invoiceId, Uid = uid, IsAdmin = isAdmin });
            if (invoice == null) return Common.NotFound("发票不存在");

            var businessType = template.businessType as string ?? "";
            var invoiceType = invoice.type as string ?? "";
            if (!string.Equals(businessType, invoiceType, StringComparison.OrdinalIgnoreCase))
                return Common.Fail($"模板 {code} 适用于 {businessType}，与发票类型 {invoiceType} 不匹配", 400);

            long templateId = Convert.ToInt64(template.id);
            var entryRows = (await db.QueryAsync<VoucherTemplateService.TemplateEntryRow>(
                @"SELECT [id],[template_id] AS TemplateId,[line_no] AS LineNo,[dc] AS Dc,
                         [summary_template] AS SummaryTemplate,[amount_expr] AS AmountExpr,[filter_expr] AS FilterExpr
                  FROM [voucher_template_entries] WHERE [template_id]=@Id ORDER BY [line_no]",
                new { Id = templateId })).ToList();
            var mapRows = (await db.QueryAsync<VoucherTemplateService.AccountMapRow>(
                @"SELECT m.[id],m.[entry_id] AS EntryId,m.[account_code] AS AccountCode,m.[account_name] AS AccountName,
                         m.[priority] AS Priority,m.[filter_expr] AS FilterExpr
                  FROM [voucher_account_maps] m
                  JOIN [voucher_template_entries] e ON e.[id]=m.[entry_id]
                  WHERE e.[template_id]=@Id",
                new { Id = templateId })).ToList();

            var vctx = new VoucherTemplateService.VoucherContext
            {
                AmountFen = ToFen(invoice.amount),
                TaxFen = ToFen(invoice.taxAmount),
                PriceFen = ToFen(invoice.priceAmount),
                InvoiceName = invoice.name as string ?? "",
                InvoiceNo = invoice.invoiceNo as string ?? "",
                InvoiceType = invoiceType,
                InvoiceCategory = invoice.invoiceCategory as string ?? ""
            };

            try
            {
                var lines = VoucherTemplateService.BuildPreview(entryRows, mapRows.ToLookup(m => m.EntryId), vctx, code);
                var totalDebit = lines.Where(l => l.Dc == 1).Sum(l => l.AmountFen);
                var totalCredit = lines.Where(l => l.Dc == -1).Sum(l => l.AmountFen);
                // 借贷平衡不等于金额正确：凭证总额必须等于发票金额（否则价税不一致时会返回“平衡但错额”的预览）
                if (totalDebit != vctx.AmountFen)
                    return Common.Fail(
                        $"凭证总额 {totalDebit / 100m:0.00} 元与发票金额 {vctx.AmountFen / 100m:0.00} 元不一致，请检查发票价税合计", 400);
                return Common.Ok(new
                {
                    templateCode = code,
                    invoiceId,
                    lines = lines.Select(l => new
                    {
                        lineNo = l.LineNo,
                        dc = l.Dc,
                        accountCode = l.AccountCode,
                        accountName = l.AccountName,
                        summary = l.Summary,
                        amount = l.AmountFen / 100m
                    }),
                    totalDebit = totalDebit / 100m,
                    totalCredit = totalCredit / 100m
                });
            }
            catch (ArgumentException ex)
            {
                Console.Error.WriteLine($"[VoucherPreview] {code} invoice={invoiceId}: {ex.Message}");
                return Common.Fail(Common.Sanitize(ex.Message), 400);
            }
        });
    }

    /// <summary>库内金额列（分，兼容 INTEGER/REAL 亲和性）→ long 分。</summary>
    private static long ToFen(object? v) =>
        v == null || v is DBNull ? 0 : (long)Math.Round(Convert.ToDouble(v));
}
