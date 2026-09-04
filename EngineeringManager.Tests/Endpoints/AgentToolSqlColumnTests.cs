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
/// Agent 工具 SQL 真实列验证 — 用与真实库（F:/Company Database/engineering.db PRAGMA 实测）一致的
/// 列名建 in-memory 表，反射调用 AgentToolService 的私有 Execute 方法，保证 4 个曾因列名漂移
/// （s.date / m.bank_account / ic.counterparty+sign_date / quantity,min_quantity,location）报
/// "no such column" 的工具在真实 schema 上可跑通。
/// </summary>
public class AgentToolSqlColumnTests
{
    private const CurrentUser.DataScope Scope = CurrentUser.DataScope.All; // (1=1) 过滤，无需 @Uid 数据

    private static SqliteConnection CreateDb()
    {
        var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();

        conn.Execute(@"
            CREATE TABLE projects (
                id INTEGER PRIMARY KEY, name TEXT, description TEXT, address TEXT,
                start_date TEXT, end_date TEXT, status TEXT, budget REAL,
                project_manager_id INTEGER, created_at TEXT, created_by TEXT);
            CREATE TABLE partners (
                id INTEGER PRIMARY KEY, name TEXT, category TEXT, contact TEXT, phone TEXT,
                bank_account TEXT, created_at TEXT, created_by TEXT);
            CREATE TABLE settlements (
                id INTEGER PRIMARY KEY, project_id INTEGER, contract_id INTEGER, partner_id INTEGER,
                type TEXT, sub_type TEXT, status TEXT, settlement_no TEXT, name TEXT, amount REAL,
                settlement_date TEXT, period_start TEXT, period_end TEXT,
                submitted_by TEXT, submitted_at TEXT, approved_by TEXT, approved_at TEXT, paid_at TEXT,
                remarks TEXT, created_at TEXT, created_by TEXT);
            CREATE TABLE members (
                id INTEGER PRIMARY KEY, name TEXT, phone TEXT, email TEXT, member_type TEXT, role TEXT,
                status TEXT, id_card TEXT, wage_bank_account TEXT,
                base_salary REAL, daily_wage REAL, entry_date TEXT,
                department_id INTEGER, position TEXT, gender TEXT, ethnicity TEXT, birth_date TEXT,
                created_at TEXT, created_by TEXT);
            CREATE TABLE workers (
                id INTEGER PRIMARY KEY, name TEXT, id_card TEXT, gender TEXT, phone TEXT, address TEXT,
                bank_account TEXT, worker_type TEXT, daily_wage REAL, created_at TEXT, created_by TEXT);
            CREATE TABLE income_contracts (
                id INTEGER PRIMARY KEY, project_id INTEGER, partner_id INTEGER, contract_no TEXT,
                name TEXT, amount REAL, signed_date TEXT, start_date TEXT, end_date TEXT,
                status TEXT, payment_method TEXT, remarks TEXT, created_at TEXT, created_by TEXT);
            CREATE TABLE expense_contracts (
                id INTEGER PRIMARY KEY, project_id INTEGER, partner_id INTEGER, contract_no TEXT,
                name TEXT, amount REAL, signed_date TEXT, start_date TEXT, end_date TEXT,
                status TEXT, payment_method TEXT, remarks TEXT, created_at TEXT, created_by TEXT);
            CREATE TABLE inventory_items (
                id INTEGER PRIMARY KEY, code TEXT, name TEXT, category TEXT, unit TEXT,
                specifications TEXT, purchase_price REAL, sale_price REAL,
                current_stock REAL, min_stock REAL, max_stock REAL, supplier_id INTEGER,
                remarks TEXT, created_at TEXT, created_by TEXT);
        ");

        conn.Execute("INSERT INTO settlements (id, name, amount, status, settlement_date, project_id, created_at, created_by) VALUES (1, '主体结算', 100000, 'pending', '2026-05-14', 1, '2026-05-14 10:00:00', 'u1')");
        conn.Execute("INSERT INTO members (id, name, phone, wage_bank_account, created_at, created_by) VALUES (1, '张三', '[已脱敏]', '6214571681008936889', '2026-05-14 10:00:00', 'u1')");
        conn.Execute("INSERT INTO partners (id, name, created_by) VALUES (10, '某某建设集团', 'u1')");
        conn.Execute("INSERT INTO income_contracts (id, project_id, partner_id, name, amount, signed_date, created_at, created_by) VALUES (1, 1, 10, '施工合同', 500000, '2026-03-01', '2026-03-01 10:00:00', 'u1')");
        conn.Execute("INSERT INTO expense_contracts (id, project_id, partner_id, name, amount, signed_date, created_at, created_by) VALUES (2, 1, 10, '劳务合同', 200000, '2026-03-05', '2026-03-05 10:00:00', 'u1')");
        conn.Execute("INSERT INTO inventory_items (id, code, name, category, unit, current_stock, min_stock, max_stock, created_at, created_by) VALUES (1, 'M-001', '螺纹钢', '材料', '吨', 100, 10, 500, '2026-05-14 10:00:00', 'u1')");

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
    public async Task GetSettlements_UsesRealSettlementDateColumn()
    {
        using var db = CreateDb();
        using var args = JsonDocument.Parse("{}");
        var result = await CallAsync("ExecuteGetSettlements", (IDbConnection)db,
            args.RootElement, "u1", Scope);

        var rows = ToRows(result);
        Assert.NotEmpty(rows);
        Assert.Contains("settlement_date", rows[0].Keys);
        Assert.Equal("2026-05-14", rows[0]["settlement_date"]);
    }

    [Fact]
    public async Task GetPendingSettlements_UsesRealSettlementDateColumn()
    {
        using var db = CreateDb();
        var result = await CallAsync("ExecuteGetPendingSettlements", (IDbConnection)db, "u1", Scope);

        var rows = ToRows(result);
        // 种子数据 status=pending，应命中且带 settlement_date 列
        Assert.NotEmpty(rows);
        Assert.Contains("settlement_date", rows[0].Keys);
    }

    [Fact]
    public async Task GetMembers_MapsWageBankAccountForPiiMasking()
    {
        using var db = CreateDb();
        var result = await CallAsync("ExecuteGetMembers", (IDbConnection)db, "u1", Scope);

        var rows = ToRows(result);
        Assert.NotEmpty(rows);
        // 输出键保持 bank_account（PiiFields 精确匹配 bank_account → 走 MaskBankAccount）
        Assert.DoesNotContain("wage_bank_account", rows[0].Keys);
        Assert.Contains("bank_account", rows[0].Keys);
        Assert.Equal("6214571681008936889", rows[0]["bank_account"]);
    }

    [Fact]
    public async Task GetContracts_JoinsPartnersForCounterparty_UsesSignedDate()
    {
        using var db = CreateDb();
        using var args = JsonDocument.Parse("{}");
        var result = await CallAsync("ExecuteGetContracts", (IDbConnection)db,
            args.RootElement, "u1", Scope);

        var income = ToRows(result.GetType().GetProperty("incomeContracts")!.GetValue(result)!);
        var expense = ToRows(result.GetType().GetProperty("expenseContracts")!.GetValue(result)!);

        Assert.NotEmpty(income);
        Assert.Contains("counterparty", income[0].Keys);
        Assert.Contains("signed_date", income[0].Keys);
        Assert.Equal("某某建设集团", income[0]["counterparty"]);
        Assert.Equal("2026-03-01", income[0]["signed_date"]);

        Assert.NotEmpty(expense);
        Assert.Contains("counterparty", expense[0].Keys);
        Assert.Contains("signed_date", expense[0].Keys);
    }

    [Fact]
    public async Task GetInventory_UsesRealStockColumns()
    {
        using var db = CreateDb();
        var result = await CallAsync("ExecuteGetInventory", (IDbConnection)db, "u1", Scope);

        var rows = ToRows(result);
        Assert.NotEmpty(rows);
        Assert.Contains("code", rows[0].Keys);
        Assert.Contains("specifications", rows[0].Keys);
        Assert.Contains("purchase_price", rows[0].Keys);
        Assert.Contains("sale_price", rows[0].Keys);
        Assert.Contains("current_stock", rows[0].Keys);
        Assert.Contains("min_stock", rows[0].Keys);
        Assert.Contains("max_stock", rows[0].Keys);
        Assert.Equal(100.0, Convert.ToDouble(rows[0]["current_stock"]));
        // 漂移列不得再出现
        Assert.DoesNotContain("quantity", rows[0].Keys);
        Assert.DoesNotContain("min_quantity", rows[0].Keys);
        Assert.DoesNotContain("location", rows[0].Keys);
    }

    // ════════ 系统提示词列清单（阶段 3：从白名单程序化生成，单一真源） ════════

    [Fact]
    public void SystemPrompt_ContainsWhitelistColumnList()
    {
        var method = typeof(EngineeringManager.Api.AgentEndpoints).GetMethod("BuildSystemPrompt",
            BindingFlags.NonPublic | BindingFlags.Static);
        Assert.NotNull(method);

        using var db = CreateDb();
        var prompt = (string)method!.Invoke(null,
            new object[] { new Microsoft.AspNetCore.Http.DefaultHttpContext(), (IDbConnection)db })!;

        // 每表一行可用列清单，列名与白名单单一真源一致
        Assert.Contains("【各表可用列清单", prompt);
        Assert.Contains("- income_contracts 可用列:", prompt);
        Assert.Contains("invoice_no", prompt);
        Assert.Contains("settlement_no", prompt);
        Assert.Contains("signed_date", prompt);
        Assert.Contains("wage_bank_account", prompt);
        Assert.Contains("current_stock", prompt);
        Assert.Contains("project_manager_id", prompt);
        // 已删除的死列不得出现在列清单中
        Assert.DoesNotContain("quantity,", prompt);
        Assert.DoesNotContain("location,", prompt);
    }
}
