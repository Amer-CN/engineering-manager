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

    // 内置 Agnes 兜底
    private const string BuiltInApiKey = "sk-1RP0oZ6uuxPzeMoBvZT0lDRnIPQKm6783G6KcHEZ9fWtk50A";
    private const string BuiltInBaseUrl = "https://apihub.agnes-ai.com/v1";
    private const string BuiltInModel = "agnes-2.0-flash";

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
            UpdatedAt = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
        };

        Directory.CreateDirectory(dataPath);
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
        };
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

            return new LlmProviderConfig
            {
                ProviderName = persisted.ProviderName ?? "Custom",
                BaseUrl = persisted.BaseUrl ?? BuiltInBaseUrl,
                ApiKey = apiKey,
                Model = persisted.Model ?? BuiltInModel,
                UseBuiltIn = persisted.UseBuiltIn,
                Temperature = persisted.Temperature,
                MaxTokens = persisted.MaxTokens,
            };
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[LlmConfigResolver] 加载用户配置失败: {ex.Message}");
            return null;
        }
    }
}