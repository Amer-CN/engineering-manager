using EngineeringManager.Api.Models;
using EngineeringManager.Api.Services;
using Xunit;

namespace EngineeringManager.Tests.Services;

/// <summary>
/// 写作中心量化风格体检单测（v0.12，check_params.py 的 C# 复刻）：
///   · 词表统计正确性（顿号‰ / "一是"计数 / 强制词 / 要求词）
///   · 文种映射全覆盖（34 个注册文体每个都能出报告，参数/无参数档各就各位）
///   · style-params 表解析（真实 md 解析出"调研报告"字数中位 3492；优先级高于兜底常量）
///   · 判定哲学（区间内 ok / 单项区间外 hint / 3 项同向 warn / 破折号超限 warn /
///     无参数文种 hasParams=false 仍有标点纪律）
///   · 领导讲话样本体检（验收 5）：items ≥8、hint 不误报 warn、hardWarnings 为空；
///     样本统计值已用 skill 仓库 check_params.py 逐一核对。
/// </summary>
public class WritingStyleCheckTests
{
    private static WritingSkillService CreateEmbeddedSkill()
        => new(new FakeLlm(), null, Path.Combine(Path.GetTempPath(), "wskill-absent-" + Guid.NewGuid().ToString("N")));

    /// <summary>构造量化体检服务；styleParamsMd 非空则覆盖快照（测解析优先级），null 用内嵌真实 md</summary>
    private static WritingStyleCheckService CreateService(string? styleParamsMd = null)
    {
        var skill = CreateEmbeddedSkill();
        if (styleParamsMd is not null)
            Assert.True(skill.TryReplaceResources(skill.CurrentResources with { StyleParamsMd = styleParamsMd }));
        return new WritingStyleCheckService(skill);
    }

    /// <summary>拼一张只含「领导讲话」行的 13 列参数表（11 格格式均为 "median (lo-hi)"）</summary>
    private static string Table(params string[] cells) =>
        "| 文种 | n | 字数 | 句长 | 一级 | 二级 | 三级 | 一是 | 顿号‰ | 强制 | 要求 | 建议 | % |\n" +
        "|---|---|---|---|---|---|---|---|---|---|---|---|---|\n" +
        "| 领导讲话 | 44 | " + string.Join(" | ", cells) + " |";

    /// <summary>全部参数区间放宽到几乎必中的表（用于隔离统计口径与判定逻辑）</summary>
    private static string WideTable() => Table(
        "50000 (100-99999)", "50 (1-999)", "3 (0-99)", "5 (0-99)", "0 (0-99)",
        "5 (0-99)", "20 (0-999)", "2 (0-99)", "40 (0-99)", "2 (0-99)", "0 (0-99)");

    private static WritingStyleCheckService.StyleCheckItem ItemOf(
        WritingStyleCheckService.StyleCheckReport report, string id)
        => report.Items.First(i => i.Id == id);

    // ═══════════ 1. 词表统计正确性 ═══════════

    [Fact]
    public async Task 词表统计_顿号密度一是计数与力度词正确()
    {
        var svc = CreateService(WideTable());
        var text = "一是抓统筹，二是稳生产，三是强队伍。\n"
                 + "加强组织领导、压实工作责任、强化督导检查、完善制度机制。\n"
                 + "要高度重视。要确保落实。切实推进。务必完成。必须规范。应当从严。";
        var report = await svc.CheckAsync("lecture_pre", text, CancellationToken.None);

        // 手工核算：chars=78（18+28+32）、顿号=3 → 3000/78=38.5‰；一是/二是/三是=3；
        // 强制词=必须+应当=2；要求词=要×2+确保+切实+务必=5（引号剔除与固定提法不影响本样例）
        Assert.Equal(78, (ItemOf(report, "chars")).Actual);
        Assert.Equal(38.5, (ItemOf(report, "dun")).Actual, 1);
        Assert.Equal(3, (ItemOf(report, "yishi")).Actual);
        Assert.Equal(2, (ItemOf(report, "qz")).Actual);
        Assert.Equal(5, (ItemOf(report, "yq")).Actual);
        Assert.Equal(0, (ItemOf(report, "jy")).Actual);
        Assert.Equal(0, (ItemOf(report, "pct")).Actual);
    }

