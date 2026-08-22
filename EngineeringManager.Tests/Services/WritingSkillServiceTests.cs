using EngineeringManager.Api.Models;
using EngineeringManager.Api.Services;
using Xunit;

namespace EngineeringManager.Tests.Services;

/// <summary>
/// 写作中心 skill 服务单测（W1 地基）：
///   · 内置三份 skill 资源可加载，文体/风格注册表完整
///   · 每个文体都能在 templates.md / SKILL.md 解析到模板正文（无缺失占位）
///   · draft/assist prompt 组装正确（含六层矩阵规则、风格规格、Protected Spans、文体模板）
///   · [[双括号]] 保护标记剥离
/// </summary>
public class WritingSkillServiceTests
{
    private readonly WritingSkillService _skill = new(new FakeLlm());

    private static WritingDraftRequest Draft(
        string docType = "summary",
        string style = "S1",
        string material = "2026年8月,项目部完成[[42]]个安全隐患整改。")
        => new(DocType: docType, Title: "季度工作总结", Audience: null,
               Material: material, StyleId: style, DetailLevel: 3);

    [Fact]
    public void 内置skill资源可加载且prompt非空()
    {
        var (system, user) = _skill.BuildDraftPrompts(Draft());
        Assert.False(string.IsNullOrWhiteSpace(system));
        Assert.False(string.IsNullOrWhiteSpace(user));
    }

    [Fact]
    public void 每个文体都能解析到模板正文_无缺失占位()
    {
        foreach (var dt in _skill.GetDocTypes())
        {
            var (system, _) = _skill.BuildDraftPrompts(Draft(docType: dt.Code));
            Assert.DoesNotContain("缺失", system);
            Assert.DoesNotContain("（技能区块", system);
            Assert.DoesNotContain("（文体模板", system);
        }
    }

    [Fact]
    public void 六种风格全部注册()
    {
        var styles = _skill.GetStyles();
        Assert.Equal(6, styles.Count);
        Assert.Equal(new[] { "S1", "S2", "S3", "S4", "S5", "S6" }, styles.Select(s => s.Id).ToArray());
    }

    [Fact]
    public void 文体注册表数量充足()
    {
        Assert.True(_skill.GetDocTypes().Count >= 25);
    }

    [Fact]
    public void 未知文体被拒绝()
    {
        Assert.False(_skill.TryGetDocType("not-a-type", out _));
        Assert.Throws<ArgumentException>(() => _skill.BuildDraftPrompts(Draft(docType: "not-a-type")));
    }

    [Fact]
    public void 未知风格被拒绝()
    {
        Assert.False(_skill.TryGetStyle("S99", out _));
        Assert.Throws<ArgumentException>(() => _skill.BuildDraftPrompts(Draft(style: "S99")));
    }

    [Fact]
    public void 起草prompt含六层矩阵规则_风格规格_文体模板()
    {
        var (system, _) = _skill.BuildDraftPrompts(Draft(docType: "minutes_news", style: "S5"));
        // 六层矩阵基因规则
        Assert.Contains("V+N", system);
        Assert.Contains("四大金刚", system);
        // 风格规格（本次指定 S5 高位对标型）
        Assert.Contains("S5 高位对标型", system);
        // 文体模板（T12 新闻型会议纪要特征词）
        Assert.Contains("会议指出", system);
        Assert.Contains("会议强调", system);
    }

    [Fact]
    public void 起草prompt含ProtectedSpans规则且素材中括号原样保留()
    {
        var (_, user) = _skill.BuildDraftPrompts(Draft(material: "完成[[3]]个重点项目"));
        Assert.Contains("Protected Spans", user);
        Assert.Contains("[[3]]", user);
    }

