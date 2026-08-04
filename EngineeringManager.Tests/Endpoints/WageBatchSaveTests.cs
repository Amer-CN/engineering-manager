using Dapper;
using EngineeringManager.Tests.Common;
using Microsoft.Data.Sqlite;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// v0.92.0: wages 单位契约（库内分 / API 元）与 batch-save 显式 upsert 回归测试。
///
/// 覆盖：
///   1. batch-save 写入 → 库内金额为分（200 元 → 20000）
///   2. GET /api/wages 读回 → 金额为元（20000 → 200）
///   3. 同一条保存两次 → 库内仅 1 行（035 部分唯一索引 + upsert）
///   4. paid_amount > 0 的行被保存 → 金额列不变，响应 skipped = 1
///   5. 软删行 + 保存同一业务键 → 新插一行，软删行 deleted_at 不变
///   6. GET /api/wages/stats 聚合金额为元
/// </summary>
public class WageBatchSaveTests : ApiTestBase
{
    private const string Password = "admin123";
    private const long TestProjectId = 9001;
    private const long TestPwId = 9002;
    private const string TestYearMonth = "2026-08";

    private async Task<string> LoginAsync()
    {
        var resp = await Client.PostAsJsonAsync("/api/auth/login", new { username = "admin", password = Password });
        resp.EnsureSuccessStatusCode();
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("data").GetProperty("token").GetString()!;
    }

