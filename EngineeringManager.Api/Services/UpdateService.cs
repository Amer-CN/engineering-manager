using System.Diagnostics;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Collections.Concurrent;

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

/// <summary>下载进度状态（线程安全）</summary>
public sealed class DownloadProgress
{
    public string Phase { get; set; } = "idle";   // idle|downloading|verifying|done|error
    public long BytesReceived { get; set; }
    public long? TotalBytes { get; set; }
    public double? Percent => TotalBytes.HasValue && TotalBytes.Value > 0
        ? Math.Round((double)BytesReceived / TotalBytes.Value * 100, 1)
        : null;
    public double? SpeedBytesPerSec { get; set; }
    public string? FilePath { get; set; }
    public string? Error { get; set; }

    public string ToJson() => JsonSerializer.Serialize(this, new JsonSerializerOptions
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    });
}

public class UpdateService
{
    private readonly IHttpClientFactory _http;
    private readonly IConfiguration _cfg;
    private readonly ConcurrentDictionary<string, DownloadProgress> _downloads = new();

    public UpdateService(IHttpClientFactory http, IConfiguration cfg) { _http = http; _cfg = cfg; }

    private string[] ManifestUrls =>
        _cfg.GetSection("Update:ManifestUrls").Get<string[]>()
        ?? throw new InvalidOperationException("缺少配置 Update:ManifestUrls");

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

    public string UpdatesDir => Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "工程管家", "updates");

    /// <summary>获取当前下载进度（调用方通常用 downloadId="default"）</summary>
    public DownloadProgress? GetProgress(string downloadId = "default")
    {
        return _downloads.TryGetValue(downloadId, out var p) ? p : null;
    }

    /// <summary>启动后台下载，立即返回。进度通过 GetProgress 或 SSE 查询。</summary>
    public void StartDownload(UpdatePackage pkg, string downloadId = "default")
    {
        var progress = new DownloadProgress { Phase = "idle" };
        _downloads[downloadId] = progress;

        // 后台执行，不阻塞请求
        _ = Task.Run(async () => await DownloadAsync(pkg, progress, downloadId));
    }

    private async Task DownloadAsync(UpdatePackage pkg, DownloadProgress progress, string downloadId)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(pkg.Url))
                throw new InvalidOperationException("manifest 缺少下载地址");

            Directory.CreateDirectory(UpdatesDir);
            var fileName  = Path.GetFileName(new Uri(pkg.Url).AbsolutePath);
            var finalPath = Path.Combine(UpdatesDir, fileName);
            var partPath  = finalPath + ".part";

            progress.Phase = "downloading";

            var client = _http.CreateClient("update-download");
            using var resp = await client.GetAsync(pkg.Url, HttpCompletionOption.ResponseHeadersRead, CancellationToken.None);
            resp.EnsureSuccessStatusCode();

            progress.TotalBytes = resp.Content.Headers.ContentLength;

            await using var src = await resp.Content.ReadAsStreamAsync();
            await using var dst = File.Create(partPath);

            var buffer = new byte[81920]; // 80KB 块
            long bytesReceived = 0;
            var sw = Stopwatch.StartNew();
            long lastBytes = 0;
            double lastTimestamp = 0;

            // 增量 SHA256 计算
            using var incrementalHash = System.Security.Cryptography.IncrementalHash.CreateHash(
                System.Security.Cryptography.HashAlgorithmName.SHA256);

            int bytesRead;
            while ((bytesRead = await src.ReadAsync(buffer)) > 0)
            {
                await dst.WriteAsync(buffer.AsMemory(0, bytesRead));
                incrementalHash.AppendData(buffer.AsSpan(0, bytesRead));

                bytesReceived += bytesRead;
                var elapsed = sw.Elapsed.TotalSeconds;
                // 每秒更新一次速度（避免高频抖动）
                if (elapsed - lastTimestamp >= 1.0)
                {
                    var deltaBytes = bytesReceived - lastBytes;
                    var deltaTime = elapsed - lastTimestamp;
                    progress.SpeedBytesPerSec = deltaTime > 0 ? deltaBytes / deltaTime : null;
                    lastBytes = bytesReceived;
                    lastTimestamp = elapsed;
                }

                progress.BytesReceived = bytesReceived;
            }

            await dst.FlushAsync();
            sw.Stop();

            // 校验前标记
            progress.Phase = "verifying";

            // SHA256 校验
            if (!string.IsNullOrWhiteSpace(pkg.Sha256))
            {
                var hash = Convert.ToHexString(incrementalHash.GetHashAndReset());
                if (!hash.Equals(pkg.Sha256, StringComparison.OrdinalIgnoreCase))
                {
                    File.Delete(partPath);
                    progress.Phase = "error";
                    progress.Error = $"SHA256 校验失败：期望 {pkg.Sha256[..16]}...，实际 {hash[..16]}...";
                    return;
                }
            }

            // 原子 rename
            if (File.Exists(finalPath)) File.Delete(finalPath);
            File.Move(partPath, finalPath);

            progress.Phase = "done";
            progress.FilePath = finalPath;
            progress.BytesReceived = bytesReceived;
        }
        catch (Exception ex)
        {
            progress.Phase = "error";
            progress.Error = ex.Message;
        }
    }

    public void ApplyAndExit(string installerPath)
    {
        if (!File.Exists(installerPath))
            throw new FileNotFoundException("安装包不存在", installerPath);

        Process.Start(new ProcessStartInfo
        {
            FileName = installerPath,
            UseShellExecute = true,
        });

        Task.Run(async () => { await Task.Delay(800); Environment.Exit(0); });
    }

    private static string Normalize(string v)
    {
        var parts = v.Split('.', StringSplitOptions.RemoveEmptyEntries);
        return parts.Length switch { <= 1 => v + ".0.0", 2 => v + ".0", _ => v };
    }
}