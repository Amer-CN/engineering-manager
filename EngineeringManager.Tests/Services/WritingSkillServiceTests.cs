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
    public void T19T20T21三个新文种已注册且模板可解析()
    {
        // T19 政府工作报告（大材料）/ T20 个人周报（成稿级）/ T21 月度总结（月结）
        var expected = new (string code, string label, string group)[]
        {
            ("report_gov_full", "政府工作报告（大材料）", "简报总结"),
            ("weekly_full", "个人周报（成稿级）", "周报汇报"),
            ("monthly_summary", "月度总结（月结）", "周报汇报"),
        };
        foreach (var (code, label, group) in expected)
        {
            Assert.True(_skill.TryGetDocType(code, out var dt), $"文体 {code} 未注册");
            Assert.Equal(label, dt.Label);
            Assert.Equal(group, dt.Group);
            var (system, _) = _skill.BuildDraftPrompts(Draft(docType: code));
            Assert.DoesNotContain("缺失", system);
            Assert.DoesNotContain("（文体模板", system);
        }
        // 模板正文各自命中 T19/T20/T21 章的特征内容
        var (gov, _) = _skill.BuildDraftPrompts(Draft(docType: "report_gov_full"));
        Assert.Contains("工作回顾", gov);
        var (weekly, _) = _skill.BuildDraftPrompts(Draft(docType: "weekly_full"));
        Assert.Contains("本周核心成果", weekly);
        var (monthly, _) = _skill.BuildDraftPrompts(Draft(docType: "monthly_summary"));
        Assert.Contains("下月安排", monthly);
    }

    // ═══════════ corpus 蒸馏库注入（v0.12） ═══════════

    /// <summary>构造必然回退内嵌资源的服务（skillDir 指向不存在目录）</summary>
    private static WritingSkillService CreateEmbeddedService()
        => new(new FakeLlm(), null, Path.Combine(Path.GetTempPath(), "wskill-absent-" + Guid.NewGuid().ToString("N")));

    [Fact]
    public void 内嵌corpus已打包且起草prompt注入蒸馏区块()
    {
        // sync-writing-skill.bat 之后 Resources/WritingSkill/corpus/*.md 打包进程序集（INDEX + 13 层文件）
        var svc = CreateEmbeddedService();
        Assert.True(svc.CurrentResources.CorpusFiles?.Count >= 13);
        Assert.Contains("INDEX.md", svc.CurrentResources.CorpusFiles!.Keys);

        var (system, _) = svc.BuildDraftPrompts(Draft(docType: "summary"));
        Assert.Contains("## 蒸馏知识库参考（同类文体的实战方法，吸收思路不必照抄）", system);
        // 区块位置：文体框架模板之后、素材库之前
        var idxTemplate = system.IndexOf("## 本次文体框架模板", StringComparison.Ordinal);
        var idxCorpus = system.IndexOf("## 蒸馏知识库参考", StringComparison.Ordinal);
        var idxPhrase = system.IndexOf("## 可用公文素材库", StringComparison.Ordinal);
        Assert.True(idxTemplate >= 0 && idxTemplate < idxCorpus && idxCorpus < idxPhrase);
        // Top 4：区块内条目（行首 - **）最多 4 条
        var entries = system[idxCorpus..idxPhrase]
            .Split('\n')
            .Select(l => l.TrimEnd('\r'))
            .Where(l => l.StartsWith("- **", StringComparison.Ordinal))
            .ToList();
        Assert.InRange(entries.Count, 1, 4);
    }

    [Fact]
    public void 空corpus降级不输出蒸馏区块且结构不变()
    {
        var svc = CreateEmbeddedService();
        Assert.True(svc.TryReplaceResources(svc.CurrentResources with
        {
            StyleParamsMd = null,
            CorpusFiles = new Dictionary<string, string>(),
        }));
        var (system, _) = svc.BuildDraftPrompts(Draft());
        Assert.DoesNotContain("蒸馏知识库", system);
        var idxTemplate = system.IndexOf("## 本次文体框架模板", StringComparison.Ordinal);
        var idxPhrase = system.IndexOf("## 可用公文素材库", StringComparison.Ordinal);
        Assert.True(idxTemplate >= 0 && idxPhrase > idxTemplate);
    }

    [Fact]
    public void corpus增强取Top4且长条目截断500字符()
    {
        var svc = CreateEmbeddedService();
        var layer = new List<string> { "- **总结高分配**：" + new string('甲', 600) };
        layer.AddRange(Enumerable.Range(1, 5).Select(i => $"- **总结条目{i}**：第 {i} 条总结方法论内容。"));
        Assert.True(svc.TryReplaceResources(svc.CurrentResources with
        {
            CorpusFiles = new Dictionary<string, string> { ["layer.md"] = string.Join("\n", layer) },
        }));

        var (system, _) = svc.BuildDraftPrompts(Draft(docType: "summary")); // hints: 总结/汇报/成绩
        var start = system.IndexOf("## 蒸馏知识库参考", StringComparison.Ordinal);
        var end = system.IndexOf("## 可用公文素材库", StringComparison.Ordinal);
        Assert.True(start >= 0 && end > start);
        var entries = system[start..end]
            .Split('\n')
            .Select(l => l.TrimEnd('\r'))
            .Where(l => l.StartsWith("- **", StringComparison.Ordinal))
            .ToList();
        Assert.Equal(4, entries.Count); // 6 条全命中也只取 Top 4
        // 长条目截断 500 字符：整行 = 前缀「- **总结高分配**：」12 字符 + 甲×488
        Assert.DoesNotContain(new string('甲', 489), system);
        Assert.Contains(new string('甲', 488), system);
    }

    [Fact]
    public void corpus打分条目名命中优先于正文命中()
    {
        var svc = CreateEmbeddedService();
        Assert.True(svc.TryReplaceResources(svc.CurrentResources with
        {
            CorpusFiles = new Dictionary<string, string>
            {
                ["layer.md"] =
                    "- **素材汇集**：这一条正文里出现总结这个词，但名字不含。\n" +
                    "- **总结经验**：正文完全没有关键词。\n",
            },
        }));

        var (system, _) = svc.BuildDraftPrompts(Draft(docType: "summary")); // hints: 总结/汇报/成绩
        var start = system.IndexOf("## 蒸馏知识库参考", StringComparison.Ordinal);
        var end = system.IndexOf("## 可用公文素材库", StringComparison.Ordinal);
        var first = system[start..end]
            .Split('\n')
            .Select(l => l.TrimEnd('\r'))
            .First(l => l.StartsWith("- **", StringComparison.Ordinal));
        // 名字命中 +3 分 > 正文命中 +1 分 →「总结经验」排第一
        Assert.StartsWith("- **总结经验**", first);
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
        public Task<ChatCompletionResponse?> ChatAsync(List<AgentMessage> messages, List<object>? tools = null, string? model = null, string? reasoningEffort = null, CancellationToken ct = default)
            => Task.FromResult<ChatCompletionResponse?>(null);

        public async IAsyncEnumerable<string> ChatStreamAsync(List<AgentMessage> messages, List<object>? tools = null, string? model = null, string? reasoningEffort = null, [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct = default)
        {
            await Task.CompletedTask;
            yield break;
        }
    }
}