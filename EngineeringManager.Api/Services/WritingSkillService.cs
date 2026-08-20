using System.Text;
using System.Text.Json;
using EngineeringManager.Api.Models;

namespace EngineeringManager.Api.Services;

/// <summary>
/// 写作中心 skill 服务 — 载入内置 super-official-writer 公文写作方法论资源，
/// 按文体组装 LLM prompt，提供整篇起草（draft，流式）与行内改写（assist）能力。
///
/// 资源以 EmbeddedResource 打包（Resources/WritingSkill/*.md）：
///   · SKILL.md          方法论（流程骨架 + 六层文本规则矩阵，出处见其第十节）
///   · templates.md      18 种文体框架模板速查
///   · phrase-library.md 机关公文常用词语素材库
///
/// 设计见 docs/superpowers/specs/2026-08-16-writing-center-design.md §4。
/// </summary>
public sealed class WritingSkillService
{
    // ─────────────────────────────────────────────────────────────
    // 文体注册表（DocType → 模板来源）
    // TemplateRef：'T{n}' → templates.md 第 n 章；'S{m}' → SKILL.md 常用模板 7.{m}
    // Subtype：T 章内的子形态（领导讲话 A/B/C/D、通知 A/B/C 等），无子形态为 null
    // ─────────────────────────────────────────────────────────────
    public sealed record DocType(string Code, string Label, string Group, string TemplateRef, string? Subtype);

    public sealed record StyleSpec(string Id, string Name, string Description);

    private static readonly DocType[] DocTypes =
    {
        // 简报与总结
        new("brief", "工作简报", "简报总结", "T1", null),
        new("summary", "工作总结", "简报总结", "T3", null),
        new("report_government", "工作报告（政府级）", "简报总结", "T4", null),
        new("reflection", "心得体会", "简报总结", "T5", null),
        new("work_report", "述职报告", "简报总结", "T17", null),

        // 计划与方案
        new("plan", "工作计划", "计划方案", "T2", null),
        new("plan_full", "工作方案（完整型）", "计划方案", "T8", "A"),
        new("plan_direct", "工作方案（直接型）", "计划方案", "T8", "B"),

        // 通知
        new("notice_general", "工作通知（通用）", "通知", "T7", "A"),
        new("notice_meeting", "会议通知", "通知", "T7", "B"),
        new("notice_issue", "印发文件通知", "通知", "T7", "C"),

        // 讲话与党课
        new("lecture_pre", "领导讲话（部署动员）", "讲话党课", "T6", "A"),
        new("lecture_mid", "领导讲话（推进调度）", "讲话党课", "T6", "B"),
        new("lecture_post", "领导讲话（总结表彰）", "讲话党课", "T6", "C"),
        new("lecture_special", "领导讲话（专题培训）", "讲话党课", "T6", "D"),
        new("party_lecture", "党课", "讲话党课", "T10", null),
        new("mini_classic", "微型党课（古板型）", "讲话党课", "T11", "A"),
        new("mini_novel", "微型党课（新颖型）", "讲话党课", "T11", "B"),
        new("mini_golden", "微型党课（极限黄金型）", "讲话党课", "T11", "C"),

        // 会议纪要
        new("minutes_items", "会议纪要（一事一议）", "会议纪要", "T12", "A"),
        new("minutes_news", "会议纪要（新闻型）", "会议纪要", "T12", "B"),

        // 调研报告
        new("survey_experience", "调研报告（经验型）", "调研报告", "T9", "A"),
        new("survey_problem", "调研报告（问题型）", "调研报告", "T9", "B"),
        new("inspection", "对照检查材料", "调研报告", "T16", null),
        new("theory_article", "理论文章", "调研报告", "T18", null),

        // 新闻宣传
        new("news_meeting", "新闻稿（会议）", "新闻宣传", "T13", "A"),
        new("news_activity", "新闻稿（活动）", "新闻宣传", "T13", "B"),
        new("news_survey", "新闻稿（调研）", "新闻宣传", "T13", "C"),
        new("feature_story", "通讯稿", "新闻宣传", "T14", null),
        // T15 先进事迹为表格体（未分 A/B 小节），两形态均取整章，靠文体标签区分写法
        new("deed_brief", "先进事迹（简报式）", "新闻宣传", "T15", null),
        new("deed_feature", "先进事迹（通讯稿式）", "新闻宣传", "T15", null),

        // 周报与汇报材料（出自 SKILL.md 第七节常用模板）
        new("weekly_report", "周报", "周报汇报", "S7.1", null),
        new("briefing_material", "汇报材料", "周报汇报", "S7.2", null),
    };

