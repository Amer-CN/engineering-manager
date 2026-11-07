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
/// T7c 期间锁定：仅 admin 可锁定/解锁（审计 warning）；锁定期间禁止新增凭证、过账、反过账、
/// 删除草稿、保存期初余额；解锁后恢复。
/// </summary>
public class VoucherPeriodLockTests : ApiTestBase
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
        var salt = $"t7c-{id}-salt-123456";
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
            name = $"期间锁定测试-{Guid.NewGuid():N}",
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

    private async Task<long> CreatePostedAsync()
    {
        var invoiceId = await CreateInvoiceAsync();
        var id = await CreateDraftAsync(invoiceId);
        Assert.Equal(HttpStatusCode.OK, (await Client.PostAsync($"/api/vouchers/{id}/post", null)).StatusCode);
        return id;
    }

    private async Task<HttpResponseMessage> LockAsync(string period, string? reason = "月末结账") =>
        await Client.PostAsJsonAsync($"/api/period-locks/{period}/lock", new { reason });

    private async Task<HttpResponseMessage> UnlockAsync(string period, string? reason = "需要调整") =>
        await Client.PostAsJsonAsync($"/api/period-locks/{period}/unlock", new { reason });

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

    [Fact]
    public async Task LockAndUnlock_Admin_Succeeds_WithAudit()
    {
        await AuthAdminAsync();
        Assert.Equal(HttpStatusCode.OK, (await LockAsync("202605")).StatusCode);

        var locked = await ReadData(await Client.GetAsync("/api/period-locks"));
        Assert.Single(locked.EnumerateArray());
        Assert.Equal("202605", locked[0].GetProperty("period").GetString());
        Assert.Equal(1L, Scalar<long>("SELECT COUNT(*) FROM [audit_logs] WHERE [action]='period.lock' AND [level]='warning'"));

        Assert.Equal(HttpStatusCode.OK, (await UnlockAsync("202605")).StatusCode);
        var after = await ReadData(await Client.GetAsync("/api/period-locks"));
        Assert.Empty(after.EnumerateArray());
        Assert.Equal(1L, Scalar<long>("SELECT COUNT(*) FROM [audit_logs] WHERE [action]='period.unlock' AND [level]='warning'"));
    }

    [Fact]
    public async Task LockAndUnlock_Accountant_Returns403()
    {
        SeedUser("t7c-acc", "t7c-acc", "accountant");
        SetAuth(await LoginAsync("t7c-acc"));

        Assert.Equal(HttpStatusCode.Forbidden, (await LockAsync("202605")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await UnlockAsync("202605")).StatusCode);
    }

    [Fact]
    public async Task Worker_GetLockList_Returns403()
    {
        SeedUser("t7c-worker", "t7c-worker", "worker");
        SetAuth(await LoginAsync("t7c-worker"));
        Assert.Equal(HttpStatusCode.Forbidden, (await Client.GetAsync("/api/period-locks")).StatusCode);
    }

    [Fact]
    public async Task Lock_InvalidPeriod_Returns400()
    {
        await AuthAdminAsync();
        Assert.Equal(HttpStatusCode.BadRequest, (await LockAsync("2026-05")).StatusCode);
    }

    [Fact]
    public async Task Lock_AlreadyLocked_Returns400_AndUnlockUnlocked_Returns400()
    {
        await AuthAdminAsync();
        Assert.Equal(HttpStatusCode.OK, (await LockAsync("202605")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await LockAsync("202605")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await UnlockAsync("202605")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await UnlockAsync("202605")).StatusCode);
    }

    [Fact]
    public async Task LockedPeriod_Blocks_CreateDraft_AndUnlockRestores()
    {
        await AuthAdminAsync();
        var invoiceId = await CreateInvoiceAsync();
        Assert.Equal(HttpStatusCode.OK, (await LockAsync("202605")).StatusCode);

        var blocked = await Client.PostAsJsonAsync("/api/vouchers/from-invoice", new { invoiceId });
        Assert.Equal(HttpStatusCode.BadRequest, blocked.StatusCode);
        Assert.Contains("已锁定", await ReadError(blocked));

        Assert.Equal(HttpStatusCode.OK, (await UnlockAsync("202605")).StatusCode);
        var ok = await Client.PostAsJsonAsync("/api/vouchers/from-invoice", new { invoiceId });
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);
    }

    [Fact]
    public async Task LockedPeriod_Blocks_Post_AndUnlockRestores()
    {
        await AuthAdminAsync();
        var invoiceId = await CreateInvoiceAsync();
        var id = await CreateDraftAsync(invoiceId);
        Assert.Equal(HttpStatusCode.OK, (await LockAsync("202605")).StatusCode);

        var blocked = await Client.PostAsync($"/api/vouchers/{id}/post", null);
        Assert.Equal(HttpStatusCode.BadRequest, blocked.StatusCode);
        Assert.Contains("已锁定", await ReadError(blocked));

        Assert.Equal(HttpStatusCode.OK, (await UnlockAsync("202605")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Client.PostAsync($"/api/vouchers/{id}/post", null)).StatusCode);
    }

    [Fact]
    public async Task LockedPeriod_Blocks_Unpost()
    {
        await AuthAdminAsync();
        var id = await CreatePostedAsync();
        Assert.Equal(HttpStatusCode.OK, (await LockAsync("202605")).StatusCode);

        var blocked = await Client.PostAsJsonAsync($"/api/vouchers/{id}/unpost", new { reason = "调整" });
        Assert.Equal(HttpStatusCode.BadRequest, blocked.StatusCode);
        Assert.Contains("已锁定", await ReadError(blocked));
        Assert.Equal("posted", Scalar<string>("SELECT [status] FROM [vouchers] WHERE [id]=@Id", new { Id = id }));
    }

    [Fact]
    public async Task LockedPeriod_Blocks_DeleteDraft()
    {
        await AuthAdminAsync();
        var invoiceId = await CreateInvoiceAsync();
        var id = await CreateDraftAsync(invoiceId);
        Assert.Equal(HttpStatusCode.OK, (await LockAsync("202605")).StatusCode);

        var blocked = await Client.DeleteAsync($"/api/vouchers/{id}");
        Assert.Equal(HttpStatusCode.BadRequest, blocked.StatusCode);
        Assert.Equal(1L, Scalar<long>("SELECT COUNT(*) FROM [vouchers] WHERE [id]=@Id", new { Id = id }));
    }

    [Fact]
    public async Task LockedPeriod_Blocks_OpeningBalanceSave()
    {
        await AuthAdminAsync();
        Assert.Equal(HttpStatusCode.OK, (await LockAsync("202605")).StatusCode);

        var resp = await Client.PutAsJsonAsync("/api/opening-balances?period=202605", new
        {
            rows = new object[]
            {
                new { accountCode = "1001", accountName = "库存现金", debit = 100m, credit = 0m },
                new { accountCode = "2001", accountName = "短期借款", debit = 0m, credit = 100m },
            }
        });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("已锁定", await ReadError(resp));
        Assert.Equal(0L, Scalar<long>("SELECT COUNT(*) FROM [opening_balances]"));
    }

    private static async Task<JsonElement> ReadData(HttpResponseMessage resp)
    {
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("data");
    }
}