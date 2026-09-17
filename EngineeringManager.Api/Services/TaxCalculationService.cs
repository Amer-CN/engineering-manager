namespace EngineeringManager.Api.Services;

// ============================================================
// 个税引擎 Wave-T1 纯函数（无HTTP依赖，无DB依赖）
// 口径（单位：分 INTEGER；费率：小数）：
//   · GS01《中华人民共和国个人所得税法》（2018年修正）第三条、第六条：
//     综合所得7级年度超额累进税率 + 年减除60000元（月5000元=500000分）
//   · GS03 全年一次性奖金：国税发〔2005〕9号方法 + 财税〔2018〕164号
//     + 财政部 税务总局公告2023年第30号（执行至2027-12-31；引用必带30号，
//     30号正文未明确废止42号，按"30号现行、42号被实质接续"处理）：
//     bonus/12查月度表，税=bonus×rate−速算扣除；也可并入综合所得，择优
//   · GS02 国发〔2018〕41号 + 国发〔2023〕13号（自2023-01-01）：7分项默认值；
//     婴幼儿项来源注"国发〔2023〕13号，设立文号待复核"
//   · v1其他扣除恒0（字段保留）
// 金额一律分（INTEGER），禁止浮点存金额；税额四舍五入到分。
// ============================================================

public static class TaxCalculationService
{
    // 月减除费用：5000元 = 500000分
    public const long ThresholdMonthlyFen = 500000;

    // 年度税率表（GS01，财税口径；阈值为累计应纳税所得额上限，分）
    // (上限, 税率, 速算扣除分)
    private static readonly (long UpperFen, double Rate, long QuickDeductionFen)[] AnnualBrackets =
    {
        (3600000, 0.03, 0),
        (14400000, 0.10, 252000),
        (30000000, 0.20, 1692000),
        (42000000, 0.25, 3192000),
        (66000000, 0.30, 5292000),
        (96000000, 0.35, 8592000),
        (long.MaxValue, 0.45, 18192000),
    };

    // 月度税率表（GS03，按月换算后的综合所得税率表；阈值为 bonus/12 上限，分）
    private static readonly (long UpperFen, double Rate, long QuickDeductionFen)[] MonthlyBrackets =
    {
        (300000, 0.03, 0),
        (1200000, 0.10, 21000),
        (2500000, 0.20, 141000),
        (3500000, 0.25, 266000),
        (5500000, 0.30, 441000),
        (8000000, 0.35, 716000),
        (long.MaxValue, 0.45, 1516000),
    };

    // 专项附加扣除7分项顺序（与 wage_tax_ledger extra_1..7 对齐）：
    // 1 child_edu 子女教育、2 cont_edu 继续教育、3 medical 大病医疗、
    // 4 mortgage 房贷利息、5 rent 住房租金、6 elderly 赡养老人、7 infant 婴幼儿照护
    public static readonly string[] ExtraKeys =
        { "child_edu", "cont_edu", "medical", "mortgage", "rent", "elderly", "infant" };

    // GS02现行值默认值（分/月；medical为年口径，月度默认0，汇算据实）
    // 子女教育200000/月/孩、婴幼儿200000/月/孩（国发〔2023〕13号，设立文号待复核）、
    // 赡养300000/月独生·分摊≤150000、继续教育学历40000/月≤48月或取证当年360000、
    // 房贷100000/月≤240月、租金150000/110000/80000三档、
    // 大病医疗自付超1500000部分8000000/年限额据实汇算扣
    public static long DefaultExtraMonthly(string key) => key switch
    {
        "child_edu" => 200000,
        "infant" => 200000,
        "elderly" => 300000,
        "cont_edu" => 40000,
        "mortgage" => 100000,
        "rent" => 150000,
        _ => 0,
    };

    public static long SumExtra(long e1, long e2, long e3, long e4, long e5, long e6, long e7)
        => e1 + e2 + e3 + e4 + e5 + e6 + e7;

    /// <summary>年度查表：返回 (税率, 速算扣除分)。cumTaxableFen ≤ 0 视为 0 档。</summary>
    public static (double Rate, long QuickDeductionFen) GetAnnualBracket(long cumTaxableFen)
    {
        if (cumTaxableFen <= 0) return (0, 0);
        foreach (var b in AnnualBrackets)
            if (cumTaxableFen <= b.UpperFen) return (b.Rate, b.QuickDeductionFen);
        return (0.45, 18192000);
    }

