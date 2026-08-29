using Dapper;
using EngineeringManager.Api.Migrations;
using Microsoft.Data.Sqlite;
using Xunit;

namespace EngineeringManager.Tests.Migrations;

/// <summary>
/// 045：audit_logs 列名对齐（resource_type -> resource）迁移测试
///
/// 背景：两代 schema 漂移——权威建表（Program.cs）与全部代码用 resource；
/// 老升级库列是 resource_type，导致审计写入静默失败、报告中心/审计统计报错。
///
/// 覆盖：
///   · 老库态（resource_type 列）→ 跑 045 → 列名变 resource，历史数据保留
///   · 新库态（resource 列已存在）→ 跑 045 → 良性吞掉，无任何副作用
/// </summary>
public class AlignAuditLogsSchemaMigrationTests : IDisposable
{
    private readonly string _dbPath;
    private readonly string _connStr;

    public AlignAuditLogsSchemaMigrationTests()
    {
        _dbPath = Path.Combine(Path.GetTempPath(), $"al-045-{Guid.NewGuid()}.db");
        _connStr = $"Data Source={_dbPath};Pooling=False";
    }

    public void Dispose()
    {
        if (File.Exists(_dbPath)) File.Delete(_dbPath);
    }

    private void ExecuteSql(string sql)
    {
        using var conn = new SqliteConnection(_connStr);
        conn.Open();
        foreach (var stmt in sql.Split(';', StringSplitOptions.RemoveEmptyEntries).Select(s => s.Trim()).Where(s => s.Length > 0))
            conn.Execute(stmt);
    }

    /// <summary>独立执行 045（剥注释 + 按 ; 切分；no such column 幂等吞掉，与 MigrationRunner 同语义）</summary>
    private void Apply045()
    {
        var asm = typeof(MigrationRunner).Assembly;
        var name = asm.GetManifestResourceNames().First(n => n.EndsWith("045_AlignAuditLogsSchema.sql"));
        using var stream = asm.GetManifestResourceStream(name)!;
        using var reader = new StreamReader(stream);
        var sql = reader.ReadToEnd();
        var noComments = string.Join("\n", sql.Split('\n').Where(l => !l.TrimStart().StartsWith("--")));
        using var conn = new SqliteConnection(_connStr);
        conn.Open();
        foreach (var stmt in noComments.Split(';', StringSplitOptions.RemoveEmptyEntries).Select(s => s.Trim()).Where(s => s.Length > 0))
        {
            try
            {
                conn.Execute(stmt);
            }
            catch (Microsoft.Data.Sqlite.SqliteException ex)
            {
                // 与 MigrationRunner.IsBenignAlterError（含 no such column）一致
                var benign = ex.SqliteErrorCode == 1 && (
                    ex.Message.Contains("duplicate column name", StringComparison.OrdinalIgnoreCase) ||
                    ex.Message.Contains("already exists", StringComparison.OrdinalIgnoreCase) ||
                    ex.Message.Contains("no such column", StringComparison.OrdinalIgnoreCase));
                if (!benign) throw;
            }
        }
    }

    private static List<string> GetColumns(SqliteConnection conn) =>
        conn.Query<string>("SELECT name FROM pragma_table_info('audit_logs') ORDER BY name").ToList();

    [Fact]
    public void Apply045_LegacyDb_RenamesColumnAndKeepsData()
    {
        using (var conn = new SqliteConnection(_connStr))
        {
            conn.Open();
            // 老库态：resource_type 列 + 一条历史审计
            conn.Execute(@"CREATE TABLE audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT, resource_type TEXT, resource_id TEXT, details TEXT, created_at TEXT)");
            conn.Execute("INSERT INTO audit_logs (action, resource_type, resource_id, details, created_at) VALUES ('login', 'auth', '1', 'seed', '2026-08-01 00:00:00')");
        }

        Apply045();

        using var conn2 = new SqliteConnection(_connStr);
        conn2.Open();
        var cols = GetColumns(conn2);
        Assert.Contains("resource", cols);
        Assert.DoesNotContain("resource_type", cols);

        // 历史数据保留且新列名可查（报告中心/审计统计的查询形态）
        var row = conn2.QuerySingleOrDefault<(long id, string action, string resource)>(
            "SELECT id, action, resource FROM audit_logs WHERE resource = 'auth'");
        Assert.Equal("login", row.action);
        Assert.Equal(1, row.id);
    }

    [Fact]
    public void Apply045_ModernDb_IsNoOp()
    {
        using (var conn = new SqliteConnection(_connStr))
        {
            conn.Open();
            // 新库态：权威 schema（resource 列已存在，无 resource_type）
            conn.Execute(@"CREATE TABLE audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT, resource TEXT, resource_id TEXT, details TEXT, created_at TEXT)");
            conn.Execute("INSERT INTO audit_logs (action, resource, resource_id, details, created_at) VALUES ('login', 'auth', '1', 'seed', '2026-08-01 00:00:00')");
        }

        Apply045();  // RENAME 报 no such column → 良性吞掉

        using var conn3 = new SqliteConnection(_connStr);
        conn3.Open();
        var cols = GetColumns(conn3);
        Assert.Contains("resource", cols);
        // 数据原样
        var count = conn3.ExecuteScalar<long>("SELECT COUNT(*) FROM audit_logs WHERE resource = 'auth'");
        Assert.Equal(1, count);
    }
}
