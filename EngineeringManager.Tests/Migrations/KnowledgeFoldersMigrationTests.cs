using Dapper;
using EngineeringManager.Api.Migrations;
using Microsoft.Data.Sqlite;
using Xunit;

namespace EngineeringManager.Tests.Migrations;

/// <summary>
/// M3/M4：039 知识库文件夹 + 040 文档软删列迁移测试
///
/// 覆盖：
///   · 全新库（MigrationRunner.Run 全量）→ knowledge_folders 表存在、含软删/项目列，
///     knowledge_documents 挂上 folder_id 与 deleted_at 列、三个索引存在
///   · pre-039 库态（knowledge_documents 无 folder_id、无 folders 表）→ 跑 039 →
///     表建好、列补上、历史文档 folder_id 为 NULL
///   · pre-040 库态（有 folder_id 无 deleted_at，即 039 已应用的老库）→ 跑 040 → 补列
///   · 幂等：连跑两次不报错不重复（ADD COLUMN 被 MigrationRunner 良性吞掉）
/// </summary>
public class KnowledgeFoldersMigrationTests : IDisposable
{
    private readonly string _dbPath;
    private readonly string _connStr;

    public KnowledgeFoldersMigrationTests()
    {
        _dbPath = Path.Combine(Path.GetTempPath(), $"kf-039-{Guid.NewGuid()}.db");
        _connStr = $"Data Source={_dbPath};Pooling=False";
    }

    public void Dispose()
    {
        if (File.Exists(_dbPath)) File.Delete(_dbPath);
    }