    [Fact]
    public void 起草prompt注入国标格式规范_行内改写不注入()
    {
        // format-spec.md 已作为第 4 份嵌入资源加载：draft system 含其全文特征，
        // 证明 LoadEmbedded("WritingSkill.format-spec.md") 成功
        var (draftSystem, _) = _skill.BuildDraftPrompts(Draft());
        Assert.Contains("GB/T 9704", draftSystem);
        Assert.Contains("仿宋_GB2312", draftSystem);
        Assert.Contains("28 磅", draftSystem);

        // 行内改写不需要版式规范：assist system 不含国标内容
        var req = new WritingAssistRequest("rewrite", "选中文字",
            CustomInstruction: null, DocType: "summary", StyleId: "S1", ContextBefore: null, ProtectedSpans: null);
        var (assistSystem, _) = _skill.BuildAssistPrompts(req);
        Assert.DoesNotContain("GB/T 9704", assistSystem);
    }

    [Fact]
    public void 素材超长被截断到上限()
    {
        var (_, user) = _skill.BuildDraftPrompts(Draft(material: new string('甲', 22000)));
        Assert.DoesNotContain(new string('甲', WritingSkillService.DraftMaxChars + 1), user);
    }

    [Fact]
    public void 行内改写prompt按指令与保护区间组装()
    {
        var req = new WritingAssistRequest(
            Instruction: "shorten", SelectedText: "本项目由公司领导高度重视并积极推进。",
            CustomInstruction: null, DocType: "summary", StyleId: "S3",
            ContextBefore: "上文内容。", ProtectedSpans: new[] { "128.5万元" });
        var (_, user) = _skill.BuildAssistPrompts(req);
        Assert.Contains("缩写", user);          // BuildInstruction(shorten) 文案
        Assert.Contains("128.5万元", user);     // Protected Spans 原样入提示
        Assert.Contains("本项目", user);        // 所选文字
        Assert.Contains("上文内容", user);      // 前文上下文
    }

    [Fact]
    public void 自定义指令使用提供的说明()
    {
        var req = new WritingAssistRequest("custom", "选中文字",
            CustomInstruction: "改成大白话", DocType: null, StyleId: null, ContextBefore: null, ProtectedSpans: null);
        var (_, user) = _skill.BuildAssistPrompts(req);
        Assert.Contains("改成大白话", user);
    }

    [Fact]
    public void 未知指令回退到通用改写()
    {
        var req = new WritingAssistRequest("whatever", "选中文字",
            CustomInstruction: null, DocType: null, StyleId: null, ContextBefore: null, ProtectedSpans: null);
        var (_, user) = _skill.BuildAssistPrompts(req);
        Assert.Contains("更符合公文规范", user);
    }

    [Fact]
    public void 保护标记被剥离保留实体()
    {
        var input = "本周完成 [[3]] 个重点项目，投入资金 [[128.5万元]]。";
        var cleaned = WritingSkillService.StripProtectedMarkers(input);
        Assert.Equal("本周完成 3 个重点项目，投入资金 128.5万元。", cleaned);
        Assert.DoesNotContain("[[", cleaned);
    }

    [Fact]
    public void 已有歧义方框不误剥()
    {
        // 仅成对的 [[ ]] 被剥；孤立的单个 [ 不受影响
        var input = "参见 [[附件一]] 与 [说明]";
        var cleaned = WritingSkillService.StripProtectedMarkers(input);
        Assert.Equal("参见 附件一 与 [说明]", cleaned);
    }

    [Fact]
    public void 可用指令白名单完整()
    {
        Assert.Equal(
            new[] { "rewrite", "polish", "expand", "shorten", "custom" },
            WritingSkillService.AssistInstructions);
    }

    // ═══════════ 私有 Fake ═══════════

    /// <summary>仅用于构造 WritingSkillService；prompt 组装测试不触发 LLM 调用</summary>
    private sealed class FakeLlm : ILlmChatService
    {
        public Task<ChatCompletionResponse?> ChatAsync(List<AgentMessage> messages, List<object>? tools = null, string? model = null, string? reasoningEffort = null)
            => Task.FromResult<ChatCompletionResponse?>(null);

        public async IAsyncEnumerable<string> ChatStreamAsync(List<AgentMessage> messages, List<object>? tools = null, string? model = null, string? reasoningEffort = null)
        {
            await Task.CompletedTask;
            yield break;
        }
    }
}