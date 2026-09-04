using System.Globalization;
using System.Text.RegularExpressions;

namespace EngineeringManager.Api.Services;

/// <summary>
/// 写作中心量化风格体检服务 — 复刻 skill scripts/check_params.py（v0.12）为 C#。
///
/// 词表（强制/要求/建议/元评论词）、统计口径与硬冲突判定全部移植自该脚本，
/// 参考值与 references/style-params.md 文种参数表同源；表解析优先读
/// WritingSkillService.StyleParamsMd（热更/内嵌的最新 md），解析失败回退
/// 内置常量（v0.12 表值硬编码，与脚本 REF 完全一致）。
///
/// 判定哲学（照搬 style-params.md 开头声明）：
/// 区间外 ≠ 错——单项落框外只给 hint；同一方向（偏多或偏少）≥3 项才升 warn；
/// 硬冲突（破折号 &gt;1、元评论词出现、身份证参数错位如讲话稿三级标题 &gt;0）
/// 直接 warn 并列入 hardWarnings。
/// </summary>
public sealed class WritingStyleCheckService
{
    /// <summary>体检正文上限（字符），超出截断</summary>
    public const int MaxContentChars = 100000;

    private readonly WritingSkillService _skill;

    public WritingStyleCheckService(WritingSkillService skill)
    {
        _skill = skill;
    }

    // ─────────────────────────────────────────────────────────────
    // 文种映射（DocType.Code → 参数表文种）
    // ─────────────────────────────────────────────────────────────

    /// <summary>DocType.Code → 参数表文种；未列出的（brief/minutes_*/weekly_report/
    /// weekly_full/news_* 等）走无参数档（hasParams=false，仅标点纪律与元评论检测）</summary>
    private static readonly Dictionary<string, string> GenreMap = new()
    {
        // 讲话与党课 → 领导讲话
        ["lecture_pre"] = "领导讲话",
        ["lecture_mid"] = "领导讲话",
        ["lecture_post"] = "领导讲话",
        ["lecture_special"] = "领导讲话",
        ["party_lecture"] = "领导讲话",
        ["mini_classic"] = "领导讲话",
        ["mini_novel"] = "领导讲话",
        ["mini_golden"] = "领导讲话",
        // 调研报告
        ["survey_experience"] = "调研报告",
        ["survey_problem"] = "调研报告",
        ["inspection"] = "调研报告",
        // 工作方案
        ["plan"] = "工作方案",
        ["plan_full"] = "工作方案",
        ["plan_direct"] = "工作方案",
        // 通知 → 工作意见
        ["notice_general"] = "工作意见",
        ["notice_meeting"] = "工作意见",
        ["notice_issue"] = "工作意见",
        // 经验材料
        ["report_government"] = "经验材料",
        ["report_gov_full"] = "经验材料",
        ["work_report"] = "经验材料",
        ["feature_story"] = "经验材料",
        ["deed_brief"] = "经验材料",
        ["deed_feature"] = "经验材料",
        ["theory_article"] = "经验材料",
        ["briefing_material"] = "经验材料",
        // 经验总结
        ["summary"] = "经验总结",
        ["monthly_summary"] = "经验总结",
        ["reflection"] = "经验总结",
    };

    // ─────────────────────────────────────────────────────────────
    // 参考值兜底常量（v0.12 style-params.md 文种参数表硬编码，与 check_params.py REF 同源）
    // ─────────────────────────────────────────────────────────────

    public sealed record GenreRefValues(double Lo, double Hi, double Mid);

    public sealed record GenreParams(
        int N,
        GenreRefValues Chars, GenreRefValues Sent, GenreRefValues H1, GenreRefValues H2,
        GenreRefValues H3, GenreRefValues Yishi, GenreRefValues Dun, GenreRefValues Qz,
        GenreRefValues Yq, GenreRefValues Jy, GenreRefValues Pct);

    private static GenreRefValues R(double lo, double hi, double mid) => new(lo, hi, mid);

