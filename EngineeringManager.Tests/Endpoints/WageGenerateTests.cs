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
/// 窗口 D：POST /api/wages/generate 生成工资表回归测试。
///
/// 覆盖：
///   1. 按考勤生成 → newCount 计数 + 库内金额为分（300 元 → 30000 分）+ 响应为元
///   2. 幂等：重复调用不新增行；考勤变化后再次生成走更新路径（刷新日薪/出勤/实发）
///   3. 已发款（paid_amount≠0）/ 已归档（payment_locked=1）行跳过（archivedSkipped），不触碰
///   4. 参数缺失 → 400 指出缺哪个字段
///   5. staff 路径（考勤只有 member_id、无 project_worker_id）→ 取 members.daily_wage
///   6. 已存在可写行 → 保留手工 bonus/deduction，只刷新考勤相关列
///   7. 无考勤 → 200 空数组，newCount=0
/// </summary>
public class WageGenerateTests : ApiTestBase
{
    private const string Password = "admin123";
    private const long TestProjectId = 9101;
    private const string TestYearMonth = "2026-08";
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

    private static async Task<JsonElement> GetDataAsync(HttpResponseMessage resp)
    {
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.TryGetProperty("data", out var data),
            "响应缺少 data 字段: " + await resp.Content.ReadAsStringAsync());
        return data;
    }

    /// <summary>seed 一个活跃项目工人，返回 project_workers.id（daily_wage 单位：元）</summary>
    private long SeedProjectWorker(double dailyWage = 300)
    {
        using var conn = new SqliteConnection(ConnectionString);
        var workerId = conn.ExecuteScalar<long>("INSERT INTO workers (name) VALUES ('生成测试工人'); SELECT last_insert_rowid();");
        conn.Execute(@"INSERT INTO project_workers (worker_id,project_id,team_id,daily_wage,worker_type,entry_date,status,created_by,created_at,last_modified_at)
            VALUES (@W,@P,NULL,@D,'瓦工','2026-01-01','active',@U,@Now,@Now)",
            new { W = workerId, P = TestProjectId, D = dailyWage, U = "user-test", Now });
        return conn.ExecuteScalar<long>("SELECT last_insert_rowid();");
    }

    private void SeedAttendance(long pwId, double workDays, long? memberId = null)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Execute(@"INSERT INTO attendances (member_id,project_id,project_worker_id,year_month,work_days,created_by,created_at,updated_at)
            VALUES (@M,@P,@PW,@Y,@W,@U,@Now,@Now)",
            new { M = memberId, P = TestProjectId, PW = pwId, Y = TestYearMonth, W = workDays, U = "user-test", Now });
    }

    private dynamic? QueryWageRow(long pwId, string? memberId = null)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.QueryFirstOrDefault(
            "SELECT * FROM wages WHERE project_id=@P AND year_month=@Y AND deleted_at IS NULL AND (project_worker_id=@PW OR (project_worker_id IS NULL AND member_id=@M))",
            new { P = TestProjectId, Y = TestYearMonth, PW = pwId, M = memberId });
    }

    [Fact]
    public async Task Generate_CreatesWageRows_FromAttendance()
    {
        var token = await LoginAsync();
        SetAuth(token);

        // 两个工人，出勤不同：22 天与 10.5 天，日薪均 300 元
        var pw1 = SeedProjectWorker(300);
        var pw2 = SeedProjectWorker(300);
        SeedAttendance(pw1, 22);
        SeedAttendance(pw2, 10.5);

        var resp = await Client.PostAsJsonAsync("/api/wages/generate", new { projectId = TestProjectId, yearMonth = TestYearMonth });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(2, json.GetProperty("newCount").GetInt32());
        Assert.Equal(0, json.GetProperty("archivedSkipped").GetInt32());
        var data = json.GetProperty("data");
        Assert.Equal(JsonValueKind.Array, data.ValueKind);
        Assert.Equal(2, data.GetArrayLength());

        // 响应为元：300 元/天、实际 300*22=6600 与 300*10.5=3150
        var rows = data.EnumerateArray().ToList();
        Assert.Equal(2, rows.Count(r => r.GetProperty("actual_wage").GetDouble() is 6600.0 or 3150.0));
        Assert.All(rows, r => Assert.Equal(300.0, r.GetProperty("daily_wage").GetDouble()));

        // 库内为分（单位契约）：30000 分 / 660000 分 / 315000 分
        using (var conn = new SqliteConnection(ConnectionString))
        {
            Assert.Equal(660000L, conn.ExecuteScalar<long>(
                "SELECT actual_wage FROM wages WHERE project_id=@P AND project_worker_id=@W AND year_month=@Y",
                new { P = TestProjectId, W = pw1, Y = TestYearMonth }));
            Assert.Equal(315000L, conn.ExecuteScalar<long>(
                "SELECT actual_wage FROM wages WHERE project_id=@P AND project_worker_id=@W AND year_month=@Y",
                new { P = TestProjectId, W = pw2, Y = TestYearMonth }));
            Assert.Equal(30000L, conn.ExecuteScalar<long>(
                "SELECT daily_wage FROM wages WHERE project_id=@P AND project_worker_id=@W AND year_month=@Y",
                new { P = TestProjectId, W = pw1, Y = TestYearMonth }));
        }
    }

    [Fact]
    public async Task Generate_Idempotent_AndRefreshesOnAttendanceChange()
    {
        var token = await LoginAsync();
        SetAuth(token);

        var pw1 = SeedProjectWorker(300);
        SeedAttendance(pw1, 22);

        var resp1 = await Client.PostAsJsonAsync("/api/wages/generate", new { projectId = TestProjectId, yearMonth = TestYearMonth });
        Assert.Equal(HttpStatusCode.OK, resp1.StatusCode);
        var json1 = await resp1.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(1, json1.GetProperty("newCount").GetInt32());

        // 考勤 22 → 23 天，再次生成：不得新增行，走更新路径刷新实发
        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Execute("UPDATE attendances SET work_days=23.0 WHERE project_worker_id=@W AND year_month=@Y",
                new { W = pw1, Y = TestYearMonth });
        }
        var resp2 = await Client.PostAsJsonAsync("/api/wages/generate", new { projectId = TestProjectId, yearMonth = TestYearMonth });
        Assert.Equal(HttpStatusCode.OK, resp2.StatusCode);
        var json2 = await resp2.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(0, json2.GetProperty("newCount").GetInt32());
        Assert.Equal(0, json2.GetProperty("archivedSkipped").GetInt32());
        Assert.Equal(1, json2.GetProperty("data").GetArrayLength());
        Assert.Equal(300 * 23, json2.GetProperty("data")[0].GetProperty("actual_wage").GetDouble());

        // 库内仍只有 1 行（幂等，不因重复生成翻倍）
        using (var verifyConn = new SqliteConnection(ConnectionString))
        {
            Assert.Equal(1, verifyConn.ExecuteScalar<int>(
                "SELECT COUNT(*) FROM wages WHERE project_id=@P AND project_worker_id=@W AND year_month=@Y",
                new { P = TestProjectId, W = pw1, Y = TestYearMonth }));
            Assert.Equal(300 * 23 * 100L, verifyConn.ExecuteScalar<long>(
                "SELECT actual_wage FROM wages WHERE project_id=@P AND project_worker_id=@W AND year_month=@Y",
                new { P = TestProjectId, W = pw1, Y = TestYearMonth }));
        }
    }

    [Fact]
    public async Task Generate_SkipsPaidAndLockedRows()
    {
        var token = await LoginAsync();
        SetAuth(token);

        // 工人 A：已发款（paid_amount=10000 分）；工人 B：已归档（payment_locked=1）；工人 C：全新
        var pwA = SeedProjectWorker(300);
        var pwB = SeedProjectWorker(300);
        var pwC = SeedProjectWorker(300);
        SeedAttendance(pwA, 22);
        SeedAttendance(pwB, 22);
        SeedAttendance(pwC, 22);
        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Execute(@"INSERT INTO wages (project_id,project_worker_id,year_month,daily_wage,work_days,bonus,deduction,actual_wage,paid_amount,status,created_by,created_at,updated_at)
                VALUES (@P,@W,@Y,20000,22.0,0,0,440000,10000,'paid','user-old',@Now,@Now)",
                new { P = TestProjectId, W = pwA, Y = TestYearMonth, Now });
            conn.Execute(@"INSERT INTO wages (project_id,project_worker_id,year_month,daily_wage,work_days,bonus,deduction,actual_wage,payment_locked,created_by,created_at,updated_at)
                VALUES (@P,@W,@Y,20000,22.0,0,0,440000,1,'user-old',@Now,@Now)",
                new { P = TestProjectId, W = pwB, Y = TestYearMonth, Now });
        }

        var resp = await Client.PostAsJsonAsync("/api/wages/generate", new { projectId = TestProjectId, yearMonth = TestYearMonth });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(1, json.GetProperty("newCount").GetInt32());          // 只有 C 新生成
        Assert.Equal(2, json.GetProperty("archivedSkipped").GetInt32());   // A 已发款 + B 已归档
        Assert.Equal(3, json.GetProperty("data").GetArrayLength());        // 返回项目+月份全量

        // A / B 行不得被触碰
        using var verifyConn = new SqliteConnection(ConnectionString);
        var rowA = verifyConn.QueryFirst("SELECT daily_wage, paid_amount, actual_wage FROM wages WHERE project_worker_id=@W",
            new { W = pwA });
        Assert.Equal(20000L, (long)rowA.daily_wage);    // 未被 300 元覆盖
        Assert.Equal(10000L, (long)rowA.paid_amount);
        Assert.Equal(440000L, (long)rowA.actual_wage);
        var rowB = verifyConn.QueryFirst("SELECT payment_locked, actual_wage FROM wages WHERE project_worker_id=@W",
            new { W = pwB });
        Assert.Equal(1L, (long)rowB.payment_locked);
        Assert.Equal(440000L, (long)rowB.actual_wage);
        // C 行正常生成（300 元 → 30000 分，实发 660000 分）
        var rowC = verifyConn.QueryFirst("SELECT daily_wage, actual_wage FROM wages WHERE project_worker_id=@W",
            new { W = pwC });
        Assert.Equal(30000L, (long)rowC.daily_wage);
        Assert.Equal(660000L, (long)rowC.actual_wage);
    }

    [Fact]
    public async Task Generate_MissingParams_Returns400()
    {
        var token = await LoginAsync();
        SetAuth(token);

        var resp1 = await Client.PostAsJsonAsync("/api/wages/generate", new { });
        Assert.Equal(HttpStatusCode.BadRequest, resp1.StatusCode);
        var body1 = await resp1.Content.ReadAsStringAsync();
        Assert.Contains("projectId", body1);
        Assert.Contains("yearMonth", body1);

        var resp2 = await Client.PostAsJsonAsync("/api/wages/generate", new { projectId = TestProjectId });
        Assert.Equal(HttpStatusCode.BadRequest, resp2.StatusCode);
        var body2 = await resp2.Content.ReadAsStringAsync();
        Assert.Contains("yearMonth", body2);
    }

    [Fact]
    public async Task Generate_MemberPath_UsesMembersDailyWage()
    {
        var token = await LoginAsync();
        SetAuth(token);

        // staff 路径：考勤只有 member_id（250 元/天），无 project_worker_id
        long memberId;
        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Execute(@"INSERT INTO members (name,member_type,daily_wage,status,created_by,created_at)
                VALUES ('测试成员','staff',250,'active','user-test',@Now)",
                new { Now });
            memberId = conn.ExecuteScalar<long>("SELECT last_insert_rowid();");
            conn.Execute(@"INSERT INTO attendances (member_id,project_id,year_month,work_days,created_by,created_at,updated_at)
                VALUES (@M,@P,@Y,20.0,'user-test',@Now,@Now)",
                new { M = memberId, P = TestProjectId, Y = TestYearMonth, Now });
        }

        var resp = await Client.PostAsJsonAsync("/api/wages/generate", new { projectId = TestProjectId, yearMonth = TestYearMonth });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(1, json.GetProperty("newCount").GetInt32());
        var row = json.GetProperty("data")[0];
        Assert.Equal(250.0, row.GetProperty("daily_wage").GetDouble());
        Assert.Equal(250 * 20, row.GetProperty("actual_wage").GetDouble());

        using (var verifyConn = new SqliteConnection(ConnectionString))
        {
            var dbRow = verifyConn.QueryFirst(
                "SELECT daily_wage, actual_wage, member_id, project_worker_id FROM wages WHERE project_id=@P AND year_month=@Y",
                new { P = TestProjectId, Y = TestYearMonth });
            Assert.Equal(25000L, (long)dbRow.daily_wage);   // 250 元 → 25000 分
            Assert.Equal(500000L, (long)dbRow.actual_wage);
            Assert.Equal(memberId, (long)dbRow.member_id);
            Assert.True(dbRow.project_worker_id is null or DBNull);
        }
    }

    [Fact]
    public async Task Generate_PreservesManualBonusAndDeduction()
    {
        var token = await LoginAsync();
        SetAuth(token);

        var pw1 = SeedProjectWorker(300);
        SeedAttendance(pw1, 22);
        // 手工录入奖金 100、扣款 50 后保存（batch-save：300*22+100-50=6650）
        var saveResp = await Client.PostAsJsonAsync("/api/wages/batch-save", new[]
        {
            new { projectId = TestProjectId, projectWorkerId = pw1, yearMonth = TestYearMonth,
                  dailyWage = 300.0, workDays = 22.0, bonus = 100.0, deduction = 50.0, actualWage = 6650.0 },
        });
        Assert.Equal(HttpStatusCode.OK, saveResp.StatusCode);

        // 再次生成：刷新考勤相关列，但不得清掉手工 bonus/deduction
        var resp = await Client.PostAsJsonAsync("/api/wages/generate", new { projectId = TestProjectId, yearMonth = TestYearMonth });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(0, json.GetProperty("newCount").GetInt32());
        Assert.Equal(0, json.GetProperty("archivedSkipped").GetInt32());

        var row = QueryWageRow(pw1)!;
        Assert.NotNull(row);
        Assert.Equal(30000L, (long)row.daily_wage);
        Assert.Equal(22.0, (double)row.work_days);
        Assert.Equal(10000L, (long)row.bonus);     // 手工奖金保留
        Assert.Equal(5000L, (long)row.deduction);  // 手工扣款保留
        Assert.Equal(665000L, (long)row.actual_wage);
    }

    [Fact]
    public async Task Generate_NoAttendance_ReturnsEmpty()
    {
        var token = await LoginAsync();
        SetAuth(token);

        // 项目有工人但无考勤 → 不生成任何工资行，返回空数组
        SeedProjectWorker(300);

        var resp = await Client.PostAsJsonAsync("/api/wages/generate", new { projectId = TestProjectId, yearMonth = TestYearMonth });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(0, json.GetProperty("newCount").GetInt32());
        Assert.Equal(0, json.GetProperty("archivedSkipped").GetInt32());
        Assert.Equal(JsonValueKind.Array, json.GetProperty("data").ValueKind);
        Assert.Equal(0, json.GetProperty("data").GetArrayLength());
    }
}
