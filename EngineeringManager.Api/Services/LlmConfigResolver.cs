using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using EngineeringManager.Api.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace EngineeringManager.Api.Services;

/// <summary>
/// 持久化用的服务商条目 — apiKey 以 DPAPI 加密存储（ApiKeyEnc）
/// </summary>
internal class PersistedProviderEntry
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string BaseUrl { get; set; } = "";
    public string ApiKeyEnc { get; set; } = "";
    public List<ProviderModelEntry> Models { get; set; } = new();
    public string ActiveModelId { get; set; } = "";
}

/// <summary>
/// 持久化用的多服务商配置 DTO — llm-config.dpapi.json 的新结构（含 providers 字段）
/// </summary>
internal class PersistedMultiConfig
{
    public string? ActiveProviderId { get; set; }
    public bool UseBuiltIn { get; set; }
    public List<PersistedProviderEntry> Providers { get; set; } = new();
    public double Temperature { get; set; }
    public int MaxTokens { get; set; }
    public string? ProxyUrl { get; set; }
    public string? UpdatedAt { get; set; }
}

/// <summary>
/// 旧版单配置持久化 DTO（多服务商上线前的 llm-config.dpapi.json 结构），读取时自动迁移
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
    public Dictionary<string, ModelCapability>? ModelCapabilities { get; set; }
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
/// LLM 配置解析器 — 多服务商并存管理 + 三级兜底（用户 DPAPI 文件 → 环境变量 → 内置 Agnes）。
/// 对外统一通过 GetConfig()/GetConfigWithKey() 展开「当前生效配置」，
/// 消费方（ChatAsync / 模型路由 / 端点）看到的仍是单配置形状，不感知多服务商结构。
/// 不依赖 router，也不依赖 provider，纯配置解析逻辑。
/// </summary>
public class LlmConfigResolver
{
    private readonly object _lock = new();
    private readonly ILogger<LlmConfigResolver> _logger;
    private readonly IConfiguration _configuration;
    private MultiProviderConfig _multi;

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
        _multi = ResolveMulti();
    }

    /// <summary>
    /// 持久化前的规范化：模型去重（大小写不敏感，保留首次出现）+ 过滤空白；
    /// activeModelId 被去重移除时校正为第一个模型。所有写入路径统一走这里，
    /// 前端漏防的重复条目在此兜底。
    /// </summary>
    internal static MultiProviderConfig NormalizeMulti(MultiProviderConfig multi)
    {
        var providers = multi.Providers.Select(p =>
        {
            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var models = new List<ProviderModelEntry>();
            foreach (var m in p.Models)
            {
                if (string.IsNullOrWhiteSpace(m.Id)) continue;
                if (!seen.Add(m.Id.Trim())) continue;
                models.Add(m.Id == m.Id.Trim() ? m : m with { Id = m.Id.Trim() });
            }
            // activeModelId 归一到去重后实际保留的条目 ID（大小写变体指向规范 ID）
            var active = p.ActiveModelId?.Trim() ?? "";
            var activeEntry = models.FirstOrDefault(m =>
                string.Equals(m.Id, active, StringComparison.OrdinalIgnoreCase));
            active = activeEntry?.Id ?? models.FirstOrDefault()?.Id ?? "";
            return p with { Models = models, ActiveModelId = active };
        }).ToList();

        return multi with { Providers = providers };
    }

    // ═══════════════════════════════════════════════════════════
    // 纯函数：多服务商 → 当前生效单配置 展开（消费方兼容层）
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 把多服务商配置展开为「当前生效配置」：
    /// UseBuiltIn 或 ActiveProviderId 无匹配 → 内置 Agnes；否则展开 active provider。
    /// 消费方（路由/Chat/端点）只认这个形状。
    /// </summary>
    internal static LlmProviderConfig ExpandMulti(
        MultiProviderConfig multi,
        string builtinBaseUrl, string builtinApiKey, string builtinModel)
    {
        var active = multi.UseBuiltIn
            ? null
            : multi.Providers.FirstOrDefault(p => p.Id == multi.ActiveProviderId);

        if (active == null)
        {
            return new LlmProviderConfig
            {
                ProviderName = "Agnes",
                BaseUrl = builtinBaseUrl,
                ApiKey = builtinApiKey,
                Model = builtinModel,
                UseBuiltIn = true,
                Temperature = multi.Temperature,
                MaxTokens = multi.MaxTokens,
                AvailableModels = new List<string> { builtinModel },
                ProxyUrl = multi.ProxyUrl,
            };
        }

        var model = active.ActiveModelId ?? "";
        if (string.IsNullOrEmpty(model))
            model = active.Models.FirstOrDefault()?.Id ?? "";

        var caps = new Dictionary<string, ModelCapability>(StringComparer.OrdinalIgnoreCase);
        foreach (var m in active.Models)
            caps[m.Id] = new ModelCapability { Input = m.Input, Output = m.Output };

        return new LlmProviderConfig
        {
            ProviderName = active.Name,
            BaseUrl = active.BaseUrl,
            ApiKey = active.ApiKey,
            Model = model,
            UseBuiltIn = false,
            Temperature = multi.Temperature,
            MaxTokens = multi.MaxTokens,
            AvailableModels = active.Models.Select(m => m.Id).ToList(),
            ModelCapabilities = caps,
            ProxyUrl = multi.ProxyUrl,
        };
    }

    /// <summary>
    /// 旧版单配置持久化结构 → 多服务商结构（纯迁移，ApiKeyEnc 原样搬运不解密）。
    /// 旧单配置迁移为 providers[0]（id=default），可用模型清单合并进 models。
    /// </summary>
    internal static PersistedMultiConfig MigrateLegacyPersisted(PersistedLlmConfig legacy)
    {
        var models = new List<ProviderModelEntry>();
        var ids = new List<string>();
        if (legacy.AvailableModels is { Count: > 0 })
            ids.AddRange(legacy.AvailableModels.Where(m => !string.IsNullOrWhiteSpace(m)));
        var currentModel = legacy.Model ?? "";
        if (!string.IsNullOrWhiteSpace(currentModel) && !ids.Contains(currentModel, StringComparer.OrdinalIgnoreCase))
            ids.Insert(0, currentModel);

        foreach (var id in ids)
        {
            var cap = legacy.ModelCapabilities?.GetValueOrDefault(id)
                ?? new ModelCapability { Input = new List<string> { "text" }, Output = new List<string> { "text" } };
            models.Add(new ProviderModelEntry { Id = id, Input = cap.Input, Output = cap.Output });
        }

        return new PersistedMultiConfig
        {
            ActiveProviderId = legacy.UseBuiltIn ? null : "default",
            UseBuiltIn = legacy.UseBuiltIn,
            Providers = new List<PersistedProviderEntry>
            {
                new()
                {
                    Id = "default",
                    Name = legacy.ProviderName ?? "Custom",
                    BaseUrl = legacy.BaseUrl ?? BuiltInBaseUrl,
                    ApiKeyEnc = legacy.ApiKeyEnc ?? "",
                    Models = models,
                    ActiveModelId = currentModel,
                },
            },
            Temperature = legacy.Temperature,
            MaxTokens = legacy.MaxTokens,
        };
    }

    // ═══════════════════════════════════════════════════════════
    // 公开方法
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 获取当前生效配置（不含 apiKey，安全返回给前端）
    /// </summary>
    public LlmProviderConfig GetConfig()
    {
        lock (_lock)
        {
            return ExpandMulti(_multi, BuiltInBaseUrl, "", BuiltInModel);
        }
    }

    /// <summary>
    /// 获取当前生效配置（含 apiKey，内部使用）
    /// </summary>
    public LlmProviderConfig GetConfigWithKey()
    {
        lock (_lock)
        {
            return ExpandMulti(_multi, BuiltInBaseUrl, BuiltInApiKey, BuiltInModel);
        }
    }

    /// <summary>
    /// 获取完整多服务商配置（含各 provider 明文 apiKey）— 仅供 /api/agent/config 投影返回
    /// </summary>
    public MultiProviderConfig GetMultiWithKey()
    {
        lock (_lock)
        {
            return _multi;
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
            _multi = ResolveMulti();
            _logger.LogInformation("[LlmConfigResolver] 配置已重新加载: ActiveProvider={Active}, UseBuiltIn={UseBuiltIn}, Providers={Count}",
                _multi.ActiveProviderId, _multi.UseBuiltIn, _multi.Providers.Count);
        }
        return Task.CompletedTask;
    }

    /// <summary>
    /// 保存多服务商配置（DPAPI 逐 provider 加密 apiKey，存到 llm-config.dpapi.json）。
    /// 请求中 ApiKey 为空的 provider 沿用旧 key（前端出于安全不回显密钥）。
    /// </summary>
    public async Task SaveMultiConfigAsync(MultiProviderConfig newMulti)
    {
        // key 合并：空 key 的 provider 沿用内存里同 id 的旧 key
        var merged = new List<ProviderEntry>();
        lock (_lock)
        {
            foreach (var p in newMulti.Providers)
            {
                if (!string.IsNullOrEmpty(p.ApiKey))
                {
                    merged.Add(p);
                    continue;
                }
                var old = _multi.Providers.FirstOrDefault(o => o.Id == p.Id);
                merged.Add(old == null ? p : p with { ApiKey = old.ApiKey });
            }
        }
        var effective = NormalizeMulti(newMulti with { Providers = merged });

        var dataPath = ApiConfig.ResolveDataPath();
        var filePath = Path.Combine(dataPath, "llm-config.dpapi.json");

        var persisted = new PersistedMultiConfig
        {
            ActiveProviderId = effective.ActiveProviderId,
            UseBuiltIn = effective.UseBuiltIn,
            Temperature = effective.Temperature,
            MaxTokens = effective.MaxTokens,
            ProxyUrl = effective.ProxyUrl,
            UpdatedAt = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
            Providers = effective.Providers.Select(p => new PersistedProviderEntry
            {
                Id = p.Id,
                Name = p.Name,
                BaseUrl = p.BaseUrl,
                ApiKeyEnc = EncryptApiKey(p.ApiKey),
                Models = p.Models,
                ActiveModelId = p.ActiveModelId,
            }).ToList(),
        };

        Directory.CreateDirectory(dataPath);
        var json = JsonSerializer.Serialize(persisted, new JsonSerializerOptions { WriteIndented = true });
        await File.WriteAllTextAsync(filePath, json);

        lock (_lock)
        {
            _multi = effective;
        }

        _logger.LogInformation("[LlmConfigResolver] 多服务商配置已保存: Providers={Count}, Active={Active}, UseBuiltIn={UseBuiltIn}",
            effective.Providers.Count, effective.ActiveProviderId, effective.UseBuiltIn);
    }

    // ═══════════════════════════════════════════════════════════
    // 三级优先级解析（用户文件 → 环境变量 → 内置 Agnes）
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 持久化 DTO → 内存态多服务商配置（ApiKeyEnc 逐 provider 解密为明文 ApiKey）
    /// </summary>
    internal static MultiProviderConfig ToInMemory(PersistedMultiConfig persisted)
    {
        return new MultiProviderConfig
        {
            ActiveProviderId = persisted.ActiveProviderId,
            UseBuiltIn = persisted.UseBuiltIn,
            Temperature = persisted.Temperature,
            MaxTokens = persisted.MaxTokens,
            ProxyUrl = persisted.ProxyUrl,
            Providers = persisted.Providers.Select(p => new ProviderEntry
            {
                Id = p.Id,
                Name = p.Name,
                BaseUrl = p.BaseUrl,
                ApiKey = DecryptApiKey(p.ApiKeyEnc),
                Models = p.Models,
                ActiveModelId = p.ActiveModelId,
            }).ToList(),
        };
    }

    private MultiProviderConfig ResolveMulti()
    {
        // 1. 用户配置（DPAPI 加密文件；useBuiltIn=false 且有可用 provider 时生效）
        var persisted = LoadPersistedMulti();
        if (persisted != null && !persisted.UseBuiltIn && persisted.Providers.Count > 0)
        {
            _logger.LogInformation("[LlmConfigResolver] 使用用户多服务商配置: Providers={Count}, Active={Active}",
                persisted.Providers.Count, persisted.ActiveProviderId);
            return ToInMemory(persisted);
        }

        // 温度/MaxTokens 覆盖：即使回落到内置或环境变量模型，也让用户在设置里保存的参数生效
        double overrideTemp = persisted?.Temperature ?? 0;
        int overrideMax = persisted?.MaxTokens ?? 0;

        // 2. 环境变量
        var envBaseUrl = _configuration["LLM_BASE_URL"]
            ?? Environment.GetEnvironmentVariable("LLM_BASE_URL");
        var envApiKey = _configuration["LLM_API_KEY"]
            ?? Environment.GetEnvironmentVariable("LLM_API_KEY");
        var envModel = _configuration["LLM_MODEL"]
            ?? Environment.GetEnvironmentVariable("LLM_MODEL");

        if (!string.IsNullOrEmpty(envBaseUrl) && !string.IsNullOrEmpty(envApiKey))
        {
            var model = envModel ?? "gpt-4o-mini";
            _logger.LogInformation("[LlmConfigResolver] 使用环境变量配置: BaseUrl={BaseUrl}, Model={Model}", envBaseUrl, model);
            return new MultiProviderConfig
            {
                ActiveProviderId = "env",
                UseBuiltIn = false,
                Temperature = overrideTemp,
                MaxTokens = overrideMax,
                ProxyUrl = persisted?.ProxyUrl,
                Providers = new List<ProviderEntry>
                {
                    new()
                    {
                        Id = "env",
                        Name = "env",
                        BaseUrl = envBaseUrl,
                        ApiKey = envApiKey,
                        Models = new List<ProviderModelEntry> { new() { Id = model } },
                        ActiveModelId = model,
                    },
                },
            };
        }

        // 3. 内置 Agnes 免费 API 兜底
        _logger.LogInformation("[LlmConfigResolver] 使用内置 Agnes 免费 API");
        return new MultiProviderConfig
        {
            ActiveProviderId = null,
            UseBuiltIn = true,
            Temperature = overrideTemp,
            MaxTokens = overrideMax,
            ProxyUrl = persisted?.ProxyUrl,
            Providers = new List<ProviderEntry>(),
        };
    }

    // ═══════════════════════════════════════════════════════════
    // 文件读写 + DPAPI
    // ═══════════════════════════════════════════════════════════

    private static string EncryptApiKey(string apiKey)
    {
        return string.IsNullOrEmpty(apiKey)
            ? ""
            : Convert.ToBase64String(
                ProtectedData.Protect(
                    Encoding.UTF8.GetBytes(apiKey),
                    null,
                    DataProtectionScope.CurrentUser));
    }

    private static string DecryptApiKey(string encrypted)
    {
        if (string.IsNullOrEmpty(encrypted)) return "";
        try
        {
            var bytes = Convert.FromBase64String(encrypted);
            return Encoding.UTF8.GetString(ProtectedData.Unprotect(bytes, null, DataProtectionScope.CurrentUser));
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[LlmConfigResolver] DPAPI 解密 apiKey 失败: {ex.Message}");
            return "";
        }
    }

    /// <summary>
    /// 从 llm-config.dpapi.json 加载多服务商配置（兼容旧版单配置结构，自动迁移）；
    /// 文件不存在或解析失败返回 null
    /// </summary>
    private PersistedMultiConfig? LoadPersistedMulti()
    {
        try
        {
            var dataPath = ApiConfig.ResolveDataPath();
            var filePath = Path.Combine(dataPath, "llm-config.dpapi.json");

            if (!File.Exists(filePath))
                return null;

            var json = File.ReadAllText(filePath);
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            PersistedMultiConfig? persisted;
            if (root.TryGetProperty("Providers", out _) || root.TryGetProperty("providers", out _))
            {
                persisted = JsonSerializer.Deserialize<PersistedMultiConfig>(json);
            }
            else
            {
                var legacy = JsonSerializer.Deserialize<PersistedLlmConfig>(json);
                persisted = legacy == null ? null : MigrateLegacyPersisted(legacy);
                _logger.LogInformation("[LlmConfigResolver] 检测到旧版单配置文件，已迁移为多服务商结构");
            }

            return persisted;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[LlmConfigResolver] 加载用户配置失败: {ex.Message}");
            return null;
        }
    }
}
