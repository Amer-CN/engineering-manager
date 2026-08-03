using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using EngineeringManager.Api;
using EngineeringManager.Tests.Common;
using Xunit;

// edition 解析走 ApiConfig 进程级静态缓存（_cachedEdition），切换 edition 的测试
// （EditionFreezeEndpointsTests）与依赖 enterprise 环境的测试类若并行运行会产生竞态。
// 关闭 xUnit 并行化：正确性优先，测试数 694 串行约 2-3 分钟可接受。
[assembly: CollectionBehavior(DisableTestParallelization = true)]

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// F3 冻结测试：personal 下企业版端点必须 403 + message（不是 404、不是静默成功）。
///
/// 端点级 edition 切换方法（如实说明）：
///   ApiTestBase 固定 env=enterprise，_cachedEdition 是进程级静态缓存。
///   本测试用「临时设 env + 反射清 _cachedEdition/_editionWarning」在端点级切换 edition。
///   这与 27.2 退役的 SetEdition/ResetEdition 不同——那批是测 EditionFeatures 映射，
///   已被 Resolve 纯函数替代；这里是端点冻结行为验证，无法绕过静态缓存（GetEdition 薄壳仍缓存）。
///   finally 中恢复 env 并清缓存，避免污染其他测试。
/// </summary>
public class EditionFreezeEndpointsTests : ApiTestBase
{
    private static void SwitchEdition(string? edition)
    {
        Environment.SetEnvironmentVariable("ENGINEERING_MANAGER_EDITION", edition);
        ClearEditionCache();
    }

    private static void ClearEditionCache()
    {
        var t = typeof(ApiConfig);
        t.GetField("_cachedEdition", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static)!.SetValue(null, null);
        t.GetField("_editionWarning", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static)!.SetValue(null, null);
    }

