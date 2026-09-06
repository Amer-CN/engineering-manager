using EngineeringManager.Api.Models;
using EngineeringManager.Api.Services;
using Xunit;

namespace EngineeringManager.Tests.Services;

/// <summary>
/// 写作中心 skill 热更单测（全部本地字符串/临时目录，不依赖真实网络）：
///   · 版本锚点解析 / 语义版本比较（null 参与视为「不更新」）
///   · ValidateResources 结构校验（锚点 + 一/三/五/六区块 + 全文体模板无「缺失」占位）
///   · 数据目录 4 份齐全优先加载（含标记贯通 BuildDraftPrompts）/ 缺 1 份回退内嵌
///   · TryReplaceResources 原子热切换（坏快照拒绝且当前快照不变）
///   · v0.12 扩展：style-params/corpus 辅助校验、corpus 清单解析、数据目录两种布局装载
/// </summary>
public class WritingSkillUpdateTests
{
    private static WritingDraftRequest Draft(
        string docType = "summary",
        string material = "2026年8月，项目部完成[[42]]个安全隐患整改。")
        => new(DocType: docType, Title: "季度工作总结", Audience: null,
               Material: material, StyleId: "S1", DetailLevel: 3);

    /// <summary>构造使用内嵌资源的 WritingSkillService（skillDir 指向不存在的目录 → 必然回退内嵌）</summary>
    private static WritingSkillService CreateEmbeddedService()
        => new(new FakeLlm(), null, Path.Combine(Path.GetTempPath(), "wskill-absent-" + Guid.NewGuid().ToString("N")));

