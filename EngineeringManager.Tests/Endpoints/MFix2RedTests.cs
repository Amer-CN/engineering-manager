using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Dapper;
using EngineeringManager.Api.Services;
using EngineeringManager.Tests.Common;
using Microsoft.Data.Sqlite;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// M-FIX2 X2(a): G43/G44 表名错配先红实证（企业版 + manager mfix-mgr + 只授权 P1）。
/// 三条路径：sheet POST 批次归属校验 / getDashboardStats / getCostSummary——
/// 修复前误用跨表限定列 → SQLite「no such column」。
/// </summary>
public class MFix2RedTests : ApiTestBase
{
    private const string MgrUid = "mfix-mgr";

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

    private void Seed()
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
        conn.Execute("INSERT INTO projects (id, name, created_by, created_at) VALUES (1, 'P1', '1', @Now)", new { Now = now });
        conn.Execute("INSERT INTO projects (id, name, created_by, created_at) VALUES (2, 'P2', '1', @Now)", new { Now = now });
        conn.Execute("INSERT INTO project_authorizations (project_id, user_id) VALUES (1, @Mgr)", new { Mgr = MgrUid });
        conn.Execute("INSERT INTO cost_ledger_batches (id, project_id, name, created_by, created_at, last_modified_at) VALUES (10, 1, 'B1', '1', @Now, @Now)", new { Now = now });
        conn.Execute(@"INSERT INTO cost_ledger (id, project_id, batch_id, voucher_no, date, direction, category, amount, summary, created_by, created_at, updated_at)
            VALUES (1, 1, 10, 'V1', '2026-08-06', 'out', '测试', 100, 'F2', '1', @Now, @Now)", new { Now = now });
        // Z2(a): P1 授权数据（invoices/settlements 各一行）
        // Z2(c) + M-FIX5 W1(G53): P1 expense 行（direction='expense'，供 getCostSummary 的 expense 统计——
        // 这两行是为迎合 Agent 查询词汇而造，与写侧曾传 direction='out' 不一致，见 DIRECTION-VOCAB-DEFECT.md）
        // V2(b) M-FIX6: 缺陷锁定——写侧能存 direction='out'（无 CHECK 约束），读侧按 expense/income 统计不到。
        // 此行不被计入 totalExpense，正是「存得进、统计不到」缺陷被测试锁住（不是 bug 复现失败）。
        conn.Execute(@"INSERT INTO cost_ledger (id, project_id, batch_id, voucher_no, date, direction, category, amount, summary, created_by, created_at, updated_at)
            VALUES (5, 1, 10, 'V5', '2026-08-06', 'out', '测试', 777, 'P1-out-locked', '1', @Now, @Now)", new { Now = now });
        conn.Execute(@"INSERT INTO cost_ledger (id, project_id, batch_id, voucher_no, date, direction, category, amount, summary, created_by, created_at, updated_at)
            VALUES (3, 1, 10, 'V3', '2026-08-06', 'expense', '测试', 100, 'P1-expense', '1', @Now, @Now)", new { Now = now });
        conn.Execute(@"INSERT INTO invoices (id, project_id, name, amount, status, created_by, created_at, updated_at)
            VALUES (1, 1, 'inv-P1', 1000, 'pending', '1', @Now, @Now)", new { Now = now });
        conn.Execute(@"INSERT INTO settlements (id, project_id, name, amount, status, created_by, created_at, updated_at)
            VALUES (1, 1, 'sett-P1', 1000, 'pending', '1', @Now, @Now)", new { Now = now });
        // Z2(a): P2 越权行（created_by='other'，不该被 manager 看到）——覆盖 getDashboardStats 查的每张表
        conn.Execute("INSERT INTO cost_ledger_batches (id, project_id, name, created_by, created_at, last_modified_at) VALUES (11, 2, 'B2-P2', 'other', @Now, @Now)", new { Now = now });
        conn.Execute(@"INSERT INTO cost_ledger (id, project_id, batch_id, voucher_no, date, direction, category, amount, summary, created_by, created_at, updated_at)
            VALUES (2, 2, 11, 'V2', '2026-08-06', 'out', '测试', 200, 'P2-other', 'other', @Now, @Now)", new { Now = now });
        conn.Execute(@"INSERT INTO cost_ledger (id, project_id, batch_id, voucher_no, date, direction, category, amount, summary, created_by, created_at, updated_at)
            VALUES (4, 2, 11, 'V4', '2026-08-06', 'expense', '测试', 200, 'P2-expense', 'other', @Now, @Now)", new { Now = now });
        conn.Execute(@"INSERT INTO invoices (id, project_id, name, amount, status, created_by, created_at, updated_at)
            VALUES (2, 2, 'inv-P2', 2000, 'pending', 'other', @Now, @Now)", new { Now = now });
        conn.Execute(@"INSERT INTO settlements (id, project_id, name, amount, status, created_by, created_at, updated_at)
            VALUES (2, 2, 'sett-P2', 2000, 'pending', 'other', @Now, @Now)", new { Now = now });
        // manager 用户（roles 表需 manager 行有 dashboard:read/costLedger:read）
        var salt = "test-salt-1234567890123456";
        var hash = EngineeringManager.Api.Common.HashPassword("admin123", salt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
            new { Id = MgrUid, Username = "mfix-mgr", Password = "admin123", Hash = hash, Salt = salt, Version = 2, DisplayName = "经理", RoleId = "manager", Status = "active", Now = now });
    }

    private async Task LoginAsManager()
    {
        var login = await Client.PostAsJsonAsync("/api/auth/login", new { username = "mfix-mgr", password = "admin123" });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        SetAuth(ExtractToken(await login.Content.ReadAsStringAsync()));
    }

    [Fact]
    public async Task SheetPost_AuthorizedBatch_Succeeds_UnauthorizedBatch_Rejected()
    {
        // Y4(c) 偏差：manager 默认无 costLedger:update（G2 权限设计）→ 权限门拦到不了 SQL。
        // 改用 accountant（GetDefaultPermissions 含 costLedger:update）测 SQL 路径。
        Seed();
        // accountant 用户
        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Open();
            var now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
            conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
                VALUES ('mfix-acc', 'mfix-acc', 'x', @Hash, @Salt, 2, '财务', 'accountant', 'active', @Now)",
                new { Hash = EngineeringManager.Api.Common.HashPassword("admin123", "test-salt-1234567890123456", 2), Salt = "test-salt-1234567890123456", Now = now });
            // 越权行：P2 批次 + P2 cost_ledger（不该被 accountant 看到）
            conn.Execute("INSERT INTO project_authorizations (project_id, user_id) VALUES (1, 'mfix-acc')");
        }
        var login = await Client.PostAsJsonAsync("/api/auth/login", new { username = "mfix-acc", password = "admin123" });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        SetAuth(ExtractToken(await login.Content.ReadAsStringAsync()));

        // 正向：P1 批次（已授权）POST 成功
        var okPost = await Client.PostAsJsonAsync("/api/cost-ledger/10/sheet", new
        {
            entries = new[] { new { amount = 100.0, date = "2026-08-06", direction = "expense", category = "测试", summary = "Y4-ok" } },
        });
        Assert.Equal(HttpStatusCode.OK, okPost.StatusCode);
        // 反向：P2 批次（未授权）POST 被拒（403 或 0 行）
        var badPost = await Client.PostAsJsonAsync("/api/cost-ledger/11/sheet", new
        {
            entries = new[] { new { amount = 200.0, date = "2026-08-06", direction = "expense", category = "测试", summary = "Y4-bad" } },
        });
        Assert.Equal(HttpStatusCode.Forbidden, badPost.StatusCode);
    }

    [Fact]
    public async Task Agent_GetDashboardStats_NoSqlError()
    {
        Seed();
        await LoginAsManager();
        var ctx = new DefaultHttpContext();
        var claims = new List<System.Security.Claims.Claim>
        {
            new(System.Security.Claims.ClaimTypes.NameIdentifier, MgrUid),
            new("uid", MgrUid),
            new(System.Security.Claims.ClaimTypes.Role, "经理"),
        };
        ctx.User = new System.Security.Claims.ClaimsPrincipal(new System.Security.Claims.ClaimsIdentity(claims, "Test"));
        var tools = new AgentToolService(new FakeEmbeddingService());
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var result = await tools.ExecuteToolAsync("getDashboardStats", JsonDocument.Parse("{}").RootElement, ctx, conn);
        Assert.True(result.Success, "getDashboardStats 不应报 SQL 错误: " + (result.Error ?? ""));
        // Z2(b) 正反成对：invoicesCount/settlementsCount 各 1（P1），P2 越权行不得计入
        var text = System.Text.Json.JsonSerializer.Serialize(result.Result);
        var node = System.Text.Json.Nodes.JsonNode.Parse(text)!;
        Assert.Equal(1, node["invoicesCount"]!.GetValue<int>()); // W2 解析取值：前缀吞噬防 :10/:12（V3 删恒真 NotEqual）
        Assert.Equal(1, node["settlementsCount"]!.GetValue<int>());
    }

    [Fact]
    public async Task Agent_GetCostSummary_NoSqlError()
    {
        Seed();
        await LoginAsManager();
        var ctx = new DefaultHttpContext();
        var claims = new List<System.Security.Claims.Claim>
        {
            new(System.Security.Claims.ClaimTypes.NameIdentifier, MgrUid),
            new("uid", MgrUid),
            new(System.Security.Claims.ClaimTypes.Role, "经理"),
        };
        ctx.User = new System.Security.Claims.ClaimsPrincipal(new System.Security.Claims.ClaimsIdentity(claims, "Test"));
        var tools = new AgentToolService(new FakeEmbeddingService());
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var result = await tools.ExecuteToolAsync("getCostSummary", JsonDocument.Parse("{}").RootElement, ctx, conn);
        Assert.True(result.Success, "getCostSummary 不应报 SQL 错误: " + (result.Error ?? ""));
        // Y4(b) 正反成对：getCostSummary 返回各项目汇总——须含 P1（授权）不含 P2（未授权）
        var data = System.Text.Json.Nodes.JsonNode.Parse(System.Text.Json.JsonSerializer.Serialize(result.Result))!;
        var text = data.ToJsonString();
        // Z2(c) 偏差：getCostSummary 返回 {totalIncome,totalExpense,netTotal,...} 汇总，无 projectId 字段。
        // 改断金额：P1 cost_ledger expense=100（方向 out）在、P2 越权 expense=200 不在。
        var csNode = System.Text.Json.Nodes.JsonNode.Parse(text)!;
        Assert.Equal(100, csNode["totalExpense"]!.GetValue<int>()); // V2(b) 缺陷锁定：direction='out' 的 777 不被计入（写侧能存、读侧统计不到，G53 锁定）
        // V3：Equal 已钉死 100，out 777 不进统计由 V2(b) 独立数据行证明，NotEqual 是恒真死代码已删
        Assert.NotEqual(200, csNode["totalExpense"]!.GetValue<int>()); // P2 越权 200 不在
    }
}
