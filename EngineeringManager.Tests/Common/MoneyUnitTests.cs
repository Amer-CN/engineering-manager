using EngineeringManager.Api;
using Xunit;

namespace EngineeringManager.Tests.Common;

/// <summary>
/// MoneyUnit 换算单点 round-trip：ToFen/ToYuan 往返（含 0.01→1、边界值、
/// NULL/DBNull 经 ToYuanFromDb）。全项目唯一的金额换算实现，行为钉住。
/// </summary>
public class MoneyUnitTests
{
    [Fact]
    public void ToFen_OneCent_ReturnsOne()
    {
        Assert.Equal(1L, MoneyUnit.ToFen(0.01));
    }

    [Fact]
    public void ToYuan_OneFen_ReturnsOneCent()
    {
        Assert.Equal(0.01, MoneyUnit.ToYuan(1L));
    }

    [Theory]
    [InlineData(0.01)]
    [InlineData(0.0)]
    [InlineData(1.0)]
    [InlineData(123456.78)]
    [InlineData(-5.55)]
    [InlineData(99999999.99)]
    public void ToFen_ToYuan_RoundTrip(double yuan)
    {
        Assert.Equal(yuan, MoneyUnit.ToYuan(MoneyUnit.ToFen(yuan)));
    }

    [Fact]
    public void ToFen_NullableNull_ReturnsNull()
    {
        Assert.Null(MoneyUnit.ToFen((double?)null));
        Assert.Null(MoneyUnit.ToFen((decimal?)null));
    }

    [Fact]
    public void ToYuanDecimal_OneFen_ReturnsOneCent()
    {
        Assert.Equal(0.01m, MoneyUnit.ToYuanDecimal(1L));
        Assert.Equal(0m, MoneyUnit.ToYuanDecimal(0L));
    }

    [Fact]
    public void ToYuanFromDb_NullAndDbNull_ReturnsZero()
    {
        Assert.Equal(0, MoneyUnit.ToYuanFromDb(null));
        Assert.Equal(0, MoneyUnit.ToYuanFromDb(DBNull.Value));
    }

    [Theory]
    [InlineData((long)150, 1.5)]
    [InlineData(150.0, 1.5)]
    [InlineData(150, 1.5)]
    public void ToYuanFromDb_IntAndRealColumns_SameResult(object dbValue, double expectedYuan)
    {
        Assert.Equal(expectedYuan, MoneyUnit.ToYuanFromDb(dbValue));
    }
}
