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
/// R9-21 Z3：A 桶收尾 —— A7 POST /api/cost-ledger/{batchId}/sheet 补 per-row cross_user_edit audit，5 条测试。
///
/// 背景：A 桶形态（200 缺 audit）——sheet UPDATE 分支 WHERE 已含
/// UserFilterWithAuthorizedProjects，授权跨人行现在就能改（200），本轮只在
/// **实际发生跨人改写时** 同事务补 AuditWriter.CrossUserEdit（resource='cost_ledger'）。
/// 判定直接调 RowWriteGate.Classify（与全库单点一致，不手写 EXISTS）；
/// 现有批量摘要 audit（action='update'、resource='cost_ledger_sheet'）原样保留不动，两者并存。
/// 批次门（UserFilterWithAuthorizedProjects 验 batch 归属，无权整单 403）不动；
/// INSERT 新行走 batch 的 project_id 不动；未匹配行 → skipped++ 不动。
/// 金额 REAL（元）直传直存。
///
/// ★ 先红主体（Red1）：现状 HTTP 已 200（UserFilter 授权命中），失败点是 audit 计数
/// （Expected 1 / Actual 0）——A 桶形态，不是 403。
///
/// 行为人：内置 accountant uid='r9-21-sht'（默认集含 costLedger:update，禁改内置角色）；
/// 项目行（id 9120，created_by='1'）+ 按用例需要 project_authorizations（9120→B）；
/// 批次 admin 建、行 admin 建（Red1）/ 行 B 建（Pin2）。
/// cost_ledger 种子最低：project_id、batch_id、amount（元）、date、direction、created_by。
///
/// 5 条：Red1（授权跨人改他人行 → 200 + 该行 cross_user_edit audit 1 行，先红主体）
/// + Pin1（未授权项目 → 批次门整单 403）+ Pin2（本人行 → 200 无 cross_user_edit）
/// + Pin3（admin 改他人行 → 200 无 cross_user_edit，AllowedOwn）
/// + Pin4（行 id 不存在 → skipped+1、200、无 audit，现状语义）。
/// </summary>
public class R9SheetCrossUserEditTests : ApiTestBase
{
    private const string AdminUid = "1";             // 基座种子 admin（username=admin）
    private const string ShtUid = "r9-21-sht";       // accountant
    private const string Password = "admin123";
    private const long TestProjectId = 9120;
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

