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
/// FP08（Wave 1B-4）：PUT /api/invoices 全量路径读写不得抵扣原因。
/// 六值各过且落库；非法值 400 且库值不变；
/// NULL 经 COALESCE 保旧值（与 OriginalInvoiceId 同模式）；
/// `:status` 快捷路径无此字段，豁免不断言。
/// </summary>
public class InvoiceNonDeductiblePutTests : ApiTestBase
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

    private static async Task<string> ReadError(HttpResponseMessage resp)
    {
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.TryGetProperty("error", out var e) ? e.GetString() ?? "" : "";
    }

    private long SeedInvoice(string name, string? reason = null)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.ExecuteScalar<long>(@"INSERT INTO invoices
            (name,amount,status,invoice_kind,type,non_deductible_reason,created_by,created_at,updated_at,version,last_modified_at)
            VALUES (@N,1000,'issued','paper_special','invoice_in',@R,'1','2026-08-01 00:00:00','2026-08-01 00:00:00',1,'2026-08-01 00:00:00');
            SELECT last_insert_rowid();",
            new { N = name, R = reason });
    }

    private string? QueryReason(long id)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.ExecuteScalar<string?>(
            "SELECT [non_deductible_reason] FROM [invoices] WHERE [id]=@Id",
            new { Id = id });
    }

    // 六值各过且落库原值
    [Theory]
    [InlineData("simple_taxation")]
    [InlineData("exempt")]
    [InlineData("abnormal_loss")]
    [InlineData("welfare_personal")]
    [InlineData("catering_entertainment")]
    [InlineData("other")]
    public async Task Put_ValidReason_Returns200_AndPersists(string reason)
    {
        SetAuth(await LoginAdminAsync());
        var id = SeedInvoice("改原因-" + reason);
        var resp = await Client.PutAsJsonAsync("/api/invoices",
            new { id, name = "改原因-" + reason, amount = 100.0, nonDeductibleReason = reason });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal(reason, QueryReason(id));
    }

    // 非法值 → 400 且库值不变
    [Fact]
    public async Task Put_InvalidReason_Returns400_AndKeepsOld()
    {
        SetAuth(await LoginAdminAsync());
        var id = SeedInvoice("改非法", "exempt");
        var resp = await Client.PutAsJsonAsync("/api/invoices",
            new { id, name = "改非法", amount = 100.0, nonDeductibleReason = "boss_expense" });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("不得抵扣", await ReadError(resp));
        Assert.Equal("exempt", QueryReason(id));
    }

    // 未传原因（NULL）→ 过且保旧值（COALESCE，与 OriginalInvoiceId 同模式）
    [Fact]
    public async Task Put_NullReason_Returns200_AndKeepsOld()
    {
        SetAuth(await LoginAdminAsync());
        var id = SeedInvoice("保旧值", "abnormal_loss");
        var resp = await Client.PutAsJsonAsync("/api/invoices",
            new { id, name = "保旧值", amount = 100.0 });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal("abnormal_loss", QueryReason(id));
    }

    // 无原因行 PUT 不带原因 → 过仍为 NULL（可抵扣）
    [Fact]
    public async Task Put_NullReasonOnClean_Returns200_StillNull()
    {
        SetAuth(await LoginAdminAsync());
        var id = SeedInvoice("仍可抵");
        var resp = await Client.PutAsJsonAsync("/api/invoices",
            new { id, name = "仍可抵", amount = 100.0 });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Null(QueryReason(id));
    }
}
