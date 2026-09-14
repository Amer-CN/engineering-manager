using System.Data;
using Dapper;
using EngineeringManager.Api.Migrations;
using Microsoft.Data.Sqlite;
using Xunit;

namespace EngineeringManager.Tests.Migrations;

/// <summary>
/// 051：金额分制贯彻——历史元数据一次性 ×100 转换（ROUND 防丢分）。
/// 场景：
///   1. 元制种子行（历史数据）→ ×100 转分；
///   2. wages 守卫行（daily_wage &gt; 5000 的分制行，模拟升级前用 v0.93+ 旧版录工资）→ 原样跳过；
///   3. app_meta 标记写入；
///   4. 重跑幂等（schema_versions 只跑一次 + 守卫行不二次命中）；
///   5. tax_rate / work_days 豁免列不被误转。
/// </summary>
public class MoneyYuanToFenMigrationTests : IDisposable
{
    private readonly string _dbPath;
    private readonly string _connStr;

    public MoneyYuanToFenMigrationTests()
    {
        _dbPath = Path.Combine(Path.GetTempPath(), $"money-fen-053-{Guid.NewGuid()}.db");
        _connStr = $"Data Source={_dbPath};Pooling=False";
    }

    public void Dispose()
    {
        if (File.Exists(_dbPath)) File.Delete(_dbPath);
    }