    [Fact]
    public async Task 力度词统计_引号内字样与不得不与固定提法剔除()
    {
        var svc = CreateService(WideTable());
        var text = "清单要求落实\"三个必须\"要求。不得不再提一点。"
                 + "管行业必须管安全、管业务必须管安全、管生产经营必须管安全，写入责任书。";
        var report = await svc.CheckAsync("lecture_pre", text, CancellationToken.None);
        // \"三个必须\"引号内的必须不计；\"不得不\"不是禁止义不计；
        // \"三管三必须\"固定提法整句剔除 → 强制词实测 0
        Assert.Equal(0, (ItemOf(report, "qz")).Actual);
    }

    // ═══════════ 2. 文种映射全覆盖 ═══════════

    [Fact]
    public async Task 文种映射全覆盖_每个注册文体都能出报告()
    {
        var svc = CreateService();
        var skill = CreateEmbeddedSkill();
        foreach (var dt in skill.GetDocTypes())
        {
            var report = await svc.CheckAsync(dt.Code, "安全生产工作会议召开，各单位负责人参会。", CancellationToken.None);
            Assert.NotNull(report);
            Assert.False(string.IsNullOrWhiteSpace(report.Genre));
            Assert.True(report.Items.Count >= 3, $"{dt.Code} 应至少有 3 项标点纪律检查");
        }
    }

    [Fact]
    public async Task 文种映射_参数档与无参数档各就各位()
    {
        var svc = CreateService();
        var sample = "正文内容若干，用于体检统计。";

        // 参数文种（含 T19/T21 新文种）
        Assert.Equal(("领导讲话", true), await GenreOf(svc, "lecture_pre", sample));
        Assert.Equal(("领导讲话", true), await GenreOf(svc, "party_lecture", sample));
        Assert.Equal(("工作方案", true), await GenreOf(svc, "plan_full", sample));
        Assert.Equal(("工作意见", true), await GenreOf(svc, "notice_general", sample));
        Assert.Equal(("调研报告", true), await GenreOf(svc, "survey_problem", sample));
        Assert.Equal(("经验材料", true), await GenreOf(svc, "report_gov_full", sample));
        Assert.Equal(("经验材料", true), await GenreOf(svc, "work_report", sample));
        Assert.Equal(("经验总结", true), await GenreOf(svc, "monthly_summary", sample));
        Assert.Equal(("经验总结", true), await GenreOf(svc, "summary", sample));

        // 无参数文种（hasParams=false，仅标点纪律与元评论检测）
        Assert.False((await GenreOf(svc, "brief", sample)).HasParams);
        Assert.False((await GenreOf(svc, "minutes_news", sample)).HasParams);
        Assert.False((await GenreOf(svc, "weekly_report", sample)).HasParams);
        Assert.False((await GenreOf(svc, "weekly_full", sample)).HasParams);
        // news_* 未列入简报的映射清单 → 同走无参数档
        Assert.False((await GenreOf(svc, "news_meeting", sample)).HasParams);
    }

    private static async Task<(string Genre, bool HasParams)> GenreOf(
        WritingStyleCheckService svc, string code, string sample)
    {
        var r = await svc.CheckAsync(code, sample, CancellationToken.None);
        return (r.Genre, r.HasParams);
    }

    // ═══════════ 3. style-params 表解析 ═══════════

    [Fact]
    public void styleParams表解析_真实md解析出调研报告行()
    {
        var skill = CreateEmbeddedSkill();
        var md = skill.CurrentResources.StyleParamsMd;
        Assert.NotNull(md); // sync-writing-skill.bat 之后内嵌 style-params.md 应存在

        var table = WritingStyleCheckService.ParseStyleParamsTable(md!);
        Assert.True(table.Count >= 7, $"应解析出 7 个文种行，实际 {table.Count}");
        Assert.Equal(3492, table["调研报告"].Chars.Mid);
        Assert.Equal(3108, table["调研报告"].Chars.Lo);
        Assert.Equal(3820, table["调研报告"].Chars.Hi);
        Assert.Equal(45, table["调研报告"].Sent.Lo);
        Assert.Equal(59, table["调研报告"].Sent.Hi);
        Assert.Equal(9, table["调研报告"].H2.Mid);
        // 「短经验材料（党建族）」行去括号后入表；千分位逗号应剥掉
        Assert.Equal(1119, table["短经验材料"].Chars.Mid);
        // 其余表（配额/技法/身份证参数）列数不符，不应混入
        Assert.False(table.ContainsKey("文种"));
    }

