using Dapper;
using EngineeringManager.Api.Migrations;
using EngineeringManager.Tests.Common;
using Microsoft.Data.Sqlite;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// T4a：发票核销投影（invoice_allocations）与余额查询。
/// 口径：invoices.amount 等库内金额为【分】；payment_records.invoice_details
/// 里的 paymentAmount 为【元】；核销表 amount_fen 为【分】。
/// </summary>
public class InvoiceAllocationTests : ApiTestBase
{
    private const string Password = "admin123";

    private sealed record AllocRow(long InvoiceId, long PaymentId, long AmountFen);

    private async Task AuthAsync()
    {
        var resp = await Client.PostAsJsonAsync("/api/auth/login", new { username = "admin", password = Password });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", json.GetProperty("data").GetProperty("token").GetString());
    }

    private async Task<long> CreateInvoiceAsync(decimal amount, string? name = null, long? projectId = null)
    {
        var resp = await Client.PostAsJsonAsync("/api/invoices", new
        {
            name = name ?? $"核销测试-{Guid.NewGuid():N}",
            amount,
            status = "issued",
            type = "invoice_in",
            invoiceKind = "paper_special",
            projectId
        });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("data").GetInt64();
    }

    // ── T4c：非管理员 + 项目授权回归（P1 越权修复的自动化网）──

    private async Task<string> LoginAsync(string username, string password)
    {
        var resp = await Client.PostAsJsonAsync("/api/auth/login", new { username, password });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("data").GetProperty("token").GetString()!;
    }

    private void SetAuth(string token) =>
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    /// <summary>复制 admin 的密码哈希造一个 accountant 用户（默认有 invoices:create/update/read）。</summary>
    private void SeedAccountant()
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        conn.Execute(@"INSERT OR IGNORE INTO [users]
            (id,username,password,password_hash,password_salt,password_hash_version,display_name,role_id,status,created_at)
            SELECT '2','acc1',[password],[password_hash],[password_salt],[password_hash_version],'会计','accountant','active',[created_at]
            FROM [users] WHERE [id]='1'");
    }

    private void AuthorizeProject(long projectId, string userId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        conn.Execute("INSERT OR IGNORE INTO [project_authorizations] ([project_id],[user_id]) VALUES (@P,@U)",
            new { P = projectId, U = userId });
    }

    private async Task<long> CreateProjectAsync()
    {
        var resp = await Client.PostAsJsonAsync("/api/projects", new { name = $"核销项目-{Guid.NewGuid():N}" });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("data").GetInt64();
    }

    private static string Details(params (long InvoiceId, decimal PaymentAmount)[] items) =>
        JsonSerializer.Serialize(items.Select(i => new { invoiceId = i.InvoiceId, paymentAmount = i.PaymentAmount }));

    private async Task<long> CreatePaymentAsync(string invoiceDetailsJson, decimal amount = 0m,
        string recordDate = "2026-10-01", string? remarks = null)
    {
        var resp = await Client.PostAsJsonAsync("/api/payment-records", new
        {
            type = "invoice_in",
            amount,
            recordDate,
            invoiceDetails = invoiceDetailsJson,
            remarks
        });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("data").GetInt64();
    }

    private async Task<HttpResponseMessage> UpdatePaymentAsync(long id, string invoiceDetailsJson,
        decimal amount = 0m, string? remarks = "改")
    {
        return await Client.PutAsJsonAsync("/api/payment-records", new
        {
            id,
            type = "invoice_in",
            amount,
            recordDate = "2026-10-02",
            invoiceDetails = invoiceDetailsJson,
            remarks
        });
    }

    private List<AllocRow> QueryAllocations(long paymentId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.Query<AllocRow>(
            "SELECT [invoice_id] AS InvoiceId, [payment_id] AS PaymentId, [amount_fen] AS AmountFen " +
            "FROM [invoice_allocations] WHERE [payment_id]=@Id",
            new { Id = paymentId }).ToList();
    }

    private static async Task<string> ReadError(HttpResponseMessage resp)
    {
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.TryGetProperty("error", out var e) ? e.GetString() ?? "" : "";
    }

