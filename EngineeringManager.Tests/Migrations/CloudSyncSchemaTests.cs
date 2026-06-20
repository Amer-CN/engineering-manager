using System.Data;
using Dapper;
using EngineeringManager.Api.Migrations;
using Microsoft.Data.Sqlite;
using Xunit;

namespace EngineeringManager.Tests.Migrations;

/// <summary>
/// v0.77.0 阶段 1: cloud sync schema 验证测试
/// 验证 migration 024 + 025 实际生效:
///   - 27 业务表都有 5 列 (version / last_modified_by_device / last_modified_at / sync_status / conflict_marker)
///   - sync_queue + device_registrations 新表存在 + 列对齐
///   - 每张业务表的 idx_<table>_version 索引存在
/// </summary>
public class CloudSyncSchemaTests : IDisposable
{
    private readonly string _dbPath;
    private readonly IDbConnection _db;

    public CloudSyncSchemaTests()
    {
        _dbPath = Path.Combine(Path.GetTempPath(), $"cloud-sync-schema-{Guid.NewGuid()}.db");
        var connStr = $"Data Source={_dbPath};Pooling=False";
        MigrationRunner.Run(connStr);
        _db = new SqliteConnection(connStr);
        _db.Open();
    }

    public void Dispose()
    {
        _db.Dispose();
        if (File.Exists(_dbPath)) File.Delete(_dbPath);
    }

    // 27 业务表清单 (与 migration 024 同步)
    public static IEnumerable<object[]> BusinessTables()
    {
        yield return new object[] { "projects" };
        yield return new object[] { "project_members" };
        yield return new object[] { "project_workers" };
        yield return new object[] { "income_contracts" };
        yield return new object[] { "expense_contracts" };
        yield return new object[] { "agreement_contracts" };
        yield return new object[] { "wages" };
        yield return new object[] { "attendances" };
        yield return new object[] { "members" };
        yield return new object[] { "workers" };
        yield return new object[] { "partners" };
        yield return new object[] { "supervisors" };
        yield return new object[] { "inventory_items" };
        yield return new object[] { "inventory_transactions" };
        yield return new object[] { "materials" };
        yield return new object[] { "expenses" };
        yield return new object[] { "drawings" };
        yield return new object[] { "invoices" };
        yield return new object[] { "payment_records" };
        yield return new object[] { "cost_ledger" };
        yield return new object[] { "settlements" };
        yield return new object[] { "cost_ledger_batches" };
        yield return new object[] { "worker_teams" };
        yield return new object[] { "departments" };
        yield return new object[] { "contract_templates" };
        yield return new object[] { "salary_history" };
        yield return new object[] { "wage_history" };
    }

    private static HashSet<string> GetTableColumns(IDbConnection db, string table)
    {
        var rows = db.Query<string>($"SELECT name FROM pragma_table_info('{table}')");
        return new HashSet<string>(rows, StringComparer.OrdinalIgnoreCase);
    }

    private static HashSet<string> GetTableIndexes(IDbConnection db, string table)
    {
        var rows = db.Query<string>($"SELECT name FROM pragma_index_list('{table}')");
        return new HashSet<string>(rows, StringComparer.OrdinalIgnoreCase);
    }

    [Fact]
    public void SyncQueue_TableExists_WithCorrectColumns()
    {
        var cols = GetTableColumns(_db, "sync_queue");
        Assert.Contains("id", cols);
        Assert.Contains("table_name", cols);
        Assert.Contains("row_id", cols);
        Assert.Contains("operation", cols);
        Assert.Contains("payload", cols);
        Assert.Contains("device_id", cols);
        Assert.Contains("user_id", cols);
        Assert.Contains("version", cols);
        Assert.Contains("enqueued_at", cols);
        Assert.Contains("attempt_count", cols);
        Assert.Contains("last_error", cols);
        Assert.Contains("last_attempt_at", cols);
    }

    [Fact]
    public void SyncQueue_HasCorrectIndexes()
    {
        var idxs = GetTableIndexes(_db, "sync_queue");
        Assert.Contains("idx_sync_queue_table_row", idxs);
        Assert.Contains("idx_sync_queue_enqueued", idxs);
        Assert.Contains("idx_sync_queue_device", idxs);
    }

    [Fact]
    public void DeviceRegistrations_TableExists_WithCorrectColumns()
    {
        var cols = GetTableColumns(_db, "device_registrations");
        Assert.Contains("device_id", cols);
        Assert.Contains("user_id", cols);
        Assert.Contains("device_name", cols);
        Assert.Contains("device_type", cols);
        Assert.Contains("os_info", cols);
        Assert.Contains("app_version", cols);
        Assert.Contains("registered_at", cols);
        Assert.Contains("last_seen_at", cols);
        Assert.Contains("refresh_token_hash", cols);
        Assert.Contains("refresh_token_expires_at", cols);
        Assert.Contains("is_active", cols);
    }

    [Fact]
    public void DeviceRegistrations_HasCorrectIndexes()
    {
        var idxs = GetTableIndexes(_db, "device_registrations");
        Assert.Contains("idx_device_registrations_user", idxs);
        Assert.Contains("idx_device_registrations_active", idxs);
    }

    [Theory]
    [MemberData(nameof(BusinessTables))]
    public void BusinessTable_HasAllFiveCloudSyncColumns(string table)
    {
        var cols = GetTableColumns(_db, table);
        Assert.Contains("version", cols);
        Assert.Contains("last_modified_by_device", cols);
        Assert.Contains("last_modified_at", cols);
        Assert.Contains("sync_status", cols);
        Assert.Contains("conflict_marker", cols);
    }

    [Theory]
    [MemberData(nameof(BusinessTables))]
    public void BusinessTable_HasVersionIndex(string table)
    {
        var idxs = GetTableIndexes(_db, table);
        Assert.Contains($"idx_{table}_version", idxs);
    }

    [Fact]
    public void BusinessTable_InsertDefaultsVersionToOne()
    {
        var affected = _db.Execute(@"INSERT INTO projects (name, created_by, created_at) VALUES ('test', 'admin', '2026-06-21');");
        Assert.Equal(1, affected);

        var row = _db.QueryFirst<(long id, long version, string sync_status)>(@"SELECT id, version, sync_status FROM projects WHERE name='test'");
        Assert.Equal(1, row.version);
        Assert.Equal("synced", row.sync_status);
    }

    [Fact]
    public void SyncQueue_InsertAndQuery()
    {
        var id = _db.ExecuteScalar<long>(@"
            INSERT INTO sync_queue (table_name, row_id, operation, version, enqueued_at, user_id)
            VALUES ('projects', 1, 'insert', 1, '2026-06-21 10:00:00', 'admin');
            SELECT last_insert_rowid();
        ");
        Assert.True(id > 0);

        var row = _db.QueryFirst<dynamic>(@"SELECT table_name, operation, version, attempt_count FROM sync_queue WHERE id=@Id", new { Id = id });
        Assert.Equal("projects", (string)row.table_name);
        Assert.Equal("insert", (string)row.operation);
        Assert.Equal(1L, (long)row.version);
        Assert.Equal(0L, (long)row.attempt_count);
    }
}