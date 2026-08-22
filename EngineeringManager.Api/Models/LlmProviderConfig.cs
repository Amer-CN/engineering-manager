using System.Text.Json.Serialization;

namespace EngineeringManager.Api.Models;

/// <summary>
/// LLM Provider 配置模型 — 不可变 record，with { } 支持不可变拷贝
/// ApiKey 标记 [JsonIgnore] 防止序列化泄露
/// </summary>
public record LlmProviderConfig
{
    public string ProviderName { get; init; } = "Agnes";
    public string BaseUrl { get; init; } = "https://apihub.agnes-ai.com/v1";

    [JsonIgnore]
    public string ApiKey { get; init; } = "";

    public string Model { get; init; } = "agnes-2.5-flash";
    public bool UseBuiltIn { get; init; } = true;
    public double Temperature { get; init; } = 0.7;
    public int MaxTokens { get; init; } = 4096;

    /// <summary>当前 provider 可选模型清单（供前端模型选择器；空 = 前端隐藏选择器）</summary>
    public List<string> AvailableModels { get; init; } = new();
}