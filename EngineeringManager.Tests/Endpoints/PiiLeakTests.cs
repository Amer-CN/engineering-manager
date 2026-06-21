using System.Reflection;
using System.Text.RegularExpressions;
using EngineeringManager.Api;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// v0.77.2 P1-3 修复: ex.Message 不再直接返回前端
/// 修复范围: 4 文件 18 处 ex.Message 泄露 + OcrEndpoints 2 处企业查询假成功
/// </summary>
public class PiiLeakTests
{
    private const string EndpointsDir = @"E:\测试\EngineeringManager.Api\Endpoints";

    private static string ReadFile(string name) =>
        File.ReadAllText(Path.Combine(EndpointsDir, name));

    /// <summary>
    /// 检查文件中剩余 raw {ex.Message} 都只在 server-side log (Console.Error.WriteLine) 里,
    /// 不在 response body 里.  注: Common.Sanitize(ex.Message) 已替换完成.
    /// </summary>
    [Theory]
    [InlineData("AuthEndpoints.cs")]
    [InlineData("UserPreferencesEndpoints.cs")]
    [InlineData("SystemEndpoints.cs")]
    public void EndpointFile_AllRawExMessageAreInServerSideLogs(string fileName)
    {
        var content = ReadFile(fileName);

        // 1. 把所有 Common.Sanitize(ex.Message) 替换掉 (已正确)
        var stripped = content.Replace("Common.Sanitize(ex.Message)", "");

        // 2. 把所有 Console.Error.WriteLine 整行去掉 (server-side log, OK)
        stripped = Regex.Replace(stripped, @"Console\.Error\.WriteLine\([^;]*?\{ex\.Message\}[^;]*?\);", "");

        // 3. 现在剩下的 {ex.Message} 应该 = 0
        var leftover = Regex.Matches(stripped, @"\{ex\.Message\}");
        Assert.Empty(leftover);
    }

    /// <summary>
    /// 验证每个 endpoint 文件 ex.Message 都过 Common.Sanitize 脱敏 (response body 路径)
    /// </summary>
    [Theory]
    [InlineData("AuthEndpoints.cs")]
    [InlineData("UserPreferencesEndpoints.cs")]
    [InlineData("SystemEndpoints.cs")]
    public void EndpointFile_HasCommonSanitizeAroundExMessage(string fileName)
    {
        var content = ReadFile(fileName);
        var count = Regex.Matches(content, @"Common\.Sanitize\(ex\.Message\)").Count;
        Assert.True(count > 0, fileName + " 应至少 1 处 Common.Sanitize(ex.Message), 实际 " + count);
    }

    [Fact]
    public void OcrEndpoints_CompanyQuery_ValidationReturns400()
    {
        var content = ReadFile("OcrEndpoints.cs");
        Assert.Contains("return Common.Fail(\"请输入企业名称\", 400);", content);
    }

    [Fact]
    public void OcrEndpoints_CompanyQuery_CatchReturns500()
    {
        var content = ReadFile("OcrEndpoints.cs");
        Assert.Contains("CatchOcrError(\"ocr-company-query\", ex)", content);
    }

    [Fact]
    public void OcrEndpoints_File_NoLongerContainsEnterpriseQueryFakeSuccess()
    {
        var content = ReadFile("OcrEndpoints.cs");
        Assert.DoesNotContain("return Results.Ok(new { success = false, error = \"请输入企业名称\" })", content);
    }
}