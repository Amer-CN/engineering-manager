using System.Text.Json;
using Dapper;
using EngineeringManager.Api.Migrations;
using Microsoft.Data.Sqlite;
using Xunit;

namespace EngineeringManager.Tests.Migrations;

/// <summary>
/// 044：reports:read/create 权限码追加到 roles.permissions 迁移测试
///
/// 背景：报告中心（265e976）上线时漏了权限迁移，老库 admin 角色没有
/// reports 码 → 前端 RequirePermission 拦截「报告中心」。
///
/// 覆盖：
///   · 老库态（roles 无 reports 码）→ 跑 044 → admin/manager/accountant 各得两码
///   · 只追加不覆盖：既有权限原样保留、顺序不变
///   · worker 不追加（与代码默认值一致）
///   · 幂等：连跑两次 JSON 不重复
/// </summary>
public class AppendReportsPermissionsMigrationTests : IDisposable
{
    private readonly string _dbPath;
    private readonly string _connStr;

    public AppendReportsPermissionsMigrationTests()
    {
        _dbPath = Path.Combine(Path.GetTempPath(), $"rp-044-{Guid.NewGuid()}.db");
        _connStr = $"Data Source={_dbPath};Pooling=False";
    }

    public void Dispose()
    {
        if (File.Exists(_dbPath)) File.Delete(_dbPath);
    }

    /// <summary>建老库态 roles 表（无 reports 码，模拟真实老库）</summary>
    private void SeedLegacyRoles()
    {
        using var conn = new SqliteConnection(_connStr);
        conn.Open();
        var json = (string codes) => System.Text.Json.JsonSerializer.Serialize(codes.Split(','));
        conn.Execute(
            "CREATE TABLE roles (id TEXT PRIMARY KEY, name TEXT, permissions TEXT);" +
            "INSERT INTO roles (id, name, permissions) VALUES" +
            "(@Admin,'管理员',@P1),(@Manager,'项目经理',@P2),(@Accountant,'财务人员',@P3),(@Worker,'普通员工',@P4);",
            new
            {
                Admin = "admin", Manager = "manager", Accountant = "accountant", Worker = "worker",
                P1 = json("dashboard:read,users:read,writing:read"),
                P2 = json("dashboard:read,projects:read"),
                P3 = json("dashboard:read,invoices:read"),
                P4 = json("dashboard:read"),
            });
    }

    /// <summary>独立执行 044 脚本（剥注释 + 按 ; 切分，与 MigrationRunner 同语义）</summary>
    private void Apply044()
    {
        var asm = typeof(MigrationRunner).Assembly;
        var name = asm.GetManifestResourceNames()
            .First(n => n.EndsWith("044_AppendReportsPermissions.sql"));
        using var stream = asm.GetManifestResourceStream(name)!;
        using var reader = new StreamReader(stream);
        var sql = reader.ReadToEnd();
        var noComments = string.Join("\n", sql.Split('\n')
            .Where(l => !l.TrimStart().StartsWith("--")));
        using var conn = new SqliteConnection(_connStr);
        conn.Open();
        using var tx = conn.BeginTransaction();
        var stmts = noComments.Split(';', StringSplitOptions.RemoveEmptyEntries)
            .Select(s => s.Trim())
            .Where(s => s.Length > 0);
        foreach (var stmt in stmts)
        {
            conn.Execute(stmt, transaction: tx);
        }
        tx.Commit();
    }

    private static List<string> GetPermissions(SqliteConnection conn, string roleId)
    {
        var json = conn.QuerySingleOrDefault<string>(
            "SELECT permissions FROM roles WHERE id = @Id", new { Id = roleId });
        return json == null ? new List<string>() : JsonSerializer.Deserialize<List<string>>(json)!;
    }

    [Fact]
    public void Apply044_AppendsReportsCodesToAdminManagerAccountant()
    {
        SeedLegacyRoles();
        Apply044();

        using var conn = new SqliteConnection(_connStr);
        conn.Open();

        foreach (var roleId in new[] { "admin", "manager", "accountant" })
        {
            var perms = GetPermissions(conn, roleId);
            Assert.Contains("reports:read", perms);
            Assert.Contains("reports:create", perms);
            // 只追加不覆盖：既有码原样保留
            Assert.Contains("dashboard:read", perms);
        }

        // admin 既有码在前，追加码在后
        var adminPerms = GetPermissions(conn, "admin");
        Assert.Equal(0, adminPerms.IndexOf("dashboard:read"));
        Assert.True(adminPerms.IndexOf("writing:read") < adminPerms.IndexOf("reports:read"));
    }

    [Fact]
    public void Apply044_DoesNotTouchWorker()
    {
        SeedLegacyRoles();
        Apply044();

        using var conn = new SqliteConnection(_connStr);
        conn.Open();

        var workerPerms = GetPermissions(conn, "worker");
        Assert.DoesNotContain(workerPerms, p => p.StartsWith("reports:"));
        Assert.Equal(new List<string> { "dashboard:read" }, workerPerms);
    }

    [Fact]
    public void Apply044_IsIdempotent()
    {
        SeedLegacyRoles();
        Apply044();
        Apply044();  // 第二次应全部无操作

        using var conn = new SqliteConnection(_connStr);
        conn.Open();

        var adminPerms = GetPermissions(conn, "admin");
        Assert.Single(adminPerms, p => p == "reports:read");
        Assert.Single(adminPerms, p => p == "reports:create");
        Assert.Equal(5, adminPerms.Count);  // 3 旧码 + 2 新码，无重复
    }

    [Fact]
    public void Apply044_EmptyPermissions_FallsBackToReportsOnly()
    {
        using var conn = new SqliteConnection(_connStr);
        conn.Open();
        conn.Execute(@"
            CREATE TABLE roles (id TEXT PRIMARY KEY, name TEXT, permissions TEXT);
            INSERT INTO roles (id, name, permissions) VALUES ('admin', '管理员', '[]');
        ");

        Apply044();

        conn.Open();
        var perms = GetPermissions(conn, "admin");
        Assert.Equal(new List<string> { "reports:read", "reports:create" }, perms);
    }
}
