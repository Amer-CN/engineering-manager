using Dapper;
using EngineeringManager.Api.Migrations;
using Microsoft.Data.Sqlite;
using Xunit;

namespace EngineeringManager.Tests.Migrations;

// ============================================================
// 059 迁移行为测试：幂等（种子行数 + 表结构）
// 全新库跑全量迁移 → 两表齐 + 四城种子行；连跑两次 → 幂等不重复。
// 未确认项为NULL + 待核实标记（广州/深圳）。
// ============================================================

public class TaxLedgerMigrationTests : IDisposable
{
    private readonly string _dbPath;
    private readonly string _connStr;

    public TaxLedgerMigrationTests()
    {
        _dbPath = Path.Combine(Path.GetTempPath(), $"tax-059-{Guid.NewGuid()}.db");
        _connStr = $"Data Source={_dbPath};Pooling=False";
    }

    public void Dispose()
    {
        if (File.Exists(_dbPath)) File.Delete(_dbPath);
    }

    private static List<string> Columns(SqliteConnection conn, string table)
        => conn.Query<string>($"SELECT name FROM pragma_table_info('{table}')").ToList();

    [Fact]
    public void FreshDatabase_RunAllMigrations_HasTablesAndFourCities()
    {
        MigrationRunner.Run(_connStr);
        using var conn = new SqliteConnection(_connStr);
        conn.Open();

        // 表结构：两表存在
        var tables = conn.Query<string>(
            "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('wage_tax_ledger','city_insurance_rates')").ToList();
        Assert.Contains("wage_tax_ledger", tables);
        Assert.Contains("city_insurance_rates", tables);

        // ledger 列齐（含7分项 + 累计三列 + 唯一/索引）
        var ledger = Columns(conn, "wage_tax_ledger");
        foreach (var c in new[] { "person_key", "tax_year", "year_month", "gross_fen", "social_fen", "housing_fen",
                     "extra_1", "extra_2", "extra_3", "extra_4", "extra_5", "extra_6", "extra_7",
                     "extra_total_fen", "extra_json", "threshold_fen",
                     "cum_taxable_fen", "cum_tax_fen", "paid_tax_fen",
                     "bonus_mode", "bonus_fen", "city_code", "created_by", "created_at", "updated_at" })
            Assert.Contains(c, ledger);

        var cityCols = Columns(conn, "city_insurance_rates");
        foreach (var c in new[] { "city_code", "city_name", "pension_corp", "pension_personal",
                     "medical_corp", "medical_personal", "unemp_corp", "unemp_personal",
                     "injury_note", "maternity_note", "base_min_fen", "base_max_fen",
                     "housing_min_rate", "housing_max_rate", "housing_base_min_fen", "housing_base_max_fen",
                     "effective_year", "source_note", "status" })
            Assert.Contains(c, cityCols);

        // 四城种子行数正确
        var count = conn.ExecuteScalar<int>("SELECT COUNT(*) FROM [city_insurance_rates]");
        Assert.True(count >= 4, $"city_insurance_rates 行数={count}，期望≥4");
        foreach (var code in new[] { "beijing", "shanghai", "guangzhou", "shenzhen" })
            Assert.Equal(1, conn.ExecuteScalar<int>(
                "SELECT COUNT(*) FROM [city_insurance_rates] WHERE [city_code]=@C", new { C = code }));

        // 北京 official，基数正确（分）
        var bj = conn.QueryFirst("SELECT * FROM [city_insurance_rates] WHERE [city_code]='beijing'");
        Assert.Equal("official", (string)bj.status);
        Assert.Equal(727000L, (long)bj.base_min_fen);
        Assert.Equal(3634800L, (long)bj.base_max_fen);

        // 未确认项为NULL + 待核实标记：广州/深圳失业基数NULL，工伤浮动NULL，生育深圳NULL
        var gz = conn.QueryFirst("SELECT * FROM [city_insurance_rates] WHERE [city_code]='guangzhou'");
        Assert.True(gz.unemp_base_min_fen is null or DBNull, "广州失业基数未确认应存NULL");
        Assert.True(gz.injury_corp is null or DBNull, "广州工伤浮动无单一值应存NULL");
        Assert.Equal("待核实", (string)gz.status);

        var sz = conn.QueryFirst("SELECT * FROM [city_insurance_rates] WHERE [city_code]='shenzhen'");
        Assert.True(sz.maternity_corp is null or DBNull, "深圳生育0.005未确认应存NULL");
        Assert.Equal("待核实", (string)sz.status);
        Assert.Contains("待核实", (string)sz.maternity_note + (string)sz.source_note);
    }