    /// <summary>累计税：cumTaxable ≤ 0 → 0；否则 round(cumTaxable×rate) − 速算扣除（≥0）。</summary>
    public static long CalcAnnualTax(long cumTaxableFen)
    {
        if (cumTaxableFen <= 0) return 0;
        var (rate, quick) = GetAnnualBracket(cumTaxableFen);
        var tax = (long)Math.Round(cumTaxableFen * rate, MidpointRounding.AwayFromZero) - quick;
        return tax < 0 ? 0 : tax;
    }

    /// <summary>月度查表（bonus/12）：返回 (税率, 速算扣除分)。avgFen ≤ 0 视为 0 档。</summary>
    public static (double Rate, long QuickDeductionFen) GetMonthlyBracket(long avgFen)
    {
        if (avgFen <= 0) return (0, 0);
        foreach (var b in MonthlyBrackets)
            if (avgFen <= b.UpperFen) return (b.Rate, b.QuickDeductionFen);
        return (0.45, 1516000);
    }

    /// <summary>
    /// 年终奖单独计税（GS03）：avg = bonus/12 查月度表，税 = round(bonus×rate) − 速算扣除（≥0）。
    /// bonus ≤ 0 → 0。
    /// </summary>
    public static long CalcBonusSeparateTax(long bonusFen)
    {
        if (bonusFen <= 0) return 0;
        var avg = (long)Math.Round(bonusFen / 12.0, MidpointRounding.AwayFromZero);
        var (rate, quick) = GetMonthlyBracket(avg);
        if (rate == 0) return 0;
        var tax = (long)Math.Round(bonusFen * rate, MidpointRounding.AwayFromZero) - quick;
        return tax < 0 ? 0 : tax;
    }

    /// <summary>
    /// 年终奖并入方式：bonus加入当年累计收入重算累计税，差额 = 新累计税 − 原累计税（≥0）。
    /// </summary>
    public static long CalcBonusCombinedExtra(long origCumTaxableFen, long bonusFen)
    {
        if (bonusFen <= 0) return 0;
        var origTax = CalcAnnualTax(origCumTaxableFen);
        var newTax = CalcAnnualTax(origCumTaxableFen + bonusFen);
        var extra = newTax - origTax;
        return extra < 0 ? 0 : extra;
    }

    /// <summary>择优取小：返回 (单独税, 并入差额, 建议 separate/combined, 节省额=|差|)。</summary>
    public static (long SeparateTax, long CombinedExtra, string Recommended, long Saving) ChooseBonusMode(
        long origCumTaxableFen, long bonusFen)
    {
        var separate = CalcBonusSeparateTax(bonusFen);
        var combined = CalcBonusCombinedExtra(origCumTaxableFen, bonusFen);
        if (separate <= combined) return (separate, combined, "separate", combined - separate);
        return (separate, combined, "combined", separate - combined);
    }

    /// <summary>
    /// 累计应纳税所得额 = 累计收入 − 累计减除(5000×当年已过月数) − 累计社保个人
    /// − 累计公积金个人 − 累计专附 − 累计其他（v1恒0，字段保留）。
    /// 可为负（调用方 CalcAnnualTax 会归 0；本函数透出原始值以便对账）。
    /// </summary>
    public static long CalcCumTaxable(
        long cumGrossFen, int monthsElapsed,
        long cumSocialFen, long cumHousingFen,
        long cumExtraTotalFen, long cumOtherFen = 0)
        => cumGrossFen - ThresholdMonthlyFen * (long)monthsElapsed
            - cumSocialFen - cumHousingFen - cumExtraTotalFen - cumOtherFen;

    /// <summary>本期应预扣税 = 当年累计税 − 当年累计已缴；允许为负（应退，走汇算，不截0）。</summary>
    public static long CalcWithholding(long cumTaxFen, long cumPaidFen)
        => cumTaxFen - cumPaidFen;

    /// <summary>基数钳制到 [minFen, maxFen]。</summary>
    public static long ClampBase(long baseFen, long minFen, long maxFen)
        => Math.Min(maxFen, Math.Max(minFen, baseFen));

    /// <summary>理论值 = round(钳制后基数 × 比例)，到分。</summary>
    public static long CalcContributionTheory(long clampedBaseFen, double rate)
        => (long)Math.Round(clampedBaseFen * rate, MidpointRounding.AwayFromZero);

    /// <summary>YYYY-MM 校验（非法返回 false，不抛 500）。</summary>
    public static bool TryParseYearMonth(string? yearMonth, out int year, out int month)
    {
        year = 0; month = 0;
        if (string.IsNullOrEmpty(yearMonth)) return false;
        var parts = yearMonth.Split('-');
        if (parts.Length != 2) return false;
        return int.TryParse(parts[0], out year) && int.TryParse(parts[1], out month)
            && year is >= 1 and <= 9999 && month is >= 1 and <= 12;
    }
}
