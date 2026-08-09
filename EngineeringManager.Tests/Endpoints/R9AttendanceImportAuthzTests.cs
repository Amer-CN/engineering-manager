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
/// R9-1 Z1：attendances batch-import 越权防御（G73 修复）。
///
/// 缺陷背景（R9-SCOPE.md §1）：POST /api/attendances/batch-import 里那条
///   UPDATE attendances SET work_days=@WorkDays,updated_at=@Now, version=version+1,
///     last_modified_at=@Now WHERE id=@Id
/// 只有 id 一个条件——没有 created_by、没有 IsAdmin、没有 UserFilter*；
/// 端点里算出来的 scope 变量也没用；全端点唯一的门是 HasPermission(ctx, db, "wages:create")。
/// 对照：PUT /api/attendances（WageEndpoints.cs:80）WHERE 有
///   (created_by=@Uid OR @IsAdmin=1) 守卫。同一张表两条路径，一条有守卫一条没有。
///
/// 用户：userA = admin（建行方）；userB = accountant（非 admin、无项目授权、
///       但默认权限集含 wages:create + wages:update —— 见 GetDefaultPermissions，
///       非手动 UPDATE roles）。
///
/// 本文件锁定【目标态】（G73 修复后）：Y1b 断言 B 改不动（HTTP 200 + created==0 +
/// updated==0 + skipped 含该 projectWorkerId + work_days 仍 10 + created_by 仍 A）。
/// R9-0 时本用例名 Y1b_OtherUser_BatchImport_CurrentlyOverwritesForeignRow 锁定的是现状
/// （B 能改写 200/10→99），R9-1 Z1(a) 翻转并改名为 ...CannotOverwriteForeignRow。
/// </summary>
public class R9AttendanceImportAuthzTests : ApiTestBase
{
    private const string AdminUid = "1";             // 基座种子 admin（username=admin）
    private const string OtherUid = "r9-0-acc";      // accountant，非 admin，无项目授权
    private const string OtherUsername = "r9-0-acc";
    private const string Password = "admin123";
    private const long TestProjectId = 9101;
    private const string TestYearMonth = "2026-08";  // 31 天
    private const string Now = "2026-08-01 00:00:00";

    private async Task<string> LoginAsync(string username)
    {
        var resp = await Client.PostAsJsonAsync("/api/auth/login", new { username, password = Password });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("data").GetProperty("token").GetString()!;
    }

