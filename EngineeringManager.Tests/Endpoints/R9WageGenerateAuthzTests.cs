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
/// R9-2 Z1：POST /api/wages/generate 越权防御（D2 修复）。
///
/// 缺陷背景（R9-SCOPE.md §1b D2）：generate 的 UPDATE 分支
///   UPDATE wages SET daily_wage=@DailyFen, work_days=@WorkDays,
///     actual_wage=@ActualFen, updated_at=@Now, version=version+1, last_modified_at=@Now
///     WHERE id=@Id AND deleted_at IS NULL
///       AND COALESCE(paid_amount,0)=0 AND COALESCE(payment_locked,0)=0
/// 无归属条件（无 created_by / IsAdmin）；existing 定位 SELECT 只按
/// project_id + year_month + project_worker_id/member_id，未查 created_by。
/// 任何持 wages:create 的非 admin 调同 projectId+yearMonth 的 generate，
/// 可重算他人创建的未发款未归档工资行（daily_wage / work_days / actual_wage 三列）。
///
/// 测试基座事实：基座 = enterprise（ApiTestBase.cs:28 设 ENGINEERING_MANAGER_EDITION=enterprise），
/// 非 admin 的 GetDataScope = AuthorizedProjects（EditionFeatures enterprise 启用 MultiUserDataScope）。
/// 因此 generate 的考勤源 SELECT 的 UserFilterWithAuthorizedProjects(scope,"a.project_id","a.created_by")
/// 对 B 过滤掉 A 创建的考勤行 → 若 A 建考勤，B 的 atts 为空、触达不到 UPDATE。
/// 初版 GenB（commit 5e75492，A 建考勤 + A 建工资行）因此红在「考勤源 scope 过滤」而非 UPDATE 守卫
/// ——R9-2 偏差裁决（纪律 17）认定该搭建不可达。本版改为「B 自建考勤（进 B scope）+ A 建工资行
/// （existing 定位 SELECT 不 filter，B 能读到）」确保触达 UPDATE 归属守卫。
///
/// 用户：userA = admin（建行方）；userB = accountant（非 admin、无项目授权、
///       默认权限集含 wages:create + wages:update —— GetDefaultPermissions 查证，
///       非手动 UPDATE roles）。金额断言一律用「分」的 DB 原始值。
///
/// 本文件锁定【目标态】（D2 修复后）：GenB 断言 B 改不动（三列保持原值、
/// created_by 仍 A、version 未动、响应 ownershipSkipped >= 1、newCount == 0）。
/// 修复前（洞还在）GenB 必须红：A 的工资行被 B 重算（三列值变、version 动）。
/// </summary>
public class R9WageGenerateAuthzTests : ApiTestBase
{
    private const string AdminUid = "1";             // 基座种子 admin（username=admin）
    private const string OtherUid = "r9-2-acc";      // accountant，非 admin，无项目授权
    private const string OtherUsername = "r9-2-acc";
    private const string Password = "admin123";
    private const long TestProjectId = 9102;
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
    private long SeedProjectWorker(string name, string createdBy, double dailyWage = 300)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var workerId = conn.ExecuteScalar<long>(
            "INSERT INTO workers (name, created_at) VALUES (@N, @Now); SELECT last_insert_rowid();",
            new { N = name, Now });
        conn.Execute(@"INSERT INTO project_workers (worker_id,project_id,team_id,daily_wage,worker_type,entry_date,status,created_by,created_at,last_modified_at)
            VALUES (@W,@P,NULL,@D,'瓦工','2026-01-01','active',@By,@Now,@Now)",
            new { W = workerId, P = TestProjectId, D = dailyWage, By = createdBy, Now });
        return conn.ExecuteScalar<long>("SELECT last_insert_rowid();");
    }

    /// <summary>seed 一条考勤行（work_days 天数），created_by 指定</summary>
    private void SeedAttendance(long pwId, double workDays, string createdBy)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        conn.Execute(@"INSERT INTO attendances (member_id,project_id,project_worker_id,year_month,work_days,created_by,created_at,updated_at)
            VALUES (NULL,@P,@PW,@Y,@W,@By,@Now,@Now)",
            new { P = TestProjectId, PW = pwId, Y = TestYearMonth, W = workDays, By = createdBy, Now });
    }

    /// <summary>
    /// seed 一条工资行（未发款未归档，可被 generate 重算）。
    /// dailyWage/workDays/actualWage 为「分」DB 原始值；createdBy 指定。
    /// </summary>
    private void SeedWage(long pwId, long dailyWageFen, double workDays, long actualWageFen, string createdBy)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        conn.Execute(@"INSERT INTO wages (project_id,project_worker_id,year_month,daily_wage,work_days,bonus,deduction,actual_wage,created_by,created_at,updated_at,version,last_modified_at)
            VALUES (@P,@PW,@Y,@D,@WD,0,0,@A,@By,@Now,@Now,1,@Now)",
            new { P = TestProjectId, PW = pwId, Y = TestYearMonth, D = dailyWageFen, WD = workDays, A = actualWageFen, By = createdBy, Now });
    }

    private dynamic? QueryWage(long id)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.QueryFirstOrDefault("SELECT * FROM wages WHERE id=@Id", new { Id = id });
    }

    private async Task<JsonElement> PostGenerateAsync(long projectId, string yearMonth)
    {
        var resp = await Client.PostAsJsonAsync("/api/wages/generate", new { projectId, yearMonth });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode); // 现状/目标态都返回 200（非 403）
        return await resp.Content.ReadFromJsonAsync<JsonElement>();
    }

    // ── GenA：正向对照 —— admin 生成，重算自己创建的工资行 → 200，三列被重算 ──
    // 用途：证明这条路径真会写库、测试基座是通的。没有它，后两条都不算数。
    [Fact]
    public async Task GenA_Owner_Generate_RecalculatesOwnRow()
    {
        SetAuth(await LoginAsync("admin"));

        // 日薪 300 元，考勤 22 天 → daily_wage=30000 分、work_days=22.0、actual_wage=660000 分
        var pw = SeedProjectWorker("GenA-工人", AdminUid, dailyWage: 300);
        SeedAttendance(pw, 22, AdminUid);
        // 预置工资行：初值与重算结果不同（daily_wage=20000 分 / 20 天 / 400000 分）
        long wageId;
        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Open();
            wageId = conn.ExecuteScalar<long>(@"INSERT INTO wages (project_id,project_worker_id,year_month,daily_wage,work_days,bonus,deduction,actual_wage,created_by,created_at,updated_at,version,last_modified_at)
                VALUES (@P,@PW,@Y,20000,20.0,0,0,400000,@By,@Now,@Now,1,@Now);
                SELECT last_insert_rowid();",
                new { P = TestProjectId, PW = pw, Y = TestYearMonth, By = AdminUid, Now });
        }

        var json = await PostGenerateAsync(TestProjectId, TestYearMonth);

        // 响应：newCount=0（行已存在，走更新）；ownershipSkipped 应为 0（owner 不被拦）
        Assert.Equal(0, json.GetProperty("newCount").GetInt32());
        if (json.TryGetProperty("ownershipSkipped", out var os))
            Assert.Equal(0, os.GetInt32());

        using (var conn = new SqliteConnection(ConnectionString))
        {
            var row = conn.QueryFirst("SELECT daily_wage, work_days, actual_wage, created_by, version FROM wages WHERE id=@Id", new { Id = wageId });
            Assert.Equal(30000L, (long)row.daily_wage);      // 20000 → 30000 分
            Assert.Equal(22.0, (double)row.work_days);        // 20 → 22 天
            Assert.Equal(660000L, (long)row.actual_wage);     // 400000 → 660000 分
            Assert.Equal(AdminUid, (string)row.created_by);   // 归属不变
            Assert.Equal(2L, (long)row.version);              // version 1 → 2（被更新过）
        }
    }

    // ── GenB：目标态（修复前必须红）—— B（非 admin）调 generate，改写 A 创建的工资行 → 改不动 ──
    // 搭建：考勤行 created_by=B（进 B 的 scope，确保 atts 非空、触达 UPDATE）；
    //       工资行 created_by=A（admin）——existing 定位 SELECT 不 filter，B 能读到 → UPDATE 被归属守卫拦。
    // 修复前：A 的工资行被 B 重算（三列值变、version 动）→ 红。
    [Fact]
    public async Task GenB_OwnAttendance_ForeignWageRow_CannotOverwrite()
    {
        // B：accountant —— 默认权限集含 wages:create/wages:update；非 admin；无项目授权
        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Open();
            var salt = "r9-2-acc-salt-123456";
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

        // B 自建考勤（22 天，日薪 300 元）→ 进 B 的 scope，atts 非空
        var pw = SeedProjectWorker("GenB-目标工人", OtherUid, dailyWage: 300);
        SeedAttendance(pw, 22, OtherUid);
        // A（admin）建工资行：初值 20000 分 / 20 天 / 400000 分（与 generate 重算结果不同）
        long wageId;
        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Open();
            wageId = conn.ExecuteScalar<long>(@"INSERT INTO wages (project_id,project_worker_id,year_month,daily_wage,work_days,bonus,deduction,actual_wage,created_by,created_at,updated_at,version,last_modified_at)
                VALUES (@P,@PW,@Y,20000,20.0,0,0,400000,@By,@Now,@Now,1,@Now);
                SELECT last_insert_rowid();",
                new { P = TestProjectId, PW = pw, Y = TestYearMonth, By = AdminUid, Now });
        }

        var json = await PostGenerateAsync(TestProjectId, TestYearMonth);

        // 目标态：B 改不动 → 行三列保持原值、created_by 仍 A、version 未动（DB 断言前置，
        // 让修复前（stash 摘除）红在「值变了」而非响应键缺失——贴合任务书 Z1 续(b) 预期）
        using (var conn = new SqliteConnection(ConnectionString))
        {
            var row = conn.QueryFirst("SELECT daily_wage, work_days, actual_wage, created_by, version FROM wages WHERE id=@Id", new { Id = wageId });
            Assert.Equal(20000L, (long)row.daily_wage);      // 未被重算
            Assert.Equal(20.0, (double)row.work_days);        // 未被重算
            Assert.Equal(400000L, (long)row.actual_wage);     // 未被重算
            Assert.Equal(AdminUid, (string)row.created_by);   // 归属仍是 A
            Assert.Equal(1L, (long)row.version);              // version 未动
        }

        // 目标态：响应 newCount==0、ownershipSkipped >= 1（B 被归属拦截）
        Assert.Equal(0, json.GetProperty("newCount").GetInt32());
        var ownershipSkipped = json.GetProperty("ownershipSkipped").GetInt32();
        Assert.True(ownershipSkipped >= 1, $"ownershipSkipped 应 >= 1，实际 {ownershipSkipped}");
    }

    // ── GenC：反向对照 —— 同一个 B，考勤行与工资行都是 B 自己创建 → 正常重算 ──
    // 用途：证明守卫没把非 admin 一律挡死。
    [Fact]
    public async Task GenC_OtherUser_Generate_OwnRowWorks()
    {
        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Open();
            var salt = "r9-2-acc-salt-123456";
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

        // B 自己建：考勤（22 天、日薪 300 元） + 工资行（初值 20000 分 / 20 天 / 400000 分）
        var pw = SeedProjectWorker("GenC-B工人", OtherUid, dailyWage: 300);
        SeedAttendance(pw, 22, OtherUid);
        long wageId;
        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Open();
            wageId = conn.ExecuteScalar<long>(@"INSERT INTO wages (project_id,project_worker_id,year_month,daily_wage,work_days,bonus,deduction,actual_wage,created_by,created_at,updated_at,version,last_modified_at)
                VALUES (@P,@PW,@Y,20000,20.0,0,0,400000,@By,@Now,@Now,1,@Now);
                SELECT last_insert_rowid();",
                new { P = TestProjectId, PW = pw, Y = TestYearMonth, By = OtherUid, Now });
        }

        var json = await PostGenerateAsync(TestProjectId, TestYearMonth);

        // B 自己的行 → 正常重算（30000 分 / 22 天 / 660000 分）
        Assert.Equal(0, json.GetProperty("newCount").GetInt32());
        if (json.TryGetProperty("ownershipSkipped", out var os))
            Assert.Equal(0, os.GetInt32());

        using (var conn = new SqliteConnection(ConnectionString))
        {
            var row = conn.QueryFirst("SELECT daily_wage, work_days, actual_wage, created_by, version FROM wages WHERE id=@Id", new { Id = wageId });
            Assert.Equal(30000L, (long)row.daily_wage);      // 20000 → 30000 分
            Assert.Equal(22.0, (double)row.work_days);        // 20 → 22 天
            Assert.Equal(660000L, (long)row.actual_wage);     // 400000 → 660000 分
            Assert.Equal(OtherUid, (string)row.created_by);   // 归属不变
            Assert.Equal(2L, (long)row.version);              // version 1 → 2（被更新过）
        }
    }
}
