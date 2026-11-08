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
/// 凭证期间汇总（只读）：张数/草稿/已过账/借贷合计（元）+ 与列表同口径可见性。
/// 口径：库内分，响应元；借贷不等时 balanced=false。
/// </summary>
public class VoucherSummaryTests : ApiTestBase
{
    private const string Password = "admin123";

    private async Task<string> LoginAsync(string username)
    {
        var resp = await Client.PostAsJsonAsync("/api/auth/login", new { username, password = Password });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("data").GetProperty("token").GetString()!;
    }

    private void SetAuth(string token) =>
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private async Task AuthAdminAsync() => SetAuth(await LoginAsync("admin"));

    private void SeedUser(string id, string username, string roleId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var salt = $"t6s-{id}-salt-123456";
        var hash = EngineeringManager.Api.Common.HashPassword(Password, salt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO [users]
            (id,username,password,password_hash,password_salt,password_hash_version,display_name,role_id,status,created_at)
            VALUES (@Id,@Username,@Password,@Hash,@Salt,2,@DisplayName,@RoleId,'active',@Now)",
            new
            {
                Id = id, Username = username, Password, Hash = hash, Salt = salt,
                DisplayName = username, RoleId = roleId, Now = "2026-05-01 00:00:00"
            });
    }

    private async Task<long> CreateInvoiceAsync(decimal amount = 1060m, decimal price = 1000m,
        decimal tax = 60m, string? issueDate = "2026-05-18")
    {
        var resp = await Client.PostAsJsonAsync("/api/invoices", new
        {
            name = $"汇总测试-{Guid.NewGuid():N}",
            amount,
            priceAmount = price,
            taxAmount = tax,
            taxRate = 0.06,
            status = "issued",
            type = "invoice_out",
            invoiceKind = "paper_special",
            invoiceMedium = "paper",
            invoiceCategory = "special",
            issueDate
        });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("data").GetInt64();
    }

    private async Task<long> CreateDraftAsync(long invoiceId)
    {
        var resp = await Client.PostAsJsonAsync("/api/vouchers/from-invoice", new { invoiceId });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("data").GetProperty("id").GetInt64();
    }

    private async Task<JsonElement> SummaryAsync(string? period = null)
    {
        var url = period == null ? "/api/vouchers/summary" : $"/api/vouchers/summary?period={period}";
        var resp = await Client.GetAsync(url);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("data");
    }

    private void Execute(string sql, object? param = null)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        conn.Execute(sql, param);
    }

    [Fact]
    public async Task Summary_Empty_ReturnsZeros()
    {
        await AuthAdminAsync();
        var data = await SummaryAsync("202605");

        Assert.Equal(0, data.GetProperty("totalCount").GetInt32());
        Assert.Equal(0, data.GetProperty("draftCount").GetInt32());
        Assert.Equal(0, data.GetProperty("postedCount").GetInt32());
        Assert.Equal(0m, data.GetProperty("totalDebit").GetDecimal());
        Assert.Equal(0m, data.GetProperty("totalCredit").GetDecimal());
        Assert.True(data.GetProperty("balanced").GetBoolean());
    }

    [Fact]
    public async Task Summary_CountsAndTotals_ByPeriod()
    {
        await AuthAdminAsync();
        var inv1 = await CreateInvoiceAsync();
        var inv2 = await CreateInvoiceAsync();
        var inv3 = await CreateInvoiceAsync();
        await CreateDraftAsync(inv1);
        await CreateDraftAsync(inv2);
        var postedId = await CreateDraftAsync(inv3);
        Assert.Equal(HttpStatusCode.OK, (await Client.PostAsync($"/api/vouchers/{postedId}/post", null)).StatusCode);

        var data = await SummaryAsync("202605");
        Assert.Equal(3, data.GetProperty("totalCount").GetInt32());
        Assert.Equal(2, data.GetProperty("draftCount").GetInt32());
        Assert.Equal(1, data.GetProperty("postedCount").GetInt32());
        Assert.Equal(3180m, data.GetProperty("totalDebit").GetDecimal());
        Assert.Equal(3180m, data.GetProperty("totalCredit").GetDecimal());
        Assert.True(data.GetProperty("balanced").GetBoolean());
    }

    [Fact]
    public async Task Summary_PeriodFilter_OnlyCountsThatPeriod()
    {
        await AuthAdminAsync();
        var may = await CreateInvoiceAsync(issueDate: "2026-05-18");
        var june = await CreateInvoiceAsync(issueDate: "2026-06-18");
        await CreateDraftAsync(may);
        await CreateDraftAsync(june);

        var mayData = await SummaryAsync("202605");
        Assert.Equal(1, mayData.GetProperty("totalCount").GetInt32());
        Assert.Equal(1060m, mayData.GetProperty("totalDebit").GetDecimal());

        var juneData = await SummaryAsync("202606");
        Assert.Equal(1, juneData.GetProperty("totalCount").GetInt32());
    }

    [Fact]
    public async Task Summary_Unbalanced_Voucher_ReturnsBalancedFalse()
    {
        await AuthAdminAsync();
        var invoiceId = await CreateInvoiceAsync();
        var voucherId = await CreateDraftAsync(invoiceId);

        // 模拟数据异常（仅 draft 可改）：借方合计 +1 分
        Execute("UPDATE [vouchers] SET [total_debit_fen]=[total_debit_fen]+1 WHERE [id]=@Id", new { Id = voucherId });

        var data = await SummaryAsync("202605");
        Assert.Equal(1060.01m, data.GetProperty("totalDebit").GetDecimal());
        Assert.Equal(1060m, data.GetProperty("totalCredit").GetDecimal());
        Assert.False(data.GetProperty("balanced").GetBoolean());
    }

    [Fact]
    public async Task Summary_InvalidPeriod_Returns400()
    {
        await AuthAdminAsync();
        var resp = await Client.GetAsync("/api/vouchers/summary?period=2026-05");
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    [Fact]
    public async Task Summary_Worker_Returns403()
    {
        SeedUser("t6s-worker", "t6s-worker", "worker");
        SetAuth(await LoginAsync("t6s-worker"));

        var resp = await Client.GetAsync("/api/vouchers/summary");
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Summary_AnotherUserWithoutProjectAuth_SeesZero()
    {
        await AuthAdminAsync();
        var invoiceId = await CreateInvoiceAsync();
        await CreateDraftAsync(invoiceId);

        SeedUser("2", "t6s-acc1", "accountant");
        SetAuth(await LoginAsync("t6s-acc1"));

        var data = await SummaryAsync("202605");
        Assert.Equal(0, data.GetProperty("totalCount").GetInt32());
        Assert.Equal(0m, data.GetProperty("totalDebit").GetDecimal());
    }

    [Fact]
    public async Task Summary_DeletedInvoice_IsExcluded()
    {
        await AuthAdminAsync();
        var invoiceId = await CreateInvoiceAsync();
        await CreateDraftAsync(invoiceId);
        Execute("UPDATE [invoices] SET [deleted_at]=@Now WHERE [id]=@Id",
            new { Id = invoiceId, Now = "2026-05-20 00:00:00" });

        var data = await SummaryAsync("202605");
        Assert.Equal(0, data.GetProperty("totalCount").GetInt32());
    }
}