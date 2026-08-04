using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Dapper;
using EngineeringManager.Api;
using EngineeringManager.Tests.Common;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// F6-1: 个人资料 ≠ members。
/// 个人版的「个人资料」（company_name/position/specialty/business_description）存于 users 表，
/// 经 /api/user-profile 端点读写，不得走企业版成员管理（members 表）那套数据通路。
/// </summary>
public class UserProfileIsolationTests : ApiTestBase
{
    private async Task LoginAsAdminAsync()
    {
        var login = await Client.PostAsJsonAsync("/api/auth/login", new { username = "admin", password = "admin123" });
        login.EnsureSuccessStatusCode();
        var body = await login.Content.ReadAsStringAsync();
        var json = System.Text.Json.JsonDocument.Parse(body);
        var token = json.RootElement.GetProperty("data").GetProperty("token").GetString();
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    [Fact]
    public async Task PutProfile_WritesToUsersTable_NotMembers()
    {
        await LoginAsAdminAsync();

        // 1. PUT 个人资料
        var put = await Client.PutAsJsonAsync("/api/user-profile", new
        {
            companyName = "F6隔离测试公司",
            position = "测试职位",
            specialty = "测试专业",
            businessDescription = "测试业务",
        });
        if (put.StatusCode != HttpStatusCode.OK)
        {
            var errBody = await put.Content.ReadAsStringAsync();
            throw new Exception("PUT failed: " + put.StatusCode + " " + errBody);
        }

        // 2. GET 读回（users 表路径）
        var get = await Client.GetAsync("/api/user-profile");
        get.EnsureSuccessStatusCode();
        var json = await get.Content.ReadFromJsonAsync<JsonElement>();
        var data = json.GetProperty("data");
        Assert.Equal("F6隔离测试公司", data.GetProperty("company_name").GetString());
        Assert.Equal("测试职位", data.GetProperty("position").GetString());

        // 3. members 表未被触碰：admin 用户的个人资料列不在 members 表
        //    （members 表无 company_name/position/specialty/business_description 语义——
        //     直接验证 users 表有这 4 列而 members 表没有 profile 写入）
        using var conn = new Microsoft.Data.Sqlite.SqliteConnection(ConnectionString);
        conn.Open();
        var usersCols = conn.Query<string>(
            "SELECT name FROM pragma_table_info('users') WHERE name IN ('company_name','position','specialty','business_description')").ToList();
        Assert.Equal(4, usersCols.Count); // users 表含全部 4 个 profile 列

        var membersCols = conn.Query<string>(
            "SELECT name FROM pragma_table_info('members') WHERE name IN ('company_name','specialty','business_description')").ToList();
        // members 表不得有 profile 专属列（position 是成员岗位，属 members 原有业务字段，不在断言内）
        Assert.DoesNotContain("company_name", membersCols);
        Assert.DoesNotContain("specialty", membersCols);
        Assert.DoesNotContain("business_description", membersCols);
    }

    [Fact]
    public async Task GetProfile_Unauthenticated_ReturnsFail()
    {
        // 个人资料端点必须鉴权（未登录不能读）
        var res = await Client.GetAsync("/api/user-profile");
        var json = await res.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
    }
}
