using Dapper;
using EngineeringManager.Tests.Common;
using Microsoft.Data.Sqlite;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

// ============================================================
// 个税引擎 Wave-T1 端点测试（分进元出 / 鉴权 / 无配置拒绝 / 锁行拒绝 / 首次测算注明）
// 口径：库内分 / API元；换算只走 MoneyUnit。
// ============================================================

public class WageTaxEndpointTests : ApiTestBase
{
    private const string Password = "admin123";

    private async Task<string> LoginAsync(string username = "admin", string password = Password)
    {
        var resp = await Client.PostAsJsonAsync("/api/auth/login", new { username, password });
        resp.EnsureSuccessStatusCode();
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("data").GetProperty("token").GetString()!;
    }

    private void SetAuth(string? token)
    {
        if (token == null) Client.DefaultRequestHeaders.Authorization = null;
        else Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    private static async Task<JsonElement> GetDataAsync(HttpResponseMessage resp)
    {
        var body = await resp.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        Assert.True(json.TryGetProperty("data", out var data), "响应缺少 data 字段: " + body);
        return data;
    }

    private static object CalcBody(object? memberId, string yearMonth, string cityCode,
        double contributionBase = 10000, double grossMonthly = 20000,
        double childEdu = 2000, double bonus = 12000, string? bonusMode = null) => new
    {
        memberId,
        yearMonth,
        cityCode,
        contributionBase,
        grossMonthly,
        childEdu,
        contEdu = 0.0,
        medical = 0.0,
        mortgage = 0.0,
        rent = 0.0,
        elderly = 0.0,
        infant = 0.0,
        bonus,
        bonusMode,
    };

    [Fact]
    public async Task CalcTax_YuanInYuanOut_FirstCalcNote()
    {
        var token = await LoginAsync();
        SetAuth(token);
        var resp = await Client.PostAsJsonAsync("/api/wages/calc-tax",
            CalcBody(7001, "2026-08", "beijing"));
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var data = await GetDataAsync(resp);
        // 分进元出：入参20000元 → 出参20000元
        Assert.Equal(20000.0, data.GetProperty("grossYuan").GetDouble());
        Assert.Equal(2000.0, data.GetProperty("extraYuan").GetProperty("childEdu").GetDouble());
        Assert.Equal(12000.0, data.GetProperty("bonus").GetProperty("amountYuan").GetDouble());
        // 无ledger年份从0起算注明
        Assert.True(data.GetProperty("isFirstCalcOfYear").GetBoolean());
        Assert.Contains("本年首次测算", data.GetProperty("firstNote").GetString());
        // 择优输出两者+建议+差额
        var bonus = data.GetProperty("bonus");
        Assert.True(bonus.TryGetProperty("separateTaxYuan", out _));
        Assert.True(bonus.TryGetProperty("combinedExtraYuan", out _));
        Assert.True(bonus.TryGetProperty("recommended", out var rec));
        Assert.True(rec.GetString() == "separate" || rec.GetString() == "combined");
        Assert.True(bonus.TryGetProperty("savingYuan", out _));
        // 累计口径说明
        Assert.Contains("累计口径", data.GetProperty("calcNote").GetString());
        // GS03引用必带30号
        Assert.Contains("2023年第30号", bonus.GetProperty("lawRef").GetString());
    }

    [Fact]
    public async Task ConfirmTax_PersistsFen_InDatabase()
    {
        var token = await LoginAsync();
        SetAuth(token);
        var resp = await Client.PostAsJsonAsync("/api/wages/confirm-tax",
            CalcBody(7002, "2026-08", "beijing"));
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var data = await GetDataAsync(resp);
        var ledgerId = data.GetProperty("ledgerId").GetInt64();
        Assert.True(ledgerId > 0);

        using var conn = new SqliteConnection(ConnectionString);
        var row = conn.QueryFirst(
            "SELECT [gross_fen], [extra_1], [bonus_fen], [threshold_fen], [city_code] FROM [wage_tax_ledger] WHERE [id]=@Id",
            new { Id = ledgerId });
        // 分进：20000元 → 2000000分；2000元 → 200000分；12000元 → 1200000分
        Assert.Equal(2000000L, (long)row.gross_fen);
        Assert.Equal(200000L, (long)row.extra_1);
        Assert.Equal(1200000L, (long)row.bonus_fen);
        Assert.Equal(500000L, (long)row.threshold_fen);
        Assert.Equal("beijing", (string)row.city_code);
    }

    [Fact]
    public async Task CalcTax_NoAuth_Returns401()
    {
        SetAuth(null);
        var resp = await Client.PostAsJsonAsync("/api/wages/calc-tax",
            CalcBody(7003, "2026-08", "beijing"));
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task ConfirmTax_WorkerWithoutUpdate_Returns403()
    {
        // worker 角色仅 wages:read，无 wages:update → confirm 403，但 calc 可读
        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Open();
            var salt = "taxtest-worker-salt-1234";
            var hash = EngineeringManager.Api.Common.HashPassword("worker123", salt, 2);
            conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
                VALUES ('tax-worker', 'taxworker', 'worker123', @H, @S, 2, '工人', 'worker', 'active', @Now)",
                new { H = hash, S = salt, Now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") });
        }
        var workerToken = await LoginAsync("taxworker", "worker123");
        SetAuth(workerToken);

        var calc = await Client.PostAsJsonAsync("/api/wages/calc-tax",
            CalcBody(7004, "2026-08", "beijing"));
        Assert.Equal(HttpStatusCode.OK, calc.StatusCode);

        var confirm = await Client.PostAsJsonAsync("/api/wages/confirm-tax",
            CalcBody(7004, "2026-08", "beijing"));
        Assert.Equal(HttpStatusCode.Forbidden, confirm.StatusCode);
    }

    [Fact]
    public async Task CalcTax_UnknownCity_RejectsWithMissingName()
    {
        var token = await LoginAsync();
        SetAuth(token);
        var resp = await Client.PostAsJsonAsync("/api/wages/calc-tax",
            CalcBody(7005, "2026-08", "unknown-city-xyz"));
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        var body = await resp.Content.ReadAsStringAsync();
        Assert.Contains("unknown-city-xyz", body);
    }

    [Fact]
    public async Task CalcTax_NullRequiredRate_RejectsWithFieldName()
    {
        var token = await LoginAsync();
        SetAuth(token);
        // 造一个缺 pension_personal 的城市行 → 拒绝提示须含缺项名，禁默认值兜底
        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Open();
            conn.Execute(@"INSERT OR IGNORE INTO [city_insurance_rates]
                ([city_code],[city_name],[pension_corp],[pension_personal],[medical_corp],[medical_personal],
                 [unemp_corp],[unemp_personal],[base_min_fen],[base_max_fen],
                 [housing_min_rate],[housing_max_rate],[housing_base_min_fen],[housing_base_max_fen],
                 [effective_year],[status])
                VALUES ('nullcity','空城',0.16,NULL,0.09,0.02,0.005,0.005,727000,3634800,0.05,0.12,254000,3634800,'2026','official')");
        }
        var resp = await Client.PostAsJsonAsync("/api/wages/calc-tax",
            CalcBody(7006, "2026-08", "nullcity"));
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        var body = await resp.Content.ReadAsStringAsync();
        Assert.Contains("pension_personal", body);
    }

    [Fact]
    public async Task ConfirmTax_LockedWageRow_Returns409()
    {
        var token = await LoginAsync();
        SetAuth(token);
        // 预置该人员当月工资行并归档锁定
        long wageId;
        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Open();
            wageId = conn.ExecuteScalar<long>(@"INSERT INTO [wages]
                ([project_id],[member_id],[year_month],[daily_wage],[work_days],[bonus],[deduction],[actual_wage],[created_by],[created_at],[updated_at])
                VALUES (1,7007,'2026-08',20000,22.0,0,0,440000,'1','2026-08-01 00:00:00','2026-08-01 00:00:00');
                SELECT last_insert_rowid();");
            conn.Execute("UPDATE [wages] SET [payment_locked]=1 WHERE [id]=@Id", new { Id = wageId });
        }
        var resp = await Client.PostAsJsonAsync("/api/wages/confirm-tax",
            CalcBody(7007, "2026-08", "beijing"));
        Assert.Equal(HttpStatusCode.Conflict, resp.StatusCode);
        var body = await resp.Content.ReadAsStringAsync();
        Assert.True(body.Contains("已发款") || body.Contains("已归档"));
    }

    [Fact]
    public async Task ConfirmTax_PaidWageRow_Returns409()
    {
        var token = await LoginAsync();
        SetAuth(token);
        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Open();
            conn.Execute(@"INSERT INTO [wages]
                ([project_id],[member_id],[year_month],[daily_wage],[work_days],[bonus],[deduction],[actual_wage],[paid_amount],[created_by],[created_at],[updated_at])
                VALUES (1,7008,'2026-08',20000,22.0,0,0,440000,440000,'1','2026-08-01 00:00:00','2026-08-01 00:00:00')");
        }
        var resp = await Client.PostAsJsonAsync("/api/wages/confirm-tax",
            CalcBody(7008, "2026-08", "beijing"));
        Assert.Equal(HttpStatusCode.Conflict, resp.StatusCode);
    }

    // ============================================================
    // Wave-T2 reviewer遗留b：BonusMode 三路（低月薪场景择优=combine，能区分显式与择优）
    // grossMonthly=3000 → 累计应纳税为负 → combined差额0 < separate360元 → recommended=combined
    // ============================================================

    private static object LowIncomeBody(object? memberId, string? bonusMode) =>
        CalcBody(memberId, "2026-08", "beijing", contributionBase: 10000,
            grossMonthly: 3000, childEdu: 2000, bonus: 12000, bonusMode: bonusMode);

    private async Task<string> ConfirmBonusModeAsync(object body)
    {
        var resp = await Client.PostAsJsonAsync("/api/wages/confirm-tax", body);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var data = await GetDataAsync(resp);
        var ledgerId = data.GetProperty("ledgerId").GetInt64();
        using var conn = new SqliteConnection(ConnectionString);
        return (string)conn.QueryFirst(
            "SELECT [bonus_mode] FROM [wage_tax_ledger] WHERE [id]=@Id",
            new { Id = ledgerId }).bonus_mode;
    }

    [Fact]
    public async Task ConfirmTax_BonusModeSeparate_RespectsExplicit()
    {
        var token = await LoginAsync();
        SetAuth(token);
        Assert.Equal("separate", await ConfirmBonusModeAsync(LowIncomeBody(7101, "separate")));
    }

    [Fact]
    public async Task ConfirmTax_BonusModeCombined_RespectsExplicit()
    {
        var token = await LoginAsync();
        SetAuth(token);
        Assert.Equal("combined", await ConfirmBonusModeAsync(LowIncomeBody(7102, "combined")));
    }

    [Fact]
    public async Task ConfirmTax_BonusModeAuto_UsesRecommended()
    {
        var token = await LoginAsync();
        SetAuth(token);
        // auto → 择优 combined；calc 响应 mode 与 recommended 一致
        Assert.Equal("combined", await ConfirmBonusModeAsync(LowIncomeBody(7103, "auto")));
        var calc = await Client.PostAsJsonAsync("/api/wages/calc-tax", LowIncomeBody(7103, "auto"));
        Assert.Equal(HttpStatusCode.OK, calc.StatusCode);
        var bonus = (await GetDataAsync(calc)).GetProperty("bonus");
        Assert.Equal("combined", bonus.GetProperty("recommended").GetString());
        Assert.Equal("combined", bonus.GetProperty("mode").GetString());
    }

    [Fact]
    public async Task ConfirmTax_BonusModeMissing_UsesRecommended()
    {
        var token = await LoginAsync();
        SetAuth(token);
        Assert.Equal("combined", await ConfirmBonusModeAsync(LowIncomeBody(7104, null)));
    }

    // ============================================================
    // Wave-T2 读端点：tax-cities / tax-ledger
    // ============================================================

    [Fact]
    public async Task TaxCities_ReturnsSixCities()
    {
        var token = await LoginAsync();
        SetAuth(token);
        var resp = await Client.GetAsync("/api/wages/tax-cities");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var data = await GetDataAsync(resp);
        Assert.True(data.GetArrayLength() >= 6, "期望≥6城（四城+四川+成都）");
        var codes = data.EnumerateArray().Select(e => e.GetProperty("cityCode").GetString()).ToList();
        foreach (var c in new[] { "beijing", "shanghai", "guangzhou", "shenzhen", "sichuan", "chengdu" })
            Assert.Contains(c, codes);
        var cd = data.EnumerateArray().First(e => e.GetProperty("cityCode").GetString() == "chengdu");
        Assert.Equal("成都", cd.GetProperty("cityName").GetString());
        Assert.Equal("2026", cd.GetProperty("effectiveYear").GetString());
        Assert.Equal("转载", cd.GetProperty("status").GetString());
    }

    [Fact]
    public async Task TaxCities_NoAuth_Returns401()
    {
        SetAuth(null);
        var resp = await Client.GetAsync("/api/wages/tax-cities");
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task TaxLedger_EmptyArray_WhenNoRows()
    {
        var token = await LoginAsync();
        SetAuth(token);
        var resp = await Client.GetAsync("/api/wages/tax-ledger?memberId=7199&year=2026");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var data = await GetDataAsync(resp);
        Assert.Equal(0, data.GetArrayLength());
    }

    [Fact]
    public async Task TaxLedger_ReturnsRows_AfterConfirm()
    {
        var token = await LoginAsync();
        SetAuth(token);
        var confirm = await Client.PostAsJsonAsync("/api/wages/confirm-tax",
            CalcBody(7105, "2026-08", "beijing"));
        Assert.Equal(HttpStatusCode.OK, confirm.StatusCode);

        var resp = await Client.GetAsync("/api/wages/tax-ledger?memberId=7105&year=2026");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var data = await GetDataAsync(resp);
        Assert.Equal(1, data.GetArrayLength());
        var row = data.EnumerateArray().First();
        Assert.Equal("2026-08", row.GetProperty("yearMonth").GetString());
        Assert.True(row.TryGetProperty("paidTaxYuan", out _));
        Assert.Equal("beijing", row.GetProperty("cityCode").GetString());
    }
}