    [Fact]
    public void styleParams表解析_千分位加粗与列数不符的表()
    {
        var md = "| 文种 | n | 字数 | 句长 | 一级 | 二级 | 三级 | 一是 | 顿号‰ | 强制 | 要求 | 建议 | % |\n"
               + "|---|---|---|---|---|---|---|---|---|---|---|---|---|\n"
               + "| 调研报告 | 75 | **3,492** (3108-3820) | 53 (45-59) | 3 (3-3) | 9 (0-11) | 0 (0-0) | 9 (0-12) | 22 (19-26) | 1 (0-2) | 26 (18-31) | 3 (2-5) | 0 (0-1) |\n"
               + "| 配额表干扰行 | 强制词 | 要求词 |\n";
        var table = WritingStyleCheckService.ParseStyleParamsTable(md);
        Assert.Single(table);
        Assert.Equal(3492, table["调研报告"].Chars.Mid);
    }

    [Fact]
    public async Task 参考值优先取自md解析而非兜底常量()
    {
        var svc = CreateService(Table(
            "9,999 (9000-9999)", "50 (1-999)", "3 (0-99)", "5 (0-99)", "0 (0-99)",
            "5 (0-99)", "20 (0-999)", "2 (0-99)", "40 (0-99)", "2 (0-99)", "0 (0-99)"));
        var report = await svc.CheckAsync("lecture_pre", "正文若干字数足够计入统计。", CancellationToken.None);
        Assert.Equal(9999, (ItemOf(report, "chars")).Median);
    }

    [Fact]
    public async Task 参考值md缺失时回退内置常量()
    {
        var svc = CreateService("# 没有参数表的 md");
        var report = await svc.CheckAsync("lecture_pre", "正文若干字数足够计入统计。", CancellationToken.None);
        // 兜底常量 = v0.12 表值（领导讲话：字数 3100-4200 中位 3700）
        var chars = ItemOf(report, "chars");
        Assert.Equal(3100, chars.Low);
        Assert.Equal(3700, chars.Median);
        Assert.Equal(4200, chars.High);
    }

    // ═══════════ 4. 判定哲学 ═══════════

    [Fact]
    public async Task 判定哲学_区间内全部ok且无硬冲突()
    {
        var svc = CreateService(WideTable());
        var report = await svc.CheckAsync("lecture_pre", LectureSample, CancellationToken.None);
        Assert.All(report.Items, i => Assert.Equal("ok", i.Verdict));
        Assert.Empty(report.HardWarnings);
        Assert.True(report.Items.Count >= 8);
    }

    [Fact]
    public async Task 判定哲学_单项区间外只是hint不升warn()
    {
        // 仅字数区间收窄（100-200），样本 1217 字 → 唯一偏离项；其余区间放宽
        var svc = CreateService(Table(
            "200 (100-200)", "50 (1-999)", "3 (0-99)", "5 (0-99)", "0 (0-99)",
            "5 (0-99)", "20 (0-999)", "2 (0-99)", "40 (0-99)", "2 (0-99)", "0 (0-99)"));
        var report = await svc.CheckAsync("lecture_pre", LectureSample, CancellationToken.None);

        Assert.Equal("hint", (ItemOf(report, "chars")).Verdict);
        Assert.DoesNotContain(report.Items, i => i.Verdict == "warn");
        Assert.Empty(report.HardWarnings); // 1217 ≥ 1200，公文族篇幅硬约束不触发
        Assert.DoesNotContain(report.Notes, n => n.Contains("节奏跑偏")); // 无同向升级提示
    }

    [Fact]
    public async Task 判定哲学_三项同向偏离升warn()
    {
        // 字数/句长/一级标题三项区间压低 → 样本三项同向偏多 → 整组 warn + 同向提示
        var svc = CreateService(Table(
            "200 (100-200)", "10 (1-10)", "1 (0-1)", "5 (0-99)", "0 (0-99)",
            "5 (0-99)", "20 (0-999)", "2 (0-99)", "40 (0-99)", "2 (0-99)", "0 (0-99)"));
        var report = await svc.CheckAsync("lecture_pre", LectureSample, CancellationToken.None);

        Assert.Equal("warn", (ItemOf(report, "chars")).Verdict);
        Assert.Equal("warn", (ItemOf(report, "sent")).Verdict);
        Assert.Equal("warn", (ItemOf(report, "h1")).Verdict);
        Assert.Contains(report.Notes, n => n.Contains("同向偏多"));
        Assert.Empty(report.HardWarnings); // 同向偏离是节奏问题，不是硬冲突
    }

