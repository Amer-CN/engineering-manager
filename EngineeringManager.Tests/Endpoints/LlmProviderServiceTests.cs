using System.Text.Json;
using EngineeringManager.Api.Services;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

public class LlmProviderServiceTests
{
    [Fact]
    public void ApplyBuiltInAgnesThinkingControl_BuiltInOff_MapsToReasoningNone()
    {
        var route = CreateRoute(model: "agnes-3.0-flash", useBuiltIn: true);
        var payload = new Dictionary<string, object>();

        LlmProviderService.ApplyBuiltInAgnesThinkingControl(route, "off", payload);

        var json = JsonSerializer.Serialize(payload);
        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;

        Assert.True(root.TryGetProperty("reasoning_effort", out var effort));
        Assert.Equal("none", effort.GetString());
        // payload 仅此一个键：除 reasoning_effort 外不含任何旧思考控制参数
        Assert.Single(root.EnumerateObject());
    }

    [Theory]
    [InlineData(null)]
    [InlineData("medium")]
    public void ApplyBuiltInAgnesThinkingControl_BuiltInNullOrMedium_NoChange(string? reasoningEffort)
    {
        var route = CreateRoute("agnes-3.0-flash", useBuiltIn: true);
        var payload = new Dictionary<string, object>();

        LlmProviderService.ApplyBuiltInAgnesThinkingControl(route, reasoningEffort, payload);

        Assert.Empty(payload);
    }

    [Fact]
    public void ApplyBuiltInAgnesThinkingControl_CustomOff_NoChange()
    {
        var route = CreateRoute("custom-model", useBuiltIn: false);
        var payload = new Dictionary<string, object>();

        LlmProviderService.ApplyBuiltInAgnesThinkingControl(route, "off", payload);

        Assert.Empty(payload);
    }

    private static ModelRouteInfo CreateRoute(string model, bool useBuiltIn) => new(
        Model: model,
        BaseUrl: "https://apihub.agnes-ai.com/v1",
        ApiKey: "test-key",
        ProviderName: useBuiltIn ? "Agnes" : "Custom",
        UseBuiltIn: useBuiltIn);
}
