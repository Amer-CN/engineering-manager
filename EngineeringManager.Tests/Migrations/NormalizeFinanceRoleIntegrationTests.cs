using System.Data;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Dapper;
using EngineeringManager.Api.Migrations;
using Microsoft.AspNetCore.Builder;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace EngineeringManager.Tests.Migrations;

/// <summary>
/// 窗口 H-1（P1）集成测试：038 finance → accountant 归一后，被重映射的
/// 「财务用户」登录调 G2 已执行端点（POST /api/wages 空载荷）不再是
/// fail-closed 403（预期 400/401 外的非 403）。
///
/// 过程：构造 pre-038 老库（001 种子 finance 行 + role_id='finance' 用户）
///   → 应用 038 → 用 ApiConfig 启动真实 API 宿主（IDbConnection 指向该库）
///   → 该用户登录（038 已把 role_id 重映射为 accountant）→ POST /api/wages
///   空载荷 → 断言非 403。
///
/// M-FIX8 T5(b) W4 订正（交叉引用 docs/findings/ROLE-IDENTITY-DEFECTS.md）：
/// 本测试的 pre-038 老库 seed（见 BuildPre038DbAndApply038）给 manager 的 name
/// 逐字是「项目经理」（001 种子形态，第 1 层证据），而 CurrentUser.cs:132
/// HasPermission 中文映射只认「经理」（第 2 层）——两层不一致导致 manager
/// 登录后 HasPermission 恒 false（role id='项目经理' 查 roles 无行 → 全权限码
/// 403）。038 只修 finance→accountant，不碰 manager name，故经理在修复前
/// 「全瘫」（003-004 层）。生产【应有】状态由 042 迁移把 manager name 改「经理」
/// （对齐映射），本测试不重复构造该场景，仅保留 finance 归一主路径 + 交叉引用。
/// </summary>
public class NormalizeFinanceRoleIntegrationTests : IDisposable
{
    private readonly string _dbPath;
    private readonly string _connStr;
    private readonly WebApplication _app;
    private readonly HttpClient _client;

    public NormalizeFinanceRoleIntegrationTests()
    {
        _dbPath = Path.Combine(Path.GetTempPath(), $"norm-finance-it-{Guid.NewGuid()}.db");
        _connStr = $"Data Source={_dbPath};Pooling=False";

        BuildPre038DbAndApply038();

        Environment.SetEnvironmentVariable("DISABLE_RATELIMIT", "1");
        Environment.SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Development");
        Environment.SetEnvironmentVariable("ENGINEERING_MANAGER_EDITION", "enterprise");

        var builder = WebApplication.CreateBuilder();
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        ApiConfig.ConfigureServices(builder);

        // IDbConnection 指向本测试库（覆盖 ApiConfig 的默认数据路径工厂）
        builder.Services.AddScoped<IDbConnection>(_ =>
        {
            var conn = new SqliteConnection(_connStr);
            conn.Open();
            return conn;
        });

        _app = builder.Build();
        ApiConfig.ConfigureApp(_app);
        _app.UseDeveloperExceptionPage();
        _app.Start();

        var port = _app.Urls.First().Split(':').Last();
        _client = new HttpClient { BaseAddress = new Uri($"http://localhost:{port}") };
    }

    public void Dispose()
    {
        _client.Dispose();
        _app.StopAsync().GetAwaiter().GetResult();
        if (File.Exists(_dbPath)) File.Delete(_dbPath);
    }