    [Fact]
    public void RunTwice_Idempotent_NoDuplicateSeeds()
    {
        MigrationRunner.Run(_connStr);
        MigrationRunner.Run(_connStr);
        using var conn = new SqliteConnection(_connStr);
        conn.Open();

        Assert.Equal(4, conn.ExecuteScalar<int>(
            "SELECT COUNT(*) FROM [city_insurance_rates] WHERE [city_code] IN ('beijing','shanghai','guangzhou','shenzhen')"));
        // 唯一索引未建出重复列
        var ledger = Columns(conn, "wage_tax_ledger");
        Assert.Equal(1, ledger.Count(c => c == "person_key"));
        Assert.Equal(1, ledger.Count(c => c == "extra_total_fen"));

        // 唯一约束生效：同人同月不可重复
        conn.Execute(@"INSERT INTO [wage_tax_ledger]
            ([person_key],[tax_year],[year_month],[gross_fen],[created_by],[created_at],[updated_at])
            VALUES ('member:1','2026','2026-08',100,'1','2026-08-01 00:00:00','2026-08-01 00:00:00')");
        Assert.ThrowsAny<Exception>(() => conn.Execute(@"INSERT INTO [wage_tax_ledger]
            ([person_key],[tax_year],[year_month],[gross_fen],[created_by],[created_at],[updated_at])
            VALUES ('member:1','2026','2026-08',200,'1','2026-08-01 00:00:00','2026-08-01 00:00:00')"));
    }

    // ============================================================
    // 060 四川种子：两行存在 + 关键值抽查 + 未确认项为 NULL
    // ============================================================

    [Fact]
    public void FreshDatabase_RunAllMigrations_HasSichuanTwoRows()
    {
        MigrationRunner.Run(_connStr);
        using var conn = new SqliteConnection(_connStr);
        conn.Open();

        foreach (var code in new[] { "sichuan", "chengdu" })
            Assert.Equal(1, conn.ExecuteScalar<int>(
                "SELECT COUNT(*) FROM [city_insurance_rates] WHERE [city_code]=@C", new { C = code }));

        // 四川省行：费率/基数抽查 + 转载标记
        var sc = conn.QueryFirst("SELECT * FROM [city_insurance_rates] WHERE [city_code]='sichuan'");
        Assert.Equal("转载", (string)sc.status);
        Assert.Equal("2026", (string)sc.effective_year);
        Assert.Equal(0.08, Convert.ToDouble(sc.pension_personal));
        Assert.Equal(0.02, Convert.ToDouble(sc.medical_personal));
        Assert.Equal(0.004, Convert.ToDouble(sc.unemp_personal));
        Assert.Equal(469900L, (long)sc.base_min_fen);
        Assert.Equal(2349300L, (long)sc.base_max_fen);
        // 未确认项为 NULL：工伤浮动、生育（并入医保）、省行公积金四列（分中心制按城市行）
        Assert.True(sc.injury_corp is null or DBNull, "四川工伤浮动无单一值应存NULL");
        Assert.True(sc.maternity_corp is null or DBNull, "四川生育已并入医保应存NULL");
        Assert.True(sc.housing_min_rate is null or DBNull, "四川省行公积金分中心制应存NULL");
        Assert.True(sc.housing_base_min_fen is null or DBNull, "四川省行公积金基数按城市行应存NULL");
        Assert.Contains("2026-09-07", (string)sc.source_note);

        // 成都行：社保沿用省值 + 公积金四列 + 转载标记
        var cd = conn.QueryFirst("SELECT * FROM [city_insurance_rates] WHERE [city_code]='chengdu'");
        Assert.Equal("转载", (string)cd.status);
        Assert.Equal(0.08, Convert.ToDouble(cd.pension_personal));
        Assert.Equal(469900L, (long)cd.base_min_fen);
        Assert.Equal(2349300L, (long)cd.base_max_fen);
        Assert.Equal(0.05, Convert.ToDouble(cd.housing_min_rate));
        Assert.Equal(0.12, Convert.ToDouble(cd.housing_max_rate));
        Assert.Equal(220000L, (long)cd.housing_base_min_fen);
        Assert.Equal(3296900L, (long)cd.housing_base_max_fen);
        Assert.True(cd.injury_corp is null or DBNull, "成都工伤浮动同省行应存NULL");
        Assert.True(cd.maternity_corp is null or DBNull, "成都生育同省行应存NULL");
        Assert.Contains("2026-01-01", (string)cd.source_note);
    }

    [Fact]
    public void RunTwice_SichuanSeeds_Idempotent()
    {
        MigrationRunner.Run(_connStr);
        MigrationRunner.Run(_connStr);
        using var conn = new SqliteConnection(_connStr);
        conn.Open();
        Assert.Equal(2, conn.ExecuteScalar<int>(
            "SELECT COUNT(*) FROM [city_insurance_rates] WHERE [city_code] IN ('sichuan','chengdu')"));
    }
}
