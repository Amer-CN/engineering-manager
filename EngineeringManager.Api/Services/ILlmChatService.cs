using EngineeringManager.Api.Models;

namespace EngineeringManager.Api.Services;

/// <summary>
/// LLM 聊天抽象接口 — 仅包含 Agent tool loop 所需的两个方法。
/// 生产实现由 LlmProviderService 提供（Singleton）。
/// 测试可通过注入 FakeLlmChatService 实现可控的端到端测试。
/// </summary>
public interface ILlmChatService
{
    /// <summary>
    /// 非流式 Chat API 调用 — 支持 function calling
    /// </summary>
    /// <param name="model">本次调用覆盖默认模型（null = 用配置默认）</param>
    /// <param name="reasoningEffort">推理档位 low/medium/high（null/空 = 不传；仅支持 reasoning 的模型生效）</param>
    /// <param name="ct">取消令牌 — 触发时中止底层 HTTP 请求（客户端断开/超时取消）</param>
    Task<ChatCompletionResponse?> ChatAsync(
        List<AgentMessage> messages,
        List<object>? tools = null,
        string? model = null,
        string? reasoningEffort = null,
        CancellationToken ct = default);

    /// <summary>
    /// 流式 Chat API 调用 — 返回 SSE 字符串流；取消令牌触发时流静默结束（不产出错误块）
    /// </summary>
    /// <param name="model">本次调用覆盖默认模型（null = 用配置默认）</param>
    /// <param name="reasoningEffort">推理档位 low/medium/high（null/空 = 不传）</param>
    /// <param name="ct">取消令牌 — 触发时中止底层 HTTP 请求与 SSE 读取（客户端断开/超时取消）</param>
    IAsyncEnumerable<string> ChatStreamAsync(
        List<AgentMessage> messages,
        List<object>? tools = null,
        string? model = null,
        string? reasoningEffort = null,
        CancellationToken ct = default);
}
