using EngineeringManager.Api.Models;
using EngineeringManager.Api.Services;
using Xunit;

namespace EngineeringManager.Tests.Services;

/// <summary>
/// 写作中心三期 T1 — AI 起草联动知识库：
///   · KnowledgeDraftAugmenter 单测（检索委托 stub）：命中拼格式 / 无命中 null /
///     委托异常 null / 3 秒超时 null / 空素材不调委托 / RrfScore 排序取前 3 + 片段截断
///   · StreamDraftAsync 增强注入（stub LLM 捕获 messages）：命中注入【公司知识库参考】区块 /
///     null augmenter 时 prompt 无区块且与无增强版本逐字节一致
/// stub LLM 照 WritingSkillServiceSafetyTests 的 StubLlmChatService 模式（文件内自带，不动共享 FakeLlmChatService）。
/// </summary>
public class WritingKnowledgeAugmentTests
{
    // ─────────────────────────────────────────────────────────────
    // stub：检索委托 / LLM
    // ─────────────────────────────────────────────────────────────

    /// <summary>可配置返回的检索委托 stub，并记录调用参数</summary>
    private sealed class StubSearch
    {
        public int CallCount;
        public (string query, int topK, string? userId, bool isAdmin)? LastArgs;
        private readonly Func<string, int, string?, bool, Task<SearchResult>> _impl;

        public StubSearch(Func<string, int, string?, bool, Task<SearchResult>> impl) => _impl = impl;

        public Task<SearchResult> Invoke(string query, int topK, string? userId, bool isAdmin)
        {
            CallCount++;
            LastArgs = (query, topK, userId, isAdmin);
            return _impl(query, topK, userId, isAdmin);
        }
    }

    /// <summary>
    /// 可配置 yield 序列的 ILlmChatService stub（照 SafetyTests 双签名兼容模式，
    /// 逻辑集中在 4 参版，2 参转发；ChatAsync 恒返回 null）。
    /// </summary>
    private sealed class StubLlmChatService : ILlmChatService
    {
        private readonly string[] _chunks;
        public List<AgentMessage>? LastMessages { get; private set; }

        public StubLlmChatService(params string[] chunks) => _chunks = chunks;

        public Task<ChatCompletionResponse?> ChatAsync(List<AgentMessage> messages, List<object>? tools = null, string? model = null, string? reasoningEffort = null, CancellationToken ct = default)
            => Task.FromResult<ChatCompletionResponse?>(null);

        public Task<ChatCompletionResponse?> ChatAsync(List<AgentMessage> messages, List<object>? tools = null)
            => ChatAsync(messages, tools, null, null);

        public async IAsyncEnumerable<string> ChatStreamAsync(List<AgentMessage> messages, List<object>? tools = null, string? model = null, string? reasoningEffort = null, [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct = default)
        {
            LastMessages = messages;
            foreach (var c in _chunks)
            {
                await Task.Yield();
                yield return c;
            }
        }

        public async IAsyncEnumerable<string> ChatStreamAsync(List<AgentMessage> messages, List<object>? tools = null)
        {
            await foreach (var token in ChatStreamAsync(messages, tools, null, null)) yield return token;
        }
    }

    private static SearchResult Result(params ChunkMatch[] hits) => new()
    {
        Query = "q",
        TotalHits = hits.Length,
        Hits = hits.ToList(),
    };

    private static ChunkMatch Hit(string text, double rrf, string? title = null) => new()
    {
        Text = text,
        RrfScore = rrf,
        DocTitle = title,
    };

    private static WritingDraftRequest Draft(string material = "2026年8月，项目部完成[[42]]个隐患整改。")
        => new(DocType: "summary", Title: "季度工作总结", Audience: null,
               Material: material, StyleId: "S1", DetailLevel: 3);

    private const string Snippet = "第三季度安全检查共发现并整改隐患 42 个。";

    // ─────────────────────────────────────────────────────────────
    // KnowledgeDraftAugmenter 单测
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task 有命中时返回格式化区块_含标题与片段()
    {
        var stub = new StubSearch((q, k, u, a) => Task.FromResult(Result(Hit(Snippet, 0.9, "安全检查月报"))));
        var augmenter = new KnowledgeDraftAugmenter(stub.Invoke);

        var augment = await augmenter.BuildAugmentAsync("安全检查 隐患整改", "u1", false, CancellationToken.None);

        Assert.NotNull(augment);
        Assert.StartsWith("【公司知识库参考】", augment);
        Assert.Contains("《安全检查月报》", augment);
        Assert.Contains(Snippet, augment);
        Assert.Contains("[1]", augment);
    }

    [Fact]
    public async Task 有命中时检索参数正确_素材截断200字_topK3()
    {
        var material = new string('隐', 350);
        var stub = new StubSearch((q, k, u, a) => Task.FromResult(Result(Hit(Snippet, 0.5, "t"))));
        var augmenter = new KnowledgeDraftAugmenter(stub.Invoke);

        await augmenter.BuildAugmentAsync(material, "user-9", true, CancellationToken.None);

        Assert.Equal(1, stub.CallCount);
        Assert.Equal(200, stub.LastArgs!.Value.query.Length);
        Assert.Equal(3, stub.LastArgs.Value.topK);
        Assert.Equal("user-9", stub.LastArgs.Value.userId);
        Assert.True(stub.LastArgs.Value.isAdmin);
    }

    [Fact]
    public async Task 无命中时返回null()
    {
        var stub = new StubSearch((q, k, u, a) => Task.FromResult(new SearchResult()));
        var augmenter = new KnowledgeDraftAugmenter(stub.Invoke);

        var augment = await augmenter.BuildAugmentAsync("安全检查", "u1", false, CancellationToken.None);

        Assert.Null(augment);
    }

