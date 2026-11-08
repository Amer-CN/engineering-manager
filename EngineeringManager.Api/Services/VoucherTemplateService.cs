using System.Text.Json;

namespace EngineeringManager.Api.Services;

/// <summary>
/// 凭证模板最小实现（T5a）的纯函数层。
///
/// 口径来源：金蝶 T_BAS_VCHTEMPLATE / TEMPLATEENTRY / AcctEntry 与取数表达式
/// （lane-finance 报告）；@AutoCal 差额倒挤、dc=1 借 / -1 贷、科目按 priority
/// 首个命中（lane-version-diff 确认三版本一致）。
///
/// 本类只做计算，不碰数据库、不写库；金额一律 long 分，避免浮点误差。
/// </summary>
public static class VoucherTemplateService
{
    public sealed class VoucherContext
    {
        public long AmountFen { get; init; }
        public long TaxFen { get; init; }
        public long PriceFen { get; init; }
        public string InvoiceName { get; init; } = "";
        public string InvoiceNo { get; init; } = "";
        public string InvoiceType { get; init; } = "";
        public string InvoiceCategory { get; init; } = "";
    }

    /// <summary>模板分录行（Dapper 映射用它，需可写属性而非位置 record）。</summary>
    public sealed class TemplateEntryRow
    {
        public long Id { get; set; }
        public long TemplateId { get; set; }
        public int LineNo { get; set; }
        public int Dc { get; set; }
        public string? SummaryTemplate { get; set; }
        public string AmountExpr { get; set; } = "";
        public string? FilterExpr { get; set; }
    }

    /// <summary>科目映射行（Dapper 映射用它，需可写属性）。</summary>
    public sealed class AccountMapRow
    {
        public long Id { get; set; }
        public long EntryId { get; set; }
        public string AccountCode { get; set; } = "";
        public string AccountName { get; set; } = "";
        public int Priority { get; set; }
        public string? FilterExpr { get; set; }
    }

    public sealed record PreviewLine(
        int LineNo, int Dc, string AccountCode, string AccountName, string Summary, long AmountFen);

    /// <summary>
    /// 解析金额表达式为分。@AutoCal 是「由调用方回填差额」的已知占位符，
    /// 这里返回 0；BuildPreview 会跳过它并在最后统一倒挤。
    /// </summary>
    public static long EvalAmountFen(string expr, VoucherContext ctx)
    {
        var e = (expr ?? "").Trim();
        if (e == "@AutoCal") return 0;
        return e switch
        {
            "{invoice.amount}" => ctx.AmountFen,
            "{invoice.taxAmount}" => ctx.TaxFen,
            "{invoice.priceAmount}" => ctx.PriceFen,
            _ => throw new ArgumentException($"未知金额表达式：{expr}（仅支持 {{invoice.amount}} / {{invoice.taxAmount}} / {{invoice.priceAmount}} / @AutoCal）")
        };
    }

    /// <summary>金额表达式 → 元（展示口径）；内部计算仍走 EvalAmountFen 的分口径。</summary>
    public static decimal EvalExpr(string expr, VoucherContext ctx) =>
        MoneyUnit.ToYuanDecimal(EvalAmountFen(expr, ctx));

    /// <summary>替换摘要占位符；未知占位符原样保留（摘要不影响金额）。</summary>
    public static string EvalSummary(string? template, VoucherContext ctx)
    {
        var s = template ?? "";
        return s.Replace("{invoice.name}", ctx.InvoiceName)
                .Replace("{invoice.invoiceNo}", ctx.InvoiceNo);
    }

    /// <summary>过滤条件：空 = 命中；非法 JSON / 未知字段 / 未知操作符 = 抛（fail-closed）。</summary>
    public static bool MatchFilter(string? filterExpr, VoucherContext ctx)
    {
        if (string.IsNullOrWhiteSpace(filterExpr)) return true;
        JsonDocument doc;
        try
        {
            doc = JsonDocument.Parse(filterExpr);
        }
        catch (JsonException)
        {
            throw new ArgumentException($"过滤条件不是合法 JSON：{filterExpr}");
        }
        using (doc)
        {
            var root = doc.RootElement;
            if (root.ValueKind != JsonValueKind.Object
                || !root.TryGetProperty("field", out var fEl)
                || fEl.ValueKind != JsonValueKind.String
                || !root.TryGetProperty("op", out var opEl)
                || opEl.ValueKind != JsonValueKind.String)
                throw new ArgumentException($"过滤条件缺少 field/op：{filterExpr}");

            var field = fEl.GetString() ?? "";
            var actual = field switch
            {
                "invoice.invoiceCategory" => ctx.InvoiceCategory,
                "invoice.invoiceType" or "invoice.type" => ctx.InvoiceType,
                "invoice.invoiceNo" => ctx.InvoiceNo,
                "invoice.name" => ctx.InvoiceName,
                _ => throw new ArgumentException($"未知过滤字段：{field}")
            };
            var op = opEl.GetString() ?? "";
            switch (op)
            {
                case "eq":
                case "ne":
                    if (!root.TryGetProperty("value", out var vEl) || vEl.ValueKind != JsonValueKind.String)
                        throw new ArgumentException($"过滤条件 {op} 需要字符串 value：{filterExpr}");
                    return op == "eq" ? actual == vEl.GetString() : actual != vEl.GetString();
                case "in":
                    if (!root.TryGetProperty("value", out var arr) || arr.ValueKind != JsonValueKind.Array)
                        throw new ArgumentException($"过滤条件 in 需要数组 value：{filterExpr}");
                    foreach (var item in arr.EnumerateArray())
                        if (item.ValueKind == JsonValueKind.String && item.GetString() == actual) return true;
                    return false;
                default:
                    throw new ArgumentException($"未知过滤操作符：{op}");
            }
        }
    }

