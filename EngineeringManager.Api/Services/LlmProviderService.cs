using System.Collections.Concurrent;
using System.Data;
using System.Net;
using System.Runtime.CompilerServices;
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

    /// <summary>代理 HttpClient 缓存（按规范化代理地址复用，避免频繁建连耗尽端口）</summary>
    private static readonly ConcurrentDictionary<string, HttpClient> ProxyClients = new();

    /// <summary>
    /// 规范化代理地址：空 = null（直连）；缺 scheme 补 http://；非法 = null + 告警
    /// </summary>
    internal static string? NormalizeProxyUrl(string? proxyUrl)
    {
        if (string.IsNullOrWhiteSpace(proxyUrl)) return null;
        var p = proxyUrl.Trim();
        if (!p.Contains("://", StringComparison.Ordinal)) p = "http://" + p;
        if (!Uri.TryCreate(p, UriKind.Absolute, out var uri)
            || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
        {
            Console.Error.WriteLine($"[LlmProviderService] 代理地址无效，按直连处理: {proxyUrl.Truncate(100)}");
            return null;
        }
        return p;
    }

    /// <summary>
    /// 按代理地址取 HttpClient：无代理走工厂命名客户端；有代理走缓存的双缀客户端（HttpClientHandler.Proxy）。
    /// 实例 Timeout 统一为 Infinite——缓存实例发出首个请求后属性不可再改（复改抛
    /// "Properties can only be modified before sending the first request"），超时由调用处每请求 CTS 控制。
    /// </summary>
    private HttpClient BuildClient(string? proxyUrl)
    {
        var normalized = NormalizeProxyUrl(proxyUrl);
        if (normalized == null)
        {
            var plain = _httpClientFactory.CreateClient("LlmProvider");
            plain.Timeout = Timeout.InfiniteTimeSpan;
            return plain;
        }
        return ProxyClients.GetOrAdd(normalized, addr => new HttpClient(
            new HttpClientHandler { Proxy = new WebProxy(addr), UseProxy = true })
        { Timeout = Timeout.InfiniteTimeSpan });
    }

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
        string baseUrl, string apiKey, string? proxyUrl = null)
    {
        try
        {
            // 共享缓存的代理客户端不可 dispose；直连走工厂客户端（handler 由工厂管理）
            var client = BuildClient(proxyUrl);
            using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(30));

            using var request = new HttpRequestMessage(HttpMethod.Get,
                $"{baseUrl.TrimEnd('/')}/models");
            request.Headers.Add("Authorization", $"Bearer {apiKey}");

            var response = await client.SendAsync(request, timeoutCts.Token);
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
                config.ApiKey,
                config.ProxyUrl);
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
    /// 获取完整多服务商配置（含各 provider 明文 apiKey）— 仅供 /api/agent/config 投影返回
    /// </summary>
    public MultiProviderConfig GetMultiConfig()
    {
        return _configResolver.GetMultiWithKey();
    }

    /// <summary>
    /// 保存多服务商配置（DPAPI 逐 provider 加密 apiKey，存到 llm-config.dpapi.json）
    /// ApiKey 为空的 provider 自动保留旧 key（前端出于安全不回显密钥）
    /// </summary>
    public async Task SaveMultiConfigAsync(MultiProviderConfig newMulti)
    {
        await _configResolver.SaveMultiConfigAsync(newMulti);
        _logger.LogInformation("[LlmProviderService] 多服务商配置已保存: Providers={Count}, Active={Active}",
            newMulti.Providers.Count, newMulti.ActiveProviderId);
    }

    /// <summary>
    /// 非流式 Chat API 调用 — 支持 function calling
    /// </summary>
    /// <param name="ct">取消令牌 — 触发时中止底层 HTTP 请求（HttpClient 层取消）</param>
    public async Task<ChatCompletionResponse?> ChatAsync(
        List<AgentMessage> messages,
        List<object>? tools = null,
        string? model = null,
        string? reasoningEffort = null,
        CancellationToken ct = default)
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
            var client = BuildClient(route.ProxyUrl);
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(120));

            var json = JsonSerializer.Serialize(payload, SerializerOptions);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            using var request = new HttpRequestMessage(HttpMethod.Post,
                $"{route.BaseUrl.TrimEnd('/')}/chat/completions");
            request.Headers.Add("Authorization", $"Bearer {route.ApiKey}");
            request.Content = content;

            using var response = await client.SendAsync(request, timeoutCts.Token);
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
    /// 流式 Chat API 调用 — 返回 SSE 字符串流；取消令牌触发时流静默结束（正常取消不是错误）
    /// </summary>
    /// <param name="ct">取消令牌 — 触发时中止连接与 SSE 读取，流静默结束</param>
    public async IAsyncEnumerable<string> ChatStreamAsync(
        List<AgentMessage> messages,
        List<object>? tools = null,
        string? model = null,
        string? reasoningEffort = null,
        [EnumeratorCancellation] CancellationToken ct = default)
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

        // 分离连接与 yield：错误/取消经 ConnectStreamAsync 返回值传递（try/catch 内不能 yield return）；
        // timeoutCts 非空时由本方法持有（using），SSE 总超时 300s 覆盖到读取结束
        var (reader, connectError, timeoutCts) = await ConnectStreamAsync(route, payload, ct);
        if (timeoutCts != null)
        {
            using var _ = timeoutCts;
            if (reader == null)
            {
                // Reader 为 null：connectError 非 null = 连接失败（下发错误块）；
                // 均为 null = 正常取消（客户端断开/超时取消）→ 静默结束流，不产出错误块
                if (connectError != null)
                    yield return connectError;
                yield break;
            }

            while (true)
            {
                string? line;
                try
                {
                    line = await reader!.ReadLineAsync(timeoutCts.Token);
                }
                catch (OperationCanceledException)
                {
                    // 正常取消不是错误（客户端断开/超时取消）：仅 Debug 级留痕，静默结束流
                    _logger.LogDebug("[LlmProviderService] SSE 读取被取消（客户端断开/超时），静默结束流");
                    yield break;
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine($"[LlmProviderService] SSE 读取失败: {ex.Message}");
                    yield break;
                }
                finally
                {
                    // F6(审计): 无论正常结束/取消/错误，reader 与底层响应流必须释放——
                    // ResponseHeadersRead 模式下 response 流持有连接直到 dispose，泄漏的 socket 只能等 GC 终结器
                    reader?.Dispose();
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
        else if (connectError != null)
        {
            yield return connectError;
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

    private async Task<(StreamReader? Reader, string? Error, CancellationTokenSource? TimeoutCts)> ConnectStreamAsync(
        ModelRouteInfo route,
        Dictionary<string, object> payload,
        CancellationToken ct)
    {
        try
        {
            var client = BuildClient(route.ProxyUrl);
            var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(300));

            var json = JsonSerializer.Serialize(payload, SerializerOptions);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            using var request = new HttpRequestMessage(HttpMethod.Post,
                $"{route.BaseUrl.TrimEnd('/')}/chat/completions");
            request.Headers.Add("Authorization", $"Bearer {route.ApiKey}");
            request.Content = content;

            var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, timeoutCts.Token);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync();
                timeoutCts.Dispose();
                Console.Error.WriteLine($"[LlmProviderService] ChatStream API 错误 ({response.StatusCode}): {errorBody.Truncate(500)}");
                return (null, JsonSerializer.Serialize(new { error = $"LLM 调用失败: {response.StatusCode}" }), null);
            }

            var reader = new StreamReader(await response.Content.ReadAsStreamAsync());
            return (reader, null, timeoutCts);
        }
        catch (Exception ex)
        {
            // 客户端断开/超时触发的取消是正常流程，不是错误：以取消语义返回 (null, null, null)，
            // 由 ChatStreamAsync 静默结束流（不记错误日志、不产出错误块）。
            // 仅用户取消走静默；300s 超时（OCE 但 ct 未触发）仍按连接失败返回错误块。
            if (ex is OperationCanceledException && ct.IsCancellationRequested)
                return (null, null, null);
            Console.Error.WriteLine($"[LlmProviderService] ChatStreamAsync 连接失败: {ex.Message}");
            return (null, JsonSerializer.Serialize(new { error = $"连接 LLM 失败: {ex.Message}" }), null);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 私有方法
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    }