    /// <summary>style-params.md 解析失败时的兜底参考值（来源 v0.12，与 check_params.py REF 逐项一致）</summary>
    private static readonly Dictionary<string, GenreParams> FallbackParams = new()
    {
        ["调研报告"] = new(75,
            R(3108, 3820, 3492), R(45, 59, 53), R(3, 3, 3), R(0, 11, 9), R(0, 0, 0),
            R(0, 12, 9), R(19, 26, 22), R(0, 2, 1), R(18, 31, 26), R(2, 5, 3), R(0, 1, 0)),
        ["领导讲话"] = new(44,
            R(3100, 4200, 3700), R(48, 64, 56), R(3, 3, 3), R(3, 9, 5), R(0, 0, 0),
            R(2, 8, 5), R(18, 27, 21), R(1, 3, 2), R(35, 55, 45), R(0, 4, 2), R(0, 0, 0)),
        ["工作意见"] = new(25,
            R(2900, 3800, 3300), R(52, 66, 58), R(4, 6, 5), R(9, 14, 13), R(0, 0, 0),
            R(0, 3, 1), R(25, 31, 28), R(1, 3, 2), R(30, 55, 40), R(0, 2, 1), R(0, 1, 0)),
        ["经验材料"] = new(22,
            R(2900, 4600, 3600), R(50, 63, 56), R(2, 3, 2), R(0, 4, 2), R(0, 3, 1),
            R(2, 9, 6), R(14, 23, 19), R(0, 3, 1), R(12, 30, 20), R(1, 5, 3), R(0, 2, 1)),
        ["工作方案"] = new(10,
            R(2700, 5000, 3600), R(45, 68, 55), R(4, 6, 5), R(4, 9, 8), R(5, 17, 11),
            R(0, 2, 1), R(14, 22, 18), R(1, 4, 2), R(14, 32, 22), R(3, 10, 6), R(0, 1, 0)),
        ["经验总结"] = new(8,
            R(2100, 2700, 2500), R(58, 71, 64), R(3, 4, 3), R(2, 6, 4), R(0, 0, 0),
            R(3, 8, 5), R(23, 31, 27), R(0, 1, 0), R(10, 20, 14), R(0, 1, 0), R(0, 0, 0)),
        ["短经验材料"] = new(77,
            R(950, 1300, 1119), R(45, 57, 51), R(0, 0, 0), R(0, 1, 0), R(0, 0, 0),
            R(0, 1, 1), R(20, 27, 24), R(0, 1, 0), R(1, 4, 3), R(0, 1, 0), R(0, 1, 0)),
    };

    // ─────────────────────────────────────────────────────────────
    // 硬冲突规则（移植自 check_params.py HARD：违反即文种识别错误，不是风格差异）
    // ─────────────────────────────────────────────────────────────

    private sealed record HardRule(string Field, Func<double, bool> IsViolation, string Message);

    private static readonly Dictionary<string, HardRule[]> HardRulesByGenre = new()
    {
        ["领导讲话"] = new[]
        {
            new HardRule("h3", v => v != 0, "领导讲话不用三级标题（44 篇语料三级标题总数为 0）"),
        },
        ["工作意见"] = new[]
        {
            new HardRule("h3", v => v > 2, "工作意见几乎不用三级标题（25 篇语料平均 0.1 个，最多 2 个）"),
        },
        ["经验总结"] = new[]
        {
            new HardRule("pct", v => v != 0, "经验总结不用百分比（8 篇语料 100% 零百分比）"),
        },
        ["短经验材料"] = new[]
        {
            new HardRule("h1", v => v > 1, "千字级经验材料不应用多个一级标题（77 篇语料共 3 个一级标题）"),
            new HardRule("chars", v => v < 700 || v > 2000, "短经验材料篇幅应在 700-2000 字（语料区间 558-3022，中位 1119）"),
        },
    };

    /// <summary>公文族跨文体硬约束：篇幅不应低于 1200 字（党建族千字材料除外）</summary>
    private static readonly HashSet<string> GongwenGenres = new()
    { "调研报告", "领导讲话", "工作意见", "经验材料", "工作方案", "经验总结" };

    // ─────────────────────────────────────────────────────────────
    // 词表（移植自 check_params.py，不得自创）
    // ─────────────────────────────────────────────────────────────

