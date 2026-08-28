using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using EngineeringManager.Api.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace EngineeringManager.Api.Services;

/// <summary>
/// 持久化用的配置 DTO — apiKey 以 DPAPI 加密存储
/// </summary>
internal class PersistedLlmConfig
{
    public string? ProviderName { get; set; }
    public string? BaseUrl { get; set; }
    public string? ApiKeyEnc { get; set; }
    public string? Model { get; set; }
    public bool UseBuiltIn { get; set; }
    public double Temperature { get; set; }
    public int MaxTokens { get; set; }
    public List<string>? AvailableModels { get; set; }
    public string? UpdatedAt { get; set; }
}

/// <summary>
/// 字符串截断扩展
/// </summary>
internal static class StringExtensions
{
    public static string Truncate(this string value, int maxLength)
    {
        if (string.IsNullOrEmpty(value)) return value;
        return value.Length <= maxLength ? value : value.Substring(0, maxLength) + "...";
    }
}

/// <summary>
/// LLM 配置解析器 — 三级兜底读配置（DPAPI → 环境变量 → 内置 Agnes）。
/// 不依赖 router，也不依赖 provider，纯配置解析逻辑。
/// 用于打破 LlmProviderService ↔ ModelRoutingService 的循环依赖。
/// </summary>
public class LlmConfigResolver
{
    private readonly object _lock = new();
    private readonly ILogger<LlmConfigResolver> _logger;
    private readonly IConfiguration _configuration;
    private LlmProviderConfig _config;

    // 内置 Agnes 兜底（出厂免费通道，开箱即用）
    // key 以「异或混淆分片」形式嵌入（方案4）：明文不出现在源码/程序集字符串表，
    // 运行时重组。环境变量 AGNES_BUILTIN_API_KEY / appsettings Agnes:ApiKey 可覆盖
    // （高级用户换自己的通道，留空 = 用出厂 key）。
    private const string BuiltInBaseUrl = "https://apihub.agnes-ai.com/v1";
    private const string BuiltInModel = "agnes-2.5-flash";
    // 分片与掩码（Base64）：enc = key XOR mask，A/B 为 enc 前后两段
    private const string KeyPartA = "NgYOBjkBAhl7Ti9MOCA2EnlLMDhiIGlfMRhYIRJg";
    private const string KeyPartB = "JiwDRHwDIXEODmtyMWhUIVUTbwkB";
    private const string KeyMask = "RW0jN2tRMnYheFo5QHBMdzQkck44dFkzdUo2aEIxbUE1c0QwZkc=";

    private static string? _builtInKeyCache;

    private string BuiltInApiKey
    {
        get
        {
            // 优先级：环境变量 > appsettings > 出厂混淆 key（开箱即用）
            var env = Environment.GetEnvironmentVariable("AGNES_BUILTIN_API_KEY");
            if (!string.IsNullOrEmpty(env)) return env;
            var cfg = _configuration["Agnes:ApiKey"];
            if (!string.IsNullOrEmpty(cfg)) return cfg;
            return _builtInKeyCache ??= ReassembleKey();
        }
    }

    /// <summary>重组出厂 key：base64 解码分片拼接后与掩码逐字节异或</summary>
    private static string ReassembleKey()
    {
        try
        {
            var enc = Convert.FromBase64String(KeyPartA + KeyPartB);
            var mask = Convert.FromBase64String(KeyMask);
            var chars = new char[enc.Length];
            for (var i = 0; i < enc.Length; i++)
                chars[i] = (char)(enc[i] ^ mask[i % mask.Length]);
            return new string(chars);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[LlmConfigResolver] 出厂 key 分片重组失败（按未配置处理）: {ex.Message}");
            return "";
        }
    }

    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public LlmConfigResolver(
        ILogger<LlmConfigResolver> logger,
        IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
        _config = ResolveConfig();
    }

    /// <summary>
    /// 获取当前生效配置（不含 apiKey，安全返回给前端）
    /// </summary>
    public LlmProviderConfig GetConfig()
    {
        lock (_lock)
        {
            return _config with { ApiKey = "" };
        }
    }

    /// <summary>
    /// 获取当前生效配置（含 apiKey，内部使用）
    /// </summary>
    public LlmProviderConfig GetConfigWithKey()
    {
        lock (_lock)
        {
            return _config;
        }
    }

