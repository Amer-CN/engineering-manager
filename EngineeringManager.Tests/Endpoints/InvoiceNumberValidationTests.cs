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
/// FP02：后端发票号码 20 位校验（与前端 validateInvoiceNumber 同规则）。
/// 无发票代码且发票号码非空时，号码必须为 20 位纯数字，否则 400；
/// 有码旧票与空值放行。POST /api/invoices + PUT /api/invoices 共 7 条。
/// </summary>
public class InvoiceNumberValidationTests : ApiTestBase
{
    private const string Password = "admin123";
    private const string ValidNo = "12345678901234567890"; // 20 位新版数电票号
    private const string ShortNo = "12345678";             // 8 位旧版号（无码 → 400）

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

    private long SeedInvoice(string name = "旧票")
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
    public async Task Post_20DigitNoCode_Returns200()
    {
        SetAuth(await LoginAdminAsync());
        var resp = await Client.PostAsJsonAsync("/api/invoices", new { name = "数电票", amount = 100.0, invoiceNo = ValidNo });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task Post_ShortNoWithoutCode_Returns400_AndNoInsert()
    {
        SetAuth(await LoginAdminAsync());
        var before = CountInvoices();
        var resp = await Client.PostAsJsonAsync("/api/invoices", new { name = "坏票", amount = 100.0, invoiceNo = ShortNo });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Contains("20位数字", json.GetProperty("error").GetString());
        Assert.Equal(before, CountInvoices()); // 拒绝写入，库行数不变
    }

    [Fact]
    public async Task Post_ShortNoWithCode_Returns200_OldTicketPasses()
    {
        SetAuth(await LoginAdminAsync());
        var resp = await Client.PostAsJsonAsync("/api/invoices",
            new { name = "旧版票", amount = 100.0, invoiceNo = ShortNo, invoiceCode = "123456789012" });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task Post_EmptyNo_Returns200()
    {
        SetAuth(await LoginAdminAsync());
        var resp = await Client.PostAsJsonAsync("/api/invoices", new { name = "无号票", amount = 100.0 });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    // ── PUT /api/invoices ──

    [Fact]
    public async Task Put_ShortNoWithoutCode_Returns400()
    {
        SetAuth(await LoginAdminAsync());
        var invId = SeedInvoice();
        var resp = await Client.PutAsJsonAsync("/api/invoices",
            new { id = invId, name = "坏票", amount = 100.0, invoiceNo = ShortNo });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Contains("20位数字", json.GetProperty("error").GetString());
    }

    [Fact]
    public async Task Put_20DigitNoCode_Returns200()
    {
        SetAuth(await LoginAdminAsync());
        var invId = SeedInvoice();
        var resp = await Client.PutAsJsonAsync("/api/invoices",
            new { id = invId, name = "数电票", amount = 100.0, invoiceNo = ValidNo });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task Put_ShortNoWithCode_Returns200_OldTicketPasses()
    {
        SetAuth(await LoginAdminAsync());
        var invId = SeedInvoice();
        var resp = await Client.PutAsJsonAsync("/api/invoices",
            new { id = invId, name = "旧版票", amount = 100.0, invoiceNo = ShortNo, invoiceCode = "123456789012" });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }
}
