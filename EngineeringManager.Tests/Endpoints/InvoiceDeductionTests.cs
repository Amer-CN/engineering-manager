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
/// P0-b：进项发票抵扣四字段（is_deducted / deduct_date / deduct_period / deductible_tax）。
/// 覆盖：062 迁移幂等 + 存量行默认 0；POST 进项登记后 GET 分↔元无损；
/// 非进项登记 400；PUT 取消抵扣清空三字段；非法所属期/负数税额 400；
/// PUT 以库内 type 判定票向（改 dto.Type 不能绕过）。
/// </summary>
public class InvoiceDeductionTests : ApiTestBase
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

    private long SeedInvoice(string name, string type, bool deducted = false)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.ExecuteScalar<long>(@"INSERT INTO [invoices]
            (name,amount,status,type,is_deducted,deduct_date,deduct_period,deductible_tax,created_by,created_at,updated_at,version,last_modified_at)
            VALUES (@N,1000,'issued',@T,@D,@Date,@Period,@Tax,'1','2026-08-01 00:00:00','2026-08-01 00:00:00',1,'2026-08-01 00:00:00');
            SELECT last_insert_rowid();",
            new
            {
                N = name,
                T = type,
                D = deducted ? 1 : 0,
                Date = deducted ? "2026-08-15" : null,
                Period = deducted ? "2026-07" : null,
                Tax = deducted ? 5000 : 0
            });
    }

    private (long IsDeducted, string? DeductDate, string? DeductPeriod, long DeductibleTax) ReadDeduction(long id)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var row = conn.QueryFirstOrDefault(
            "SELECT [is_deducted] AS IsDeducted, [deduct_date] AS DeductDate, [deduct_period] AS DeductPeriod, [deductible_tax] AS DeductibleTax FROM [invoices] WHERE [id]=@Id",
            new { Id = id }) ?? throw new InvalidOperationException($"发票 {id} 不存在");
        return ((long)row.IsDeducted, (string?)row.DeductDate, (string?)row.DeductPeriod, (long)row.DeductibleTax);
    }

    private string? ReadType(long id)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.ExecuteScalar<string?>(
            "SELECT [type] FROM [invoices] WHERE [id]=@Id", new { Id = id });
    }

    // 全库不变式：已抵扣行必须是进项票（type='invoice_in'）
    private long CountDeductedRowsOutsideInput()
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.ExecuteScalar<long>(
            "SELECT COUNT(*) FROM [invoices] WHERE COALESCE([type],'') <> 'invoice_in' AND [is_deducted] = 1");
    }

    private async Task<JsonElement> GetInvoiceRowAsync(string name)
    {
        var resp = await Client.GetAsync("/api/invoices");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("data").EnumerateArray()
            .First(e => e.GetProperty("name").GetString() == name);
    }

    private static async Task<string> ReadError(HttpResponseMessage resp)
    {
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.TryGetProperty("error", out var e) ? e.GetString() ?? "" : "";
    }

    // 验收 1：062 迁移幂等（删掉 schema_versions 登记后真重跑）；存量行 is_deducted=0 / deductible_tax=0。
    [Fact]
    public void Migration062_IsIdempotent_AndExistingRowsDefaultToZero()
    {
        var dbPath = Path.Combine(Path.GetTempPath(), $"invoice-062-{Guid.NewGuid()}.db");
        var connStr = $"Data Source={dbPath};Pooling=False";
        try
        {
            // 停在 062 之前：模拟"存量库已有发票、尚未加列"
            MigrationRunner.Run(connStr, "062_InvoiceDeduction.sql");
            using (var conn = new SqliteConnection(connStr))
            {
                conn.Open();
                conn.Execute(@"INSERT INTO [invoices]
                    (name,amount,status,type,created_by,created_at,updated_at,version,last_modified_at)
                    VALUES ('存量进项',100,'issued','invoice_in','1','2026-01-01 00:00:00','2026-01-01 00:00:00',1,'2026-01-01 00:00:00')");
            }

            // 首次应用 062
            MigrationRunner.Run(connStr);

            // F3：删除 062 的 schema_versions 登记 → 让 Runner 真正再执行一次 062 脚本
            using (var conn = new SqliteConnection(connStr))
            {
                conn.Open();
                var deleted = conn.Execute("DELETE FROM schema_versions WHERE script_name LIKE '%062%'");
                Assert.Equal(1, deleted);
            }
            MigrationRunner.Run(connStr); // 真重跑：ADD COLUMN duplicate column 被良性吞掉；索引 IF NOT EXISTS

            using (var conn = new SqliteConnection(connStr))
            {
                conn.Open();
                // 重跑后只保留一条 062 登记（不重复记账）
                Assert.Equal(1L, conn.ExecuteScalar<long>(
                    "SELECT COUNT(*) FROM schema_versions WHERE script_name LIKE '%062%'"));

                var row = conn.QueryFirst(
                    "SELECT [is_deducted] AS IsDeducted, [deduct_date] AS DeductDate, [deduct_period] AS DeductPeriod, [deductible_tax] AS DeductibleTax FROM [invoices] WHERE [name]='存量进项'");
                Assert.Equal(0L, (long)row.IsDeducted);
                Assert.Null((string?)row.DeductDate);
                Assert.Null((string?)row.DeductPeriod);
                Assert.Equal(0L, (long)row.DeductibleTax);

                var columns = conn.Query<string>("SELECT [name] FROM pragma_table_info('invoices')").ToList();
                Assert.Contains("is_deducted", columns);
                Assert.Contains("deduct_date", columns);
                Assert.Contains("deduct_period", columns);
                Assert.Contains("deductible_tax", columns);

                var index = conn.ExecuteScalar<string>(
                    "SELECT [name] FROM sqlite_master WHERE [type]='index' AND [name]='idx_invoices_deducted'");
                Assert.Equal("idx_invoices_deducted", index);
            }
        }
        finally
        {
            SqliteConnection.ClearAllPools();
            try { if (File.Exists(dbPath)) File.Delete(dbPath); } catch { }
        }
    }

    // 验收 2：POST 进项票登记抵扣 → DB 落分，GET 回元（分↔元无损）。
    [Fact]
    public async Task Post_InputInvoice_WithDeduction_ReturnsYuanLossless()
    {
        SetAuth(await LoginAdminAsync());
        var resp = await Client.PostAsJsonAsync("/api/invoices", new
        {
            name = "进项抵扣登记",
            amount = 1000.0,
            status = "issued",
            type = "invoice_in",
            isDeducted = true,
            deductDate = "2026-10-20",
            deductPeriod = "2026-09",
            deductibleTax = 123.45
        });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var id = (await resp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetInt64();

        // DB：INTEGER 分
        var dbRow = ReadDeduction(id);
        Assert.Equal(1L, dbRow.IsDeducted);
        Assert.Equal("2026-10-20", dbRow.DeductDate);
        Assert.Equal("2026-09", dbRow.DeductPeriod);
        Assert.Equal(12345L, dbRow.DeductibleTax);

        // GET：元 + bool
        var row = await GetInvoiceRowAsync("进项抵扣登记");
        Assert.True(row.GetProperty("is_deducted").GetBoolean());
        Assert.Equal("2026-10-20", row.GetProperty("deduct_date").GetString());
        Assert.Equal("2026-09", row.GetProperty("deduct_period").GetString());
        Assert.Equal(123.45, row.GetProperty("deductible_tax").GetDouble(), 2);
    }

    // 验收 3：POST 销项票登记抵扣 → 400。
    [Fact]
    public async Task Post_OutputInvoice_WithDeduction_Returns400()
    {
        SetAuth(await LoginAdminAsync());
        var resp = await Client.PostAsJsonAsync("/api/invoices", new
        {
            name = "销项抵扣非法",
            amount = 1000.0,
            status = "issued",
            type = "invoice_out",
            isDeducted = true,
            deductPeriod = "2026-09",
            deductibleTax = 100.0
        });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("仅进项发票可登记抵扣", await ReadError(resp));
    }

    // 验收 4：PUT 取消抵扣 → 三字段清空。
    [Fact]
    public async Task Put_CancelDeduction_ClearsAllThreeFields()
    {
        SetAuth(await LoginAdminAsync());
        var id = SeedInvoice("取消抵扣", "invoice_in", deducted: true);
        Assert.Equal(1L, ReadDeduction(id).IsDeducted);

        var resp = await Client.PutAsJsonAsync("/api/invoices", new
        {
            id,
            name = "取消抵扣",
            amount = 1000.0,
            status = "issued",
            type = "invoice_in",
            isDeducted = false
        });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var cleared = ReadDeduction(id);
        Assert.Equal(0L, cleared.IsDeducted);
        Assert.Null(cleared.DeductDate);
        Assert.Null(cleared.DeductPeriod);
        Assert.Equal(0L, cleared.DeductibleTax);
    }

    // 验收 5a：非法所属期 → 400。
    [Fact]
    public async Task Post_InvalidDeductPeriod_Returns400()
    {
        SetAuth(await LoginAdminAsync());
        var resp = await Client.PostAsJsonAsync("/api/invoices", new
        {
            name = "非法所属期",
            amount = 1000.0,
            status = "issued",
            type = "invoice_in",
            isDeducted = true,
            deductPeriod = "2026-13",
            deductibleTax = 100.0
        });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("税款所属期", await ReadError(resp));
    }

    // 验收 5b：负数可抵扣税额 → 400。
    [Fact]
    public async Task Post_NegativeDeductibleTax_Returns400()
    {
        SetAuth(await LoginAdminAsync());
        var resp = await Client.PostAsJsonAsync("/api/invoices", new
        {
            name = "负数税额",
            amount = 1000.0,
            status = "issued",
            type = "invoice_in",
            isDeducted = true,
            deductPeriod = "2026-09",
            deductibleTax = -0.01
        });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("不能为负数", await ReadError(resp));
    }

    // 验收 5c：非法抵扣日期 → 400。
    [Fact]
    public async Task Post_InvalidDeductDate_Returns400()
    {
        SetAuth(await LoginAdminAsync());
        var resp = await Client.PostAsJsonAsync("/api/invoices", new
        {
            name = "非法抵扣日期",
            amount = 1000.0,
            status = "issued",
            type = "invoice_in",
            isDeducted = true,
            deductDate = "2026/10/20",
            deductPeriod = "2026-09",
            deductibleTax = 100.0
        });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("抵扣日期", await ReadError(resp));
    }

    // F1：库内进项 + dto 改销项 + isDeducted=true → 400，库内 type/is_deducted 均不变。
    // 校验与落库共用「归一后的持久化 type」，不能出现 invoice_out + is_deducted=1。
    [Fact]
    public async Task Put_InputInvoice_ForgedToOutput_WithDeduction_Returns400_AndDbUnchanged()
    {
        SetAuth(await LoginAdminAsync());
        var id = SeedInvoice("库内进项反向伪造", "invoice_in");

        var resp = await Client.PutAsJsonAsync("/api/invoices", new
        {
            id,
            name = "库内进项反向伪造",
            amount = 1000.0,
            status = "issued",
            type = "invoice_out",
            isDeducted = true,
            deductPeriod = "2026-09",
            deductibleTax = 100.0
        });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("仅进项发票可登记抵扣", await ReadError(resp));

        // 库内完全不变：type 仍是进项，未登记抵扣
        Assert.Equal("invoice_in", ReadType(id));
        var row = ReadDeduction(id);
        Assert.Equal(0L, row.IsDeducted);
        Assert.Null(row.DeductPeriod);
        Assert.Equal(0L, row.DeductibleTax);
        // 全库不变式：不存在 type != invoice_in 且 is_deducted=1 的行
        Assert.Equal(0L, CountDeductedRowsOutsideInput());
    }

    // F1：库内销项 + dto 不传 type + isDeducted=true → 400，库内 type/is_deducted 均不变。
    // 回落值也走 NormalizeInvoiceType，校验与落库共用同一归一结果。
    [Fact]
    public async Task Put_StoredOutputInvoice_WithoutType_WithDeduction_Returns400_AndDbUnchanged()
    {
        SetAuth(await LoginAdminAsync());
        var id = SeedInvoice("库内销项不传票向", "invoice_out");

        var resp = await Client.PutAsJsonAsync("/api/invoices", new
        {
            id,
            name = "库内销项不传票向",
            amount = 1000.0,
            status = "issued",
            isDeducted = true,
            deductPeriod = "2026-09",
            deductibleTax = 100.0
        });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("仅进项发票可登记抵扣", await ReadError(resp));

        // 库内完全不变：type 仍是销项，未登记抵扣
        Assert.Equal("invoice_out", ReadType(id));
        var row = ReadDeduction(id);
        Assert.Equal(0L, row.IsDeducted);
        Assert.Null(row.DeductPeriod);
        Assert.Equal(0L, row.DeductibleTax);
        // 全库不变式：不存在 type != invoice_in 且 is_deducted=1 的行（含 NULL type）
        Assert.Equal(0L, CountDeductedRowsOutsideInput());
    }

    // F1：dto.Type 为空/空白 → 沿用库内 type（不得写 NULL），抵扣校验用该回落值。
    [Fact]
    public async Task Put_BlankType_FallsBackToStoredType_AndDoesNotWriteNull()
    {
        SetAuth(await LoginAdminAsync());
        var id = SeedInvoice("空白票向", "invoice_in");

        var resp = await Client.PutAsJsonAsync("/api/invoices", new
        {
            id,
            name = "空白票向",
            amount = 1000.0,
            status = "issued",
            type = "   ",
            isDeducted = true,
            deductPeriod = "2026-09",
            deductibleTax = 100.0
        });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        Assert.Equal("invoice_in", ReadType(id));
        var row = ReadDeduction(id);
        Assert.Equal(1L, row.IsDeducted);
        Assert.Equal("2026-09", row.DeductPeriod);
        Assert.Equal(10000L, row.DeductibleTax);
        Assert.Equal(0L, CountDeductedRowsOutsideInput());
    }

    // F2：type 带空格 → Trim 后既用于校验也用于落库，不得带空格入库。
    [Fact]
    public async Task Put_PaddedType_TrimsForValidationAndPersistence()
    {
        SetAuth(await LoginAdminAsync());
        var id = SeedInvoice("票向含空格", "invoice_out");

        var resp = await Client.PutAsJsonAsync("/api/invoices", new
        {
            id,
            name = "票向含空格",
            amount = 1000.0,
            status = "issued",
            type = " invoice_in ",
            isDeducted = true,
            deductPeriod = "2026-09",
            deductibleTax = 50.0
        });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        // 落库是 Trim 后的值，而不是 " invoice_in "
        Assert.Equal("invoice_in", ReadType(id));
        var row = ReadDeduction(id);
        Assert.Equal(1L, row.IsDeducted);
        Assert.Equal(5000L, row.DeductibleTax);
        Assert.Equal(0L, CountDeductedRowsOutsideInput());
    }

    // F2：POST type 带空格 → Trim 后既用于校验也用于落库，不得带空格入库。
    [Fact]
    public async Task Post_PaddedInputType_TrimsForValidationAndPersistence()
    {
        SetAuth(await LoginAdminAsync());
        var resp = await Client.PostAsJsonAsync("/api/invoices", new
        {
            name = "POST 票向含空格",
            amount = 1000.0,
            status = "issued",
            type = " invoice_in ",
            isDeducted = true,
            deductPeriod = "2026-09",
            deductibleTax = 12.34
        });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var id = (await resp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetInt64();

        Assert.Equal("invoice_in", ReadType(id));
        var row = ReadDeduction(id);
        Assert.Equal(1L, row.IsDeducted);
        Assert.Equal(1234L, row.DeductibleTax);
        Assert.Equal(0L, CountDeductedRowsOutsideInput());
    }

    // F5a：PUT 非法所属期 → 400，且不落任何抵扣值。
    [Fact]
    public async Task Put_InvalidDeductPeriod_Returns400()
    {
        SetAuth(await LoginAdminAsync());
        var id = SeedInvoice("PUT 非法所属期", "invoice_in");

        var resp = await Client.PutAsJsonAsync("/api/invoices", new
        {
            id,
            name = "PUT 非法所属期",
            amount = 1000.0,
            status = "issued",
            type = "invoice_in",
            isDeducted = true,
            deductPeriod = "2026-13",
            deductibleTax = 100.0
        });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("税款所属期", await ReadError(resp));
        Assert.Equal(0L, ReadDeduction(id).IsDeducted);
    }

    // F5b：PUT 非法抵扣日期 → 400。
    [Fact]
    public async Task Put_InvalidDeductDate_Returns400()
    {
        SetAuth(await LoginAdminAsync());
        var id = SeedInvoice("PUT 非法日期", "invoice_in");

        var resp = await Client.PutAsJsonAsync("/api/invoices", new
        {
            id,
            name = "PUT 非法日期",
            amount = 1000.0,
            status = "issued",
            type = "invoice_in",
            isDeducted = true,
            deductDate = "2026/10/20",
            deductPeriod = "2026-09",
            deductibleTax = 100.0
        });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("抵扣日期", await ReadError(resp));
        Assert.Equal(0L, ReadDeduction(id).IsDeducted);
    }

    // F5c：PUT 负数可抵扣税额 → 400。
    [Fact]
    public async Task Put_NegativeDeductibleTax_Returns400()
    {
        SetAuth(await LoginAdminAsync());
        var id = SeedInvoice("PUT 负数税额", "invoice_in");

        var resp = await Client.PutAsJsonAsync("/api/invoices", new
        {
            id,
            name = "PUT 负数税额",
            amount = 1000.0,
            status = "issued",
            type = "invoice_in",
            isDeducted = true,
            deductPeriod = "2026-09",
            deductibleTax = -0.01
        });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("不能为负数", await ReadError(resp));
        Assert.Equal(0L, ReadDeduction(id).IsDeducted);
    }

    // F5d：PUT isDeducted=true 但缺所属期 → 400。
    [Fact]
    public async Task Put_DeductedWithoutPeriod_Returns400()
    {
        SetAuth(await LoginAdminAsync());
        var id = SeedInvoice("PUT 缺所属期", "invoice_in");

        var resp = await Client.PutAsJsonAsync("/api/invoices", new
        {
            id,
            name = "PUT 缺所属期",
            amount = 1000.0,
            status = "issued",
            type = "invoice_in",
            isDeducted = true,
            deductibleTax = 100.0
        });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("税款所属期", await ReadError(resp));
        Assert.Equal(0L, ReadDeduction(id).IsDeducted);
    }
}