    private static readonly StyleSpec[] Styles =
    {
        new("S1", "数据驱动型", "以量化指标为主线，每项工作配数据对比（环比/同比/目标完成率），少形容词多数字。"),
        new("S2", "问题导向型", "以「发现问题→分析原因→解决措施」为逻辑链，突显思考深度和主动性。"),
        new("S3", "成果清单型", "高度结构化，每项工作提炼为「举措+成效」，用小标题串联，适合快速浏览。"),
        new("S4", "故事叙事型", "以典型案例/具体场景切入，从「做了什么事」到「产生了什么影响」，增强感染力。"),
        new("S5", "高位对标型", "每项工作对照上级精神/政策文件/年度目标展开，强调政治站位和大局意识。"),
        new("S6", "精要速报型", "极限压缩，每项工作控制在 2-3 句话，只保留核心动作+关键结果，适合日报/快报。"),
    };

    public static IReadOnlyList<string> AssistInstructions { get; } =
        new[] { "rewrite", "polish", "expand", "shorten", "custom" };

    /// <summary>起草素材最大长度（字符），超出截断</summary>
    public const int DraftMaxChars = 20000;
    /// <summary>行内改写所选文字最大长度（字符），超出截断</summary>
    public const int AssistMaxSelectedChars = 4000;
    /// <summary>行内改写前文上下文最大长度（字符），超出截断</summary>
    public const int AssistMaxContextChars = 4000;

    private readonly ILlmChatService _llm;
    private readonly string _skillMd;
    private readonly string _templatesMd;
    private readonly string _phraseLibraryMd;
    private readonly string _formatSpecMd;
    private readonly IReadOnlyDictionary<string, DocType> _docTypeMap;
    private readonly IReadOnlyDictionary<string, StyleSpec> _styleMap;

    public WritingSkillService(ILlmChatService llm)
    {
        _llm = llm;
        _skillMd = LoadEmbedded("WritingSkill.SKILL.md");
        _templatesMd = LoadEmbedded("WritingSkill.templates.md");
        _phraseLibraryMd = LoadEmbedded("WritingSkill.phrase-library.md");
        _formatSpecMd = LoadEmbedded("WritingSkill.format-spec.md");
        _docTypeMap = DocTypes.ToDictionary(d => d.Code, StringComparer.OrdinalIgnoreCase);
        _styleMap = Styles.ToDictionary(s => s.Id, StringComparer.OrdinalIgnoreCase);
    }

    // ─────────────────────────────────────────────────────────────
    // 公开查询
    // ─────────────────────────────────────────────────────────────

    public IReadOnlyList<DocType> GetDocTypes() => DocTypes;

    public IReadOnlyList<StyleSpec> GetStyles() => Styles;

    public bool TryGetDocType(string? code, out DocType docType) =>
        _docTypeMap.TryGetValue(code ?? "", out docType!);

    public bool TryGetStyle(string? id, out StyleSpec style) =>
        _styleMap.TryGetValue(id ?? "", out style!);

    /// <summary>剥离 [[双方括号]] 保护标记，保留实体内容</summary>
    public static string StripProtectedMarkers(string content) =>
        System.Text.RegularExpressions.Regex.Replace(content, @"\[\[(.*?)\]\]", m => m.Groups[1].Value);

    // ─────────────────────────────────────────────────────────────
    // 起草（流式）
    // ─────────────────────────────────────────────────────────────

