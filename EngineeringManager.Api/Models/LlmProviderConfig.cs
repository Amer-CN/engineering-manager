using System.Text.Json.Serialization;

namespace EngineeringManager.Api.Models;

/// <summary>
/// 模型能力标记 — 参照 ZCode「编辑模型配置」：输入类型 text/image/video，输出类型 text（锁定）
/// </summary>
public record ModelCapability
{
    public List<string> Input { get; init; } = new() { "text" };
    public List<string> Output { get; init; } = new() { "text" };
}

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

    /// <summary>各模型能力标记（key = 模型 ID；缺失 = 纯文本）</summary>
    public Dictionary<string, ModelCapability> ModelCapabilities { get; init; } = new(StringComparer.OrdinalIgnoreCase);

    /// <summary>HTTP 代理地址（null/空 = 直连），随当前生效配置展开</summary>
    public string? ProxyUrl { get; init; }
}