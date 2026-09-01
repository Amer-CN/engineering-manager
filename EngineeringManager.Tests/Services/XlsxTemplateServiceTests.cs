using System.IO;
using System.Collections.Generic;
using ClosedXML.Excel;
using EngineeringManager.Api.Services;
using Xunit;

namespace EngineeringManager.Tests.Services;

/// <summary>
/// XlsxTemplateService：只替换标题占位符（{项目}/{月份}/{班组}），其余单元格与版式不动。
/// </summary>
public class XlsxTemplateServiceTests
{
    private static byte[] BuildTemplate()
    {
        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("考勤采集表");
        ws.Cell("A1").Value = "{项目} {月份} 考勤采集表（{班组}）";
        ws.Cell("A3").Value = "姓名";
        ws.Cell("C3").Value = "出勤天数";
        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }

    private static readonly Dictionary<string, string> Values = new()
    {
        ["{项目}"] = "一号地块",
        ["{月份}"] = "2026-08",
        ["{班组}"] = "木工班",
    };

    [Fact]
    public void FillTitlePlaceholders_ReplacesTitleCells()
    {
        var filled = XlsxTemplateService.FillTitlePlaceholders(BuildTemplate(), Values);
        using var ms = new MemoryStream(filled);
        using var wb = new XLWorkbook(ms);
        Assert.Equal("一号地块 2026-08 考勤采集表（木工班）", wb.Worksheet(1).Cell("A1").GetString());
    }

    [Fact]
    public void FillTitlePlaceholders_LeavesOtherCellsUntouched()
    {
        var filled = XlsxTemplateService.FillTitlePlaceholders(BuildTemplate(), Values);
        using var ms = new MemoryStream(filled);
        using var wb = new XLWorkbook(ms);
        var ws = wb.Worksheet(1);
        Assert.Equal("姓名", ws.Cell("A3").GetString());
        Assert.Equal("出勤天数", ws.Cell("C3").GetString());
    }
}
