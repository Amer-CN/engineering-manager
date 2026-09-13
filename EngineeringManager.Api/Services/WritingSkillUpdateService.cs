using System.Text.Json;
using System.Text.RegularExpressions;

namespace EngineeringManager.Api.Services;

/// <summary>
/// 写作中心 skill 运行期热更服务：
/// 后台拉取 GitHub 远端（Amer-CN/super-official-writer master）6 份固定 md
/// （SKILL + templates/phrase-library/format-spec/style-params/corpus-lingyun）
/// 外加 corpus/ 子目录动态清单（GitHub contents API 列出全部 .md 逐个下载），
/// 与本地版本锚点语义比较，有新版且结构校验通过才落盘数据目录并热切换内存快照，
/// 下次请求即用新版。HttpClient 用法/超时/后台任务模式参考 UpdateService（_ = Task.Run）。
/// 任何失败仅 Console.Error 日志，静默降级，不影响启动与写作功能。
/// </summary>
public sealed class WritingSkillUpdateService
{
    private const string RawBase = "https://raw.githubusercontent.com/Amer-CN/super-official-writer/master/";
    private const string CorpusListingApi = "https://api.github.com/repos/Amer-CN/super-official-writer/contents/references/corpus";
    private const int HttpTimeoutSeconds = 30;

    private static readonly Regex VersionAnchorRegex =
        new(@"<!--\s*skill-version:\s*(v[\d.]+)\s*-->", RegexOptions.Compiled);

    private readonly IHttpClientFactory _http;
    private readonly WritingSkillService _skill;

    public WritingSkillUpdateService(IHttpClientFactory http, WritingSkillService skill)
    {
        _http = http;
        _skill = skill;
    }