    private static string TempDir(string prefix)
    {
        var dir = Path.Combine(Path.GetTempPath(), prefix + "-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(dir);
        return dir;
    }

    // ═══════════ 1. 锚点解析 ═══════════

    [Fact]
    public void 锚点解析_正常锚点返回版本()
        => Assert.Equal("v0.12",
            WritingSkillUpdateService.ParseVersionAnchor("# 标题\n<!-- skill-version: v0.12 -->\n正文"));

    [Fact]
    public void 锚点解析_无锚点返回null()
        => Assert.Null(WritingSkillUpdateService.ParseVersionAnchor("# 没有版本锚点的 SKILL\n正文"));

    // ═══════════ 2. 版本比较 ═══════════

    [Fact]
    public void 版本比较_逐段语义比较()
    {
        Assert.True(WritingSkillUpdateService.CompareVersions("v0.11.1", "v0.12") < 0); // [0,11,1] < [0,12]
        Assert.Equal(0, WritingSkillUpdateService.CompareVersions("v0.12", "v0.12"));
        Assert.True(WritingSkillUpdateService.CompareVersions("v0.13", "v0.12") > 0);
    }

    [Fact]
    public void 版本比较_null参与视为不更新()
    {
        // 任一侧为 null（锚点解析失败/本地无锚点）→ 返回 null，调用方视为「不更新」
        Assert.Null(WritingSkillUpdateService.CompareVersions(null, "v0.12"));
        Assert.Null(WritingSkillUpdateService.CompareVersions("v0.13", null));
        Assert.Null(WritingSkillUpdateService.CompareVersions(null, null));
    }

    // ═══════════ 3. ValidateResources ═══════════

    [Fact]
    public void ValidateResources_内嵌资源组装的合法快照通过()
    {
        var svc = CreateEmbeddedService();
        Assert.True(svc.ValidateResources(svc.CurrentResources));
    }

    [Fact]
    public void ValidateResources_SKILL删掉三节文本则不通过()
    {
        var svc = CreateEmbeddedService();
        var bad = svc.CurrentResources with { SkillMd = svc.CurrentResources.SkillMd.Replace("## 三、", "## 三X、") };
        Assert.False(svc.ValidateResources(bad));
    }

    [Fact]
    public void ValidateResources_模板删掉T8章文本则不通过()
    {
        var svc = CreateEmbeddedService();
        var bad = svc.CurrentResources with { TemplatesMd = svc.CurrentResources.TemplatesMd.Replace("## T8.", "## T8X.") };
        Assert.False(svc.ValidateResources(bad));
    }

    // ═══════════ 4. 数据目录优先 ═══════════

    [Fact]
    public void 数据目录四份齐全优先使用且标记贯通prompt()
    {
        var embedded = CreateEmbeddedService().CurrentResources;
        // 标记插进「## 一、」区块内（BuildDraftPrompts system 会抽取该区块）
        var marker = $"<!-- data-dir 标记 {Guid.NewGuid().ToString("N")} -->";
        var anchor = "## 一、";
        var idx = embedded.SkillMd.IndexOf(anchor, StringComparison.Ordinal);
        Assert.True(idx >= 0);
        var skillMd = embedded.SkillMd.Insert(idx + anchor.Length, "\n" + marker);

        var dir = TempDir("wskill-data");
        try
        {
            File.WriteAllText(Path.Combine(dir, "SKILL.md"), skillMd);
            File.WriteAllText(Path.Combine(dir, "templates.md"), embedded.TemplatesMd);
            File.WriteAllText(Path.Combine(dir, "phrase-library.md"), embedded.PhraseLibraryMd);
            File.WriteAllText(Path.Combine(dir, "format-spec.md"), embedded.FormatSpecMd);

            var sut = new WritingSkillService(new FakeLlm(), null, dir);
            Assert.Equal("data-dir", sut.Source);
            var (system, _) = sut.BuildDraftPrompts(Draft());
            Assert.Contains(marker, system);
        }
        finally
        {
            try { Directory.Delete(dir, recursive: true); } catch { }
        }
    }

    [Fact]
    public void 数据目录缺一份回退内嵌()
    {
        var embedded = CreateEmbeddedService().CurrentResources;
        var dir = TempDir("wskill-missing");
        try
        {
            // 只写 3 份（缺 format-spec.md）→ 整体回退内嵌，SKILL.md 里的多余标记不得生效
            File.WriteAllText(Path.Combine(dir, "SKILL.md"), embedded.SkillMd + "\n<!-- 多余标记不应出现 -->");
            File.WriteAllText(Path.Combine(dir, "templates.md"), embedded.TemplatesMd);
            File.WriteAllText(Path.Combine(dir, "phrase-library.md"), embedded.PhraseLibraryMd);

            var sut = new WritingSkillService(new FakeLlm(), null, dir);
            Assert.Equal("embedded", sut.Source);
            var (system, _) = sut.BuildDraftPrompts(Draft());
            Assert.DoesNotContain("多余标记不应出现", system);
        }
        finally
        {
            try { Directory.Delete(dir, recursive: true); } catch { }
        }
    }

    // ═══════════ 5. TryReplaceResources ═══════════

    [Fact]
    public void TryReplaceResources_坏快照拒绝且当前快照未变()
    {
        var svc = CreateEmbeddedService();
        var before = svc.CurrentResources;
        var bad = before with { SkillMd = before.SkillMd.Replace("## 三、", "## 三X、") };
        Assert.False(svc.TryReplaceResources(bad));
        Assert.Same(before, svc.CurrentResources);
    }

    [Fact]
    public void TryReplaceResources_好快照生效()
    {
        var svc = CreateEmbeddedService();
        var before = svc.CurrentResources;
        var good = before with { Version = "v0.99", Source = "data-dir" };
        Assert.True(svc.TryReplaceResources(good));
        Assert.Equal("v0.99", svc.CurrentVersion);
        Assert.Equal("data-dir", svc.Source);
        Assert.NotSame(before, svc.CurrentResources);
    }

    // ═══════════ 6. corpus / style-params 热更扩展（v0.12） ═══════════

    [Fact]
    public void 辅助资源校验_styleParams与corpus非空才通过()
    {
        var baseRes = CreateEmbeddedService().CurrentResources;
        // 均缺失（旧版热更产物布局）→ 容忍
        Assert.True(WritingSkillUpdateService.ValidateAuxiliaryResources(
            baseRes with { StyleParamsMd = null, CorpusFiles = new Dictionary<string, string>() }));
        // style-params 太短（≤100 字符）→ 拒绝
        Assert.False(WritingSkillUpdateService.ValidateAuxiliaryResources(
            baseRes with { StyleParamsMd = "太短" }));
        // corpus 某文件太短 → 拒绝
        Assert.False(WritingSkillUpdateService.ValidateAuxiliaryResources(
            baseRes with { CorpusFiles = new Dictionary<string, string> { ["stub.md"] = "短" } }));
        // 正常长度 → 通过
        Assert.True(WritingSkillUpdateService.ValidateAuxiliaryResources(
            baseRes with
            {
                StyleParamsMd = new string('参', 200),
                CorpusFiles = new Dictionary<string, string> { ["layer.md"] = new string('条', 200) },
            }));
    }

    [Fact]
    public void corpus清单解析_只取文件型md且带downloadUrl()
    {
        var json = """
            [
              {"name":"INDEX.md","type":"file","download_url":"https://raw/x/INDEX.md"},
              {"name":"lingyun-huishui.md","type":"file","download_url":"https://raw/x/lingyun-huishui.md"},
              {"name":"adir.md","type":"dir","download_url":null},
              {"name":"notes.txt","type":"file","download_url":"https://raw/x/notes.txt"},
              {"name":"no-url.md","type":"file","download_url":null}
            ]
            """;
        var listing = WritingSkillUpdateService.ParseCorpusListing(json);
        Assert.Equal(2, listing.Count);
        Assert.Equal(("INDEX.md", "https://raw/x/INDEX.md"), listing[0]);
        Assert.Equal(("lingyun-huishui.md", "https://raw/x/lingyun-huishui.md"), listing[1]);
    }

    [Fact]
    public void 数据目录styleParams与corpus存在时一并装入并贯通prompt()
    {
        var embedded = CreateEmbeddedService().CurrentResources;
        var dir = TempDir("wskill-corpus");
        try
        {
            File.WriteAllText(Path.Combine(dir, "SKILL.md"), embedded.SkillMd);
            File.WriteAllText(Path.Combine(dir, "templates.md"), embedded.TemplatesMd);
            File.WriteAllText(Path.Combine(dir, "phrase-library.md"), embedded.PhraseLibraryMd);
            File.WriteAllText(Path.Combine(dir, "format-spec.md"), embedded.FormatSpecMd);
            File.WriteAllText(Path.Combine(dir, "style-params.md"), "# 参数表\n" + new string('参', 200));
            Directory.CreateDirectory(Path.Combine(dir, "corpus"));
            File.WriteAllText(Path.Combine(dir, "corpus", "lingyun-huishui.md"),
                "## 总结写法\n\n- **总结技巧**：写总结的实战方法论条目，内容长度足够。\n");

            var sut = new WritingSkillService(new FakeLlm(), null, dir);
            Assert.Equal("data-dir", sut.Source);
            Assert.NotNull(sut.CurrentResources.StyleParamsMd);
            Assert.Single(sut.CurrentResources.CorpusFiles!);
            Assert.Contains("lingyun-huishui.md", sut.CurrentResources.CorpusFiles!.Keys);

            // summary 的 hints（总结/汇报/成绩）命中「总结技巧」→ 蒸馏区块注入
            var (system, _) = sut.BuildDraftPrompts(Draft());
            Assert.Contains("蒸馏知识库参考", system);
            Assert.Contains("总结技巧", system);
        }
        finally
        {
            try { Directory.Delete(dir, recursive: true); } catch { }
        }
    }

    [Fact]
    public void 数据目录只有core四份时corpus为空且prompt不含蒸馏区块()
    {
        // 向后兼容硬要求：旧版热更产物（无 style-params / corpus）照样可用
        var embedded = CreateEmbeddedService().CurrentResources;
        var dir = TempDir("wskill-coreonly");
        try
        {
            File.WriteAllText(Path.Combine(dir, "SKILL.md"), embedded.SkillMd);
            File.WriteAllText(Path.Combine(dir, "templates.md"), embedded.TemplatesMd);
            File.WriteAllText(Path.Combine(dir, "phrase-library.md"), embedded.PhraseLibraryMd);
            File.WriteAllText(Path.Combine(dir, "format-spec.md"), embedded.FormatSpecMd);

            var sut = new WritingSkillService(new FakeLlm(), null, dir);
            Assert.Equal("data-dir", sut.Source);
            Assert.Null(sut.CurrentResources.StyleParamsMd);
            Assert.Empty(sut.CurrentResources.CorpusFiles!);

            var (system, _) = sut.BuildDraftPrompts(Draft());
            Assert.DoesNotContain("蒸馏知识库", system);
            // prompt 结构与无 corpus 现状一致：模板区块之后直接衔接素材库区块
            var idxTemplate = system.IndexOf("## 本次文体框架模板", StringComparison.Ordinal);
            var idxPhrase = system.IndexOf("## 可用公文素材库", StringComparison.Ordinal);
            Assert.True(idxTemplate >= 0 && idxPhrase > idxTemplate);
        }
        finally
        {
            try { Directory.Delete(dir, recursive: true); } catch { }
        }
    }

    // ═══════════ 私有 Fake ═══════════

    /// <summary>仅用于构造 WritingSkillService；本组测试不触发 LLM 调用</summary>
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