    // 1. POST 付款记录 → 按 invoice_details 生成核销行（元→分）
    [Fact]
    public async Task CreatePaymentRecord_WritesAllocations_WithYuanToFenConversion()
    {
        await AuthAsync();
        var invoiceId = await CreateInvoiceAsync(100m);
        var paymentId = await CreatePaymentAsync(Details((invoiceId, 60.25m)), amount: 60.25m);

        var row = Assert.Single(QueryAllocations(paymentId));
        Assert.Equal(invoiceId, row.InvoiceId);
        Assert.Equal(paymentId, row.PaymentId);
        Assert.Equal(6025, row.AmountFen);
    }

    // 2. PUT 改金额/换发票 → 旧核销行被替换，无残留
    [Fact]
    public async Task UpdatePaymentRecord_ReplacesAllocations_WithoutResidue()
    {
        await AuthAsync();
        var invoiceA = await CreateInvoiceAsync(100m);
        var invoiceB = await CreateInvoiceAsync(200m);
        var paymentId = await CreatePaymentAsync(Details((invoiceA, 30m)), amount: 30m);

        var resp = await UpdatePaymentAsync(paymentId, Details((invoiceB, 45.5m)), amount: 45.5m);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var row = Assert.Single(QueryAllocations(paymentId));
        Assert.Equal(invoiceB, row.InvoiceId);
        Assert.Equal(4550, row.AmountFen);
    }

