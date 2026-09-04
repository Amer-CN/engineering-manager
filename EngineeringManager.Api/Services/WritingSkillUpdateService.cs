using System.Text.RegularExpressions;

namespace EngineeringManager.Api.Services;

/// <summary>
/// 写作中心 skill 运行期热更服务：
/// 后台拉取 GitHub 远端（Amer-CN/super-official-writer master）4 份 md，
/// 与本地版本锚点语义比较，有新版且结构校验通过才落盘数据目录并热切换内存快照，
/// 下次请求即用新版。HttpClient 用法/超时/后台任务模式参考 UpdateService（_ = Task.Run）。
/// 任何失败仅 Console.Error 日志，静默降级，不影响启动与写作功能。
/// </summary>
public sealed class WritingSkillUpdateService
{
    private const string RawBase = "https://raw.githubusercontent.com/Amer-CN/super-official-writer/master/";
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

        var candidate = new WritingSkillService.SkillResources(
            skillMd, templatesMd, phraseLibraryMd, formatSpecMd, remoteVersion, "data-dir");

        if (!_skill.ValidateResources(candidate))
        {
            Console.Error.WriteLine($"[WritingSkillUpdate] 远端 {remoteVersion} 资源结构校验未通过，放弃热更");
            return;
        }

        // 先全部写 download-*.tmp，再逐个 File.Move(overwrite) 替换，
        // 避免半写状态被下次启动读到
        var dir = Path.Combine(ApiConfig.ResolveDataPath(), "writing-skill");
        Directory.CreateDirectory(dir);
        var files = new (string Name, string Text)[]
        {
            ("SKILL.md", skillMd),
            ("templates.md", templatesMd),
            ("phrase-library.md", phraseLibraryMd),
            ("format-spec.md", formatSpecMd),
        };
        foreach (var (name, text) in files)
            await File.WriteAllTextAsync(Path.Combine(dir, $"download-{name}.tmp"), text);
        foreach (var (name, _) in files)
            File.Move(Path.Combine(dir, $"download-{name}.tmp"), Path.Combine(dir, name), overwrite: true);

        // 写盘成功后再交换内存快照：磁盘与内存一致生效
        if (_skill.TryReplaceResources(candidate))
            Console.WriteLine($"[WritingSkillUpdate] skill 已热更至 {remoteVersion}（来源 data-dir）");
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
