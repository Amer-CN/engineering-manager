using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using EngineeringManager.Api;
using EngineeringManager.Tests.Common;
using Microsoft.Data.Sqlite;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// // R9-TODO：修复 WagePaymentRecords.tsx:110 的 category 后，必须同步改写本测试，否则它会永久锁定错误行为。
/// M-FIX10 V2(b)：WagePaymentRecords「查看回单」断链举证（只锁定现状，不改生产代码）。
///
/// 事实（L-WINDOW-AUDIT.md §1）：
///   - K-2 保存约定：fileService.ts WAGE_BANK_RECEIPT = { category:'wages', subCategory:'bank-receipts' }
///     → 文件在 {data}/uploads/wages/bank-receipts/{fileName}
///   - WagePaymentRecords.tsx:110「查看回单」调 openExternalFile({ category:'bank_receipts', ... })
///     → 后端 Path.Combine({data}/uploads, 'bank_receipts', fileName) = {data}/uploads/bank_receipts/（不存在）
///
/// 测试：在正确的保存路径 {data}/uploads/wages/bank-receipts/ 下造一个真实文件，
/// 再按 WagePaymentRecords 的 category='bank_receipts' 调 POST /api/files/open-external，
/// 断言返回 404「文件不存在」——因为 File.Exists 在 UseShellExecute 之前就失败，
/// 不会真的起进程（测试安全）。
///
/// 本测试只做举证：若返回 404 → 证明断链存在。禁止修改任何生产代码。
/// </summary>
public class MFix10BreakChainTests : ApiTestBase
{
    private static string ExtractToken(string json)
    {
        var marker = "\"token\":\"";
        var i = json.IndexOf(marker, StringComparison.Ordinal);
        if (i < 0) throw new Exception("token not found: " + json);
        var start = i + marker.Length;
        var end = json.IndexOf('\"', start);
        return json.Substring(start, end - start);
    }

    private void SetAuth(string token) =>
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    [Fact]
    public async Task OpenExternal_CategoryBankReceipts_Returns404_FileNotFound()
    {
        // 登录 admin
        var login = await Client.PostAsJsonAsync("/api/auth/login", new { username = "admin", password = "admin123" });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        SetAuth(ExtractToken(await login.Content.ReadAsStringAsync()));

        // 在【正确的 K-2 保存路径】造一个真实文件：{data}/uploads/wages/bank-receipts/{fileName}
        var dataPath = ApiConfig.ResolveDataPath();
        var saveDir = Path.Combine(dataPath, "uploads", "wages", "bank-receipts");
        Directory.CreateDirectory(saveDir);
        var fileName = "v2b-real-receipt.jpg";
        var realFile = Path.Combine(saveDir, fileName);
        // 一个真实的图片字节（1x1 GIF，避免被扩展名白名单之外拦截——jpg 在白名单内）
        await File.WriteAllBytesAsync(realFile, Convert.FromBase64String("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"));
        Assert.True(File.Exists(realFile), "前提：真实文件必须已创建");

        // 按 WagePaymentRecords.tsx:110 的 category='bank_receipts' 调 open-external
        var resp = await Client.PostAsJsonAsync("/api/files/open-external", new
        {
            category = "bank_receipts",   // ← WagePaymentRecords 传的值（断链源头）
            subCategory = "",
            fileName,
            projectName = (string?)null,
        });

        // 断言：File.Exists 在 Process.Start 之前失败 → 404 文件不存在（断链实证）
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
        var body = await resp.Content.ReadAsStringAsync();
        // 必答③ 原文输出：实际状态码 + 响应体
        System.Console.WriteLine($"[BREAKCHAIN-EVIDENCE] status={(int)resp.StatusCode} body={body}");
        Assert.Contains("文件不存在", body);
        Assert.Contains("\"success\":false", body);
        // 反向对照（U6(b)）：错误 category 指向的目录确实没有这个文件（即不是文件不存在，而是路径错位）
        Assert.False(File.Exists(Path.Combine(dataPath, "uploads", "bank_receipts", fileName)), "对照：错误 category 指向的目录确实没有这个文件");
    }
}
