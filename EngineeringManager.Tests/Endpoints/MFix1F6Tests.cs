using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Dapper;
using EngineeringManager.Tests.Common;
using Microsoft.Data.Sqlite;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>M-FIX1 F6: sheet 金额单位——REAL(元) 直接存 double，不做 (long) 取整</summary>
public class MFix1F6Tests : ApiTestBase
{
    private static string ExtractToken(string json)
    {
        var marker = "\"token\":\"";
        var i = json.IndexOf(marker, StringComparison.Ordinal);
        var start = i + marker.Length;
        var end = json.IndexOf('\"', start);
        return json.Substring(start, end - start);
    }

    private void SetAuth(string token) =>
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    [Fact]
    public async Task SheetAmount_1234_56_RoundTrips()
    {
        // 建项目 + batch + admin 登录
        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Open();
            var now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
            conn.Execute("INSERT INTO projects (id, name, created_by, created_at) VALUES (1, 'P1', '1', @Now)", new { Now = now });
            conn.Execute("INSERT INTO cost_ledger_batches (id, project_id, name, created_by, created_at, last_modified_at) VALUES (10, 1, 'B1', '1', @Now, @Now)", new { Now = now });
        }
        var login = await Client.PostAsJsonAsync("/api/auth/login", new { username = "admin", password = "admin123" });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        SetAuth(ExtractToken(await login.Content.ReadAsStringAsync()));

        var post = await Client.PostAsJsonAsync("/api/cost-ledger/10/sheet", new
        {
            entries = new[] { new { amount = 1234.56, date = "2026-08-06", direction = "out", category = "测试", summary = "F6" } },
        });
        Assert.Equal(HttpStatusCode.OK, post.StatusCode);

        var get = await Client.GetAsync("/api/cost-ledger/10/sheet");
        Assert.Equal(HttpStatusCode.OK, get.StatusCode);
        var json = await get.Content.ReadFromJsonAsync<JsonElement>();
        var amount = json.GetProperty("data").EnumerateArray().First().GetProperty("amount").GetDouble();
        // 1234.56 必须原样回来（不做 (long) 取整成 1235）
        Assert.Equal(1234.56, amount, 2);
    }
}
