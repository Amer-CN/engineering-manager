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
/// T7a 反过账：posted → draft，原因必填（≤200）、审计 warning、分录保留；073 触发器只放行
/// 「posted→draft + 业务字段不变 + 清空过账标记」，改分录/改金额/删凭证仍被拒。
/// </summary>
public class VoucherUnpostTests : ApiTestBase
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
        var salt = $"t7a-{id}-salt-123456";
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

    private async Task<long> CreateInvoiceAsync(string? issueDate = "2026-05-18")
    {
        var resp = await Client.PostAsJsonAsync("/api/invoices", new
        {
            name = $"反过账测试-{Guid.NewGuid():N}",
            amount = 1060m, priceAmount = 1000m, taxAmount = 60m, taxRate = 0.06,
            status = "issued", type = "invoice_out", invoiceKind = "paper_special",
            invoiceMedium = "paper", invoiceCategory = "special", issueDate
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

    private async Task<(long Id, string VoucherNo)> CreatePostedAsync()
    {
        var invoiceId = await CreateInvoiceAsync();
        var id = await CreateDraftAsync(invoiceId);
        var resp = await Client.PostAsync($"/api/vouchers/{id}/post", null);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var voucherNo = Scalar<string>("SELECT [voucher_no] FROM [vouchers] WHERE [id]=@Id", new { Id = id });
        return (id, voucherNo);
    }

    private async Task<HttpResponseMessage> UnpostAsync(long id, string? reason = "月末调整")
    {
        object body = reason == null ? new { } : new { reason };
        return await Client.PostAsJsonAsync($"/api/vouchers/{id}/unpost", body);
    }

    private static async Task<string> ReadError(HttpResponseMessage resp)
    {
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.TryGetProperty("error", out var e) ? e.GetString() ?? "" : "";
    }

    private T Scalar<T>(string sql, object? param = null)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.ExecuteScalar<T>(sql, param)!;
    }

    private void Execute(string sql, object? param = null)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        conn.Execute(sql, param);
    }

    [Fact]
    public async Task Unpost_PostedVoucher_ReturnsDraft_WithAudit()
    {
        await AuthAdminAsync();
        var (id, voucherNo) = await CreatePostedAsync();

        var data = await ReadData(await UnpostAsync(id, "客户发票信息有误"));

        Assert.Equal(id, data.GetProperty("id").GetInt64());
        Assert.Equal(voucherNo, data.GetProperty("voucherNo").GetString());
        Assert.Equal("draft", data.GetProperty("status").GetString());

        // 状态回草稿、过账标记清空、分录保留
        Assert.Equal("draft", Scalar<string>("SELECT [status] FROM [vouchers] WHERE [id]=@Id", new { Id = id }));
        Assert.Null(Scalar<string?>("SELECT [posted_at] FROM [vouchers] WHERE [id]=@Id", new { Id = id }));
        Assert.Null(Scalar<string?>("SELECT [posted_by] FROM [vouchers] WHERE [id]=@Id", new { Id = id }));
        Assert.Equal(3L, Scalar<long>("SELECT COUNT(*) FROM [voucher_entries] WHERE [voucher_id]=@Id", new { Id = id }));

        // 审计：warning + 原因 + 原过账信息
        Assert.Equal(1L, Scalar<long>(
            "SELECT COUNT(*) FROM [audit_logs] WHERE [action]='voucher.unpost' AND [level]='warning' AND [resource_id]=@Id",
            new { Id = id.ToString() }));
        var details = Scalar<string>(
            "SELECT [details] FROM [audit_logs] WHERE [action]='voucher.unpost' AND [resource_id]=@Id ORDER BY [id] DESC LIMIT 1",
            new { Id = id.ToString() });
        Assert.Contains("客户发票信息有误", details);
        Assert.Contains(voucherNo, details);
    }

    [Fact]
    public async Task Unpost_WithoutReason_Returns400()
    {
        await AuthAdminAsync();
        var (id, _) = await CreatePostedAsync();

        var resp = await UnpostAsync(id, null);
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("原因", await ReadError(resp));
        Assert.Equal("posted", Scalar<string>("SELECT [status] FROM [vouchers] WHERE [id]=@Id", new { Id = id }));
    }

    [Fact]
    public async Task Unpost_ReasonTooLong_Returns400()
    {
        await AuthAdminAsync();
        var (id, _) = await CreatePostedAsync();

        var resp = await UnpostAsync(id, new string('调', 201));
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("200", await ReadError(resp));
    }

    [Fact]
    public async Task Unpost_DraftVoucher_Returns400()
    {
        await AuthAdminAsync();
        var invoiceId = await CreateInvoiceAsync();
        var id = await CreateDraftAsync(invoiceId);

        var resp = await UnpostAsync(id);
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("仅已过账", await ReadError(resp));
    }

    [Fact]
    public async Task Unpost_Nonexistent_Returns404()
    {
        await AuthAdminAsync();
        var resp = await UnpostAsync(999999);
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    [Fact]
    public async Task Unpost_Worker_Returns403()
    {
        await AuthAdminAsync();
        var (id, _) = await CreatePostedAsync();

        SeedUser("t7a-worker", "t7a-worker", "worker");
        SetAuth(await LoginAsync("t7a-worker"));

        var resp = await UnpostAsync(id);
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        Assert.Equal("posted", Scalar<string>("SELECT [status] FROM [vouchers] WHERE [id]=@Id", new { Id = id }));
    }

    [Fact]
    public async Task Unpost_AnotherUser_Returns403()
    {
        await AuthAdminAsync();
        var (id, _) = await CreatePostedAsync();

        SeedUser("2", "t7a-acc1", "accountant");
        SetAuth(await LoginAsync("t7a-acc1"));

        var resp = await UnpostAsync(id);
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        Assert.Equal("posted", Scalar<string>("SELECT [status] FROM [vouchers] WHERE [id]=@Id", new { Id = id }));
    }

    [Fact]
    public async Task Unpost_ThenDeleteDraft_Works()
    {
        await AuthAdminAsync();
        var (id, _) = await CreatePostedAsync();
        Assert.Equal(HttpStatusCode.OK, (await UnpostAsync(id)).StatusCode);

        var del = await Client.DeleteAsync($"/api/vouchers/{id}");
        Assert.Equal(HttpStatusCode.OK, del.StatusCode);
        Assert.Equal(0L, Scalar<long>("SELECT COUNT(*) FROM [vouchers] WHERE [id]=@Id", new { Id = id }));
    }

    [Fact]
    public async Task Unpost_ThenRepost_Works()
    {
        await AuthAdminAsync();
        var (id, _) = await CreatePostedAsync();
        Assert.Equal(HttpStatusCode.OK, (await UnpostAsync(id)).StatusCode);

        var resp = await Client.PostAsync($"/api/vouchers/{id}/post", null);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal("posted", Scalar<string>("SELECT [status] FROM [vouchers] WHERE [id]=@Id", new { Id = id }));
    }

    [Fact]
    public async Task Trigger_RejectsRawStatusFlip_WithoutClearingPostedMarkers()
    {
        await AuthAdminAsync();
        var (id, _) = await CreatePostedAsync();

        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        // 只把 status 改回 draft、不清过账标记：触发器必须拒绝（防止绕过 API 的反过账）
        Assert.Throws<SqliteException>(() => conn.Execute(
            "UPDATE [vouchers] SET [status]='draft' WHERE [id]=@Id", new { Id = id }));
        Assert.Equal("posted", Scalar<string>("SELECT [status] FROM [vouchers] WHERE [id]=@Id", new { Id = id }));
    }

    [Fact]
    public async Task Trigger_RejectsUnpostThatChangesAmounts()
    {
        await AuthAdminAsync();
        var (id, _) = await CreatePostedAsync();

        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        // 反过账同时改金额：触发器必须拒绝
        Assert.Throws<SqliteException>(() => conn.Execute(
            @"UPDATE [vouchers] SET [status]='draft',[posted_at]=NULL,[posted_by]=NULL,
                     [total_debit_fen]=[total_debit_fen]+1
              WHERE [id]=@Id", new { Id = id }));
        Assert.Equal("posted", Scalar<string>("SELECT [status] FROM [vouchers] WHERE [id]=@Id", new { Id = id }));
    }

    [Fact]
    public async Task Trigger_RejectsEntryMutationWhilePosted()
    {
        await AuthAdminAsync();
        var (id, _) = await CreatePostedAsync();

        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        Assert.Throws<SqliteException>(() => conn.Execute(
            "UPDATE [voucher_entries] SET [amount_fen]=[amount_fen]+1 WHERE [voucher_id]=@Id", new { Id = id }));
    }

    private static async Task<JsonElement> ReadData(HttpResponseMessage resp)
    {
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("data");
    }
}