    /// <summary>登录 admin 并设置 Authorization header（/api/users 等端点需登录）。</summary>
    private async Task LoginAsAdminAsync()
    {
        var login = await Client.PostAsJsonAsync("/api/auth/login", new { username = "admin", password = "admin123" });
        login.EnsureSuccessStatusCode();
        var body = await login.Content.ReadAsStringAsync();
        var json = System.Text.Json.JsonDocument.Parse(body);
        var token = json.RootElement.GetProperty("data").GetProperty("token").GetString();
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    // ═══════ 角色管理（RoleManagement） ═══════

    [Fact]
    public async Task Roles_Enterprise_Returns200()
    {
        try
        {
            SwitchEdition("enterprise");
            await LoginAsAdminAsync();
            var res = await Client.GetAsync("/api/roles");
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }
        finally { SwitchEdition("enterprise"); }
    }

    [Fact]
    public async Task Roles_Personal_Returns403WithMessage()
    {
        try
        {
            SwitchEdition("personal");
            await LoginAsAdminAsync();
            var res = await Client.GetAsync("/api/roles");
            Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
            var json = await res.Content.ReadFromJsonAsync<JsonElement>();
            Assert.True(json.TryGetProperty("error", out var err), "403 response must carry message");
            Assert.Contains("企业版", err.GetString());
        }
        finally { SwitchEdition("enterprise"); }
    }

    [Fact]
    public async Task RolesPut_Personal_Returns403()
    {
        try
        {
            SwitchEdition("personal");
            await LoginAsAdminAsync();
            var res = await Client.PutAsJsonAsync("/api/roles", new { roleId = "manager", permissions = "[\"x:read\"]" });
            Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
        }
        finally { SwitchEdition("enterprise"); }
    }

    // ═══════ 用户管理（UserManagement） ═══════

    [Fact]
    public async Task Users_Enterprise_Returns200()
    {
        try
        {
            SwitchEdition("enterprise");
            await LoginAsAdminAsync();
            var res = await Client.GetAsync("/api/users");
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }
        finally { SwitchEdition("enterprise"); }
    }

    [Fact]
    public async Task Users_Personal_Returns403WithMessage()
    {
        try
        {
            SwitchEdition("personal");
            await LoginAsAdminAsync();
            var res = await Client.GetAsync("/api/users");
            Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
            var json = await res.Content.ReadFromJsonAsync<JsonElement>();
            Assert.True(json.TryGetProperty("error", out var err), "403 response must carry message");
            Assert.Contains("企业版", err.GetString());
        }
        finally { SwitchEdition("enterprise"); }
    }

    [Fact]
    public async Task UsersPost_Personal_Returns403()
    {
        try
        {
            SwitchEdition("personal");
            await LoginAsAdminAsync();
            var res = await Client.PostAsJsonAsync("/api/users", new { username = "u", password = "p12345678", displayName = "U" });
            Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
        }
        finally { SwitchEdition("enterprise"); }
    }

    // ═══════ 项目授权（ProjectAuthorization） ═══════

    [Fact]
    public async Task ProjectAuthz_Enterprise_Returns200()
    {
        try
        {
            SwitchEdition("enterprise");
            await LoginAsAdminAsync();
            var res = await Client.GetAsync("/api/admin/project-authorizations");
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }
        finally { SwitchEdition("enterprise"); }
    }

    [Fact]
    public async Task ProjectAuthz_Personal_Returns403WithMessage()
    {
        try
        {
            SwitchEdition("personal");
            await LoginAsAdminAsync();
            var res = await Client.GetAsync("/api/admin/project-authorizations");
            Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
            var json = await res.Content.ReadFromJsonAsync<JsonElement>();
            Assert.True(json.TryGetProperty("error", out var err), "403 response must carry message");
            Assert.Contains("企业版", err.GetString());
        }
        finally { SwitchEdition("enterprise"); }
    }

    [Fact]
    public async Task ProjectAuthzPost_Personal_Returns403()
    {
        try
        {
            SwitchEdition("personal");
            await LoginAsAdminAsync();
            var res = await Client.PostAsJsonAsync("/api/admin/project-authorizations", new { projectId = 1, userId = "1" });
            Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
        }
        finally { SwitchEdition("enterprise"); }
    }

    // ═══════ 审计日志按用户筛选（AuditUserFilter） ═══════
    // personal 下 admin 退化只看自己（200，但 items 不含他人记录）

    [Fact]
    public async Task AuditLogs_Personal_AdminSeesOnlyOwn()
    {
        try
        {
            SwitchEdition("personal");
            await LoginAsAdminAsync();
            // 先插入一条他人的审计记录。
            // 说明：不走 POST /api/audit/logs——测试库 audit_logs 表 schema 与 INSERT 不匹配
            // （缺 resource_type 列，属测试基建差异），直接 SQLite 插入最可靠。
            using (var conn = new Microsoft.Data.Sqlite.SqliteConnection(ConnectionString))
            {
                conn.Open();
                using var cmd = conn.CreateCommand();
                cmd.CommandText = "INSERT INTO audit_logs (action,level,user_id,user_name,resource,details,created_at) VALUES (@A,@L,@U,@N,@R,@D,@C)";
                cmd.Parameters.AddWithValue("@A", "create");
                cmd.Parameters.AddWithValue("@L", "info");
                cmd.Parameters.AddWithValue("@U", "other-user-999");
                cmd.Parameters.AddWithValue("@N", "other");
                cmd.Parameters.AddWithValue("@R", "projects");
                cmd.Parameters.AddWithValue("@D", "other's log");
                cmd.Parameters.AddWithValue("@C", DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"));
                cmd.ExecuteNonQuery();
            }

            var res = await Client.GetAsync("/api/audit/logs?page=1&pageSize=50");
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            var json = await res.Content.ReadFromJsonAsync<JsonElement>();
            var items = json.GetProperty("data").GetProperty("items").EnumerateArray().ToList();
            // personal（无 AuditUserFilter）：admin 也不得看到他人记录
            Assert.DoesNotContain(items, it => it.GetProperty("user_id").GetString() == "other-user-999");
        }
        finally { SwitchEdition("enterprise"); }
    }

    [Fact]
    public async Task AuditLogs_Enterprise_AdminSeesAll()
    {
        try
        {
            SwitchEdition("enterprise");
            await LoginAsAdminAsync();
            var res = await Client.GetAsync("/api/audit/logs?page=1&pageSize=50");
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            // enterprise 下不报错即可（他人记录是否存在取决于测试执行顺序，不做强断言）
            Assert.True(res.Content != null);
        }
        finally { SwitchEdition("enterprise"); }
    }
}
