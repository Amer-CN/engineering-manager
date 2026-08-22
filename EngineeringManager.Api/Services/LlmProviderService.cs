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
/// 线程安全：配置读写由 LlmConfigResolver 管理
/// </summary>
public class LlmProviderService : ILlmChatService
{
    private readonly ILogger<LlmProviderService> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IModelRouter _router;
    private readonly LlmConfigResolver _configResolver;

    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public LlmProviderService(
        ILogger<LlmProviderService> logger,
        IHttpClientFactory httpClientFactory,
        IModelRouter router,
        LlmConfigResolver configResolver)
    {
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _router = router;
        _configResolver = configResolver;
    }

    // ═══════════════════════════════════════════════════════════
    // 公开方法
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 获取当前生效配置（不含 apiKey，安全返回给前端）
    /// </summary>
    public LlmProviderConfig GetConfig()
    {
        return _configResolver.GetConfig();
    }

    /// <summary>
    /// 获取当前生效配置（含 apiKey，内部使用）
    /// </summary>
    public LlmProviderConfig GetConfigWithKey()
    {
        return _configResolver.GetConfigWithKey();
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
            var config = _configResolver.GetConfigWithKey();
            var (ok, _, _) = await TestConnectionAsync(
                config.BaseUrl,
                config.ApiKey);
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
        await _configResolver.ReloadConfigAsync();
    }

    /// <summary>
    /// 保存用户自定义配置（DPAPI 加密 apiKey，存到 llm-config.dpapi.json）
    /// 如果 newConfig.ApiKey 为空，保留旧 key（避免前端只改 model 时把 key 清空）
    /// </summary>
    public async Task SaveUserConfigAsync(LlmProviderConfig newConfig)
    {
        await _configResolver.SaveUserConfigAsync(newConfig);
        _logger.LogInformation("[LlmProviderService] 用户配置已保存: Provider={Provider}, Model={Model}",
            newConfig.ProviderName, newConfig.Model);
    }

    /// <summary>
    /// 非流式 Chat API 调用 — 支持 function calling
    /// </summary>
    public async Task<ChatCompletionResponse?> ChatAsync(
        List<AgentMessage> messages,
        List<object>? tools = null,
        string? model = null,
        string? reasoningEffort = null)
    {
        var route = _router.GetRoute("chat");

        var payload = new Dictionary<string, object>
        {
            ["model"] = model ?? route.Model,
            ["messages"] = messages,
        };

        if (tools != null && tools.Count > 0)
            payload["tools"] = tools;

        if (route.Temperature > 0)
            payload["temperature"] = route.Temperature;

        if (route.MaxTokens > 0)
            payload["max_tokens"] = route.MaxTokens;

        // 推理档位（仅显式传入时携带；2026-08-22 实测 Agnes 合法值：
        // none/low/medium/high/max——非法值 400 拒。前端 off 档此处置空不发 = none 行为）
        if (!string.IsNullOrWhiteSpace(reasoningEffort) && reasoningEffort != "off")
            payload["reasoning_effort"] = reasoningEffort;

        AddAgnesThinkingParameters(route, payload);

        try
        {
            var client = _httpClientFactory.CreateClient("LlmProvider");
            client.Timeout = TimeSpan.FromSeconds(120);

            var json = JsonSerializer.Serialize(payload, SerializerOptions);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            using var request = new HttpRequestMessage(HttpMethod.Post,
                $"{route.BaseUrl.TrimEnd('/')}/chat/completions");
            request.Headers.Add("Authorization", $"Bearer {route.ApiKey}");
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
        List<object>? tools = null,
        string? model = null,
        string? reasoningEffort = null)
    {
        var route = _router.GetRoute("chat-stream");

        var payload = new Dictionary<string, object>
        {
            ["model"] = model ?? route.Model,
            ["messages"] = messages,
            ["stream"] = true,
        };

        if (tools != null && tools.Count > 0)
            payload["tools"] = tools;

        if (route.Temperature > 0)
            payload["temperature"] = route.Temperature;

        if (route.MaxTokens > 0)
            payload["max_tokens"] = route.MaxTokens;

        // 推理档位（仅显式传入时携带；2026-08-22 实测 Agnes 合法值：
        // none/low/medium/high/max——非法值 400 拒。前端 off 档此处置空不发 = none 行为）
        if (!string.IsNullOrWhiteSpace(reasoningEffort) && reasoningEffort != "off")
            payload["reasoning_effort"] = reasoningEffort;

        AddAgnesThinkingParameters(route, payload);

        // 分离连接与 yield：try/catch 内不能 yield return
        var connectResult = await ConnectStreamAsync(route, payload);
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

    /// <summary>
    /// 为内置 Agnes OpenAI 兼容请求启用 Thinking。
    /// Agnes 官方在 Chat Completions 格式中仅声明 chat_template_kwargs.enable_thinking；
    /// thinking.type / budget_tokens 属于 Anthropic 兼容格式，不能直接混入该请求。
    /// </summary>
    internal static void AddAgnesThinkingParameters(
        ModelRouteInfo route,
        Dictionary<string, object> payload)
    {
        if (!route.UseBuiltIn ||
            !route.Model.Equals("agnes-2.5-flash", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        payload["chat_template_kwargs"] = new Dictionary<string, object>
        {
            ["enable_thinking"] = true,
        };
    }

    private async Task<(StreamReader? Reader, string? Error)> ConnectStreamAsync(
        ModelRouteInfo route,
        Dictionary<string, object> payload)
    {
        try
        {
            var client = _httpClientFactory.CreateClient("LlmProvider");
            client.Timeout = TimeSpan.FromSeconds(300);

            var json = JsonSerializer.Serialize(payload, SerializerOptions);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            using var request = new HttpRequestMessage(HttpMethod.Post,
                $"{route.BaseUrl.TrimEnd('/')}/chat/completions");
            request.Headers.Add("Authorization", $"Bearer {route.ApiKey}");
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
    }