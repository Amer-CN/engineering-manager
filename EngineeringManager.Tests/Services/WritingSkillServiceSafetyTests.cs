using EngineeringManager.Api.Models;
using EngineeringManager.Api.Services;
using Xunit;

namespace EngineeringManager.Tests.Services;

/// <summary>
/// 写作中心 R8 起草安全单测（文件内自包含 stub，不动共享 FakeLlmChatService）：
///   · LLM 流含 {"error":"..."} 块 → StreamDraftAsync 抛 InvalidOperationException（消息含 error 文本）
///   · 正常 token 序列 → 拼接输出正确
///   · finish 块（choices[0] 无 delta）→ 静默跳过不误报
/// </summary>
public class WritingSkillServiceSafetyTests
{
    /// <summary>可配置 yield 序列的 ILlmChatService stub（未用成员抛 NotSupportedException）</summary>
    private sealed class StubLlmChatService : ILlmChatService
    {
        private readonly string[] _chunks;
        public List<AgentMessage>? LastMessages { get; private set; }

        public StubLlmChatService(params string[] chunks) => _chunks = chunks;

        public Task<ChatCompletionResponse?> ChatAsync(List<AgentMessage> messages, List<object>? tools = null)
            => throw new NotSupportedException();

        public async IAsyncEnumerable<string> ChatStreamAsync(List<AgentMessage> messages, List<object>? tools = null)
        {
            LastMessages = messages;
            foreach (var c in _chunks)
            {
                await Task.Yield();
                yield return c;
            }
        }
    }

    private static WritingDraftRequest Draft(string material = "2026年8月，项目部完成[[42]]个隐患整改。")
        => new(DocType: "summary", Title: "季度工作总结", Audience: null,
               Material: material, StyleId: "S1", DetailLevel: 3);

    private static string Delta(string content)
    {
        var json = System.Text.Json.JsonSerializer.Serialize(content);
        return "{\"choices\":[{\"index\":0,\"delta\":{\"content\":" + json + "}}]}";
    }

    private static string Err(string message)
    {
        var json = System.Text.Json.JsonSerializer.Serialize(message);
        return "{\"error\":" + json + "}";
    }

    [Fact]
    public async Task LLM错误块_流式起草应抛异常且消息含错误文本()
    {
        var stub = new StubLlmChatService(Delta("已生成"), Err("boom"));
        var svc = new WritingSkillService(stub);

        var ex = await Record.ExceptionAsync(async () =>
        {
            await foreach (var _ in svc.StreamDraftAsync(Draft())) { /* 消费全流 */ }
        });

        Assert.NotNull(ex);
        Assert.IsType<InvalidOperationException>(ex);
        Assert.Contains("boom", ex.Message);
    }

    [Fact]
    public async Task 正常token序列_输出拼接正确()
    {
        var stub = new StubLlmChatService(
            Delta("# 工作总结"),
            Delta("\n\n本月完成 "),
            Delta("42"),
            """{"choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}""");
        var svc = new WritingSkillService(stub);

        var parts = new List<string>();
        await foreach (var token in svc.StreamDraftAsync(Draft()))
            parts.Add(token);

        Assert.Equal("# 工作总结\n\n本月完成 42", string.Concat(parts));
    }

    [Fact]
    public async Task 全部块无内容_产出为空不抛异常()
    {
        var stub = new StubLlmChatService("{}");
        var svc = new WritingSkillService(stub);

        var parts = new List<string>();
        await foreach (var token in svc.StreamDraftAsync(Draft()))
            parts.Add(token);

        Assert.Empty(parts);
    }
}