    [Fact]
    public void YuanRows_AreMultipliedBy100_RoundPreventsCentLoss()
    {
        // 先建一个"051 之前"的库：跑 001-050，再手动把金额列写回元制值
        // （模拟开发者历史库：迁移账本回填、数据从未真正 ×100 的状态）
        MigrationRunner.Run(_connStr, stopBeforeScriptName: "053_MoneyYuanToFen.sql");

        using (var conn = new SqliteConnection(_connStr))
        {
            conn.Open();
            // 元制种子：29.99（ROUND(29.99*100)=2999，CAST 会丢成 2998——D-13 教训回归）
            conn.Execute(@"INSERT INTO [invoices] ([project_id],[amount],[price_amount],[tax_amount],[received_amount],[tax_rate])
                           VALUES (NULL, 29.99, 100.005, 1.29, 0.0, 0.13)");
            conn.Execute(@"INSERT INTO [wages] ([daily_wage],[work_days],[bonus],[deduction],[actual_wage])
                           VALUES (400, 12, 0, 0, 4800)");
            // 分制守卫行：模拟升级前用 v0.93+ 旧版录的工资（ToFen 已 ×100）
            conn.Execute(@"INSERT INTO [wages] ([daily_wage],[work_days],[bonus],[deduction],[actual_wage])
                           VALUES (40000, 12, 0, 0, 480000)");
        }

        // 跑 051
        MigrationRunner.Run(_connStr);

        using var check = new SqliteConnection(_connStr);
        check.Open();
        var inv = check.QuerySingle<(double amount, double price, double tax, double received, double rate)>(
            "SELECT [amount],[price_amount],[tax_amount],[received_amount],[tax_rate] FROM [invoices] LIMIT 1");
        Assert.Equal(2999, inv.amount);      // 29.99 元 → 2999 分（ROUND 保全）
        Assert.Equal(10001, inv.price);      // 100.005 元 → 10001 分（四舍五入）
        Assert.Equal(129, inv.tax);
        Assert.Equal(0, inv.received);
        Assert.Equal(0.13, inv.rate);        // 税率豁免，不被 ×100

        var wages = check.Query<(double daily_wage, double actual_wage)>("SELECT daily_wage, actual_wage FROM [wages] ORDER BY [daily_wage]").ToList();
        var yuanRow = wages[0];
        var fenRow = wages[1];
        Assert.Equal(40000, yuanRow.daily_wage);   // 400 元 → 40000 分
        Assert.Equal(480000, yuanRow.actual_wage); // 4800 元 → 480000 分
        Assert.Equal(40000, fenRow.daily_wage);    // 守卫行原样（已是分）
        Assert.Equal(480000, fenRow.actual_wage);  // 守卫行原样

        // work_days 天数豁免
        var workDays = check.ExecuteScalar<double>("SELECT [work_days] FROM [wages] WHERE [daily_wage]=40000 LIMIT 1");
        Assert.Equal(12, workDays);

        // app_meta 标记
        var marker = check.ExecuteScalar<string>("SELECT [value] FROM [app_meta] WHERE [key]='money_unit'");
        Assert.Equal("fen-053", marker);
    }

    [Fact]
    public void RunTwice_GuardedRows_NotDoubleConverted()
    {
        MigrationRunner.Run(_connStr, stopBeforeScriptName: "053_MoneyYuanToFen.sql");
        using (var conn = new SqliteConnection(_connStr))
        {
            conn.Open();
            conn.Execute("INSERT INTO [wages] ([daily_wage],[actual_wage]) VALUES (400, 4800)");
        }
        MigrationRunner.Run(_connStr);
        MigrationRunner.Run(_connStr); // 重跑：schema_versions 记账 → 051 不会重复执行

        using var check = new SqliteConnection(_connStr);
        check.Open();
        var (dw, aw) = check.QuerySingle<(double dw, double aw)>("SELECT [daily_wage],[actual_wage] FROM [wages] LIMIT 1");
        Assert.Equal(40000, dw);
        Assert.Equal(480000, aw);
    }

    [Fact]
    public void CostLedger_And_OtherTables_Converted()
    {
        MigrationRunner.Run(_connStr, stopBeforeScriptName: "053_MoneyYuanToFen.sql");
        using (var conn = new SqliteConnection(_connStr))
        {
            conn.Open();
            conn.Execute(@"INSERT INTO [cost_ledger] ([amount],[direction]) VALUES (1234.56, 'expense')");
            conn.Execute(@"INSERT INTO [projects] ([name],[budget]) VALUES ('测试项目', 5000000)");
            conn.Execute(@"INSERT INTO [members] ([name],[base_salary],[daily_wage]) VALUES ('张三', 7000, 300)");
            conn.Execute(@"INSERT INTO [settlements] ([amount]) VALUES (1097508.62)");
            conn.Execute(@"INSERT INTO [materials] ([name],[price]) VALUES ('水泥', 25)");
        }
        MigrationRunner.Run(_connStr);

        using var check = new SqliteConnection(_connStr);
        check.Open();
        Assert.Equal(123456, check.ExecuteScalar<double>("SELECT [amount] FROM [cost_ledger] LIMIT 1"));
        Assert.Equal(500000000, check.ExecuteScalar<double>("SELECT [budget] FROM [projects] LIMIT 1"));
        Assert.Equal(700000, check.ExecuteScalar<double>("SELECT [base_salary] FROM [members] LIMIT 1"));
        Assert.Equal(30000, check.ExecuteScalar<double>("SELECT [daily_wage] FROM [members] LIMIT 1"));
        Assert.Equal(109750862, check.ExecuteScalar<double>("SELECT [amount] FROM [settlements] LIMIT 1"));
        Assert.Equal(2500, check.ExecuteScalar<double>("SELECT [price] FROM [materials] LIMIT 1"));
    }

    [Fact]
    public void EmptyDatabase_MigrationIsNoOp_AndAppMetaMarked()
    {
        MigrationRunner.Run(_connStr);
        using var check = new SqliteConnection(_connStr);
        check.Open();
        var marker = check.ExecuteScalar<string>("SELECT [value] FROM [app_meta] WHERE [key]='money_unit'");
        Assert.Equal("fen-053", marker);
        var applied = check.ExecuteScalar<int>("SELECT COUNT(*) FROM [schema_versions] WHERE [script_name] LIKE '%053%'");
        Assert.Equal(1, applied);
    }
}