    /// <summary>
    /// 依据文体 + 素材 + 风格流式起草整篇公文，逐条产出正文 token。
    /// 输入素材中的 [[…]] 为 Protected Spans；流式原文可能短暂含括号，
    /// 调用方在 done 事件后以 StripProtectedMarkers 落库。
    /// </summary>
    public async IAsyncEnumerable<string> StreamDraftAsync(WritingDraftRequest request)
    {
        var (system, user) = BuildDraftPrompts(request);
        var messages = new List<AgentMessage>
        {
            new() { Role = MessageRole.System, Content = system },
            new() { Role = MessageRole.User, Content = user },
        };

        await foreach (var chunk in _llm.ChatStreamAsync(messages))
        {
            var text = TryExtractContentDelta(chunk);
            if (!string.IsNullOrWhiteSpace(text))
                yield return text;
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 行内 AI（单次调用，返回替换文本）
    // ─────────────────────────────────────────────────────────────

    /// <summary>行内改写/润色/扩写/缩写/自定义指令，返回用于替换选中内容的文本</summary>
    public async Task<(bool success, string? text, string? error)> AssistAsync(
        WritingAssistRequest req, CancellationToken ct = default)
    {
        try
        {
            var (system, user) = BuildAssistPrompts(req);
            var messages = new List<AgentMessage>
            {
                new() { Role = MessageRole.System, Content = system },
                new() { Role = MessageRole.User, Content = user },
            };

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromSeconds(45));
            var task = _llm.ChatAsync(messages);
            var completed = await Task.WhenAny(task, Task.Delay(Timeout.InfiniteTimeSpan, cts.Token));
            if (completed != task)
                return (false, null, "AI 改写超时（45s），请重试或缩短所选文字");
            var response = await task;

            var content = response?.Choices?.FirstOrDefault()?.Message?.Content;
            if (string.IsNullOrWhiteSpace(content))
                return (false, null, "AI 未返回有效内容，请重试");

            return (true, StripProtectedMarkers(content.Trim()), null);
        }
        catch (OperationCanceledException)
        {
            Console.Error.WriteLine("[WritingSkill] AI 改写超时（45s）");
            return (false, null, "AI 改写超时（45s），请重试或缩短所选文字");
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[WritingSkill] AI 改写失败: {ex.Message}");
            return (false, null, $"AI 改写失败: {Common.Sanitize(ex.Message)}");
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Prompt 组装（internal 供单测校验）
    // ─────────────────────────────────────────────────────────────

    internal (string system, string user) BuildDraftPrompts(WritingDraftRequest req)
    {
        if (!TryGetDocType(req.DocType, out var docType))
            throw new ArgumentException($"未知文体: {req.DocType}");
        if (!TryGetStyle(req.StyleId, out var style))
            throw new ArgumentException($"未知风格: {req.StyleId}");

        var detail = Math.Clamp(req.DetailLevel, 1, 5);

        var sb = new StringBuilder();
        sb.AppendLine(ExtractSkillSection("一、"));       // 角色与规则
        sb.AppendLine();
        sb.AppendLine(ExtractSkillSection("三、"));       // 六层技能矩阵
        sb.AppendLine();
        sb.AppendLine("## 本次撰写风格要求");
        sb.AppendLine($"风格：{style.Id} {style.Name}。{style.Description}");
        sb.AppendLine($"详略度：{detail}（1=只写关键词和结果；5=展开背景、过程、分析）");
        sb.AppendLine();
        sb.AppendLine(ExtractSkillSection("五、"));       // Protected Spans 事实保护
        sb.AppendLine();
        sb.AppendLine(ExtractSkillSection("六、"));       // 输出规范
        sb.AppendLine();
        sb.AppendLine("## GB/T 9704 格式规范（全文，起草结构的版式依据）");
        sb.AppendLine(_formatSpecMd);
        sb.AppendLine();
        sb.AppendLine("## 本次文体框架模板");
        sb.AppendLine(ExtractTemplateBody(docType));
        sb.AppendLine();
        sb.AppendLine("## 可用公文素材库（合理选用，不必逐条照抄）");
        sb.AppendLine(_phraseLibraryMd);

        var user = new StringBuilder();
        if (!string.IsNullOrWhiteSpace(req.Title))
            user.AppendLine($"【标题】{req.Title}");
        if (!string.IsNullOrWhiteSpace(req.Audience))
            user.AppendLine($"【用途/受众】{req.Audience}");
        user.AppendLine($"【写作任务】请代拟一份「{docType.Label}」。");
        user.AppendLine();
        user.AppendLine("【素材/事实】以下是可用事实材料。其中用 [[ 双方括号 ] 括住的内容是 Protected Spans，"
            + "必须原样保留、不得增删改；未加括号但明显属于具体数字/专有名词/直接引用的内容同样是 Protected Spans，禁止编造。"
            + "若素材不足以支撑某部分，宁可写得概括，也不得虚构数据或事实。");
        user.AppendLine();
        user.AppendLine(Truncate(req.Material, DraftMaxChars));
        user.AppendLine();
        user.AppendLine("请按上述文体模板直接输出正文全文，不要输出额外解释或前导后语。");

        return (sb.ToString().Trim(), user.ToString());
    }

    internal (string system, string user) BuildAssistPrompts(WritingAssistRequest req)
    {
        var sb = new StringBuilder();
        sb.AppendLine(ExtractSkillSection("三、"));       // 六层技能矩阵
        sb.AppendLine();
        sb.AppendLine(ExtractSkillSection("五、"));       // Protected Spans
        sb.AppendLine();
        sb.AppendLine(ExtractSkillSection("六、"));       // 输出规范
        if (TryGetStyle(req.StyleId, out var style))
        {
            sb.AppendLine();
            sb.AppendLine("## 风格要求");
            sb.AppendLine($"{style.Id} {style.Name}。{style.Description}");
        }

        var user = new StringBuilder();
        user.AppendLine($"【指令】{BuildInstruction(req)}");
        if (req.ProtectedSpans is { Length: > 0 })
            user.AppendLine($"【Protected Spans（不可改动的实体事实）】{string.Join("；", req.ProtectedSpans.Take(50))}");
        user.AppendLine();
        user.AppendLine("【所选文字】");
        user.Append(Truncate(req.SelectedText, AssistMaxSelectedChars));
        if (!string.IsNullOrWhiteSpace(req.ContextBefore))
        {
            user.AppendLine();
            user.AppendLine();
            user.AppendLine("【前文上下文（仅供把握语气与连贯，不要改动所选文字以外的内容）】");
            user.Append(Truncate(req.ContextBefore, AssistMaxContextChars));
        }
        user.AppendLine();
        user.AppendLine();
        user.AppendLine("只输出修改后的文字本体，不要加任何解释、标题或前后缀。");

        return (sb.ToString().Trim(), user.ToString().Trim());
    }

    private static string BuildInstruction(WritingAssistRequest req)
    {
        var ins = (req.Instruction ?? "custom").ToLowerInvariant();
        return ins switch
        {
            "rewrite" => "改写以下文字：保留原意与事实，优化结构、逻辑和表达，使其更符合公文规范。",
            "polish" => "润色以下文字：修正用词、标点与病句，使表达更流畅规范，不改变原意和事实。",
            "expand" => "扩写以下文字：在保持原意和事实不变的基础上补充表述，使内容更详实。",
            "shorten" => "缩写以下文字：删繁就简，提炼核心，使表达更精炼，不虚构事实、不新增数据。",
            _ => string.IsNullOrWhiteSpace(req.CustomInstruction)
                ? "改写以下文字，使其更符合公文规范"
                : Truncate(req.CustomInstruction.Trim(), 500),
        };
    }

    /// <summary>从 LLM 流式原始 JSON 块中提取 choices[0].delta.content</summary>
    private static string? TryExtractContentDelta(string chunk)
    {
        try
        {
            using var doc = JsonDocument.Parse(chunk);
            if (!doc.RootElement.TryGetProperty("choices", out var choices) || choices.GetArrayLength() == 0)
                return null;
            var delta = choices[0].GetProperty("delta");
            return delta.TryGetProperty("content", out var content) ? content.GetString() : null;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[WritingSkill] 流式 chunk 解析失败: {ex.Message}");
            return null;
        }
    }

    private static string Truncate(string s, int max) =>
        string.IsNullOrEmpty(s) ? s : (s.Length > max ? s[..max] : s);

    // ─────────────────────────────────────────────────────────────
    // 技能 Markdown 区块提取
    // ─────────────────────────────────────────────────────────────

    private static string LoadEmbedded(string suffix)
    {
        var asm = typeof(WritingSkillService).Assembly;
        var name = asm.GetManifestResourceNames()
            .FirstOrDefault(n => n.EndsWith(suffix, StringComparison.OrdinalIgnoreCase));
        if (name is null)
            throw new InvalidOperationException($"缺少嵌入资源 *{suffix}");
        using var stream = asm.GetManifestResourceStream(name)!;
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }

    /// <summary>取技能正文中的 H2 区块（如 "## 三、六层技能矩阵"），missing 时给出占位</summary>
    private string ExtractSkillSection(string h2Prefix) =>
        ExtractBlock(_skillMd,
            line => line.TrimStart().StartsWith($"## {h2Prefix}", StringComparison.Ordinal),
            line => line.StartsWith("## ", StringComparison.Ordinal))
        ?? $"（技能区块「## {h2Prefix}」缺失，请检查内置 skill 资源）";

    /// <summary>按文体解析出对应模板正文（含子形态），missing 时给出占位</summary>
    private string ExtractTemplateBody(DocType dt)
    {
        if (dt.TemplateRef.StartsWith("S", StringComparison.Ordinal))
        {
            // SKILL.md 第七节常用模板："### 7.1 周报模板"
            var section = ExtractBlock(_skillMd,
                line => line.TrimStart().StartsWith("## 七、", StringComparison.Ordinal),
                line => line.StartsWith("## ", StringComparison.Ordinal));
            if (section is not null)
            {
                var num = dt.TemplateRef[1..];
                return ExtractBlock(section,
                    line => line.TrimStart().StartsWith($"### {num} ", StringComparison.Ordinal),
                    line => line.StartsWith("### ", StringComparison.Ordinal) || line.StartsWith("## ", StringComparison.Ordinal))
                    ?? $"（文体模板 {dt.TemplateRef} 缺失）";
            }
            return $"（文体模板 {dt.TemplateRef} 缺失）";
        }

        var chapter = ExtractBlock(_templatesMd,
            line => line.TrimStart().StartsWith($"## {dt.TemplateRef}.", StringComparison.Ordinal),
            line => line.StartsWith("## ", StringComparison.Ordinal));
        if (chapter is null)
            return $"（文体模板 {dt.TemplateRef} 缺失）";
        if (string.IsNullOrEmpty(dt.Subtype))
            return chapter;

        return ExtractBlock(chapter,
            line => line.TrimStart().StartsWith($"### {dt.Subtype}.", StringComparison.Ordinal),
            line => line.StartsWith("### ", StringComparison.Ordinal) || line.StartsWith("## ", StringComparison.Ordinal))
            ?? $"（文体模板 {dt.TemplateRef}.{dt.Subtype} 缺失）";
    }

    /// <summary>按行扫描：命中 start 的子串开头到命中 end 的行之前</summary>
    private static string? ExtractBlock(string text, Func<string, bool> start, Func<string, bool> end)
    {
        var lines = text.Split('\n');
        int? begin = null;
        for (var i = 0; i < lines.Length; i++)
        {
            if (begin is null)
            {
                if (start(lines[i])) begin = i;
            }
            else if (end(lines[i]))
            {
                return string.Join("\n", lines[begin.Value..i]).Trim();
            }
        }
        return begin is null ? null : string.Join("\n", lines[begin.Value..]).Trim();
    }
}

// ───────────── 请求 DTO（与前端 writing-client 契约一致，snake_case 出参由前端转换）─────────────

/// <summary>整篇起草请求</summary>
public sealed record WritingDraftRequest(
    string DocType,
    string? Title,
    string? Audience,
    string Material,
    string StyleId,
    int DetailLevel);

/// <summary>行内 AI 改写请求</summary>
public sealed record WritingAssistRequest(
    string Instruction,           // rewrite | polish | expand | shorten | custom
    string SelectedText,
    string? CustomInstruction,
    string? DocType,
    string? StyleId,
    string? ContextBefore,
    string[]? ProtectedSpans);