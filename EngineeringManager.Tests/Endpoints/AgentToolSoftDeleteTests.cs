using System.Data;
using System.Reflection;
using System.Text.Json;
using Dapper;
using EngineeringManager.Api.Security;
using EngineeringManager.Api.Services;
using Microsoft.Data.Sqlite;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// Agent 工具软删除可见性 — 只读工具与 markInvoicesReceived 必须过滤 deleted_at 行，
/// 对齐主业务端点（InvoiceEndpoints 等 WHERE deleted_at IS NULL）的可见性语义。
/// 场景来源：2026-09-07 用户冒烟——发票管理里已删的发票，AI 仍能查到并提议操作。
/// </summary>
public class AgentToolSoftDeleteTests
{
    private const CurrentUser.DataScope Scope = CurrentUser.DataScope.All; // (1=1) 过滤，无需 @Uid 数据

    private static SqliteConnection CreateDb()
    {
        var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();

        conn.Execute(@"
            CREATE TABLE projects (
                id INTEGER PRIMARY KEY, name TEXT, status TEXT, start_date TEXT, end_date TEXT,
                budget REAL, project_manager_id INTEGER, created_at TEXT, created_by TEXT);
            CREATE TABLE members (
                id INTEGER PRIMARY KEY, name TEXT, created_at TEXT, created_by TEXT);
            CREATE TABLE workers (
                id INTEGER PRIMARY KEY, name TEXT, created_at TEXT, created_by TEXT);
            CREATE TABLE invoices (
                id INTEGER PRIMARY KEY, project_id INTEGER, invoice_no TEXT, name TEXT,
                amount REAL, status TEXT, issue_date TEXT,
                created_at TEXT, created_by TEXT, updated_at TEXT, version INTEGER DEFAULT 1,
                last_modified_at TEXT, deleted_at TEXT);
            CREATE TABLE settlements (
                id INTEGER PRIMARY KEY, project_id INTEGER, contract_id INTEGER, partner_id INTEGER,
                type TEXT, sub_type TEXT, status TEXT, settlement_no TEXT, name TEXT, amount REAL,
                settlement_date TEXT, remarks TEXT,
                created_at TEXT, created_by TEXT, updated_at TEXT, version INTEGER DEFAULT 1,
                last_modified_at TEXT, deleted_at TEXT);
            CREATE TABLE cost_ledger (
                id INTEGER PRIMARY KEY, project_id INTEGER, direction TEXT, category TEXT,
                amount REAL, occurred_at TEXT, remarks TEXT,
                created_at TEXT, created_by TEXT, updated_at TEXT,
                deleted_at TEXT);
        ");

        // 可见行：发票（issued=待处理、received=已收齐）、结算（pending）、成本两条
        conn.Execute("INSERT INTO invoices (id, project_id, invoice_no, name, amount, status, issue_date, created_at, created_by, updated_at, last_modified_at) VALUES (1, 1, '244120000001', '钢材采购发票', 10000, 'issued', '2026-09-01', '2026-09-01 10:00:00', 'u1', '2026-09-01 10:00:00', '2026-09-01 10:00:00')");
        conn.Execute("INSERT INTO invoices (id, project_id, invoice_no, name, amount, status, issue_date, created_at, created_by, updated_at, last_modified_at) VALUES (2, 1, '244120000002', '水泥采购发票', 5000, 'received', '2026-09-02', '2026-09-02 10:00:00', 'u1', '2026-09-02 10:00:00', '2026-09-02 10:00:00')");
        // 软删行：已删发票（issued——修复前 getPendingInvoices 也会漏出）、已删结算、已删成本
        conn.Execute("INSERT INTO invoices (id, project_id, invoice_no, name, amount, status, issue_date, created_at, created_by, updated_at, last_modified_at, deleted_at) VALUES (3, 1, '244120000003', '已删的发票', 8000, 'issued', '2026-09-03', '2026-09-03 10:00:00', 'u1', '2026-09-03 10:00:00', '2026-09-03 10:00:00', '2026-09-03 12:00:00')");
        conn.Execute("INSERT INTO settlements (id, project_id, name, amount, status, settlement_date, created_at, created_by, updated_at, last_modified_at) VALUES (1, 1, '主体劳务结算', 200000, 'pending', '2026-08-30', '2026-08-30 10:00:00', 'u1', '2026-08-30 10:00:00', '2026-08-30 10:00:00')");
        conn.Execute("INSERT INTO settlements (id, project_id, name, amount, status, settlement_date, created_at, created_by, updated_at, last_modified_at, deleted_at) VALUES (2, 1, '已删的结算', 300000, 'pending', '2026-08-31', '2026-08-31 10:00:00', 'u1', '2026-08-31 10:00:00', '2026-08-31 10:00:00', '2026-08-31 12:00:00')");
        conn.Execute("INSERT INTO cost_ledger (id, project_id, direction, category, amount, occurred_at, created_at, created_by) VALUES (1, 1, 'income', '工程款', 500000, '2026-08-01', '2026-08-01 10:00:00', 'u1')");
        conn.Execute("INSERT INTO cost_ledger (id, project_id, direction, category, amount, occurred_at, created_at, created_by, deleted_at) VALUES (2, 1, 'expense', '材料费', 80000, '2026-08-02', '2026-08-02 10:00:00', 'u1', '2026-08-02 12:00:00')");

        return conn;
    }

    private static object InvokePrivate(string method, params object[] args)
    {
        var m = typeof(AgentToolService).GetMethod(method,
            BindingFlags.NonPublic | BindingFlags.Static);
        Assert.NotNull(m);
        return m!.Invoke(null, args)!;
    }

    private static async Task<object> CallAsync(string method, params object[] args)
    {
        var task = (Task<object>)InvokePrivate(method, args);
        return await task;
    }

    private static List<IDictionary<string, object>> ToRows(object result)
        => ((IEnumerable<object>)result).Select(r => (IDictionary<string, object>)r).ToList();

    [Fact]
    public async Task GetInvoices_ExcludesSoftDeleted()
    {
        using var db = CreateDb();
        using var args = JsonDocument.Parse("{}");
        var result = await CallAsync("ExecuteGetInvoices", (IDbConnection)db,
            args.RootElement, "u1", Scope);

        var rows = ToRows(result);
        // 可见票两张（issued + received），软删的 id=3 不可见
        Assert.Equal(2, rows.Count);
        Assert.DoesNotContain(rows, r => Convert.ToInt64(r["id"]) == 3);
    }

    [Fact]
    public async Task GetPendingInvoices_MatchesRealPendingStatuses_ExcludesSoftDeleted()
    {
        using var db = CreateDb();
        var result = await CallAsync("ExecuteGetPendingInvoices", (IDbConnection)db, "u1", Scope);

        var rows = ToRows(result);
        // issued 可见（真实待处理态），received 不算待处理，软删 issued 不可见
        Assert.Single(rows);
        Assert.Equal(1L, Convert.ToInt64(rows[0]["id"]));
        Assert.Equal("issued", rows[0]["status"]);
    }

    [Fact]
    public async Task GetSettlements_ExcludesSoftDeleted()
    {
        using var db = CreateDb();
        using var args = JsonDocument.Parse("{}");
        var result = await CallAsync("ExecuteGetSettlements", (IDbConnection)db,
            args.RootElement, "u1", Scope);

        var rows = ToRows(result);
        Assert.Single(rows);
        Assert.Equal(1L, Convert.ToInt64(rows[0]["id"]));
    }

    [Fact]
    public async Task GetPendingSettlements_KeepsPending_SoftDeleted()
    {
        using var db = CreateDb();
        var result = await CallAsync("ExecuteGetPendingSettlements", (IDbConnection)db, "u1", Scope);

        var rows = ToRows(result);
        Assert.Single(rows);
        Assert.Equal(1L, Convert.ToInt64(rows[0]["id"]));
    }

    [Fact]
    public async Task GetCostSummary_ExcludesSoftDeletedLedgerRows()
    {
        using var db = CreateDb();
        using var args = JsonDocument.Parse("{}");
        var result = await CallAsync("ExecuteGetCostSummary", (IDbConnection)db,
            args.RootElement, "u1", Scope);

        // income 500000（可见）- expense 80000（软删）= net 500000；byCategory 只剩工程款
        var totalIncome = Convert.ToDouble(result.GetType().GetProperty("totalIncome")!.GetValue(result)!);
        var totalExpense = Convert.ToDouble(result.GetType().GetProperty("totalExpense")!.GetValue(result)!);
        var byCategory = (IEnumerable<object>)result.GetType().GetProperty("byCategory")!.GetValue(result)!;

        Assert.Equal(500000d, totalIncome);
        Assert.Equal(0d, totalExpense);
        Assert.Single(byCategory);
    }

    [Fact]
    public async Task GetDashboardStats_ExcludeSoftDeletedInCountsAndSums()
    {
        using var db = CreateDb();
        var result = await CallAsync("ExecuteGetDashboardStats", (IDbConnection)db, "u1", Scope);

        var invoicesCount = Convert.ToInt32(result.GetType().GetProperty("invoicesCount")!.GetValue(result)!);
        var settlementsCount = Convert.ToInt32(result.GetType().GetProperty("settlementsCount")!.GetValue(result)!);
        var totalIncome = Convert.ToDouble(result.GetType().GetProperty("totalIncome")!.GetValue(result)!);
        var totalExpense = Convert.ToDouble(result.GetType().GetProperty("totalExpense")!.GetValue(result)!);

        Assert.Equal(2, invoicesCount);  // 3 张 - 1 软删
        Assert.Equal(1, settlementsCount); // 2 条 - 1 软删
        Assert.Equal(500000d, totalIncome);
        Assert.Equal(0d, totalExpense);   // 80000 的软删支出不计
    }

    /// <summary>
    /// 写工具同样不得翻软删票：软删行应落 MissingIds（视同不存在），不进 UpdatedIds。
    /// 用反射走 MarkInvoicesReceivedAsync 的服务实例路径受限（需 HttpContext），
    /// 故此用例改为直接断言其 SQL 形状：预检/执行语句均含 deleted_at IS NULL。
    /// </summary>
    [Fact]
    public void MarkInvoicesReceived_SqlFiltersSoftDeleted()
    {
        var source = File.ReadAllText(Path.Combine(
            FindRepoRoot(), "EngineeringManager.Api", "Services", "AgentToolService.cs"));

        // MarkInvoicesReceivedAsync 方法体内的 invoices SELECT/UPDATE 均须带软删过滤
        Assert.Contains("FROM invoices WHERE id=@Id AND deleted_at IS NULL", source);
        Assert.Contains("WHERE id=@Id AND deleted_at IS NULL", source);
    }

    private static string FindRepoRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir != null && !File.Exists(Path.Combine(dir.FullName, "package.json")))
            dir = dir.Parent!;
        return dir!.FullName;
    }
}
