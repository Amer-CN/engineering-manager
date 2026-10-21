using System.Data;
using System.Globalization;
using System.Text.Json;
using Dapper;
using EngineeringManager.Api.Security;
using EngineeringManager.Api.Services;
using Microsoft.Data.Sqlite;

namespace EngineeringManager.Api;

/// <summary>
/// 凭证模板、凭证预览（T5a/T5b）与凭证草稿（T6a）端点。
///
/// T6a 只落草稿：不做过账/反过账/凭证编辑，[vouchers].[status] 恒为 'draft'；
/// 凭证号 记-YYYYMM-#### 由 [voucher_sequences] 在同一事务内分配。
/// 金额：库内一律 long 分，仅在响应时转元（2 位）；借贷平衡校验在分上做。
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
            _ = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
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

            var (loaded, loadError) = await TryLoadInvoiceAndTemplate(db, ctx, code, invoiceId);
            if (loadError != null) return loadError;
            var (entryRows, mapRows) = await LoadTemplateRows(db, loaded!.TemplateId);

            var linesError = TryBuildLines(entryRows, mapRows, loaded.Context, loaded.TemplateCode, out var lines);
            if (linesError != null) return linesError;

            var totalDebit = lines.Where(l => l.Dc == 1).Sum(l => l.AmountFen);
            var totalCredit = lines.Where(l => l.Dc == -1).Sum(l => l.AmountFen);
            return Common.Ok(new
            {
                templateCode = loaded.TemplateCode,
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
        });

        // 从发票生成凭证草稿（T6a）：只落 draft，不过账。
        app.MapPost("/api/vouchers/from-invoice", async (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // 门禁 5：写端点必须有权限检查
            if (!CurrentUser.HasPermission(ctx, db, "vouchers:create")) return Results.Forbid();

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

            string? templateCode = null;
            if (body.TryGetProperty("templateCode", out var codeEl))
            {
                if (codeEl.ValueKind == JsonValueKind.String)
                    templateCode = codeEl.GetString();
                else if (codeEl.ValueKind != JsonValueKind.Null)
                    return Common.Fail("templateCode 必须是字符串", 400);
            }

            var (loaded, loadError) = await TryLoadInvoiceAndTemplate(db, ctx, templateCode, invoiceId);
            if (loadError != null) return loadError;
            var (entryRows, mapRows) = await LoadTemplateRows(db, loaded!.TemplateId);

            var linesError = TryBuildLines(entryRows, mapRows, loaded.Context, loaded.TemplateCode, out var lines);
            if (linesError != null) return linesError;

            var totalDebit = lines.Where(l => l.Dc == 1).Sum(l => l.AmountFen);
            var totalCredit = lines.Where(l => l.Dc == -1).Sum(l => l.AmountFen);
            var (period, voucherDate) = ResolvePeriodAndDate(loaded.IssueDate);

            using var tx = db.BeginTransaction();
            try
            {
                var draft = VoucherService.SaveDraft(
                    db, tx, loaded.InvoiceId, loaded.ProjectId, loaded.TemplateCode,
                    period, voucherDate, lines, uid);
                tx.Commit();
                return Common.Ok(new
                {
                    id = draft.Id,
                    voucherNo = draft.VoucherNo,
                    totalDebit = totalDebit / 100m,
                    totalCredit = totalCredit / 100m
                });
            }
            catch (SqliteException ex) when (ex.SqliteErrorCode == 19
                && ex.Message.Contains("vouchers.source_type", StringComparison.OrdinalIgnoreCase))
            {
                // ux_vouchers_source：同一发票唯一；号段随本事务一起回滚
                Console.Error.WriteLine($"[VoucherDraft] duplicate source: {ex.Message}");
                tx.Rollback();
                return Common.Fail("该发票已生成凭证草稿", 400);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[VoucherDraft] failed: {ex.Message}");
                tx.Rollback();
                throw;
            }
        });

        // 凭证列表（草稿）：按 period 过滤；entries 直接嵌套（本轮不分页）。
        app.MapGet("/api/vouchers", async (HttpContext ctx, IDbConnection db, string? period) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            if (!CurrentUser.HasPermission(ctx, db, "vouchers:read")) return Results.Forbid();

            // 与 GET /api/invoices 同口径的可见性（created_by / 管理员 / 项目授权），防越权读
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var periodFilter = string.IsNullOrWhiteSpace(period) ? null : period.Trim();
            var rows = (await db.QueryAsync(
                @"SELECT v.[id],v.[voucher_no] AS voucherNo,v.[voucher_date] AS voucherDate,v.[period] AS period,
                         v.[source_type] AS sourceType,v.[source_id] AS sourceId,v.[template_code] AS templateCode,
                         v.[status] AS status,v.[total_debit_fen] AS totalDebitFen,v.[total_credit_fen] AS totalCreditFen
                  FROM [vouchers] v
                  JOIN [invoices] i ON i.[id]=v.[source_id] AND v.[source_type]='invoice'
                  WHERE (i.[created_by]=@Uid OR @IsAdmin=1
                         OR EXISTS(SELECT 1 FROM project_authorizations WHERE project_id=i.[project_id] AND user_id=@Uid))
                    AND i.[deleted_at] IS NULL
                    AND (@Period IS NULL OR v.[period]=@Period)
                  ORDER BY v.[id]",
                new { Uid = uid, IsAdmin = isAdmin, Period = periodFilter })).ToList();

            var result = new List<object>();
            foreach (var v in rows)
            {
                long voucherId = Convert.ToInt64(v.id);
                var entries = (await db.QueryAsync(
                    @"SELECT [line_no] AS lineNo,[dc] AS dc,[account_code] AS accountCode,
                             [account_name] AS accountName,[summary] AS summary,[amount_fen] AS amountFen
                      FROM [voucher_entries] WHERE [voucher_id]=@Id ORDER BY [line_no]",
                    new { Id = voucherId })).ToList();
                result.Add(new
                {
                    id = voucherId,
                    voucherNo = v.voucherNo as string,
                    voucherDate = v.voucherDate as string,
                    period = v.period as string,
                    sourceType = v.sourceType as string,
                    sourceId = Convert.ToInt64(v.sourceId),
                    templateCode = v.templateCode as string,
                    status = v.status as string,
                    totalDebit = Convert.ToInt64(v.totalDebitFen) / 100m,
                    totalCredit = Convert.ToInt64(v.totalCreditFen) / 100m,
                    entries = entries.Select(e => new
                    {
                        lineNo = Convert.ToInt32(e.lineNo),
                        dc = Convert.ToInt32(e.dc),
                        accountCode = e.accountCode as string,
                        accountName = e.accountName as string,
                        summary = e.summary as string,
                        amount = Convert.ToInt64(e.amountFen) / 100m
                    })
                });
            }
            return Common.Ok(result);
        });

        // 删除凭证草稿：仅 draft；先删 entries 再删 voucher（同一事务）。
        app.MapDelete("/api/vouchers/{id}", async (HttpContext ctx, IDbConnection db, long id) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // 门禁 5：写端点必须有权限检查
            if (!CurrentUser.HasPermission(ctx, db, "vouchers:delete")) return Results.Forbid();

            using var tx = db.BeginTransaction();
            try
            {
                // 校验与删除同事务，避免「entries 已删、voucher 未删」的 TOCTOU
                var voucher = await db.QueryFirstOrDefaultAsync(
                    "SELECT [id],[status],[created_by] AS createdBy FROM [vouchers] WHERE [id]=@Id",
                    new { Id = id }, tx);
                if (voucher == null)
                {
                    tx.Rollback();
                    return Common.NotFound("凭证不存在");
                }
                if (!CurrentUser.IsAdmin(ctx)
                    && !string.Equals(voucher.createdBy as string, uid, StringComparison.Ordinal))
                {
                    tx.Rollback();
                    return Results.Forbid();
                }
                if (!string.Equals(voucher.status as string, "draft", StringComparison.Ordinal))
                {
                    tx.Rollback();
                    return Common.Fail("仅草稿凭证可删除", 400);
                }

                var affected = await db.ExecuteAsync(
                    "DELETE FROM [vouchers] WHERE [id]=@Id AND [status]='draft'", new { Id = id }, tx);
                if (affected == 0)
                {
                    tx.Rollback();
                    return Common.Fail("仅草稿凭证可删除", 400);
                }
                await db.ExecuteAsync("DELETE FROM [voucher_entries] WHERE [voucher_id]=@Id", new { Id = id }, tx);
                tx.Commit();
                return Common.Ok(new { id });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[VoucherDelete] id={id}: {ex.Message}");
                tx.Rollback();
                throw;
            }
        });
    }

    /// <summary>
    /// 载入发票（与 GET /api/invoices 同口径可见性）与凭证模板，供预览/生成草稿共用。
    /// templateCode 为空时按发票类型映射（invoice_out→INV_REVENUE / invoice_in→INV_COST）。
    /// 失败返回可直接 return 的错误 IResult；成功返回模板身份与计算上下文。
    /// </summary>
    private static async Task<(LoadedInvoiceTemplate? Loaded, IResult? Error)> TryLoadInvoiceAndTemplate(
        IDbConnection db, HttpContext ctx, string? code, long invoiceId, IDbTransaction? tx = null)
    {
        var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
        var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
        var invoice = await db.QueryFirstOrDefaultAsync(
            @"SELECT i.[id],i.[type],i.[name],i.[invoice_no] AS invoiceNo,
                     i.[amount],i.[tax_amount] AS taxAmount,i.[price_amount] AS priceAmount,
                     i.[invoice_category] AS invoiceCategory,i.[project_id] AS projectId,i.[issue_date] AS issueDate
              FROM [invoices] i
              WHERE i.[id]=@Id AND i.[deleted_at] IS NULL
                AND (i.[created_by]=@Uid OR @IsAdmin=1
                     OR EXISTS(SELECT 1 FROM project_authorizations WHERE project_id=i.[project_id] AND user_id=@Uid))",
            new { Id = invoiceId, Uid = uid, IsAdmin = isAdmin }, tx);
        if (invoice == null) return (null, Common.NotFound("发票不存在"));

        var invoiceType = invoice.type as string ?? "";
        var effectiveCode = string.IsNullOrWhiteSpace(code)
            ? invoiceType switch
            {
                "invoice_out" => "INV_REVENUE",
                "invoice_in" => "INV_COST",
                _ => null
            }
            : code.Trim();
        if (effectiveCode == null)
            return (null, Common.Fail($"发票类型 {invoiceType} 暂不支持自动匹配凭证模板", 400));

        var template = await db.QueryFirstOrDefaultAsync(
            @"SELECT [id],[code],[name],[business_type] AS businessType
              FROM [voucher_templates] WHERE [code]=@Code AND [enabled]=1",
            new { Code = effectiveCode }, tx);
        if (template == null) return (null, Common.NotFound($"凭证模板 {effectiveCode} 不存在或已停用"));

        var businessType = template.businessType as string ?? "";
        if (!string.Equals(businessType, invoiceType, StringComparison.OrdinalIgnoreCase))
            return (null, Common.Fail($"模板 {effectiveCode} 适用于 {businessType}，与发票类型 {invoiceType} 不匹配", 400));

        long? projectId = null;
        if (invoice.projectId != null && !(invoice.projectId is DBNull))
            projectId = Convert.ToInt64(invoice.projectId);

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

        return (new LoadedInvoiceTemplate(
            Convert.ToInt64(template.id), effectiveCode, invoiceId, projectId,
            invoice.issueDate as string, vctx), null);
    }

    /// <summary>载入模板分录行与科目映射行（预览/生成草稿共用）。</summary>
    private static async Task<(List<VoucherTemplateService.TemplateEntryRow> Entries,
        List<VoucherTemplateService.AccountMapRow> Maps)> LoadTemplateRows(
        IDbConnection db, long templateId, IDbTransaction? tx = null)
    {
        var entryRows = (await db.QueryAsync<VoucherTemplateService.TemplateEntryRow>(
            @"SELECT [id],[template_id] AS TemplateId,[line_no] AS LineNo,[dc] AS Dc,
                     [summary_template] AS SummaryTemplate,[amount_expr] AS AmountExpr,[filter_expr] AS FilterExpr
              FROM [voucher_template_entries] WHERE [template_id]=@Id ORDER BY [line_no]",
            new { Id = templateId }, tx)).ToList();
        var mapRows = (await db.QueryAsync<VoucherTemplateService.AccountMapRow>(
            @"SELECT m.[id],m.[entry_id] AS EntryId,m.[account_code] AS AccountCode,m.[account_name] AS AccountName,
                     m.[priority] AS Priority,m.[filter_expr] AS FilterExpr
              FROM [voucher_account_maps] m
              JOIN [voucher_template_entries] e ON e.[id]=m.[entry_id]
              WHERE e.[template_id]=@Id",
            new { Id = templateId }, tx)).ToList();
        return (entryRows, mapRows);
    }

    /// <summary>
    /// 复用 T5a 的 VoucherTemplateService.BuildPreview 生成分录并校验：
    /// 借贷平衡（BuildPreview 保证）+ 凭证总额必须等于发票金额。
    /// 失败返回 400；成功把分录（分）写入 lines。
    /// </summary>
    private static IResult? TryBuildLines(
        IEnumerable<VoucherTemplateService.TemplateEntryRow> entryRows,
        IEnumerable<VoucherTemplateService.AccountMapRow> mapRows,
        VoucherTemplateService.VoucherContext vctx,
        string templateCode,
        out List<VoucherTemplateService.PreviewLine> lines)
    {
        try
        {
            lines = VoucherTemplateService.BuildPreview(entryRows, mapRows.ToLookup(m => m.EntryId), vctx, templateCode);
        }
        catch (ArgumentException ex)
        {
            lines = new List<VoucherTemplateService.PreviewLine>();
            Console.Error.WriteLine($"[Voucher] {templateCode}: {ex.Message}");
            return Common.Fail(Common.Sanitize(ex.Message), 400);
        }

        // 借贷平衡不等于金额正确：凭证总额必须等于发票金额（否则价税不一致时会返回“平衡但错额”的结果）
        var totalDebit = lines.Where(l => l.Dc == 1).Sum(l => l.AmountFen);
        if (totalDebit != vctx.AmountFen)
            return Common.Fail(
                $"凭证总额 {totalDebit / 100m:0.00} 元与发票金额 {vctx.AmountFen / 100m:0.00} 元不一致，请检查发票价税合计", 400);
        return null;
    }

    /// <summary>
    /// 发票开票日期 → 凭证期间（YYYYMM）与凭证日期（YYYY-MM-DD）。
    /// 缺失/非法日期用当前月与今天。
    /// </summary>
    private static (string Period, string VoucherDate) ResolvePeriodAndDate(string? issueDate)
    {
        if (!DateTime.TryParse((issueDate ?? "").Trim(), CultureInfo.InvariantCulture,
                DateTimeStyles.None, out var date))
            date = DateTime.Now;
        return (date.ToString("yyyyMM"), date.ToString("yyyy-MM-dd"));
    }

    /// <summary>库内金额列（分，兼容 INTEGER/REAL 亲和性）→ long 分。</summary>
    private static long ToFen(object? v) =>
        v == null || v is DBNull ? 0 : (long)Math.Round(Convert.ToDouble(v));

    private sealed record LoadedInvoiceTemplate(
        long TemplateId,
        string TemplateCode,
        long InvoiceId,
        long? ProjectId,
        string? IssueDate,
        VoucherTemplateService.VoucherContext Context);
}

