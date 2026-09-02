using ClosedXML.Excel;

namespace EngineeringManager.Api.Services;

/// <summary>
/// xlsx 模板标题占位符填充：逐表扫描已用单元格做字符串替换，其余内容/版式不动。
/// </summary>
public static class XlsxTemplateService
{
    public static byte[] FillTitlePlaceholders(byte[] templateBytes, Dictionary<string, string> values)
    {
        using var input = new MemoryStream(templateBytes);
        using var wb = new XLWorkbook(input);
        foreach (var ws in wb.Worksheets)
        {
            foreach (var cell in ws.CellsUsed())
            {
                var text = cell.GetString();
                if (string.IsNullOrEmpty(text)) continue;
                // 公式单元格不动（评审修补）：缓存结果恰含占位符时，禁止把活公式冻结为字面量
                if (cell.HasFormula) continue;
                var replaced = text;
                foreach (var kv in values)
                    replaced = replaced.Replace(kv.Key, kv.Value);
                if (replaced != text) cell.SetValue(replaced);
            }
        }
        using var output = new MemoryStream();
        wb.SaveAs(output);
        return output.ToArray();
    }
}