    /// <summary>构造 pre-038 库态：001 种子 finance 行 + role_id='finance' 的财务用户
    /// （带密码哈希，可登录）→ 应用 038（accountant 归一）。</summary>
    private void BuildPre038DbAndApply038()
    {
        using var conn = new SqliteConnection(_connStr);
        conn.Open();

        // roles / users 最小表结构（001 形态 + 登录端点读取的 is_default_password）
        conn.Execute(@"CREATE TABLE roles (
                id TEXT PRIMARY KEY, name TEXT NOT NULL, permissions TEXT,
                is_system INTEGER DEFAULT 0, created_at TEXT);
            CREATE TABLE users (
                id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT,
                password_hash TEXT, password_salt TEXT, password_hash_version INTEGER DEFAULT 1,
                salt TEXT, display_name TEXT, role_id TEXT, status TEXT DEFAULT 'active',
                avatar TEXT, created_at TEXT, updated_at TEXT,
                is_default_password INTEGER DEFAULT 0);");

        // 001 种子角色（finance 在列，无 accountant）
        conn.Execute(@"INSERT OR IGNORE INTO roles (id, name, permissions, is_system, created_at) VALUES
                ('admin', '管理员', 'all', 1, datetime('now')),
                ('manager', '项目经理', 'project:read,project:write,wage:read,wage:write', 1, datetime('now')),
                ('finance', '财务', 'invoice:read,invoice:write,settlement:read,settlement:write', 1, datetime('now')),
                ('worker', '工人', 'attendance:read,wage:read', 1, datetime('now'));");

        // 财务用户（role_id='finance'，登录凭据 finacc / finacc123）
        var salt = "it-fin-salt-123456789012";
        var hash = EngineeringManager.Api.Common.HashPassword("finacc123", salt, 2);
        conn.Execute(@"INSERT INTO users (id, username, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES ('u-fin', 'finacc', @Hash, @Salt, 2, '财务用户', 'finance', 'active', '2026-01-01 00:00:00')",
            new { Hash = hash, Salt = salt });

        // 应用 038（从嵌入资源读，与 MigrationRunner 同源）
        var asm = typeof(MigrationRunner).Assembly;
        var name = asm.GetManifestResourceNames().First(n => n.EndsWith("038_NormalizeFinanceRole.sql"));
        using var stream = asm.GetManifestResourceStream(name)!;
        using var reader = new StreamReader(stream);
        var sql = reader.ReadToEnd();
        var noComments = string.Join("\n", sql.Split('\n').Where(l => !l.TrimStart().StartsWith("--")));
        using var tx = conn.BeginTransaction();
        foreach (var stmt in noComments.Split(';', StringSplitOptions.RemoveEmptyEntries).Select(s => s.Trim()).Where(s => s.Length > 0))
        {
            try
            {
                conn.Execute(stmt, transaction: tx);
            }
            catch (Microsoft.Data.Sqlite.SqliteException ex)
            {
                // 与 MigrationRunner.ExecuteScriptIdempotent 一致：良性错误幂等跳过
                var benign = ex.SqliteErrorCode == 1 && (
                    ex.Message.Contains("duplicate column name", StringComparison.OrdinalIgnoreCase) ||
                    ex.Message.Contains("already exists", StringComparison.OrdinalIgnoreCase));
                if (!benign) throw;
            }
        }
        tx.Commit();
    }

    [Fact]
    public async Task RemappedFinanceUser_PostWages_NotForbidden()
    {
        // 登录（038 已把 role_id finance → accountant；JWT role claim = role_id = accountant）
        var loginResp = await _client.PostAsJsonAsync("/api/auth/login", new { username = "finacc", password = "finacc123" });
        Assert.True(loginResp.IsSuccessStatusCode, $"login 失败: {(int)loginResp.StatusCode}");
        var loginJson = await loginResp.Content.ReadFromJsonAsync<JsonElement>();
        var token = loginJson.GetProperty("data").GetProperty("token").GetString()!;

        // 调 G2 已执行端点：POST /api/wages 空载荷
        //   admin 角色 → 200；accountant（有 wages:create）→ 400（缺字段）
        //   worker / 无 wages:create 码 → 403 fail-closed
        var req = new HttpRequestMessage(HttpMethod.Post, "/api/wages")
        {
            Content = JsonContent.Create(new { })
        };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var resp = await _client.SendAsync(req);

        // 核心断言：不再是 403 fail-closed
        Assert.NotEqual(HttpStatusCode.Forbidden, resp.StatusCode);
        // 语义预期：accountant 有 wages:create → 过权限门禁 → 因空载荷缺字段 → 400
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }
}
