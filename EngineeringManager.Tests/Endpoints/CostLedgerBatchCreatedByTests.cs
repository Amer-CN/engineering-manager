using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Dapper;
using EngineeringManager.Tests.Common;
using Microsoft.Data.Sqlite;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// R6.6(G9): cost_ledger_batches 写侧缺 @CreatedBy 参数。
/// POST /api/cost-ledger/batches 与 /{id}/copy 的 INSERT 引用 @CreatedBy 但参数对象
/// 未提供 → Dapper「必须声明标量变量 @CreatedBy」→ 端点自引入提交起（v0.75.0 快照
/// 777075d）从未正常工作。修复：补充 CreatedBy = uid，断言 created_by 落库为当前用户 id。
/// </summary>
public class CostLedgerBatchCreatedByTests : ApiTestBase
{
    private static string ExtractToken(string json)
    {
        var marker = "\"token\":\"";
        var i = json.IndexOf(marker, StringComparison.Ordinal);
        if (i < 0) throw new Exception("token not found: " + json);
        var start = i + marker.Length;
        var end = json.IndexOf('\"', start);
        return json.Substring(start, end - start);
    }

    private void SetAuth(string token) =>
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private async Task LoginAsAdmin()
    {
        var login = await Client.PostAsJsonAsync("/api/auth/login", new { username = "admin", password = "admin123" });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        SetAuth(ExtractToken(await login.Content.ReadAsStringAsync()));
    }

    /// <summary>
    /// POST /api/cost-ledger/batches：created_by 必须落库为当前用户 id（修复前 500）。
    /// </summary>
    [Fact]
    public async Task BatchPost_PersistsCreatedBy_AsCurrentUser()
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
        conn.Execute("INSERT INTO projects (id, name, created_by, created_at) VALUES (1, 'P1', '1', @Now)", new { Now = now });

        await LoginAsAdmin();

        var post = await Client.PostAsJsonAsync("/api/cost-ledger/batches", new { projectId = 1L, name = "R6-batch" });
        Assert.Equal(HttpStatusCode.OK, post.StatusCode); // 修复前：@CreatedBy 未声明 → 500

        using var postJson = JsonDocument.Parse(await post.Content.ReadAsStringAsync());
        var created = postJson.RootElement.GetProperty("data").GetInt64();
        var storedBy = conn.ExecuteScalar<string>(
            "SELECT created_by FROM cost_ledger_batches WHERE id=@Id", new { Id = created });
        Assert.Equal("1", storedBy); // admin uid = "1"
    }

    /// <summary>
    /// POST /api/cost-ledger/batches/{id}/copy：副本 created_by 同样必须为当前用户 id。
    /// </summary>
    [Fact]
    public async Task BatchCopy_PersistsCreatedBy_AsCurrentUser()
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
        conn.Execute("INSERT INTO projects (id, name, created_by, created_at) VALUES (1, 'P1', '1', @Now)", new { Now = now });
        conn.Execute(@"INSERT INTO cost_ledger_batches (id, project_id, name, created_by, created_at, last_modified_at)
            VALUES (10, 1, '原批次', '1', @Now, @Now)", new { Now = now });

        await LoginAsAdmin();

        var post = await Client.PostAsJsonAsync($"/api/cost-ledger/batches/10/copy", new { newName = "R6-copy" });
        Assert.Equal(HttpStatusCode.OK, post.StatusCode); // 修复前：@CreatedBy 未声明 → 500

        using var json = JsonDocument.Parse(await post.Content.ReadAsStringAsync());
        var newId = json.RootElement.GetProperty("data").GetProperty("id").GetInt64();
        var storedBy = conn.ExecuteScalar<string>(
            "SELECT created_by FROM cost_ledger_batches WHERE id=@Id", new { Id = newId });
        Assert.Equal("1", storedBy); // admin uid = "1"
    }
}
