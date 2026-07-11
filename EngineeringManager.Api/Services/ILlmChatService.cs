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
    Task<ChatCompletionResponse?> ChatAsync(
        List<AgentMessage> messages,
        List<object>? tools = null);

    /// <summary>
    /// 流式 Chat API 调用 — 返回 SSE 字符串流
    /// </summary>
    IAsyncEnumerable<string> ChatStreamAsync(
        List<AgentMessage> messages,
        List<object>? tools = null);
}
