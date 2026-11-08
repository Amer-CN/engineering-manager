using System.Data;
using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using Dapper;
using EngineeringManager.Api.Security;

namespace EngineeringManager.Api;

/// <summary>
/// T7：申报数据准备——按期间导出进项/销项发票汇总（只读，不做申报表计算）。
///
/// 口径：
///   · 期间按 invoices.issue_date 的 YYYY-MM 过滤；
///   · 排除软删与 cancelled / red_flushed；
///   · 库内 price_amount / tax_amount / amount 为分，导出统一转元（2 位）；
///   · 导出文件首行明确标注「非申报表」。
/// </summary>
public static class TaxSummaryEndpoints
{
    private static readonly Regex PeriodPattern = new(@"^\d{4}-(0[1-9]|1[0-2])$", RegexOptions.Compiled);
    private const string NonDeclarationNote = "非申报表：仅作数据准备，不可直接作为纳税申报依据";

    public static void RegisterTaxSummaryEndpoints(this WebApplication app)
    {
        app.MapGet("/api/reports/tax-summary", (HttpContext ctx, IDbConnection db, string? period) =>
        {
            _ = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            if (string.IsNullOrWhiteSpace(period) || !PeriodPattern.IsMatch(period))
                return Common.Fail("period 格式应为 YYYY-MM", 400);

            var rows = LoadRows(db, period);
            var input = SumRows(rows.Where(r => r.Type == "invoice_in"));
            var output = SumRows(rows.Where(r => r.Type == "invoice_out"));
            return Common.Ok(new
            {
                period,
                input,
                output,
                note = NonDeclarationNote
            });
        });

        app.MapGet("/api/reports/tax-summary/export", (HttpContext ctx, IDbConnection db, string? period) =>
        {
            _ = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            if (string.IsNullOrWhiteSpace(period) || !PeriodPattern.IsMatch(period))
                return Common.Fail("period 格式应为 YYYY-MM", 400);

            var rows = LoadRows(db, period);
            var csv = BuildCsv(period, rows);
            ctx.Response.Headers["Content-Disposition"] = $"attachment; filename=\"tax-summary-{period}.csv\"";
            // 前缀 BOM，保证 Excel 识别 UTF-8 中文
            return Results.Text("\uFEFF" + csv, "text/csv; charset=utf-8");
        });
    }

    /// <summary>查询行（Dapper 映射用它，需可写属性而非位置 record）。</summary>
    private sealed class InvoiceRow
    {
        public long Id { get; set; }
        public string Type { get; set; } = "";
        public string? IssueDate { get; set; }
        public string? InvoiceNo { get; set; }
        public string? Name { get; set; }
        public string? SellerName { get; set; }
        public string? BuyerName { get; set; }
        public long PriceFen { get; set; }
        public long TaxFen { get; set; }
        public long TotalFen { get; set; }
        public double? TaxRate { get; set; }
        public string? TaxCode { get; set; }
    }

    private static List<InvoiceRow> LoadRows(IDbConnection db, string period) =>
        db.Query<InvoiceRow>($@"
            SELECT i.[id] AS Id, i.[type] AS Type, i.[issue_date] AS IssueDate, i.[invoice_no] AS InvoiceNo,
                   i.[name] AS Name, s.[name] AS SellerName, b.[name] AS BuyerName,
                   {Fen("i.[price_amount]")} AS PriceFen,
                   {Fen("i.[tax_amount]")} AS TaxFen,
                   {Fen("i.[amount]")} AS TotalFen,
                   i.[tax_rate] AS TaxRate, i.[tax_code] AS TaxCode
            FROM [invoices] i
            LEFT JOIN [partners] s ON s.[id]=i.[seller_id]
            LEFT JOIN [partners] b ON b.[id]=i.[buyer_id]
            WHERE i.[deleted_at] IS NULL
              AND i.[status] NOT IN ('cancelled','red_flushed')
              AND i.[issue_date] LIKE @Prefix
            ORDER BY CASE WHEN i.[type]='invoice_in' THEN 0 ELSE 1 END, i.[issue_date], i.[id]",
            new { Prefix = period + "-%" }).ToList();

    /// <summary>SQLite 金额列可能是 INTEGER 分或 REAL（历史亲和性），统一取整到分。</summary>
    private static string Fen(string column) => $"CAST(ROUND({column}) AS INTEGER)";

    private static object SumRows(IEnumerable<InvoiceRow> rows)
    {
        var list = rows.ToList();
        return new
        {
            count = list.Count,
            priceAmount = list.Sum(r => r.PriceFen) / 100m,
            taxAmount = list.Sum(r => r.TaxFen) / 100m,
            totalAmount = list.Sum(r => r.TotalFen) / 100m
        };
    }

    private static string BuildCsv(string period, List<InvoiceRow> rows)
    {
        var sb = new StringBuilder();
        sb.AppendLine("# " + NonDeclarationNote);
        sb.AppendLine("期间,方向,开票日期,发票号码,发票名称,销方,购方,不含税金额,税额,价税合计,税率,税收分类编码");
        foreach (var r in rows)
        {
            var direction = r.Type == "invoice_in" ? "进项" : "销项";
            sb.AppendLine(string.Join(",",
                Escape(period), Escape(direction), Escape(r.IssueDate), Escape(r.InvoiceNo), Escape(r.Name),
                Escape(r.SellerName), Escape(r.BuyerName),
                Yuan(r.PriceFen), Yuan(r.TaxFen), Yuan(r.TotalFen),
                Escape(FormatRate(r.TaxRate)), Escape(r.TaxCode)));
        }
        foreach (var (direction, type) in new[] { ("进项", "invoice_in"), ("销项", "invoice_out") })
        {
            var subset = rows.Where(r => r.Type == type).ToList();
            sb.AppendLine(string.Join(",",
                Escape(period), Escape("合计-" + direction), "", "", "", "", "",
                Yuan(subset.Sum(r => r.PriceFen)), Yuan(subset.Sum(r => r.TaxFen)),
                Yuan(subset.Sum(r => r.TotalFen)), "", ""));
        }
        return sb.ToString();
    }

    private static string Yuan(long fen) => (fen / 100m).ToString("0.00", CultureInfo.InvariantCulture);

    private static string FormatRate(double? rate) =>
        rate.HasValue ? (rate.Value * 100).ToString("0.##", CultureInfo.InvariantCulture) + "%" : "";

    private static string Escape(string? value)
    {
        var v = value ?? "";
        if (v.Contains(',') || v.Contains('"') || v.Contains('\n') || v.Contains('\r'))
            return "\"" + v.Replace("\"", "\"\"") + "\"";
        return v;
    }
}
