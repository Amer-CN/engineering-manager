using Dapper;
using EngineeringManager.Tests.Common;
using Microsoft.Data.Sqlite;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// FP04：后端发票附件 fileType 白名单（与前端 processFile 白名单同口径）。
/// 仅放行 jpeg/png/webp/pdf/xml/ofd（短码/fileType/mime 均认），空值无附件放行；
/// 其余 400 且拒绝写入。POST /api/invoices + PUT /api/invoices。
/// 仿 InvoiceNumberValidationTests.cs:51-119 模式（400/过表断言）。
/// </summary>
public class InvoiceFileTypeValidationTests : ApiTestBase
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

    private long CountInvoices()
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.ExecuteScalar<long>("SELECT COUNT(*) FROM [invoices]");
    }

    private long SeedInvoice(string name = "附件票")
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.ExecuteScalar<long>(@"INSERT INTO invoices
            (name,amount,status,created_by,created_at,updated_at,version,last_modified_at)
            VALUES (@N,1000,'pending','1','2026-08-01 00:00:00','2026-08-01 00:00:00',1,'2026-08-01 00:00:00');
            SELECT last_insert_rowid();",
            new { N = name });
    }

    // ── POST /api/invoices ──

    [Fact]
    public async Task Post_XmlFileType_Returns200()
    {
        SetAuth(await LoginAdminAsync());
        var resp = await Client.PostAsJsonAsync("/api/invoices", new { name = "数电XML", amount = 100.0, fileType = "xml" });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task Post_OfdFileType_Returns200()
    {
        SetAuth(await LoginAdminAsync());
        var resp = await Client.PostAsJsonAsync("/api/invoices", new { name = "版式OFD", amount = 100.0, fileType = "ofd" });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task Post_PdfAndImageFileType_Returns200()
    {
        SetAuth(await LoginAdminAsync());
        foreach (var ft in new[] { "pdf", "image", "image/jpeg", "application/pdf" })
        {
            var resp = await Client.PostAsJsonAsync("/api/invoices", new { name = "旧附件", amount = 100.0, fileType = ft });
            Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        }
    }

    [Fact]
    public async Task Post_EmptyFileType_Returns200_NoAttachmentPasses()
    {
        SetAuth(await LoginAdminAsync());
        var resp = await Client.PostAsJsonAsync("/api/invoices", new { name = "无附件", amount = 100.0 });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task Post_BadFileType_Returns400_AndNoInsert()
    {
        SetAuth(await LoginAdminAsync());
        var before = CountInvoices();
        var resp = await Client.PostAsJsonAsync("/api/invoices", new { name = "坏附件", amount = 100.0, fileType = "exe" });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Contains("JPG", json.GetProperty("error").GetString());
        Assert.Equal(before, CountInvoices()); // 拒绝写入，库行数不变
    }

    // ── PUT /api/invoices ──

    [Fact]
    public async Task Put_XmlFileType_Returns200()
    {
        SetAuth(await LoginAdminAsync());
        var invId = SeedInvoice();
        var resp = await Client.PutAsJsonAsync("/api/invoices",
            new { id = invId, name = "数电XML", amount = 100.0, fileType = "xml" });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task Put_OfdFileType_Returns200()
    {
        SetAuth(await LoginAdminAsync());
        var invId = SeedInvoice();
        var resp = await Client.PutAsJsonAsync("/api/invoices",
            new { id = invId, name = "版式OFD", amount = 100.0, fileType = "ofd" });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task Put_BadFileType_Returns400()
    {
        SetAuth(await LoginAdminAsync());
        var invId = SeedInvoice();
        var resp = await Client.PutAsJsonAsync("/api/invoices",
            new { id = invId, name = "坏附件", amount = 100.0, fileType = "application/x-msdownload" });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Contains("JPG", json.GetProperty("error").GetString());
    }
}
