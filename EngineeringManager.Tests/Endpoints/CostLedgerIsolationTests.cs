using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using EngineeringManager.Api;
using EngineeringManager.Tests.Common;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// F6-3: cost_ledger 越权断言——用户 A 无法读到用户 B 的 cost_ledger 记录。
/// 安全性质：无论 personal/enterprise，非 admin 用户只能看到自己的记录。
/// </summary>
public class CostLedgerIsolationTests : ApiTestBase
{
    private const string AdminUsername = "admin";
    private const string WorkerUsername = "f6worker";
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

    private static void SwitchEdition(string? edition)
    {
        Environment.SetEnvironmentVariable("ENGINEERING_MANAGER_EDITION", edition);
        var t = typeof(ApiConfig);
        t.GetField("_cachedEdition", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static)!.SetValue(null, null);
        t.GetField("_editionWarning", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static)!.SetValue(null, null);
    }

    private async Task<(string adminToken, string workerToken)> LoginAndCreateWorkerAsync()
    {
        var adminLogin = await Client.PostAsJsonAsync("/api/auth/login", new { username = AdminUsername, password = Password });
        if (!adminLogin.IsSuccessStatusCode)
            throw new Exception("admin login failed: " + adminLogin.StatusCode + " " + await adminLogin.Content.ReadAsStringAsync());
        var adminToken = ExtractToken(await adminLogin.Content.ReadAsStringAsync());
        SetAuth(adminToken);
        // 说明：不走 POST /api/users——personal 版下该端点被冻结（403），
        // 测试基建需绕过分冻结端点，直接用 SQLite 建 worker（镜像 ApiTestBase seed 方式）。
        using (var conn = new Microsoft.Data.Sqlite.SqliteConnection(ConnectionString))
        {
            conn.Open();
            var salt = "test-salt-1234567890123456";
            var hash = EngineeringManager.Api.Common.HashPassword(Password, salt, 2);
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"INSERT OR IGNORE INTO users (id, username, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
                VALUES (@Id, @Username, @Hash, @Salt, 2, @DisplayName, 'worker', 'active', @Now)";
            cmd.Parameters.AddWithValue("@Id", "f6-worker-1");
            cmd.Parameters.AddWithValue("@Username", WorkerUsername);
            cmd.Parameters.AddWithValue("@Hash", hash);
            cmd.Parameters.AddWithValue("@Salt", salt);
            cmd.Parameters.AddWithValue("@DisplayName", "F6越权测试工人");
            cmd.Parameters.AddWithValue("@Now", DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"));
            cmd.ExecuteNonQuery();
        }
        var workerLogin = await Client.PostAsJsonAsync("/api/auth/login", new { username = WorkerUsername, password = Password });
        if (!workerLogin.IsSuccessStatusCode)
            throw new Exception("worker login failed: " + workerLogin.StatusCode + " " + await workerLogin.Content.ReadAsStringAsync());
        var workerToken = ExtractToken(await workerLogin.Content.ReadAsStringAsync());
        return (adminToken, workerToken);
    }

    [Fact]
    public async Task CostLedger_WorkerCannotSeeAdminsRecords()
    {
        try
        {
            SwitchEdition("enterprise");
            var (adminToken, workerToken) = await LoginAndCreateWorkerAsync();

            // admin 插入一条 cost_ledger 记录
            SetAuth(adminToken);
            var create = await Client.PostAsJsonAsync("/api/cost-ledger", new
            {
                projectId = (long?)null,
                batchId = (long?)null,
                voucherNo = "F6-1",
                date = "2026-08-04",
                direction = "out",
                category = "测试",
                amount = 100,
                counterparty = "x",
                channel = "x",
                summary = "F6 越权测试记录",
            });
            create.EnsureSuccessStatusCode();

            // worker（非 admin）查列表——不得看到 admin 的记录
            SetAuth(workerToken);
            var get = await Client.GetAsync("/api/cost-ledger");
            Assert.Equal(HttpStatusCode.OK, get.StatusCode);
            var json = await get.Content.ReadFromJsonAsync<JsonElement>();
            var items = json.GetProperty("data").EnumerateArray().ToList();
            Assert.DoesNotContain(items, it => it.TryGetProperty("summary", out var s) && s.GetString() == "F6 越权测试记录");
        }
        finally { SwitchEdition("enterprise"); }
    }

    [Fact]
    public async Task CostLedger_PersonalEdition_WorkerAlsoCannotSeeAdminsRecords()
    {
        try
        {
            SwitchEdition("personal");
            var (adminToken, workerToken) = await LoginAndCreateWorkerAsync();

            // admin 插入一条 cost_ledger 记录
            SetAuth(adminToken);
            var create = await Client.PostAsJsonAsync("/api/cost-ledger", new
            {
                projectId = (long?)null,
                batchId = (long?)null,
                voucherNo = "F6-2",
                date = "2026-08-04",
                direction = "out",
                category = "测试",
                amount = 200,
                counterparty = "x",
                channel = "x",
                summary = "F6 个人版越权测试记录",
            });
            create.EnsureSuccessStatusCode();

            // worker（非 admin）查列表——个人版下同样不得看到 admin 的记录
            SetAuth(workerToken);
            var get = await Client.GetAsync("/api/cost-ledger");
            Assert.Equal(HttpStatusCode.OK, get.StatusCode);
            var json = await get.Content.ReadFromJsonAsync<JsonElement>();
            var items = json.GetProperty("data").EnumerateArray().ToList();
            Assert.DoesNotContain(items, it => it.TryGetProperty("summary", out var s) && s.GetString() == "F6 个人版越权测试记录");
        }
        finally { SwitchEdition("enterprise"); }
    }

    /// <summary>
    /// F6-3 正向对照 (a)：worker 自己创建的记录【必须看得到】。
    /// 现有两条纯否定断言无法区分「隔离」与「全空」——若过滤逻辑坏成
    /// 「非 admin 什么都看不见」，那两条照样全绿。本条堵住该回归形态。
    /// </summary>
    [Fact]
    public async Task CostLedger_WorkerSeesOwnRecord_PersonalEdition()
    {
        try
        {
            SwitchEdition("personal");
            var (_, workerToken) = await LoginAndCreateWorkerAsync();

            // worker 自己插入一条 cost_ledger 记录
            SetAuth(workerToken);
            var create = await Client.PostAsJsonAsync("/api/cost-ledger", new
            {
                projectId = (long?)null,
                batchId = (long?)null,
                voucherNo = "F6-P1",
                date = "2026-08-04",
                direction = "out",
                category = "测试",
                amount = 300,
                counterparty = "x",
                channel = "x",
                summary = "F6 worker 自有记录",
            });
            create.EnsureSuccessStatusCode();

            // worker 查列表——必须看得到自己的记录
            var get = await Client.GetAsync("/api/cost-ledger");
            Assert.Equal(HttpStatusCode.OK, get.StatusCode);
            var json = await get.Content.ReadFromJsonAsync<JsonElement>();
            var items = json.GetProperty("data").EnumerateArray().ToList();
            Assert.Contains(items, it => it.TryGetProperty("summary", out var s) && s.GetString() == "F6 worker 自有记录");
        }
        finally { SwitchEdition("enterprise"); }
    }

    /// <summary>
    /// F6-3 正向对照 (b)：同一次请求里 worker【看得到自己的】且【看不到 admin 的】。
    /// 一次断言两个方向，同时堵住「全空」（(a) 已堵）与「全可见」两种坏法。
    /// </summary>
    [Fact]
    public async Task CostLedger_WorkerSeesOwnAndNotAdmins_SameRequest_PersonalEdition()
    {
        try
        {
            SwitchEdition("personal");
            var (adminToken, workerToken) = await LoginAndCreateWorkerAsync();

            // admin 插入一条
            SetAuth(adminToken);
            var createAdmin = await Client.PostAsJsonAsync("/api/cost-ledger", new
            {
                projectId = (long?)null,
                batchId = (long?)null,
                voucherNo = "F6-P2A",
                date = "2026-08-04",
                direction = "out",
                category = "测试",
                amount = 400,
                counterparty = "x",
                channel = "x",
                summary = "F6 admin 记录",
            });
            createAdmin.EnsureSuccessStatusCode();

            // worker 插入一条自己的
            SetAuth(workerToken);
            var createWorker = await Client.PostAsJsonAsync("/api/cost-ledger", new
            {
                projectId = (long?)null,
                batchId = (long?)null,
                voucherNo = "F6-P2B",
                date = "2026-08-04",
                direction = "out",
                category = "测试",
                amount = 500,
                counterparty = "x",
                channel = "x",
                summary = "F6 worker 自有记录2",
            });
            createWorker.EnsureSuccessStatusCode();

            // 同一次 GET：自己的可见，admin 的不可见
            var get = await Client.GetAsync("/api/cost-ledger");
            Assert.Equal(HttpStatusCode.OK, get.StatusCode);
            var json = await get.Content.ReadFromJsonAsync<JsonElement>();
            var items = json.GetProperty("data").EnumerateArray().ToList();
            Assert.Contains(items, it => it.TryGetProperty("summary", out var s) && s.GetString() == "F6 worker 自有记录2");
            Assert.DoesNotContain(items, it => it.TryGetProperty("summary", out var s) && s.GetString() == "F6 admin 记录");
        }
        finally { SwitchEdition("enterprise"); }
    }
}
