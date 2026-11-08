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
/// T5a：凭证模板与凭证预览。
/// 覆盖：种子模板/分录/科目映射、开票/收票两类预览借贷平衡、@AutoCal 倒挤、
/// 类型不匹配、发票不存在、非法过滤 JSON、未知表达式、科目无命中、
/// 多行 @AutoCal（均 400 且错误可定位到模板/行）。只做预览，不落库、不过账。
/// </summary>
public class VoucherTemplateTests : ApiTestBase
{
    private const string Password = "admin123";

    private async Task AuthAsync()
    {
        var resp = await Client.PostAsJsonAsync("/api/auth/login", new { username = "admin", password = Password });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", json.GetProperty("data").GetProperty("token").GetString());
    }

    private async Task<long> CreateInvoiceAsync(string type, decimal amount, decimal price, decimal tax,
        string category = "special")
    {
        var resp = await Client.PostAsJsonAsync("/api/invoices", new
        {
            name = $"凭证测试-{Guid.NewGuid():N}",
            amount,
            priceAmount = price,
            taxAmount = tax,
            taxRate = 0.06,
            status = "issued",
            type,
            invoiceKind = "paper_special",
            invoiceMedium = "paper",
            invoiceCategory = category
        });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("data").GetInt64();
    }

    private async Task<HttpResponseMessage> PreviewAsync(string code, long invoiceId) =>
        await Client.PostAsJsonAsync($"/api/voucher-templates/{code}/generate-preview", new { invoiceId });

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

    /// <summary>
    /// 直接落一条测试模板（绕开没有模板维护端点的限制）。
    /// filterExpr 同时写入分录行与科目映射行；服务只使用科目映射行上的 filter。
    /// accountCode 为 null 时故意不建科目映射（用于「科目无命中」）。
    /// </summary>
    private long InsertTemplate(string code, string businessType,
        params (int LineNo, int Dc, string AmountExpr, string? FilterExpr, string? AccountCode)[] lines)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var templateId = conn.ExecuteScalar<long>(
            @"INSERT INTO [voucher_templates] ([code],[name],[business_type],[enabled])
              VALUES (@Code,@Name,@BusinessType,1); SELECT last_insert_rowid();",
            new { Code = code, Name = code, BusinessType = businessType });

