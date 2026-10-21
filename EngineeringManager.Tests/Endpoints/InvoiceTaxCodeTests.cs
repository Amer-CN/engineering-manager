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
/// T3：发票税收分类编码（tax_code，金蝶 FTAXCODE / PT IV_GTTAXCODE 口径）
/// 与优惠政策标识（tax_policy，金蝶 FTAXPOLICY 口径）。
/// 覆盖：064 迁移幂等 + 两列可空；POST/PUT 读写一致；GET 经 SELECT i.* 暴露列；
/// 超长与非法字符 400 且错误明确；空串归一为 null（不写空字符串）。
/// </summary>
public class InvoiceTaxCodeTests : ApiTestBase
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

    private long SeedInvoice(string name)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.ExecuteScalar<long>(@"INSERT INTO [invoices]
            (name,amount,status,type,invoice_kind,created_by,created_at,updated_at,version,last_modified_at)
            VALUES (@N,1000,'issued','invoice_in','paper_special','1','2026-08-01 00:00:00','2026-08-01 00:00:00',1,'2026-08-01 00:00:00');
            SELECT last_insert_rowid();",
            new { N = name });
    }

    private (string? TaxCode, string? TaxPolicy) ReadRow(long id)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var row = conn.QueryFirstOrDefault(
            "SELECT [tax_code] AS TaxCode, [tax_policy] AS TaxPolicy FROM [invoices] WHERE [id]=@Id",
            new { Id = id }) ?? throw new InvalidOperationException($"发票 {id} 不存在");
        return ((string?)row.TaxCode, (string?)row.TaxPolicy);
    }

    private async Task<JsonElement> GetInvoiceRowAsync(string name)
    {
        var resp = await Client.GetAsync("/api/invoices");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("data").EnumerateArray()
            .First(e => e.TryGetProperty("name", out var n) && n.GetString() == name);
    }

    // ── 迁移：064 两列可空 + 重复执行幂等（验收 #1）──
    [Fact]
    public void Migration064_AddsNullableColumns_AndIsIdempotent()
    {
        // ApiTestBase 构造时已跑过一次全量迁移；再跑一次验证 ADD COLUMN 重复被良性吞掉
        MigrationRunner.Run(ConnectionString);
        MigrationRunner.Run(ConnectionString);

        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        // NOTNULL 是 SQLite 关键字，别名必须避开（否则 near "NotNull": syntax error）
        var cols = conn.Query("SELECT name, [notnull] AS IsNotNull, type AS ColType FROM pragma_table_info('invoices')")
            .ToDictionary(r => (string)r.name, r => ((long)r.IsNotNull, (string)r.ColType));

        Assert.True(cols.ContainsKey("tax_code"));
        Assert.True(cols.ContainsKey("tax_policy"));
        // 两列可空（notnull=0）且为 TEXT
        Assert.Equal(0, cols["tax_code"].Item1);
        Assert.Equal(0, cols["tax_policy"].Item1);
        Assert.Equal("TEXT", cols["tax_code"].Item2.ToUpperInvariant());
        Assert.Equal("TEXT", cols["tax_policy"].Item2.ToUpperInvariant());
        // 重复执行不得产生重复列
        var names = conn.Query<string>("SELECT name FROM pragma_table_info('invoices')").ToList();
        Assert.Equal(1, names.Count(c => c == "tax_code"));
        Assert.Equal(1, names.Count(c => c == "tax_policy"));
    }

    // ── 用例 1：创建带两字段 → 成功，GET 回读一致（验收 #2）──
    [Fact]
    public async Task Post_WithTaxCodeAndPolicy_Returns200_AndRoundTrips()
    {
        SetAuth(await LoginAdminAsync());
        var resp = await Client.PostAsJsonAsync("/api/invoices", new
        {
            name = "编码政策-创建",
            amount = 100.0,
            status = "issued",
            type = "invoice_in",
            invoiceKind = "paper_special",
            taxCode = "1090101020000000000",
            taxPolicy = "小微企业免税",
        });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var row = await GetInvoiceRowAsync("编码政策-创建");
        Assert.Equal("1090101020000000000", row.GetProperty("tax_code").GetString());
        Assert.Equal("小微企业免税", row.GetProperty("tax_policy").GetString());
    }

    // ── 用例 2：更新两字段 → 回读一致（验收 #2）──
    [Fact]
    public async Task Put_UpdatesBothFields_Returns200_AndRoundTrips()
    {
        SetAuth(await LoginAdminAsync());
        var id = SeedInvoice("编码政策-更新");

        var resp = await Client.PutAsJsonAsync("/api/invoices", new
        {
            id,
            name = "编码政策-更新",
            amount = 100.0,
            taxCode = "ABC123",
            taxPolicy = "即征即退",
        });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var (code, policy) = ReadRow(id);
        Assert.Equal("ABC123", code);
        Assert.Equal("即征即退", policy);

        var row = await GetInvoiceRowAsync("编码政策-更新");
        Assert.Equal("ABC123", row.GetProperty("tax_code").GetString());
        Assert.Equal("即征即退", row.GetProperty("tax_policy").GetString());
    }

    // ── 用例 3a：taxCode 33 字符 → 400（验收 #2）──
    [Fact]
    public async Task Post_TaxCodeTooLong_Returns400()
    {
        SetAuth(await LoginAdminAsync());
        var resp = await Client.PostAsJsonAsync("/api/invoices", new
        {
            name = "编码超长",
            amount = 100.0,
            status = "issued",
            type = "invoice_in",
            invoiceKind = "paper_special",
            taxCode = new string('1', 33),
        });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("税收分类编码", await ReadError(resp));
    }

    // ── 用例 3b：taxCode 含 '-' 或空格 → 400（验收 #2）──
    [Theory]
    [InlineData("1090-1010")]
    [InlineData("1090 1010")]
    [InlineData("１０９０")]
    public async Task Post_TaxCodeIllegalChars_Returns400(string badCode)
    {
        SetAuth(await LoginAdminAsync());
        var resp = await Client.PostAsJsonAsync("/api/invoices", new
        {
            name = "编码非法-" + badCode,
            amount = 100.0,
            status = "issued",
            type = "invoice_in",
            invoiceKind = "paper_special",
            taxCode = badCode,
        });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("税收分类编码", await ReadError(resp));
    }

    // ── 用例 3c：taxPolicy 超长 / 含控制字符 → 400（验收 #2）──
    [Fact]
    public async Task Post_TaxPolicyTooLong_Returns400()
    {
        SetAuth(await LoginAdminAsync());
        var resp = await Client.PostAsJsonAsync("/api/invoices", new
        {
            name = "政策超长",
            amount = 100.0,
            status = "issued",
            type = "invoice_in",
            invoiceKind = "paper_special",
            taxPolicy = new string('政', 65),
        });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("优惠政策", await ReadError(resp));
    }

    [Fact]
    public async Task Post_TaxPolicyWithControlChar_Returns400()
    {
        SetAuth(await LoginAdminAsync());
        var resp = await Client.PostAsJsonAsync("/api/invoices", new
        {
            name = "政策控制符",
            amount = 100.0,
            status = "issued",
            type = "invoice_in",
            invoiceKind = "paper_special",
            taxPolicy = "免税\u0001政策",
        });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("优惠政策", await ReadError(resp));
    }

    // ── 用例 4：空串/空白 → 存 null（回读 null，不写空字符串）（验收 #3）──
    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Post_EmptyStrings_NormalizedToNull(string blank)
    {
        SetAuth(await LoginAdminAsync());
        var name = "空串归一-" + blank.Length;
        var resp = await Client.PostAsJsonAsync("/api/invoices", new
        {
            name,
            amount = 100.0,
            status = "issued",
            type = "invoice_in",
            invoiceKind = "paper_special",
            taxCode = blank,
            taxPolicy = blank,
        });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var row = await GetInvoiceRowAsync(name);
        Assert.Equal(JsonValueKind.Null, row.GetProperty("tax_code").ValueKind);
        Assert.Equal(JsonValueKind.Null, row.GetProperty("tax_policy").ValueKind);
    }

    // ── 用例 5：未传两字段 → 落库 NULL（可空，不阻断既有调用方）──
    [Fact]
    public async Task Post_WithoutFields_PersistsNull()
    {
        SetAuth(await LoginAdminAsync());
        var resp = await Client.PostAsJsonAsync("/api/invoices", new
        {
            name = "未传字段",
            amount = 100.0,
            status = "issued",
            type = "invoice_in",
            invoiceKind = "paper_special",
        });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var row = await GetInvoiceRowAsync("未传字段");
        Assert.Equal(JsonValueKind.Null, row.GetProperty("tax_code").ValueKind);
        Assert.Equal(JsonValueKind.Null, row.GetProperty("tax_policy").ValueKind);
    }

    // ── 用例 6：PUT 清空 → 落库 null（不保留旧值，前端清空即真清空）──
    [Fact]
    public async Task Put_ClearingFields_PersistsNull()
    {
        SetAuth(await LoginAdminAsync());
        var id = SeedInvoice("清空两字段");
        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Open();
            conn.Execute("UPDATE [invoices] SET [tax_code]='OLD1', [tax_policy]='旧政策' WHERE [id]=@Id", new { Id = id });
        }

        var resp = await Client.PutAsJsonAsync("/api/invoices", new
        {
            id,
            name = "清空两字段",
            amount = 100.0,
            taxCode = "",
            taxPolicy = "",
        });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal((null, null), ReadRow(id));
    }

    // ── 用例 7：PUT 非法值 → 400 且库值不变 ──
    [Fact]
    public async Task Put_InvalidTaxCode_Returns400_AndKeepsOld()
    {
        SetAuth(await LoginAdminAsync());
        var id = SeedInvoice("改非法编码");
        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Open();
            conn.Execute("UPDATE [invoices] SET [tax_code]='KEEP1' WHERE [id]=@Id", new { Id = id });
        }

        var resp = await Client.PutAsJsonAsync("/api/invoices", new
        {
            id,
            name = "改非法编码",
            amount = 100.0,
            taxCode = "BAD CODE",
        });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("税收分类编码", await ReadError(resp));
        Assert.Equal("KEEP1", ReadRow(id).TaxCode);
    }
}
