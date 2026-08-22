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
/// R9-23 Z3：专列 B47 —— POST /api/wages/confirm-matches 方案丙对齐（照 B48/R9-10 先例），7 条测试。
///
/// confirm-matches = 带回单路径的 batch-payment（bankReceiptPath 必填）。写侧守卫与 B48 一致：
/// deleted_at + payment_locked + created_by/admin → 本轮按 B48 先例对齐：逐对预读 →
/// locked 先 skipped → Classify → Denied skipped / ViaAuthz UPDATE + 同事务 audit。
/// 读侧 match-receipts 已含 UserFilter（对称，零改动）。
/// ★ 本端点无 403 响应形态——先红失败是 saved/audit 计数断言（现状 created_by 守卫 →
/// saved==0/skipped==1），不是 HTTP 403。
/// helper / WriteResult 零改动。金额：API 元 → ToFen 落库（既有行为照原样，断言读分）。
/// 行为人：内置 accountant uid='r9-23-acc'（默认集含 wages:update，禁改角色）。
/// 项目 9124，created_by='1'；授权按例 9124→B。工资行金额全「分」直存。
/// 7 条：Red1 + Pin1 无授权 skipped / Pin2 本人 saved 无 audit / Pin3 admin saved /
/// Pin4 锁行 skipped / Pin5 不存在 skipped / Pin6 缺字段 400 整单。
/// </summary>
public class R9ConfirmMatchCrossUserTests : ApiTestBase
{
    private const string AdminUid = "1";
    private const string AccUid = "r9-23-acc";
    private const string AccUsername = "r9-23-acc";
    private const string Password = "admin123";
    private const long TestProjectId = 9124;
    private const string TestYearMonth = "2026-08";
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

