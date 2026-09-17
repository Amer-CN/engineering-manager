using EngineeringManager.Api.Services;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

// ============================================================
// 个税引擎 Wave-T1 纯函数测试（无DB、无HTTP）：
// 七级边界、÷12查月表、择优差额、两月连续衔接。
// 口径：GS01年度7级（分）+ GS03月度表（bonus/12）+ 累计公式。
// ============================================================

public class TaxCalculationTests
{
    // 七级边界：每档上限税额 + 上限+1的连续性（速算扣除设计保证连续）
    [Theory]
    [InlineData(3600000, 108000)]
    [InlineData(14400000, 1188000)]
    [InlineData(30000000, 4308000)]
    [InlineData(42000000, 7308000)]
    [InlineData(66000000, 14508000)]
    [InlineData(96000000, 25008000)]
    public void AnnualBracket_UpperBound_TaxMatches(long cumTaxableFen, long expectedTaxFen)
    {
        Assert.Equal(expectedTaxFen, TaxCalculationService.CalcAnnualTax(cumTaxableFen));
    }

    [Theory]
    [InlineData(3600000)]
    [InlineData(14400000)]
    [InlineData(30000000)]
    [InlineData(42000000)]
    [InlineData(66000000)]
    [InlineData(96000000)]
    public void AnnualBracket_BoundaryPlusOne_Continuous(long upperFen)
    {
        var atUpper = TaxCalculationService.CalcAnnualTax(upperFen);
        var plusOne = TaxCalculationService.CalcAnnualTax(upperFen + 1);
        // 速算扣除衔接：+1分最多多1分税（四舍五入容差≤1）
        Assert.True(plusOne >= atUpper, $"upper={upperFen} tax={atUpper} plusOne={plusOne}");
        Assert.True(plusOne - atUpper <= 1, $"upper={upperFen} tax={atUpper} plusOne={plusOne}");
    }

    [Fact]
    public void AnnualTax_NonPositive_ReturnsZero()
    {
        Assert.Equal(0, TaxCalculationService.CalcAnnualTax(0));
        Assert.Equal(0, TaxCalculationService.CalcAnnualTax(-100));
    }

    // ÷12查月表：bonus/12定档，全额计税
    [Fact]
    public void BonusSeparate_Div12_LookupMonthly()
    {
        // 36000元奖金：avg=3000元 → 3%档 → 3600000×0.03=108000
        Assert.Equal(108000, TaxCalculationService.CalcBonusSeparateTax(3600000));
        // 0 → 0
        Assert.Equal(0, TaxCalculationService.CalcBonusSeparateTax(0));
        // 12000元奖金：avg=1000元 → 3% → 36000
        Assert.Equal(36000, TaxCalculationService.CalcBonusSeparateTax(1200000));
    }

    [Fact]
    public void BonusSeparate_MonthlyBracket_JumpDocumented()
    {
        // 月度表在300000分（3000元）处换档：1200000分奖金avg=100000（3%），
        // 3600012分奖金avg=300001（10%档）税跳变——记录行为，非连续性bug
        var low = TaxCalculationService.CalcBonusSeparateTax(3600000);
        var high = TaxCalculationService.CalcBonusSeparateTax(3600012);
        Assert.Equal(108000, low);
        // high = round(3600012×0.10) − 21000 = 360001 − 21000 = 339001
        Assert.Equal(339001, high);
    }

    // 择优差额：cum 100000元 + 12000元奖金 → 单独360元 < 并入1200元，推separate，省840元
    [Fact]
    public void BonusChoose_PicksSmaller_WithSaving()
    {
        long cumTaxable = 10000000;
        long bonus = 1200000;
        var (separate, combined, recommended, saving) =
            TaxCalculationService.ChooseBonusMode(cumTaxable, bonus);
        Assert.Equal(36000, separate);
        Assert.Equal(120000, combined);
        Assert.Equal("separate", recommended);
        Assert.Equal(84000, saving);
    }

    [Fact]
    public void BonusChoose_CombinedCheaper_WhenLowIncome()
    {
        // 累计应纳税为负（全年低收入）：orig税0，新累计700000→税21000，并入差额21000 < 单独36000 → 推combined
        var (separate, combined, recommended, _) =
            TaxCalculationService.ChooseBonusMode(-500000, 1200000);
        Assert.Equal(36000, separate);
        Assert.Equal(21000, combined);
        Assert.Equal("combined", recommended);
    }

    // 两月连续衔接：月入20000元，无社保专附；1月税450元，2月累计税900−已缴450=本期450
    [Fact]
    public void TwoMonths_ContinuousWithholding()
    {
        long grossPerMonth = 2000000;
        // 1月：cum=2000000−500000=1500000 → 3% → 45000
        var t1 = TaxCalculationService.CalcCumTaxable(grossPerMonth, 1, 0, 0, 0);
        Assert.Equal(1500000, t1);
        var tax1 = TaxCalculationService.CalcAnnualTax(t1);
        Assert.Equal(45000, tax1);
        var cur1 = TaxCalculationService.CalcWithholding(tax1, 0);
        Assert.Equal(45000, cur1);
        // 2月：cum=4000000−1000000=3000000 → 90000；本期=90000−45000=45000
        var t2 = TaxCalculationService.CalcCumTaxable(grossPerMonth * 2, 2, 0, 0, 0);
        Assert.Equal(3000000, t2);
        var tax2 = TaxCalculationService.CalcAnnualTax(t2);
        Assert.Equal(90000, tax2);
        var cur2 = TaxCalculationService.CalcWithholding(tax2, cur1);
        Assert.Equal(45000, cur2);
    }

    // 本期允许为负（应退，走汇算，不截0）
    [Fact]
    public void Withholding_Negative_KeptForRefund()
    {
        Assert.Equal(-5000, TaxCalculationService.CalcWithholding(10000, 15000));
    }

    // 阈值：500000分/月
    [Fact]
    public void ThresholdMonthly_Is5000Yuan()
    {
        Assert.Equal(500000, TaxCalculationService.ThresholdMonthlyFen);
    }

    // 基数钳制
    [Theory]
    [InlineData(100000, 727000, 3634800, 727000)]
    [InlineData(5000000, 727000, 3634800, 3634800)]
    [InlineData(1000000, 727000, 3634800, 1000000)]
    public void ClampBase_Works(long input, long min, long max, long expected)
    {
        Assert.Equal(expected, TaxCalculationService.ClampBase(input, min, max));
    }
}
