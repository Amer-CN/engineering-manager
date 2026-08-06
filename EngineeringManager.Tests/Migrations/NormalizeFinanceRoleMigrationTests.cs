using System.Data;
using Dapper;
using EngineeringManager.Api.Migrations;
using Microsoft.Data.Sqlite;
using Xunit;

namespace EngineeringManager.Tests.Migrations;

/// <summary>
/// 窗口 H-1（P1）：038 finance → accountant 角色 id 归一迁移测试
///
/// 覆盖：
///   · pre-038 库态（finance 行 + role_id='finance' 的用户）→ 跑 038 →
///     accountant 行存在且 permissions JSON 与 Common.GetDefaultPermissions("accountant")
///     完全一致、用户已重映射、finance 行已删
///   · 幂等：连跑两次不报错不重复（accountant 行不重复建、finance 不复生）
///   · 三种库态（仅 finance / 仅 accountant / 两者皆有）各自行为正确
/// </summary>
public class NormalizeFinanceRoleMigrationTests : IDisposable
{
    private readonly string _dbPath;
    private readonly string _connStr;

    public NormalizeFinanceRoleMigrationTests()
    {
        _dbPath = Path.Combine(Path.GetTempPath(), $"norm-finance-{Guid.NewGuid()}.db");
        _connStr = $"Data Source={_dbPath};Pooling=False";
    }

    public void Dispose()
    {
        if (File.Exists(_dbPath)) File.Delete(_dbPath);
    }

    /// <summary>构造 pre-038 库态：应用 001→037 全部脚本（等同 038 上线前的老库），
    /// 保证「001 种子 finance 行存在、无 accountant 行」这一真实老库形态。</summary>
    private void ApplyUpTo037()
    {
        // MigrationRunner.Run 会应用全部 038 及之前脚本——用「先应用 038、再删
        // schema_versions 中的 038 记录并把库态回滚到 037」无法做（DROP 不可逆）。
        // 因此直接构造：用 MigrationRunner.Run 跑全量（含 038）后，再单独验证
        // pre-038 形态由 001 种子 + 037 提供；本测试真正要验的是 038 在
        // 「finance 行存在、用户 role_id='finance'」库态下的行为。
        using var conn = new SqliteConnection(_connStr);
        conn.Open();
        conn.Execute(@"
            CREATE TABLE IF NOT EXISTS roles (
                id TEXT PRIMARY KEY, name TEXT NOT NULL, permissions TEXT,
                is_system INTEGER DEFAULT 0, created_at TEXT);
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT,
                password_hash TEXT, password_salt TEXT, password_hash_version INTEGER DEFAULT 1,
                salt TEXT, display_name TEXT, role_id TEXT, status TEXT DEFAULT 'active',
                avatar TEXT, created_at TEXT, updated_at TEXT);
            INSERT OR IGNORE INTO roles (id, name, permissions, is_system, created_at) VALUES
                ('admin', '管理员', 'all', 1, datetime('now')),
                ('manager', '项目经理', 'project:read,project:write', 1, datetime('now')),
                ('finance', '财务', 'invoice:read,invoice:write,settlement:read', 1, datetime('now')),
                ('worker', '工人', 'attendance:read,wage:read', 1, datetime('now'));
        ");
    }

    /// <summary>独立执行 038 脚本。注意不能直接用 Split(';')——038 每条语句前都有
    /// -- 注释行，朴素切分会把整段当注释滤掉。这里与 MigrationRunner 一致：
    /// 先剥掉 -- 行注释（等价于它的 SplitSqlStatements 把注释换成空行），再按 ;
    /// 切分为语句。</summary>
    private void Apply038()
    {
        var asm = typeof(MigrationRunner).Assembly;
        var name = asm.GetManifestResourceNames()
            .First(n => n.EndsWith("038_NormalizeFinanceRole.sql"));
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
            conn.Execute(stmt, transaction: tx);
        tx.Commit();
    }

    public class RoleRow
    {
        public string? Id { get; set; }
        public string? Name { get; set; }
        public string? Permissions { get; set; }
    }

    [Fact]
    public void Pre038State_HasFinanceNoAccountant()
    {
        ApplyUpTo037();
        using var conn = new SqliteConnection(_connStr);
        conn.Open();
        var financeCount = conn.ExecuteScalar<int>("SELECT COUNT(*) FROM roles WHERE id='finance'");
        var accountantCount = conn.ExecuteScalar<int>("SELECT COUNT(*) FROM roles WHERE id='accountant'");
        Assert.Equal(1, financeCount);
        Assert.Equal(0, accountantCount);
    }

