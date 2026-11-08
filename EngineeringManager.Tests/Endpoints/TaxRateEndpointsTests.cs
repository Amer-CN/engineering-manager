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
/// T1（P1）：税率主数据 063 迁移 + GET /api/tax-rates + GET /api/tax-rates/resolve。
/// resolve 为纯读端点（query 参数，无 settings:update 权限门，仅需登录）。
/// 覆盖：迁移重复执行不报错、种子 6 档不重复、恰好一档默认；
/// GET 返回 6 条且 code/rate 正确；
/// resolve 三条路径（rule / default / none）+ 非法日期 400。
/// </summary>
public class TaxRateEndpointsTests : ApiTestBase
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

    private long TaxRateId(string code)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.ExecuteScalar<long>("SELECT [id] FROM [tax_rates] WHERE [code]=@C", new { C = code });
    }

    /// <summary>插一条规则（各维度 NULL = 不限该维度）。</summary>
    private void SeedRule(long taxRateId, string? businessType = null, string? partnerTaxType = null,
        string? itemCategory = null, long priority = 0, long enabled = 1)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        conn.Execute(@"INSERT INTO [tax_rules]
            ([business_type],[partner_tax_type],[item_category],[tax_rate_id],[priority],[enabled])
            VALUES (@B,@P,@I,@R,@Pr,@E)",
            new { B = businessType, P = partnerTaxType, I = itemCategory, R = taxRateId, Pr = priority, E = enabled });
    }

    /// <summary>
    /// GET /api/tax-rates/resolve?date=&amp;businessType=&amp;partnerTaxType=&amp;itemCategory=（纯读）。
    /// 未提供的维度不拼进 query；调用方自行保证只传需要的维度。
    /// </summary>
    private Task<HttpResponseMessage> GetResolveAsync(string query) =>
        Client.GetAsync("/api/tax-rates/resolve" + query);

    /// <summary>resolve 成功路径：断言 200 后返回 data。</summary>
    private async Task<JsonElement> ResolveDataAsync(string query)
    {
        var resp = await GetResolveAsync(query);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("data");
    }

    // 验收 1：063 迁移幂等（删掉 schema_versions 登记后真重跑）；
    // 种子 6 档存在、重跑不重复、且恰好一档默认。
    [Fact]
    public void Migration063_IsIdempotent_AndSeedsSixRates()
    {
        var dbPath = Path.Combine(Path.GetTempPath(), $"tax-063-{Guid.NewGuid()}.db");
        var connStr = $"Data Source={dbPath};Pooling=False";
        try
        {
            MigrationRunner.Run(connStr); // 首次：建表 + 种子 6 档

            long RateCount(SqliteConnection c) =>
                c.ExecuteScalar<long>("SELECT COUNT(*) FROM [tax_rates]");

            long DefaultCount(SqliteConnection c) =>
                c.ExecuteScalar<long>("SELECT COUNT(*) FROM [tax_rates] WHERE [is_default]=1");

            using (var conn = new SqliteConnection(connStr))
            {
                conn.Open();
                Assert.Equal(6L, RateCount(conn));
                Assert.Equal(1L, DefaultCount(conn));
                // 默认档即 0% 档（0 为精确值；其余档不用 = 比较：
                // SQLite REAL 存二进制双精度，0.01/0.03 等十进制字面的位表示不等于字面量）
                Assert.Equal(1L, conn.ExecuteScalar<long>(
                    "SELECT COUNT(*) FROM [tax_rates] WHERE [is_default]=1 AND [rate]=0"));
                // 6 档数值集合与 constants.ts taxRateOptions 一致（按精度 4 位比较，避开浮点位差）
                var rates = conn.Query<double>("SELECT [rate] FROM [tax_rates] ORDER BY [rate]")
                    .Select(r => Math.Round(r, 4)).ToList();
                Assert.Equal(new[] { 0d, 0.01d, 0.03d, 0.06d, 0.09d, 0.13d }, rates);
            }

            // F3 同型：删除 063 的 schema_versions 登记 → 让 Runner 真正再执行一次 063 脚本
            // （schema_versions.script_name 存的是完整嵌入资源名，故按后缀匹配）
            using (var conn = new SqliteConnection(connStr))
            {
                conn.Open();
                var deleted = conn.Execute("DELETE FROM schema_versions WHERE script_name LIKE '%063_TaxRatesAndRules.sql'");
                Assert.Equal(1, deleted);
            }
            MigrationRunner.Run(connStr); // 真重跑：CREATE IF NOT EXISTS + INSERT OR IGNORE

            using (var conn = new SqliteConnection(connStr))
            {
                conn.Open();
                Assert.Equal(1L, conn.ExecuteScalar<long>(
                    "SELECT COUNT(*) FROM schema_versions WHERE script_name LIKE '%063_TaxRatesAndRules.sql'"));
                Assert.Equal(6L, RateCount(conn));       // 种子不重复
                Assert.Equal(1L, DefaultCount(conn));    // 默认仍恰好一档
                Assert.Equal(0L, conn.ExecuteScalar<long>("SELECT COUNT(*) FROM [tax_rules]"));

                var columns = conn.Query<string>("SELECT [name] FROM pragma_table_info('tax_rates')").ToList();
                foreach (var c in new[] { "code", "name", "rate", "category", "effective_from", "effective_to", "is_default", "source_note" })
                    Assert.Contains(c, columns);
                var ruleColumns = conn.Query<string>("SELECT [name] FROM pragma_table_info('tax_rules')").ToList();
                foreach (var c in new[] { "business_type", "partner_tax_type", "item_category", "tax_rate_id", "priority", "enabled" })
                    Assert.Contains(c, ruleColumns);

                // 种子行 source_note 注明 FP07
                Assert.Equal(6L, conn.ExecuteScalar<long>(
                    "SELECT COUNT(*) FROM [tax_rates] WHERE [source_note] LIKE '%FP07%'"));
            }
        }
        finally
        {
            SqliteConnection.ClearAllPools();
            try { if (File.Exists(dbPath)) File.Delete(dbPath); } catch { }
        }
    }

    // 验收 2：GET /api/tax-rates 返回 6 条，code/rate 正确。
    [Fact]
    public async Task GetTaxRates_ReturnsSixRows_WithCorrectCodeAndRate()
    {
        SetAuth(await LoginAdminAsync());
        var resp = await Client.GetAsync("/api/tax-rates");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        var rows = json.GetProperty("data").EnumerateArray().ToList();

        Assert.Equal(6, rows.Count);
        // 第 3 轮 R4：GET 投影不含 sourceNote（口径注记留在库内，不出现在响应里）
        Assert.All(rows, r => Assert.False(r.TryGetProperty("sourceNote", out _)));
        var byCode = rows.ToDictionary(r => r.GetProperty("code").GetString()!, r => r.GetProperty("rate").GetDouble());
        Assert.Equal(0d, byCode["VAT0"], 4);
        Assert.Equal(0.01d, byCode["VAT1"], 4);
        Assert.Equal(0.03d, byCode["VAT3"], 4);
        Assert.Equal(0.06d, byCode["VAT6"], 4);
        Assert.Equal(0.09d, byCode["VAT9"], 4);
        Assert.Equal(0.13d, byCode["VAT13"], 4);
        // 按 code 排序
        Assert.Equal(new[] { "VAT0", "VAT1", "VAT13", "VAT3", "VAT6", "VAT9" },
            rows.Select(r => r.GetProperty("code").GetString()!).ToArray());
    }

    // 验收 3a：命中规则 → matchedBy='rule'，取规则税率。
    [Fact]
    public async Task Resolve_WhenRuleMatches_ReturnsRule()
    {
        SetAuth(await LoginAdminAsync());
        SeedRule(TaxRateId("VAT13"), businessType: "material");

        var data = await ResolveDataAsync("?date=2026-10-20&businessType=material");

        Assert.Equal("rule", data.GetProperty("matchedBy").GetString());
        Assert.Equal("VAT13", data.GetProperty("code").GetString());
        Assert.Equal(0.13d, data.GetProperty("rate").GetDouble(), 4);
        Assert.Equal(TaxRateId("VAT13"), data.GetProperty("rateId").GetInt64());
    }

    // 验收 3a'：多规则命中时，非空维度数多者优先（越具体越优先）。
    [Fact]
    public async Task Resolve_MultipleRules_PrefersMoreSpecificDimensions()
    {
        SetAuth(await LoginAdminAsync());
        SeedRule(TaxRateId("VAT13"), businessType: "material");                                  // 1 维
        SeedRule(TaxRateId("VAT9"), businessType: "material", itemCategory: "equipment");         // 2 维

        var data = await ResolveDataAsync("?date=2026-10-20&businessType=material&itemCategory=equipment");

        Assert.Equal("rule", data.GetProperty("matchedBy").GetString());
        Assert.Equal("VAT9", data.GetProperty("code").GetString());
    }

    // 验收 3a''：同维度数时 priority 大者优先（同级再取 id 大者）。
    [Fact]
    public async Task Resolve_SameSpecificity_PrefersHigherPriority()
    {
        SetAuth(await LoginAdminAsync());
        SeedRule(TaxRateId("VAT13"), businessType: "material", priority: 1);
        SeedRule(TaxRateId("VAT9"), businessType: "material", priority: 5);

        var data = await ResolveDataAsync("?date=2026-10-20&businessType=material");

        Assert.Equal("VAT9", data.GetProperty("code").GetString());
    }

    // 验收 3b：无规则但有默认 → matchedBy='default'，落到 0% 档。
    [Fact]
    public async Task Resolve_WithoutRule_FallsBackToDefault()
    {
        SetAuth(await LoginAdminAsync());

        var data = await ResolveDataAsync("?date=2026-10-20");

        Assert.Equal("default", data.GetProperty("matchedBy").GetString());
        Assert.Equal("VAT0", data.GetProperty("code").GetString());
        Assert.Equal(0d, data.GetProperty("rate").GetDouble(), 4);
    }

    // 验收 3b'：规则存在但生效区间不覆盖 date → 不命中该规则，回落默认。
    [Fact]
    public async Task Resolve_RuleOutOfEffectiveRange_FallsBackToDefault()
    {
        SetAuth(await LoginAdminAsync());
        SeedRule(TaxRateId("VAT13"), businessType: "material");
        // 把 13% 档生效期推到 date 之后
        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Open();
            conn.Execute("UPDATE [tax_rates] SET [effective_from]='2027-01-01' WHERE [code]='VAT13'");
        }

        var data = await ResolveDataAsync("?date=2026-10-20&businessType=material");

        Assert.Equal("default", data.GetProperty("matchedBy").GetString());
    }

    // 验收 3c：日期早于生效期 → 规则与默认都不命中 → matchedBy='none'、rate=null。
    [Fact]
    public async Task Resolve_DateBeforeEffectiveFrom_ReturnsNone()
    {
        SetAuth(await LoginAdminAsync());
        SeedRule(TaxRateId("VAT13"), businessType: "material");

        var resp = await GetResolveAsync("?date=2025-12-31&businessType=material");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var data = (await resp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");

        Assert.Equal("none", data.GetProperty("matchedBy").GetString());
        Assert.Equal(JsonValueKind.Null, data.GetProperty("rate").ValueKind);
        Assert.Equal(JsonValueKind.Null, data.GetProperty("code").ValueKind);
    }

    // 验收 3d：非法日期 → 400（形状不符）。
    [Fact]
    public async Task Resolve_InvalidDate_Returns400()
    {
        SetAuth(await LoginAdminAsync());

        var resp = await GetResolveAsync("?date=2026-1-5");

        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Contains("日期格式", json.GetProperty("error").GetString());
    }

    // 第 3 轮 R1：形状合法但日历上不存在的日期也必须 400。
    // 正则只挡形状，2026-13-45 / 2026-02-30 会通过正则；字符串序区间比较会拿它
    // 静默错配，故补 DateTime.TryParseExact 严格校验。
    [Theory]
    [InlineData("2026-13-45")]  // 月份 13、日期 45 都不存在
    [InlineData("2026-02-30")]  // 2 月无 30 日
    public async Task Resolve_ShapeValidButNonexistentDate_Returns400(string badDate)
    {
        SetAuth(await LoginAdminAsync());

        var resp = await GetResolveAsync($"?date={badDate}");

        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Contains("日期格式", json.GetProperty("error").GetString());
    }

    // 验收 3e：已停用规则（enabled=0）不参与命中。
    [Fact]
    public async Task Resolve_DisabledRule_IsIgnored()
    {
        SetAuth(await LoginAdminAsync());
        SeedRule(TaxRateId("VAT13"), businessType: "material", enabled: 0);

        var data = await ResolveDataAsync("?date=2026-10-20&businessType=material");

        Assert.Equal("default", data.GetProperty("matchedBy").GetString());
    }

    // 验收 3f：规则维度值非空且与入参不相等 → 不命中。
    [Fact]
    public async Task Resolve_RuleDimensionMismatch_IsIgnored()
    {
        SetAuth(await LoginAdminAsync());
        SeedRule(TaxRateId("VAT13"), businessType: "material", partnerTaxType: "general");

        var data = await ResolveDataAsync("?date=2026-10-20&businessType=material&partnerTaxType=small_scale");

        Assert.Equal("default", data.GetProperty("matchedBy").GetString());
    }

    // 第 2 轮新增：resolve 是纯读 GET —— 未带 date 时用今天，且维度参数省略即视为不限。
    [Fact]
    public async Task Resolve_WithoutAnyQuery_UsesTodayAndFallsBackToDefault()
    {
        SetAuth(await LoginAdminAsync());

        var data = await ResolveDataAsync("");

        Assert.Equal("default", data.GetProperty("matchedBy").GetString());
        Assert.Equal("VAT0", data.GetProperty("code").GetString());
    }

    // 第 2 轮新增：去掉 settings:update 权限门后，resolve 仍受 GlobalAuthMiddleware 保护（未登录 401）。
    [Fact]
    public async Task Resolve_WithoutAuth_Returns401()
    {
        var resp = await GetResolveAsync("?date=2026-10-20");
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    // 未认证访问 → 401（GlobalAuthMiddleware 强制鉴权，新端点不得加白）
    [Fact]
    public async Task GetTaxRates_WithoutAuth_Returns401()
    {
        var resp = await Client.GetAsync("/api/tax-rates");
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }
}