    /// <summary>强制词（稀缺资源，"不得"与"必须"共用同一配额）</summary>
    private static readonly string[] QzWords = { "应当", "必须", "不得", "严禁" };
    /// <summary>要求词（公文主力语气：要 + 动词）</summary>
    private static readonly string[] YqWords = { "要", "切实", "确保", "务必" };
    /// <summary>建议词（只计建言档：建议/可以）</summary>
    private static readonly string[] JyWords = { "建议", "可以" };
    /// <summary>元评论词（自媒体腔，引号内引语除外）</summary>
    private static readonly Regex MetaWordRegex = new(@"其实[是就]|说到底|归根到底|本质上", RegexOptions.Compiled);
    /// <summary>固定提法白名单（标准提法内的力度字样不计入强制词配额）</summary>
    private static readonly string[] FixedPhrases = { "管行业必须管安全、管业务必须管安全、管生产经营必须管安全" };

    // ─────────────────────────────────────────────────────────────
    // 统计正则（口径移植自 check_params.py analyze()）
    // ─────────────────────────────────────────────────────────────

    private static readonly Regex MdHeadingRegex = new(@"^(#{1,6})\s", RegexOptions.Compiled);
    private static readonly Regex MdHeadingStripRegex = new(@"^#{1,6}\s*", RegexOptions.Compiled);
    private static readonly Regex TableQuoteBarRegex = new(@"^(\||-{3,}|>)", RegexOptions.Compiled);
    private static readonly Regex EmphasisStripRegex = new(@"\*\*|__|`", RegexOptions.Compiled);
    private static readonly Regex SentenceSplitRegex = new(@"[。！？；]", RegexOptions.Compiled);
    private static readonly Regex H1Regex = new(@"^\**[一二三四五六七八九十]+、[^\n]{2,80}", RegexOptions.Compiled);
    private static readonly Regex H2Regex = new(@"^\**（[一二三四五六七八九十]+）", RegexOptions.Compiled);
    private static readonly Regex H3Regex = new(@"^\**\d+[．.]\s*\D", RegexOptions.Compiled);
    private static readonly Regex YishiRegex = new(@"[一二三四五六七八九]是[，、]?", RegexOptions.Compiled);
    private static readonly Regex ShortQuoteRegex = new(@"[“""][^”""]{0,20}[”""]", RegexOptions.Compiled);
    private static readonly Regex AllQuoteRegex = new(@"[“][^”]*[”]", RegexOptions.Compiled);
    private static readonly Regex PlaceholderRegex = new(@"【[^】]*】", RegexOptions.Compiled);
    private static readonly Regex PctRegex = new(@"\d+(?:\.\d+)?%", RegexOptions.Compiled);
    private static readonly Regex ColonRegex = new(@"([^\n]{0,12})：", RegexOptions.Compiled);
    private static readonly Regex ColonHeadingRegex = new(@"[一二三四五六七八九十]+、|（[一二三四五六七八九十]）|\d+[．.]", RegexOptions.Compiled);
    private static readonly Regex ColonQuoteIntroRegex = new(@"说|问|讲|提|指出|反映|回忆|告诉|表示|答", RegexOptions.Compiled);
    private static readonly Regex ColonOfficialeseRegex = new(@"人民政府|部门|单位|书记|镇长|同志|负责人", RegexOptions.Compiled);

    // ─────────────────────────────────────────────────────────────
    // 报告 DTO（前后端契约：camelCase 序列化，前端照现有惯例转换）
    // ─────────────────────────────────────────────────────────────

    public sealed record StyleCheckItem(
        string Id, string Label, double Actual, string Unit,
        double? Median, double? Low, double? High, string Verdict);

    public sealed record StyleCheckReport(
        string Genre, bool HasParams,
        IReadOnlyList<StyleCheckItem> Items,
        IReadOnlyList<string> HardWarnings,
        IReadOnlyList<string> Notes);

    private sealed record ParamDef(
        string Id, string Label, string Unit, Func<Stats, double> Get, Func<GenreParams, GenreRefValues> Ref);

    private static readonly ParamDef[] ParamDefs =
    {
        new("chars", "字数", "字", s => s.Chars, p => p.Chars),
        new("sent", "平均句长", "字/句", s => s.Sent, p => p.Sent),
        new("h1", "一级标题", "个", s => s.H1, p => p.H1),
        new("h2", "二级标题", "个", s => s.H2, p => p.H2),
        new("h3", "三级标题", "个", s => s.H3, p => p.H3),
        new("yishi", "一是二是", "次", s => s.Yishi, p => p.Yishi),
        new("dun", "顿号密度", "‰", s => s.Dun, p => p.Dun),
        new("qz", "强制词", "个", s => s.Qz, p => p.Qz),
        new("yq", "要求词", "个", s => s.Yq, p => p.Yq),
        new("jy", "建议词", "个", s => s.Jy, p => p.Jy),
        new("pct", "百分比", "个", s => s.Pct, p => p.Pct),
    };

