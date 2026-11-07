using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Dapper;
using EngineeringManager.Api.Migrations;
using EngineeringManager.Tests.Common;
using Microsoft.Data.Sqlite;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// T6b：凭证过账（draft → posted）。
/// 覆盖：过账成功（status/posted_at/posted_by/审计）、重复过账 400、不存在 404、
/// worker 403、accountant 本人过账 200、跨人过账 403、已过账不可删、
/// 分录被篡改 400、源发票已删 400、触发器兜底（posted 不可改/不可删）、并发双过账只成功一次。
/// 口径：库内金额 long 分；响应 totalDebit/totalCredit/amount 为元；凭证号 记-YYYYMM-#### 不变。
/// </summary>
public class VoucherPostTests : ApiTestBase
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
        var salt = $"t6b-{id}-salt-123456";
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
            name = $"凭证过账测试-{Guid.NewGuid():N}",
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

    private async Task<JsonElement> CreateDraftAsync(long invoiceId)
    {
        var resp = await Client.PostAsJsonAsync("/api/vouchers/from-invoice", new { invoiceId });
        return await ReadData(resp);
    }

    private async Task<HttpResponseMessage> PostVoucherAsync(long id) =>
        await Client.PostAsync($"/api/vouchers/{id}/post", null);

    private static async Task<JsonElement> ReadData(HttpResponseMessage resp)
    {
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("data");
    }

    private static async Task<string> ReadError(HttpResponseMessage resp)
    {
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.TryGetProperty("error", out var e) ? e.GetString() ?? "" : "";
    }

    private long Count(string sql, object? param = null)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.ExecuteScalar<long>(sql, param);
    }

    private void Execute(string sql, object? param = null)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        conn.Execute(sql, param);
    }

    private T Scalar<T>(string sql, object? param = null)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.ExecuteScalar<T>(sql, param)!;
    }

    // 1. 过账成功：status/posted_at/posted_by/审计/凭证号不变/号段不变
    [Fact]
    public async Task PostDraft_TransitionsToPosted_WritesAuditAndTimestamps()
    {
        await AuthAdminAsync();
        var invoiceId = await CreateInvoiceAsync();
        var draft = await CreateDraftAsync(invoiceId);
        var voucherId = draft.GetProperty("id").GetInt64();
        var voucherNo = draft.GetProperty("voucherNo").GetString();

        var data = await ReadData(await PostVoucherAsync(voucherId));

        Assert.Equal(voucherId, data.GetProperty("id").GetInt64());
        Assert.Equal(voucherNo, data.GetProperty("voucherNo").GetString());
        Assert.Equal("posted", data.GetProperty("status").GetString());
        Assert.Matches(@"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$", data.GetProperty("postedAt").GetString());

        // 库内状态与时间戳
        Assert.Equal("posted", Scalar<string>("SELECT [status] FROM [vouchers] WHERE [id]=@Id", new { Id = voucherId }));
        Assert.False(string.IsNullOrWhiteSpace(
            Scalar<string>("SELECT [posted_at] FROM [vouchers] WHERE [id]=@Id", new { Id = voucherId })));
        Assert.Equal("1", Scalar<string>("SELECT [posted_by] FROM [vouchers] WHERE [id]=@Id", new { Id = voucherId }));

        // 凭证号不变、号段不被过账消耗
        Assert.Equal(voucherNo, Scalar<string>("SELECT [voucher_no] FROM [vouchers] WHERE [id]=@Id", new { Id = voucherId }));
        Assert.Equal(2L, Scalar<long>("SELECT [next_no] FROM [voucher_sequences] WHERE [period]='202605'"));

        // 审计同事务落库
        Assert.Equal(1L, Count(
            "SELECT COUNT(*) FROM [audit_logs] WHERE [action]='voucher.post' AND [resource]='vouchers' AND [resource_id]=@Id",
            new { Id = voucherId.ToString() }));

        // 列表返回 posted + postedAt/postedBy
        var list = await ReadData(await Client.GetAsync("/api/vouchers?period=202605"));
        var row = list.EnumerateArray().Single(v => v.GetProperty("id").GetInt64() == voucherId);
        Assert.Equal("posted", row.GetProperty("status").GetString());
        Assert.False(string.IsNullOrWhiteSpace(row.GetProperty("postedAt").GetString()));
        Assert.Equal("1", row.GetProperty("postedBy").GetString());
    }

    // 2. 重复过账 → 400；审计不重复
    [Fact]
    public async Task PostDraft_Again_Returns400_AndNoSecondAudit()
    {
        await AuthAdminAsync();
        var invoiceId = await CreateInvoiceAsync();
        var draft = await CreateDraftAsync(invoiceId);
        var voucherId = draft.GetProperty("id").GetInt64();

        Assert.Equal(HttpStatusCode.OK, (await PostVoucherAsync(voucherId)).StatusCode);

        var again = await PostVoucherAsync(voucherId);
        Assert.Equal(HttpStatusCode.BadRequest, again.StatusCode);
        Assert.Contains("仅草稿凭证可过账", await ReadError(again));

        Assert.Equal(1L, Count("SELECT COUNT(*) FROM [audit_logs] WHERE [action]='voucher.post'"));
        Assert.Equal("posted", Scalar<string>("SELECT [status] FROM [vouchers] WHERE [id]=@Id", new { Id = voucherId }));
    }

    // 3. 不存在 → 404
    [Fact]
    public async Task Post_Nonexistent_Returns404()
    {
        await AuthAdminAsync();
        var resp = await PostVoucherAsync(999999);
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    // 4. worker 无 vouchers:approve → 403，且不改变状态
    [Fact]
    public async Task Post_Worker_Returns403()
    {
        await AuthAdminAsync();
        var invoiceId = await CreateInvoiceAsync();
        var draft = await CreateDraftAsync(invoiceId);
        var voucherId = draft.GetProperty("id").GetInt64();

        SeedUser("t6b-worker", "t6b-worker", "worker");
        SetAuth(await LoginAsync("t6b-worker"));

        var resp = await PostVoucherAsync(voucherId);
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        Assert.Equal("draft", Scalar<string>("SELECT [status] FROM [vouchers] WHERE [id]=@Id", new { Id = voucherId }));
        Assert.Equal(0L, Count("SELECT COUNT(*) FROM [audit_logs] WHERE [action]='voucher.post'"));
    }

    // 5. accountant 默认权限含 vouchers:approve，本人草稿可过账
    [Fact]
    public async Task Post_AccountantOwnDraft_Returns200()
    {
        SeedUser("t6b-acc", "t6b-acc", "accountant");
        SetAuth(await LoginAsync("t6b-acc"));

        var invoiceId = await CreateInvoiceAsync();
        var draft = await CreateDraftAsync(invoiceId);
        var voucherId = draft.GetProperty("id").GetInt64();

        var data = await ReadData(await PostVoucherAsync(voucherId));
        Assert.Equal("posted", data.GetProperty("status").GetString());
        Assert.Equal("t6b-acc", Scalar<string>("SELECT [posted_by] FROM [vouchers] WHERE [id]=@Id", new { Id = voucherId }));
    }

    // 6. 跨人过账（有权限但非本人/非授权项目）→ 403
    [Fact]
    public async Task Post_AnotherUsersDraft_Returns403()
    {
        await AuthAdminAsync();
        var invoiceId = await CreateInvoiceAsync();
        var draft = await CreateDraftAsync(invoiceId);
        var voucherId = draft.GetProperty("id").GetInt64();

        SeedUser("2", "t6b-acc1", "accountant");
        SetAuth(await LoginAsync("t6b-acc1"));

        var resp = await PostVoucherAsync(voucherId);
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        Assert.Equal("draft", Scalar<string>("SELECT [status] FROM [vouchers] WHERE [id]=@Id", new { Id = voucherId }));
    }

    // 7. 已过账凭证不可删除（端点 400）
    [Fact]
    public async Task Delete_PostedVoucher_Returns400()
    {
        await AuthAdminAsync();
        var invoiceId = await CreateInvoiceAsync();
        var draft = await CreateDraftAsync(invoiceId);
        var voucherId = draft.GetProperty("id").GetInt64();
        Assert.Equal(HttpStatusCode.OK, (await PostVoucherAsync(voucherId)).StatusCode);

        var resp = await Client.DeleteAsync($"/api/vouchers/{voucherId}");
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("仅草稿", await ReadError(resp));
        Assert.Equal(1L, Count("SELECT COUNT(*) FROM [vouchers] WHERE [id]=@Id", new { Id = voucherId }));
    }

    // 8. 分录被篡改（借贷不平衡）→ 400，且不过账
    [Fact]
    public async Task Post_UnbalancedDraft_Returns400()
    {
        await AuthAdminAsync();
        var invoiceId = await CreateInvoiceAsync();
        var draft = await CreateDraftAsync(invoiceId);
        var voucherId = draft.GetProperty("id").GetInt64();

        Execute("UPDATE [voucher_entries] SET [amount_fen]=[amount_fen]+1 WHERE [voucher_id]=@Id AND [line_no]=1",
            new { Id = voucherId });

        var resp = await PostVoucherAsync(voucherId);
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("不平衡", await ReadError(resp));
        Assert.Equal("draft", Scalar<string>("SELECT [status] FROM [vouchers] WHERE [id]=@Id", new { Id = voucherId }));
    }

    // 9. 源发票已软删 → 400
    [Fact]
    public async Task Post_DeletedSourceInvoice_Returns400()
    {
        await AuthAdminAsync();
        var invoiceId = await CreateInvoiceAsync();
        var draft = await CreateDraftAsync(invoiceId);
        var voucherId = draft.GetProperty("id").GetInt64();

        Execute("UPDATE [invoices] SET [deleted_at]=@Now WHERE [id]=@Id",
            new { Id = invoiceId, Now = "2026-05-20 10:00:00" });

        var resp = await PostVoucherAsync(voucherId);
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("源发票已删除", await ReadError(resp));
        Assert.Equal("draft", Scalar<string>("SELECT [status] FROM [vouchers] WHERE [id]=@Id", new { Id = voucherId }));
    }

    // 10. 触发器兜底：posted 凭证与分录不可 UPDATE / DELETE（绕过 API 也不行）
    [Fact]
    public async Task Triggers_BlockAnyMutationAfterPosting()
    {
        await AuthAdminAsync();
        var invoiceId = await CreateInvoiceAsync();
        var draft = await CreateDraftAsync(invoiceId);
        var voucherId = draft.GetProperty("id").GetInt64();
        Assert.Equal(HttpStatusCode.OK, (await PostVoucherAsync(voucherId)).StatusCode);

        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();

        // 反过账
        Assert.Throws<SqliteException>(() => conn.Execute(
            "UPDATE [vouchers] SET [status]='draft' WHERE [id]=@Id", new { Id = voucherId }));
        // 改凭证合计
        Assert.Throws<SqliteException>(() => conn.Execute(
            "UPDATE [vouchers] SET [total_debit_fen]=[total_debit_fen]+1 WHERE [id]=@Id", new { Id = voucherId }));
        // 删凭证
        Assert.Throws<SqliteException>(() => conn.Execute(
            "DELETE FROM [vouchers] WHERE [id]=@Id", new { Id = voucherId }));
        // 改分录
        Assert.Throws<SqliteException>(() => conn.Execute(
            "UPDATE [voucher_entries] SET [amount_fen]=[amount_fen]+1 WHERE [voucher_id]=@Id", new { Id = voucherId }));
        // 删分录
        Assert.Throws<SqliteException>(() => conn.Execute(
            "DELETE FROM [voucher_entries] WHERE [voucher_id]=@Id", new { Id = voucherId }));

        // 状态与分录原样
        Assert.Equal("posted", Scalar<string>("SELECT [status] FROM [vouchers] WHERE [id]=@Id", new { Id = voucherId }));
        Assert.Equal(3L, Count("SELECT COUNT(*) FROM [voucher_entries] WHERE [voucher_id]=@Id", new { Id = voucherId }));
        Assert.Equal(106000L, Count("SELECT COALESCE(SUM([amount_fen]),0) FROM [voucher_entries] WHERE [voucher_id]=@Id AND [dc]=1", new { Id = voucherId }));
    }

    // 11. 并发双过账：只能成功一次
    [Fact]
    public async Task Post_ConcurrentTwoRequests_OnlyOneSucceeds()
    {
        await AuthAdminAsync();
        var invoiceId = await CreateInvoiceAsync();
        var draft = await CreateDraftAsync(invoiceId);
        var voucherId = draft.GetProperty("id").GetInt64();

        var t1 = Client.PostAsync($"/api/vouchers/{voucherId}/post", null);
        var t2 = Client.PostAsync($"/api/vouchers/{voucherId}/post", null);
        var resps = await Task.WhenAll(t1, t2);

        Assert.Equal(1, resps.Count(r => r.StatusCode == HttpStatusCode.OK));
        Assert.Equal(1, resps.Count(r => r.StatusCode == HttpStatusCode.BadRequest));
        Assert.Equal(1L, Count("SELECT COUNT(*) FROM [audit_logs] WHERE [action]='voucher.post'"));
        Assert.Equal("posted", Scalar<string>("SELECT [status] FROM [vouchers] WHERE [id]=@Id", new { Id = voucherId }));
    }
}

