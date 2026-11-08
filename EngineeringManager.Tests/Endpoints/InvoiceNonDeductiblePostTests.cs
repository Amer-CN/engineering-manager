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
/// FP08（Wave 1B-4）：POST /api/invoices 不得抵扣原因六值分类。
/// 六值各过且落库；非法值 400；NULL/空过且落库 NULL；
/// GET /api/invoices 经 SELECT i.* 自动暴露该列。
/// 约定：NULL/空 = 可抵扣；`:status` 快捷路径无此字段，豁免不断言。
/// </summary>
public class InvoiceNonDeductiblePostTests : ApiTestBase
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

    private static async Task<string> ReadError(HttpResponseMessage resp)
    {
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.TryGetProperty("error", out var e) ? e.GetString() ?? "" : "";
    }

    private string? QueryReason(string name)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.ExecuteScalar<string?>(
            "SELECT [non_deductible_reason] FROM [invoices] WHERE [name]=@N",
            new { N = name });
    }

    // 六值各过且落库原值
    [Theory]
    [InlineData("simple_taxation")]
    [InlineData("exempt")]
    [InlineData("abnormal_loss")]
    [InlineData("welfare_personal")]
    [InlineData("catering_entertainment")]
    [InlineData("other")]
    public async Task ValidReason_Returns200_AndPersists(string reason)
    {
        SetAuth(await LoginAdminAsync());
        var name = "不得抵扣-" + reason;
        var resp = await Client.PostAsJsonAsync("/api/invoices",
            new { name, amount = 100.0, status = "issued", type = "invoice_in", invoiceKind = "paper_special", nonDeductibleReason = reason });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal(reason, QueryReason(name));
    }

    // 非法值 → 400
    [Fact]
    public async Task InvalidReason_Returns400()
    {
        SetAuth(await LoginAdminAsync());
        var resp = await Client.PostAsJsonAsync("/api/invoices",
            new { name = "不得抵扣非法", amount = 100.0, status = "issued", type = "invoice_in", invoiceKind = "paper_special", nonDeductibleReason = "boss_expense" });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("不得抵扣", await ReadError(resp));
    }

    // NULL → 过，落库 NULL（可抵扣）
    [Fact]
    public async Task NullReason_Returns200_NullPersisted()
    {
        SetAuth(await LoginAdminAsync());
        var resp = await Client.PostAsJsonAsync("/api/invoices",
            new { name = "可抵扣空", amount = 100.0, status = "issued", type = "invoice_in", invoiceKind = "paper_special" });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Null(QueryReason("可抵扣空"));
    }

    // 空串 → 过，归一落库 NULL
    [Fact]
    public async Task EmptyReason_Returns200_NullPersisted()
    {
        SetAuth(await LoginAdminAsync());
        var resp = await Client.PostAsJsonAsync("/api/invoices",
            new { name = "可抵扣空串", amount = 100.0, status = "issued", type = "invoice_in", invoiceKind = "paper_special", nonDeductibleReason = "" });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Null(QueryReason("可抵扣空串"));
    }

    // GET /api/invoices 自动暴露该列（SELECT i.*）
    [Fact]
    public async Task GetInvoices_ExposesReasonColumn()
    {
        SetAuth(await LoginAdminAsync());
        var created = await Client.PostAsJsonAsync("/api/invoices",
            new { name = "暴露校验", amount = 100.0, status = "issued", type = "invoice_in", invoiceKind = "paper_special", nonDeductibleReason = "exempt" });
        Assert.Equal(HttpStatusCode.OK, created.StatusCode);

        var resp = await Client.GetAsync("/api/invoices");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        var row = json.GetProperty("data").EnumerateArray()
            .First(e => e.GetProperty("name").GetString() == "暴露校验");
        Assert.Equal("exempt", row.GetProperty("non_deductible_reason").GetString());
    }
}
