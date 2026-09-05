using System.Data;
using System.Reflection;
using Dapper;
using Microsoft.Data.Sqlite;
using Xunit;
using EngineeringManager.Api.Services;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// D-04(审计): 报告 KPI 金额单位单测 —— 库内金额一律 INTEGER 分（003 迁移），
/// KPI 聚合按分读出、出参必须经 ToYuan 换算为元。
/// 插入已知分值，经 AggregateKpiAsync 聚合后断言输出为元
/// （旧实现 ExecuteScalarAsync&lt;double&gt; 按分当元输出，KPI 金额虚高 100 倍）。
/// </summary>
public class ReportKpiUnitTests
{
    private const long ContractFen = 123456;   // → 1234.56 元
    private const long InvoiceFen = 234567;    // → 2345.67 元
    private const long SettlementFen = 345678; // → 3456.78 元
    private const long WageFen = 456789;       // → 4567.89 元

    private static SqliteConnection CreateDb()
    {
        var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        conn.Execute(@"
            CREATE TABLE income_contracts (id INTEGER PRIMARY KEY, amount INTEGER NOT NULL, created_at TEXT);
            CREATE TABLE invoices         (id INTEGER PRIMARY KEY, amount INTEGER NOT NULL, created_at TEXT);
            CREATE TABLE settlements      (id INTEGER PRIMARY KEY, amount INTEGER NOT NULL, created_at TEXT);
            CREATE TABLE wages            (id INTEGER PRIMARY KEY, actual_wage INTEGER NOT NULL, created_at TEXT);
        ");
        conn.Execute("INSERT INTO income_contracts (amount, created_at) VALUES (@V, '2026-09-05 10:00:00')", new { V = ContractFen });
        conn.Execute("INSERT INTO invoices (amount, created_at) VALUES (@V, '2026-09-05 10:00:00')", new { V = InvoiceFen });
        conn.Execute("INSERT INTO settlements (amount, created_at) VALUES (@V, '2026-09-05 10:00:00')", new { V = SettlementFen });
        conn.Execute("INSERT INTO wages (actual_wage, created_at) VALUES (@V, '2026-09-05 10:00:00')", new { V = WageFen });
        return conn;
    }

    private static async Task<object> AggregateKpiAsync(System.Data.IDbConnection db, ReportRequest request)
    {
        // AggregateKpiAsync 为 private，按简报用反射调用；ILlmChatService 不参与聚合，传 null 即可
        var service = new ReportGenerationService(null!);
        var method = typeof(ReportGenerationService).GetMethod(
            "AggregateKpiAsync", BindingFlags.NonPublic | BindingFlags.Instance);
        Assert.NotNull(method);
        var task = (Task)method!.Invoke(service, new object[] { db, request, "test-user", true })!;
        await task;
        return task.GetType().GetProperty("Result")!.GetValue(task)!;
    }

    [Fact]
    public async Task AggregateKpi_Amounts_OutputInYuanNotFen()
    {
        using var db = CreateDb();
        // 显式日期区间：不依赖系统时钟；scope=all + isAdmin=true → 仅 created_at 过滤
        var request = new ReportRequest { StartDate = "2000-01-01", EndDate = "2099-12-31", Scope = "all" };

        var agg = await AggregateKpiAsync(db, request);

        // 断言单位为元：分值 / 100
        Assert.Equal(1234.56, (double)agg.GetType().GetProperty("ContractAmount")!.GetValue(agg)!, 2);
        Assert.Equal(2345.67, (double)agg.GetType().GetProperty("InvoiceAmount")!.GetValue(agg)!, 2);
        Assert.Equal(3456.78, (double)agg.GetType().GetProperty("SettlementAmount")!.GetValue(agg)!, 2);
        Assert.Equal(4567.89, (double)agg.GetType().GetProperty("WageAmount")!.GetValue(agg)!, 2);

        // 笔数 sanity：各表 1 行
        Assert.Equal(1, (int)agg.GetType().GetProperty("ContractCount")!.GetValue(agg)!);
        Assert.Equal(1, (int)agg.GetType().GetProperty("InvoiceCount")!.GetValue(agg)!);
        Assert.Equal(1, (int)agg.GetType().GetProperty("SettlementCount")!.GetValue(agg)!);
        Assert.Equal(1, (int)agg.GetType().GetProperty("WageCount")!.GetValue(agg)!);
    }
}
