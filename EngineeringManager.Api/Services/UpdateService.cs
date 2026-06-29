using System.Diagnostics;
using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace EngineeringManager.Api.Services;

public sealed class UpdatePackage
{
    [JsonPropertyName("url")]       public string Url { get; set; } = "";
    [JsonPropertyName("size")]      public long Size { get; set; }
    [JsonPropertyName("sha256")]    public string Sha256 { get; set; } = "";
    [JsonPropertyName("signature")] public string? Signature { get; set; }
}

public sealed class UpdateManifest
{
    [JsonPropertyName("latest")]     public string Latest { get; set; } = "0.0.0";
    [JsonPropertyName("minForced")]  public string MinForced { get; set; } = "0.0.0";
    [JsonPropertyName("releasedAt")] public string? ReleasedAt { get; set; }
    [JsonPropertyName("notesUrl")]   public string? NotesUrl { get; set; }
    [JsonPropertyName("package")]    public UpdatePackage? Package { get; set; }
}

public sealed record UpdateCheckResult(
    bool HasUpdate, string Current, string Latest, bool Forced,
    string? NotesUrl, UpdatePackage? Package);

public class UpdateService
{
    private readonly IHttpClientFactory _http;
    private readonly IConfiguration _cfg;
    public UpdateService(IHttpClientFactory http, IConfiguration cfg) { _http = http; _cfg = cfg; }

    // 多源 fallback：按序尝试，任一个成功即返回
    private string[] ManifestUrls =>
        _cfg.GetSection("Update:ManifestUrls").Get<string[]>()
        ?? throw new InvalidOperationException("缺少配置 Update:ManifestUrls");

    // 当前版本：程序集版本 >= .csproj <Version>
    public string CurrentVersion =>
        typeof(UpdateService).Assembly.GetName().Version?.ToString(3)
        ?? _cfg["Update:CurrentVersion"]
        ?? "0.0.0";

    public async Task<UpdateCheckResult> CheckAsync(CancellationToken ct)
    {
        UpdateManifest? m = null;
        Exception? last = null;
        foreach (var url in ManifestUrls)
        {
            try
            {
                m = await _http.CreateClient("update").GetFromJsonAsync<UpdateManifest>(url, ct);
                if (m != null) break;
            }
            catch (Exception ex) { last = ex; }
        }
        if (m == null) throw new InvalidOperationException("所有 manifest 源均不可达", last);

        var cur    = Version.Parse(Normalize(CurrentVersion));
        var latest = Version.Parse(Normalize(m.Latest));
        var forced = Version.Parse(Normalize(m.MinForced)) > cur;
        var has    = latest > cur;

        return new UpdateCheckResult(has, CurrentVersion, m.Latest, forced,
            m.NotesUrl, has ? m.Package : null);
    }

    /// <summary>下载目录：%LocalAppData%/工程管家/updates/</summary>
    public string UpdatesDir => Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "工程管家", "updates");

    public async Task<string> DownloadAsync(UpdatePackage pkg, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(pkg.Url))
            throw new InvalidOperationException("manifest 缺少下载地址");

        Directory.CreateDirectory(UpdatesDir);
        var fileName  = Path.GetFileName(new Uri(pkg.Url).AbsolutePath);
        var finalPath = Path.Combine(UpdatesDir, fileName);
        var partPath  = finalPath + ".part";

        var client = _http.CreateClient("update-download");
        using (var resp = await client.GetAsync(pkg.Url, HttpCompletionOption.ResponseHeadersRead, ct))
        {
            resp.EnsureSuccessStatusCode();
            await using var src = await resp.Content.ReadAsStreamAsync(ct);
            await using var dst = File.Create(partPath);
            await src.CopyToAsync(dst, ct);
        }

        // SHA256 校验（manifest 没填 sha256 时跳过）
        if (!string.IsNullOrWhiteSpace(pkg.Sha256))
        {
            await using var fs = File.OpenRead(partPath);
            var hash = Convert.ToHexString(await System.Security.Cryptography.SHA256.HashDataAsync(fs, ct));
            if (!hash.Equals(pkg.Sha256, StringComparison.OrdinalIgnoreCase))
            {
                File.Delete(partPath);
                throw new InvalidOperationException($"SHA256 校验失败：期望 {pkg.Sha256}，实际 {hash}");
            }
        }

        if (File.Exists(finalPath)) File.Delete(finalPath);
        File.Move(partPath, finalPath);
        return finalPath;
    }

    /// <summary>启动安装器并退出当前进程（单进程，关自己让安装器覆盖）</summary>
    public void ApplyAndExit(string installerPath)
    {
        if (!File.Exists(installerPath))
            throw new FileNotFoundException("安装包不存在", installerPath);

        Process.Start(new ProcessStartInfo
        {
            FileName = installerPath,
            UseShellExecute = true,
        });

        // 给 HTTP 响应一点时间回包，再退出整个进程
        Task.Run(async () => { await Task.Delay(800); Environment.Exit(0); });
    }

    private static string Normalize(string v)
    {
        var parts = v.Split('.', StringSplitOptions.RemoveEmptyEntries);
        return parts.Length switch { <= 1 => v + ".0.0", 2 => v + ".0", _ => v };
    }
}