    [Fact]
    public async Task 检索委托抛异常时返回null()
    {
        var stub = new StubSearch((q, k, u, a) => throw new InvalidOperationException("kb down"));
        var augmenter = new KnowledgeDraftAugmenter(stub.Invoke);

        var augment = await augmenter.BuildAugmentAsync("安全检查", "u1", false, CancellationToken.None);

        Assert.Null(augment);
    }

    [Fact]
    public async Task 检索超过3秒时返回null()
    {
        var stub = new StubSearch((q, k, u, a) => Task.Delay(TimeSpan.FromSeconds(10)).ContinueWith(_ => Result(Hit(Snippet, 1.0))));
        var augmenter = new KnowledgeDraftAugmenter(stub.Invoke);

        var watch = System.Diagnostics.Stopwatch.StartNew();
        var augment = await augmenter.BuildAugmentAsync("安全检查", "u1", false, CancellationToken.None);
        watch.Stop();

        Assert.Null(augment);
        Assert.True(watch.Elapsed < TimeSpan.FromSeconds(10), $"超时保护应在 3s 生效，实际耗时 {watch.Elapsed}");
    }

    [Fact]
    public async Task 空素材不调检索委托返回null()
    {
        var stub = new StubSearch((q, k, u, a) => Task.FromResult(Result(Hit(Snippet, 1.0, "t"))));
        var augmenter = new KnowledgeDraftAugmenter(stub.Invoke);

        var augment = await augmenter.BuildAugmentAsync("   ", "u1", false, CancellationToken.None);

        Assert.Null(augment);
        Assert.Equal(0, stub.CallCount);
    }

    [Fact]
    public async Task 多命中按RrfScore降序取前3_片段截断300字()
    {
        var longText = new string('内', 400);
        var stub = new StubSearch((q, k, u, a) => Task.FromResult(Result(
            Hit(Snippet, 0.3, "低分文档"),
            Hit(longText, 0.9, "高分长文"),
            Hit("中分片段", 0.6, "中分文档"),
            Hit("第4条不该出现", 0.2, "落选文档"),
            Hit("第5条不该出现", 0.1, "落选文档2"))));
        var augmenter = new KnowledgeDraftAugmenter(stub.Invoke);

        var augment = await augmenter.BuildAugmentAsync("安全检查", "u1", false, CancellationToken.None);

        Assert.NotNull(augment);
        // 按 RrfScore 降序：高分长文 → 中分文档 → 低分文档；落选文档不得出现
        var lines = augment!.Split('\n').Where(l => l.StartsWith('[')).ToArray();
        Assert.Equal(3, lines.Length);
        Assert.StartsWith("[1] 《高分长文》: ", lines[0]);
        Assert.StartsWith("[2] 《中分文档》: ", lines[1]);
        Assert.StartsWith("[3] 《低分文档》: ", lines[2]);
        // 400 字片段截断为 300 字
        Assert.Contains(new string('内', 300), augment);
        Assert.DoesNotContain(new string('内', 301), augment);
        Assert.DoesNotContain("落选文档", augment);
    }

    // ─────────────────────────────────────────────────────────────
    // StreamDraftAsync 增强注入集成测
    // ─────────────────────────────────────────────────────────────

    private static string Delta(string content)
    {
        var json = System.Text.Json.JsonSerializer.Serialize(content);
        return "{\"choices\":[{\"index\":0,\"delta\":{\"content\":" + json + "}}]}";
    }

    private sealed class FixedAugmenter : IKnowledgeDraftAugmenter
    {
        private readonly string? _value;
        public FixedAugmenter(string? value) => _value = value;
        public Task<string?> BuildAugmentAsync(string material, string? userId, bool isAdmin, CancellationToken ct)
            => Task.FromResult(_value);
    }

    [Fact]
    public async Task 注入augmenter时_用户prompt含知识库参考区块与片段()
    {
        var stub = new StubLlmChatService(Delta("已生成"));
        var kb = new FixedAugmenter(
            "【公司知识库参考】（以下为系统自动检索的相关资料片段，可信度低于用户素材，仅供参考，不得虚构其中未出现的数据）\n[1] 《安全检查月报》: " + Snippet);
        var svc = new WritingSkillService(stub, kb);

        await foreach (var _ in svc.StreamDraftAsync(Draft(), "u1", false)) { /* 消费全流 */ }

        var user = stub.LastMessages!.Single(m => m.Role == MessageRole.User).Content;
        Assert.Contains("【公司知识库参考】", user);
        Assert.Contains("《安全检查月报》", user);
        Assert.Contains(Snippet, user);
    }

    [Fact]
    public async Task 无augmenter时_用户prompt不含区块且与无增强版本逐字节一致()
    {
        var stubPlain = new StubLlmChatService(Delta("已生成"));
        var stubNull = new StubLlmChatService(Delta("已生成"));
        var plain = new WritingSkillService(stubPlain);            // 无增强（现状）
        var withNull = new WritingSkillService(stubNull, new FixedAugmenter(null)); // 增强器返回 null

        await foreach (var _ in plain.StreamDraftAsync(Draft(), "u1", false)) { }
        await foreach (var _ in withNull.StreamDraftAsync(Draft(), "u1", false)) { }

        var plainUser = stubPlain.LastMessages!.Single(m => m.Role == MessageRole.User).Content;
        var nullUser = stubNull.LastMessages!.Single(m => m.Role == MessageRole.User).Content;

        Assert.DoesNotContain("【公司知识库参考】", plainUser);
        Assert.Equal(plainUser, nullUser); // 增强为 null 与无增强现状逐字节一致
    }
}
