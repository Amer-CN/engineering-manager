using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Dapper;
using EngineeringManager.Tests.Common;
using Microsoft.Data.Sqlite;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// T7：申报数据准备——按期间进项/销项汇总与 CSV 导出。
/// 只做数据准备，不做申报表计算；导出首行必须标注「非申报表」。
/// </summary>
public class TaxSummaryTests : ApiTestBase
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

    private async Task<long> CreateInvoiceAsync(string type, decimal price, decimal tax, string issueDate)
    {
        var resp = await Client.PostAsJsonAsync("/api/invoices", new
        {
            name = $"税汇总-{Guid.NewGuid():N}",
            amount = price + tax,
            priceAmount = price,
            taxAmount = tax,
            taxRate = price > 0 ? (double)Math.Round(tax / price, 4) : 0,
            status = "issued",
            type,
            invoiceKind = "paper_special",
            invoiceMedium = "paper",
            invoiceCategory = "special",
            issueDate
        });
        Assert.True(resp.StatusCode == HttpStatusCode.OK, await resp.Content.ReadAsStringAsync());
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("data").GetInt64();
    }

    private string GetInvoiceNo(long id)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.ExecuteScalar<string>("SELECT [invoice_no] FROM [invoices] WHERE [id]=@Id", new { Id = id }) ?? "";
    }

    private async Task<JsonElement> GetSummaryAsync(string query)
    {
        var resp = await Client.GetAsync($"/api/reports/tax-summary{query}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        return (await resp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
    }

    [Fact]
    public async Task Summary_AggregatesInputAndOutput()
    {
        await AuthAdminAsync();
        await CreateInvoiceAsync("invoice_in", 1000m, 60m, "2026-10-05");
        await CreateInvoiceAsync("invoice_in", 500m, 30m, "2026-10-06");
        await CreateInvoiceAsync("invoice_out", 2000m, 120m, "2026-10-07");

        var data = await GetSummaryAsync("?period=2026-10");
        Assert.Equal("2026-10", data.GetProperty("period").GetString());

        var input = data.GetProperty("input");
        Assert.Equal(2, input.GetProperty("count").GetInt32());
        Assert.Equal(1500m, input.GetProperty("priceAmount").GetDecimal());
        Assert.Equal(90m, input.GetProperty("taxAmount").GetDecimal());
        Assert.Equal(1590m, input.GetProperty("totalAmount").GetDecimal());

        var output = data.GetProperty("output");
        Assert.Equal(1, output.GetProperty("count").GetInt32());
        Assert.Equal(2000m, output.GetProperty("priceAmount").GetDecimal());
        Assert.Equal(120m, output.GetProperty("taxAmount").GetDecimal());

        Assert.Contains("非申报表", data.GetProperty("note").GetString());
    }

    [Fact]
    public async Task Summary_ExcludesVoidedRedFlushedAndDeleted()
    {
        await AuthAdminAsync();
        var keep = await CreateInvoiceAsync("invoice_out", 1000m, 60m, "2026-11-02");
        var cancelled = await CreateInvoiceAsync("invoice_out", 500m, 30m, "2026-11-03");
        var redFlushed = await CreateInvoiceAsync("invoice_out", 700m, 42m, "2026-11-04");
        var deleted = await CreateInvoiceAsync("invoice_out", 900m, 54m, "2026-11-05");

        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Open();
            conn.Execute("UPDATE [invoices] SET [status]='cancelled' WHERE [id]=@Id", new { Id = cancelled });
            conn.Execute("UPDATE [invoices] SET [status]='red_flushed' WHERE [id]=@Id", new { Id = redFlushed });
            conn.Execute("UPDATE [invoices] SET [deleted_at]=datetime('now') WHERE [id]=@Id", new { Id = deleted });
        }

        var data = await GetSummaryAsync("?period=2026-11");
        var output = data.GetProperty("output");
        Assert.Equal(1, output.GetProperty("count").GetInt32());
        Assert.Equal(1060m, output.GetProperty("totalAmount").GetDecimal());
        Assert.True(keep > 0);
    }

    [Theory]
    [InlineData("")]
    [InlineData("?period=")]
    [InlineData("?period=2026-13")]
    [InlineData("?period=202610")]
    public async Task Summary_InvalidPeriod_Returns400(string query)
    {
        await AuthAdminAsync();
        var resp = await Client.GetAsync($"/api/reports/tax-summary{query}");
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    [Fact]
    public async Task Export_ReturnsCsvWithBomNoteHeaderAndTotals()
    {
        await AuthAdminAsync();
        var inId = await CreateInvoiceAsync("invoice_in", 1000m, 60m, "2026-10-05");
        var outId = await CreateInvoiceAsync("invoice_out", 2000m, 120m, "2026-10-07");
        var inNo = GetInvoiceNo(inId);
        var outNo = GetInvoiceNo(outId);

        var resp = await Client.GetAsync("/api/reports/tax-summary/export?period=2026-10");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal("text/csv", resp.Content.Headers.ContentType?.MediaType);

        var bytes = await resp.Content.ReadAsByteArrayAsync();
        // UTF-8 BOM
        Assert.True(bytes.Length > 3 && bytes[0] == 0xEF && bytes[1] == 0xBB && bytes[2] == 0xBF);

        var text = System.Text.Encoding.UTF8.GetString(bytes).TrimStart('\uFEFF');
        var lines = text.Split('\n').Select(l => l.TrimEnd('\r')).ToList();

        Assert.Contains("非申报表", lines[0]);
        Assert.Contains("方向", lines[1]);
        Assert.Contains(lines, l => l.Contains(inNo) && l.Contains("进项"));
        Assert.Contains(lines, l => l.Contains(outNo) && l.Contains("销项"));
        Assert.Contains(lines, l => l.StartsWith("2026-10,合计-进项"));
        Assert.Contains(lines, l => l.StartsWith("2026-10,合计-销项"));
        // 进项合计 1000.00 / 60.00 / 1060.00
        Assert.Contains(lines, l => l.StartsWith("2026-10,合计-进项") && l.Contains("1000.00") && l.Contains("60.00") && l.Contains("1060.00"));
    }

    [Fact]
    public async Task Export_KeepsCentPrecision()
    {
        await AuthAdminAsync();
        await CreateInvoiceAsync("invoice_in", 0.01m, 0.01m, "2026-12-01");

        var resp = await Client.GetAsync("/api/reports/tax-summary/export?period=2026-12");
        var text = System.Text.Encoding.UTF8.GetString(await resp.Content.ReadAsByteArrayAsync()).TrimStart('\uFEFF');
        // 发票号码可能为空（未填），按「方向 + 金额」定位数据行
        var row = text.Split('\n').First(l => l.Contains(",进项,") && l.Contains("0.01"));
        Assert.Contains("0.02", row);   // 价税合计 = 0.01 + 0.01
    }
}
