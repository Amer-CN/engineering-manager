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
/// R9-7 Z3：cost_ledger_categories 写端点权限码收紧（D9/D10 修复）——7 条测试。
///
/// 背景：D9/D10 登记「分类写端点用 costLedger:update」。分类是全局共享字典（无 created_by），
/// POST/PUT/DELETE 收紧为 settings:update（与 regions、reset 端点一致）；accountant 失去
/// 分类管理入口为有意行为变更（原作者 2026-08-09 拍板）；reset 本已 settings:update 不动；
/// GET 读路径不动。
///
/// 行为人：accountant（默认矩阵本身——默认集含 costLedger:create/read/update、仅
/// settings:read，无 settings:update；禁止 UPDATE roles）。admin 持 settings:update。
///
/// 7 条：反向×3（accountant POST/PUT/DELETE → 403 且无副作用）+ 正向×3（admin → 200
/// 且副作用发生）+ 钉住×1（accountant reset → 403，钉 reset 既有 settings:update 门）。
/// 修复前：恰好 3 条反向红（Actual OK + 副作用已发生 = 旧门 costLedger:update 放行
/// accountant 的实证），4 条绿（3 正向 + 1 钉住，Pin1 必须先红阶段也绿）。
/// </summary>
public class R9CategoryGateTests : ApiTestBase
{
    private const string AdminUid = "1";             // 基座种子 admin（username=admin）
    private const string AccUid = "r9-7-acc";        // accountant，非 admin
    private const string AccUsername = "r9-7-acc";
    private const string Password = "admin123";
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

    /// <summary>seed accountant 用户（默认矩阵本身，不 UPDATE roles）</summary>
    private void SeedAccountant()
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var salt = "r9-7-acc-salt-123456";
        var hash = EngineeringManager.Api.Common.HashPassword(Password, salt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
            new
            {
                Id = AccUid, Username = AccUsername, Password, Hash = hash, Salt = salt,
                Version = 2, DisplayName = "财务", RoleId = "accountant", Status = "active", Now
            });
    }

    private long CountCategoryByLabel(string label)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.ExecuteScalar<long>(
            "SELECT COUNT(*) FROM cost_ledger_categories WHERE label=@L", new { L = label });
    }

    private long SeedCategory(string label)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.ExecuteScalar<long>(@"INSERT INTO cost_ledger_categories (label, direction, level1, color)
            VALUES (@L, 'expense', NULL, NULL); SELECT last_insert_rowid();",
            new { L = label });
    }

    private string QueryCategoryLabel(long id)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.ExecuteScalar<string>("SELECT label FROM cost_ledger_categories WHERE id=@Id", new { Id = id })!;
    }

    // ══════════ 反向 ×3：accountant（无 settings:update）→ 403 且无副作用 ══════════

    [Fact]
    public async Task Reverse1_CategoryPost_Accountant_Returns403()
    {
        SeedAccountant();
        SetAuth(await LoginAsync(AccUsername));

        const string label = "R9-7类";
        var before = CountCategoryByLabel(label);

        var resp = await Client.PostAsJsonAsync("/api/cost-ledger/categories",
            new { name = label, direction = "expense", level1 = (string?)null, color = (string?)null });
        // 目标态：accountant 无 settings:update → 403 且行数不变
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        Assert.Equal(before, CountCategoryByLabel(label));
    }

    [Fact]
    public async Task Reverse2_CategoryPut_Accountant_Returns403()
    {
        SeedAccountant();
        SetAuth(await LoginAsync(AccUsername));

        var catId = SeedCategory("R9-7改前");
        var resp = await Client.PutAsJsonAsync("/api/cost-ledger/categories",
            new { id = catId, name = "R9-7改后", direction = "expense", level1 = (string?)null, color = (string?)null });
        // 目标态：403 且库中 label 原值不变（DTO 字段名是 name，SQL 里 label=@Name）
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        Assert.Equal("R9-7改前", QueryCategoryLabel(catId));
    }

    [Fact]
    public async Task Reverse3_CategoryDelete_Accountant_Returns403()
    {
        SeedAccountant();
        SetAuth(await LoginAsync(AccUsername));

        var catId = SeedCategory("R9-7删前");
        var resp = await Client.DeleteAsync($"/api/cost-ledger/categories/{catId}");
        // 目标态：403 且该行仍在
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        using (var conn = new SqliteConnection(ConnectionString))
        {
            Assert.Equal(1L, conn.ExecuteScalar<long>("SELECT COUNT(*) FROM cost_ledger_categories WHERE id=@Id", new { Id = catId }));
        }
    }

    // ══════════ 正向 ×3：admin（有 settings:update）→ 200 且副作用发生 ══════════

    [Fact]
    public async Task Forward1_CategoryPost_Admin_Returns200()
    {
        SetAuth(await LoginAsync("admin"));

        const string label = "R9-7正类";
        var before = CountCategoryByLabel(label);

        var resp = await Client.PostAsJsonAsync("/api/cost-ledger/categories",
            new { name = label, direction = "expense", level1 = (string?)null, color = (string?)null });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal(before + 1, CountCategoryByLabel(label));
    }

    [Fact]
    public async Task Forward2_CategoryPut_Admin_Returns200()
    {
        SetAuth(await LoginAsync("admin"));

        var catId = SeedCategory("R9-7正改前");
        var resp = await Client.PutAsJsonAsync("/api/cost-ledger/categories",
            new { id = catId, name = "R9-7正改后", direction = "expense", level1 = (string?)null, color = (string?)null });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal("R9-7正改后", QueryCategoryLabel(catId));
    }

    [Fact]
    public async Task Forward3_CategoryDelete_Admin_Returns200()
    {
        SetAuth(await LoginAsync("admin"));

        var catId = SeedCategory("R9-7正删");
        var resp = await Client.DeleteAsync($"/api/cost-ledger/categories/{catId}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        using (var conn = new SqliteConnection(ConnectionString))
        {
            Assert.Equal(0L, conn.ExecuteScalar<long>("SELECT COUNT(*) FROM cost_ledger_categories WHERE id=@Id", new { Id = catId }));
        }
    }

    // ══════════ 钉住 ×1：accountant reset → 403（钉 reset 既有 settings:update 门，本轮不动）══════════

    [Fact]
    public async Task Pin1_AccountantReset_Returns403()
    {
        SeedAccountant();
        SetAuth(await LoginAsync(AccUsername));

        var resp = await Client.PostAsync("/api/cost-ledger/categories/reset", null);
        // reset 本已 settings:update 门 → accountant 403（先红阶段也必须绿）
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }
}
