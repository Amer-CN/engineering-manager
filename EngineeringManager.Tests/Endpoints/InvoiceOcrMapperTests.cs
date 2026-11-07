using System.Text.Json;
using EngineeringManager.Api.Services;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// T8 收票 OCR 字段映射。
/// FP03（2026-11-07 取证结案）：数电票票面取消校验码/收款人/复核人；映射不到必须留空，不得伪造。
/// </summary>
public class InvoiceOcrMapperTests
{
    private static JsonElement Words(string json) =>
        JsonDocument.Parse(json).RootElement.GetProperty("words_result");

    [Fact]
    public void Map_PaperInvoice_ExtractsAllT8Fields()
    {
        var words = Words("""
        {
          "words_result": {
            "InvoiceNum": { "word": "24312000000012345678" },
            "InvoiceCode": { "word": "031002000111" },
            "InvoiceDate": { "word": "2026年05月18日" },
            "InvoiceType": { "word": "增值税专用发票" },
            "AmountInFiguers": { "word": "¥1060.00" },
            "TotalAmount": { "word": "1000.00" },
            "TotalTax": { "word": "60.00" },
            "CommodityTaxRate": [ { "word": "6%" } ],
            "CommodityName": [ { "word": "建筑服务" } ],
            "CommodityTaxCode": { "word": "3050102000000000000" },
            "SellerName": { "word": "甲方建筑有限公司" },
            "SellerRegisterNum": { "word": "91310000MA1FL1234X" },
            "PurchaserName": { "word": "乙方工程有限公司" },
            "PurchaserRegisterNum": { "word": "91310000MA1FL5678Y" },
            "CheckCode": { "word": "12345678901234567890" },
            "Drawer": { "word": "张三" },
            "Payee": { "word": "李四" },
            "Reviewer": { "word": "王五" },
            "Remarks": { "word": "项目备注" }
          }
        }
        """);

        var m = InvoiceOcrMapper.Map(words);

        Assert.Equal("24312000000012345678", m.InvoiceNum);
        Assert.Equal("031002000111", m.InvoiceCode);
        Assert.Equal("2026-05-18", m.InvoiceDate);
        Assert.Equal("增值税专用发票", m.InvoiceType);
        Assert.Equal(1060.00m, m.TotalAmount);
        Assert.Equal(1000.00m, m.AmountWithoutTax);
        Assert.Equal(60.00m, m.TotalTax);
        Assert.Equal(0.06m, m.TaxRate);
        Assert.Equal("甲方建筑有限公司", m.SellerName);
        Assert.Equal("91310000MA1FL1234X", m.SellerTaxNo);
        Assert.Equal("乙方工程有限公司", m.PurchaserName);
        Assert.Equal("91310000MA1FL5678Y", m.PurchaserTaxNo);
        Assert.Equal("12345678901234567890", m.VerifyCode);
        Assert.Equal("张三", m.Drawer);
        Assert.Equal("李四", m.Payee);
        Assert.Equal("王五", m.Reviewer);
        Assert.Equal("3050102000000000000", m.TaxCode);
        Assert.Equal("建筑服务", m.ItemName);
        Assert.Equal("项目备注", m.Remarks);
    }

    [Fact]
    public void Map_DigitalInvoice_LeavesRemovedFieldsEmpty()
    {
        // 数电票票面：无发票代码、校验码、收款人、复核人（FP03 已取证）
        var words = Words("""
        {
          "words_result": {
            "InvoiceNum": { "word": "24312000000012345678" },
            "InvoiceDate": { "word": "2026-05-18" },
            "InvoiceType": { "word": "电子发票（增值税专用发票）" },
            "AmountInFiguers": { "word": "1060.00" },
            "TotalAmount": { "word": "1000.00" },
            "TotalTax": { "word": "60.00" },
            "CommodityTaxRate": [ { "word": "6%" } ],
            "CommodityName": [ { "word": "建筑服务" } ],
            "SellerName": { "word": "甲方建筑有限公司" },
            "PurchaserName": { "word": "乙方工程有限公司" }
          }
        }
        """);

        var m = InvoiceOcrMapper.Map(words);

        Assert.Equal("24312000000012345678", m.InvoiceNum);
        Assert.Equal("", m.InvoiceCode);
        Assert.Equal("", m.VerifyCode);
        Assert.Equal("", m.Drawer);
        Assert.Equal("", m.Payee);
        Assert.Equal("", m.Reviewer);
        Assert.Equal("", m.SellerTaxNo);
        Assert.Equal("", m.PurchaserTaxNo);
        Assert.Equal("", m.TaxCode);
    }

    [Theory]
    [InlineData("6%", 0.06)]
    [InlineData("0.06", 0.06)]
    [InlineData("13%", 0.13)]
    [InlineData("", 0)]
    public void Map_NormalizesTaxRate(string raw, decimal expected)
    {
        var json = "{\"words_result\":{\"CommodityTaxRate\":[{\"word\":\"" + raw + "\"}]}}";
        var m = InvoiceOcrMapper.Map(Words(json));
        Assert.Equal(expected, m.TaxRate);
    }

    [Fact]
    public void Map_InvoiceType_FallsBackToInvoiceTypeOrg_AndSupportsStringForm()
    {
        var org = Words("""
        { "words_result": { "InvoiceTypeOrg": { "word": "增值税电子普通发票" } } }
        """);
        Assert.Equal("增值税电子普通发票", InvoiceOcrMapper.Map(org).InvoiceType);

        var str = Words("""
        { "words_result": { "InvoiceType": "增值税普通发票" } }
        """);
        Assert.Equal("增值税普通发票", InvoiceOcrMapper.Map(str).InvoiceType);
    }

    [Fact]
    public void Map_UndefinedOrEmptyWords_ReturnsEmptyWithoutThrowing()
    {
        var empty = InvoiceOcrMapper.Map(default);
        Assert.Equal(InvoiceOcrMapper.Empty, empty);

        var obj = Words("{ \"words_result\": {} }");
        var m = InvoiceOcrMapper.Map(obj);
        Assert.Equal(InvoiceOcrMapper.Empty, m);
    }
}