    /// <summary>唯一公开入口：Task.Run 后台执行检查，立即返回；内部全 try/catch 静默</summary>
    public void StartBackgroundCheck()
    {
        _ = Task.Run(async () =>
        {
            try { await CheckAndUpdateAsync(); }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[WritingSkillUpdate] 后台检查失败（已忽略，写作功能不受影响）: {ex.Message}");
            }
        });
    }

    private async Task CheckAndUpdateAsync()
    {
        var client = _http.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(HttpTimeoutSeconds);
        // GitHub contents API 强制要求 User-Agent，raw 下载带上同样无害
        client.DefaultRequestHeaders.UserAgent.ParseAdd("EngineeringManager-writing-skill-update");

        var skillMd = await client.GetStringAsync(RawBase + "SKILL.md");
        var remoteVersion = ParseVersionAnchor(skillMd);
        if (remoteVersion is null)
        {
            Console.Error.WriteLine("[WritingSkillUpdate] 远端 SKILL.md 无版本锚点，跳过热更");
            return;
        }
        var cmp = CompareVersions(remoteVersion, _skill.CurrentVersion);
        if (cmp is null || cmp <= 0) return; // 远端 ≤ 本地 或 本地无版本锚点 → 不更新

        var templatesMd = await client.GetStringAsync(RawBase + "references/templates.md");
        var phraseLibraryMd = await client.GetStringAsync(RawBase + "references/phrase-library.md");
        var formatSpecMd = await client.GetStringAsync(RawBase + "references/format-spec.md");
        var styleParamsMd = await client.GetStringAsync(RawBase + "references/style-params.md");
        var corpusLingyunMd = await client.GetStringAsync(RawBase + "references/corpus-lingyun.md");

        // 动态清单：列 contents API 取全部 .md 的 download_url 逐个下载
        var corpusFiles = await DownloadCorpusFilesAsync(client);

        var candidate = new WritingSkillService.SkillResources(
            skillMd, templatesMd, phraseLibraryMd, formatSpecMd, remoteVersion, "data-dir",
            styleParamsMd, corpusFiles);

        // core 4 份走 ValidateResources；style-params 与 corpus 仅要求非空（>100 字符）
        if (!_skill.ValidateResources(candidate))
        {
            Console.Error.WriteLine($"[WritingSkillUpdate] 远端 {remoteVersion} 资源结构校验未通过，放弃热更");
            return;
        }
        if (!ValidateAuxiliaryResources(candidate))
        {
            Console.Error.WriteLine($"[WritingSkillUpdate] 远端 {remoteVersion} style-params/corpus 校验未通过，放弃热更");
            return;
        }

        // 先全部写 download-*.tmp，再逐个 File.Move(overwrite) 替换，
        // 避免半写状态被下次启动读到；corpus 子目录先创建
        var dir = Path.Combine(ApiConfig.ResolveDataPath(), "writing-skill");
        Directory.CreateDirectory(dir);
        var corpusDir = Path.Combine(dir, "corpus");
        Directory.CreateDirectory(corpusDir);
        var files = new (string Name, string Text)[]
        {
            ("SKILL.md", skillMd),
            ("templates.md", templatesMd),
            ("phrase-library.md", phraseLibraryMd),
            ("format-spec.md", formatSpecMd),
            ("style-params.md", styleParamsMd),
            ("corpus-lingyun.md", corpusLingyunMd),
        };
        foreach (var (name, text) in files)
            await File.WriteAllTextAsync(Path.Combine(dir, $"download-{name}.tmp"), text);
        foreach (var (name, _) in files)
            File.Move(Path.Combine(dir, $"download-{name}.tmp"), Path.Combine(dir, name), overwrite: true);
        foreach (var (name, text) in corpusFiles)
            await File.WriteAllTextAsync(Path.Combine(corpusDir, $"download-{name}.tmp"), text);
        foreach (var (name, _) in corpusFiles)
            File.Move(Path.Combine(corpusDir, $"download-{name}.tmp"), Path.Combine(corpusDir, name), overwrite: true);

        // 写盘成功后再交换内存快照：磁盘与内存一致生效
        if (_skill.TryReplaceResources(candidate))
            Console.WriteLine($"[WritingSkillUpdate] skill 已热更至 {remoteVersion}（来源 data-dir，corpus {corpusFiles.Count} 份）");
    }

    /// <summary>列 GitHub contents API（需 User-Agent，调用方已设）取全部 .md 逐个下载，
    /// 返回 文件名 → 全文（含 INDEX.md）</summary>
    private static async Task<IReadOnlyDictionary<string, string>> DownloadCorpusFilesAsync(HttpClient client)
    {
        var listing = ParseCorpusListing(await client.GetStringAsync(CorpusListingApi));
        var dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var (name, url) in listing)
            dict[name] = await client.GetStringAsync(url);
        return dict;
    }

    /// <summary>解析 GitHub contents API 响应：取全部 file 类型 .md 条目的 (文件名, download_url)，
    /// 目录条目 / 无 download_url 的跳过</summary>
    internal static IReadOnlyList<(string Name, string Url)> ParseCorpusListing(string json)
    {
        var list = new List<(string Name, string Url)>();
        using var doc = JsonDocument.Parse(json);
        foreach (var el in doc.RootElement.EnumerateArray())
        {
            if (!el.TryGetProperty("name", out var n) || n.ValueKind != JsonValueKind.String) continue;
            var name = n.GetString();
            if (string.IsNullOrEmpty(name) || !name.EndsWith(".md", StringComparison.OrdinalIgnoreCase)) continue;
            if (el.TryGetProperty("type", out var t) && t.GetString() != "file") continue;
            if (!el.TryGetProperty("download_url", out var u) || u.ValueKind != JsonValueKind.String) continue;
            var url = u.GetString();
            if (string.IsNullOrEmpty(url)) continue;
            list.Add((name, url));
        }
        return list;
    }

    /// <summary>辅助资源热更校验：style-params 与各 corpus 文件仅要求非空（长度 &gt; 100），
    /// null（远端未提供）容忍；任一不过整体放弃热更（与 core 校验失败行为一致）</summary>
    internal static bool ValidateAuxiliaryResources(WritingSkillService.SkillResources r)
    {
        if (r.StyleParamsMd is { Length: <= 100 }) return false;
        foreach (var text in r.CorpusFiles?.Values ?? Enumerable.Empty<string>())
            if (text.Length <= 100) return false;
        return true;
    }

    /// <summary>解析 SKILL.md 版本锚点，命中返回锚点版本（如 v0.12），解析失败返回 null</summary>
    internal static string? ParseVersionAnchor(string? skillMd)
    {
        if (string.IsNullOrEmpty(skillMd)) return null;
        var m = VersionAnchorRegex.Match(skillMd);
        return m.Success ? m.Groups[1].Value : null;
    }

    /// <summary>
    /// 语义版本比较（v0.11.1 解析成 [0,11,1] 逐段比）：远端更新返回 1，相等 0，更旧 -1。
    /// 任一侧为 null（锚点解析失败/本地无版本）→ 返回 null，调用方视为「不更新」。
    /// </summary>
    internal static int? CompareVersions(string? remote, string? local)
    {
        if (remote is null || local is null) return null;
        var r = ParseVersionParts(remote);
        var l = ParseVersionParts(local);
        for (var i = 0; i < Math.Max(r.Length, l.Length); i++)
        {
            var rv = i < r.Length ? r[i] : 0;
            var lv = i < l.Length ? l[i] : 0;
            if (rv != lv) return rv > lv ? 1 : -1;
        }
        return 0;
    }

    private static int[] ParseVersionParts(string version)
    {
        var body = version.Trim().TrimStart('v', 'V');
        return body.Split('.', StringSplitOptions.RemoveEmptyEntries)
            .Select(p => int.TryParse(p, out var n) ? n : 0)
            .ToArray();
    }
}