    /// <summary>独立执行 039 脚本（与 MigrationRunner 一致的剥注释 + 按 ; 切分 + 良性
    /// ALTER 错误吞掉——"duplicate column name"/"already exists" 幂等跳过）。</summary>
    private void Apply039()
    {
        var asm = typeof(MigrationRunner).Assembly;
        var name = asm.GetManifestResourceNames()
            .First(n => n.EndsWith("039_AddKnowledgeFolders.sql"));
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

    /// <summary>构造 pre-039 库态：029 时代的 knowledge_documents（无 folder_id、无 folders 表）。</summary>
    private void ApplyPre039State()
    {
        using var conn = new SqliteConnection(_connStr);
        conn.Open();
        conn.Execute(@"
            CREATE TABLE knowledge_documents (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                source_type TEXT NOT NULL,
                source_ref  TEXT,
                project_id  INTEGER,
                title       TEXT NOT NULL,
                full_text   TEXT NOT NULL,
                speakers    TEXT,
                occurred_at TEXT,
                created_at  TEXT NOT NULL,
                updated_at  TEXT NOT NULL,
                created_by  TEXT NOT NULL);
            INSERT INTO knowledge_documents
                (source_type, source_ref, project_id, title, full_text, created_at, updated_at, created_by)
            VALUES
                ('manual', NULL, NULL, '历史文档', '老库文档全文', '2026-01-01 00:00:00', '2026-01-01 00:00:00', 'u-1'),
                ('manual', NULL, 5, '项目文档', '项目库文档全文', '2026-01-02 00:00:00', '2026-01-02 00:00:00', 'u-1');
        ");
    }

    [Fact]
    public void FreshDatabase_HasFoldersTable_WithExpectedSchema()
    {
        MigrationRunner.Run(_connStr);

        using var conn = new SqliteConnection(_connStr);
        conn.Open();

        // knowledge_folders 表存在且含软删/项目/审计列
        var cols = conn.Query<string>("SELECT name FROM pragma_table_info('knowledge_folders')").ToList();
        Assert.Contains("id", cols);
        Assert.Contains("name", cols);
        Assert.Contains("english_name", cols);
        Assert.Contains("project_id", cols);
        Assert.Contains("category", cols);
        Assert.Contains("created_at", cols);
        Assert.Contains("updated_at", cols);
        Assert.Contains("created_by", cols);
        Assert.Contains("deleted_at", cols);   // 补强 ①：软删列

        // knowledge_documents 已挂 folder_id 与 deleted_at（039 + 040）
        var docCols = conn.Query<string>("SELECT name FROM pragma_table_info('knowledge_documents')").ToList();
        Assert.Contains("folder_id", docCols);
        Assert.Contains("deleted_at", docCols);

        // 三个索引存在
        var idxs = conn.Query<string>(
            "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_knowledge%'").ToList();
        Assert.Contains("idx_knowledge_folders_project", idxs);
        Assert.Contains("idx_knowledge_folders_deleted", idxs);
        Assert.Contains("idx_knowledge_documents_folder", idxs);
    }

    [Fact]
    public void Pre039State_MigrationCreatesTable_AddsColumn_KeepsExistingDocs()
    {
        ApplyPre039State();
        Apply039();

        using var conn = new SqliteConnection(_connStr);
        conn.Open();

        // 表建好
        var folderCount = conn.ExecuteScalar<int>(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='knowledge_folders'");
        Assert.Equal(1, folderCount);

        // 历史文档 folder_id 补列为 NULL（未被破坏）
        var rows = conn.Query<dynamic>("SELECT title, folder_id FROM knowledge_documents ORDER BY id").ToList();
        Assert.Equal(2, rows.Count);
        Assert.Null(rows[0].folder_id);
        Assert.Null(rows[1].folder_id);
        Assert.Equal("历史文档", (string)rows[0].title);
        Assert.Equal("项目文档", (string)rows[1].title);

        // 可插入文件夹行（迁移后表可用）
        conn.Execute(
            @"INSERT INTO knowledge_folders (name, project_id, created_at, updated_at, created_by)
              VALUES (@N, NULL, @Now, @Now, @U)",
            new { N = "跨项目通用资料", Now = "2026-08-07 00:00:00", U = "u-1" });
        Assert.Equal(1, conn.ExecuteScalar<int>("SELECT COUNT(*) FROM knowledge_folders"));
    }

    [Fact]
    public void Migration_Idempotent_RunTwiceNoErrorNoDuplicate()
    {
        ApplyPre039State();
        Apply039();
        Apply039(); // 连跑第二次：ADD COLUMN 重复 → duplicate column name 被良性吞掉

        using var conn = new SqliteConnection(_connStr);
        conn.Open();
        var folderIdColCount = conn.ExecuteScalar<int>(
            "SELECT COUNT(*) FROM pragma_table_info('knowledge_documents') WHERE name='folder_id'");
        Assert.Equal(1, folderIdColCount); // 列只补一次
        var idxCount = conn.ExecuteScalar<int>(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name='idx_knowledge_documents_folder'");
        Assert.Equal(1, idxCount);
    }

    /// <summary>独立执行 040 脚本（剥注释 + 按 ; 切分 + 良性错误吞掉）。</summary>
    private void Apply040()
    {
        var asm = typeof(MigrationRunner).Assembly;
        var name = asm.GetManifestResourceNames()
            .First(n => n.EndsWith("040_AddKnowledgeDocumentsSoftDelete.sql"));
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

    /// <summary>pre-040 库态（039 已应用：有 folder_id 无 deleted_at，等同正式库现状）→ 跑 040 → 补列。</summary>
    [Fact]
    public void Pre040State_NoDeletedAt_040AddsColumn_KeepsData()
    {
        ApplyPre039State();
        Apply039();

        using (var conn = new SqliteConnection(_connStr))
        {
            conn.Open();
            conn.Execute(@"INSERT INTO knowledge_folders (name, project_id, created_at, updated_at, created_by)
                VALUES ('安全资料', NULL, @Now, @Now, @U)",
                new { Now = "2026-08-07 00:00:00", U = "u-1" });
            conn.Execute(@"UPDATE knowledge_documents SET folder_id = 1 WHERE id = 1");
        }

        Apply040();

        using var conn2 = new SqliteConnection(_connStr);
        conn2.Open();
        var hasDeletedAt = conn2.ExecuteScalar<int>(
            "SELECT COUNT(*) FROM pragma_table_info('knowledge_documents') WHERE name='deleted_at'");
        Assert.Equal(1, hasDeletedAt);
        // 既有行数据未被破坏，folder_id 保留，deleted_at 为 NULL（= 未删除）
        var doc = conn2.QueryFirst<dynamic>("SELECT title, folder_id, deleted_at FROM knowledge_documents WHERE id = 1");
        Assert.Equal("历史文档", (string)doc.title);
        Assert.Equal(1L, (long)doc.folder_id);
        Assert.Null(doc.deleted_at);
    }

    /// <summary>040 幂等：连跑两次无错。</summary>
    [Fact]
    public void Migration040_Idempotent_RunTwiceNoError()
    {
        ApplyPre039State();
        Apply039();
        Apply040();
        Apply040();

        using var conn = new SqliteConnection(_connStr);
        conn.Open();
        Assert.Equal(1, conn.ExecuteScalar<int>(
            "SELECT COUNT(*) FROM pragma_table_info('knowledge_documents') WHERE name='deleted_at'"));
    }
}
