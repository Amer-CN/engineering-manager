namespace EngineeringManager.Api.Services;

/// <summary>
/// 模型路由接口 — 输入场景/用途，输出应使用的模型路由信息。
/// 将「选模型」与「拿 key」职责分离，切换模型不改调用点。
/// </summary>
public interface IModelRouter
{
    /// <summary>
    /// 根据场景获取模型路由信息
    /// </summary>
    ModelRouteInfo GetRoute(string scenario = "default");
}

/// <summary>
/// 模型路由信息
/// </summary>
public record ModelRouteInfo(
    string Model,
    string BaseUrl,
    string ApiKey,
    string ProviderName,
    bool UseBuiltIn,
    double Temperature = 0.7,
    int MaxTokens = 4096
);