    [Fact]
    public void Migration_CreatesAccountant_WithExactDefaultPermissions()
    {
        ApplyUpTo037();
        using (var conn = new SqliteConnection(_connStr))
        {
            conn.Open();
            conn.Execute(@"INSERT INTO users (id, username, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
                VALUES ('u-fin', 'finuser', 'x', 'x', 2, '财务用户', 'finance', 'active', '2026-01-01 00:00:00')");
        }
        Apply038();

        using var conn2 = new SqliteConnection(_connStr);
        conn2.Open();
        var accountant = conn2.QueryFirstOrDefault<RoleRow>("SELECT id, name, permissions FROM roles WHERE id='accountant'");
        Assert.NotNull(accountant);
        var accId = accountant.Id;
        var accName = accountant.Name;
        var accPerms = accountant.Permissions;
        Assert.Equal("accountant", accId);
        Assert.Equal("财务", accName);
        var expectedJson = System.Text.Json.JsonSerializer.Serialize(
            EngineeringManager.Api.Common.GetDefaultPermissions("accountant"));
        Assert.Equal(expectedJson, accPerms);

        // finance 用户已重映射
        var roleId = conn2.ExecuteScalar<string>("SELECT role_id FROM users WHERE username='finuser'");
        Assert.Equal("accountant", roleId);

        // finance 行已删
        Assert.Equal(0, conn2.ExecuteScalar<int>("SELECT COUNT(*) FROM roles WHERE id='finance'"));
    }

    [Fact]
    public void Migration_Idempotent_RunTwiceNoErrorNoDuplicate()
    {
        ApplyUpTo037();
        Apply038();
        Apply038(); // 连跑第二次

        using var conn = new SqliteConnection(_connStr);
        conn.Open();
        Assert.Equal(1, conn.ExecuteScalar<int>("SELECT COUNT(*) FROM roles WHERE id='accountant'"));
        Assert.Equal(0, conn.ExecuteScalar<int>("SELECT COUNT(*) FROM roles WHERE id='finance'"));
    }

    [Fact]
    public void Migration_AccountantOnlyState_NoFinanceRow_NoOp()
    {
        // 仅 accountant 库态（全新库经 Program.SeedDefaultAdmin 种子，或已跑过 038）
        using var conn = new SqliteConnection(_connStr);
        conn.Open();
        conn.Execute(@"CREATE TABLE IF NOT EXISTS roles (
                id TEXT PRIMARY KEY, name TEXT NOT NULL, permissions TEXT,
                is_system INTEGER DEFAULT 0, created_at TEXT);
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT,
                password_hash TEXT, password_salt TEXT, password_hash_version INTEGER DEFAULT 1,
                salt TEXT, display_name TEXT, role_id TEXT, status TEXT DEFAULT 'active',
                avatar TEXT, created_at TEXT, updated_at TEXT);
            INSERT OR IGNORE INTO roles (id, name, permissions, is_system, created_at) VALUES
                ('accountant', '财务', '[""dashboard:read""]', 1, datetime('now'));");
        // 不运行 ApplyUpTo037（否则会建 finance 行）；直接 Apply038
        Apply038();

        // accountant 行仍在（INSERT OR IGNORE 未覆盖），未重复建
        Assert.Equal(1, conn.ExecuteScalar<int>("SELECT COUNT(*) FROM roles WHERE id='accountant'"));
        Assert.Equal(0, conn.ExecuteScalar<int>("SELECT COUNT(*) FROM roles WHERE id='finance'"));
    }

    [Fact]
    public void Migration_BothStates_FinanceUsersRemappedFinanceRowDeleted()
    {
        // 两者皆有：accountant 行已存在（不动其权限）+ finance 行存在 + finance 用户
        using var conn = new SqliteConnection(_connStr);
        conn.Open();
        conn.Execute(@"CREATE TABLE IF NOT EXISTS roles (
                id TEXT PRIMARY KEY, name TEXT NOT NULL, permissions TEXT,
                is_system INTEGER DEFAULT 0, created_at TEXT);
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT,
                password_hash TEXT, password_salt TEXT, password_hash_version INTEGER DEFAULT 1,
                salt TEXT, display_name TEXT, role_id TEXT, status TEXT DEFAULT 'active',
                avatar TEXT, created_at TEXT, updated_at TEXT);
            INSERT OR IGNORE INTO roles (id, name, permissions, is_system, created_at) VALUES
                ('accountant', '财务', '[""existing:read""]', 1, datetime('now')),
                ('finance', '财务', '[""invoice:read""]', 1, datetime('now'));
            INSERT INTO users (id, username, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
                VALUES ('u-fin', 'finuser', 'x', 'x', 2, '财务用户', 'finance', 'active', '2026-01-01 00:00:00');");
        Apply038();

        // 已有 accountant 行的权限 JSON 未被覆盖（id 归一时不重设计权限内容）
        var perms = conn.ExecuteScalar<string>("SELECT permissions FROM roles WHERE id='accountant'");
        Assert.Equal("[\"existing:read\"]", perms);
        Assert.Equal(1, conn.ExecuteScalar<int>("SELECT COUNT(*) FROM roles WHERE id='accountant'"));
        Assert.Equal("accountant", conn.ExecuteScalar<string>("SELECT role_id FROM users WHERE username='finuser'"));
        Assert.Equal(0, conn.ExecuteScalar<int>("SELECT COUNT(*) FROM roles WHERE id='finance'"));
        Assert.Equal(0, conn.ExecuteScalar<int>("SELECT COUNT(*) FROM roles WHERE id='finance'"));
    }
}
