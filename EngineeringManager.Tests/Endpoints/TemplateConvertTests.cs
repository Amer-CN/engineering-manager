using System.IO.Compression;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using EngineeringManager.Tests.Common;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// POST /api/templates/convert-docx（mammoth docx→HTML）：
/// ① templates 落盘的 .docx → 200 且 html 含正文文本；
/// ② 文件不存在 → 404。
/// 测试不引入 docx 资产文件——用 System.IO.Compression 手工拼最小 OPC 包（docx 即 zip）。
/// </summary>
public class TemplateConvertTests : ApiTestBase
{
    private const string Password = "admin123";

    private async Task<string> LoginAdminAsync()
    {
        var resp = await Client.PostAsJsonAsync("/api/auth/login", new { username = "admin", password = Password });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("data").GetProperty("token").GetString()!;
    }

    private void SetAuth(string token) =>
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    /// <summary>手工拼最小合法 docx（[Content_Types].xml + _rels/.rels + word/document.xml），返回字节</summary>
    private static byte[] BuildMinimalDocx(string bodyText)
    {
        using var ms = new MemoryStream();
        using (var zip = new ZipArchive(ms, ZipArchiveMode.Create, leaveOpen: true))
        {
            zip.CreateEntry("[Content_Types].xml").WriteText(
                """<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>""");
            zip.CreateEntry("_rels/.rels").WriteText(
                """<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>""");
            zip.CreateEntry("word/document.xml").WriteText(
                $"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>{bodyText}</w:t></w:r></w:p></w:body></w:document>""");
        }
        return ms.ToArray();
    }

    private static async Task WriteDataFile(params string[] relativeParts)
    {
        var path = Path.Combine(new[] { ApiConfig.ResolveDataPath() }.Concat(relativeParts).ToArray());
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        var bytes = BuildMinimalDocx("测试内容 {{甲方}}");
        await File.WriteAllBytesAsync(path, bytes);
    }

    [Fact]
    public async Task Convert_DocxUnderTemplates_ReturnsHtmlWithBodyText()
    {
        SetAuth(await LoginAdminAsync());
        var fileName = $"convert-{Guid.NewGuid():N}.docx";
        try
        {
            await WriteDataFile("uploads", "templates", fileName);

            var resp = await Client.PostAsJsonAsync("/api/templates/convert-docx",
                new { storedFileName = fileName, category = "templates" });
            Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

            var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
            var html = json.GetProperty("data").GetProperty("html").GetString();
            Assert.NotNull(html);
            Assert.Contains("测试内容", html);
            Assert.Contains("{{甲方}}", html);
        }
        finally
        {
            var path = Path.Combine(ApiConfig.ResolveDataPath(), "uploads", "templates", fileName);
            try { if (File.Exists(path)) File.Delete(path); } catch { }
        }
    }

    [Fact]
    public async Task Convert_MissingFile_Returns404()
    {
        SetAuth(await LoginAdminAsync());
        var resp = await Client.PostAsJsonAsync("/api/templates/convert-docx",
            new { storedFileName = $"missing-{Guid.NewGuid():N}.docx" });
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    // ── 用例 3：contracts 分支——真实落盘布局 uploads/{项目名}/合同/{收入|支出}/{文件}（评审返工 C1）──
    [Fact]
    public async Task Convert_ContractAttachmentUnderProjectDir_ReturnsHtml()
    {
        SetAuth(await LoginAdminAsync());
        var fileName = $"contract-{Guid.NewGuid():N}.docx";
        try
        {
            await WriteDataFile("uploads", "某项目", "合同", "支出", fileName);

            var resp = await Client.PostAsJsonAsync("/api/templates/convert-docx",
                new { storedFileName = fileName, category = "contracts" });
            Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

            var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
            var html = json.GetProperty("data").GetProperty("html").GetString();
            Assert.NotNull(html);
            Assert.Contains("测试内容", html);
        }
        finally
        {
            var path = Path.Combine(ApiConfig.ResolveDataPath(), "uploads", "某项目", "合同", "支出", fileName);
            try { if (File.Exists(path)) File.Delete(path); } catch { }
        }
    }
}

internal static class ZipArchiveEntryExtensions
{
    /// <summary>以 UTF-8 写入 entry 全文（测试拼 OPC 包用）</summary>
    public static void WriteText(this ZipArchiveEntry entry, string text)
    {
        using var s = entry.Open();
        s.Write(System.Text.Encoding.UTF8.GetBytes(text));
    }
}