/// <summary>
/// 072 权限迁移：老库 roles.permissions 追加 vouchers:approve，只追加不重置，重复执行不重复。
/// </summary>
public class VoucherPostPermissionMigrationTests : IDisposable
{
    private readonly string _dbPath;
    private readonly string _connectionString;

    public VoucherPostPermissionMigrationTests()
    {
        _dbPath = Path.Combine(Path.GetTempPath(), $"voucher-post-perm-{Guid.NewGuid()}.db");
        _connectionString = $"Data Source={_dbPath}";
    }

    [Fact]
    public void Migration072_AppendsPostPermission_WithoutResettingExistingCodes()
    {
        MigrationRunner.Run(_connectionString, "072_AddVoucherPostPermission.sql");

        using (var conn = new SqliteConnection(_connectionString))
        {
            conn.Open();
            conn.Execute("UPDATE [roles] SET [permissions]='[\"invoices:read\",\"vouchers:create\"]' WHERE [id] IN ('admin','accountant')");
        }

        MigrationRunner.Run(_connectionString);

        using (var conn = new SqliteConnection(_connectionString))
        {
            conn.Open();
            foreach (var roleId in new[] { "admin", "accountant" })
            {
                var json = conn.ExecuteScalar<string>("SELECT [permissions] FROM [roles] WHERE [id]=@R", new { R = roleId })!;
                var perms = JsonSerializer.Deserialize<string[]>(json)!;
                Assert.Contains("invoices:read", perms);
                Assert.Contains("vouchers:create", perms);
                Assert.Contains("vouchers:approve", perms);
            }

            // 重跑不重复
            conn.Execute("DELETE FROM [schema_versions] WHERE [script_name] LIKE '%072_AddVoucherPostPermission.sql'");
        }
        MigrationRunner.Run(_connectionString);

        using (var conn = new SqliteConnection(_connectionString))
        {
            conn.Open();
            var json = conn.ExecuteScalar<string>("SELECT [permissions] FROM [roles] WHERE [id]='accountant'")!;
            var perms = JsonSerializer.Deserialize<string[]>(json)!;
            Assert.Equal(1, perms.Count(p => p == "vouchers:approve"));
        }
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("[]")]
    public void Migration072_HandlesEmptyOrNullPermissions(string? seed)
    {
        MigrationRunner.Run(_connectionString, "072_AddVoucherPostPermission.sql");

        using (var conn = new SqliteConnection(_connectionString))
        {
            conn.Open();
            conn.Execute("UPDATE [roles] SET [permissions]=@P WHERE [id] IN ('admin','accountant')", new { P = seed });
        }

        MigrationRunner.Run(_connectionString);

        using (var conn = new SqliteConnection(_connectionString))
        {
            conn.Open();
            foreach (var roleId in new[] { "admin", "accountant" })
            {
                var json = conn.ExecuteScalar<string>("SELECT [permissions] FROM [roles] WHERE [id]=@R", new { R = roleId })!;
                var perms = JsonSerializer.Deserialize<string[]>(json)!;
                Assert.Contains("vouchers:approve", perms);
            }
        }
    }

    public void Dispose()
    {
        try { if (File.Exists(_dbPath)) File.Delete(_dbPath); } catch { }
    }
}