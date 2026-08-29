using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace EngineeringManager.Api.Services;

/// <summary>
/// 配置驱动的模型路由服务 — 从配置/环境变量读取路由策略。
/// 保留现有三级 key 兜底逻辑（DPAPI → 环境变量 → 内置 Agnes），
/// 但将「选模型」与「拿 key」职责分清。
/// </summary>
public class ModelRoutingService : IModelRouter
{
    private readonly ILogger<ModelRoutingService> _logger;
    private readonly IConfiguration _configuration;
    private readonly LlmConfigResolver _configResolver;

    public ModelRoutingService(
        ILogger<ModelRoutingService> logger,
        IConfiguration configuration,
        LlmConfigResolver configResolver)
    {
        _logger = logger;
        _configuration = configuration;
        _configResolver = configResolver;
    }

    /// <summary>
    /// 获取模型路由信息。
    /// 策略：先从配置读取默认模型覆盖，否则回退到三级兜底。
    /// </summary>
    public ModelRouteInfo GetRoute(string scenario = "default")
    {
        // 尝试从配置读取模型覆盖（路由层配置）
        var overriddenModel = _configuration["LLM_ROUTE_MODEL"]
            ?? Environment.GetEnvironmentVariable("LLM_ROUTE_MODEL");
        var overriddenBaseUrl = _configuration["LLM_ROUTE_BASE_URL"]
            ?? Environment.GetEnvironmentVariable("LLM_ROUTE_BASE_URL");

        // 从 LlmConfigResolver 获取当前生效配置（含三级兜底 key）
        var config = _configResolver.GetConfigWithKey();

        var model = overriddenModel ?? config.Model;
        var baseUrl = overriddenBaseUrl ?? config.BaseUrl;

        _logger.LogDebug(
            "[ModelRoutingService] Scenario={Scenario}, Model={Model}, BaseUrl={BaseUrl}, Provider={Provider}",
            scenario, model, baseUrl, config.ProviderName);

        return new ModelRouteInfo(
            Model: model,
            BaseUrl: baseUrl,
            ApiKey: config.ApiKey,
            ProviderName: config.ProviderName,
            UseBuiltIn: config.UseBuiltIn,
            Temperature: config.Temperature > 0 ? config.Temperature : 0.7,
            MaxTokens: config.MaxTokens > 0 ? config.MaxTokens : 4096,
            ProxyUrl: config.ProxyUrl
        );
    }
}