using System.Text;
using System.Text.Json;
using EngineeringManager.Api.Models;

namespace EngineeringManager.Api.Services;

/// <summary>
/// 写作中心 skill 服务 — 载入内置 super-official-writer 公文写作方法论资源，
/// 按文体组装 LLM prompt，提供整篇起草（draft，流式）与行内改写（assist）能力。
///
/// 资源以 EmbeddedResource 打包（Resources/WritingSkill/）：
///   · SKILL.md            方法论（流程骨架 + 六层文本规则矩阵，出处见其第十节）
///   · templates.md         21 种文体框架模板速查
///   · phrase-library.md    机关公文常用词语素材库
///   · format-spec.md       GB/T 9704 格式规范
///   · style-params.md      量化风格参数表（corpus 接入后，热更范围含它）
///   · corpus/*.md          蒸馏知识库分层文件（INDEX.md + 各层，起草时按文体检索注入）
///
/// 运行期优先读数据目录 <data>/writing-skill/（热更产物，core 4 份齐全即用；
/// style-params.md 与 corpus/ 子目录存在则一并装入，缺失容忍回退），缺失即回退内嵌；
/// 快照可被 WritingSkillUpdateService 校验后原子热切换（TryReplaceResources）。
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
        new("report_gov_full", "政府工作报告（大材料）", "简报总结", "T19", null),

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

        // T19/T20/T21（templates.md v0.12 新增章：政府工作报告大材料 / 个人周报成稿 / 月度总结）
        new("weekly_full", "个人周报（成稿级）", "周报汇报", "T20", null),
        new("monthly_summary", "月度总结（月结）", "周报汇报", "T21", null),
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

    /// <summary>
    /// skill 资源不可变快照：core 4 份 md + 可选 style-params / corpus 蒸馏库 + 版本锚点 + 来源。
    /// Source = "data-dir"（数据目录，热更产物）或 "embedded"（EmbeddedResource 内嵌）。
    /// StyleParamsMd / CorpusFiles 为 v0.12 扩展：旧快照/旧数据目录缺失时为 null / 空，
    /// 起草与体检均按缺失降级，不影响 core 功能。
    /// </summary>
    public sealed record SkillResources(
        string SkillMd, string TemplatesMd, string PhraseLibraryMd, string FormatSpecMd,
        string? Version, string Source,
        string? StyleParamsMd = null,
        IReadOnlyDictionary<string, string>? CorpusFiles = null);

    public static IReadOnlyList<string> AssistInstructions { get; } =
        new[] { "rewrite", "polish", "expand", "shorten", "custom" };

    /// <summary>起草素材最大长度（字符），超出截断</summary>
    public const int DraftMaxChars = 20000;
    /// <summary>行内改写所选文字最大长度（字符），超出截断</summary>
    public const int AssistMaxSelectedChars = 4000;
    /// <summary>行内改写前文上下文最大长度（字符），超出截断</summary>
    public const int AssistMaxContextChars = 4000;

    private readonly ILlmChatService _llm;
    private readonly IKnowledgeDraftAugmenter? _kbAugmenter;
    /// <summary>当前生效的资源快照；volatile 供热更后原子交换（旧 prompt 组装读旧快照，读后即止）</summary>
    private volatile SkillResources _resources;
    private readonly IReadOnlyDictionary<string, DocType> _docTypeMap;
    private readonly IReadOnlyDictionary<string, StyleSpec> _styleMap;

    /// <param name="kbAugmenter">知识库检索增强器（可选）：T1 起草联动知识库；null = 纯素材起草（现状）</param>
    /// <param name="skillDir">skill 数据目录（测试注入临时目录用）；null = &lt;ResolveDataPath()&gt;/writing-skill</param>
    public WritingSkillService(ILlmChatService llm, IKnowledgeDraftAugmenter? kbAugmenter = null, string? skillDir = null)
    {
        _llm = llm;
        _kbAugmenter = kbAugmenter;
        _resources = LoadInitialResources(skillDir);
        _docTypeMap = DocTypes.ToDictionary(d => d.Code, StringComparer.OrdinalIgnoreCase);
        _styleMap = Styles.ToDictionary(s => s.Id, StringComparer.OrdinalIgnoreCase);
    }

    /// <summary>初始资源：优先数据目录 &lt;data&gt;/writing-skill/（core 4 份齐全即用；
    /// style-params.md 与 corpus/ 子目录存在则一并装入，缺失容忍），
    /// core 4 份任何缺失/读取异常回退内嵌，绝不抛错（红线：数据目录优先但不阻断写作功能）</summary>
    private static SkillResources LoadInitialResources(string? skillDir)
    {
        var skillMd = LoadEmbedded("WritingSkill.SKILL.md");
        var embedded = new SkillResources(
            skillMd,
            LoadEmbedded("WritingSkill.templates.md"),
            LoadEmbedded("WritingSkill.phrase-library.md"),
            LoadEmbedded("WritingSkill.format-spec.md"),
            WritingSkillUpdateService.ParseVersionAnchor(skillMd),
            "embedded",
            LoadEmbeddedOptional("WritingSkill.style-params.md"),
            LoadEmbeddedCorpusFiles());

        try
        {
            var dir = skillDir ?? Path.Combine(ApiConfig.ResolveDataPath(), "writing-skill");
            var paths = new[] { "SKILL.md", "templates.md", "phrase-library.md", "format-spec.md" }
                .Select(n => Path.Combine(dir, n)).ToArray();
            if (paths.Any(p => !File.Exists(p)))
                return embedded;

            var texts = paths.Select(File.ReadAllText).ToArray();

            // 向后兼容：旧版热更产物只有 core 4 份，style-params / corpus 缺失不阻断
            var styleParamsPath = Path.Combine(dir, "style-params.md");
            var styleParams = File.Exists(styleParamsPath) ? File.ReadAllText(styleParamsPath) : null;
            var corpus = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            var corpusDir = Path.Combine(dir, "corpus");
            if (Directory.Exists(corpusDir))
                foreach (var f in Directory.EnumerateFiles(corpusDir, "*.md"))
                    corpus[Path.GetFileName(f)] = File.ReadAllText(f);

            return new SkillResources(
                texts[0], texts[1], texts[2], texts[3],
                WritingSkillUpdateService.ParseVersionAnchor(texts[0]),
                "data-dir", styleParams, corpus);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[WritingSkill] 数据目录 skill 资源加载失败，回退内嵌: {ex.Message}");
            return embedded;
        }
    }

    /// <summary>当前 skill 资源版本（SKILL.md 版本锚点，如 v0.12）；无锚点为 null</summary>
    public string? CurrentVersion => _resources.Version;

    /// <summary>当前资源来源："data-dir"（热更后的数据目录）或 "embedded"（内嵌）</summary>
    public string Source => _resources.Source;

    /// <summary>当前资源快照（internal 供单测组装候选快照）</summary>
    internal SkillResources CurrentResources => _resources;

    /// <summary>热更候选资源替换：ValidateResources 校验通过才原子交换快照引用</summary>
    public bool TryReplaceResources(SkillResources candidate)
    {
        if (!ValidateResources(candidate)) return false;
        _resources = candidate;
        return true;
    }

    /// <summary>
    /// 候选资源结构校验（热更写盘/换内存前必过）：
    /// ① SKILL.md 能解析出 skill-version 锚点；
    /// ② 一/三/五/六 4 个 H2 区块全部可解析（区块抽取失败会静默注入「缺失」占位，故必须先校验）；
    /// ③ 全部文体逐一 ExtractTemplateBody 结果不含「缺失」占位。
    /// </summary>
    internal bool ValidateResources(SkillResources r)
    {
        if (WritingSkillUpdateService.ParseVersionAnchor(r.SkillMd) is null)
            return false;
        foreach (var prefix in new[] { "一、", "三、", "五、", "六、" })
            if (ExtractSkillBlock(r.SkillMd, prefix) is null)
                return false;
        foreach (var dt in DocTypes)
            if (ExtractTemplateBody(r, dt).Contains("缺失"))
                return false;
        return true;
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
    /// T1：注入知识库增强器时，先用素材检索公司知识库，命中片段作为「公司知识库参考」
    /// 区块注入 user prompt（增强失败静默降级，起草照常进行）。
    /// </summary>
    /// <param name="userId">当前用户（知识库检索数据范围，null = 无增强）</param>
    /// <param name="isAdmin">当前用户是否 admin（知识库检索数据范围）</param>
    public async IAsyncEnumerable<string> StreamDraftAsync(
        WritingDraftRequest request,
        string? userId = null,
        bool isAdmin = false,
        [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct = default)
    {
        // 知识库检索增强：try/catch 全吞——增强是加分项不是依赖项，任何失败降级为纯素材起草
        string? kbAugment = null;
        if (_kbAugmenter is not null)
        {
            try
            {
                kbAugment = await _kbAugmenter.BuildAugmentAsync(request.Material, userId, isAdmin, ct);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[WritingSkill] 知识库增强失败（已降级为纯素材起草）: {ex.Message}");
            }
        }

        var (system, user) = BuildDraftPrompts(request, kbAugment);
        var messages = new List<AgentMessage>
        {
            new() { Role = MessageRole.System, Content = system },
            new() { Role = MessageRole.User, Content = user },
        };

        await foreach (var chunk in _llm.ChatStreamAsync(messages, null, null, null, ct))
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
            var task = _llm.ChatAsync(messages, null, null, null, cts.Token);
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

    /// <param name="kbAugment">知识库参考区块文本（T1 检索增强产物）；null/空白 = 不输出该区块（与无增强现状逐字节一致）</param>
    internal (string system, string user) BuildDraftPrompts(WritingDraftRequest req, string? kbAugment = null)
    {
        if (!TryGetDocType(req.DocType, out var docType))
            throw new ArgumentException($"未知文体: {req.DocType}");
        if (!TryGetStyle(req.StyleId, out var style))
            throw new ArgumentException($"未知风格: {req.StyleId}");

        var detail = Math.Clamp(req.DetailLevel, 1, 5);
        var res = _resources;

        var sb = new StringBuilder();
        sb.AppendLine(ExtractSkillSection(res, "一、"));       // 角色与规则
        sb.AppendLine();
        sb.AppendLine(ExtractSkillSection(res, "三、"));       // 六层技能矩阵
        sb.AppendLine();
        sb.AppendLine("## 本次撰写风格要求");
        sb.AppendLine($"风格：{style.Id} {style.Name}。{style.Description}");
        sb.AppendLine($"详略度：{detail}（1=只写关键词和结果；5=展开背景、过程、分析）");
        sb.AppendLine();
        sb.AppendLine(ExtractSkillSection(res, "五、"));       // Protected Spans 事实保护
        sb.AppendLine();
        sb.AppendLine(ExtractSkillSection(res, "六、"));       // 输出规范
        sb.AppendLine();
        sb.AppendLine("## GB/T 9704 格式规范（全文，起草结构的版式依据）");
        sb.AppendLine(res.FormatSpecMd);
        sb.AppendLine();
        sb.AppendLine("## 本次文体框架模板");
        sb.AppendLine(ExtractTemplateBody(res, docType));
        sb.AppendLine();
        // corpus 蒸馏库注入：空 corpus / 无命中 → 不输出该区块（与无 corpus 现状逐字节一致）
        var corpusAugment = BuildCorpusAugment(docType);
        if (corpusAugment is not null)
        {
            sb.AppendLine(corpusAugment);
            sb.AppendLine();
        }
        sb.AppendLine("## 可用公文素材库（合理选用，不必逐条照抄）");
        sb.AppendLine(res.PhraseLibraryMd);

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
        if (!string.IsNullOrWhiteSpace(kbAugment))
        {
            user.AppendLine(kbAugment);
            user.AppendLine();
        }
        user.AppendLine("请按上述文体模板直接输出正文全文，不要输出额外解释或前导后语。");

        return (sb.ToString().Trim(), user.ToString());
    }

    internal (string system, string user) BuildAssistPrompts(WritingAssistRequest req)
    {
        var res = _resources;
        var sb = new StringBuilder();
        sb.AppendLine(ExtractSkillSection(res, "三、"));   // 六层技能矩阵
        sb.AppendLine();
        sb.AppendLine(ExtractSkillSection(res, "五、"));   // Protected Spans
        sb.AppendLine();
        sb.AppendLine(ExtractSkillSection(res, "六、"));   // 输出规范
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

    /// <summary>
    /// 从 LLM 流式原始 JSON 块中提取 choices[0].delta.content。
    /// 顶层含 "error" 属性（LlmProviderService 连接失败时下发 {"error":"..."}）→ 抛异常，
    /// 由端点 catch 转成 SSE type:"error" 事件，避免静默丢弃导致空内容清空文档。
    /// </summary>
    private static string? TryExtractContentDelta(string chunk)
    {
        try
        {
            using var doc = JsonDocument.Parse(chunk);
            if (doc.RootElement.TryGetProperty("error", out var err))
            {
                var msg = err.ValueKind == JsonValueKind.String ? err.GetString() : err.ToString();
                throw new InvalidOperationException(msg ?? "LLM 流式返回错误");
            }
            if (!doc.RootElement.TryGetProperty("choices", out var choices) || choices.GetArrayLength() == 0)
                return null;
            // finish 块 choices[0] 无 delta → 静默跳过（TryGetProperty，不误报解析失败日志）
            if (!choices[0].TryGetProperty("delta", out var delta))
                return null;
            return delta.TryGetProperty("content", out var content) ? content.GetString() : null;
        }
        catch (InvalidOperationException)
        {
            throw; // error 块识别结果直通上层，不吞成解析失败
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

    /// <summary>可选嵌入资源：命中后缀返回全文，未打包返回 null（style-params.md 等 v0.12 扩展，容忍缺失）</summary>
    private static string? LoadEmbeddedOptional(string suffix)
    {
        var asm = typeof(WritingSkillService).Assembly;
        var name = asm.GetManifestResourceNames()
            .FirstOrDefault(n => n.EndsWith(suffix, StringComparison.OrdinalIgnoreCase));
        if (name is null) return null;
        using var stream = asm.GetManifestResourceStream(name)!;
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }

    /// <summary>装入全部 corpus 分层嵌入资源（manifest 名含 WritingSkill.corpus.），
    /// key = 文件名（含 INDEX.md）；未打包（旧构建/未跑 sync）返回空字典</summary>
    private static IReadOnlyDictionary<string, string> LoadEmbeddedCorpusFiles()
    {
        const string prefix = "WritingSkill.corpus.";
        var asm = typeof(WritingSkillService).Assembly;
        var dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var name in asm.GetManifestResourceNames())
        {
            var idx = name.IndexOf(prefix, StringComparison.Ordinal);
            if (idx < 0) continue;
            using var stream = asm.GetManifestResourceStream(name)!;
            using var reader = new StreamReader(stream);
            dict[name[(idx + prefix.Length)..]] = reader.ReadToEnd();
        }
        return dict;
    }

    // ─────────────────────────────────────────────────────────────
    // corpus 蒸馏库起草注入（v0.12：按文体检索 Top 4 条注入 system prompt）
    // ─────────────────────────────────────────────────────────────

    /// <summary>corpus 检索关键词（DocType.Code → 2-4 个）；未命中走 Label 实词兜底</summary>
    private static readonly Dictionary<string, string[]> CorpusHints = new()
    {
        // 简报与总结
        ["brief"] = new[] { "简报", "信息", "快报" },
        ["summary"] = new[] { "总结", "汇报", "成绩" },
        ["report_government"] = new[] { "报告", "总结", "成绩" },
        ["report_gov_full"] = new[] { "政府工作报告", "回顾", "任务" },
        ["reflection"] = new[] { "体会", "心得", "感悟" },
        ["work_report"] = new[] { "述职", "报告", "成绩" },
        // 计划与方案
        ["plan"] = new[] { "方案", "计划", "部署" },
        ["plan_full"] = new[] { "方案", "计划", "部署" },
        ["plan_direct"] = new[] { "方案", "计划", "部署" },
        // 通知
        ["notice_general"] = new[] { "通知", "公文格式" },
        ["notice_meeting"] = new[] { "通知", "会议", "公文格式" },
        ["notice_issue"] = new[] { "通知", "印发", "公文格式" },
        // 讲话与党课
        ["lecture_pre"] = new[] { "讲话", "发言", "开场", "收尾" },
        ["lecture_mid"] = new[] { "讲话", "发言", "调度", "推进" },
        ["lecture_post"] = new[] { "讲话", "发言", "总结", "表彰" },
        ["lecture_special"] = new[] { "讲话", "发言", "培训", "授课" },
        ["party_lecture"] = new[] { "党课", "宣讲", "讲话" },
        ["mini_classic"] = new[] { "党课", "宣讲", "讲稿" },
        ["mini_novel"] = new[] { "党课", "互动", "宣讲" },
        ["mini_golden"] = new[] { "党课", "要点", "提炼" },
        // 会议纪要
        ["minutes_items"] = new[] { "纪要", "会议", "决议" },
        ["minutes_news"] = new[] { "纪要", "会议", "新闻" },
        // 调研报告
        ["survey_experience"] = new[] { "调研", "报告", "问题" },
        ["survey_problem"] = new[] { "调研", "报告", "问题" },
        ["inspection"] = new[] { "检查", "对照", "剖析" },
        ["theory_article"] = new[] { "理论", "文章", "评论" },
        // 新闻宣传
        ["news_meeting"] = new[] { "新闻", "会议", "宣传" },
        ["news_activity"] = new[] { "新闻", "活动", "宣传" },
        ["news_survey"] = new[] { "新闻", "调研", "宣传" },
        ["feature_story"] = new[] { "通讯", "报道", "典型" },
        ["deed_brief"] = new[] { "事迹", "先进", "典型" },
        ["deed_feature"] = new[] { "事迹", "通讯", "典型" },
        // 周报与汇报
        ["weekly_report"] = new[] { "周报", "汇报", "进度" },
        ["briefing_material"] = new[] { "汇报", "材料", "要点" },
        ["weekly_full"] = new[] { "周报", "总结", "成果" },
        ["monthly_summary"] = new[] { "总结", "汇报", "成绩" },
    };

    /// <summary>Label 实词兜底：主名（去括号段）+ 各括号内实词，最多 4 个</summary>
    private static string[] FallbackHintsFromLabel(string label)
    {
        var hints = new List<string>();
        var main = System.Text.RegularExpressions.Regex.Replace(label, @"（[^）]*）", "").Trim();
        if (main.Length >= 2) hints.Add(main);
        foreach (System.Text.RegularExpressions.Match m in
                     System.Text.RegularExpressions.Regex.Matches(label, @"（([^）]{2,8})）"))
            hints.Add(m.Groups[1].Value);
        if (hints.Count == 0) hints.Add(label);
        return hints.Take(4).ToArray();
    }

    /// <summary>
    /// 按文体检索 corpus 蒸馏库（958 条方法论条目）组装起草增强区块：
    /// 条目按行首「- **」切分（INDEX.md 只是目录不参与），hint 词命中条目名 +3 分、
    /// 正文 +1 分（每个 hint 只计一次），0 分不取；取 Top 4 条、每条截断 500 字符。
    /// corpus 为空或无命中 → 返回 null（降级不输出该区块，prompt 与无 corpus 现状一致）。
    /// </summary>
    private string? BuildCorpusAugment(DocType dt)
    {
        var corpus = _resources.CorpusFiles;
        if (corpus is not { Count: > 0 }) return null;

        var hints = CorpusHints.TryGetValue(dt.Code, out var h) ? h : FallbackHintsFromLabel(dt.Label);

        var scored = new List<(int Score, int Order, string Line)>();
        var order = 0;
        foreach (var (fileName, text) in corpus)
        {
            if (fileName.Equals("INDEX.md", StringComparison.OrdinalIgnoreCase)) continue;
            foreach (var rawLine in text.Split('\n'))
            {
                var line = rawLine.TrimEnd('\r');
                if (!line.StartsWith("- **", StringComparison.Ordinal)) continue;
                var nameStart = line.IndexOf("**", StringComparison.Ordinal);
                var nameEnd = nameStart >= 0 ? line.IndexOf("**", nameStart + 2, StringComparison.Ordinal) : -1;
                var name = nameStart >= 0 && nameEnd > nameStart ? line[(nameStart + 2)..nameEnd] : "";
                var body = nameEnd >= 0 ? line[(nameEnd + 2)..] : line;

                var score = 0;
                foreach (var hint in hints)
                {
                    if (name.Contains(hint, StringComparison.Ordinal)) score += 3;
                    else if (body.Contains(hint, StringComparison.Ordinal)) score += 1;
                }
                if (score > 0) scored.Add((score, order++, line)); // 保留条目原文与溯源尾
            }
        }
        if (scored.Count == 0) return null;

        var sb = new StringBuilder();
        sb.Append("## 蒸馏知识库参考（同类文体的实战方法，吸收思路不必照抄）");
        foreach (var entry in scored.OrderByDescending(e => e.Score).ThenBy(e => e.Order).Take(4))
            sb.Append('\n').Append(Truncate(entry.Line, 500));
        return sb.ToString();
    }

    /// <summary>取技能正文中的 H2 区块（如 "## 三、六层技能矩阵"），missing 时给出占位</summary>
    private static string ExtractSkillSection(SkillResources res, string h2Prefix) =>
        ExtractSkillBlock(res.SkillMd, h2Prefix)
        ?? $"（技能区块「## {h2Prefix}」缺失，请检查内置 skill 资源）";

    /// <summary>H2 区块原始抽取（不注入占位）：命中返回区块文本，未命中返回 null（ValidateResources 依据）</summary>
    private static string? ExtractSkillBlock(string skillMd, string h2Prefix) =>
        ExtractBlock(skillMd,
            line => line.TrimStart().StartsWith($"## {h2Prefix}", StringComparison.Ordinal),
            line => line.StartsWith("## ", StringComparison.Ordinal));

    /// <summary>按文体解析出对应模板正文（含子形态），missing 时给出占位</summary>
    private static string ExtractTemplateBody(SkillResources res, DocType dt)
    {
        if (dt.TemplateRef.StartsWith("S", StringComparison.Ordinal))
        {
            // SKILL.md 第七节常用模板："### 7.1 周报模板"
            var section = ExtractBlock(res.SkillMd,
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

        var chapter = ExtractBlock(res.TemplatesMd,
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