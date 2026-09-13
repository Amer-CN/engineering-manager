using Dapper;
using EngineeringManager.Api.Migrations;
using Microsoft.Data.Sqlite;
using Xunit;

namespace EngineeringManager.Tests.Migrations;

/// <summary>
/// 财税红线 1 闸门（docs/finance-knowledge/REDLINES.md 第 1 条：金额一律 INTEGER（分），禁止浮点）。
///
/// 全库扫描金额语义列：类型必须为 INTEGER，或登记在 KnownRealMoneyDebt 债务清单内，
/// 且清单与实际命中必须完全一致（债务被修复后不移除条目也会红）。
/// 债务来源：财税阶段 2 校准取证（.work/finance-sources/p0-findings.md）——
/// 014/031 迁移在 003「金额 REAL→INTEGER 分」改造之后重新引入 REAL 金额列；
/// invoices/payment_records 的活库元直通问题属单位契约层，修复方案待用户拍板。
///
/// 本测试的定位：阻止金额浮点漂移无声扩散。新加 REAL 金额列 → 红（先登记依据再放行）；
/// 债务修复 → 红（提醒同步移除清单条目）。
/// </summary>
public class MoneyColumnsGoldenTests : IDisposable
{
    private readonly string _dbPath;
    private readonly string _connStr;

    public MoneyColumnsGoldenTests()
    {
        _dbPath = Path.Combine(Path.GetTempPath(), $"money-golden-{Guid.NewGuid()}.db");
        _connStr = $"Data Source={_dbPath};Pooling=False";
        MigrationRunner.Run(_connStr);
    }

    public void Dispose()
    {
        if (File.Exists(_dbPath)) File.Delete(_dbPath);
    }

    /// <summary>
    /// 已知 REAL 金额债务清单（表.列，大小写不敏感）。
    /// 数量语义列（quantity/stock 类）不是金额，不登记（不触发扫描正则）。
    /// 变更本清单 = 债务状态变更的强制声明点，须在提交说明中附依据。
    /// </summary>
    private static readonly HashSet<string> KnownRealMoneyDebt = new(StringComparer.OrdinalIgnoreCase)
    {
        "wage_history.base_daily_wage",        // 014_AddCreatedByToRemainingTables.sql:44
        "wage_history.actual_wage",            // 014_AddCreatedByToRemainingTables.sql:45
        "wage_history.paid_amount",            // 014_AddCreatedByToRemainingTables.sql:46
        "inventory_transactions.unit_price",   // 001:320 原始 REAL，031:37 重申
        "inventory_transactions.total_amount", // 031_FixSchemaDriftWriteEndpoints.sql:38
        "inventory_items.purchase_price",      // 031_FixSchemaDriftWriteEndpoints.sql:55
        "inventory_items.sale_price",           // 031_FixSchemaDriftWriteEndpoints.sql:56
        "materials.price",                     // 031_FixSchemaDriftWriteEndpoints.sql:66
    };

    /// <summary>金额语义列名正则（数量/库存类不在内）。</summary>
    private static readonly System.Text.RegularExpressions.Regex MoneyColumnPattern =
        new("(amount|price|fee|cost|wage|paid|salary)",
            System.Text.RegularExpressions.RegexOptions.Compiled | System.Text.RegularExpressions.RegexOptions.IgnoreCase);

    /// <summary>
    /// 命中金额词但实为元数据/外键的列后缀（paid_date、paid_channel、*_at、*_by、*_id 等），非金额，排除。
    /// 真实金额列不以这些后缀结尾（paid_amount、daily_wage、unit_price……）。
    /// </summary>
    private static readonly System.Text.RegularExpressions.Regex NonMoneySuffixPattern =
        new("(_date|_channel|_at|_by|_id|_time|_status|_note)$",
            System.Text.RegularExpressions.RegexOptions.Compiled | System.Text.RegularExpressions.RegexOptions.IgnoreCase);

    private static bool IsMoneyColumn(string columnName) =>
        MoneyColumnPattern.IsMatch(columnName) && !NonMoneySuffixPattern.IsMatch(columnName);

    private sealed class ColumnInfo
    {
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
    }

    [Fact]
    public void AllMoneyColumns_AreIntegerOrRegisteredDebt_ListMatchesExactly()
    {
        using var conn = new SqliteConnection(_connStr);
        conn.Open();

        var tables = conn.Query<string>(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").ToList();
        Assert.NotEmpty(tables);

        var offenders = new List<string>();
        var matchedDebt = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var table in tables)
        {
            var columns = conn.Query<ColumnInfo>(
                $"SELECT name AS Name, type AS Type FROM pragma_table_info('{table}')").ToList();
            foreach (var col in columns)
            {
                if (!IsMoneyColumn(col.Name)) continue;

                var key = $"{table}.{col.Name}";
                var isRegisteredDebt = KnownRealMoneyDebt.Contains(key);
                if (isRegisteredDebt) matchedDebt.Add(key);

                var isInteger = col.Type.Contains("INTEGER", StringComparison.OrdinalIgnoreCase);
                if (!isInteger && !isRegisteredDebt)
                    offenders.Add($"{key}（{col.Type}）");
            }
        }

        Assert.True(offenders.Count == 0,
            "红线 1 违规：发现未登记的浮点金额列（金额一律 INTEGER 分）。\n" +
            string.Join("\n", offenders) +
            "\n若确属已知债务，请在 KnownRealMoneyDebt 登记并附迁移脚本依据；若是新列，先修类型再提交。");

        var staleEntries = KnownRealMoneyDebt.Except(matchedDebt).ToList();
        Assert.True(staleEntries.Count == 0,
            "债务清单过期：以下条目在迁移库中已不存在或已修复，请从 KnownRealMoneyDebt 移除：\n" +
            string.Join("\n", staleEntries));
    }

    /// <summary>对照锚点：wages 主表是红线 1 的合规样板（INTEGER 分 + ToFen 契约），锁定不回退。</summary>
    [Fact]
    public void WagesMainTable_MoneyColumns_LockedAsIntegerFen()
    {
        using var conn = new SqliteConnection(_connStr);
        conn.Open();
        var columns = conn.Query<ColumnInfo>(
            "SELECT name AS Name, type AS Type FROM pragma_table_info('wages')").ToList();
        Assert.NotEmpty(columns);

        var moneyColumns = columns.Where(c => IsMoneyColumn(c.Name)).ToList();
        Assert.NotEmpty(moneyColumns);

        foreach (var col in moneyColumns)
        {
            Assert.True(col.Type.Contains("INTEGER", StringComparison.OrdinalIgnoreCase),
                $"wages.{col.Name} 应为 INTEGER（分），实际 {col.Type}");
        }
    }
}
