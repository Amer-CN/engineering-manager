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
/// P0-a' 阶段 1：票种两维模型（invoice_medium 介质 + invoice_category 票种细分类）。
/// 覆盖：061 迁移逐列回填 + 同一 SQLite 直接重复执行；POST 新模型（两维→kind 派生）
/// 与旧客户端（kind→两维反推）；PUT 两维优先（忽略冲突 kind）；PUT 三者都不传保留库内值；
/// 快捷状态端点介质门控（kind=NULL + medium=electronic 作废 400）；FP06 介质判断；
/// 非法取值 400。
/// </summary>
public class InvoiceMediumCategoryTests : ApiTestBase
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

    private long SeedInvoice(string name, string status = "issued", string? kind = "paper_regular",
        string? medium = null, string? category = null)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.ExecuteScalar<long>(@"INSERT INTO [invoices]
            (name,amount,status,invoice_kind,invoice_medium,invoice_category,created_by,created_at,updated_at,version,last_modified_at)
            VALUES (@N,1000,@S,@K,@M,@C,'1','2026-08-01 00:00:00','2026-08-01 00:00:00',1,'2026-08-01 00:00:00');
            SELECT last_insert_rowid();",
            new { N = name, S = status, K = kind, M = medium, C = category });
    }

    private (string? Kind, string? Medium, string? Category) ReadFields(long id)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var row = conn.QueryFirstOrDefault(
            "SELECT [invoice_kind] AS Kind, [invoice_medium] AS Medium, [invoice_category] AS Category FROM [invoices] WHERE [id]=@Id",
            new { Id = id }) ?? throw new InvalidOperationException($"发票 {id} 不存在");
        return ((string?)row.Kind, (string?)row.Medium, (string?)row.Category);
    }

    private async Task<long> PostInvoiceAsync(object body)
    {
        var resp = await Client.PostAsJsonAsync("/api/invoices", body);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        return (await resp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetInt64();
    }

    private async Task<HttpResponseMessage> PutStatusAsync(long id, string status) =>
        await Client.PutAsJsonAsync($"/api/invoices/{id}/status", new { status });

    private static async Task<string> ReadError(HttpResponseMessage resp)
    {
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.TryGetProperty("error", out var e) ? e.GetString() ?? "" : "";
    }

    // 直接读取内嵌 061 脚本（不经过 schema_versions 判定）
    private static string Load061Sql()
    {
        var asm = typeof(MigrationRunner).Assembly;
        var name = asm.GetManifestResourceNames()
            .Single(n => n.EndsWith("061_InvoiceMediumCategory.sql", StringComparison.OrdinalIgnoreCase));
        using var stream = asm.GetManifestResourceStream(name)!;
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }

    // 逐条直接执行 061；仅吞 ALTER ADD COLUMN 的 duplicate column（其余错误必须暴露）
    private static void Execute061Direct(SqliteConnection conn, string sql)
    {
        foreach (var raw in sql.Split(';'))
        {
            var stmt = raw.Trim();
            if (stmt.Length == 0) continue;
            try
            {
                conn.Execute(stmt);
            }
            catch (SqliteException ex) when (ex.Message.Contains("duplicate column name", StringComparison.OrdinalIgnoreCase))
            {
                // 第二次执行时列已存在：与 MigrationRunner 的良性吞错同口径
            }
        }
    }

    // 测试 6：061 对同一 SQLite 直接连跑两次（不依赖 schema_versions 跳过）；
    // 半状态（medium 有值/category NULL）被回填；category 有值/medium NULL 时 category 不被清空。
    [Fact]
    public void Migration061_DirectSqlTwice_BackfillsHalfStatesWithoutLosingCategory()
    {
        var dbPath = Path.Combine(Path.GetTempPath(), $"invoice-061-direct-{Guid.NewGuid()}.db");
        var connStr = $"Data Source={dbPath};Pooling=False";
        try
        {
            // 停在 061 之前，再手工建列模拟"半应用"历史库
            MigrationRunner.Run(connStr, "061_InvoiceMediumCategory.sql");
            using var conn = new SqliteConnection(connStr);
            conn.Open();
            conn.Execute("ALTER TABLE [invoices] ADD COLUMN [invoice_medium] TEXT");
            conn.Execute("ALTER TABLE [invoices] ADD COLUMN [invoice_category] TEXT");

            void InsertHalfState(string name, string kind, string? medium, string? category) =>
                conn.Execute(@"INSERT INTO [invoices]
                    (name,amount,status,invoice_kind,invoice_medium,invoice_category,created_by,created_at,updated_at,version,last_modified_at)
                    VALUES (@N,100,'issued',@K,@M,@C,'1','2026-01-01 00:00:00','2026-01-01 00:00:00',1,'2026-01-01 00:00:00')",
                    new { N = name, K = kind, M = medium, C = category });

            InsertHalfState("medium-filled", "paper_regular", "paper", null);        // 应回填 category=regular
            InsertHalfState("category-filled", "electronic_special", null, "special"); // 应回填 medium=electronic
            InsertHalfState("category-kept", "paper_regular", null, "toll");         // medium 回填，category 不得被改回 regular
            InsertHalfState("both-null", "electronic_regular", null, null);          // 两列都回填

            var sql = Load061Sql();
            Execute061Direct(conn, sql);
            Execute061Direct(conn, sql); // 同一 SQLite 直接重复执行第二次

            var rows = conn.Query<(string Name, string? Medium, string? Category)>(
                "SELECT [name] AS Name, [invoice_medium] AS Medium, [invoice_category] AS Category FROM [invoices] ORDER BY [name]").ToList();
            Assert.Equal(4, rows.Count);
            Assert.Equal(("both-null", "electronic", "regular"), rows[0]);
            Assert.Equal(("category-filled", "electronic", "special"), rows[1]);
            Assert.Equal(("category-kept", "paper", "toll"), rows[2]);
            Assert.Equal(("medium-filled", "paper", "regular"), rows[3]);
        }
        finally
        {
            SqliteConnection.ClearAllPools();
            try { if (File.Exists(dbPath)) File.Delete(dbPath); } catch { }
        }
    }

    // 既有回归：MigrationRunner 全量跑两遍，四类存量 kind 均回填（不产生 NULL）。
    [Fact]
    public void Migration061_BackfillsLegacyKinds_AndIsIdempotent()
    {
        var dbPath = Path.Combine(Path.GetTempPath(), $"invoice-061-{Guid.NewGuid()}.db");
        var connStr = $"Data Source={dbPath};Pooling=False";
        try
        {
            MigrationRunner.Run(connStr, "061_InvoiceMediumCategory.sql");
            using (var conn = new SqliteConnection(connStr))
            {
                conn.Open();
                foreach (var kind in new[] { "electronic_regular", "electronic_special", "paper_regular", "paper_special" })
                    conn.Execute(@"INSERT INTO [invoices]
                        (name,amount,status,invoice_kind,created_by,created_at,updated_at,version,last_modified_at)
                        VALUES (@N,100,'issued',@K,'1','2026-01-01 00:00:00','2026-01-01 00:00:00',1,'2026-01-01 00:00:00')",
                        new { N = kind, K = kind });
                // 预置两列（模拟半应用状态），ALTER 重跑将被 Runner 吞掉
                conn.Execute("ALTER TABLE [invoices] ADD COLUMN [invoice_medium] TEXT");
                conn.Execute("ALTER TABLE [invoices] ADD COLUMN [invoice_category] TEXT");
            }

            MigrationRunner.Run(connStr);
            MigrationRunner.Run(connStr); // 重复执行不报错

            using (var conn = new SqliteConnection(connStr))
            {
                conn.Open();
                var rows = conn.Query<string>(
                    @"SELECT [invoice_kind] || '|' || [invoice_medium] || '|' || [invoice_category]
                      FROM [invoices] ORDER BY [invoice_kind]").ToList();
                Assert.Equal(new[]
                {
                    "electronic_regular|electronic|regular",
                    "electronic_special|electronic|special",
                    "paper_regular|paper|regular",
                    "paper_special|paper|special"
                }, rows);
            }
        }
        finally
        {
            SqliteConnection.ClearAllPools();
            try { if (File.Exists(dbPath)) File.Delete(dbPath); } catch { }
        }
    }

    // 测试 1：快捷状态端点必须看 invoice_medium —— kind=NULL + electronic 作废 400，paper 放行 200。
    [Fact]
    public async Task QuickStatus_Cancel_UsesMedium_WhenLegacyKindIsNull()
    {
        SetAuth(await LoginAdminAsync());

        var electronicId = await PostInvoiceAsync(new
        {
            name = "快捷作废-电子旅客运输",
            amount = 100.0,
            status = "issued",
            invoiceMedium = "electronic",
            invoiceCategory = "passenger_transport"
        });
        Assert.Null(ReadFields(electronicId).Kind);

        var rejected = await PutStatusAsync(electronicId, "cancelled");
        Assert.Equal(HttpStatusCode.BadRequest, rejected.StatusCode);
        Assert.Contains("数电票不能作废", await ReadError(rejected));

        var paperId = await PostInvoiceAsync(new
        {
            name = "快捷作废-纸质旅客运输",
            amount = 100.0,
            status = "issued",
            invoiceMedium = "paper",
            invoiceCategory = "passenger_transport"
        });
        Assert.Null(ReadFields(paperId).Kind);

        var allowed = await PutStatusAsync(paperId, "cancelled");
        Assert.Equal(HttpStatusCode.OK, allowed.StatusCode);
    }

    // 测试 2：PUT 同时传冲突 kind + 两维 → 两维优先，落库 paper_regular。
    [Fact]
    public async Task Put_ConflictingKindAndDimensions_DimensionsWin()
    {
        SetAuth(await LoginAdminAsync());
        var id = SeedInvoice("两维优先", status: "issued", kind: "electronic_regular", medium: "electronic", category: "regular");

        var resp = await Client.PutAsJsonAsync("/api/invoices", new
        {
            id,
            name = "两维优先",
            amount = 100.0,
            status = "issued",
            invoiceKind = "electronic_special",
            invoiceMedium = "paper",
            invoiceCategory = "regular"
        });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var fields = ReadFields(id);
        Assert.Equal("paper_regular", fields.Kind);
        Assert.Equal("paper", fields.Medium);
        Assert.Equal("regular", fields.Category);
    }

    // 测试 3：三者都不传的 PUT → 库内 kind/medium/category 全部保持不变。
    [Fact]
    public async Task Put_NoKindOrDimensions_KeepsStoredValues()
    {
        SetAuth(await LoginAdminAsync());
        var id = SeedInvoice("保持原值", status: "issued", kind: "paper_special", medium: "paper", category: "special");

        var resp = await Client.PutAsJsonAsync("/api/invoices", new
        {
            id,
            name = "保持原值",
            amount = 100.0,
            status = "issued"
        });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var fields = ReadFields(id);
        Assert.Equal("paper_special", fields.Kind);
        Assert.Equal("paper", fields.Medium);
        Assert.Equal("special", fields.Category);
    }

    // 测试 4：只传 medium，库内 kind=NULL、category=passenger_transport → kind 保持 NULL，cancel 400。
    [Fact]
    public async Task Put_MediumOnly_WithNullKindAndNonFoldableCategory_KeepsKindNullAndRejectsCancel()
    {
        SetAuth(await LoginAdminAsync());
        var id = SeedInvoice("只传介质", status: "issued", kind: null, medium: "paper", category: "passenger_transport");

        var resp = await Client.PutAsJsonAsync("/api/invoices", new
        {
            id,
            name = "只传介质",
            amount = 100.0,
            status = "cancelled",
            invoiceMedium = "electronic"
        });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("数电票不能作废", await ReadError(resp));

        var fields = ReadFields(id);
        Assert.Null(fields.Kind);
        Assert.Equal("paper", fields.Medium); // 400 在 UPDATE 之前，库内不落库
        Assert.Equal("passenger_transport", fields.Category);
    }

    // 测试 5：两维 special/regular → kind 派生正确。
    [Theory]
    [InlineData("electronic", "special", "electronic_special")]
    [InlineData("electronic", "regular", "electronic_regular")]
    [InlineData("paper", "special", "paper_special")]
    [InlineData("paper", "regular", "paper_regular")]
    public async Task Post_TwoDimensions_DeriveLegacyKind(string medium, string category, string expectedKind)
    {
        SetAuth(await LoginAdminAsync());
        var id = await PostInvoiceAsync(new
        {
            name = $"两维派生-{medium}-{category}",
            amount = 100.0,
            status = "issued",
            invoiceMedium = medium,
            invoiceCategory = category
        });

        var fields = ReadFields(id);
        Assert.Equal(expectedKind, fields.Kind);
        Assert.Equal(medium, fields.Medium);
        Assert.Equal(category, fields.Category);
    }

    // 既有：POST 传 medium=electronic + category=passenger_transport → 两维落库、kind 为 NULL
    [Fact]
    public async Task Post_MediumAndCategory_DerivesNullLegacyKind()
    {
        SetAuth(await LoginAdminAsync());
        var id = await PostInvoiceAsync(new
        {
            name = "旅客运输电子票",
            amount = 100.0,
            status = "issued",
            invoiceMedium = "electronic",
            invoiceCategory = "passenger_transport"
        });

        var fields = ReadFields(id);
        Assert.Null(fields.Kind);
        Assert.Equal("electronic", fields.Medium);
        Assert.Equal("passenger_transport", fields.Category);
    }

    // 既有：POST 只传 invoiceKind=electronic_special（旧客户端）→ 两维反推落库
    [Fact]
    public async Task Post_LegacyKindOnly_BackfillsMediumAndCategory()
    {
        SetAuth(await LoginAdminAsync());
        var id = await PostInvoiceAsync(new
        {
            name = "旧客户端电子专票",
            amount = 100.0,
            status = "issued",
            invoiceKind = "electronic_special"
        });

        var fields = ReadFields(id);
        Assert.Equal("electronic_special", fields.Kind);
        Assert.Equal("electronic", fields.Medium);
        Assert.Equal("special", fields.Category);
    }

    // 既有：PUT 改介质 electronic 且 status=cancelled → 400（FP06 介质判断）
    [Fact]
    public async Task Put_CancelElectronicMedium_Returns400()
    {
        SetAuth(await LoginAdminAsync());
        var id = SeedInvoice("改电子介质作废", status: "issued", kind: "paper_regular");
        var resp = await Client.PutAsJsonAsync("/api/invoices", new
        {
            id,
            name = "改电子介质作废",
            amount = 100.0,
            status = "cancelled",
            invoiceMedium = "electronic"
        });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("数电票不能作废", await ReadError(resp));
    }

    // 既有：PUT 改介质 paper 且 status=cancelled → 允许（dto 介质优先，压过库内 legacy electronic kind）
    [Fact]
    public async Task Put_CancelPaperMedium_Returns200()
    {
        SetAuth(await LoginAdminAsync());
        var id = SeedInvoice("改纸介质作废", status: "issued", kind: "electronic_regular");
        var resp = await Client.PutAsJsonAsync("/api/invoices", new
        {
            id,
            name = "改纸介质作废",
            amount = 100.0,
            status = "cancelled",
            invoiceMedium = "paper"
        });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var fields = ReadFields(id);
        Assert.Equal("paper", fields.Medium);
        Assert.Equal("paper_regular", fields.Kind); // category 由库内 kind 反推 regular，再折叠为 paper_regular
    }

    // 测试 7：POST status=cancelled + medium=electronic → 400（新建即作废的数电票被拒）。
    [Fact]
    public async Task Post_CancelledElectronicMedium_Returns400()
    {
        SetAuth(await LoginAdminAsync());
        var resp = await Client.PostAsJsonAsync("/api/invoices", new
        {
            name = "新建即作废数电票",
            amount = 100.0,
            status = "cancelled",
            invoiceMedium = "electronic",
            invoiceCategory = "passenger_transport"
        });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("数电票不能作废", await ReadError(resp));
    }

    // 既有：category 不在 8 值内 → 400 且不落库
    [Fact]
    public async Task Post_InvalidCategory_Returns400()
    {
        SetAuth(await LoginAdminAsync());
        var resp = await Client.PostAsJsonAsync("/api/invoices", new
        {
            name = "非法票种",
            amount = 100.0,
            status = "issued",
            invoiceMedium = "electronic",
            invoiceCategory = "gift_card"
        });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("介质/票种", await ReadError(resp));
    }
}
