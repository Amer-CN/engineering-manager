using System.Collections.Generic;
using System.Runtime.CompilerServices;
using System.Text.Json;
using System.Text.Json.Serialization;
using EngineeringManager.Api.Models;
using EngineeringManager.Api.Services;

namespace EngineeringManager.Tests.Common;

/// <summary>
/// 可控的 LLM 测试替身 — 实现 ILlmChatService。
///
/// 行为：
///   ChatAsync 第 1 次调用：返回 tool_call(searchKnowledgeBase)
///   ChatAsync 第 2 次调用：返回最终文本回答（无 tool_calls）
///   ChatStreamAsync：返回最终文本的 chunk 流
///
/// 记录每轮请求的完整消息列表，供测试断言验证。
/// </summary>
public class FakeLlmChatService : ILlmChatService
{
    private readonly string _firstRoundToolCallQuery;
    private readonly string _firstRoundToolCallTopK;
    private readonly string _finalAnswer;
    private readonly string _streamFinalAnswer;
    private int _chatCallCount = 0;
    private readonly List<List<AgentMessage>> _recordedRequests = new();

    /// <summary>所有记录的 ChatAsync 请求消息列表</summary>
    public IReadOnlyList<List<AgentMessage>> RecordedRequests => _recordedRequests;

    public FakeLlmChatService(
        string firstRoundToolCallQuery = "上次跟温总说的预算是多少",
        string firstRoundToolCallTopK = "5",
        string finalAnswer = "上次沟通中，温总提到项目大概三十万。来源：温总项目沟通录音；原文：温总说这个项目大概搞三十万，材料和人工都算在里面。",
        string? streamFinalAnswer = null)
    {
        _firstRoundToolCallQuery = firstRoundToolCallQuery;
        _firstRoundToolCallTopK = firstRoundToolCallTopK;
        _finalAnswer = finalAnswer;
        _streamFinalAnswer = streamFinalAnswer ?? finalAnswer;
    }

    public Task<ChatCompletionResponse?> ChatAsync(
        List<AgentMessage> messages,
        List<object>? tools = null,
        string? model = null,
        string? reasoningEffort = null)
    {
        // 深拷贝记录请求
        var recorded = new List<AgentMessage>(messages.Count);
        foreach (var m in messages)
        {
            recorded.Add(m);
        }
        _recordedRequests.Add(recorded);
        _chatCallCount++;

        if (_chatCallCount == 1)
        {
            // 第一轮：返回 searchKnowledgeBase tool_call
            return Task.FromResult<ChatCompletionResponse?>(new ChatCompletionResponse
            {
                Id = $"fake-call-{_chatCallCount}",
                Choices = new List<ChatChoice>
                {
                    new()
                    {
                        Index = 0,
                        Message = new ChatResponseMessage
                        {
                            Role = "assistant",
                            Content = null,
                            ToolCalls = new List<ToolCall>
                            {
                                new()
                                {
                                    Id = "call-001",
                                    Type = "function",
                                    Function = new ToolCallFunction
                                    {
                                        Name = "searchKnowledgeBase",
                                        Arguments = $$"""{"query":"{{_firstRoundToolCallQuery}}","topK":{{_firstRoundToolCallTopK}}}""",
                                    },
                                }
                            }
                        },
                        FinishReason = "tool_calls",
                    }
                }
            });
        }

        // 第二轮及之后：返回最终文本回答
        return Task.FromResult<ChatCompletionResponse?>(new ChatCompletionResponse
        {
            Id = $"fake-call-{_chatCallCount}",
            Choices = new List<ChatChoice>
            {
                new()
                {
                    Index = 0,
                    Message = new ChatResponseMessage
                    {
                        Role = "assistant",
                        Content = _finalAnswer,
                        ToolCalls = null,
                    },
                    FinishReason = "stop",
                }
            }
        });
    }

    public async IAsyncEnumerable<string> ChatStreamAsync(
        List<AgentMessage> messages,
        List<object>? tools = null,
        string? model = null,
        string? reasoningEffort = null)
    {
        // 记录请求
        _recordedRequests.Add(new List<AgentMessage>(messages));

        // 返回最终文本作为一个 chunk
        var chunk = new
        {
            id = "fake-stream-1",
            @object = "chat.completion.chunk",
            created = 0,
            model = "fake",
            choices = new[]
            {
                new
                {
                    index = 0,
                    delta = new { content = _streamFinalAnswer },
                    finish_reason = "stop" as string,
                }
            }
        };

        yield return JsonSerializer.Serialize(chunk);

        // [DONE] marker
        var doneChunk = new
        {
            id = "fake-stream-done",
            @object = "chat.completion.chunk",
            created = 0,
            model = "fake",
            choices = new[]
            {
                new
                {
                    index = 0,
                    delta = new { },
                    finish_reason = "stop" as string,
                }
            }
        };

        yield return JsonSerializer.Serialize(doneChunk);

        await Task.CompletedTask;
    }

    /// <summary>重置调用计数和记录（在测试间复用实例时使用）</summary>
    public void Reset()
    {
        _chatCallCount = 0;
        _recordedRequests.Clear();
    }
}