    private void SetAuth(string token) =>
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private static async Task<JsonElement> GetDataAsync(HttpResponseMessage resp)
    {
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.TryGetProperty("data", out var data),
            "响应缺少 data 字段: " + await resp.Content.ReadAsStringAsync());
        return data;
    }

    private static object WageBody(long projectId, long pwId, string yearMonth, double dailyWage = 200,
        double workDays = 22, double bonus = 100, double deduction = 50, double actualWage = 4450) => new
    {
        projectId, projectWorkerId = pwId, yearMonth,
        dailyWage, workDays, bonus, deduction, actualWage,
    };

    private dynamic? QueryWageRow(long projectId, long pwId, string yearMonth, string? deletedAt)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.QueryFirstOrDefault(
            "SELECT * FROM wages WHERE project_id=@P AND project_worker_id=@W AND year_month=@Y AND deleted_at IS @D",
            new { P = projectId, W = pwId, Y = yearMonth, D = deletedAt });
    }

    private int CountWageRows(long projectId, long pwId, string yearMonth)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.ExecuteScalar<int>(
            "SELECT COUNT(*) FROM wages WHERE project_id=@P AND project_worker_id=@W AND year_month=@Y",
            new { P = projectId, W = pwId, Y = yearMonth });
    }

    [Fact]
    public async Task BatchSave_StoresFen_InDatabase()
    {
        var token = await LoginAsync();
        SetAuth(token);
        var resp = await Client.PostAsJsonAsync("/api/wages/batch-save",
            new[] { WageBody(TestProjectId, TestPwId, TestYearMonth) });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var data = await GetDataAsync(resp);
        Assert.Equal(1, data.GetProperty("saved").GetInt32());
        Assert.Equal(0, data.GetProperty("skipped").GetInt32());

        // 落库为分：200 元 → 20000 分
        var row = QueryWageRow(TestProjectId, TestPwId, TestYearMonth, deletedAt: null);
        Assert.NotNull(row);
        Assert.Equal(20000L, (long)row.daily_wage);
        Assert.Equal(10000L, (long)row.bonus);
        Assert.Equal(5000L, (long)row.deduction);
        Assert.Equal(445000L, (long)row.actual_wage);
    }

    [Fact]
    public async Task GetWages_ReturnsYuan()
    {
        var token = await LoginAsync();
        SetAuth(token);
        await Client.PostAsJsonAsync("/api/wages/batch-save",
            new[] { WageBody(TestProjectId, TestPwId, TestYearMonth) });

        var getResp = await Client.GetAsync($"/api/wages?projectId={TestProjectId}");
        Assert.Equal(HttpStatusCode.OK, getResp.StatusCode);
        var data = await GetDataAsync(getResp);
        Assert.Equal(JsonValueKind.Array, data.ValueKind);
        Assert.Single(data.EnumerateArray());
        var row = data[0];
        // 后端原样返回 snake_case 列名（前端 api-client 负责转 camelCase）
        Assert.Equal(200.0, row.GetProperty("daily_wage").GetDouble());   // 20000 分 → 200 元
        Assert.Equal(100.0, row.GetProperty("bonus").GetDouble());
        Assert.Equal(50.0, row.GetProperty("deduction").GetDouble());
        Assert.Equal(4450.0, row.GetProperty("actual_wage").GetDouble());
    }

    [Fact]
    public async Task BatchSave_Twice_KeepsSingleRow()
    {
        var token = await LoginAsync();
        SetAuth(token);
        var body = new[] { WageBody(TestProjectId, TestPwId, TestYearMonth) };

        var resp1 = await Client.PostAsJsonAsync("/api/wages/batch-save", body);
        Assert.Equal(HttpStatusCode.OK, resp1.StatusCode);
        var data1 = await GetDataAsync(resp1);
        Assert.Equal(1, data1.GetProperty("saved").GetInt32());

        var resp2 = await Client.PostAsJsonAsync("/api/wages/batch-save", body);
        Assert.Equal(HttpStatusCode.OK, resp2.StatusCode);
        var data2 = await GetDataAsync(resp2);
        Assert.Equal(1, data2.GetProperty("saved").GetInt32());

        // upsert 后仍只有 1 行（035 部分唯一索引冲突目标）
        Assert.Equal(1, CountWageRows(TestProjectId, TestPwId, TestYearMonth));
    }

    [Fact]
    public async Task BatchSave_PaidRow_IsSkipped()
    {
        var token = await LoginAsync();
        SetAuth(token);

        // 预置一行已发款记录（paid_amount=10000 分 = 100 元）
        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Execute(@"INSERT INTO wages (project_id,project_worker_id,year_month,daily_wage,work_days,bonus,deduction,actual_wage,paid_amount,status,created_by,created_at,updated_at)
                VALUES (@P,@W,@Y,20000,22.0,10000,5000,445000,10000,'paid','user-old','2026-08-01 00:00:00','2026-08-01 00:00:00')",
                new { P = TestProjectId, W = TestPwId, Y = TestYearMonth });
        }

        // 保存同一条（dailyWage 300 元）
        var resp = await Client.PostAsJsonAsync("/api/wages/batch-save",
            new[] { WageBody(TestProjectId, TestPwId, TestYearMonth, dailyWage: 300, actualWage: 300 * 22) });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var data = await GetDataAsync(resp);
        Assert.Equal(0, data.GetProperty("saved").GetInt32());
        Assert.Equal(1, data.GetProperty("skipped").GetInt32());
        var skipped = data.GetProperty("skippedItems");
        Assert.Equal(1, skipped.GetArrayLength());
        Assert.Equal(TestPwId, skipped[0].GetProperty("projectWorkerId").GetInt64());
        Assert.Equal(TestYearMonth, skipped[0].GetProperty("yearMonth").GetString());

        // 金额列与付款信息保持不变
        var row = QueryWageRow(TestProjectId, TestPwId, TestYearMonth, deletedAt: null);
        Assert.NotNull(row);
        Assert.Equal(20000L, (long)row.daily_wage);   // 未被 300 元覆盖
        Assert.Equal(10000L, (long)row.paid_amount);  // 付款信息未动
        Assert.Equal("paid", (string)row.status);
    }

    [Fact]
    public async Task BatchSave_SoftDeletedRow_InsertsNew()
    {
        var token = await LoginAsync();
        SetAuth(token);

        // 预置一条已软删记录（同业务键）
        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Execute(@"INSERT INTO wages (project_id,project_worker_id,year_month,daily_wage,work_days,bonus,deduction,actual_wage,created_by,created_at,updated_at,deleted_at)
                VALUES (@P,@W,@Y,99999,1.0,0,0,99999,'user-old','2026-08-01 00:00:00','2026-08-01 00:00:00','2026-08-02 00:00:00')",
                new { P = TestProjectId, W = TestPwId, Y = TestYearMonth });
        }

        var resp = await Client.PostAsJsonAsync("/api/wages/batch-save",
            new[] { WageBody(TestProjectId, TestPwId, TestYearMonth) });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var data = await GetDataAsync(resp);
        Assert.Equal(1, data.GetProperty("saved").GetInt32());

        // 共 2 行：软删行原样 + 新插活行（deleted_at IS NULL）
        Assert.Equal(2, CountWageRows(TestProjectId, TestPwId, TestYearMonth));
        var softDeleted = QueryWageRow(TestProjectId, TestPwId, TestYearMonth, deletedAt: "2026-08-02 00:00:00");
        Assert.NotNull(softDeleted);
        Assert.Equal(99999L, (long)softDeleted.daily_wage);        // 软删行未被触碰
        Assert.Equal("2026-08-02 00:00:00", (string)softDeleted.deleted_at);
        var active = QueryWageRow(TestProjectId, TestPwId, TestYearMonth, deletedAt: null);
        Assert.NotNull(active);
        Assert.Equal(20000L, (long)active.daily_wage);             // 新行写入 200 元 → 20000 分
    }

    [Fact]
    public async Task Stats_ReturnsYuan()
    {
        var token = await LoginAsync();
        SetAuth(token);
        await Client.PostAsJsonAsync("/api/wages/batch-save",
            new[] { WageBody(TestProjectId, TestPwId, TestYearMonth, actualWage: 4450) });

        var resp = await Client.GetAsync($"/api/wages/stats?projectId={TestProjectId}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var data = await GetDataAsync(resp);
        Assert.Equal(4450m, data.GetProperty("totalWage").GetDecimal());  // 445000 分 → 4450 元
    }
}
