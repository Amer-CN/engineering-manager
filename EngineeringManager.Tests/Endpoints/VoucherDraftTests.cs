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
/// T6a：凭证草稿（只落 draft，不过账）。
/// 覆盖：开票/收票生成草稿、借贷平衡、凭证号按期间递增、同一发票唯一（400）、
/// 按期间列表（含 entries）、删除草稿级联清 entries、worker 403、accountant 可生成。
/// 口径：库内金额 long 分；响应 totalDebit/totalCredit/amount 为元。
/// </summary>
public class VoucherDraftTests : ApiTestBase
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

    /// <summary>复制 admin 的密码哈希造一个指定角色的用户（默认权限矩阵即来自 roles 表）。</summary>
    private void SeedUser(string id, string username, string roleId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var salt = $"t6a-{id}-salt-123456";
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

    private async Task<long> CreateInvoiceAsync(string type, decimal amount, decimal price, decimal tax,
        string? issueDate = "2026-05-18", string category = "special")
    {
        var resp = await Client.PostAsJsonAsync("/api/invoices", new
        {
            name = $"凭证草稿测试-{Guid.NewGuid():N}",
            amount,
            priceAmount = price,
            taxAmount = tax,
            taxRate = 0.06,
            status = "issued",
            type,
            invoiceKind = "paper_special",
            invoiceMedium = "paper",
            invoiceCategory = category,
            issueDate
        });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("data").GetInt64();
    }

    private async Task<HttpResponseMessage> CreateDraftAsync(long invoiceId, string? templateCode = null)
    {
        object body = templateCode == null
            ? new { invoiceId }
            : new { invoiceId, templateCode };
        return await Client.PostAsJsonAsync("/api/vouchers/from-invoice", body);
    }

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

    // 1. 开票发票生成草稿：200；凭证号 记-YYYYMM-0001；status=draft；借贷平衡且总额=发票金额
    [Fact]
    public async Task CreateDraft_FromInvoice_PersistsBalancedDraft()
    {
        await AuthAdminAsync();
        var invoiceId = await CreateInvoiceAsync("invoice_out", 1060m, 1000m, 60m, "2026-05-18");

        var data = await ReadData(await CreateDraftAsync(invoiceId));
        var voucherId = data.GetProperty("id").GetInt64();

        Assert.True(voucherId > 0);
        Assert.Matches(@"^记-\d{6}-0001$", data.GetProperty("voucherNo").GetString());
        Assert.Equal("记-202605-0001", data.GetProperty("voucherNo").GetString());
        Assert.Equal(1060m, data.GetProperty("totalDebit").GetDecimal());
        Assert.Equal(1060m, data.GetProperty("totalCredit").GetDecimal());

        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var voucher = conn.QuerySingle(
            "SELECT * FROM [vouchers] WHERE [id]=@Id", new { Id = voucherId });
        Assert.Equal("draft", (string)voucher.status);
        Assert.Equal("invoice", (string)voucher.source_type);
        Assert.Equal(invoiceId, Convert.ToInt64(voucher.source_id));
        Assert.Equal("INV_REVENUE", (string)voucher.template_code);
        Assert.Equal("202605", (string)voucher.period);
        Assert.Equal("2026-05-18", (string)voucher.voucher_date);
        Assert.Equal(106000L, Convert.ToInt64(voucher.total_debit_fen));
        Assert.Equal(106000L, Convert.ToInt64(voucher.total_credit_fen));
        Assert.Equal(1L, Convert.ToInt64(voucher.created_by));

        var entries = conn.Query<EntryRow>(
            @"SELECT [line_no] AS LineNo,[dc] AS Dc,[account_code] AS AccountCode,[amount_fen] AS AmountFen
              FROM [voucher_entries] WHERE [voucher_id]=@Id ORDER BY [line_no]",
            new { Id = voucherId }).ToList();
        Assert.Equal(3, entries.Count);
        Assert.Equal(new[] { "1122", "6001", "22210105" },
            entries.Select(e => e.AccountCode).ToArray());
        Assert.Equal(106000L, entries.Where(e => e.Dc == 1).Sum(e => e.AmountFen));
        Assert.Equal(106000L, entries.Where(e => e.Dc == -1).Sum(e => e.AmountFen));
    }

    /// <summary>Dapper 强类型映射（动态映射的 long 在 Sum 时会被绑定成 int，避免测试侧踩坑）。</summary>
    private sealed class EntryRow
    {
        public int LineNo { get; set; }
        public int Dc { get; set; }
        public string AccountCode { get; set; } = "";
        public long AmountFen { get; set; }
    }

    // 2. 同一发票再次生成 → 400「已生成」；不重复落库；重复失败回滚号段（next_no 仍为 2）
    [Fact]
    public async Task CreateDraft_SameInvoiceAgain_Returns400_AndRollsBackSequence()
    {
        await AuthAdminAsync();
        var invoiceId = await CreateInvoiceAsync("invoice_out", 1060m, 1000m, 60m, "2026-05-18");
        Assert.Equal(HttpStatusCode.OK, (await CreateDraftAsync(invoiceId)).StatusCode);

        var second = await CreateDraftAsync(invoiceId);
        Assert.Equal(HttpStatusCode.BadRequest, second.StatusCode);
        Assert.Contains("该发票已生成凭证草稿", await ReadError(second));

        Assert.Equal(1L, Count("SELECT COUNT(*) FROM [vouchers]"));
        Assert.Equal(3L, Count("SELECT COUNT(*) FROM [voucher_entries]"));
        Assert.Equal(2L, Count("SELECT [next_no] FROM [voucher_sequences] WHERE [period]='202605'"));
    }

    // 3. 列表按 period 返回该草稿与 entries；错误期间返回空数组
    [Fact]
    public async Task GetVouchers_ByPeriod_ReturnsDraftWithEntries()
    {
        await AuthAdminAsync();
        var invoiceId = await CreateInvoiceAsync("invoice_out", 1060m, 1000m, 60m, "2026-06-02");
        var created = await ReadData(await CreateDraftAsync(invoiceId));

        var data = await ReadData(await Client.GetAsync("/api/vouchers?period=202606"));
        var list = data.EnumerateArray().ToList();
        Assert.Single(list);

        var voucher = list[0];
        Assert.Equal(created.GetProperty("id").GetInt64(), voucher.GetProperty("id").GetInt64());
        Assert.Equal("记-202606-0001", voucher.GetProperty("voucherNo").GetString());
        Assert.Equal("2026-06-02", voucher.GetProperty("voucherDate").GetString());
        Assert.Equal("202606", voucher.GetProperty("period").GetString());
        Assert.Equal("invoice", voucher.GetProperty("sourceType").GetString());
        Assert.Equal(invoiceId, voucher.GetProperty("sourceId").GetInt64());
        Assert.Equal("INV_REVENUE", voucher.GetProperty("templateCode").GetString());
        Assert.Equal("draft", voucher.GetProperty("status").GetString());
        Assert.Equal(1060m, voucher.GetProperty("totalDebit").GetDecimal());
        Assert.Equal(1060m, voucher.GetProperty("totalCredit").GetDecimal());

        var entries = voucher.GetProperty("entries").EnumerateArray().ToList();
        Assert.Equal(3, entries.Count);
        Assert.Equal(1, entries[0].GetProperty("lineNo").GetInt32());
        Assert.Equal(1, entries[0].GetProperty("dc").GetInt32());
        Assert.Equal("1122", entries[0].GetProperty("accountCode").GetString());
        Assert.Equal(1060m, entries[0].GetProperty("amount").GetDecimal());
        Assert.Equal(-1, entries[1].GetProperty("dc").GetInt32());
        Assert.Equal(1000m, entries[1].GetProperty("amount").GetDecimal());
        Assert.Equal(60m, entries[2].GetProperty("amount").GetDecimal());

        var empty = await ReadData(await Client.GetAsync("/api/vouchers?period=209901"));
        Assert.Empty(empty.EnumerateArray());
    }

    // 4. 删除草稿：200；voucher 与 entries 均删除；再删 → 404
    [Fact]
    public async Task DeleteDraft_RemovesVoucherAndEntries()
    {
        await AuthAdminAsync();
        var invoiceId = await CreateInvoiceAsync("invoice_out", 1060m, 1000m, 60m, "2026-05-18");
        var created = await ReadData(await CreateDraftAsync(invoiceId));
        var voucherId = created.GetProperty("id").GetInt64();

        var resp = await Client.DeleteAsync($"/api/vouchers/{voucherId}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        Assert.Equal(0L, Count("SELECT COUNT(*) FROM [vouchers] WHERE [id]=@Id", new { Id = voucherId }));
        Assert.Equal(0L, Count("SELECT COUNT(*) FROM [voucher_entries] WHERE [voucher_id]=@Id", new { Id = voucherId }));
        var list = await ReadData(await Client.GetAsync("/api/vouchers?period=202605"));
        Assert.Empty(list.EnumerateArray());

        var again = await Client.DeleteAsync($"/api/vouchers/{voucherId}");
        Assert.Equal(HttpStatusCode.NotFound, again.StatusCode);
    }

    // 5. worker 无 vouchers:create/read → 生成 403、列表 403，且无副作用
    [Fact]
    public async Task CreateDraft_Worker_Returns403()
    {
        SeedUser("t6a-worker", "t6a-worker", "worker");
        SetAuth(await LoginAsync("t6a-worker"));

        var resp = await CreateDraftAsync(999999);
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);

        var list = await Client.GetAsync("/api/vouchers?period=202605");
        Assert.Equal(HttpStatusCode.Forbidden, list.StatusCode);

        Assert.Equal(0L, Count("SELECT COUNT(*) FROM [vouchers]"));
    }

    // 6. 同一期间第二张发票 → 序号递增 0002
    [Fact]
    public async Task CreateDraft_SecondInvoice_IncrementsVoucherNo()
    {
        await AuthAdminAsync();
        var first = await CreateInvoiceAsync("invoice_out", 1060m, 1000m, 60m, "2026-07-01");
        var second = await CreateInvoiceAsync("invoice_out", 2120m, 2000m, 120m, "2026-07-15");

        var d1 = await ReadData(await CreateDraftAsync(first));
        var d2 = await ReadData(await CreateDraftAsync(second));

        Assert.Equal("记-202607-0001", d1.GetProperty("voucherNo").GetString());
        Assert.Equal("记-202607-0002", d2.GetProperty("voucherNo").GetString());
    }

    // 7. accountant 默认权限已含 vouchers:create/read → 可生成并列表可见
    [Fact]
    public async Task CreateDraft_Accountant_Returns200()
    {
        SeedUser("t6a-acc", "t6a-acc", "accountant");
        SetAuth(await LoginAsync("t6a-acc"));
        var invoiceId = await CreateInvoiceAsync("invoice_out", 1060m, 1000m, 60m, "2026-09-03");

        var data = await ReadData(await CreateDraftAsync(invoiceId));
        Assert.Equal("记-202609-0001", data.GetProperty("voucherNo").GetString());

        var list = await ReadData(await Client.GetAsync("/api/vouchers?period=202609"));
        Assert.Single(list.EnumerateArray());
    }

    // 8. 收票发票未传 templateCode → 自动映射 INV_COST，借贷平衡
    [Fact]
    public async Task CreateDraft_InvoiceIn_AutoMapsCostTemplate()
    {
        await AuthAdminAsync();
        var invoiceId = await CreateInvoiceAsync("invoice_in", 1130m, 1000m, 130m, "2026-08-09");

        var data = await ReadData(await CreateDraftAsync(invoiceId));
        Assert.Equal("记-202608-0001", data.GetProperty("voucherNo").GetString());
        Assert.Equal(1130m, data.GetProperty("totalDebit").GetDecimal());
        Assert.Equal(1130m, data.GetProperty("totalCredit").GetDecimal());

        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var voucher = conn.QuerySingle(
            "SELECT * FROM [vouchers] WHERE [id]=@Id", new { Id = data.GetProperty("id").GetInt64() });
        Assert.Equal("INV_COST", (string)voucher.template_code);
        var debit = conn.ExecuteScalar<long>(
            "SELECT COALESCE(SUM([amount_fen]),0) FROM [voucher_entries] WHERE [voucher_id]=@Id AND [dc]=1",
            new { Id = data.GetProperty("id").GetInt64() });
        var credit = conn.ExecuteScalar<long>(
            "SELECT COALESCE(SUM([amount_fen]),0) FROM [voucher_entries] WHERE [voucher_id]=@Id AND [dc]=-1",
            new { Id = data.GetProperty("id").GetInt64() });
        Assert.Equal(113000L, debit);
        Assert.Equal(113000L, credit);
    }
}

