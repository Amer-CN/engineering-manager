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
/// 窗口 E：考勤生成/导入本体回归测试 + 其余 STUB 显式错误化验证。
///
/// 覆盖（生成）：
///   1. generate-v2 为无考勤的活跃工人建「默认全勤」行（work_days=当月天数、
///      daily_status 全 work JSON、is_full_attendance=1、member_id NULL）
///   2. 幂等：重复调用不新增行
///   3. 已有考勤的工人跳过，只补缺的
///   4. 参数缺失 / yearMonth 非法 → 400
///   5. generate（v1, memberIds）staff 路径同语义
/// 覆盖（导入）：
///   6. batch-import 按 (projectId, yearMonth, projectWorkerId) upsert：新建 created++、
///      已存在只刷新 work_days（updated++）
///   7. 缺字段 → 400；空 records → 200 {0,0}
/// 覆盖（STUB 显式错误化）：
///   8. export-json / reconcile / sqlite-enable → 501 + 明确「未实现」错误信息（不再假成功）
///      （I-1 起 snapshots-max-count、I-2 起 match-receipts/confirm-matches 已接通本体，
///       501 测试移除 → WritePermissionB1Tests / ReceiptMatchTests）
/// </summary>
public class WageAttendanceGenerateTests : ApiTestBase
{
    private const string Password = "admin123";
    private const long TestProjectId = 9201;
    private const string TestYearMonth = "2026-08"; // 31 天
    private const string Now = "2026-08-01 00:00:00";

    private async Task<string> LoginAsync()
    {
        var resp = await Client.PostAsJsonAsync("/api/auth/login", new { username = "admin", password = Password });
        resp.EnsureSuccessStatusCode();
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("data").GetProperty("token").GetString()!;
    }

    private void SetAuth(string token) =>
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    /// <summary>seed 一个活跃项目工人，返回 project_workers.id</summary>
    private long SeedProjectWorker()
    {
        using var conn = new SqliteConnection(ConnectionString);
        var workerId = conn.ExecuteScalar<long>("INSERT INTO workers (name) VALUES ('考勤生成测试工人'); SELECT last_insert_rowid();");
        conn.Execute(@"INSERT INTO project_workers (worker_id,project_id,team_id,daily_wage,worker_type,entry_date,status,created_by,created_at,last_modified_at)
            VALUES (@W,@P,NULL,300,'瓦工','2026-01-01','active',@U,@Now,@Now)",
            new { W = workerId, P = TestProjectId, U = "user-test", Now });
        return conn.ExecuteScalar<long>("SELECT last_insert_rowid();");
    }