    /// <summary>
    /// 重新加载配置（从持久化文件 + 环境变量重新解析）
    /// </summary>
    public Task ReloadConfigAsync()
    {
        Task.Yield();
        lock (_lock)
        {
            _config = ResolveConfig();
            _logger.LogInformation("[LlmConfigResolver] 配置已重新加载: Provider={Provider}, Model={Model}, UseBuiltIn={UseBuiltIn}",
                _config.ProviderName, _config.Model, _config.UseBuiltIn);
        }
        return Task.CompletedTask;
    }

    /// <summary>
    /// 保存用户自定义配置（DPAPI 加密 apiKey，存到 llm-config.dpapi.json）
    /// 如果 newConfig.ApiKey 为空，保留旧 key（避免前端只改 model 时把 key 清空）
    /// </summary>
    public async Task SaveUserConfigAsync(LlmProviderConfig newConfig)
    {
        var dataPath = ApiConfig.ResolveDataPath();
        var filePath = Path.Combine(dataPath, "llm-config.dpapi.json");

        // 如果前端没传 key（空字符串），保留旧 key
        string apiKeyToSave = newConfig.ApiKey;
        if (string.IsNullOrEmpty(apiKeyToSave))
        {
            var oldConfig = GetConfigWithKey();
            apiKeyToSave = oldConfig.ApiKey;
        }

        var encryptedApiKey = string.IsNullOrEmpty(apiKeyToSave)
            ? ""
            : Convert.ToBase64String(
                ProtectedData.Protect(
                    Encoding.UTF8.GetBytes(apiKeyToSave),
                    null,
                    DataProtectionScope.CurrentUser));

        var persisted = new PersistedLlmConfig
        {
            ProviderName = newConfig.ProviderName,
            BaseUrl = newConfig.BaseUrl,
            ApiKeyEnc = encryptedApiKey,
            Model = newConfig.Model,
            UseBuiltIn = newConfig.UseBuiltIn,
            Temperature = newConfig.Temperature,
            MaxTokens = newConfig.MaxTokens,
            AvailableModels = newConfig.AvailableModels,
            UpdatedAt = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
        };

        Directory.CreateDirectory(dataPath);
        // 空清单兜底：前端没传清单时按当前模型生成单元素，避免把清单存成空
        var modelsToSave = newConfig.AvailableModels is { Count: > 0 }
            ? newConfig.AvailableModels
            : BuildModelList(newConfig.Model);
        persisted.AvailableModels = modelsToSave;
        var json = JsonSerializer.Serialize(persisted, new JsonSerializerOptions { WriteIndented = true });
        await File.WriteAllTextAsync(filePath, json);

        lock (_lock)
        {
            // 用保留了旧 key 的配置更新内存
            _config = new LlmProviderConfig
            {
                ProviderName = newConfig.ProviderName,
                BaseUrl = newConfig.BaseUrl,
                ApiKey = apiKeyToSave,
                Model = newConfig.Model,
                UseBuiltIn = newConfig.UseBuiltIn,
                Temperature = newConfig.Temperature,
                MaxTokens = newConfig.MaxTokens,
                AvailableModels = modelsToSave,
            };
        }

        _logger.LogInformation("[LlmConfigResolver] 用户配置已保存: Provider={Provider}, Model={Model}",
            newConfig.ProviderName, newConfig.Model);
    }