    private sealed record Stats(
        int Chars, double Sent, int H1, int H2, int H3, int Yishi, double Dun,
        int Qz, int Yq, int Jy, int Pct, int Dash,
        IReadOnlyList<string> MetaWords, int ColonCount);

    // ─────────────────────────────────────────────────────────────
    // 公开入口
    // ─────────────────────────────────────────────────────────────

    /// <summary>量化风格体检：未知/无参数文种仅做标点纪律与元评论检测（hasParams=false）</summary>
    public Task<StyleCheckReport> CheckAsync(string docTypeCode, string content, CancellationToken ct = default)
    {
        _skill.TryGetDocType(docTypeCode, out var dt);
        var genre = dt is not null && GenreMap.TryGetValue(dt.Code, out var g) ? g : null;

        var text = content ?? "";
        if (text.Length > MaxContentChars) text = text[..MaxContentChars];
        var stats = Analyze(text);

        var notes = new List<string>
        {
            "单项区间外≠错，只判硬冲突；连续多项同向偏离才是节奏问题（对照 style-params.md）",
        };

        var paramItems = new List<StyleCheckItem>();
        GenreParams? gp = null;
        if (genre is not null)
        {
            gp = ResolveParams(genre);
            foreach (var def in ParamDefs)
            {
                var actual = def.Get(stats);
                var r = def.Ref(gp!);
                var verdict = actual < r.Lo || actual > r.Hi ? "hint" : "ok";
                paramItems.Add(new StyleCheckItem(def.Id, def.Label, actual, def.Unit, r.Mid, r.Lo, r.Hi, verdict));
            }
        }
        else
        {
            notes.Add("该文种无量化参数行，仅做标点纪律与元评论检测");
        }

        // 同一列表（非拷贝）：MarkWarn 硬冲突/同向升级的改判必须反映进返回报告
        var items = paramItems;
        items.Add(new StyleCheckItem("dash", "破折号", stats.Dash, "个", null, null, null, stats.Dash > 1 ? "warn" : "ok"));
        items.Add(new StyleCheckItem("meta", "元评论词", stats.MetaWords.Count, "处", null, null, null, stats.MetaWords.Count > 0 ? "warn" : "ok"));
        items.Add(new StyleCheckItem("colon", "非引语冒号", stats.ColonCount, "处", null, null, null, stats.ColonCount > 0 ? "hint" : "ok"));

        var hardWarnings = new List<string>();
        if (stats.Dash > 1)
            hardWarnings.Add($"正文破折号 {stats.Dash} 个（语料平均 0.2-0.9 个/篇，建议不超过 1 个）");
        if (stats.MetaWords.Count > 0)
            hardWarnings.Add($"元评论词 {stats.MetaWords.Count} 处（{string.Join("、", stats.MetaWords.Distinct())}）——公文靠事实与逻辑推进，不靠作者跳出来评论");

        // 文种身份证参数硬冲突 → 该项 warn 并列入 hardWarnings
        if (genre is not null)
        {
            foreach (var rule in HardRules(genre))
                if (rule.IsViolation(ActualOf(paramItems, rule.Field)))
                {
                    hardWarnings.Add(rule.Message);
                    MarkWarn(paramItems, rule.Field);
                }
        }

        // 同一方向 ≥3 项 → 节奏问题，整组升 warn
        var highIds = paramItems.Where(i => i.High is not null && i.Actual > i.High).Select(i => i.Id).ToList();
        var lowIds = paramItems.Where(i => i.Low is not null && i.Actual < i.Low).Select(i => i.Id).ToList();
        if (highIds.Count >= 3)
        {
            foreach (var id in highIds) MarkWarn(paramItems, id);
            notes.Add($"{highIds.Count} 项参数同向偏多，多项朝同一方向偏说明整体节奏跑偏，值得回头调");
        }
        if (lowIds.Count >= 3)
        {
            foreach (var id in lowIds) MarkWarn(paramItems, id);
            notes.Add($"{lowIds.Count} 项参数同向偏少，多项朝同一方向偏说明整体节奏跑偏，值得回头调");
        }

        var reportGenre = genre ?? dt?.Label ?? "未知文体";
        return Task.FromResult(new StyleCheckReport(
            reportGenre, genre is not null, items, hardWarnings, notes));
    }

