using System.Text.Json.Serialization;

namespace EngineeringManager.Api.Models;

/// <summary>
/// 服务商下的单个模型条目（对齐 ZCode「编辑模型配置」：模型 ID + 输入/输出能力）
/// </summary>
public record ProviderModelEntry
{
    public string Id { get; init; } = "";
    public List<string> Input { get; init; } = new() { "text" };
    public List<string> Output { get; init; } = new() { "text" };
}

/// <summary>
/// 自定义服务商条目 — 多服务商并存，各自的 BaseUrl / Key / 模型列表
/// ApiKey 仅在保存请求中出现（留空 = 保留原 key）；
/// 读取接口返回时必须手动投影为 hasApiKey，任何响应都不得携带明文 key
/// </summary>
public record ProviderEntry
{
    public string Id { get; init; } = "";
    public string Name { get; init; } = "";
    public string BaseUrl { get; init; } = "";
    public string ApiKey { get; init; } = "";
    public List<ProviderModelEntry> Models { get; init; } = new();
    public string ActiveModelId { get; init; } = "";
}

/// <summary>
/// 多服务商配置 — AI 设置的完整状态（前端整份回传保存）
/// ActiveProviderId = null 或 UseBuiltIn = true 时走内置 Agnes 兜底
/// </summary>
public record MultiProviderConfig
{
    public string? ActiveProviderId { get; init; }
    public bool UseBuiltIn { get; init; } = true;
    public List<ProviderEntry> Providers { get; init; } = new();
    public double Temperature { get; init; } = 0.7;
    public int MaxTokens { get; init; } = 4096;

    /// <summary>HTTP 代理地址（如 http://127.0.0.1:7890；空 = 直连），对所有自定义服务商生效</summary>
    public string? ProxyUrl { get; init; }
}
