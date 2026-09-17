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
/// 055 社保字段止血：members 表 5 新列（4 金额分制 + 1 开关）的 POST/PUT 写入 →
/// GET 单条/列表读出往返；全 NULL 行读写不断；新装库表结构含 5 列。
/// 记录型修复：只验存数（元→分→元），不涉城市费率计算引擎（决策暂缓）。
/// </summary>
public class MemberSocialColumnsTests : ApiTestBase
{
    private async Task<string> LoginAdminAsync()
    {
        var resp = await Client.PostAsJsonAsync("/api/auth/login", new { username = "admin", password = "admin123" });
        resp.EnsureSuccessStatusCode();
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("data").GetProperty("token").GetString()!;
    }

    private void SetAuth(string token)
    {
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    private static JsonElement GetData(JsonElement envelope) => envelope.GetProperty("data");

    [Fact]
    public async Task Post_WithSocialFields_GetReturnsSameValues_YuanFenYuan()
    {
        SetAuth(await LoginAdminAsync());
        var tag = Guid.NewGuid().ToString("N").Substring(0, 6);

        // POST 带社保字段（含小数两位 1234.56，验元→分→元）
        var post = await Client.PostAsJsonAsync("/api/members", new
        {
            name = "社保往返-" + tag,
            memberType = "staff",
            status = "active",
            baseSalary = 15000,
            socialSecurityPersonal = 1234.56,
            socialSecurityCompany = 2468.10,
            housingFund = 1800.00,
            housingFundPersonal = 900.50,
            companyCoversSocial = true,
        });
        Assert.True(post.IsSuccessStatusCode,
            "POST /api/members failed: " + post.StatusCode + " " + await post.Content.ReadAsStringAsync());
        var id = GetData(await post.Content.ReadFromJsonAsync<JsonElement>()).GetInt64();

        // 库内应为分（整数值）
        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Open();
            var row = conn.QuerySingle<dynamic>(
                "SELECT [social_security_personal],[social_security_company],[housing_fund],[housing_fund_personal],[company_covers_social] FROM [members] WHERE [id]=@Id",
                new { Id = id });
            Assert.Equal(123456L, Convert.ToInt64(row.social_security_personal));
            Assert.Equal(246810L, Convert.ToInt64(row.social_security_company));
            Assert.Equal(180000L, Convert.ToInt64(row.housing_fund));
            Assert.Equal(90050L, Convert.ToInt64(row.housing_fund_personal));
            Assert.Equal(1L, Convert.ToInt64(row.company_covers_social));
        }

        // GET 单条原值返回（元）
        var get = await Client.GetAsync($"/api/members/{id}");
        Assert.Equal(HttpStatusCode.OK, get.StatusCode);
        var data = GetData(await get.Content.ReadFromJsonAsync<JsonElement>());
        Assert.Equal(1234.56, data.GetProperty("social_security_personal").GetDouble(), 2);
        Assert.Equal(2468.10, data.GetProperty("social_security_company").GetDouble(), 2);
        Assert.Equal(1800.00, data.GetProperty("housing_fund").GetDouble(), 2);
        Assert.Equal(900.50, data.GetProperty("housing_fund_personal").GetDouble(), 2);
        Assert.Equal(JsonValueKind.True, data.GetProperty("company_covers_social").ValueKind);

        // GET 列表同行一致（列表匿名对象读出路径）
        var list = await Client.GetAsync("/api/members");
        Assert.Equal(HttpStatusCode.OK, list.StatusCode);
        JsonElement? found = null;
        foreach (var row in GetData(await list.Content.ReadFromJsonAsync<JsonElement>()).EnumerateArray())
        {
            if (row.GetProperty("id").GetInt64() == id) { found = row; break; }
        }
        Assert.NotNull(found);
        Assert.Equal(1234.56, found.Value.GetProperty("social_security_personal").GetDouble(), 2);
        Assert.Equal(JsonValueKind.True, found.Value.GetProperty("company_covers_social").ValueKind);

        // PUT 改值（含开关翻转为 false）→ GET 单条再验（PUT 列清单路径）
        var put = await Client.PutAsJsonAsync("/api/members", new
        {
            id,
            name = "社保往返-" + tag,
            memberType = "staff",
            status = "active",
            socialSecurityPersonal = 100.01,
            socialSecurityCompany = 200.02,
            housingFund = 300.03,
            housingFundPersonal = 400.04,
            companyCoversSocial = false,
        });
        Assert.True(put.IsSuccessStatusCode,
            "PUT /api/members failed: " + put.StatusCode + " " + await put.Content.ReadAsStringAsync());

        var get2 = await Client.GetAsync($"/api/members/{id}");
        Assert.Equal(HttpStatusCode.OK, get2.StatusCode);
        var data2 = GetData(await get2.Content.ReadFromJsonAsync<JsonElement>());
        Assert.Equal(100.01, data2.GetProperty("social_security_personal").GetDouble(), 2);
        Assert.Equal(200.02, data2.GetProperty("social_security_company").GetDouble(), 2);
        Assert.Equal(300.03, data2.GetProperty("housing_fund").GetDouble(), 2);
        Assert.Equal(400.04, data2.GetProperty("housing_fund_personal").GetDouble(), 2);
        Assert.Equal(JsonValueKind.False, data2.GetProperty("company_covers_social").ValueKind);
    }

    [Fact]
    public async Task Post_WithNullSocialFields_ReadWriteOk()
    {
        SetAuth(await LoginAdminAsync());
        var tag = Guid.NewGuid().ToString("N").Substring(0, 6);

        // 全 NULL 社保字段：只传基础字段，透传不断言造数据（不断言读出是 0 还是 null，只验不断）
        var post = await Client.PostAsJsonAsync("/api/members", new
        {
            name = "社保空行-" + tag,
            memberType = "staff",
            status = "active",
        });
        Assert.True(post.IsSuccessStatusCode,
            "POST /api/members failed: " + post.StatusCode + " " + await post.Content.ReadAsStringAsync());
        var id = GetData(await post.Content.ReadFromJsonAsync<JsonElement>()).GetInt64();

        var get = await Client.GetAsync($"/api/members/{id}");
        Assert.Equal(HttpStatusCode.OK, get.StatusCode);

        var list = await Client.GetAsync("/api/members");
        Assert.Equal(HttpStatusCode.OK, list.StatusCode);
    }

    [Fact]
    public void FreshDatabase_MembersTable_HasFiveSocialColumns_IntegerFen()
    {
        // 新装库（MigrationRunner 全量迁移）表结构含 5 列；金额列 INTEGER（分制红线）
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var cols = conn.Query<(string name, string type)>(
            "SELECT [name] AS [name], [type] AS [type] FROM pragma_table_info('members')").ToList();
        var byName = cols.ToDictionary(c => c.name, c => c.type, StringComparer.OrdinalIgnoreCase);

        foreach (var col in new[]
                 { "social_security_personal", "social_security_company", "housing_fund", "housing_fund_personal", "company_covers_social" })
            Assert.True(byName.ContainsKey(col), $"members 表缺列 {col}，实际列：{string.Join(",", byName.Keys)}");

        foreach (var col in new[]
                 { "social_security_personal", "social_security_company", "housing_fund", "housing_fund_personal", "company_covers_social" })
            Assert.True(byName[col].Contains("INTEGER", StringComparison.OrdinalIgnoreCase),
                $"members.{col} 应为 INTEGER（分），实际 {byName[col]}");
    }
}