/// <summary>
/// 069 权限迁移：老库 roles.permissions（JSON 数组）追加 vouchers:create/read/delete，
/// 只追加不重置，重复执行不重复。
/// </summary>
public class VoucherPermissionMigrationTests : IDisposable
{
    private readonly string _dbPath;
    private readonly string _connectionString;

    public VoucherPermissionMigrationTests()
    {
        _dbPath = Path.Combine(Path.GetTempPath(), $"voucher-perm-{Guid.NewGuid()}.db");
        _connectionString = $"Data Source={_dbPath}";
    }

    [Fact]
    public void Migration069_AppendsVoucherPermissions_WithoutResettingExistingCodes()
    {
        // 跑到 069 之前（含 068），然后模拟老库角色权限 JSON
        EngineeringManager.Api.Migrations.MigrationRunner.Run(_connectionString, "069_AddVoucherPermissions.sql");

        using (var conn = new SqliteConnection(_connectionString))
        {
            conn.Open();
            conn.Execute("UPDATE [roles] SET [permissions]='[\"invoices:read\",\"invoices:create\"]' WHERE [id] IN ('admin','accountant')");
        }

        EngineeringManager.Api.Migrations.MigrationRunner.Run(_connectionString);

        using (var conn = new SqliteConnection(_connectionString))
        {
            conn.Open();
            foreach (var roleId in new[] { "admin", "accountant" })
            {
                var json = conn.ExecuteScalar<string>("SELECT [permissions] FROM [roles] WHERE [id]=@R", new { R = roleId })!;
                var perms = JsonSerializer.Deserialize<string[]>(json)!;
                Assert.Contains("invoices:read", perms);
                Assert.Contains("invoices:create", perms);
                Assert.Contains("vouchers:create", perms);
                Assert.Contains("vouchers:read", perms);
                Assert.Contains("vouchers:delete", perms);
            }

            // 重跑不重复
            conn.Execute("DELETE FROM [schema_versions] WHERE [script_name] LIKE '%069_AddVoucherPermissions.sql'");
        }
        EngineeringManager.Api.Migrations.MigrationRunner.Run(_connectionString);

        using (var conn = new SqliteConnection(_connectionString))
        {
            conn.Open();
            var json = conn.ExecuteScalar<string>("SELECT [permissions] FROM [roles] WHERE [id]='accountant'")!;
            var perms = JsonSerializer.Deserialize<string[]>(json)!;
            Assert.Equal(1, perms.Count(p => p == "vouchers:create"));
            Assert.Equal(1, perms.Count(p => p == "vouchers:read"));
            Assert.Equal(1, perms.Count(p => p == "vouchers:delete"));
        }
    }

    public void Dispose()
    {
        try { if (File.Exists(_dbPath)) File.Delete(_dbPath); } catch { }
    }
}