    [Fact]
    public async Task 判定哲学_破折号超限与元评论词列入硬冲突()
    {
        var svc = CreateService(WideTable());
        var text = "这项工作非常重要——必须马上落实——不能拖延。其实就是这么回事。";
        var report = await svc.CheckAsync("lecture_pre", text, CancellationToken.None);

        Assert.Equal("warn", (ItemOf(report, "dash")).Verdict);
        Assert.Equal("warn", (ItemOf(report, "meta")).Verdict);
        Assert.Contains(report.HardWarnings, w => w.Contains("破折号"));
        Assert.Contains(report.HardWarnings, w => w.Contains("元评论词"));
    }

    [Fact]
    public async Task 判定哲学_无参数文种仅标点纪律与元评论检测()
    {
        var svc = CreateService(WideTable());
        var text = "本周完成三项工作——进展顺利——目标全面达成。说到底是大家努力的结果。";
        var report = await svc.CheckAsync("brief", text, CancellationToken.None);

        Assert.False(report.HasParams);
        // 无参数档只有 3 项：破折号 / 元评论词 / 非引语冒号
        Assert.Equal(3, report.Items.Count);
        Assert.Equal("warn", (ItemOf(report, "dash")).Verdict);
        Assert.Equal("warn", (ItemOf(report, "meta")).Verdict);
        Assert.NotEmpty(report.HardWarnings);
        Assert.Contains(report.Notes, n => n.Contains("无量化参数行"));
    }

    [Fact]
    public async Task 判定哲学_非引语冒号仅提示不判错()
    {
        var svc = CreateService(WideTable());
        // 拼在 ≥1200 字样本上避开公文族篇幅硬冲突；「同志们：」属主送机关不计数
        var text = LectureSample + "\n下一步安排：推进三项整改。";
        var report = await svc.CheckAsync("lecture_pre", text, CancellationToken.None);
        Assert.Equal(1, ItemOf(report, "colon").Actual);
        Assert.Equal("hint", ItemOf(report, "colon").Verdict);
        Assert.Empty(report.HardWarnings);
    }

    // ═══════════ 5. 验收 5：领导讲话样本体检 ═══════════

    /// <summary>
    /// 领导讲话体检样本（统计值已用 skill 仓库 check_params.py 核对）：
    /// chars=1217 / sent=50.2 / h1=3 / h2=3 / h3=0 / yishi=3 / dun=23.8‰ /
    /// qz=3 / yq=15 / jy=0 / pct=0 / dash=0 / 元评论=0。
    /// 字数与要求词两项落区间外（hint），其余区间内。
    /// </summary>
    private const string LectureSample = """
        同志们：

        今天我们召开全县安全生产工作推进会，主要任务是深入贯彻落实上级关于安全生产工作的决策部署，认真总结前一阶段工作情况，深入分析当前面临的形势任务，安排部署下阶段必须抓紧抓实的重点工作。刚才，几个部门作了很好的发言，讲了实情、提了思路、出了实招，我都赞成，请大家结合实际认真研究吸纳。

        一、肯定成绩、正视问题，切实增强抓好安全生产的责任感

        （一）成绩来之不易。今年以来，全县上下坚持人民至上、生命至上，扎实推进治本攻坚三年行动，排查整改了一大批风险隐患，依法关闭取缔了多个非法生产经营窝点，集中约谈警示了一批重点企业，事故起数和死亡人数继续保持双下降，这些成绩是全县各部门各镇街共同努力的结果，值得充分肯定，也要倍加珍惜。

        （二）问题不容忽视。从近期督查检查掌握的情况看，个别领域仍然存在监管盲区，部分企业安全生产主体责任落实不到位，员工安全培训流于形式，应急预案照抄照搬缺乏针对性，苗头性倾向性问题时有发生，必须引起我们的高度警觉，绝不能麻痹大意。

        （三）基层基础仍需夯实。部分镇街监管力量薄弱，专业能力不足，网格化排查存在走过场的现象，信息化手段运用不充分，这些短板直接影响隐患发现的及时性，也影响整改闭环的彻底性，必须下大力气加以解决。

        二、聚焦重点、精准发力，坚决防范化解重大安全风险

        一是紧盯重点领域。要突出燃气、消防、道路交通、建筑施工、危化品等高风险领域，逐项过筛、逐一销号，确保各类风险清仓见底。二是紧盯重点环节。要盯住外包作业、检维修、有限空间等事故多发环节，严格作业审批管理，坚决遏制各类违规操作行为。三是紧盯重点时段。要针对极端天气过程和节假日人流高峰，提前研判形势，提前部署力量，把功夫下在事前。

        三、压实责任、狠抓落实，确保各项部署落地见效

        各地各部门要坚持党政同责、一岗双责、齐抓共管、失职追责，把安全生产责任落实到每一个岗位、每一个人头。要加强督导检查，对工作不力落实不严的，该通报的坚决通报，该问责的严肃问责。要以钉钉子精神抓好落实，一件一件抓到底，一项一项督到位，推动全县安全生产形势持续稳定向好，为经济社会高质量发展提供坚实保障。

        同志们，安全生产责任重于泰山，任何时候都不能有丝毫松懈。县安委会办公室要发挥统筹协调作用，及时调度各成员单位的工作进展，遇到重大情况第一时间报告处置。各专业安委会要立足行业特点，把监管链条延伸到最末端，覆盖到小、散、远单位，不留死角、不留盲区。宣传部门要加强安全知识普及，用好广播、电视、新媒体等平台，营造人人讲安全、个个会应急的浓厚氛围。各级领导干部要带头开展安全检查，深入车间码头、田间地头，现场发现问题、现场研究对策，推动一批久拖不决的问题得到彻底解决。会后，请各地各部门对照今天部署的任务清单，逐项明确责任人员、完成时限和工作标准，县安委办将定期通报进展情况，年底逐项对账销号。

        今天的会议就开到这里，请大家散会后抓紧传达会议精神，认真研究部署，把各项任务不折不扣落到实处。
        """;