    private void SeedAccountantAndProject(bool withAuthz)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var salt = "r9-23-acc-salt-123456";
        var hash = EngineeringManager.Api.Common.HashPassword(Password, salt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
            new
            {
                Id = AccUid, Username = AccUsername, Password, Hash = hash, Salt = salt,
                Version = 2, DisplayName = "财务", RoleId = "accountant", Status = "active", Now
            });
        conn.Execute("INSERT OR IGNORE INTO projects (id, name, created_by, created_at) VALUES (@P, 'R9-23项目', @By, @Now)",
            new { P = TestProjectId, By = AdminUid, Now });
        if (withAuthz)
            conn.Execute("INSERT OR IGNORE INTO project_authorizations (project_id, user_id, granted_by, granted_at) VALUES (@P, @U, @By, @Now)",
                new { P = TestProjectId, U = AccUid, By = AdminUid, Now });
    }

    private long SeedWage(string createdBy, bool locked = false)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.ExecuteScalar<long>(@"INSERT INTO wages
            (project_id,project_worker_id,year_month,daily_wage,work_days,actual_wage,paid_amount,payment_locked,created_by,created_at,updated_at,version,last_modified_at)
            VALUES (@P,NULL,@Y,30000,22.0,660000,NULL,@Locked,@By,@Now,@Now,1,@Now);
            SELECT last_insert_rowid();",
            new { P = TestProjectId, Y = TestYearMonth, Locked = locked ? 1 : 0, By = createdBy, Now });
    }

    private long CountAudit(long wageId, string userId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.ExecuteScalar<long>(
            "SELECT COUNT(*) FROM audit_logs WHERE action='cross_user_edit' AND resource='wages' AND resource_id=@Id AND user_id=@U",
            new { Id = wageId.ToString(), U = userId });
    }

    private long? GetPaidAmount(long wageId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.ExecuteScalar<long?>("SELECT paid_amount FROM wages WHERE id=@Id", new { Id = wageId });
    }

    private async Task<JsonElement> PostConfirmAsync(long wageId, double paidAmountYuan = 300.0,
        string paidDate = "2026-08-05", string receiptPath = "r.jpg")
    {
        var resp = await Client.PostAsJsonAsync("/api/wages/confirm-matches", new[]
        {
            new { wageId, paidAmount = paidAmountYuan, paidDate, bankReceiptPath = receiptPath },
        });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        return await resp.Content.ReadFromJsonAsync<JsonElement>();
    }

    // ── Red1（先红主体）：B + 授权 + admin 建行 → confirm → saved==1 + paid_amount=30000 + audit ──
    // ★ 先红形态：现状 created_by 守卫 → saved==0/skipped==1 → 红在 saved/audit 计数，不是 403。
    [Fact]
    public async Task Red1_AuthorizedCrossUserConfirm_Saved_WithAudit()
    {
        SeedAccountantAndProject(withAuthz: true);
        var wageId = SeedWage(AdminUid);
        SetAuth(await LoginAsync(AccUsername));

        var json = await PostConfirmAsync(wageId);
        Assert.Equal(1, json.GetProperty("data").GetProperty("saved").GetInt32());
        Assert.Equal(0, json.GetProperty("data").GetProperty("skipped").GetInt32());
        Assert.Equal(30000L, GetPaidAmount(wageId)); // 300 元 → 30000 分
        Assert.Equal(1L, CountAudit(wageId, AccUid));
    }

    [Fact]
    public async Task Pin1_NoAuthz_Skipped()
    {
        SeedAccountantAndProject(withAuthz: false);
        var wageId = SeedWage(AdminUid);
        SetAuth(await LoginAsync(AccUsername));

        var json = await PostConfirmAsync(wageId);
        Assert.Equal(0, json.GetProperty("data").GetProperty("saved").GetInt32());
        Assert.Equal(1, json.GetProperty("data").GetProperty("skipped").GetInt32());
        Assert.Null(GetPaidAmount(wageId));
        Assert.Equal(0L, CountAudit(wageId, AccUid));
    }

    [Fact]
    public async Task Pin2_OwnerConfirm_Saved_NoAudit()
    {
        SeedAccountantAndProject(withAuthz: false);
        var wageId = SeedWage(AccUid); // B 自建行
        SetAuth(await LoginAsync(AccUsername));

        var json = await PostConfirmAsync(wageId);
        Assert.Equal(1, json.GetProperty("data").GetProperty("saved").GetInt32());
        Assert.Equal(30000L, GetPaidAmount(wageId));
        Assert.Equal(0L, CountAudit(wageId, AccUid)); // 本人确认不落审计
    }

    [Fact]
    public async Task Pin3_AdminConfirm_Saved()
    {
        var wageId = SeedWage(AdminUid);
        SetAuth(await LoginAsync("admin"));

        var json = await PostConfirmAsync(wageId);
        Assert.Equal(1, json.GetProperty("data").GetProperty("saved").GetInt32());
        Assert.Equal(30000L, GetPaidAmount(wageId));
    }

    [Fact]
    public async Task Pin4_LockedRow_Skipped()
    {
        SeedAccountantAndProject(withAuthz: true);
        var wageId = SeedWage(AdminUid, locked: true); // 锁在授权分支之前
        SetAuth(await LoginAsync(AccUsername));

        var json = await PostConfirmAsync(wageId);
        Assert.Equal(0, json.GetProperty("data").GetProperty("saved").GetInt32());
        Assert.Equal(1, json.GetProperty("data").GetProperty("skipped").GetInt32());
        Assert.Null(GetPaidAmount(wageId));
        Assert.Equal(0L, CountAudit(wageId, AccUid));
    }

    [Fact]
    public async Task Pin5_NonexistentRow_Skipped()
    {
        SeedAccountantAndProject(withAuthz: true);
        SetAuth(await LoginAsync(AccUsername));

        var json = await PostConfirmAsync(999999);
        Assert.Equal(0, json.GetProperty("data").GetProperty("saved").GetInt32());
        Assert.Equal(1, json.GetProperty("data").GetProperty("skipped").GetInt32());
    }

    [Fact]
    public async Task Pin6_MissingField_Returns400()
    {
        SeedAccountantAndProject(withAuthz: true);
        SetAuth(await LoginAsync(AccUsername));

        var resp = await Client.PostAsJsonAsync("/api/wages/confirm-matches", new[]
        {
            new { wageId = 1L, paidAmount = 300.0, paidDate = "2026-08-05" }, // 缺 bankReceiptPath
        });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode); // 整单 400
        var body = await resp.Content.ReadAsStringAsync();
        Assert.Contains("bankReceiptPath", body);
    }
}