    /// <summary>按 priority 升序、id 升序取首个命中科目；无命中返回 null。</summary>
    public static AccountMapRow? PickAccount(IEnumerable<AccountMapRow> maps, VoucherContext ctx) =>
        maps.OrderBy(m => m.Priority).ThenBy(m => m.Id)
            .FirstOrDefault(m => MatchFilter(m.FilterExpr, ctx));

    /// <summary>
    /// 生成借贷平衡的预览行（分）。任何异常都抛 ArgumentException，由端点转 400。
    /// templateCode 只用于错误定位（「模板 X 第 N 行：…」），不参与计算。
    /// </summary>
    public static List<PreviewLine> BuildPreview(
        IEnumerable<TemplateEntryRow> entries,
        ILookup<long, AccountMapRow> mapsByEntry,
        VoucherContext ctx,
        string templateCode = "")
    {
        string Loc(int lineNo, string message) =>
            string.IsNullOrWhiteSpace(templateCode)
                ? $"第 {lineNo} 行：{message}"
                : $"模板 {templateCode} 第 {lineNo} 行：{message}";
        string Prefix(string message) =>
            string.IsNullOrWhiteSpace(templateCode) ? message : $"模板 {templateCode}：{message}";

        var rows = entries.OrderBy(e => e.LineNo).ToList();
        if (rows.Count == 0) throw new ArgumentException(Prefix("模板没有任何分录行"));

        long debit = 0, credit = 0;
        long? autoEntryId = null;
        var firstAutoLineNo = 0;
        var lines = new List<PreviewLine>();

        foreach (var e in rows)
        {
            if (e.Dc != 1 && e.Dc != -1)
                throw new ArgumentException(Loc(e.LineNo, $"借贷方向非法：{e.Dc}（只允许 1/-1）"));

            AccountMapRow? account;
            try
            {
                account = PickAccount(mapsByEntry[e.Id], ctx);
            }
            catch (ArgumentException ex)
            {
                // 过滤条件非法/未知字段等在这里补上模板与行号，保证 400 可定位
                throw new ArgumentException(Loc(e.LineNo, ex.Message), ex);
            }
            if (account == null)
                throw new ArgumentException(Loc(e.LineNo, "科目无命中（请检查科目规则的 priority/filter）"));

            if (string.Equals(e.AmountExpr.Trim(), "@AutoCal", StringComparison.Ordinal))
            {
                if (autoEntryId != null)
                    throw new ArgumentException(Prefix(
                        $"每张模板最多允许一行 @AutoCal（第 {firstAutoLineNo} 行与第 {e.LineNo} 行）"));
                autoEntryId = e.Id;
                firstAutoLineNo = e.LineNo;
                lines.Add(new PreviewLine(e.LineNo, e.Dc, account.AccountCode, account.AccountName,
                    EvalSummary(e.SummaryTemplate, ctx), 0)); // 金额待倒挤
                continue;
            }

            long amount;
            try
            {
                amount = EvalAmountFen(e.AmountExpr, ctx);
            }
            catch (ArgumentException ex)
            {
                throw new ArgumentException(Loc(e.LineNo, ex.Message), ex);
            }
            if (amount < 0) throw new ArgumentException(Loc(e.LineNo, $"金额为负：{amount} 分"));
            if (e.Dc == 1) debit += amount; else credit += amount;
            lines.Add(new PreviewLine(e.LineNo, e.Dc, account.AccountCode, account.AccountName,
                EvalSummary(e.SummaryTemplate, ctx), amount));
        }

        if (autoEntryId != null)
        {
            var autoLineNo = rows.First(r => r.Id == autoEntryId).LineNo;
            var idx = lines.FindIndex(l => l.LineNo == autoLineNo);
            var autoLine = lines[idx];
            // 让 借=贷：dc=1 时 amount = credit - debit；dc=-1 时 amount = debit - credit
            var autoAmount = autoLine.Dc == 1 ? credit - debit : debit - credit;
            if (autoAmount < 0)
                throw new ArgumentException(Loc(autoLine.LineNo,
                    $"@AutoCal 倒挤金额为负（借 {MoneyUnit.ToYuanDecimal(debit):0.00} / 贷 {MoneyUnit.ToYuanDecimal(credit):0.00}），请检查模板金额表达式"));
            lines[idx] = autoLine with { AmountFen = autoAmount };
            if (autoLine.Dc == 1) debit += autoAmount; else credit += autoAmount;
        }

        if (debit != credit)
            throw new ArgumentException(Prefix(
                $"凭证不平衡：借 {MoneyUnit.ToYuanDecimal(debit):0.00} 元，贷 {MoneyUnit.ToYuanDecimal(credit):0.00} 元"));

        return lines;
    }
}
