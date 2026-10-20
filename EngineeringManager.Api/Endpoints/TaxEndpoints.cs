using System.Data;
using System.Globalization;
using System.Text.RegularExpressions;
using Dapper;
using EngineeringManager.Api.Security;

namespace EngineeringManager.Api;

/// <summary>
/// 税率主数据与税率规则端点（P1 / T1）。
///
/// 数据来源：063_TaxRatesAndRules.sql 建的 [tax_rates] / [tax_rules]。
/// 税率数值集合与前端 src/components/features/invoices/constants.ts 的
/// taxRateOptions 一致（0 / 0.01 / 0.03 / 0.06 / 0.09 / 0.13），法律口径 FP07。
///
/// 本文件只读：GET 列表 + GET 解析，两者都不写库，也不提供主数据维护端点
/// （主数据维护由迁移/后续单据承担）。发票仍存自己的税率快照，历史发票不受本端点影响。
/// </summary>
public static class TaxEndpoints
{
    /// <summary>日期入参格式（与发票抵扣日期同口径）。</summary>
    private static readonly Regex DatePattern = new(@"^\d{4}-\d{2}-\d{2}$");

    /// <summary>
    /// 日期合法性：正则只保证「形状」是 YYYY-MM-DD，2026-13-45 / 2026-02-30
    /// 同样通过形状检查。必须再用 TryParseExact 按不变文化严格解析，把这类
    /// 不存在的日历日期挡在 SQL 之前（区间比较是字符串序，脏日期会静默错配）。
    /// </summary>
    private static bool IsValidDate(string value) =>
        DateTime.TryParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture,
            DateTimeStyles.None, out _);

    public static void RegisterTaxEndpoints(this WebApplication app)
    {
        // 全部税率主数据，按 code 排序（下拉数据源）。
        // 不投影 [source_note]：口径注记是库内审计信息，不进前端响应（列本身保留）。
        app.MapGet("/api/tax-rates", (IDbConnection db) =>
            Common.Ok(db.Query(@"SELECT [id], [code], [name], [rate], [category],
                    [effective_from] AS effectiveFrom, [effective_to] AS effectiveTo,
                    [is_default] AS isDefault
                FROM [tax_rates]
                ORDER BY [code]")));

        // 默认税率解析：规则命中 → 默认兜底 → none（不猜值）。
        // 纯读端点：GET + query 参数（date/businessType/partnerTaxType/itemCategory），
        // 不写库、不再要求 settings:update（此前用 POST 只为承载多字段条件，属实现便利，
        // 却因门禁 5 按 HTTP 动词提取写端点而被迫挂权限门 —— 读端点不该有写权限门槛）。
        // 仍受 GlobalAuthMiddleware 强制鉴权（未登录 401，不加白名单）。
        app.MapGet("/api/tax-rates/resolve", (HttpContext ctx, IDbConnection db,
            string? date = null, string? businessType = null,
            string? partnerTaxType = null, string? itemCategory = null) =>
        {
            var resolvedDate = string.IsNullOrWhiteSpace(date)
                ? Common.NowString()[..10]   // 缺省今天，与其它端点同一时间口径（NowString = yyyy-MM-dd HH:mm:ss）
                : date.Trim();
            if (!DatePattern.IsMatch(resolvedDate) || !IsValidDate(resolvedDate))
                return Common.Fail("日期格式应为 YYYY-MM-DD");

            var businessTypeNorm = Normalize(businessType);
            var partnerTaxTypeNorm = Normalize(partnerTaxType);
            var itemCategoryNorm = Normalize(itemCategory);

            // 规则候选：enabled=1，各维度「规则值为空 或 与入参相等」。
            // 排序：非空维度数 desc（越具体越优先）→ priority desc → id desc（同级取最新）。
            // 生效区间列在 tax_rates 上，故 JOIN 取回。
            var candidates = db.Query<TaxRuleCandidate>(@"
                SELECT r.[tax_rate_id] AS TaxRateId,
                       t.[effective_from] AS EffectiveFrom,
                       t.[effective_to] AS EffectiveTo
                FROM [tax_rules] r
                JOIN [tax_rates] t ON t.[id] = r.[tax_rate_id]
                WHERE r.[enabled] = 1
                  AND (r.[business_type] IS NULL    OR r.[business_type]    = @BusinessType)
                  AND (r.[partner_tax_type] IS NULL OR r.[partner_tax_type] = @PartnerTaxType)
                  AND (r.[item_category] IS NULL    OR r.[item_category]    = @ItemCategory)
                ORDER BY (CASE WHEN r.[business_type]    IS NOT NULL THEN 1 ELSE 0 END
                        + CASE WHEN r.[partner_tax_type] IS NOT NULL THEN 1 ELSE 0 END
                        + CASE WHEN r.[item_category]    IS NOT NULL THEN 1 ELSE 0 END) DESC,
                         r.[priority] DESC,
                         r.[id] DESC",
                new { BusinessType = businessTypeNorm, PartnerTaxType = partnerTaxTypeNorm, ItemCategory = itemCategoryNorm });

            // 规则命中：该规则税率按 date 校验生效区间，不中继续下一条
            foreach (var c in candidates)
            {
                if (!InEffectiveRange(resolvedDate, c.EffectiveFrom, c.EffectiveTo)) continue;
                var hit = LoadRate(db, c.TaxRateId);
                if (hit != null) return Common.Ok(ToResolved(hit, "rule"));
            }

            // 规则都不中 → 全局默认（is_default=1 且生效区间命中）
            var fallback = db.QueryFirstOrDefault<TaxRateRow>(@"
                SELECT [id], [code], [name], [rate]
                FROM [tax_rates]
                WHERE [is_default] = 1
                  AND [effective_from] <= @Date
                  AND (@Date <= COALESCE([effective_to], '9999-12-31'))
                ORDER BY [effective_from] DESC, [id] DESC
                LIMIT 1",
                new { Date = resolvedDate });
            if (fallback != null) return Common.Ok(ToResolved(fallback, "default"));

            // 仍无 → 不猜默认值
            return Common.Ok(new { rateId = (long?)null, code = (string?)null, rate = (double?)null, matchedBy = "none" });
        });
    }

    /// <summary>空白维度归一为 NULL（参与「规则值为空 或 与入参相等」判定）。</summary>
    private static string? Normalize(string? v) =>
        string.IsNullOrWhiteSpace(v) ? null : v.Trim();

    /// <summary>生效区间：effective_from &lt;= date &lt;= COALESCE(effective_to,'9999-12-31')。</summary>
    private static bool InEffectiveRange(string date, string? from, string? to)
    {
        var start = string.IsNullOrWhiteSpace(from) ? "0000-01-01" : from.Trim();
        var end = string.IsNullOrWhiteSpace(to) ? "9999-12-31" : to.Trim();
        return string.CompareOrdinal(start, date) <= 0 && string.CompareOrdinal(date, end) <= 0;
    }

    private static TaxRateRow? LoadRate(IDbConnection db, long id) =>
        db.QueryFirstOrDefault<TaxRateRow>(
            "SELECT [id], [code], [name], [rate] FROM [tax_rates] WHERE [id] = @Id",
            new { Id = id });

    private static object ToResolved(TaxRateRow row, string matchedBy) =>
        new { rateId = row.Id, code = row.Code, rate = row.Rate, matchedBy };

    private sealed class TaxRuleCandidate
    {
        public long TaxRateId { get; set; }
        public string? EffectiveFrom { get; set; }
        public string? EffectiveTo { get; set; }
    }

    private sealed class TaxRateRow
    {
        public long Id { get; set; }
        public string Code { get; set; } = "";
        public string Name { get; set; } = "";
        public double Rate { get; set; }
    }
}