    /// <summary>seed accountant 用户 + 项目行（9120，created_by='1'）+ 可选授权（9120→B）</summary>
    private void SeedAccountantAndProject(bool withAuthz)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var salt = "r9-21-sht-salt-123456";
        var hash = EngineeringManager.Api.Common.HashPassword(Password, salt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
            new
            {
                Id = ShtUid, Username = ShtUid, Password, Hash = hash, Salt = salt,
                Version = 2, DisplayName = "财务", RoleId = "accountant", Status = "active", Now
            });
        conn.Execute("INSERT OR IGNORE INTO projects (id, name, created_by, created_at) VALUES (@P, 'R9-21S项目', @By, @Now)",
            new { P = TestProjectId, By = AdminUid, Now });
        if (withAuthz)
            conn.Execute("INSERT OR IGNORE INTO project_authorizations (project_id, user_id, granted_by, granted_at) VALUES (@P, @U, @By, @Now)",
                new { P = TestProjectId, U = ShtUid, By = AdminUid, Now });
    }

    /// <summary>seed 一个批批次（admin 建，项目 9120），返回 cost_ledger_batches.id</summary>
    private long SeedBatch(string createdBy)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.ExecuteScalar<long>(@"INSERT INTO cost_ledger_batches (project_id,name,created_by,created_at,updated_at)
            VALUES (@P,'S批次',@By,@Now,@Now); SELECT last_insert_rowid();",
            new { P = TestProjectId, By = createdBy, Now });
    }

    /// <summary>seed 一条 cost_ledger 行（batch 内），返回 id</summary>
    private long SeedLedgerRow(long batchId, string createdBy, double amount = 1000)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.ExecuteScalar<long>(@"INSERT INTO cost_ledger
            (project_id,batch_id,voucher_no,date,direction,category,amount,counterparty,channel,summary,notes,created_by,created_at,updated_at,version,last_modified_at)
            VALUES (@P,@B,'V-001','2026-08-01','expense','材料',@A,'乙方','银行','S行',NULL,@By,@Now,@Now,1,@Now);
            SELECT last_insert_rowid();",
            new { P = TestProjectId, B = batchId, A = amount, By = createdBy, Now });
    }

    private long CountAuditForLedgerRow(long rowId, string userId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.ExecuteScalar<long>(
            "SELECT COUNT(*) FROM audit_logs WHERE action='cross_user_edit' AND resource='cost_ledger' AND resource_id=@Id AND user_id=@U",
            new { Id = rowId.ToString(), U = userId });
    }

    private async Task<HttpResponseMessage> PostSheetAsync(long batchId, object[] entries)
    {
        return await Client.PostAsJsonAsync($"/api/cost-ledger/{batchId}/sheet", new { entries });
    }

    // ── Red1（先红主体）：B + 授权，admin 建批次 + admin 建行 → POST sheet 改该行 → 200 + 该行 audit ──
    // ★ 先红形态：HTTP 已 200（UserFilter 授权命中），失败点 audit 计数（1 vs 0），不是 403。
    [Fact]
    public async Task Red1_AuthorizedCrossUserEdit_Returns200_WithAudit()
    {
        SeedAccountantAndProject(withAuthz: true);
        var bId = SeedBatch(AdminUid);
        var rowId = SeedLedgerRow(bId, AdminUid, 1000); // admin 建行 amount=1000
        SetAuth(await LoginAsync(ShtUid));

        var resp = await PostSheetAsync(bId, new[]
        {
            new { id = rowId, date = "2026-08-01", direction = "expense", category = "材料", amount = 2000.0, summary = "S-改" },
        });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(0, json.GetProperty("data").GetProperty("skipped").GetInt32()); // 行命中（updated=1）
        Assert.Equal(1L, CountAuditForLedgerRow(rowId, ShtUid)); // 该行 cross_user_edit audit 一行
    }

    // ── Pin1：B 无授权 → 批次门整单 403（现状）──
    [Fact]
    public async Task Pin1_UnauthorizedProject_Returns403()
    {
        SeedAccountantAndProject(withAuthz: false);
        var bId = SeedBatch(AdminUid);
        SetAuth(await LoginAsync(ShtUid));

        var resp = await PostSheetAsync(bId, new[]
        {
            new { id = 1, date = "2026-08-01", direction = "expense", category = "材料", amount = 2000.0 },
        });
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode); // 批次门拦（整单）
    }

    // ── Pin2：B 本人行 → 200 + 无 cross_user_edit（AllowedOwn 不落审计）──
    [Fact]
    public async Task Pin2_OwnerRow_Returns200_NoAudit()
    {
        SeedAccountantAndProject(withAuthz: true);
        var bId = SeedBatch(AdminUid);
        var rowId = SeedLedgerRow(bId, ShtUid, 1000); // B 自建行
        SetAuth(await LoginAsync(ShtUid));

        var resp = await PostSheetAsync(bId, new[]
        {
            new { id = rowId, date = "2026-08-01", direction = "expense", category = "材料", amount = 1500.0 },
        });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal(0L, CountAuditForLedgerRow(rowId, ShtUid)); // 本人无 cross_user_edit
    }

    // ── Pin3：admin 改他人行 → 200 无 cross_user_edit（admin 是 AllowedOwn）──
    [Fact]
    public async Task Pin3_AdminEdit_No_CrossUserAudit()
    {
        var bId = SeedBatch(AdminUid);
        var rowId = SeedLedgerRow(bId, ShtUid, 1000); // 行 B 建，admin 操作
        SetAuth(await LoginAsync("admin"));

        var resp = await PostSheetAsync(bId, new[]
        {
            new { id = rowId, date = "2026-08-01", direction = "expense", category = "材料", amount = 2000.0 },
        });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal(0L, CountAuditForLedgerRow(rowId, ShtUid)); // admin 不落 cross_user_edit
    }

    // ── Pin4：行 id 不存在 → skipped+1、200、无 audit（现状语义）──
    [Fact]
    public async Task Pin4_NonexistentRow_Skipped_NoAudit()
    {
        SeedAccountantAndProject(withAuthz: true);
        var bId = SeedBatch(AdminUid);
        SetAuth(await LoginAsync(ShtUid));

        var resp = await PostSheetAsync(bId, new[]
        {
            new { id = 999999, date = "2026-08-01", direction = "expense", category = "材料", amount = 2000.0 },
        });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(1, json.GetProperty("data").GetProperty("skipped").GetInt32()); // skipped+1
        Assert.Equal(0L, CountAuditForLedgerRow(999999, ShtUid)); // 无 audit
    }
}