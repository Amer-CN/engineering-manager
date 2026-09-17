using Dapper;
using EngineeringManager.Tests.Common;
using Microsoft.Data.Sqlite;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// FP06（Wave 1B-1）：红冲必须关联原蓝票 + 数电票不能作废。
/// POST /api/invoices 6 条：红字无关联→400；红字关联有效→过；
/// 红字关联不存在/已红冲→400；电票作废→400；纸票作废→过；空 kind 作废→过。
/// 约定：空 kind 默认放行（保历史数据兼容）；仅明确 electronic_* 禁止作废。
/// </summary>
public class InvoiceRedFlushCancelTests : ApiTestBase
{
    private const string Password = "admin123";

    private async Task<string> LoginAdminAsync()
    {
        var resp = await Client.PostAsJsonAsync("/api/auth/login", new { username = "admin", password = Password });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("data").GetProperty("token").GetString()!;
    }

    private void SetAuth(string token) =>
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private long SeedBlue(string status = "issued", string kind = "paper_regular", string no = "B10001")
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.ExecuteScalar<long>(@"INSERT INTO invoices
            (name,amount,status,invoice_kind,invoice_no,created_by,created_at,updated_at,version,last_modified_at)
            VALUES ('蓝票',1000,@S,@K,@N,'1','2026-08-01 00:00:00','2026-08-01 00:00:00',1,'2026-08-01 00:00:00');
            SELECT last_insert_rowid();",
            new { S = status, K = kind, N = no });
    }

    private static async Task<string> ReadError(HttpResponseMessage resp)
    {
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.TryGetProperty("error", out var e) ? e.GetString() ?? "" : "";
    }

    // 1. 红字无关联 → 400
    [Fact]
    public async Task Red_NoOriginal_Returns400()
    {
        SetAuth(await LoginAdminAsync());
        var resp = await Client.PostAsJsonAsync("/api/invoices",
            new { name = "红字无关联", amount = 100.0, status = "red_flushed", invoiceKind = "paper_regular" });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("原蓝票", await ReadError(resp));
    }

    // 2. 红字关联有效蓝票 → 200，且库落 original_invoice_id
    [Fact]
    public async Task Red_ValidOriginal_Returns200_AndPersistsLink()
    {
        SetAuth(await LoginAdminAsync());
        var blueId = SeedBlue(no: "B20001");
        var resp = await Client.PostAsJsonAsync("/api/invoices",
            new { name = "红字有效", amount = 100.0, status = "red_flushed", invoiceKind = "paper_regular", originalInvoiceId = blueId });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        using var conn = new SqliteConnection(ConnectionString);
        var link = conn.ExecuteScalar<long?>("SELECT [original_invoice_id] FROM [invoices] WHERE [name]='红字有效'");
        Assert.Equal(blueId, link);
    }

    // 3a. 红字关联不存在 → 400
    [Fact]
    public async Task Red_NonexistentOriginal_Returns400()
    {
        SetAuth(await LoginAdminAsync());
        var resp = await Client.PostAsJsonAsync("/api/invoices",
            new { name = "红字坏链", amount = 100.0, status = "red_flushed", invoiceKind = "paper_regular", originalInvoiceId = 999999 });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("不存在", await ReadError(resp));
    }

    // 3b. 红字关联已红冲原票 → 400
    [Fact]
    public async Task Red_AlreadyFlushedOriginal_Returns400()
    {
        SetAuth(await LoginAdminAsync());
        var flushedId = SeedBlue(status: "red_flushed", no: "B30001");
        var resp = await Client.PostAsJsonAsync("/api/invoices",
            new { name = "红字重冲", amount = 100.0, status = "red_flushed", invoiceKind = "paper_regular", originalInvoiceId = flushedId });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("已红冲或已作废", await ReadError(resp));
    }

    // 4. 电票作废 → 400
    [Fact]
    public async Task Cancel_Electronic_Returns400()
    {
        SetAuth(await LoginAdminAsync());
        var resp = await Client.PostAsJsonAsync("/api/invoices",
            new { name = "电票作废", amount = 100.0, status = "cancelled", invoiceKind = "electronic_regular" });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("数电票不能作废", await ReadError(resp));
    }

    // 5+6. 纸票作废 → 过；空 kind 作废 → 过（合一条测两种放行，避免多余文件）
    [Fact]
    public async Task Cancel_PaperAndEmptyKind_Returns200()
    {
        SetAuth(await LoginAdminAsync());
        var paper = await Client.PostAsJsonAsync("/api/invoices",
            new { name = "纸票作废", amount = 100.0, status = "cancelled", invoiceKind = "paper_special" });
        Assert.Equal(HttpStatusCode.OK, paper.StatusCode);
        var emptyKind = await Client.PostAsJsonAsync("/api/invoices",
            new { name = "空kind作废", amount = 100.0, status = "cancelled" });
        Assert.Equal(HttpStatusCode.OK, emptyKind.StatusCode);
    }

    // 7. 快捷路径：电票经 PUT /api/invoices/{id}/status 作废 → 400（FP06 门控，无旁路）
    [Fact]
    public async Task StatusShortcut_ElectronicCancel_Returns400()
    {
        SetAuth(await LoginAdminAsync());
        var id = SeedBlue(kind: "electronic_regular", no: "B70001");
        var resp = await Client.PutAsJsonAsync($"/api/invoices/{id}/status", new { status = "cancelled" });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("数电票不能作废", await ReadError(resp));
    }

    // 8. 快捷路径：红冲经 PUT /api/invoices/{id}/status → 400（该 DTO 仅含 Status，
    // 天然无法携带原票关联，指引走全量路径）
    [Fact]
    public async Task StatusShortcut_RedFlush_Returns400()
    {
        SetAuth(await LoginAdminAsync());
        var id = SeedBlue(kind: "paper_regular", no: "B80001");
        var resp = await Client.PutAsJsonAsync($"/api/invoices/{id}/status", new { status = "red_flushed" });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("红冲需关联原蓝票", await ReadError(resp));
    }
}
