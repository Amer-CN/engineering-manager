using System.Reflection;
using System.IO;
using EngineeringManager.Api;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// v0.77.1 P1-1 修复: OCR 8 处假成功 → 真 500
/// </summary>
public class OcrEndpointsTests
{
    // 从测试程序集位置上溯 4 级到仓库根，再定位 OcrEndpoints.cs（原硬编码绝对路径在 CI/他机上读不到）
    private static readonly string OcrEndpointsPath = Path.GetFullPath(
        Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "EngineeringManager.Api", "Endpoints", "OcrEndpoints.cs"));

    [Fact]
    public void CatchOcrError_HelperMethodExists()
    {
        var method = typeof(OcrEndpoints).GetMethod(
            "CatchOcrError",
            BindingFlags.NonPublic | BindingFlags.Static);
        Assert.NotNull(method);
        Assert.Equal(typeof(IResult), method!.ReturnType);
        var parameters = method.GetParameters();
        Assert.Equal(2, parameters.Length);
        Assert.Equal("endpointName", parameters[0].Name);
        Assert.Equal(typeof(string), parameters[0].ParameterType);
        Assert.Equal("ex", parameters[1].Name);
        Assert.Equal(typeof(Exception), parameters[1].ParameterType);
    }

    [Fact]
    public void CatchOcrError_Returns500_OnNetworkTimeout()
    {
        var method = typeof(OcrEndpoints).GetMethod(
            "CatchOcrError",
            BindingFlags.NonPublic | BindingFlags.Static)!;
        var ex = new Exception("请求百度 OCR 超时, 已重试 3 次");

        var result = (IResult)method.Invoke(null, new object?[] { "ocr-id-card", ex })!;

        var httpResult = Assert.IsAssignableFrom<IStatusCodeHttpResult>(result);
        Assert.Equal(500, httpResult.StatusCode);
    }

    [Fact]
    public void CatchOcrError_Returns500_OnGenericException()
    {
        var method = typeof(OcrEndpoints).GetMethod(
            "CatchOcrError",
            BindingFlags.NonPublic | BindingFlags.Static)!;
        var ex = new Exception("百度 API 返回 401 Unauthorized: invalid api_key");

        var result = (IResult)method.Invoke(null, new object?[] { "ocr-invoice", ex })!;

        var httpResult = Assert.IsAssignableFrom<IStatusCodeHttpResult>(result);
        Assert.Equal(500, httpResult.StatusCode);
    }

    [Fact]
    public void OcrEndpoints_File_NoLongerContainsFakeSuccessInCatchBlocks()
    {
        var content = File.ReadAllText(OcrEndpointsPath);
        // 修复前: 10 个 (8 OCR + 2 enterprise query)
        // 修复后: 2 个 (只剩 enterprise query L399/L423, 超出本次 OCR scope)
        var pattern = System.Text.RegularExpressions.Regex.Escape("return Results.Ok(new { success = false");
        var matches = System.Text.RegularExpressions.Regex.Matches(content, pattern);
        Assert.True(matches.Count <= 2,
            "v0.77.1 OCR 修复后, 假成功应 <= 2 (剩 enterprise query), 实际 " + matches.Count);
    }

    [Fact]
    public void OcrEndpoints_File_AllEightCatchBlocksReplaced()
    {
        var content = File.ReadAllText(OcrEndpointsPath);
        // 验证 transformer 实际替换了 8 处 catch block
        var ocrEndpoints = new[] {
            "ocr-id-card",
            "ocr-invoice",
            "ocr-bank-card",
            "ocr-business-license",
            "ocr-bank-receipt",
            "ocr-permit",
            "ocr-bank-statement",
            "ocr-general-receipt"
        };
        foreach (var name in ocrEndpoints)
        {
            Assert.Contains($"CatchOcrError(\"{name}\", ex)", content);
        }
    }
}
