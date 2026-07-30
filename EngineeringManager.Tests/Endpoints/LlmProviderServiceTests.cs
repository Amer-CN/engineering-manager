using System.Text.Json;
using EngineeringManager.Api.Services;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

public class LlmProviderServiceTests
{
    [Fact]
    public void AddAgnesThinkingParameters_BuiltInAgnes25_AddsOpenAiThinkingFlag()
    {
        var route = CreateRoute(model: "agnes-2.5-flash", useBuiltIn: true);
        var payload = new Dictionary<string, object>();

        LlmProviderService.AddAgnesThinkingParameters(route, payload);

        var json = JsonSerializer.Serialize(payload);
        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;

        Assert.True(root.TryGetProperty("chat_template_kwargs", out var kwargs));
        Assert.True(kwargs.GetProperty("enable_thinking").GetBoolean());
        Assert.False(root.TryGetProperty("thinking", out _));
    }

    [Theory]
    [InlineData("agnes-2.5-pro-alpha", true)]
    [InlineData("custom-model", false)]
    public void AddAgnesThinkingParameters_NonBuiltInAgnes25_LeavesPayloadUnchanged(
        string model,
        bool useBuiltIn)
    {
        var route = CreateRoute(model, useBuiltIn);
        var payload = new Dictionary<string, object>();

        LlmProviderService.AddAgnesThinkingParameters(route, payload);

        Assert.Empty(payload);
    }

    private static ModelRouteInfo CreateRoute(string model, bool useBuiltIn) => new(
        Model: model,
        BaseUrl: "https://apihub.agnes-ai.com/v1",
        ApiKey: "test-key",
        ProviderName: useBuiltIn ? "Agnes" : "Custom",
        UseBuiltIn: useBuiltIn);
}
