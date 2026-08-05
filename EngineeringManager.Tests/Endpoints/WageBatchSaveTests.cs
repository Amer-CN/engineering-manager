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

    // ── D-7 回归 ─────────────────────────────────────────────

    [Fact]
    public async Task TeamWages_DailyWage_ReturnsYuanDirect()
    {
        var token = await LoginAsync();
        SetAuth(token);

        // project_workers.daily_wage 为元直通（ProjectWorkerMiscEndpoints 写入侧未走 ToFen），
        // 写入 200 元后 team-wages 必须原样返回 200，不得 ÷100 成 2
        long pwId;
        using (var conn = new SqliteConnection(ConnectionString))
        {
            var workerId = conn.ExecuteScalar<long>("INSERT INTO workers (name) VALUES ('D7测试工人'); SELECT last_insert_rowid();");
            conn.Execute(@"INSERT INTO project_workers (worker_id,project_id,team_id,daily_wage,status)
                VALUES (@W,@P,@T,200,'active')",
                new { W = workerId, P = TestProjectId, T = 9003L });
            pwId = conn.ExecuteScalar<long>("SELECT last_insert_rowid();");
        }

        // wages 行（actual_wage 走分契约）造一条，让 JOIN 命中
        await Client.PostAsJsonAsync("/api/wages/batch-save",
            new[] { WageBody(TestProjectId, pwId, TestYearMonth, actualWage: 4450) });

        var resp = await Client.GetAsync($"/api/team-wages?projectId={TestProjectId}&teamId=9003");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var data = await GetDataAsync(resp);
        var details = data.GetProperty("details");
        var row = details.EnumerateArray().First();
        Assert.Equal(200.0, row.GetProperty("daily_wage").GetDouble());   // 元直通，不是 2
        Assert.Equal(4450.0, row.GetProperty("total_wage").GetDouble());  // wages 分 → 元
    }

    [Fact]
    public async Task BatchSave_MissingBonus_Returns400()
    {
        var token = await LoginAsync();
        SetAuth(token);

        // 缺 bonus/deduction → 400 且报文指出缺失字段，库内不得新增行
        var resp = await Client.PostAsJsonAsync("/api/wages/batch-save", new[]
        {
            new { projectId = TestProjectId, projectWorkerId = TestPwId, yearMonth = TestYearMonth,
                  dailyWage = 200, workDays = 22, actualWage = 4450 },
        });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        var body = await resp.Content.ReadAsStringAsync();
        Assert.Contains("bonus", body);
        Assert.Contains("deduction", body);

        using var conn = new SqliteConnection(ConnectionString);
        Assert.Equal(0, conn.ExecuteScalar<int>("SELECT COUNT(*) FROM wages"));
    }

    [Fact]
    public async Task PostWages_MissingBonus_Returns400()
    {
        var token = await LoginAsync();
        SetAuth(token);

        // 缺 bonus/deduction/actualWage → 400 且报文指出缺失字段，库内不得新增行
        var resp = await Client.PostAsJsonAsync("/api/wages", new
        {
            projectId = TestProjectId, projectWorkerId = TestPwId, yearMonth = TestYearMonth,
            dailyWage = 200, workDays = 22,
        });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        var body = await resp.Content.ReadAsStringAsync();
        Assert.Contains("bonus", body);
        Assert.Contains("deduction", body);

        using var conn = new SqliteConnection(ConnectionString);
        Assert.Equal(0, conn.ExecuteScalar<int>("SELECT COUNT(*) FROM wages"));
    }

    [Fact]
    public async Task PostWages_PaidNull_ThenBatchSave_Updates()
    {
        var token = await LoginAsync();
        SetAuth(token);

        // POST /api/wages 建一行（不带 paidAmount → 落库 paid_amount IS NULL，真 NULL 不是 0）
        var createResp = await Client.PostAsJsonAsync("/api/wages", new
        {
            projectId = TestProjectId, projectWorkerId = TestPwId, yearMonth = TestYearMonth,
            dailyWage = 200, workDays = 22, bonus = 100, deduction = 50, actualWage = 4450,
        });
        Assert.Equal(HttpStatusCode.OK, createResp.StatusCode);
        using (var conn = new SqliteConnection(ConnectionString))
        {
            var paid = conn.ExecuteScalar<object?>(
                "SELECT paid_amount FROM wages WHERE project_id=@P AND project_worker_id=@W AND year_month=@Y",
                new { P = TestProjectId, W = TestPwId, Y = TestYearMonth });
            Assert.True(paid is null or DBNull, $"paid_amount 应为 NULL，实际: {paid}");
        }

        // batch-save 保存同一业务键 → COALESCE(NULL,0)=0 → 正常更新，skipped=0
        var resp = await Client.PostAsJsonAsync("/api/wages/batch-save",
            new[] { WageBody(TestProjectId, TestPwId, TestYearMonth, dailyWage: 300, actualWage: 300 * 22) });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var data = await GetDataAsync(resp);
        Assert.Equal(1, data.GetProperty("saved").GetInt32());
        Assert.Equal(0, data.GetProperty("skipped").GetInt32());

        using (var conn = new SqliteConnection(ConnectionString))
        {
            var row = conn.QueryFirst(
                "SELECT daily_wage, actual_wage, paid_amount FROM wages WHERE project_id=@P AND project_worker_id=@W AND year_month=@Y",
                new { P = TestProjectId, W = TestPwId, Y = TestYearMonth });
            Assert.Equal(30000L, (long)row.daily_wage);   // 300 元已更新
            Assert.Equal(300 * 22 * 100L, (long)row.actual_wage);
            Assert.True(row.paid_amount is null or DBNull, "paid_amount 仍应为 NULL");
            Assert.Equal(1, conn.ExecuteScalar<int>(
                "SELECT COUNT(*) FROM wages WHERE project_id=@P AND project_worker_id=@W AND year_month=@Y",
                new { P = TestProjectId, W = TestPwId, Y = TestYearMonth }));
        }
    }

    // ── D-9 回归：batch-payment ──────────────────────────────

    private async Task<long> SeedWageRowAsync(double dailyWage = 200, double actualWage = 4450)
    {
        var token = await LoginAsync();
        SetAuth(token);
        await Client.PostAsJsonAsync("/api/wages/batch-save",
            new[] { WageBody(TestProjectId, TestPwId, TestYearMonth, dailyWage, 22, 100, 50, actualWage) });
        using var conn = new SqliteConnection(ConnectionString);
        return conn.ExecuteScalar<long>(
            "SELECT id FROM wages WHERE project_id=@P AND project_worker_id=@W AND year_month=@Y",
            new { P = TestProjectId, W = TestPwId, Y = TestYearMonth });
    }

    [Fact]
    public async Task BatchPayment_UpdatesPaidColumns_InDatabase()
    {
        var id = await SeedWageRowAsync();
        var token = await LoginAsync();
        SetAuth(token);

        var resp = await Client.PostAsJsonAsync("/api/wages/batch-payment",
            new[] { new { id, paidAmount = 4450, paidDate = "2026-08-05" } });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var data = await GetDataAsync(resp);
        Assert.Equal(1, data.GetProperty("saved").GetInt32());
        Assert.Equal(0, data.GetProperty("skipped").GetInt32());

        using var conn = new SqliteConnection(ConnectionString);
        var row = conn.QueryFirst("SELECT paid_amount, paid_date, bank_receipt_path FROM wages WHERE id=@Id", new { Id = id });
        Assert.Equal(445000L, (long)row.paid_amount);      // 4450 元 → 分
        Assert.Equal("2026-08-05", (string)row.paid_date);
        Assert.True(row.bank_receipt_path is null or DBNull);
    }

    [Fact]
    public async Task BatchPayment_MissingBankReceiptPath_KeepsExisting()
    {
        var id = await SeedWageRowAsync();
        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Execute("UPDATE wages SET bank_receipt_path='/x/y.pdf' WHERE id=@Id", new { Id = id });
        }
        var token = await LoginAsync();
        SetAuth(token);

        // 只带 id/paidAmount/paidDate，不带 bankReceiptPath → 不得清空既有回单路径
        var resp = await Client.PostAsJsonAsync("/api/wages/batch-payment",
            new[] { new { id, paidAmount = 4450, paidDate = "2026-08-05" } });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var data = await GetDataAsync(resp);
        Assert.Equal(1, data.GetProperty("saved").GetInt32());

        using var verifyConn = new SqliteConnection(ConnectionString);
        var path = verifyConn.ExecuteScalar<string>("SELECT bank_receipt_path FROM wages WHERE id=@Id", new { Id = id });
        Assert.Equal("/x/y.pdf", path);   // 缺省 = 不改；清空必须走 batch-clear-payments
    }

    [Fact]
    public async Task BatchUnarchive_ThenBatchPayment_Succeeds()
    {
        var id = await SeedWageRowAsync();
        var token = await LoginAsync();
        SetAuth(token);

        // 归档 → 锁定，付款被跳过
        var arch = await Client.PostAsJsonAsync("/api/wages/archive", new[] { id });
        Assert.Equal(HttpStatusCode.OK, arch.StatusCode);
        var archData = await GetDataAsync(arch);
        Assert.Equal(1, archData.GetProperty("archived").GetInt32());
        using (var conn = new SqliteConnection(ConnectionString))
        {
            Assert.Equal(1L, conn.ExecuteScalar<long>("SELECT payment_locked FROM wages WHERE id=@Id", new { Id = id }));
        }

        // 解锁 → 付款应成功
        var unarch = await Client.PostAsJsonAsync("/api/wages/batch-unarchive", new[] { id });
        Assert.Equal(HttpStatusCode.OK, unarch.StatusCode);
        var unarchData = await GetDataAsync(unarch);
        Assert.Equal(1, unarchData.GetProperty("unarchived").GetInt32());
        using (var conn = new SqliteConnection(ConnectionString))
        {
            Assert.Equal(0L, conn.ExecuteScalar<long>("SELECT payment_locked FROM wages WHERE id=@Id", new { Id = id }));
        }

        var pay = await Client.PostAsJsonAsync("/api/wages/batch-payment",
            new[] { new { id, paidAmount = 4450, paidDate = "2026-08-05" } });
        Assert.Equal(HttpStatusCode.OK, pay.StatusCode);
        var payData = await GetDataAsync(pay);
        Assert.Equal(1, payData.GetProperty("saved").GetInt32());
        using (var conn = new SqliteConnection(ConnectionString))
        {
            Assert.Equal(445000L, conn.ExecuteScalar<long>("SELECT paid_amount FROM wages WHERE id=@Id", new { Id = id }));
        }
    }

    [Fact]
    public async Task BatchPayment_MissingPaidDate_Returns400()
    {
        var id = await SeedWageRowAsync();
        var token = await LoginAsync();
        SetAuth(token);

        var resp = await Client.PostAsJsonAsync("/api/wages/batch-payment",
            new[] { new { id, paidAmount = 4450 } });   // 缺 paidDate
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        var body = await resp.Content.ReadAsStringAsync();
        Assert.Contains("paidDate", body);
        Assert.Contains("第 1 条", body);

        using var conn = new SqliteConnection(ConnectionString);
        var paid = conn.ExecuteScalar<object?>("SELECT paid_amount FROM wages WHERE id=@Id", new { Id = id });
        Assert.Equal(0L, Convert.ToInt64(paid));   // batch-save 建行 paid_amount 走 DEFAULT 0，缺字段时不得有变化
    }

    [Fact]
    public async Task BatchPayment_LockedRow_IsSkipped()
    {
        var id = await SeedWageRowAsync();
        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Execute("UPDATE wages SET payment_locked=1 WHERE id=@Id", new { Id = id });
        }
        var token = await LoginAsync();
        SetAuth(token);

        var resp = await Client.PostAsJsonAsync("/api/wages/batch-payment",
            new[] { new { id, paidAmount = 4450, paidDate = "2026-08-05" } });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var data = await GetDataAsync(resp);
        Assert.Equal(0, data.GetProperty("saved").GetInt32());
        Assert.Equal(1, data.GetProperty("skipped").GetInt32());
        Assert.Equal(id, data.GetProperty("skippedItems")[0].GetProperty("id").GetInt64());

        using var verifyConn = new SqliteConnection(ConnectionString);
        var paid = verifyConn.ExecuteScalar<object?>("SELECT paid_amount FROM wages WHERE id=@Id", new { Id = id });
        Assert.Equal(0L, Convert.ToInt64(paid));   // 锁定行付款列不得变化（仍为 DEFAULT 0）
    }

    [Fact]
    public async Task BatchPayment_DoesNotTouchWageColumns()
    {
        var id = await SeedWageRowAsync();
        using (var conn = new SqliteConnection(ConnectionString))
        {
            var before = conn.QueryFirst(
                "SELECT daily_wage, work_days, bonus, deduction, actual_wage FROM wages WHERE id=@Id", new { Id = id });
            Assert.Equal(20000L, (long)before.daily_wage);
            Assert.Equal(22.0, (double)before.work_days);
            Assert.Equal(10000L, (long)before.bonus);
            Assert.Equal(5000L, (long)before.deduction);
            Assert.Equal(445000L, (long)before.actual_wage);
        }
        var token = await LoginAsync();
        SetAuth(token);

        var resp = await Client.PostAsJsonAsync("/api/wages/batch-payment",
            new[] { new { id, paidAmount = 4450, paidDate = "2026-08-05" } });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var data = await GetDataAsync(resp);
        Assert.Equal(1, data.GetProperty("saved").GetInt32());

        using var verifyConn = new SqliteConnection(ConnectionString);
        var after = verifyConn.QueryFirst(
            "SELECT daily_wage, work_days, bonus, deduction, actual_wage, paid_amount FROM wages WHERE id=@Id", new { Id = id });
        Assert.Equal(20000L, (long)after.daily_wage);
        Assert.Equal(22.0, (double)after.work_days);
        Assert.Equal(10000L, (long)after.bonus);
        Assert.Equal(5000L, (long)after.deduction);
        Assert.Equal(445000L, (long)after.actual_wage);
        Assert.Equal(445000L, (long)after.paid_amount);
    }
}
