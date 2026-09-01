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
/// 带提醒覆盖（spec §6.1 #21）：attendances.manually_edited 三分机制。
/// ① 未改过 → 静默覆盖；② 改过且导入值与库内相同 → 静默覆盖 + 清标记；
/// ③ 改过且不同 → 进 conflicts 列表，由 resolve 端点逐条裁决（留我的/用表里的）。
/// 本文件全部用例走 admin——归属守卫语义由 R9AttendanceImportAuthzTests 锁定，不在本文件重复。
/// </summary>
public class AttendanceConflictTests : ApiTestBase
{
    private const string AdminUid = "1";
    private const string Password = "admin123";
    private const long TestProjectId = 9301;
    private const string TestYearMonth = "2026-08";
    private const string Now = "2026-08-01 00:00:00";

    private async Task<string> LoginAdminAsync()
    {
        var resp = await Client.PostAsJsonAsync("/api/auth/login", new { username = "admin", password = Password });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("data").GetProperty("token").GetString()!;
    }

    private void SetAuth(string token) =>
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    /// <summary>seed 项目工人（created_by=admin），返回 project_workers.id</summary>
    private long SeedProjectWorker(string name)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var workerId = conn.ExecuteScalar<long>(
            "INSERT INTO workers (name, created_at) VALUES (@N, @Now); SELECT last_insert_rowid();",
            new { N = name, Now });
        conn.Execute(@"INSERT INTO project_workers (worker_id,project_id,team_id,daily_wage,worker_type,entry_date,status,created_by,created_at,last_modified_at)
            VALUES (@W,@P,NULL,300,'瓦工','2026-01-01','active',@By,@Now,@Now)",
            new { W = workerId, P = TestProjectId, By = AdminUid, Now });
        return conn.ExecuteScalar<long>("SELECT last_insert_rowid();");
    }

    /// <summary>seed 考勤行（可带手动修改标记），返回 attendances.id</summary>
    private long SeedAttendance(long pwId, double workDays, int manuallyEdited = 0)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.ExecuteScalar<long>(@"INSERT INTO attendances
            (member_id,project_id,project_worker_id,year_month,work_days,manually_edited,created_by,created_at,updated_at,version,last_modified_at)
            VALUES (NULL,@P,@PW,@Y,@W,@ME,@By,@Now,@Now,1,@Now);
            SELECT last_insert_rowid();",
            new { P = TestProjectId, PW = pwId, Y = TestYearMonth, W = workDays, ME = manuallyEdited, By = AdminUid, Now });
    }

    private dynamic? QueryAttendance(long id)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.QueryFirstOrDefault("SELECT * FROM attendances WHERE id=@Id", new { Id = id });
    }

    private async Task<JsonElement> PostBatchImportAsync(object[] records)
    {
        var resp = await Client.PostAsJsonAsync("/api/attendances/batch-import",
            new { projectId = TestProjectId, yearMonth = TestYearMonth, records });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        return await resp.Content.ReadFromJsonAsync<JsonElement>();
    }

    // ── 用例 1：PUT 单条手改考勤 → 打手动修改标记 ──
    [Fact]
    public async Task Put_SetsManuallyEditedFlag()
    {
        SetAuth(await LoginAdminAsync());
        var pw = SeedProjectWorker("张三");
        var attId = SeedAttendance(pw, 20);

        var resp = await Client.PutAsJsonAsync("/api/attendances", new
        {
            id = attId, projectWorkerId = pw, yearMonth = TestYearMonth, workDays = 18.0,
        });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var row = QueryAttendance(attId)!;
        Assert.Equal(18.0, Convert.ToDouble(row.work_days));
        Assert.Equal(1L, Convert.ToInt64(row.manually_edited));
    }

    // ── 用例 2：未改过的行（flag=0）→ 静默覆盖，不进冲突 ──
    [Fact]
    public async Task BatchImport_UnmodifiedRow_SilentOverwrite()
    {
        SetAuth(await LoginAdminAsync());
        var pw = SeedProjectWorker("李四");
        SeedAttendance(pw, 10, manuallyEdited: 0);

        var json = await PostBatchImportAsync(new[] { new { projectWorkerId = pw, workDays = 20.0 } });
        Assert.Equal(1, json.GetProperty("data").GetProperty("updated").GetInt32());
        Assert.Equal(0, json.GetProperty("data").GetProperty("conflicts").GetArrayLength());
    }

    // ── 用例 3：改过且值不同 → 进 conflicts，不写库，标记保留 ──
    [Fact]
    public async Task BatchImport_ModifiedDifferentValue_Conflict()
    {
        SetAuth(await LoginAdminAsync());
        var pw = SeedProjectWorker("王五");
        var attId = SeedAttendance(pw, 20, manuallyEdited: 1);

        var json = await PostBatchImportAsync(new[] { new { projectWorkerId = pw, workDays = 25.0 } });
        Assert.Equal(0, json.GetProperty("data").GetProperty("updated").GetInt32());
        var conflicts = json.GetProperty("data").GetProperty("conflicts");
        Assert.Equal(1, conflicts.GetArrayLength());
        var c = conflicts[0];
        Assert.Equal(pw, c.GetProperty("projectWorkerId").GetInt64());
        Assert.Equal(20.0, c.GetProperty("currentWorkDays").GetDouble());
        Assert.Equal(25.0, c.GetProperty("importWorkDays").GetDouble());

        var row = QueryAttendance(attId)!;
        Assert.Equal(20.0, Convert.ToDouble(row.work_days));   // 未被覆盖
        Assert.Equal(1L, Convert.ToInt64(row.manually_edited)); // 标记保留
    }

    // ── 用例 4：改过但导入值与库内相同 → 静默覆盖 + 清标记 ──
    [Fact]
    public async Task BatchImport_ModifiedEqualValue_SilentOverwrite_ClearsFlag()
    {
        SetAuth(await LoginAdminAsync());
        var pw = SeedProjectWorker("赵六");
        var attId = SeedAttendance(pw, 20, manuallyEdited: 1);

        var json = await PostBatchImportAsync(new[] { new { projectWorkerId = pw, workDays = 20.0 } });
        Assert.Equal(1, json.GetProperty("data").GetProperty("updated").GetInt32());
        Assert.Equal(0, json.GetProperty("data").GetProperty("conflicts").GetArrayLength());

        var row = QueryAttendance(attId)!;
        Assert.Equal(0L, Convert.ToInt64(row.manually_edited));
    }

    // ── 用例 5：裁决 overwrite → 用表里的值覆盖 + 清标记 ──
    [Fact]
    public async Task Resolve_Overwrite_UpdatesAndClearsFlag()
    {
        SetAuth(await LoginAdminAsync());
        var pw = SeedProjectWorker("孙七");
        var attId = SeedAttendance(pw, 20, manuallyEdited: 1);

        var resp = await Client.PostAsJsonAsync("/api/attendances/batch-import-resolve", new
        {
            projectId = TestProjectId, yearMonth = TestYearMonth,
            resolutions = new[] { new { projectWorkerId = pw, action = "overwrite", workDays = 25.0 } },
        });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(1, json.GetProperty("data").GetProperty("overwritten").GetInt32());

        var row = QueryAttendance(attId)!;
        Assert.Equal(25.0, Convert.ToDouble(row.work_days));
        Assert.Equal(0L, Convert.ToInt64(row.manually_edited));
    }

    // ── 用例 6：裁决 keep（留我的）→ 库内不动，标记保留 ──
    [Fact]
    public async Task Resolve_Keep_NoChange()
    {
        SetAuth(await LoginAdminAsync());
        var pw = SeedProjectWorker("周八");
        var attId = SeedAttendance(pw, 20, manuallyEdited: 1);

        var resp = await Client.PostAsJsonAsync("/api/attendances/batch-import-resolve", new
        {
            projectId = TestProjectId, yearMonth = TestYearMonth,
            resolutions = new[] { new { projectWorkerId = pw, action = "keep", workDays = 25.0 } },
        });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(1, json.GetProperty("data").GetProperty("kept").GetInt32());

        var row = QueryAttendance(attId)!;
        Assert.Equal(20.0, Convert.ToDouble(row.work_days));
        Assert.Equal(1L, Convert.ToInt64(row.manually_edited));
    }
}
