using System.Data;
using Dapper;
using EngineeringManager.Api.Migrations;
using Microsoft.Data.Sqlite;
using Xunit;

namespace EngineeringManager.Tests.Migrations;

/// <summary>
/// 049：存量已归档会话一次性退回未归档（归档/删除合并为单一「删除」）。
/// 全新库跑全量迁移 → agent_conversations.archived_at 全部为 NULL；连跑两次幂等。
/// </summary>
public class UnarchiveLegacyConversationsMigrationTests : IDisposable
{
    private readonly string _dbPath;
    private readonly string _connStr;

    public UnarchiveLegacyConversationsMigrationTests()
    {
        _dbPath = Path.Combine(Path.GetTempPath(), $"agent-conv-049-{Guid.NewGuid()}.db");
        _connStr = $"Data Source={_dbPath};Pooling=False";
    }

    public void Dispose()
    {
        if (File.Exists(_dbPath)) File.Delete(_dbPath);
    }

    private static int ArchivedCount(IDbConnection conn)
        => conn.ExecuteScalar<int>(
            "SELECT COUNT(*) FROM [agent_conversations] WHERE archived_at IS NOT NULL");

    [Fact]
    public void RunAllMigrations_NoArchivedConversationsRemain()
    {
        MigrationRunner.Run(_connStr);
        using var conn = new SqliteConnection(_connStr);
        conn.Open();

        Assert.Equal(0, ArchivedCount(conn));
        // archived_at 列保留不删（回滚安全）
        var columns = conn.Query<string>("SELECT name FROM pragma_table_info('agent_conversations')").ToList();
        Assert.Contains("archived_at", columns);
    }

    [Fact]
    public void RunTwice_Idempotent_NoArchivedConversationsRemain()
    {
        MigrationRunner.Run(_connStr);
        MigrationRunner.Run(_connStr);
        using var conn = new SqliteConnection(_connStr);
        conn.Open();

        Assert.Equal(0, ArchivedCount(conn));
    }
}
