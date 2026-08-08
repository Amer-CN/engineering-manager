using Dapper;
using EngineeringManager.Api.Migrations;
using Microsoft.Data.Sqlite;
using Xunit;

namespace EngineeringManager.Tests.Migrations;

/// <summary>
/// M4 终审合并阻断项：041 knowledge/voice 权限码追加迁移测试
///
/// 覆盖：
///   · 老快照库态（admin/manager 权限为 037 时代 JSON，缺四码）→ 跑 041 →
///     四码齐（voice:read + knowledge:create/update/delete），既有码不重复
///   · 旧格式不碰：permissions 为非 JSON 快照（如 'all' / 'project:read'）→ 041 无操作
///   · 幂等：连跑两次不报错不重复
///   · accountant/worker 不追加（无 knowledge:read 授予集合）
/// </summary>
public class AppendKnowledgeVoiceCodesMigrationTests : IDisposable
{
    private readonly string _dbPath;
    private readonly string _connStr;

    public AppendKnowledgeVoiceCodesMigrationTests()
    {
        _dbPath = Path.Combine(Path.GetTempPath(), $"kv-041-{Guid.NewGuid()}.db");
        _connStr = $"Data Source={_dbPath};Pooling=False";
    }

    public void Dispose()
    {
        if (File.Exists(_dbPath)) File.Delete(_dbPath);
    }

    /// <summary>独立执行 041 脚本（剥注释 + 按 ; 切分 + 良性错误吞掉）。</summary>
    private void Apply041()
    {
        var asm = typeof(MigrationRunner).Assembly;
        var name = asm.GetManifestResourceNames()
            .First(n => n.EndsWith("041_AppendKnowledgeVoiceCodes.sql"));
        using var stream = asm.GetManifestResourceStream(name)!;
        using var reader = new StreamReader(stream);
        var sql = reader.ReadToEnd();
        var noComments = string.Join("\n", sql.Split('\n')
            .Where(l => !l.TrimStart().StartsWith("--")));
        using var conn = new SqliteConnection(_connStr);
        conn.Open();
        using var tx = conn.BeginTransaction();
        foreach (var stmt in noComments.Split(';', StringSplitOptions.RemoveEmptyEntries)
            .Select(s => s.Trim()).Where(s => s.Length > 0))
        {
            try { conn.Execute(stmt, transaction: tx); }
            catch (Microsoft.Data.Sqlite.SqliteException ex)
            {
                var benign = ex.SqliteErrorCode == 1 && (
                    ex.Message.Contains("duplicate column name", StringComparison.OrdinalIgnoreCase) ||
                    ex.Message.Contains("already exists", StringComparison.OrdinalIgnoreCase));
                if (!benign) throw;
            }
        }
        tx.Commit();
    }

    private static readonly string[] FOUR_CODES = ["voice:read", "knowledge:create", "knowledge:update", "knowledge:delete"];

    private void ApplyLegacySnapshot()
    {
        using var conn = new SqliteConnection(_connStr);
        conn.Open();
        conn.Execute(@"
            CREATE TABLE roles (
                id TEXT PRIMARY KEY, name TEXT NOT NULL, permissions TEXT, is_system INTEGER DEFAULT 0, created_at TEXT);
            INSERT INTO roles (id, name, permissions, is_system, created_at) VALUES
                ('admin', '管理员', '[""dashboard:read"",""knowledge:read""]', 1, datetime('now')),
                ('manager', '项目经理', '[""projects:read"",""knowledge:read""]', 1, datetime('now')),
                ('accountant', '财务', '[""dashboard:read""]', 1, datetime('now')),
                ('worker', '工人', '[""dashboard:read""]', 1, datetime('now'));");
    }

    [Fact]
    public void LegacySnapshot_AdminManager_GainAllFourCodes_ExistingKept()
    {
        ApplyLegacySnapshot();
        Apply041();

        using var conn = new SqliteConnection(_connStr);
        conn.Open();
        var admin = conn.ExecuteScalar<string>("SELECT permissions FROM roles WHERE id='admin'");
        var manager = conn.ExecuteScalar<string>("SELECT permissions FROM roles WHERE id='manager'");

        // admin：四码齐 + 既有码保留
        foreach (var code in FOUR_CODES)
            Assert.Contains($"\"{code}\"", admin);
        Assert.Contains("\"knowledge:read\"", admin); // 既有码未被重置
        Assert.Contains("\"dashboard:read\"", admin);

        // manager 同样四码齐
        foreach (var code in FOUR_CODES)
            Assert.Contains($"\"{code}\"", manager);
        Assert.Contains("\"projects:read\"", manager);

        // accountant/worker 不追加
        var acc = conn.ExecuteScalar<string>("SELECT permissions FROM roles WHERE id='accountant'");
        var worker = conn.ExecuteScalar<string>("SELECT permissions FROM roles WHERE id='worker'");
        Assert.DoesNotContain("voice:read", acc);
        Assert.DoesNotContain("knowledge:create", worker);
    }

    [Fact]
    public void LegacyFormat_NonJsonPermissions_Untouched()
    {
        // 037 遗留旧格式：非 JSON 快照（'all' / 'project:read'）——041 守卫 LIKE '[%' 跳过
        using var conn = new SqliteConnection(_connStr);
        conn.Open();
        conn.Execute(@"
            CREATE TABLE roles (
                id TEXT PRIMARY KEY, name TEXT NOT NULL, permissions TEXT, is_system INTEGER DEFAULT 0, created_at TEXT);
            INSERT INTO roles (id, name, permissions, is_system, created_at) VALUES
                ('admin', '管理员', 'all', 1, datetime('now')),
                ('manager', '项目经理', 'project:read', 1, datetime('now'));");

        Apply041();

        using var conn2 = new SqliteConnection(_connStr);
        conn2.Open();
        Assert.Equal("all", conn2.ExecuteScalar<string>("SELECT permissions FROM roles WHERE id='admin'"));
        Assert.Equal("project:read", conn2.ExecuteScalar<string>("SELECT permissions FROM roles WHERE id='manager'"));
    }

    [Fact]
    public void Migration_Idempotent_RunTwiceNoErrorNoDuplicate()
    {
        ApplyLegacySnapshot();
        Apply041();
        Apply041();

        using var conn = new SqliteConnection(_connStr);
        conn.Open();
        // 码只出现一次（幂等：instr 判码已在 JSON 内则无操作）
        var admin = conn.ExecuteScalar<string>("SELECT permissions FROM roles WHERE id='admin'");
        foreach (var code in FOUR_CODES)
        {
            var count = System.Text.RegularExpressions.Regex.Matches(admin ?? "", System.Text.RegularExpressions.Regex.Escape($"\"{code}\"")).Count;
            Assert.Equal(1, count);
        }
    }
}