    private void SetAuth(string token) =>
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    /// <summary>seed 一个项目工人（workers + project_workers），返回 project_workers.id</summary>
    private long SeedProjectWorker(string name, string createdBy)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var workerId = conn.ExecuteScalar<long>(
            "INSERT INTO workers (name, created_at) VALUES (@N, @Now); SELECT last_insert_rowid();",
            new { N = name, Now });
        conn.Execute(@"INSERT INTO project_workers (worker_id,project_id,team_id,daily_wage,worker_type,entry_date,status,created_by,created_at,last_modified_at)
            VALUES (@W,@P,NULL,300,'瓦工','2026-01-01','active',@By,@Now,@Now)",
            new { W = workerId, P = TestProjectId, By = createdBy, Now });
        return conn.ExecuteScalar<long>("SELECT last_insert_rowid();");
    }

    /// <summary>seed 一条考勤行（work_days），返回 attendances.id</summary>
    private long SeedAttendance(long pwId, double workDays, string createdBy)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.ExecuteScalar<long>(@"INSERT INTO attendances
            (member_id,project_id,project_worker_id,year_month,work_days,created_by,created_at,updated_at,version,last_modified_at)
            VALUES (NULL,@P,@PW,@Y,@W,@By,@Now,@Now,1,@Now);
            SELECT last_insert_rowid();",
            new { P = TestProjectId, PW = pwId, Y = TestYearMonth, W = workDays, By = createdBy, Now });
    }

    private dynamic? QueryAttendance(long id)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.QueryFirstOrDefault("SELECT * FROM attendances WHERE id=@Id", new { Id = id });
    }

    private async Task<JsonElement> PostBatchImportAsync(long projectId, string yearMonth, object[] records)
    {
        var resp = await Client.PostAsJsonAsync("/api/attendances/batch-import",
            new { projectId, yearMonth, records });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode); // 现状：越权路径也返回 200
        return await resp.Content.ReadFromJsonAsync<JsonElement>();
    }

    // ── Y1a：正向对照 —— A（admin/创建者）batch-import 更新自己创建的行 → 200，work_days 10→20 ──
    // 用途：证明这条路径真会写库、测试基座是通的。没有它，后两条都不算数。
    [Fact]
    public async Task Y1a_Owner_BatchImport_UpdatesOwnRow()
    {
        SetAuth(await LoginAsync("admin"));

        var pw = SeedProjectWorker("A-工人", AdminUid);
        var attId = SeedAttendance(pw, 10, AdminUid); // created_by = admin

        var json = await PostBatchImportAsync(TestProjectId, TestYearMonth,
            new[] { new { projectWorkerId = pw, workDays = 20.0 } });
        // 存在行 → updated=1（不是 created）
        Assert.Equal(0, json.GetProperty("data").GetProperty("created").GetInt32());
        Assert.Equal(1, json.GetProperty("data").GetProperty("updated").GetInt32());
        // 正向对照强化：owner 更新自己行 → 无归属拦截，skipped 为空数组
        Assert.Equal(0, json.GetProperty("data").GetProperty("skipped").GetArrayLength());

        using (var conn = new SqliteConnection(ConnectionString))
        {
            var workDays = conn.ExecuteScalar<double>("SELECT work_days FROM attendances WHERE id=@Id", new { Id = attId });
            Assert.Equal(20.0, workDays); // 10 → 20
        }
    }

    // ── Y1b：越权防御目标态 —— B（非 admin、无项目授权、持 wages:create）改 A 创建的行 → 改不动 ──
    // 目标态断言（G73 修复后）：HTTP 200、created==0、updated==0、skipped 含该 projectWorkerId、
    // work_days 仍 10.0、created_by 仍 A（admin）。修复前（洞还在）本用例红。
    [Fact]
    public async Task Y1b_OtherUser_BatchImport_CannotOverwriteForeignRow()
    {
        // B：accountant —— 默认权限集含 wages:create/wages:update（GetDefaultPermissions
        // 已查证，非手动 UPDATE roles）；非 admin；无任何 project_authorizations。
        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Open();
            var salt = "r9-0-acc-salt-123456";
            var hash = EngineeringManager.Api.Common.HashPassword(Password, salt, 2);
            conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
                VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
                new
                {
                    Id = OtherUid, Username = OtherUsername, Password, Hash = hash, Salt = salt,
                    Version = 2, DisplayName = "财务", RoleId = "accountant", Status = "active", Now
                });
        }
        SetAuth(await LoginAsync(OtherUsername));

        // A（admin）建行 work_days=10，项目 9101 未授权给 B
        var pw = SeedProjectWorker("B-目标工人", AdminUid);
        var attId = SeedAttendance(pw, 10, AdminUid);

        var json = await PostBatchImportAsync(TestProjectId, TestYearMonth,
            new[] { new { projectWorkerId = pw, workDays = 99.0 } });
        // 目标态：B 改不动 → created==0、updated==0、skipped 含该 projectWorkerId
        Assert.Equal(0, json.GetProperty("data").GetProperty("created").GetInt32());
        Assert.Equal(0, json.GetProperty("data").GetProperty("updated").GetInt32());
        var skipped = json.GetProperty("data").GetProperty("skipped");
        Assert.Contains(pw, skipped.EnumerateArray().Select(x => x.GetProperty("projectWorkerId").GetInt64()));

        using (var conn = new SqliteConnection(ConnectionString))
        {
            var row = conn.QueryFirst("SELECT work_days, created_by, version FROM attendances WHERE id=@Id", new { Id = attId });
            Assert.Equal(10.0, (double)row.work_days);       // 未被 B 改写
            Assert.Equal(AdminUid, (string)row.created_by);  // 归属仍是 A
        }
    }

    // ── Y1c：反向对照 —— 同一个 B、同一行，走 PUT /api/attendances（有 created_by 守卫）→ B 改不动 ──
    // 用途：证明「同一张表两条路径，一条有守卫一条没有」，排除「测试基座让所有人都能写」。
    [Fact]
    public async Task Y1c_OtherUser_SinglePut_IsBlocked()
    {
        // 同一 B（accountant）
        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Open();
            var salt = "r9-0-acc-salt-123456";
            var hash = EngineeringManager.Api.Common.HashPassword(Password, salt, 2);
            conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
                VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
                new
                {
                    Id = OtherUid, Username = OtherUsername, Password, Hash = hash, Salt = salt,
                    Version = 2, DisplayName = "财务", RoleId = "accountant", Status = "active", Now
                });
        }
        SetAuth(await LoginAsync(OtherUsername));

        // 同一行：A 建 work_days=10
        var pw = SeedProjectWorker("B-单条工人", AdminUid);
        var attId = SeedAttendance(pw, 10, AdminUid);

        // B 走 PUT /api/attendances（WageEndpoints.cs:80，WHERE 有 (created_by=@Uid OR @IsAdmin=1)）
        var resp = await Client.PutAsJsonAsync("/api/attendances", new
        {
            id = attId, projectWorkerId = pw, yearMonth = TestYearMonth, workDays = 15.0,
        });
        // 现状：非 admin 改他人行 → affected=0 → 端点返回 403
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);

        using (var conn = new SqliteConnection(ConnectionString))
        {
            var workDays = conn.ExecuteScalar<double>("SELECT work_days FROM attendances WHERE id=@Id", new { Id = attId });
            Assert.Equal(10.0, workDays); // 未被改动
        }
    }
}
