using EngineeringManager.Api.Services;
using Xunit;

namespace EngineeringManager.Tests.Services;

/// <summary>
/// 回归：LlmConfigResolver.ToInMemory 必须把持久化 DTO 的 ProxyUrl 拷入内存配置。
/// 此前漏拷导致：保存代理后回显被清空、运行时 BuildClient 拿不到代理、重启后代理丢失。
/// </summary>
public class LlmConfigResolverTests
{
    private static PersistedMultiConfig Persisted(string? proxyUrl)
        => new()
        {
            ActiveProviderId = "p1",
            UseBuiltIn = false,
            Temperature = 0.3,
            MaxTokens = 2048,
            ProxyUrl = proxyUrl,
            Providers =
            [
                new PersistedProviderEntry
                {
                    Id = "p1",
                    Name = "测试服务商",
                    BaseUrl = "https://api.example.com/v1",
                    ApiKeyEnc = "",
                    Models = [new() { Id = "model-a" }],
                    ActiveModelId = "model-a",
                },
            ],
        };

    [Fact]
    public void ToInMemory_保留ProxyUrl()
    {
        var result = LlmConfigResolver.ToInMemory(Persisted("http://127.0.0.1:7890"));
        Assert.Equal("http://127.0.0.1:7890", result.ProxyUrl);
    }

    [Fact]
    public void ToInMemory_空ProxyUrl_保持null()
    {
        var result = LlmConfigResolver.ToInMemory(Persisted(null));
        Assert.Null(result.ProxyUrl);
    }

    [Fact]
    public void ToInMemory_保留Temperature和MaxTokens()
    {
        var result = LlmConfigResolver.ToInMemory(Persisted("http://127.0.0.1:7890"));
        Assert.Equal(0.3, result.Temperature);
        Assert.Equal(2048, result.MaxTokens);
    }
}
