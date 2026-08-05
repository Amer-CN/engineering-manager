using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Dapper;
using EngineeringManager.Api;
using EngineeringManager.Tests.Common;
using Microsoft.Data.Sqlite;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// R3.1: UserFilterWithAuthorizedProjects 行为级覆盖（F6-3 语义主体）。
/// 背景：GetDataScope 对非 admin 返回 AuthorizedProjects，而该过滤方法的
/// created_by / EXISTS 两个分支此前只有 DataScopeTests 的字符串级断言，
/// 没有任何端点级测试钉住行为（破坏任一分支，702 条测试仍全绿）。
/// 本类用最简实体 income_contracts（单表、无 JOIN）补行为覆盖：
///   正向1: worker 能看到自己 created_by 的记录（created_by 分支）
///   正向2: worker 能看到【被授权项目】下他人创建的记录（EXISTS 分支）
///   反向1: worker 看不到【未授权项目】下他人创建的记录
/// 三条断言合并进同一次 GET（防「全空」「全可见」两种坏法）。
/// 版本选择：personal（该端点无 edition 门禁，未冻结）——personal 是钉住
/// F6-3 语义的版本（旧 X8 语义下非 admin 恒 All，反向1 必红）。
/// </summary>
public class ProjectAuthzIsolationTests : ApiTestBase
{
    private const string AdminUsername = "admin";
    private const string WorkerId = "f6-worker-2";
    private const string WorkerUsername = "f6worker2";
    private const string Password = "admin123";

    private static string ExtractToken(string json)
    {
        var marker = "\"token\":\"";
        var i = json.IndexOf(marker, StringComparison.Ordinal);
        if (i < 0) throw new Exception("token not found: " + json);
        var start = i + marker.Length;
        var end = json.IndexOf('\"', start);
        return json.Substring(start, end - start);
    }

    private void SetAuth(string token) =>
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private static string? SwitchEdition(string? edition)
    {
        // R2.3(b): 先存旧值，finally 还原（不硬编码回 enterprise）
        var old = Environment.GetEnvironmentVariable("ENGINEERING_MANAGER_EDITION");
        Environment.SetEnvironmentVariable("ENGINEERING_MANAGER_EDITION", edition);
        var t = typeof(ApiConfig);
        t.GetField("_cachedEdition", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static)!.SetValue(null, null);
        t.GetField("_editionWarning", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static)!.SetValue(null, null);
        return old;
    }

