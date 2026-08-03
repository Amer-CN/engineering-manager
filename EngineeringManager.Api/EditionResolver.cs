namespace EngineeringManager.Api;

/// <summary>edition 解析结果（27.2 F1）。Warning 为 null 表示无降级。</summary>
public readonly record struct EditionResolution(string Edition, string? Warning);

/// <summary>
/// 27.2 F1: edition 解析纯函数。
/// 不读 %APPDATA%（configPath 由调用方传入），不依赖静态缓存，无反射需求。
/// 规则与 ApiConfig.GetEdition() 完全一致（薄壳保持行为不变）：
///   env 优先 → Trim().ToLowerInvariant() → 未知值归一化 + 告警 →
///   读 configPath JSON → 异常时降级 personal + 告警 → 无 edition 字段/文件不存在 → personal 无告警。
/// </summary>
public static class EditionResolver
{
    public static EditionResolution Resolve(string? envValue, string configPath)
    {
        // 环境变量优先（用于测试 / CI 隔离）
        var envEdition = envValue?.Trim().ToLowerInvariant();
        if (!string.IsNullOrEmpty(envEdition))
        {
            if (envEdition != "enterprise" && envEdition != "personal")
            {
                var warning = $"配置文件未生效：环境变量 ENGINEERING_MANAGER_EDITION 值 '{envValue}' 无法识别，已按个人版运行。有效值：personal | enterprise";
                Console.Error.WriteLine($"[ApiConfig] WARNING: {warning}");
                return new EditionResolution("personal", warning);
            }
            return new EditionResolution(envEdition == "enterprise" ? "enterprise" : "personal", null);
        }

        try
        {
            // File.Exists 对目录返回 false，须用 Directory.Exists 兜住「路径存在但是目录」→ 进 ReadAllText 抛异常 → catch → warning
            if (File.Exists(configPath) || Directory.Exists(configPath))
            {
                var json = File.ReadAllText(configPath);
                using var doc = System.Text.Json.JsonDocument.Parse(json);
                if (doc.RootElement.TryGetProperty("edition", out var ed) && ed.GetString() is { Length: > 0 } val)
                {
                    var normalized = val.Trim().ToLowerInvariant();
                    if (normalized != "enterprise" && normalized != "personal")
                    {
                        var warning = $"配置文件 edition 值 '{val}' 无法识别，已按个人版运行。路径：{configPath}；有效值：personal | enterprise";
                        Console.Error.WriteLine($"[ApiConfig] WARNING: {warning}");
                        return new EditionResolution("personal", warning);
                    }
                    return new EditionResolution(normalized == "enterprise" ? "enterprise" : "personal", null);
                }
            }
        }
        catch (Exception ex)
        {
            var warning = $"配置文件读取失败，已按个人版运行。路径：{configPath}；原因：{ex.Message}";
            Console.Error.WriteLine($"[ApiConfig] WARNING: {warning}");
            return new EditionResolution("personal", warning);
        }

        // config 不存在 / 无 edition 字段 → 默认 personal，无警告
        return new EditionResolution("personal", null);
    }
}