        foreach (var line in lines)
        {
            var entryId = conn.ExecuteScalar<long>(
                @"INSERT INTO [voucher_template_entries]
                    ([template_id],[line_no],[dc],[summary_template],[amount_expr],[filter_expr])
                  VALUES (@TemplateId,@LineNo,@Dc,'x',@AmountExpr,@FilterExpr);
                  SELECT last_insert_rowid();",
                new { TemplateId = templateId, line.LineNo, line.Dc, line.AmountExpr, line.FilterExpr });

            if (line.AccountCode != null)
            {
                conn.Execute(
                    @"INSERT INTO [voucher_account_maps]
                        ([entry_id],[account_code],[account_name],[priority],[filter_expr])
                      VALUES (@EntryId,@AccountCode,@AccountCode,0,@FilterExpr)",
                    new { EntryId = entryId, line.AccountCode, line.FilterExpr });
            }
        }
        return templateId;
    }

    private void DeleteTemplate(long templateId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        conn.Execute(
            "DELETE FROM [voucher_account_maps] WHERE [entry_id] IN (SELECT [id] FROM [voucher_template_entries] WHERE [template_id]=@T)",
            new { T = templateId });
        conn.Execute("DELETE FROM [voucher_template_entries] WHERE [template_id]=@T", new { T = templateId });
        conn.Execute("DELETE FROM [voucher_templates] WHERE [id]=@T", new { T = templateId });
    }

    // 1. 种子模板 / 分录 / 科目映射齐全，且 6001 行是 @AutoCal、销项税行取税额
    [Fact]
    public async Task GetTemplates_ReturnsTwoSeedTemplates_WithEntriesAndAccountMaps()
    {
        await AuthAsync();
        var data = await ReadData(await Client.GetAsync("/api/voucher-templates"));
        var templates = data.EnumerateArray().ToList();
        Assert.Equal(2, templates.Count);

        var revenue = templates.Single(t => t.GetProperty("code").GetString() == "INV_REVENUE");
        var cost = templates.Single(t => t.GetProperty("code").GetString() == "INV_COST");
        Assert.Equal("invoice_out", revenue.GetProperty("businessType").GetString());
        Assert.Equal("invoice_in", cost.GetProperty("businessType").GetString());

        var revenueEntries = revenue.GetProperty("entries").EnumerateArray().ToList();
        var costEntries = cost.GetProperty("entries").EnumerateArray().ToList();
        Assert.Equal(3, revenueEntries.Count);
        Assert.Equal(3, costEntries.Count);
        Assert.All(revenueEntries, e => Assert.Equal(1, e.GetProperty("accountMaps").GetArrayLength()));
        Assert.All(costEntries, e => Assert.Equal(1, e.GetProperty("accountMaps").GetArrayLength()));

        var revenueAuto = revenueEntries.Single(e => e.GetProperty("lineNo").GetInt32() == 2);
        Assert.Equal("@AutoCal", revenueAuto.GetProperty("amountExpr").GetString());
        Assert.Equal("6001", revenueAuto.GetProperty("accountMaps").EnumerateArray().Single()
            .GetProperty("accountCode").GetString());

        var revenueTax = revenueEntries.Single(e => e.GetProperty("lineNo").GetInt32() == 3);
        Assert.Equal("{invoice.taxAmount}", revenueTax.GetProperty("amountExpr").GetString());
        Assert.Equal("22210105", revenueTax.GetProperty("accountMaps").EnumerateArray().Single()
            .GetProperty("accountCode").GetString());

        var costAuto = costEntries.Single(e => e.GetProperty("lineNo").GetInt32() == 3);
        Assert.Equal("@AutoCal", costAuto.GetProperty("amountExpr").GetString());
        Assert.Equal("2202", costAuto.GetProperty("accountMaps").EnumerateArray().Single()
            .GetProperty("accountCode").GetString());

        // 种子明细为 2 模板 × 3 行 = 6 行（简报验收文字写 9 行，与明细规格不符，按明细实现）
        Assert.Equal(6, revenueEntries.Count + costEntries.Count);
    }

    // 2. 开票收入预览：借=贷=发票金额；6001 行 @AutoCal 倒挤出不含税收入，销项税单独一行
    [Fact]
    public async Task PreviewRevenue_Balanced_AndAutoCalEqualsPrice()
    {
        await AuthAsync();
        var invoiceId = await CreateInvoiceAsync("invoice_out", 1060m, 1000m, 60m);
        var data = await ReadData(await PreviewAsync("INV_REVENUE", invoiceId));

        Assert.Equal(1060m, data.GetProperty("totalDebit").GetDecimal());
        Assert.Equal(1060m, data.GetProperty("totalCredit").GetDecimal());

        var lines = data.GetProperty("lines").EnumerateArray().ToList();
        Assert.Equal(3, lines.Count);

        var debit = lines.Single(l => l.GetProperty("lineNo").GetInt32() == 1);
        Assert.Equal(1, debit.GetProperty("dc").GetInt32());
        Assert.Equal("1122", debit.GetProperty("accountCode").GetString());
        Assert.Equal(1060m, debit.GetProperty("amount").GetDecimal());

        // 第 2 行是 @AutoCal（主营业务收入），倒挤应等于 1060-60=1000
        var autoLine = lines.Single(l => l.GetProperty("lineNo").GetInt32() == 2);
        Assert.Equal(-1, autoLine.GetProperty("dc").GetInt32());
        Assert.Equal("6001", autoLine.GetProperty("accountCode").GetString());
        Assert.Equal(1000m, autoLine.GetProperty("amount").GetDecimal());

        // 第 3 行是销项税，取发票 taxAmount，不再由 @AutoCal 占位
        var taxLine = lines.Single(l => l.GetProperty("lineNo").GetInt32() == 3);
        Assert.Equal(-1, taxLine.GetProperty("dc").GetInt32());
        Assert.Equal("22210105", taxLine.GetProperty("accountCode").GetString());
        Assert.Equal(60m, taxLine.GetProperty("amount").GetDecimal());
    }

    // 3. 收票成本预览：借 原材料+进项税，贷 应付账款（@AutoCal 倒挤）
    [Fact]
    public async Task PreviewCost_Balanced_AndInputTaxIsSeparateLine()
    {
        await AuthAsync();
        var invoiceId = await CreateInvoiceAsync("invoice_in", 1130m, 1000m, 130m);
        var data = await ReadData(await PreviewAsync("INV_COST", invoiceId));

        Assert.Equal(1130m, data.GetProperty("totalDebit").GetDecimal());
        Assert.Equal(1130m, data.GetProperty("totalCredit").GetDecimal());

        var lines = data.GetProperty("lines").EnumerateArray().ToList();
        Assert.Equal(3, lines.Count);
        var material = lines.Single(l => l.GetProperty("accountCode").GetString() == "1403");
        Assert.Equal(1, material.GetProperty("dc").GetInt32());
        Assert.Equal(1000m, material.GetProperty("amount").GetDecimal());
        var inputTax = lines.Single(l => l.GetProperty("accountCode").GetString() == "22210101");
        Assert.Equal(1, inputTax.GetProperty("dc").GetInt32());
        Assert.Equal(130m, inputTax.GetProperty("amount").GetDecimal());
        var payable = lines.Single(l => l.GetProperty("accountCode").GetString() == "2202");
        Assert.Equal(-1, payable.GetProperty("dc").GetInt32());
        Assert.Equal(1130m, payable.GetProperty("amount").GetDecimal());
    }

    // 4. 模板与发票类型不匹配 → 400
    [Fact]
    public async Task Preview_TypeMismatch_Returns400()
    {
        await AuthAsync();
        var invoiceId = await CreateInvoiceAsync("invoice_in", 1130m, 1000m, 130m);
        var resp = await PreviewAsync("INV_REVENUE", invoiceId);
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        var error = await ReadError(resp);
        Assert.Contains("不匹配", error);
        Assert.Contains("INV_REVENUE", error);
        Assert.Contains("invoice_in", error);
    }

    // 5. 发票不存在 → 404
    [Fact]
    public async Task Preview_UnknownInvoice_Returns404()
    {
        await AuthAsync();
        var resp = await PreviewAsync("INV_REVENUE", 99999999);
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
        Assert.Contains("发票不存在", await ReadError(resp));
    }

    // 6. 非法过滤 JSON → 400（fail-closed，不静默 0，错误定位到模板/行）
    [Fact]
    public async Task Preview_InvalidFilterJson_Returns400()
    {
        await AuthAsync();
        var invoiceId = await CreateInvoiceAsync("invoice_out", 1060m, 1000m, 60m);
        var templateId = InsertTemplate("BAD_FILTER", "invoice_out",
            (1, 1, "{invoice.amount}", "{bad json", "1001"));
        try
        {
            var resp = await PreviewAsync("BAD_FILTER", invoiceId);
            Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
            var error = await ReadError(resp);
            Assert.Contains("BAD_FILTER", error);
            Assert.Contains("第 1 行", error);
            Assert.Contains("过滤条件", error);
        }
        finally
        {
            DeleteTemplate(templateId);
        }
    }

    // 7. 未知金额表达式 → 400，不静默按 0 处理
    [Fact]
    public async Task Preview_UnknownAmountExpression_Returns400()
    {
        await AuthAsync();
        var invoiceId = await CreateInvoiceAsync("invoice_out", 1060m, 1000m, 60m);
        var templateId = InsertTemplate("BAD_EXPR", "invoice_out",
            (1, 1, "{invoice.unknown}", null, "1122"));
        try
        {
            var resp = await PreviewAsync("BAD_EXPR", invoiceId);
            Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
            var error = await ReadError(resp);
            Assert.Contains("BAD_EXPR", error);
            Assert.Contains("第 1 行", error);
            Assert.Contains("未知金额表达式", error);
        }
        finally
        {
            DeleteTemplate(templateId);
        }
    }

    // 8. 科目无命中 → 400，错误定位到模板/行
    [Fact]
    public async Task Preview_NoMatchingAccount_Returns400()
    {
        await AuthAsync();
        var invoiceId = await CreateInvoiceAsync("invoice_out", 1060m, 1000m, 60m);
        var templateId = InsertTemplate("NO_ACCOUNT", "invoice_out",
            (1, 1, "{invoice.amount}", null, null));
        try
        {
            var resp = await PreviewAsync("NO_ACCOUNT", invoiceId);
            Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
            var error = await ReadError(resp);
            Assert.Contains("NO_ACCOUNT", error);
            Assert.Contains("第 1 行", error);
            Assert.Contains("科目无命中", error);
        }
        finally
        {
            DeleteTemplate(templateId);
        }
    }

    // 9. 每张模板最多一行 @AutoCal；两行时 400 且列出冲突行号
    [Fact]
    public async Task Preview_MultipleAutoCal_Returns400()
    {
        await AuthAsync();
        var invoiceId = await CreateInvoiceAsync("invoice_out", 1060m, 1000m, 60m);
        var templateId = InsertTemplate("MULTI_AUTO", "invoice_out",
            (1, 1, "{invoice.amount}", null, "1122"),
            (2, -1, "@AutoCal", null, "6001"),
            (3, -1, "@AutoCal", null, "22210105"));
        try
        {
            var resp = await PreviewAsync("MULTI_AUTO", invoiceId);
            Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
            var error = await ReadError(resp);
            Assert.Contains("MULTI_AUTO", error);
            Assert.Contains("最多允许一行 @AutoCal", error);
            Assert.Contains("第 2 行", error);
            Assert.Contains("第 3 行", error);
        }
        finally
        {
            DeleteTemplate(templateId);
        }
    }

    // 10. 未登录访问模板列表 → 401（GlobalAuthMiddleware 强制鉴权）
    [Fact]
    public async Task GetTemplates_WithoutAuth_Returns401()
    {
        var resp = await Client.GetAsync("/api/voucher-templates");
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }
    // 12. 价税合计与发票金额不一致 → 400（防止“借贷平衡但总额错”的预览）
    [Fact]
    public async Task Preview_AmountMismatch_Returns400()
    {
        await AuthAsync();
        // 价税合计 1130 与 price+tax=1100 不一致；@AutoCal 只能保证借贷平衡，总额会错
        var invoiceId = await CreateInvoiceAsync("invoice_in", 1130m, 1000m, 100m);
        var resp = await PreviewAsync("INV_COST", invoiceId);
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("不一致", await ReadError(resp));
    }
}