    /// <summary>R2.3(a): 注入的 worker 用户测试结束必须清理。</summary>
    private void DeleteWorkerUser()
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "DELETE FROM users WHERE id = @Id";
        cmd.Parameters.AddWithValue("@Id", WorkerId);
        cmd.ExecuteNonQuery();
    }

    /// <summary>直接 SQL 建 worker（不走被冻结的 POST /api/users，镜像 ApiTestBase seed 方式）。</summary>
    private void CreateWorkerUser()
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var salt = "test-salt-1234567890123456";
        var hash = EngineeringManager.Api.Common.HashPassword(Password, salt, 2);
        using var cmd = conn.CreateCommand();
        cmd.CommandText = @"INSERT OR IGNORE INTO users (id, username, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES (@Id, @Username, @Hash, @Salt, 2, @DisplayName, 'worker', 'active', @Now)";
        cmd.Parameters.AddWithValue("@Id", WorkerId);
        cmd.Parameters.AddWithValue("@Username", WorkerUsername);
        cmd.Parameters.AddWithValue("@Hash", hash);
        cmd.Parameters.AddWithValue("@Salt", salt);
        cmd.Parameters.AddWithValue("@DisplayName", "R3授权隔离测试工人");
        cmd.Parameters.AddWithValue("@Now", DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"));
        cmd.ExecuteNonQuery();
    }

    /// <summary>
    /// 直接 SQL 造数据（不经 POST——POST 的 fire-and-forget 知识库 upsert 会触发
    /// 真实 BGE 下载，测试要钉住的是过滤行为，不是下载行为）。
    /// 场景：
    ///   P1 = worker 被授权项目（project_authorizations 有 (P1, worker)）
    ///   P2 = worker 未授权项目
    ///   R1 自己的记录（P1, created_by=worker）
    ///   R2 他人记录（P1, created_by=admin）——EXISTS 分支
    ///   R3 他人记录（P2, created_by=admin）——应不可见
    /// </summary>
    private void SeedProjectAuthzData()
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        using var tx = conn.BeginTransaction();
        var now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

        // 项目
        conn.Execute("INSERT INTO projects (id, name, created_by, created_at) VALUES (1, '授权项目P1', '1', @Now)", new { Now = now }, tx);
        conn.Execute("INSERT INTO projects (id, name, created_by, created_at) VALUES (2, '未授权项目P2', '1', @Now)", new { Now = now }, tx);
        // 授权行：worker 对 P1 有授权
        conn.Execute("INSERT INTO project_authorizations (project_id, user_id) VALUES (1, @WorkerId)", new { WorkerId }, tx);

        // 三条记录（分支隔离：每条记录只被一个分支支撑）
        //   R3-own 在未授权项目 P2 上 → 仅 created_by 分支可见（破坏 created_by 必红）
        //   R3-authorized-other 在授权项目 P1 上、他人创建 → 仅 EXISTS 分支可见（破坏 EXISTS 必红）
        //   R3-unauthorized-other 在未授权项目 P2 上、他人创建 → 两个分支都不可命中
        conn.Execute(@"INSERT INTO income_contracts (project_id, name, amount, counterparty, status, created_by, created_at, updated_at)
            VALUES (2, 'R3-own', 100, 'x', 'draft', @WorkerId, @Now, @Now)", new { WorkerId, Now = now }, tx);
        conn.Execute(@"INSERT INTO income_contracts (project_id, name, amount, counterparty, status, created_by, created_at, updated_at)
            VALUES (1, 'R3-authorized-other', 200, 'x', 'draft', '1', @Now, @Now)", new { Now = now }, tx);
        conn.Execute(@"INSERT INTO income_contracts (project_id, name, amount, counterparty, status, created_by, created_at, updated_at)
            VALUES (2, 'R3-unauthorized-other', 300, 'x', 'draft', '1', @Now, @Now)", new { Now = now }, tx);

        tx.Commit();
    }

    [Fact]
    public async Task IncomeContract_WorkerSeesOwnAndAuthorized_NotUnauthorized()
    {
        var oldEdition = SwitchEdition("personal");
        try
        {
            CreateWorkerUser();
            SeedProjectAuthzData();

            // worker 登录
            var workerLogin = await Client.PostAsJsonAsync("/api/auth/login", new { username = WorkerUsername, password = Password });
            if (!workerLogin.IsSuccessStatusCode)
                throw new Exception("worker login failed: " + workerLogin.StatusCode + " " + await workerLogin.Content.ReadAsStringAsync());
            SetAuth(ExtractToken(await workerLogin.Content.ReadAsStringAsync()));

            // 同一次 GET：自己的可见（正向1）+ 授权项目下他人记录可见（正向2）+ 未授权项目下他人记录不可见（反向1）
            var get = await Client.GetAsync("/api/contracts/income");
            Assert.Equal(HttpStatusCode.OK, get.StatusCode);
            var json = await get.Content.ReadFromJsonAsync<JsonElement>();
            var items = json.GetProperty("data").EnumerateArray().ToList();

            // 正向1：created_by 分支
            Assert.Contains(items, it => it.TryGetProperty("name", out var n) && n.GetString() == "R3-own");
            // 正向2：EXISTS 分支
            Assert.Contains(items, it => it.TryGetProperty("name", out var n) && n.GetString() == "R3-authorized-other");
            // 反向1：未授权项目不可见
            Assert.DoesNotContain(items, it => it.TryGetProperty("name", out var n) && n.GetString() == "R3-unauthorized-other");
        }
        finally
        {
            SwitchEdition(oldEdition);
            DeleteWorkerUser();
        }
    }

    /// <summary>
    /// R4.2: 非 admin 对「他人创建且未授权项目」的合同 PUT 必须 0 affected（不得 500）。
    /// 原 UserFilterFragmentForProject 生成引用 @ProjectId 的 EXISTS，而 PUT 的 Dapper
    /// 参数对象无 @ProjectId → 非 admin 必 500；且 @ProjectId 与行无关联（非行级过滤）。
    /// 删除该方法、改用 UserFilterWithAuthorizedProjects 后：UPDATE ... WHERE id=@Id AND
    /// (created_by=@Uid OR EXISTS(行级相关)) → 未授权行 affected=0，返回非 500。
    /// </summary>
    [Fact]
    public async Task IncomeContract_Put_UnauthorizedProject_ZeroAffected_No500()
    {
        var oldEdition = SwitchEdition("personal");
        try
        {
            CreateWorkerUser();
            SeedProjectAuthzData();

            // worker 登录
            var workerLogin = await Client.PostAsJsonAsync("/api/auth/login", new { username = WorkerUsername, password = Password });
            if (!workerLogin.IsSuccessStatusCode)
                throw new Exception("worker login failed: " + workerLogin.StatusCode + " " + await workerLogin.Content.ReadAsStringAsync());
            SetAuth(ExtractToken(await workerLogin.Content.ReadAsStringAsync()));

            // 取「未授权项目他人记录」的 id
            long unauthorizedId;
            using (var conn = new SqliteConnection(ConnectionString))
            {
                conn.Open();
                unauthorizedId = conn.ExecuteScalar<long>("SELECT id FROM income_contracts WHERE name = 'R3-unauthorized-other'");
            }

            // PUT 改名为 'R3-hacked'：未授权 → 不得 500，且行必须未被改动
            var put = await Client.PutAsJsonAsync("/api/contracts/income", new
            {
                id = unauthorizedId,
                name = "R3-hacked",
                amount = 999.0,
                status = "active",
                remarks = "越权尝试",
            });
            Assert.NotEqual(HttpStatusCode.InternalServerError, put.StatusCode);

            using var check = new SqliteConnection(ConnectionString);
            check.Open();
            var nameAfter = check.ExecuteScalar<string>("SELECT name FROM income_contracts WHERE id = @Id", new { Id = unauthorizedId });
            Assert.Equal("R3-unauthorized-other", nameAfter); // 0 affected：行未被改写
        }
        finally
        {
            SwitchEdition(oldEdition);
            DeleteWorkerUser();
        }
    }

    /// <summary>
    /// R5.4(d): GET /api/settlements 迁移 helper 后可见性对照——三分支（分支隔离法同上：
    /// own 在未授权项目 P2，仅 created_by 分支；authorized-other 在 P1，仅 EXISTS 分支；
    /// unauthorized-other 在 P2，两分支都不可命中）。
    /// 迁移前该端点用手写内联副本（语义等价但绕过 B5/B6 门禁），且零端点测试覆盖；
    /// 本测试钉住迁移后的可见性行为（R5.4 迁移不得改变可见性）。
    /// </summary>
    [Fact]
    public async Task SettlementsGet_Worker_ThreeBranches()
    {
        var oldEdition = SwitchEdition("personal");
        try
        {
            CreateWorkerUser();
            using (var conn = new SqliteConnection(ConnectionString))
            {
                conn.Open();
                var now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
                conn.Execute("INSERT INTO projects (id, name, created_by, created_at) VALUES (1, '授权项目P1', '1', @Now)", new { Now = now });
                conn.Execute("INSERT INTO projects (id, name, created_by, created_at) VALUES (2, '未授权项目P2', '1', @Now)", new { Now = now });
                conn.Execute("INSERT INTO project_authorizations (project_id, user_id) VALUES (1, @WorkerId)", new { WorkerId });
                conn.Execute(@"INSERT INTO settlements (project_id, name, amount, status, created_by, created_at, updated_at)
                    VALUES (2, 'R5-own', 100, 'pending', @WorkerId, @Now, @Now)", new { WorkerId, Now = now });
                conn.Execute(@"INSERT INTO settlements (project_id, name, amount, status, created_by, created_at, updated_at)
                    VALUES (1, 'R5-authorized-other', 200, 'pending', '1', @Now, @Now)", new { Now = now });
                conn.Execute(@"INSERT INTO settlements (project_id, name, amount, status, created_by, created_at, updated_at)
                    VALUES (2, 'R5-unauthorized-other', 300, 'pending', '1', @Now, @Now)", new { Now = now });
            }

            // worker 登录
            var workerLogin = await Client.PostAsJsonAsync("/api/auth/login", new { username = WorkerUsername, password = Password });
            if (!workerLogin.IsSuccessStatusCode)
                throw new Exception("worker login failed: " + workerLogin.StatusCode + " " + await workerLogin.Content.ReadAsStringAsync());
            SetAuth(ExtractToken(await workerLogin.Content.ReadAsStringAsync()));

            var get = await Client.GetAsync("/api/settlements");
            Assert.Equal(HttpStatusCode.OK, get.StatusCode);
            var json = await get.Content.ReadFromJsonAsync<JsonElement>();
            var items = json.GetProperty("data").EnumerateArray().ToList();

            // 正向1：created_by 分支
            Assert.Contains(items, it => it.TryGetProperty("name", out var n) && n.GetString() == "R5-own");
            // 正向2：EXISTS 分支
            Assert.Contains(items, it => it.TryGetProperty("name", out var n) && n.GetString() == "R5-authorized-other");
            // 反向1：未授权项目不可见
            Assert.DoesNotContain(items, it => it.TryGetProperty("name", out var n) && n.GetString() == "R5-unauthorized-other");
        }
        finally
        {
            SwitchEdition(oldEdition);
            DeleteWorkerUser();
        }
    }

    /// <summary>
    /// R5.5(b): GET /api/cost-ledger 读侧三分支（写不得宽于读裁决落地后的读侧行为）。
    /// 读侧 UserFilterCompany → UserFilterWithAuthorizedProjects 后，worker 应能读到
    /// 授权项目下他人创建的行（与写侧一致）；own 在未授权项目 P2（仅 created_by 分支）、
    /// authorized-other 在 P1（仅 EXISTS 分支）、unauthorized-other 在 P2（两分支都不可命中）。
    /// </summary>
    [Fact]
    public async Task CostLedgerGet_Worker_ThreeBranches()
    {
        var oldEdition = SwitchEdition("personal");
        try
        {
            CreateWorkerUser();
            using (var conn = new SqliteConnection(ConnectionString))
            {
                conn.Open();
                var now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
                conn.Execute("INSERT INTO projects (id, name, created_by, created_at) VALUES (1, '授权项目P1', '1', @Now)", new { Now = now });
                conn.Execute("INSERT INTO projects (id, name, created_by, created_at) VALUES (2, '未授权项目P2', '1', @Now)", new { Now = now });
                conn.Execute("INSERT INTO project_authorizations (project_id, user_id) VALUES (1, @WorkerId)", new { WorkerId });
                conn.Execute(@"INSERT INTO cost_ledger (project_id, voucher_no, date, direction, category, amount, summary, created_by, created_at, updated_at)
                    VALUES (2, 'R5-1', '2026-08-05', 'out', '测试', 100, 'R5-own', @WorkerId, @Now, @Now)", new { WorkerId, Now = now });
                conn.Execute(@"INSERT INTO cost_ledger (project_id, voucher_no, date, direction, category, amount, summary, created_by, created_at, updated_at)
                    VALUES (1, 'R5-2', '2026-08-05', 'out', '测试', 200, 'R5-authorized-other', '1', @Now, @Now)", new { Now = now });
                conn.Execute(@"INSERT INTO cost_ledger (project_id, voucher_no, date, direction, category, amount, summary, created_by, created_at, updated_at)
                    VALUES (2, 'R5-3', '2026-08-05', 'out', '测试', 300, 'R5-unauthorized-other', '1', @Now, @Now)", new { Now = now });
            }

            // worker 登录
            var workerLogin = await Client.PostAsJsonAsync("/api/auth/login", new { username = WorkerUsername, password = Password });
            if (!workerLogin.IsSuccessStatusCode)
                throw new Exception("worker login failed: " + workerLogin.StatusCode + " " + await workerLogin.Content.ReadAsStringAsync());
            SetAuth(ExtractToken(await workerLogin.Content.ReadAsStringAsync()));

            var get = await Client.GetAsync("/api/cost-ledger");
            Assert.Equal(HttpStatusCode.OK, get.StatusCode);
            var json = await get.Content.ReadFromJsonAsync<JsonElement>();
            var items = json.GetProperty("data").EnumerateArray().ToList();

            // 正向1：created_by 分支
            Assert.Contains(items, it => it.TryGetProperty("summary", out var s) && s.GetString() == "R5-own");
            // 正向2：EXISTS 分支（R5.5 提升读侧后，授权项目他人行可读）
            Assert.Contains(items, it => it.TryGetProperty("summary", out var s) && s.GetString() == "R5-authorized-other");
            // 反向1：未授权项目不可见
            Assert.DoesNotContain(items, it => it.TryGetProperty("summary", out var s) && s.GetString() == "R5-unauthorized-other");
        }
        finally
        {
            SwitchEdition(oldEdition);
            DeleteWorkerUser();
        }
    }
}
