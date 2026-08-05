using EngineeringManager.Tests.Common;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

public class AuthEndpointsTests : ApiTestBase
{
    [Fact]
    public async Task Login_ValidCredentials_ReturnsToken()
    {
        var response = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = "admin", password = "admin123" });

        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        Assert.True(json.GetProperty("data").GetProperty("token").GetString()!.Length > 0);
    }

    [Fact]
    public async Task Login_InvalidPassword_Returns400()
    {
        var response = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = "admin", password = "wrong" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Login_NonexistentUser_Returns400()
    {
        var response = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = "nonexistent", password = "admin123" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
