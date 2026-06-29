using System.Data;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Dapper;
using EngineeringManager.Api.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace EngineeringManager.Api.Services;

/// <summary>
/// LLM Provider 服务 — 管理 LLM 配置的加载、持久化与 API 调用
///
/// 配置优先级：
///   1. 用户自定义配置（DPAPI 加密存储于 &lt;dataPath&gt;/llm-config.dpapi.json）
///   2. 环境变量（LLM_BASE_URL / LLM_API_KEY / LLM_MODEL）
///   3. 内置 Agnes 免费 API 兜底
///
/// 线程安全：所有读写 _config 用 _lock 保护
/// </summary>
public class LlmProviderService
{
    private readonly object _lock = new();
    private readonly ILogger<LlmProviderService> _logger;
    private readonly IConfiguration _configuration;
    private readonly IHttpClientFactory _httpClientFactory;
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

    public LlmProviderService(
        ILogger<LlmProviderService> logger,
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory)
    {
        _logger = logger;
        _configuration = configuration;
        _httpClientFactory = httpClientFactory;
        _config = ResolveConfig();
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
    /// 测试 LLM 连接 — 调用 /models 端点，返回可用模型列表
    /// </summary>
    public async Task<(bool success, string[] models, string? error)> TestConnectionAsync(
        string baseUrl, string apiKey)
    {
        try
        {
            var client = _httpClientFactory.CreateClient("LlmProvider");
            client.Timeout = TimeSpan.FromSeconds(30);

            using var request = new HttpRequestMessage(HttpMethod.Get,
                $"{baseUrl.TrimEnd('/')}/models");
            request.Headers.Add("Authorization", $"Bearer {apiKey}");

            var response = await client.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                return (false, Array.Empty<string>(), $"HTTP {response.StatusCode}: {body.Truncate(200)}");
            }

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var models = new List<string>();

            if (doc.RootElement.TryGetProperty("data", out var data) && data.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in data.EnumerateArray())
                {
                    if (item.TryGetProperty("id", out var id))
                        models.Add(id.GetString() ?? "");
                }
            }

            return (true, models.ToArray(), null);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[LlmProviderService] TestConnection 失败: {ex.Message}");
            return (false, Array.Empty<string>(), ex.Message);
        }
    }

    /// <summary>
    /// 检查 LLM 是否可用（配置存在 + 可连接）
    /// </summary>
    public async Task<bool> IsAvailableAsync()
    {
        try
        {
            var (ok, _, _) = await TestConnectionAsync(
                _config.BaseUrl,
                _config.ApiKey);
            return ok;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// 重新加载配置（从持久化文件 + 环境变量重新解析）
    /// </summary>
    public async Task ReloadConfigAsync()
    {
        await Task.Yield();
        lock (_lock)
        {
            _config = ResolveConfig();
            _logger.LogInformation("[LlmProviderService] 配置已重新加载: Provider={Provider}, Model={Model}, UseBuiltIn={UseBuiltIn}",
                _config.ProviderName, _config.Model, _config.UseBuiltIn);
        }
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

        _logger.LogInformation("[LlmProviderService] 用户配置已保存: Provider={Provider}, Model={Model}",
            newConfig.ProviderName, newConfig.Model);
    }

    /// <summary>
    /// 非流式 Chat API 调用 — 支持 function calling
    /// </summary>
    public async Task<ChatCompletionResponse?> ChatAsync(
        List<AgentMessage> messages,
        List<object>? tools = null)
    {
        var config = GetConfigWithKey();

        var payload = new Dictionary<string, object>
        {
            ["model"] = config.Model,
            ["messages"] = messages,
        };

        if (tools != null && tools.Count > 0)
            payload["tools"] = tools;

        if (config.Temperature > 0)
            payload["temperature"] = config.Temperature;

        if (config.MaxTokens > 0)
            payload["max_tokens"] = config.MaxTokens;

        try
        {
            var client = _httpClientFactory.CreateClient("LlmProvider");
            client.Timeout = TimeSpan.FromSeconds(120);

            var json = JsonSerializer.Serialize(payload, SerializerOptions);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            using var request = new HttpRequestMessage(HttpMethod.Post,
                $"{config.BaseUrl.TrimEnd('/')}/chat/completions");
            request.Headers.Add("Authorization", $"Bearer {config.ApiKey}");
            request.Content = content;

            var response = await client.SendAsync(request);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                Console.Error.WriteLine($"[LlmProviderService] Chat API 错误 ({response.StatusCode}): {responseBody.Truncate(500)}");
                return null;
            }

            return JsonSerializer.Deserialize<ChatCompletionResponse>(responseBody, SerializerOptions);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[LlmProviderService] ChatAsync 失败: {ex.Message}");
            return null;
        }
    }

    /// <summary>
    /// 流式 Chat API 调用 — 返回 SSE 字符串流
    /// </summary>
    public async IAsyncEnumerable<string> ChatStreamAsync(
        List<AgentMessage> messages,
        List<object>? tools = null)
    {
        var config = GetConfigWithKey();

        var payload = new Dictionary<string, object>
        {
            ["model"] = config.Model,
            ["messages"] = messages,
            ["stream"] = true,
        };

        if (tools != null && tools.Count > 0)
            payload["tools"] = tools;

        if (config.Temperature > 0)
            payload["temperature"] = config.Temperature;

        if (config.MaxTokens > 0)
            payload["max_tokens"] = config.MaxTokens;

        // 分离连接与 yield：try/catch 内不能 yield return
        var connectResult = await ConnectStreamAsync(config, payload);
        if (connectResult.Error != null)
        {
            yield return connectResult.Error;
            yield break;
        }

        var reader = connectResult.Reader!;
        while (true)
        {
            string? line;
            try
            {
                line = await reader.ReadLineAsync();
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[LlmProviderService] SSE 读取失败: {ex.Message}");
                yield break;
            }

            if (line == null) break;
            if (line.StartsWith("data: "))
            {
                var data = line.Substring(6).Trim();
                if (data == "[DONE]") break;
                yield return data;
            }
        }
    }

    private async Task<(StreamReader? Reader, string? Error)> ConnectStreamAsync(
        LlmProviderConfig config,
        Dictionary<string, object> payload)
    {
        try
        {
            var client = _httpClientFactory.CreateClient("LlmProvider");
            client.Timeout = TimeSpan.FromSeconds(300);

            var json = JsonSerializer.Serialize(payload, SerializerOptions);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            using var request = new HttpRequestMessage(HttpMethod.Post,
                $"{config.BaseUrl.TrimEnd('/')}/chat/completions");
            request.Headers.Add("Authorization", $"Bearer {config.ApiKey}");
            request.Content = content;

            var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync();
                Console.Error.WriteLine($"[LlmProviderService] ChatStream API 错误 ({response.StatusCode}): {errorBody.Truncate(500)}");
                return (null, JsonSerializer.Serialize(new { error = $"LLM 调用失败: {response.StatusCode}" }));
            }

            var reader = new StreamReader(await response.Content.ReadAsStreamAsync());
            return (reader, null);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[LlmProviderService] ChatStreamAsync 连接失败: {ex.Message}");
            return (null, JsonSerializer.Serialize(new { error = $"连接 LLM 失败: {ex.Message}" }));
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 私有方法
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
            _logger.LogInformation("[LlmProviderService] 使用用户自定义配置: Provider={Provider}, Model={Model}",
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
            _logger.LogInformation("[LlmProviderService] 使用环境变量配置: BaseUrl={BaseUrl}, Model={Model}",
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
        _logger.LogInformation("[LlmProviderService] 使用内置 Agnes 免费 API");
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
                    Console.Error.WriteLine($"[LlmProviderService] DPAPI 解密 apiKey 失败: {ex.Message}");
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
            Console.Error.WriteLine($"[LlmProviderService] 加载用户配置失败: {ex.Message}");
            return null;
        }
    }
}

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