/// <summary>066 迁移幂等性（独立临时库，不启动 Web 宿主）。</summary>
public class VoucherTemplateMigrationTests
{
    [Fact]
    public void Migration066_IsIdempotent_AndSeedsTwoTemplates()
    {
        var dbPath = Path.Combine(Path.GetTempPath(), $"voucher-066-{Guid.NewGuid()}.db");
        var connStr = $"Data Source={dbPath};Pooling=False";
        try
        {
            MigrationRunner.Run(connStr);

            using (var conn = new SqliteConnection(connStr))
            {
                conn.Open();
                Assert.Equal(2L, conn.ExecuteScalar<long>("SELECT COUNT(*) FROM [voucher_templates]"));
                Assert.Equal(6L, conn.ExecuteScalar<long>("SELECT COUNT(*) FROM [voucher_template_entries]"));
                Assert.Equal(6L, conn.ExecuteScalar<long>("SELECT COUNT(*) FROM [voucher_account_maps]"));
                Assert.Equal(3L, conn.ExecuteScalar<long>(
                    "SELECT COUNT(*) FROM [voucher_template_entries] e JOIN [voucher_templates] t ON t.[id]=e.[template_id] WHERE t.[code]='INV_REVENUE'"));
                Assert.Equal(1L, conn.ExecuteScalar<long>(
                    "SELECT COUNT(*) FROM [voucher_template_entries] e JOIN [voucher_templates] t ON t.[id]=e.[template_id] WHERE t.[code]='INV_REVENUE' AND e.[amount_expr]='@AutoCal'"));
                Assert.Equal(1L, conn.ExecuteScalar<long>(
                    "SELECT COUNT(*) FROM [voucher_template_entries] e JOIN [voucher_templates] t ON t.[id]=e.[template_id] WHERE t.[code]='INV_REVENUE' AND e.[line_no]=3 AND e.[amount_expr]='{invoice.taxAmount}'"));

                var templateColumns = conn.Query<string>("SELECT [name] FROM pragma_table_info('voucher_templates')").ToList();
                foreach (var c in new[] { "id", "code", "name", "business_type", "description", "enabled", "created_at" })
                    Assert.Contains(c, templateColumns);
                var entryColumns = conn.Query<string>("SELECT [name] FROM pragma_table_info('voucher_template_entries')").ToList();
                foreach (var c in new[] { "id", "template_id", "line_no", "dc", "summary_template", "amount_expr", "filter_expr" })
                    Assert.Contains(c, entryColumns);
                var mapColumns = conn.Query<string>("SELECT [name] FROM pragma_table_info('voucher_account_maps')").ToList();
                foreach (var c in new[] { "id", "entry_id", "account_code", "account_name", "priority", "filter_expr" })
                    Assert.Contains(c, mapColumns);
            }

            // 删除 066 的 schema_versions 登记 → 让 Runner 真正再执行一次 066
            using (var conn = new SqliteConnection(connStr))
            {
                conn.Open();
                var deleted = conn.Execute("DELETE FROM schema_versions WHERE script_name LIKE '%066_VoucherTemplates.sql'");
                Assert.Equal(1, deleted);
            }
            MigrationRunner.Run(connStr);

            using (var conn = new SqliteConnection(connStr))
            {
                conn.Open();
                Assert.Equal(2L, conn.ExecuteScalar<long>("SELECT COUNT(*) FROM [voucher_templates]"));
                Assert.Equal(6L, conn.ExecuteScalar<long>("SELECT COUNT(*) FROM [voucher_template_entries]"));
                Assert.Equal(6L, conn.ExecuteScalar<long>("SELECT COUNT(*) FROM [voucher_account_maps]"));
            }
        }
        finally
        {
            SqliteConnection.ClearAllPools();
            foreach (var suffix in new[] { "", "-wal", "-shm" })
            {
                try { if (File.Exists(dbPath + suffix)) File.Delete(dbPath + suffix); } catch { }
            }
        }
    }
}
