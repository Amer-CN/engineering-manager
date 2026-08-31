using System.Data;
using Dapper;
using EngineeringManager.Api.Migrations;
using Microsoft.Data.Sqlite;
using Xunit;

namespace EngineeringManager.Tests.Migrations;

/// <summary>
/// 047：台账 Excel 边界字段补齐（入库五项/离场日期/现住址/发放渠道）+ 考勤手动修改标记。
/// 全新库跑全量迁移 → 新列齐；连跑两次 → 幂等（ADD COLUMN 重复被良性吞掉）。
/// </summary>
public class LedgerExcelBoundaryFieldsMigrationTests : IDisposable
{
    private readonly string _dbPath;
    private readonly string _connStr;

    public LedgerExcelBoundaryFieldsMigrationTests()
    {
        _dbPath = Path.Combine(Path.GetTempPath(), $"ledger-047-{Guid.NewGuid()}.db");
        _connStr = $"Data Source={_dbPath};Pooling=False";
    }

    public void Dispose()
    {
        if (File.Exists(_dbPath)) File.Delete(_dbPath);
    }

    private static List<string> Columns(IDbConnection conn, string table)
        => conn.Query<string>($"SELECT name FROM pragma_table_info('{table}')").ToList();

    [Fact]
    public void FreshDatabase_RunAllMigrations_HasNewColumns()
    {
        MigrationRunner.Run(_connStr);
        using var conn = new SqliteConnection(_connStr);
        conn.Open();

        Assert.Contains("manually_edited", Columns(conn, "attendances"));

        var pw = Columns(conn, "project_workers");
        Assert.Contains("contract_signer", pw);
        Assert.Contains("contract_start", pw);
        Assert.Contains("contract_end", pw);
        Assert.Contains("safety_training", pw);
        Assert.Contains("work_section", pw);
        Assert.Contains("exit_date", pw);

        var workers = Columns(conn, "workers");
        Assert.Contains("current_address", workers);
        Assert.Contains("current_address_enc", workers);

        Assert.Contains("paid_channel", Columns(conn, "wages"));
    }

    [Fact]
    public void RunTwice_Idempotent_NoDuplicateColumns()
    {
        MigrationRunner.Run(_connStr);
        MigrationRunner.Run(_connStr);
        using var conn = new SqliteConnection(_connStr);
        conn.Open();

        Assert.Equal(1, Columns(conn, "attendances").Count(c => c == "manually_edited"));
        Assert.Equal(1, Columns(conn, "project_workers").Count(c => c == "contract_signer"));
        Assert.Equal(1, Columns(conn, "project_workers").Count(c => c == "safety_training"));
        Assert.Equal(1, Columns(conn, "workers").Count(c => c == "current_address"));
        Assert.Equal(1, Columns(conn, "wages").Count(c => c == "paid_channel"));
    }
}
