using Dapper;
using EngineeringManager.Tests.Common;
using Microsoft.Data.Sqlite;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;
using EngineeringManager.Api;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// Wave 1B-2 JS03 结算质保金状态机（业务口径）：
/// POST 带质保三字段→GET 原值（金额库内分值断言）+ PUT 更新 + released 显式写 +
/// 到期后端不派生（派生只在前端 util，前端单测举证）。
/// 不得复用 status 列（process/unarchive 归档位正交，另由 Pin 钉住）。
/// </summary>
public class SettlementRetentionTests : ApiTestBase
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

    private static JsonElement? FindRow(JsonElement dataArray, long id)
    {
        foreach (var el in dataArray.EnumerateArray())
        {
            long got = -1;
            if (el.TryGetProperty("id", out var idProp) && idProp.TryGetInt64(out got) && got == id)
                return el;
        }
        return null;
    }

    private static double GetDouble(JsonElement el, params string[] names)
    {
        foreach (var n in names)
            if (el.TryGetProperty(n, out var p) && p.ValueKind == JsonValueKind.Number)
                return p.GetDouble();
        throw new Xunit.Sdk.XunitException($"缺少数值列 {string.Join("/", names)}：{el}");
    }

    private static string? GetString(JsonElement el, params string[] names)
    {
        foreach (var n in names)
            if (el.TryGetProperty(n, out var p))
                return p.ValueKind == JsonValueKind.Null ? null : p.GetString();
        return null;
    }

    private long QueryFen(long id)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.ExecuteScalar<long?>("SELECT [retention_amount] FROM [settlements] WHERE [id]=@Id", new { Id = id }) ?? -1;
    }

    [Fact]
    public async Task Post_WithRetention_GetReturnsSame_YuanAndFen()
    {
        SetAuth(await LoginAdminAsync());
        var post = await Client.PostAsJsonAsync("/api/settlements", new
        {
            projectId = 1,
            name = "质保结算-1",
            amount = 10000.0,
            settlementNo = $"R57-{Guid.NewGuid():N}",
            retentionAmount = 1234.56,
            retentionDueDate = "2027-06-30",
            retentionStatus = "in_warranty",
        });
        Assert.Equal(HttpStatusCode.OK, post.StatusCode);
        var postJson = await post.Content.ReadFromJsonAsync<JsonElement>();
        var id = postJson.GetProperty("data").GetInt64();

        // 库内分值断言（MoneyUnit 口径）
        Assert.Equal(MoneyUnit.ToFen(1234.56), QueryFen(id));

        // GET 原值（元；后端直出 snake_case，前端 api-client 再转 camelCase）
        var get = await Client.GetAsync("/api/settlements");
        Assert.Equal(HttpStatusCode.OK, get.StatusCode);
        var getJson = await get.Content.ReadFromJsonAsync<JsonElement>();
        var row = FindRow(getJson.GetProperty("data"), id);
        Assert.NotNull(row);
        var el = row!.Value;
        Assert.Equal(1234.56, GetDouble(el, "retention_amount", "retentionAmount"), precision: 2);
        Assert.Equal("2027-06-30", GetString(el, "retention_due_date", "retentionDueDate"));
        Assert.Equal("in_warranty", GetString(el, "retention_status", "retentionStatus"));
    }

    [Fact]
    public async Task Put_UpdateRetention_GetReturnsUpdated()
    {
        SetAuth(await LoginAdminAsync());
        var post = await Client.PostAsJsonAsync("/api/settlements", new
        {
            projectId = 1,
            name = "质保结算-PUT",
            amount = 5000.0,
            settlementNo = $"R57P-{Guid.NewGuid():N}",
        });
        Assert.Equal(HttpStatusCode.OK, post.StatusCode);
        var id = (await post.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetInt64();

        var put = await Client.PutAsJsonAsync("/api/settlements", new
        {
            id,
            name = "质保结算-PUT",
            amount = 5000.0,
            retentionAmount = 800.0,
            retentionDueDate = "2027-12-31",
            retentionStatus = "in_warranty",
        });
        Assert.Equal(HttpStatusCode.OK, put.StatusCode);
        Assert.Equal(MoneyUnit.ToFen(800.0), QueryFen(id));

        var get = await Client.GetAsync("/api/settlements");
        var getJson = await get.Content.ReadFromJsonAsync<JsonElement>();
        var el = FindRow(getJson.GetProperty("data"), id)!.Value;
        Assert.Equal(800.0, GetDouble(el, "retention_amount", "retentionAmount"), precision: 2);
        Assert.Equal("2027-12-31", GetString(el, "retention_due_date", "retentionDueDate"));
    }

    [Fact]
    public async Task Post_ExpiredDueDate_StoredStatusUnchanged_FrontendDerives()
    {
        // 到期派生放前端 util：后端存什么返什么，不自动改写 in_warranty→due_to_collect
        SetAuth(await LoginAdminAsync());
        var post = await Client.PostAsJsonAsync("/api/settlements", new
        {
            projectId = 1,
            name = "质保过期-后端不派生",
            amount = 3000.0,
            settlementNo = $"R57E-{Guid.NewGuid():N}",
            retentionAmount = 300.0,
            retentionDueDate = "2020-01-01",
            retentionStatus = "in_warranty",
        });
        Assert.Equal(HttpStatusCode.OK, post.StatusCode);
        var id = (await post.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetInt64();

        var get = await Client.GetAsync("/api/settlements");
        var getJson = await get.Content.ReadFromJsonAsync<JsonElement>();
        var el = FindRow(getJson.GetProperty("data"), id)!.Value;
        Assert.Equal("in_warranty", GetString(el, "retention_status", "retentionStatus"));
        // 前端派生（due_date<今天→due_to_collect）由 src/__tests__/utils/settlementRetention.test.ts 举证
    }

    [Fact]
    public async Task Post_Released_ExplicitWrite()
    {
        SetAuth(await LoginAdminAsync());
        var post = await Client.PostAsJsonAsync("/api/settlements", new
        {
            projectId = 1,
            name = "质保释放",
            amount = 9000.0,
            settlementNo = $"R57R-{Guid.NewGuid():N}",
            retentionAmount = 900.0,
            retentionDueDate = "2020-01-01",
            retentionStatus = "released",
        });
        Assert.Equal(HttpStatusCode.OK, post.StatusCode);
        var id = (await post.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetInt64();

        var get = await Client.GetAsync("/api/settlements");
        var getJson = await get.Content.ReadFromJsonAsync<JsonElement>();
        var el = FindRow(getJson.GetProperty("data"), id)!.Value;
        Assert.Equal("released", GetString(el, "retention_status", "retentionStatus"));
        Assert.Equal(900.0, GetDouble(el, "retention_amount", "retentionAmount"), precision: 2);
    }
}
