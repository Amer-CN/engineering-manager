using EngineeringManager.Tests.Common;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// v0.83.0: 用户自助修改密码端点 /api/auth/change-password 测试
/// 覆盖: 旧密码正确→成功且能用新密码登录 / 旧密码错误→400 / 新密码过短→400 /
///       未登录→401 / 非 admin 也能改自己的密码
/// </summary>
public class ChangePasswordTests : ApiTestBase
{
    private async Task<string> LoginAsync(string username, string password)
    {
        var res = await Client.PostAsJsonAsync("/api/auth/login", new { username, password });
        res.EnsureSuccessStatusCode();
        var json = await res.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("data").GetProperty("token").GetString()!;
    }

    private void SetAuth(string token) =>
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    [Fact]
    public async Task ChangePassword_CorrectOldPassword_Succeeds_AndCanLoginWithNew()
    {
        var token = await LoginAsync("admin", "admin123");
        SetAuth(token);

        var res = await Client.PostAsJsonAsync("/api/auth/change-password",
            new { oldPassword = "admin123", newPassword = "newpass456" });
        res.EnsureSuccessStatusCode();
        var json = await res.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());

        // 清掉鉴权头再验证登录
        Client.DefaultRequestHeaders.Authorization = null;

        // 旧密码登录应失败
        var oldLogin = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = "admin", password = "admin123" });
        Assert.Equal(HttpStatusCode.BadRequest, oldLogin.StatusCode);

        // 新密码登录应成功
        var newLogin = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = "admin", password = "newpass456" });
        newLogin.EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task ChangePassword_WrongOldPassword_Returns400()
    {
        var token = await LoginAsync("admin", "admin123");
        SetAuth(token);

        var res = await Client.PostAsJsonAsync("/api/auth/change-password",
            new { oldPassword = "wrongold", newPassword = "newpass456" });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task ChangePassword_ShortNewPassword_Returns400()
    {
        var token = await LoginAsync("admin", "admin123");
        SetAuth(token);

        var res = await Client.PostAsJsonAsync("/api/auth/change-password",
            new { oldPassword = "admin123", newPassword = "123" });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task ChangePassword_NoAuth_Returns401()
    {
        // 不设置 Authorization 头 → GlobalAuthMiddleware 拦截
        var res = await Client.PostAsJsonAsync("/api/auth/change-password",
            new { oldPassword = "admin123", newPassword = "newpass456" });
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task ChangePassword_NonAdmin_CanChangeOwnPassword()
    {
        // 1. admin 创建一个 worker
        var adminToken = await LoginAsync("admin", "admin123");
        SetAuth(adminToken);
        var createRes = await Client.PostAsJsonAsync("/api/users",
            new { username = "worker_cp", password = "worker123", displayName = "测试工人", roleId = "worker", status = "active" });
        createRes.EnsureSuccessStatusCode();

        // 2. worker 登录并改自己的密码 (非 admin 也应允许)
        var workerToken = await LoginAsync("worker_cp", "worker123");
        SetAuth(workerToken);
        var res = await Client.PostAsJsonAsync("/api/auth/change-password",
            new { oldPassword = "worker123", newPassword = "workernew456" });
        res.EnsureSuccessStatusCode();
        var json = await res.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());

        // 3. 用新密码登录成功
        Client.DefaultRequestHeaders.Authorization = null;
        var newLogin = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = "worker_cp", password = "workernew456" });
        newLogin.EnsureSuccessStatusCode();
    }
}