    private static double ActualOf(List<StyleCheckItem> items, string id) =>
        items.FirstOrDefault(i => i.Id == id)?.Actual ?? 0;

    private static void MarkWarn(List<StyleCheckItem> items, string id)
    {
        var idx = items.FindIndex(i => i.Id == id);
        if (idx >= 0) items[idx] = items[idx] with { Verdict = "warn" };
    }

    private static IEnumerable<HardRule> HardRules(string genre)
    {
        if (HardRulesByGenre.TryGetValue(genre, out var rules))
            foreach (var r in rules) yield return r;
        if (GongwenGenres.Contains(genre))
            yield return new HardRule("chars", v => v < 1200,
                "公文族篇幅不应低于 1200 字（低于此值应按党建族写；公文语料最短 1423 字）");
    }

    // ─────────────────────────────────────────────────────────────
    // style-params.md 文种参数表解析
    // ─────────────────────────────────────────────────────────────

    /// <summary>参考值解析：优先 StyleParamsMd 文种参数表行（13 列：文种|n|11 参数），
    /// 目标文种缺失或全表解析失败 → 内置 v0.12 兜底常量</summary>
    private GenreParams ResolveParams(string genre)
    {
        var md = _skill.CurrentResources.StyleParamsMd;
        if (!string.IsNullOrEmpty(md))
        {
            var table = ParseStyleParamsTable(md);
            if (table.TryGetValue(genre, out var parsed))
                return parsed;
        }
        return FallbackParams[genre];
    }

    private static readonly Regex ValueCellRegex =
        new(@"^\*{0,2}([\d,.]+)\*{0,2}\s*\((\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)\)$", RegexOptions.Compiled);

    /// <summary>解析文种参数表：识别「| 文种 | n | 字数 | … | % |」13 列表行，
    /// 每格 median (p25-p75)（median 可带千分位逗号与 ** 加粗）；其余表（配额/技法等）列数不符自动跳过</summary>
    internal static Dictionary<string, GenreParams> ParseStyleParamsTable(string md)
    {
        var result = new Dictionary<string, GenreParams>(StringComparer.Ordinal);
        foreach (var rawLine in md.Split('\n'))
        {
            var line = rawLine.Trim();
            if (!line.StartsWith('|')) continue;
            var cells = line.Split('|').Skip(1).SkipLast(1).Select(c => c.Trim()).ToArray();
            if (cells.Length != 13) continue;
            if (!int.TryParse(cells[1], out var n)) continue;

            var genre = cells[0].Contains('（') ? cells[0][..cells[0].IndexOf('（')] : cells[0];
            var values = new GenreRefValues[11];
            var ok = true;
            for (var i = 0; i < 11; i++)
            {
                var m = ValueCellRegex.Match(cells[i + 2]);
                if (!m.Success) { ok = false; break; }
                if (!double.TryParse(m.Groups[1].Value.Replace(",", ""), NumberStyles.Float, CultureInfo.InvariantCulture, out var mid) ||
                    !double.TryParse(m.Groups[2].Value, NumberStyles.Float, CultureInfo.InvariantCulture, out var lo) ||
                    !double.TryParse(m.Groups[3].Value, NumberStyles.Float, CultureInfo.InvariantCulture, out var hi))
                { ok = false; break; }
                values[i] = R(lo, hi, mid);
            }
            if (!ok || string.IsNullOrEmpty(genre)) continue;
            result[genre] = new GenreParams(n,
                values[0], values[1], values[2], values[3], values[4],
                values[5], values[6], values[7], values[8], values[9], values[10]);
        }
        return result;
    }

    // ─────────────────────────────────────────────────────────────
    // 文本统计（口径移植自 check_params.py analyze()）
    // ─────────────────────────────────────────────────────────────

