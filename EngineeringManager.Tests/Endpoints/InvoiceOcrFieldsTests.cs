using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using EngineeringManager.Tests.Common;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// T8：发票收票字段骨架（校验码 / 销方税号 / 开票人 / 收款人 / 复核人）。
/// 只验证落库、读回、更新与格式校验；不涉及 OCR 识别。
/// </summary>
public class InvoiceOcrFieldsTests : ApiTestBase
{
    private const string Password = "admin123";

    private async Task AuthAdminAsync()
    {
        var resp = await Client.PostAsJsonAsync("/api/auth/login", new { username = "admin", password = Password });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", json.GetProperty("data").GetProperty("token").GetString());
    }

    private object Body(string? verifyCode = "12345678901234567890", string? sellerTaxNo = "91310000MA1FL1234X",
        string? drawer = "张三", string? payee = "李四", string? reviewer = "王五")
    {
        return new
        {
            name = $"T8-{Guid.NewGuid():N}",
            amount = 1060m,
            priceAmount = 1000m,
            taxAmount = 60m,
            taxRate = 0.06,
            status = "issued",
            type = "invoice_in",
            invoiceKind = "paper_special",
            invoiceMedium = "paper",
            invoiceCategory = "special",
            issueDate = "2026-10-01",
            verifyCode,
            sellerTaxNo,
            drawer,
            payee,
            reviewer
        };
    }

    private async Task<long> CreateAsync(object body)
    {
        var resp = await Client.PostAsJsonAsync("/api/invoices", body);
        Assert.True(resp.StatusCode == HttpStatusCode.OK, await resp.Content.ReadAsStringAsync());
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("data").GetInt64();
    }

    private async Task<JsonElement> FindAsync(long id)
    {
        var resp = await Client.GetAsync("/api/invoices");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var data = (await resp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        return data.EnumerateArray().Single(r => r.GetProperty("id").GetInt64() == id);
    }

    private static string? Str(JsonElement row, string name) =>
        row.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;

    [Fact]
    public async Task Create_WithOcrFields_PersistsAndReadsBack()
    {
        await AuthAdminAsync();
        var id = await CreateAsync(Body());

        var row = await FindAsync(id);
        Assert.Equal("12345678901234567890", Str(row, "verify_code"));
        Assert.Equal("91310000MA1FL1234X", Str(row, "seller_tax_no"));
        Assert.Equal("张三", Str(row, "drawer"));
        Assert.Equal("李四", Str(row, "payee"));
        Assert.Equal("王五", Str(row, "reviewer"));
    }

    [Fact]
    public async Task Update_OcrFields_ReplacesValues()
    {
        await AuthAdminAsync();
        var id = await CreateAsync(Body());

        var put = await Client.PutAsJsonAsync("/api/invoices", new
        {
            id,
            name = "T8-更新",
            amount = 1060m,
            priceAmount = 1000m,
            taxAmount = 60m,
            taxRate = 0.06,
            status = "issued",
            type = "invoice_in",
            invoiceKind = "paper_special",
            invoiceMedium = "paper",
            invoiceCategory = "special",
            issueDate = "2026-10-01",
            verifyCode = "NEWCODE123",
            sellerTaxNo = "91310000MA1FL9999Y",
            drawer = "赵六",
            payee = "钱七",
            reviewer = "孙八"
        });
        Assert.True(put.StatusCode == HttpStatusCode.OK, await put.Content.ReadAsStringAsync());

        var row = await FindAsync(id);
        Assert.Equal("NEWCODE123", Str(row, "verify_code"));
        Assert.Equal("91310000MA1FL9999Y", Str(row, "seller_tax_no"));
        Assert.Equal("赵六", Str(row, "drawer"));
        Assert.Equal("钱七", Str(row, "payee"));
        Assert.Equal("孙八", Str(row, "reviewer"));
    }

    [Fact]
    public async Task Create_BlankOcrFields_NormalizesToNull()
    {
        await AuthAdminAsync();
        var id = await CreateAsync(Body(verifyCode: "   ", sellerTaxNo: "", drawer: " ", payee: "  ", reviewer: ""));

        var row = await FindAsync(id);
        Assert.True(string.IsNullOrEmpty(Str(row, "verify_code")));
        Assert.True(string.IsNullOrEmpty(Str(row, "seller_tax_no")));
        Assert.True(string.IsNullOrEmpty(Str(row, "drawer")));
        Assert.True(string.IsNullOrEmpty(Str(row, "payee")));
        Assert.True(string.IsNullOrEmpty(Str(row, "reviewer")));
    }

    [Fact]
    public async Task Create_VerifyCodeTooLong_Returns400()
    {
        await AuthAdminAsync();
        var resp = await Client.PostAsJsonAsync("/api/invoices", Body(verifyCode: new string('9', 33)));
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("校验码", await ReadError(resp));
    }

    [Fact]
    public async Task Create_SellerTaxNoWithSymbol_Returns400()
    {
        await AuthAdminAsync();
        var resp = await Client.PostAsJsonAsync("/api/invoices", Body(sellerTaxNo: "9131-0000-MA1F"));
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("销方税号", await ReadError(resp));
    }

    private static async Task<string> ReadError(HttpResponseMessage resp)
    {
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.TryGetProperty("error", out var e) ? e.GetString() ?? "" : "";
    }
}