    // 3. DELETE 软删除付款记录 → 核销行被清除
    [Fact]
    public async Task DeletePaymentRecord_RemovesAllocations()
    {
        await AuthAsync();
        var invoiceId = await CreateInvoiceAsync(100m);
        var paymentId = await CreatePaymentAsync(Details((invoiceId, 20m)), amount: 20m);
        Assert.Single(QueryAllocations(paymentId));

        var resp = await Client.DeleteAsync($"/api/payment-records/{paymentId}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        Assert.Empty(QueryAllocations(paymentId));
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        Assert.NotNull(conn.ExecuteScalar<string>(
            "SELECT [deleted_at] FROM [payment_records] WHERE [id]=@Id", new { Id = paymentId }));
    }

    // 4. GET allocations：多笔付款累加，allocated/outstanding 与 items 正确（分→元）
    [Fact]
    public async Task GetAllocations_SumsMultiplePayments_AndReportsOutstanding()
    {
        await AuthAsync();
        var invoiceId = await CreateInvoiceAsync(1000m);
        await CreatePaymentAsync(Details((invoiceId, 600.25m)), amount: 600.25m,
            recordDate: "2026-10-01", remarks: "首款");
        var secondPaymentId = await CreatePaymentAsync(Details((invoiceId, 399.75m)), amount: 399.75m,
            recordDate: "2026-09-15", remarks: "尾款");

        var resp = await Client.GetAsync($"/api/invoices/{invoiceId}/allocations");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var data = (await resp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");

        Assert.Equal(invoiceId, data.GetProperty("invoiceId").GetInt64());
        Assert.Equal(1000m, data.GetProperty("amount").GetDecimal());
        Assert.Equal(1000m, data.GetProperty("allocated").GetDecimal());
        Assert.Equal(0m, data.GetProperty("outstanding").GetDecimal());
        // 管理员可见全部付款，明细未被过滤
        Assert.False(data.GetProperty("itemsFiltered").GetBoolean());
        // 按记录日期升序，尾款（9-15）在前
        var items = data.GetProperty("items").EnumerateArray().ToList();
        Assert.Equal(2, items.Count);
        Assert.Equal(secondPaymentId, items[0].GetProperty("paymentId").GetInt64());
        Assert.Equal("2026-09-15", items[0].GetProperty("recordDate").GetString());
        Assert.Equal("尾款", items[0].GetProperty("remarks").GetString());
        Assert.Equal(399.75m, items[0].GetProperty("amount").GetDecimal());
        Assert.Equal("首款", items[1].GetProperty("remarks").GetString());
        // allocated + outstanding == amount（两位小数口径）
        Assert.Equal(data.GetProperty("amount").GetDecimal(),
            data.GetProperty("allocated").GetDecimal() + data.GetProperty("outstanding").GetDecimal());
    }

    // 5. 超额 → 400，错误信息含发票 id 与剩余额；等额允许
    [Fact]
    public async Task OverAllocation_Returns400_WithInvoiceIdAndRemaining()
    {
        await AuthAsync();
        var invoiceId = await CreateInvoiceAsync(100m);
        await CreatePaymentAsync(Details((invoiceId, 60m)), amount: 60m);

        var over = await Client.PostAsJsonAsync("/api/payment-records", new
        {
            type = "invoice_in",
            amount = 50m,
            recordDate = "2026-10-03",
            invoiceDetails = Details((invoiceId, 50m))
        });
        Assert.Equal(HttpStatusCode.BadRequest, over.StatusCode);
        var error = await ReadError(over);
        Assert.Contains($"#{invoiceId}", error);
        Assert.Contains("40.00", error);

        // 剩余额度恰好 40 → 允许（相等不算超额）
        var equal = await Client.PostAsJsonAsync("/api/payment-records", new
        {
            type = "invoice_in",
            amount = 40m,
            recordDate = "2026-10-04",
            invoiceDetails = Details((invoiceId, 40m))
        });
        Assert.Equal(HttpStatusCode.OK, equal.StatusCode);
    }

    // 6. PUT 超额同样拦截（排除本记录自身旧核销后计算）
    [Fact]
    public async Task UpdatePaymentRecord_OverAllocation_Returns400()
    {
        await AuthAsync();
        var invoiceId = await CreateInvoiceAsync(100m);
        var first = await CreatePaymentAsync(Details((invoiceId, 40m)), amount: 40m);
        await CreatePaymentAsync(Details((invoiceId, 50m)), amount: 50m);

        // 自身 40 → 90；改成 70 → 120 > 100，应 400
        var resp = await UpdatePaymentAsync(first, Details((invoiceId, 70m)), amount: 70m);
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains($"#{invoiceId}", await ReadError(resp));
    }

    // 6b. 排除自身后才不超额：first 40→50，其它 50，合计 100 恰好允许（不排除自身会算成 140 → 400）
    [Fact]
    public async Task UpdatePaymentRecord_EqualAfterExcludingSelf_Returns200()
    {
        await AuthAsync();
        var invoiceId = await CreateInvoiceAsync(100m);
        var first = await CreatePaymentAsync(Details((invoiceId, 40m)), amount: 40m);
        await CreatePaymentAsync(Details((invoiceId, 50m)), amount: 50m);

        var resp = await UpdatePaymentAsync(first, Details((invoiceId, 50m)), amount: 50m);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var data = (await (await Client.GetAsync($"/api/invoices/{invoiceId}/allocations"))
            .Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        Assert.Equal(100m, data.GetProperty("allocated").GetDecimal());
        Assert.Equal(0m, data.GetProperty("outstanding").GetDecimal());
    }

    // 6c. 发票不存在 → 404（GET allocations）
    [Fact]
    public async Task GetAllocations_UnknownInvoice_Returns404()
    {
        await AuthAsync();
        var resp = await Client.GetAsync("/api/invoices/99999999/allocations");
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
        Assert.Contains("发票不存在", await ReadError(resp));
    }

    // 7. 非法 invoice_details 容错：保存成功、无核销行、不 500
    [Fact]
    public async Task InvalidInvoiceDetails_DoesNotThrow_AndWritesNoAllocations()
    {
        await AuthAsync();
        var invoiceId = await CreateInvoiceAsync(100m);
        var paymentId = await CreatePaymentAsync("{not-a-json", amount: 10m);

        Assert.Empty(QueryAllocations(paymentId));
        // 非法 JSON 不占额度：再核销整张发票仍应成功
        var resp = await Client.PostAsJsonAsync("/api/payment-records", new
        {
            type = "invoice_in",
            amount = 100m,
            recordDate = "2026-10-05",
            invoiceDetails = Details((invoiceId, 100m))
        });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    // 8. T4b：核销合计 > 付款金额 → 400（发票余额充足，命中付款金额一致性校验）
    [Fact]
    public async Task AllocationsExceedPaymentAmount_Returns400()
    {
        await AuthAsync();
        var invoiceId = await CreateInvoiceAsync(1000m);

        var resp = await Client.PostAsJsonAsync("/api/payment-records", new
        {
            type = "invoice_in",
            amount = 100m,
            recordDate = "2026-10-06",
            invoiceDetails = Details((invoiceId, 150m))
        });

        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        var error = await ReadError(resp);
        Assert.Contains("不得超过付款金额", error);
        Assert.Contains("150.00", error);
        Assert.Contains("100.00", error);
    }

    // 9. T4b：核销合计 == 付款金额 → 200（等于放行）
    [Fact]
    public async Task AllocationsEqualPaymentAmount_Returns200()
    {
        await AuthAsync();
        var invoiceId = await CreateInvoiceAsync(1000m);
        var paymentId = await CreatePaymentAsync(Details((invoiceId, 100m)), amount: 100m);

        var row = Assert.Single(QueryAllocations(paymentId));
        Assert.Equal(10000, row.AmountFen);   // 100 元 == 10000 分，等于放行且金额正确
    }

    // 9a. T4b：0 元付款带核销明细 → 400（堵 API 旁路）
    [Fact]
    public async Task CreatePaymentRecord_ZeroAmountWithAllocations_Returns400()
    {
        await AuthAsync();
        var invoiceId = await CreateInvoiceAsync(1000m);

        var resp = await Client.PostAsJsonAsync("/api/payment-records", new
        {
            type = "invoice_in",
            amount = 0m,
            recordDate = "2026-10-05",
            invoiceDetails = Details((invoiceId, 100m))
        });

        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("付款金额必须大于 0", await ReadError(resp));
    }

    // 9b. T4b：PUT 同样校验核销合计 ≤ 付款金额
    [Fact]
    public async Task UpdatePaymentRecord_AllocationsExceedPaymentAmount_Returns400()
    {
        await AuthAsync();
        var invoiceId = await CreateInvoiceAsync(1000m);
        var paymentId = await CreatePaymentAsync(Details((invoiceId, 100m)), amount: 100m);

        var resp = await UpdatePaymentAsync(paymentId, Details((invoiceId, 100m)), amount: 80m);

        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("不得超过付款金额", await ReadError(resp));
    }

    // 10. T4b：GET /api/invoices 返回 allocated_amount（与核销额一致）
    [Fact]
    public async Task GetInvoices_ReturnsAllocatedAmount()
    {
        await AuthAsync();
        var invoiceId = await CreateInvoiceAsync(500m);
        await CreatePaymentAsync(Details((invoiceId, 120.5m)), amount: 120.5m);

        var resp = await Client.GetAsync("/api/invoices");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var rows = (await resp.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("data").EnumerateArray().ToList();
        var row = rows.Single(r => r.GetProperty("id").GetInt64() == invoiceId);
        Assert.Equal(120.5m, row.GetProperty("allocated_amount").GetDecimal());
    }

    // ── T4c：非管理员越权回归 ──

    [Fact]
    public async Task NonAdmin_CannotAllocateToUnauthorizedInvoice_NoBalanceLeak_AndNoRowsWritten()
    {
        SetAuth(await LoginAsync("admin", Password));
        var projectId = await CreateProjectAsync();
        var invoiceId = await CreateInvoiceAsync(1000m, projectId: projectId);

        SeedAccountant();
        SetAuth(await LoginAsync("acc1", Password));

        // 会计未被授权该项目：既不能挂核销，也不能从错误信息里探测余额
        var resp = await Client.PostAsJsonAsync("/api/payment-records", new
        {
            type = "invoice_in",
            amount = 100m,
            recordDate = "2026-10-10",
            invoiceDetails = Details((invoiceId, 100m))
        });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        var error = await ReadError(resp);
        Assert.Contains("不存在或无权访问", error);
        Assert.DoesNotContain("剩余", error);

        // 不应产生付款记录与核销行
        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Open();
            Assert.Equal(0L, conn.ExecuteScalar<long>("SELECT COUNT(*) FROM [payment_records]"));
            Assert.Equal(0L, conn.ExecuteScalar<long>("SELECT COUNT(*) FROM [invoice_allocations]"));
        }

        // 未授权发票的核销明细 → 404
        var get = await Client.GetAsync($"/api/invoices/{invoiceId}/allocations");
        Assert.Equal(HttpStatusCode.NotFound, get.StatusCode);
    }

    [Fact]
    public async Task NonAdmin_WithProjectAuthorization_CanAllocate()
    {
        SetAuth(await LoginAsync("admin", Password));
        var projectId = await CreateProjectAsync();
        var invoiceId = await CreateInvoiceAsync(1000m, projectId: projectId);

        SeedAccountant();
        AuthorizeProject(projectId, "2");
        SetAuth(await LoginAsync("acc1", Password));

        var resp = await Client.PostAsJsonAsync("/api/payment-records", new
        {
            type = "invoice_in",
            amount = 100m,
            recordDate = "2026-10-10",
            invoiceDetails = Details((invoiceId, 100m))
        });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var get = await Client.GetAsync($"/api/invoices/{invoiceId}/allocations");
        Assert.Equal(HttpStatusCode.OK, get.StatusCode);
        var data = (await get.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        Assert.Equal(100m, data.GetProperty("allocated").GetDecimal());
    }
}

/// <summary>
/// T4a 存量回填：元→分、排除软删除、跳过脏 JSON、重复 invoiceId 聚合、重跑不重复。
/// 用独立临时库：先停在 065 之前造历史数据，再跑迁移。
/// </summary>
public class InvoiceAllocationBackfillTests : IDisposable
{
    private sealed class AllocRow
    {
        public long InvoiceId { get; set; }
        public long PaymentId { get; set; }
        public long AmountFen { get; set; }
    }

    private readonly string _dbPath;
    private readonly string _connectionString;

    public InvoiceAllocationBackfillTests()
    {
        _dbPath = Path.Combine(Path.GetTempPath(), $"alloc-backfill-{Guid.NewGuid()}.db");
        _connectionString = $"Data Source={_dbPath}";
    }

    [Fact]
    public void Migration065_BackfillsYuanToFen_IsIdempotent_AndSkipsDeletedOrDirtyRows()
    {
        // 历史库状态：065 之前的所有迁移
        MigrationRunner.Run(_connectionString, "065_InvoiceAllocations.sql");

        using (var conn = new SqliteConnection(_connectionString))
        {
            conn.Open();
            conn.Execute("INSERT INTO [invoices] ([id],[amount],[name],[created_at],[updated_at]) " +
                         "VALUES (1, 10000, '回填发票', datetime('now'), datetime('now'))");
            conn.Execute(
                "INSERT INTO [payment_records] ([id],[type],[amount],[record_date],[invoice_details],[remarks],[created_at]) " +
                "VALUES (@Id,@Type,@Amount,@Date,@Details,@Remarks,datetime('now'))",
                new[]
                {
                    new { Id = 1L, Type = "invoice_in", Amount = 6025L, Date = "2026-10-01",
                          Details = "[{\"invoiceId\":1,\"paymentAmount\":60.25}]", Remarks = "正常" },
                    new { Id = 2L, Type = "invoice_in", Amount = 9900L, Date = "2026-10-02",
                          Details = "[{\"invoiceId\":1,\"paymentAmount\":99}]", Remarks = "已删除" },
                    new { Id = 3L, Type = "invoice_in", Amount = 0L, Date = "2026-10-03",
                          Details = "{bad json", Remarks = "脏 JSON" },
                    new { Id = 4L, Type = "invoice_in", Amount = 1550L, Date = "2026-10-04",
                          Details = "[{\"invoiceId\":1,\"paymentAmount\":10},{\"invoiceId\":1,\"paymentAmount\":5.5}]", Remarks = "重复 id" }
                });
            conn.Execute("UPDATE [payment_records] SET [deleted_at]=datetime('now') WHERE [id]=2");
        }

        // 应用 065
        MigrationRunner.Run(_connectionString);

        using (var conn = new SqliteConnection(_connectionString))
        {
            conn.Open();
            var rows = conn.Query<AllocRow>(
                "SELECT [invoice_id] AS InvoiceId, [payment_id] AS PaymentId, [amount_fen] AS AmountFen " +
                "FROM [invoice_allocations] ORDER BY [payment_id]").ToList();
            Assert.Equal(2, rows.Count);
            Assert.Equal(1L, rows[0].InvoiceId);
            Assert.Equal(1L, rows[0].PaymentId);
            Assert.Equal(6025L, rows[0].AmountFen);
            // 同一 JSON 内重复 invoiceId 聚合：10 + 5.5 = 15.50 元 → 1550 分
            Assert.Equal(1L, rows[1].InvoiceId);
            Assert.Equal(4L, rows[1].PaymentId);
            Assert.Equal(1550L, rows[1].AmountFen);

            // 模拟重跑 065：清掉版本记录再跑 → CREATE IF NOT EXISTS + INSERT OR IGNORE 不产生重复
            conn.Execute("DELETE FROM [schema_versions] WHERE [script_name] LIKE '%065_InvoiceAllocations.sql'");
        }
        MigrationRunner.Run(_connectionString);

        using (var conn = new SqliteConnection(_connectionString))
        {
            conn.Open();
            Assert.Equal(2L, conn.ExecuteScalar<long>("SELECT COUNT(*) FROM [invoice_allocations]"));
            Assert.Equal(7575L, conn.ExecuteScalar<long>("SELECT SUM([amount_fen]) FROM [invoice_allocations]"));
        }
    }

    // 067：字符串金额（paymentAmount 为 "60.25"）的历史条目补回填
    [Fact]
    public void Migration067_BackfillsStringPaymentAmount_AndIsIdempotent()
    {
        // 历史库状态：067 之前（065/066 已跑，字符串金额被 065 跳过）
        MigrationRunner.Run(_connectionString, "067_PaymentAllocationsBackfillText.sql");

        using (var conn = new SqliteConnection(_connectionString))
        {
            conn.Open();
            conn.Execute("INSERT INTO [invoices] ([id],[amount],[name],[created_at],[updated_at]) " +
                         "VALUES (1, 10000, '字符串金额发票', datetime('now'), datetime('now'))");
            conn.Execute(
                "INSERT INTO [payment_records] ([id],[type],[amount],[record_date],[invoice_details],[remarks],[created_at]) " +
                "VALUES (1,'invoice_in',6025,'2026-10-01','[{\"invoiceId\":1,\"paymentAmount\":\"60.25\"}]','字符串金额',datetime('now'))");
            conn.Execute(
                "INSERT INTO [payment_records] ([id],[type],[amount],[record_date],[invoice_details],[remarks],[created_at]) " +
                "VALUES (2,'invoice_in',100,'2026-10-02','[{\"invoiceId\":1,\"paymentAmount\":\"abc\"}]','非数字',datetime('now'))");
            // 同一 payment 内重复 invoiceId 的字符串金额 → 必须 SUM（10 + 5.5 = 15.50 元 → 1550 分）
            conn.Execute(
                "INSERT INTO [payment_records] ([id],[type],[amount],[record_date],[invoice_details],[remarks],[created_at]) " +
                "VALUES (3,'invoice_in',1550,'2026-10-03','[{\"invoiceId\":1,\"paymentAmount\":\"10\"},{\"invoiceId\":1,\"paymentAmount\":\"5.5\"}]','重复字符串',datetime('now'))");
            // invoiceId=0 必须排除（与 065 口径一致）
            conn.Execute(
                "INSERT INTO [payment_records] ([id],[type],[amount],[record_date],[invoice_details],[remarks],[created_at]) " +
                "VALUES (4,'invoice_in',700,'2026-10-04','[{\"invoiceId\":0,\"paymentAmount\":\"7\"}]','零 id',datetime('now'))");
        }

        MigrationRunner.Run(_connectionString);

        using (var conn = new SqliteConnection(_connectionString))
        {
            conn.Open();
            var rows = conn.Query<AllocRow>(
                "SELECT [invoice_id] AS InvoiceId, [payment_id] AS PaymentId, [amount_fen] AS AmountFen " +
                "FROM [invoice_allocations] ORDER BY [payment_id]").ToList();
            Assert.Equal(2, rows.Count);
            Assert.Equal(1L, rows[0].PaymentId);
            Assert.Equal(6025L, rows[0].AmountFen);
            // 重复 invoiceId 聚合：10 + 5.5 = 15.50 元 → 1550 分
            Assert.Equal(3L, rows[1].PaymentId);
            Assert.Equal(1550L, rows[1].AmountFen);
            Assert.DoesNotContain(rows, r => r.PaymentId == 4); // invoiceId=0 被排除
            Assert.Equal(7575L, rows.Sum(r => r.AmountFen));

            // 重跑：清版本记录后再跑，不产生重复
            conn.Execute("DELETE FROM [schema_versions] WHERE [script_name] LIKE '%067_PaymentAllocationsBackfillText.sql'");
        }
        MigrationRunner.Run(_connectionString);
        using (var conn = new SqliteConnection(_connectionString))
        {
            conn.Open();
            Assert.Equal(2L, conn.ExecuteScalar<long>("SELECT COUNT(*) FROM [invoice_allocations]"));
            Assert.Equal(7575L, conn.ExecuteScalar<long>("SELECT SUM([amount_fen]) FROM [invoice_allocations]"));
        }
    }

    public void Dispose()
    {
        try { if (File.Exists(_dbPath)) File.Delete(_dbPath); } catch { }
    }
}