    private static Stats Analyze(string text)
    {
        // 行预处理：markdown 标题行剥 # 前缀（#/##/### 即一/二/三级标题），
        // 表格/引用/分隔线行剔除，其余原样进正文
        var bodyLines = new List<string>();
        var fromMdHeading = new List<bool>();
        int h1 = 0, h2 = 0, h3 = 0;
        foreach (var raw in text.Split('\n'))
        {
            var l = raw.Trim();
            if (l.Length == 0) continue;
            var md = MdHeadingRegex.Match(l);
            if (md.Success)
            {
                switch (md.Groups[1].Value.Length)
                {
                    case 1: h1++; break;
                    case 2: h2++; break;
                    default: h3++; break;
                }
                bodyLines.Add(MdHeadingStripRegex.Replace(l, ""));
                fromMdHeading.Add(true);
                continue;
            }
            if (TableQuoteBarRegex.IsMatch(l)) continue;
            bodyLines.Add(l);
            fromMdHeading.Add(false);
        }
        var body = string.Join("\n", bodyLines);
        var plain = EmphasisStripRegex.Replace(body, "");
        var chars = plain.Replace("\n", "").Length;

        // 中文序号标题（一、/（一）/1.）——markdown 标题行已按 # 数计过，不重复计
        for (var i = 0; i < bodyLines.Count; i++)
        {
            if (fromMdHeading[i]) continue;
            if (H1Regex.IsMatch(bodyLines[i])) h1++;
            if (H2Regex.IsMatch(bodyLines[i])) h2++;
            if (H3Regex.IsMatch(bodyLines[i])) h3++;
        }

        // 分句（。！？；），片段长 ≥4 计入平均句长
        var sents = SentenceSplitRegex.Split(plain).Where(s => s.Trim().Length >= 4).ToArray();
        var sent = sents.Length > 0 ? Math.Round(sents.Sum(s => (double)s.Length) / sents.Length, 1) : 0;

        // 力度词统计前先剔除短引号内容（自造概念常带力度字样，计入会顶破配额）
        var depunct = ShortQuoteRegex.Replace(plain, "");
        // 固定提法白名单：标准提法（"三管三必须"等）内的力度词不计入任何配额
        foreach (var ph in FixedPhrases)
            depunct = depunct.Replace(ph, new string('□', ph.Length));
        // "不得不"是"只能"义，不是禁止义，需从"不得"中排除
        var qzText = depunct.Replace("不得不", "＃＃＃");

        var qz = QzWords.Sum(w => CountOccurrences(qzText, w));
        var yq = YqWords.Sum(w => CountOccurrences(depunct, w));
        var jy = JyWords.Sum(w => CountOccurrences(depunct, w));

        // 占位符内的 % 不是真实数据，先剔除再计百分比
        var pct = PctRegex.Matches(PlaceholderRegex.Replace(plain, "")).Count;

        // 元评论词（排除引号内——引语里的口语保留）
        var metaWords = MetaWordRegex.Matches(AllQuoteRegex.Replace(plain, ""))
            .Select(m => m.Value).ToList();

        // 非引语冒号（【待补：…】占位内的冒号先剔除）
        var colonCount = 0;
        foreach (Match cm in ColonRegex.Matches(PlaceholderRegex.Replace(plain, "")))
        {
            var before = cm.Groups[1].Value.Trim();
            if (ColonHeadingRegex.IsMatch(before)) continue;             // 层次标题
            if (ColonQuoteIntroRegex.IsMatch(before)) continue;          // 引语引入
            if (ColonOfficialeseRegex.IsMatch(before)) continue;         // 主送机关
            if (before.Contains("待补") || before.Contains("待核")) continue;
            colonCount++;
        }

        var dun = chars > 0
            ? Math.Round(1000.0 * CountOccurrences(plain, "、") / chars, 1)
            : 0;

        return new Stats(chars, sent, h1, h2, h3,
            YishiRegex.Matches(plain).Count, dun,
            qz, yq, jy, pct,
            CountOccurrences(plain, "——"), metaWords, colonCount);
    }

    /// <summary>非重叠出现次数（等价 Python str.count）</summary>
    private static int CountOccurrences(string text, string word)
    {
        var count = 0;
        var idx = 0;
        while ((idx = text.IndexOf(word, idx, StringComparison.Ordinal)) >= 0)
        {
            count++;
            idx += word.Length;
        }
        return count;
    }
}