    private void SeedAttendance(long pwId, double workDays)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Execute(@"INSERT INTO attendances (member_id,project_id,project_worker_id,year_month,work_days,created_by,created_at,updated_at)
            VALUES (NULL,@P,@PW,@Y,@W,@U,@Now,@Now)",
            new { P = TestProjectId, PW = pwId, Y = TestYearMonth, W = workDays, U = "user-test", Now });
    }

    private dynamic? QueryAttendanceRow(long? pwId = null, long? memberId = null)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.QueryFirstOrDefault(
            "SELECT * FROM attendances WHERE project_id=@P AND year_month=@Y AND (project_worker_id=@PW OR member_id=@M)",
            new { P = TestProjectId, Y = TestYearMonth, PW = pwId, M = memberId });
    }

    [Fact]
    public async Task GenerateV2_CreatesDefaultRows_ForWorkersWithoutAttendance()
    {
        var token = await LoginAsync();
        SetAuth(token);

        var pw1 = SeedProjectWorker();
        var pw2 = SeedProjectWorker();

        var resp = await Client.PostAsJsonAsync("/api/attendances/generate-v2",
            new { projectId = TestProjectId, yearMonth = TestYearMonth, projectWorkerIds = new[] { pw1, pw2 } });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(2, json.GetProperty("data").GetProperty("count").GetInt32());

        // 库内行：默认全勤（2026-08 = 31 天），daily_status 全 work JSON
        using (var conn = new SqliteConnection(ConnectionString))
        {
            var row1 = conn.QueryFirst("SELECT * FROM attendances WHERE project_id=@P AND project_worker_id=@W AND year_month=@Y",
                new { P = TestProjectId, W = pw1, Y = TestYearMonth });
            Assert.Equal(31.0, (double)row1.work_days);
            Assert.Equal(1L, (long)row1.is_full_attendance);
            Assert.Equal(0L, (long)row1.days_off);
            Assert.True(row1.member_id is null or DBNull, "worker 行 member_id 应为 NULL");
            var status = JsonSerializer.Deserialize<Dictionary<string, string>>((string)row1.daily_status)!;
            Assert.Equal(31, status.Count);
            Assert.Equal("work", status["1"]);
            Assert.Equal("work", status["31"]);

            var row2 = conn.QueryFirst("SELECT * FROM attendances WHERE project_id=@P AND project_worker_id=@W AND year_month=@Y",
                new { P = TestProjectId, W = pw2, Y = TestYearMonth });
            Assert.Equal(31.0, (double)row2.work_days);
        }
    }

    [Fact]
    public async Task GenerateV2_Idempotent_RepeatedCallNoDuplicates()
    {
        var token = await LoginAsync();
        SetAuth(token);

        var pw1 = SeedProjectWorker();

        var body = new { projectId = TestProjectId, yearMonth = TestYearMonth, projectWorkerIds = new[] { pw1 } };
        var resp1 = await Client.PostAsJsonAsync("/api/attendances/generate-v2", body);
        Assert.Equal(HttpStatusCode.OK, resp1.StatusCode);
        var json1 = await resp1.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(1, json1.GetProperty("data").GetProperty("count").GetInt32());

        var resp2 = await Client.PostAsJsonAsync("/api/attendances/generate-v2", body);
        Assert.Equal(HttpStatusCode.OK, resp2.StatusCode);
        var json2 = await resp2.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(0, json2.GetProperty("data").GetProperty("count").GetInt32());

        using var conn = new SqliteConnection(ConnectionString);
        Assert.Equal(1, conn.ExecuteScalar<int>(
            "SELECT COUNT(*) FROM attendances WHERE project_id=@P AND project_worker_id=@W AND year_month=@Y",
            new { P = TestProjectId, W = pw1, Y = TestYearMonth }));
    }

    [Fact]
    public async Task GenerateV2_SkipsExisting_CountsOnlyMissing()
    {
        var token = await LoginAsync();
        SetAuth(token);

        var pw1 = SeedProjectWorker();
        var pw2 = SeedProjectWorker();
        SeedAttendance(pw1, 20); // pw1 已有考勤

        var resp = await Client.PostAsJsonAsync("/api/attendances/generate-v2",
            new { projectId = TestProjectId, yearMonth = TestYearMonth, projectWorkerIds = new[] { pw1, pw2 } });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(1, json.GetProperty("data").GetProperty("count").GetInt32());

        // pw1 的 20 天不被默认全勤覆盖
        var row1 = QueryAttendanceRow(pwId: pw1)!;
        Assert.NotNull(row1);
        Assert.Equal(20.0, (double)row1.work_days);
    }

    [Fact]
    public async Task GenerateV2_MissingOrInvalidParams_Returns400()
    {
        var token = await LoginAsync();
        SetAuth(token);

        var resp1 = await Client.PostAsJsonAsync("/api/attendances/generate-v2", new { });
        Assert.Equal(HttpStatusCode.BadRequest, resp1.StatusCode);
        var body1 = await resp1.Content.ReadAsStringAsync();
        Assert.Contains("projectId", body1);
        Assert.Contains("yearMonth", body1);

        var resp2 = await Client.PostAsJsonAsync("/api/attendances/generate-v2", new { projectId = TestProjectId });
        Assert.Equal(HttpStatusCode.BadRequest, resp2.StatusCode);
        Assert.Contains("yearMonth", await resp2.Content.ReadAsStringAsync());

        // 非法月份 13 月 → 400（不许 DaysInMonth 抛 500）
        var resp3 = await Client.PostAsJsonAsync("/api/attendances/generate-v2",
            new { projectId = TestProjectId, yearMonth = "2026-13", projectWorkerIds = new long[] { } });
        Assert.Equal(HttpStatusCode.BadRequest, resp3.StatusCode);
        Assert.Contains("YYYY-MM", await resp3.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Generate_MemberPath_CreatesRows()
    {
        var token = await LoginAsync();
        SetAuth(token);

        long memberId;
        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Execute(@"INSERT INTO members (name,member_type,daily_wage,status,created_by,created_at)
                VALUES ('测试成员','staff',250,'active','user-test',@Now)",
                new { Now });
            memberId = conn.ExecuteScalar<long>("SELECT last_insert_rowid();");
        }

        var resp = await Client.PostAsJsonAsync("/api/attendances/generate",
            new { projectId = TestProjectId, yearMonth = TestYearMonth, memberIds = new[] { memberId } });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(1, json.GetProperty("data").GetProperty("count").GetInt32());

        var row = QueryAttendanceRow(memberId: memberId)!;
        Assert.NotNull(row);
        Assert.Equal(31.0, (double)row.work_days);
        Assert.Equal(memberId, (long)row.member_id);
        Assert.True(row.project_worker_id is null or DBNull);
    }

    [Fact]
    public async Task BatchImport_CreatesThenUpdates_ByProjectWorker()
    {
        var token = await LoginAsync();
        SetAuth(token);

        var pw1 = SeedProjectWorker();
        var pw2 = SeedProjectWorker();

        // 第一轮：两个都新建
        var resp1 = await Client.PostAsJsonAsync("/api/attendances/batch-import",
            new
            {
                projectId = TestProjectId, yearMonth = TestYearMonth,
                records = new[] { new { projectWorkerId = pw1, workDays = 20.0 }, new { projectWorkerId = pw2, workDays = 22.5 } },
            });
        Assert.Equal(HttpStatusCode.OK, resp1.StatusCode);
        var json1 = await resp1.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(2, json1.GetProperty("data").GetProperty("created").GetInt32());
        Assert.Equal(0, json1.GetProperty("data").GetProperty("updated").GetInt32());

        // 第二轮：pw1 已存在 → 只刷新 work_days，不新增
        var resp2 = await Client.PostAsJsonAsync("/api/attendances/batch-import",
            new
            {
                projectId = TestProjectId, yearMonth = TestYearMonth,
                records = new[] { new { projectWorkerId = pw1, workDays = 21.0 } },
            });
        Assert.Equal(HttpStatusCode.OK, resp2.StatusCode);
        var json2 = await resp2.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(0, json2.GetProperty("data").GetProperty("created").GetInt32());
        Assert.Equal(1, json2.GetProperty("data").GetProperty("updated").GetInt32());

        using (var conn = new SqliteConnection(ConnectionString))
        {
            Assert.Equal(21.0, conn.ExecuteScalar<double>(
                "SELECT work_days FROM attendances WHERE project_id=@P AND project_worker_id=@W AND year_month=@Y",
                new { P = TestProjectId, W = pw1, Y = TestYearMonth }));
            Assert.Equal(22.5, conn.ExecuteScalar<double>(
                "SELECT work_days FROM attendances WHERE project_id=@P AND project_worker_id=@W AND year_month=@Y",
                new { P = TestProjectId, W = pw2, Y = TestYearMonth }));
            // 不因重复导入翻倍
            Assert.Equal(2, conn.ExecuteScalar<int>(
                "SELECT COUNT(*) FROM attendances WHERE project_id=@P AND year_month=@Y",
                new { P = TestProjectId, Y = TestYearMonth }));
        }
    }

    [Fact]
    public async Task BatchImport_MissingFields_Returns400()
    {
        var token = await LoginAsync();
        SetAuth(token);

        var resp = await Client.PostAsJsonAsync("/api/attendances/batch-import",
            new
            {
                projectId = TestProjectId, yearMonth = TestYearMonth,
                records = new[] { new { projectWorkerId = 1 } }, // 缺 workDays
            });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("workDays", await resp.Content.ReadAsStringAsync());

        var resp2 = await Client.PostAsJsonAsync("/api/attendances/batch-import",
            new
            {
                projectId = TestProjectId, yearMonth = TestYearMonth,
                records = new[] { new { workDays = 20.0 } }, // 缺 projectWorkerId
            });
        Assert.Equal(HttpStatusCode.BadRequest, resp2.StatusCode);
        Assert.Contains("projectWorkerId", await resp2.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task BatchImport_EmptyRecords_ReturnsZeroCounts()
    {
        var token = await LoginAsync();
        SetAuth(token);

        var resp = await Client.PostAsJsonAsync("/api/attendances/batch-import",
            new { projectId = TestProjectId, yearMonth = TestYearMonth, records = Array.Empty<object>() });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(0, json.GetProperty("data").GetProperty("created").GetInt32());
        Assert.Equal(0, json.GetProperty("data").GetProperty("updated").GetInt32());
    }

    /// <summary>
    /// 窗口 E：其余 STUB 显式错误化 —— 所有未接通端点返回 501 + 明确「未实现」，
    /// 不再返回 HTTP 200 假成功结构（此前 match-receipts 空数组 / confirm-matches 0 等）
    /// </summary>
    [Theory]
    [InlineData("/api/health/export-json", "export-json")]
    [InlineData("/api/health/reconcile", "reconcile")]
    [InlineData("/api/sqlite/enable", "sqlite/enable")]
    public async Task StubEndpoints_ReturnExplicit501(string path, string name)
    {
        var token = await LoginAsync();
        SetAuth(token);

        var resp = await Client.PostAsync(path, new StringContent("{}", System.Text.Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.NotImplemented, resp.StatusCode);
        var body = await resp.Content.ReadAsStringAsync();
        Assert.Contains("未实现", body);
        Assert.Contains(name, body);
    }
}