    [Fact]
    public async Task 领导讲话样本体检_区间外hint不误报warn且无硬冲突()
    {
        var svc = CreateService(); // 内嵌真实 style-params.md（解析值与兜底常量同源）
        var report = await svc.CheckAsync("lecture_pre", LectureSample, CancellationToken.None);

        Assert.Equal("领导讲话", report.Genre);
        Assert.True(report.HasParams);
        // 11 项参数 + 3 项标点纪律 = 14 项 ≥ 8
        Assert.True(report.Items.Count >= 8);

        // 统计口径与 check_params.py 逐项一致（样本已用原脚本核对）
        Assert.Equal(1217, (ItemOf(report, "chars")).Actual);
        Assert.Equal(50.2, (ItemOf(report, "sent")).Actual, 1);
        Assert.Equal(3, (ItemOf(report, "h1")).Actual);
        Assert.Equal(3, (ItemOf(report, "h2")).Actual);
        Assert.Equal(0, (ItemOf(report, "h3")).Actual);
        Assert.Equal(3, (ItemOf(report, "yishi")).Actual);
        Assert.Equal(23.8, (ItemOf(report, "dun")).Actual, 1);
        Assert.Equal(3, (ItemOf(report, "qz")).Actual);
        Assert.Equal(15, (ItemOf(report, "yq")).Actual);
        Assert.Equal(0, (ItemOf(report, "pct")).Actual);

        // 判定哲学：字数/要求词单项区间外 = hint（不误报 warn），其余 ok；无硬冲突
        Assert.Equal("hint", (ItemOf(report, "chars")).Verdict);
        Assert.Equal("hint", (ItemOf(report, "yq")).Verdict);
        Assert.DoesNotContain(report.Items, i => i.Verdict == "warn");
        Assert.Empty(report.HardWarnings);
        Assert.DoesNotContain(report.Notes, n => n.Contains("节奏跑偏")); // 无同向升级提示
    }

    [Fact]
    public async Task 正文超长被截断到上限()
    {
        var svc = CreateService(WideTable());
        var report = await svc.CheckAsync("lecture_pre", new string('甲', WritingStyleCheckService.MaxContentChars + 5000), CancellationToken.None);
        Assert.Equal(WritingStyleCheckService.MaxContentChars, (ItemOf(report, "chars")).Actual);
    }

    // ═══════════ 私有 Fake ═══════════

    /// <summary>仅用于构造 WritingSkillService；体检不触发 LLM 调用</summary>
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