    // ═══════════════════════════════════════════════════════════
    // 三级优先级解析配置
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 三级优先级解析配置：
    ///   1. 用户 DPAPI 加密文件
    ///   2. 环境变量
    ///   3. 内置 Agnes 兜底
    /// </summary>
    private LlmProviderConfig ResolveConfig()
    {
        // 1. 用户配置（DPAPI 加密文件）
        var userConfig = LoadUserConfig();
        if (userConfig != null && !userConfig.UseBuiltIn)
        {
            _logger.LogInformation("[LlmConfigResolver] 使用用户自定义配置: Provider={Provider}, Model={Model}",
                userConfig.ProviderName, userConfig.Model);
            return userConfig;
        }

        // 温度/MaxTokens 覆盖：即使回落到内置或环境变量模型，也让用户在设置里保存的温度生效
        double overrideTemp = userConfig?.Temperature ?? 0;
        int overrideMax = userConfig?.MaxTokens ?? 0;

        // 2. 环境变量
        var envBaseUrl = _configuration["LLM_BASE_URL"]
            ?? Environment.GetEnvironmentVariable("LLM_BASE_URL");
        var envApiKey = _configuration["LLM_API_KEY"]
            ?? Environment.GetEnvironmentVariable("LLM_API_KEY");
        var envModel = _configuration["LLM_MODEL"]
            ?? Environment.GetEnvironmentVariable("LLM_MODEL");

        if (!string.IsNullOrEmpty(envBaseUrl) && !string.IsNullOrEmpty(envApiKey))
        {
            _logger.LogInformation("[LlmConfigResolver] 使用环境变量配置: BaseUrl={BaseUrl}, Model={Model}",
                envBaseUrl, envModel ?? "default");
            return new LlmProviderConfig
            {
                ProviderName = "env",
                BaseUrl = envBaseUrl,
                ApiKey = envApiKey,
                Model = envModel ?? "gpt-4o-mini",
                UseBuiltIn = false,
                Temperature = overrideTemp,
                MaxTokens = overrideMax,
                AvailableModels = BuildModelList(envModel ?? "gpt-4o-mini"),
            };
        }

        // 3. 内置 Agnes 免费 API 兜底
        _logger.LogInformation("[LlmConfigResolver] 使用内置 Agnes 免费 API");
        return new LlmProviderConfig
        {
            ProviderName = "Agnes",
            BaseUrl = BuiltInBaseUrl,
            ApiKey = BuiltInApiKey,
            Model = BuiltInModel,
            UseBuiltIn = true,
            Temperature = overrideTemp,
            MaxTokens = overrideMax,
            AvailableModels = BuildModelList(BuiltInModel),
        };
    }

    /// <summary>
    /// 组装可选模型清单：Agnes 内置固定系列；其他 provider 返回当前模型单元素
    /// （无公开 list-models 凭据约定，避免泄漏 key；前端拿到单模型时隐藏选择器）
    /// </summary>
    private static List<string> BuildModelList(string currentModel)
    {
        if (currentModel.StartsWith("agnes-", StringComparison.OrdinalIgnoreCase))
        {
            // 2026-08-22 官方 wiki 核实：仅 2.5-flash 免费（促销 $0，20RPM）；
            // pro / pro-alpha 付费（$0.45/$0.90 每百万 token）——按用户拍板只保留免费款，
            // 付费模型不进默认清单（用户自定义 provider 配置不受此限）
            return new List<string> { "agnes-2.5-flash" };
        }
        return new List<string> { currentModel };
    }

    /// <summary>
    /// 从 llm-config.dpapi.json 加载用户配置，apiKey 用 DPAPI 解密
    /// </summary>
    private LlmProviderConfig? LoadUserConfig()
    {
        try
        {
            var dataPath = ApiConfig.ResolveDataPath();
            var filePath = Path.Combine(dataPath, "llm-config.dpapi.json");

            if (!File.Exists(filePath))
                return null;

            var json = File.ReadAllText(filePath);
            var persisted = JsonSerializer.Deserialize<PersistedLlmConfig>(json);

            if (persisted == null)
                return null;

            var apiKey = "";
            if (!string.IsNullOrEmpty(persisted.ApiKeyEnc))
            {
                try
                {
                    var encrypted = Convert.FromBase64String(persisted.ApiKeyEnc);
                    var decrypted = ProtectedData.Unprotect(encrypted, null, DataProtectionScope.CurrentUser);
                    apiKey = Encoding.UTF8.GetString(decrypted);
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine($"[LlmConfigResolver] DPAPI 解密 apiKey 失败: {ex.Message}");
                    apiKey = "";
                }
            }

            // 模型清单：优先用保存时「获取模型列表」拉到的完整清单；
            // 旧配置文件没有该字段时回退为当前模型单元素（前端隐藏选择器）。
            // 当前模型必须始终在清单内（手填了列表外的模型名时补进去，否则前端选择器不显示它）
            var model = persisted.Model ?? BuiltInModel;
            var models = persisted.AvailableModels?
                .Where(m => !string.IsNullOrWhiteSpace(m))
                .ToList() ?? BuildModelList(model);
            if (!models.Contains(model, StringComparer.OrdinalIgnoreCase))
                models.Insert(0, model);

            return new LlmProviderConfig
            {
                ProviderName = persisted.ProviderName ?? "Custom",
                BaseUrl = persisted.BaseUrl ?? BuiltInBaseUrl,
                ApiKey = apiKey,
                Model = model,
                UseBuiltIn = persisted.UseBuiltIn,
                Temperature = persisted.Temperature,
                MaxTokens = persisted.MaxTokens,
                AvailableModels = models,
            };
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[LlmConfigResolver] 加载用户配置失败: {ex.Message}");
            return null;
        }
    }
}