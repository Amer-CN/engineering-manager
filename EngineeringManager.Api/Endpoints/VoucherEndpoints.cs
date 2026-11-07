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
/// T6a 只落草稿；T6b 增加过账（draft → posted）：过账即终态，不提供反过账/凭证编辑，
/// 过账后凭证行与分录的不可变由 071 触发器兜底。
/// 凭证号 记-YYYYMM-#### 由 [voucher_sequences] 在同一事务内分配（过账不改号）。
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
                // T7c：锁定期间禁止新增凭证
                if (PeriodLockService.IsLocked(db, period, tx))
                {
                    tx.Rollback();
                    return Common.Fail(PeriodLockService.LockedMessage(period), 400);
                }

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

        // 反过账（T7a）：posted → draft，原因必填并落审计；分录保留、随后可编辑/删除。
        app.MapPost("/api/vouchers/{id}/unpost", async (HttpContext ctx, IDbConnection db, long id) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            if (!CurrentUser.HasPermission(ctx, db, "vouchers:approve")) return Results.Forbid();

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
            if (!body.TryGetProperty("reason", out var reasonEl) || reasonEl.ValueKind != JsonValueKind.String)
                return Common.Fail("反过账原因必填", 400);
            var reason = (reasonEl.GetString() ?? "").Trim();
            if (reason.Length == 0) return Common.Fail("反过账原因必填", 400);
            if (reason.Length > 200) return Common.Fail("反过账原因不得超过 200 字", 400);

            using var tx = BeginWriteTransaction(db);
            try
            {
                var voucher = await db.QueryFirstOrDefaultAsync<VoucherPostRow>(
                    @"SELECT [id] AS Id,[voucher_no] AS VoucherNo,[period] AS Period,[status] AS Status,
                             [posted_at] AS PostedAt,[posted_by] AS PostedBy,
                             [created_by] AS CreatedBy,[project_id] AS ProjectId
                      FROM [vouchers] WHERE [id]=@Id", new { Id = id }, tx);
                if (voucher == null)
                {
                    tx.Rollback();
                    return Common.NotFound("凭证不存在");
                }

                // 行级写入门：与过账/删除同口径（本人 / 管理员 / 授权项目）
                if (RowWriteGate.Classify(ctx, db, voucher.CreatedBy, voucher.ProjectId) == RowWriteOutcome.Denied)
                {
                    tx.Rollback();
                    return Results.Forbid();
                }

                if (!string.Equals(voucher.Status, "posted", StringComparison.Ordinal))
                {
                    tx.Rollback();
                    return Common.Fail("仅已过账凭证可反过账", 400);
                }

                // T7c：锁定期间禁止反过账
                if (PeriodLockService.IsLocked(db, voucher.Period, tx))
                {
                    tx.Rollback();
                    return Common.Fail(PeriodLockService.LockedMessage(voucher.Period), 400);
                }

                var affected = await db.ExecuteAsync(
                    @"UPDATE [vouchers] SET [status]='draft',[posted_at]=NULL,[posted_by]=NULL
                      WHERE [id]=@Id AND [status]='posted'", new { Id = id }, tx);
                if (affected == 0)
                {
                    tx.Rollback();
                    return Common.Fail("仅已过账凭证可反过账", 400);
                }

                // 审计：warning 级，记录原因与原过账信息；与状态变更同事务（fail-closed）
                await db.ExecuteAsync(
                    @"INSERT INTO [audit_logs]
                        ([action],[level],[user_id],[user_name],[resource],[resource_id],[details],[ip_address],[created_at])
                      VALUES ('voucher.unpost','warning',@UserId,@UserName,'vouchers',@ResourceId,@Details,@Ip,@CreatedAt)",
                    new
                    {
                        UserId = uid,
                        UserName = uid,
                        ResourceId = id.ToString(),
                        Details = $"voucherNo={voucher.VoucherNo}; period={voucher.Period}; reason={reason}; originalPostedAt={voucher.PostedAt}; originalPostedBy={voucher.PostedBy}",
                        Ip = ctx.Connection.RemoteIpAddress?.ToString() ?? "",
                        CreatedAt = Common.NowString()
                    }, tx);

                tx.Commit();
                return Common.Ok(new { id, voucherNo = voucher.VoucherNo, status = "draft" });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[VoucherUnpost] id={id}: {ex.Message}");
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
                         v.[status] AS status,v.[total_debit_fen] AS totalDebitFen,v.[total_credit_fen] AS totalCreditFen,
                         v.[posted_at] AS postedAt,v.[posted_by] AS postedBy
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
                    postedAt = v.postedAt as string,
                    postedBy = v.postedBy as string,
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

        // 过账（T6b）：draft → posted。过账即终态（不提供反过账）；
        // 分录只读由「无编辑端点 + 071 触发器」双保险。
        app.MapPost("/api/vouchers/{id}/post", async (HttpContext ctx, IDbConnection db, long id) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // 门禁 5：写端点必须有权限检查；过账用独立权限码，不复用 create/delete
            if (!CurrentUser.HasPermission(ctx, db, "vouchers:approve")) return Results.Forbid();

            using var tx = BeginWriteTransaction(db);
            try
            {
                var voucher = await db.QueryFirstOrDefaultAsync<VoucherPostRow>(
                    @"SELECT [id] AS Id,[voucher_no] AS VoucherNo,[period] AS Period,[status] AS Status,
                             [total_debit_fen] AS TotalDebitFen,[total_credit_fen] AS TotalCreditFen,
                             [source_type] AS SourceType,[source_id] AS SourceId,
                             [created_by] AS CreatedBy,[project_id] AS ProjectId
                      FROM [vouchers] WHERE [id]=@Id", new { Id = id }, tx);
                if (voucher == null)
                {
                    tx.Rollback();
                    return Common.NotFound("凭证不存在");
                }

                // 行级写入门：与 DELETE 同口径（本人 / 管理员 / 授权项目），防跨人过账
                if (RowWriteGate.Classify(ctx, db, voucher.CreatedBy, voucher.ProjectId) == RowWriteOutcome.Denied)
                {
                    tx.Rollback();
                    return Results.Forbid();
                }

                if (!string.Equals(voucher.Status, "draft", StringComparison.Ordinal))
                {
                    tx.Rollback();
                    return Common.Fail("仅草稿凭证可过账", 400);
                }

                // T7c：锁定期间禁止过账
                if (PeriodLockService.IsLocked(db, voucher.Period, tx))
                {
                    tx.Rollback();
                    return Common.Fail(PeriodLockService.LockedMessage(voucher.Period), 400);
                }

                // 源发票已软删 → 拒绝过账（与 GET /api/vouchers 的 deleted_at 过滤同口径）
                if (string.Equals(voucher.SourceType, "invoice", StringComparison.Ordinal))
                {
                    var invoiceDeleted = await db.ExecuteScalarAsync<int?>(
                        "SELECT CASE WHEN [deleted_at] IS NULL THEN 0 ELSE 1 END FROM [invoices] WHERE [id]=@Id",
                        new { Id = voucher.SourceId }, tx);
                    if (invoiceDeleted is null || invoiceDeleted == 1)
                    {
                        tx.Rollback();
                        return Common.Fail("源发票已删除，禁止过账", 400);
                    }
                }

                var postedAt = Common.NowString();
                var postResult = VoucherService.Post(
                    db, tx, id, voucher.TotalDebitFen, voucher.TotalCreditFen, uid, postedAt);

                // 审计：与过账同事务，写不进则整体回滚（fail-closed）
                await db.ExecuteAsync(
                    @"INSERT INTO [audit_logs]
                        ([action],[level],[user_id],[user_name],[resource],[resource_id],[details],[ip_address],[created_at])
                      VALUES ('voucher.post','info',@UserId,@UserName,'vouchers',@ResourceId,@Details,@Ip,@CreatedAt)",
                    new
                    {
                        UserId = uid,
                        UserName = uid,
                        ResourceId = id.ToString(),
                        Details = $"voucherNo={voucher.VoucherNo}; period={voucher.Period}; debitFen={postResult.DebitFen}; creditFen={postResult.CreditFen}",
                        Ip = ctx.Connection.RemoteIpAddress?.ToString() ?? "",
                        CreatedAt = postedAt
                    }, tx);

                tx.Commit();
                return Common.Ok(new
                {
                    id,
                    voucherNo = voucher.VoucherNo,
                    status = "posted",
                    postedAt
                });
            }
            catch (InvalidOperationException ex)
            {
                tx.Rollback();
                return Common.Fail(Common.Sanitize(ex.Message), 400);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[VoucherPost] id={id}: {ex.Message}");
                tx.Rollback();
                throw;
            }
        });

        // 凭证期间汇总（只读）：张数 / 草稿 / 已过账 / 借贷合计（元）；与列表同口径可见性。
        app.MapGet("/api/vouchers/summary", async (HttpContext ctx, IDbConnection db, string? period) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            if (!CurrentUser.HasPermission(ctx, db, "vouchers:read")) return Results.Forbid();

            var periodFilter = string.IsNullOrWhiteSpace(period) ? null : period.Trim();
            if (periodFilter != null && (periodFilter.Length != 6 || !periodFilter.All(char.IsDigit)))
                return Common.Fail("period 格式应为 YYYYMM", 400);

            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var row = await db.QuerySingleAsync<VoucherSummaryRow>(
                @"SELECT COUNT(*) AS TotalCount,
                         COALESCE(SUM(CASE WHEN v.[status]='draft' THEN 1 ELSE 0 END),0) AS DraftCount,
                         COALESCE(SUM(CASE WHEN v.[status]='posted' THEN 1 ELSE 0 END),0) AS PostedCount,
                         COALESCE(SUM(v.[total_debit_fen]),0) AS TotalDebitFen,
                         COALESCE(SUM(v.[total_credit_fen]),0) AS TotalCreditFen
                  FROM [vouchers] v
                  JOIN [invoices] i ON i.[id]=v.[source_id] AND v.[source_type]='invoice'
                  WHERE (i.[created_by]=@Uid OR @IsAdmin=1
                         OR EXISTS(SELECT 1 FROM project_authorizations WHERE project_id=i.[project_id] AND user_id=@Uid))
                    AND i.[deleted_at] IS NULL
                    AND (@Period IS NULL OR v.[period]=@Period)",
                new { Uid = uid, IsAdmin = isAdmin, Period = periodFilter });

            var totalDebitFen = row?.TotalDebitFen ?? 0;
            var totalCreditFen = row?.TotalCreditFen ?? 0;
            return Common.Ok(new
            {
                period = periodFilter,
                totalCount = row?.TotalCount ?? 0,
                draftCount = row?.DraftCount ?? 0,
                postedCount = row?.PostedCount ?? 0,
                totalDebit = totalDebitFen / 100m,
                totalCredit = totalCreditFen / 100m,
                balanced = totalDebitFen == totalCreditFen
            });
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
                    "SELECT [id],[status],[created_by] AS createdBy,[period] AS period FROM [vouchers] WHERE [id]=@Id",
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

                // T7c：锁定期间禁止删除草稿（同一期间锁定语义）
                if (PeriodLockService.IsLocked(db, voucher.period as string, tx))
                {
                    tx.Rollback();
                    return Common.Fail(PeriodLockService.LockedMessage(voucher.period as string), 400);
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

    /// <summary>
    /// 写事务统一用 IMMEDIATE（同 InvoiceEndpoints 先例）：SQLite 默认 DEFERRED 先拿读锁、
    /// 写时再升级，会让「读状态 → 校验 → 过账」出现并发窗口（两个请求同时通过 draft 校验）。
    /// </summary>
    private static IDbTransaction BeginWriteTransaction(IDbConnection db) =>
        db is SqliteConnection sqlite ? sqlite.BeginTransaction(deferred: false) : db.BeginTransaction();

    /// <summary>过账端点用的强类型行（避免 Dapper dynamic 传入 VoucherService.Post 造成动态调用）。</summary>
    private sealed class VoucherPostRow
    {
        public long Id { get; set; }
        public string? VoucherNo { get; set; }
        public string? Period { get; set; }
        public string? Status { get; set; }
        public long TotalDebitFen { get; set; }
        public long TotalCreditFen { get; set; }
        public string? SourceType { get; set; }
        public long SourceId { get; set; }
        public string? CreatedBy { get; set; }
        public long? ProjectId { get; set; }
        public string? PostedAt { get; set; }
        public string? PostedBy { get; set; }
    }

    /// <summary>期间汇总行（Dapper 强类型映射，需可写属性）。</summary>
    private sealed class VoucherSummaryRow
    {
        public long TotalCount { get; set; }
        public long DraftCount { get; set; }
        public long PostedCount { get; set; }
        public long TotalDebitFen { get; set; }
        public long TotalCreditFen { get; set; }
    }

    private sealed record LoadedInvoiceTemplate(
        long TemplateId,
        string TemplateCode,
        long InvoiceId,
        long? ProjectId,
        string? IssueDate,
        VoucherTemplateService.VoucherContext Context);
}

