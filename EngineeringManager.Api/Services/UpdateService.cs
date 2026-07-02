using System.Diagnostics;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Collections.Concurrent;

namespace EngineeringManager.Api.Services;

public sealed class UpdatePackage
{
    [JsonPropertyName("url")]       public string Url { get; set; } = "";
    /// <summary>代理前缀数组（不含版本号/文件名），客户端自动拼接 Url。</summary>
    [JsonPropertyName("proxies")]   public string[]? Proxies { get; set; }
    [JsonPropertyName("size")]      public long Size { get; set; }
    [JsonPropertyName("sha256")]    public string Sha256 { get; set; } = "";
    [JsonPropertyName("signature")] public string? Signature { get; set; }

    /// <summary>
    /// 组装候选下载地址列表：proxies 前缀 + Url，末尾追加 Url 原链做永久兜底。
    /// proxies 为空时 candidates = [Url]。
    /// </summary>
    public string[] ResolveCandidates()
    {
        var candidates = new List<string>();
        if (Proxies is { Length: > 0 })
        {
            foreach (var p in Proxies)
            {
                if (string.IsNullOrWhiteSpace(p)) continue;
                candidates.Add(p.TrimEnd('/') + "/" + Url);
            }
        }
        // GitHub 原链永久兜底，放最后
        if (!string.IsNullOrWhiteSpace(Url) && !candidates.Contains(Url))
            candidates.Add(Url);
        return candidates.ToArray();
    }
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

    // ── 看门狗阈值 ──
    private const int SlowSpeedThresholdBytesPerSec = 50 * 1024;  // 50 KB/s
    private const int SlowSpeedWindowSeconds = 15;                  // 连续 15 秒低于阈值
    private const int ConnectTimeoutSeconds = 10;                   // 首字节超时

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

    // ════════════════════════════════════════════════════════════════
    //  核心下载逻辑（internal 供单元测试调用）
    // ════════════════════════════════════════════════════════════════

    private async Task DownloadAsync(UpdatePackage pkg, DownloadProgress progress, string downloadId)
    {
        try
        {
            var urls = pkg.ResolveCandidates();
            if (urls.Length == 0)
                throw new InvalidOperationException("manifest 缺少下载地址");

            Directory.CreateDirectory(UpdatesDir);
            // 文件名从原始 Url 提取（代理 URL 的 path 可能不规范）
            var fileName  = Path.GetFileName(new Uri(pkg.Url).AbsolutePath);
            var finalPath = Path.Combine(UpdatesDir, fileName);
            var partPath  = finalPath + ".part";

            progress.Phase = "downloading";
            progress.TotalBytes = pkg.Size;

            // 检查已有 .part
            long existingBytes = GetPartSize(partPath);
            if (existingBytes > 0)
                Console.WriteLine($"[Update] 发现 .part 已有 {existingBytes} 字节，尝试续传");

            var client = _http.CreateClient("update-download");
            Exception? lastError = null;

            for (int i = 0; i < urls.Length; i++)
            {
                var url = urls[i];
                var isLastSource = i == urls.Length - 1;
                var shortUrl = url.Length > 70 ? url[..70] + "..." : url;
                Console.WriteLine($"[Update] 尝试源 {i + 1}/{urls.Length}: {shortUrl}");

                try
                {
                    var result = await TryDownloadFromSourceAsync(
                        client, url, pkg, partPath, progress,
                        existingBytes, isLastSource);

                    if (result == DownloadSourceResult.Success)
                    {
                        // ── 全量 SHA256 校验 ──
                        progress.Phase = "verifying";
                        progress.BytesReceived = GetPartSize(partPath);

                        if (!await VerifySha256Async(partPath, pkg.Sha256))
                        {
                            Console.Error.WriteLine("[Update] SHA256 校验失败，删除 .part");
                            TryDeleteFile(partPath);
                            progress.Phase = "error";
                            progress.Error = "SHA256 校验失败：文件可能损坏或被篡改";
                            return;
                        }

                        // ── 原子 rename ──
                        if (File.Exists(finalPath)) File.Delete(finalPath);
                        File.Move(partPath, finalPath);

                        progress.Phase = "done";
                        progress.FilePath = finalPath;
                        progress.BytesReceived = pkg.Size;
                        Console.WriteLine($"[Update] 下载完成: {finalPath}");
                        return;
                    }

                    // 源未成功但没异常 — 更新 existingBytes 供下一个源续传
                    existingBytes = GetPartSize(partPath);
                    Console.WriteLine($"[Update] 源 {i + 1} 未成功（{result}），切换下一个源");
                }
                catch (Exception ex)
                {
                    lastError = ex;
                    existingBytes = GetPartSize(partPath);
                    Console.Error.WriteLine($"[Update] 源 {i + 1} 异常: {ex.Message}");

                    if (isLastSource)
                    {
                        progress.Phase = "error";
                        progress.Error = $"所有下载源均不可用：{ex.Message}";
                        return;
                    }
                }
            }

            progress.Phase = "error";
            progress.Error = lastError != null
                ? $"所有下载源均不可用：{lastError.Message}"
                : "所有下载源均不可用";
        }
        catch (Exception ex)
        {
            progress.Phase = "error";
            progress.Error = ex.Message;
        }
    }

    /// <summary>
    /// 从单个源尝试下载（含断点续传 + 慢速看门狗）。
    /// 返回 Success 表示下载完整；其他值表示应切到下一个源。
    /// </summary>
    internal async Task<DownloadSourceResult> TryDownloadFromSourceAsync(
        HttpClient client, string url, UpdatePackage pkg,
        string partPath, DownloadProgress progress,
        long existingBytes, bool isLastSource)
    {
        using var req = new HttpRequestMessage(HttpMethod.Get, url);
        if (existingBytes > 0)
            req.Headers.Range = new RangeHeaderValue(existingBytes, null);

        using var cts = new CancellationTokenSource();
        using var resp = await client.SendAsync(
            req, HttpCompletionOption.ResponseHeadersRead, cts.Token);

        // ── 非 2xx 处理 ──
        if (!resp.IsSuccessStatusCode)
        {
            if (resp.StatusCode == System.Net.HttpStatusCode.RequestedRangeNotSatisfiable
                && existingBytes >= pkg.Size)
            {
                // 416 且 .part 已达完整大小 → 直接进入校验
                Console.WriteLine("[Update] 416 但 .part 已达完整大小，直接校验");
                progress.BytesReceived = existingBytes;
                return DownloadSourceResult.Success;
            }
            Console.Error.WriteLine($"[Update] HTTP {(int)resp.StatusCode} {resp.ReasonPhrase}");
            return DownloadSourceResult.HardFail;
        }

        // ── 判断响应类型 ──
        var contentLength = resp.Content.Headers.ContentLength;
        bool isPartialContent = resp.StatusCode == System.Net.HttpStatusCode.PartialContent;

        if (!isPartialContent && existingBytes > 0)
        {
            // 200 OK：服务器忽略了 Range → 从 0 重写
            Console.WriteLine("[Update] 服务器忽略 Range（200 OK），从 0 重新下载");
            existingBytes = 0;
        }

        // ── 防坏源：检查 Content-Length 是否合理 ──
        if (contentLength.HasValue && !isPartialContent)
        {
            // 200 OK 时 Content-Length 应等于 pkg.Size
            if (contentLength.Value != pkg.Size)
            {
                Console.Error.WriteLine(
                    $"[Update] Content-Length ({contentLength.Value}) 与预期 ({pkg.Size}) 不符，可能不是安装包");
                return DownloadSourceResult.InvalidContent;
            }
        }

        // ── 打开目标文件 ──
        FileStream dst;
        if (isPartialContent && existingBytes > 0)
        {
            // 206: 追加模式（绝不 File.Create，会清零）
            dst = new FileStream(partPath, FileMode.Append, FileAccess.Write, FileShare.None, 81920);
            Console.WriteLine($"[Update] 续传: 从 {existingBytes} 字节开始追加");
        }
        else
        {
            // 200 OK 或全新下载: 从 0 开始
            dst = new FileStream(partPath, FileMode.Create, FileAccess.Write, FileShare.None, 81920);
            existingBytes = 0;
            Console.WriteLine("[Update] 全新下载: 从 0 开始");
        }

        await using (dst)
        {
            await using var src = await resp.Content.ReadAsStreamAsync(cts.Token);

            var buffer = new byte[81920]; // 80KB 块
            long bytesThisSession = 0;
            long sessionStartBytes = existingBytes;
            long totalBytes = existingBytes;
            var sw = Stopwatch.StartNew();
            long lastCheckBytes = 0;
            double lastCheckTime = 0;

            int bytesRead;
            while (true)
            {
                // ── 慢速看门狗（仅非兜底源） ──
                if (!isLastSource)
                {
                    var watchdogElapsed = sw.Elapsed.TotalSeconds;
                    if (watchdogElapsed - lastCheckTime >= SlowSpeedWindowSeconds)
                    {
                        var deltaBytes = totalBytes - lastCheckBytes - sessionStartBytes;
                        var speed = deltaBytes / (watchdogElapsed - lastCheckTime);
                        if (speed < SlowSpeedThresholdBytesPerSec)
                        {
                            Console.Error.WriteLine(
                                $"[Update] 慢速看门狗触发: {speed / 1024:F1} KB/s < {SlowSpeedThresholdBytesPerSec / 1024} KB/s，切换源");
                            return DownloadSourceResult.TooSlow;
                        }
                        lastCheckBytes = totalBytes - sessionStartBytes;
                        lastCheckTime = watchdogElapsed;
                    }
                }

                // ── 读取数据 ──
                using var readCts = CancellationTokenSource.CreateLinkedTokenSource(cts.Token);
                readCts.CancelAfter(TimeSpan.FromSeconds(isLastSource ? 120 : 30));
                try
                {
                    bytesRead = await src.ReadAsync(buffer.AsMemory(0, buffer.Length), readCts.Token);
                }
                catch (OperationCanceledException)
                {
                    if (isLastSource) continue; // 兜底源不因超时放弃
                    Console.Error.WriteLine("[Update] 读取超时，切换源");
                    return DownloadSourceResult.TooSlow;
                }

                if (bytesRead <= 0) break;

                await dst.WriteAsync(buffer.AsMemory(0, bytesRead));
                bytesThisSession += bytesRead;
                totalBytes = sessionStartBytes + bytesThisSession;

                // 更新进度
                progress.BytesReceived = totalBytes;
                var elapsed = sw.Elapsed.TotalSeconds;
                if (elapsed >= 1.0)
                {
                    progress.SpeedBytesPerSec = bytesThisSession / elapsed;
                }

                // 防止超过文件总大小
                if (totalBytes >= pkg.Size) break;
            }

            await dst.FlushAsync();
            sw.Stop();

            // 验证下载大小
            var finalSize = GetPartSize(partPath);
            if (finalSize != pkg.Size)
            {
                Console.Error.WriteLine(
                    $"[Update] 下载大小不符: {finalSize} != {pkg.Size}");
                return DownloadSourceResult.InvalidContent;
            }

            progress.BytesReceived = finalSize;
            return DownloadSourceResult.Success;
        }
    }

    /// <summary>对 .part 文件做全量 SHA256 校验</summary>
    internal static async Task<bool> VerifySha256Async(string partPath, string expectedHash)
    {
        if (string.IsNullOrWhiteSpace(expectedHash)) return true;

        await using var stream = File.OpenRead(partPath);
        using var sha = SHA256.Create();
        var hashBytes = await sha.ComputeHashAsync(stream);
        var hash = Convert.ToHexString(hashBytes);

        return hash.Equals(expectedHash, StringComparison.OrdinalIgnoreCase);
    }

    // ════════════════════════════════════════════════════════════════
    //  辅助方法
    // ════════════════════════════════════════════════════════════════

    internal static long GetPartSize(string partPath)
    {
        try { return File.Exists(partPath) ? new FileInfo(partPath).Length : 0; }
        catch { return 0; }
    }

    internal static void TryDeleteFile(string path)
    {
        try { if (File.Exists(path)) File.Delete(path); }
        catch { /* ignore */ }
    }

    public void ApplyAndExit(string installerPath)
    {
        if (!File.Exists(installerPath))
            throw new FileNotFoundException("安装包不存在", installerPath);

        var installDir = AppContext.BaseDirectory.TrimEnd('\\');
        var dataPath = ApiConfig.ResolveDataPath();
        var pid = Environment.ProcessId;

        // 检查是否需要提权（安装目录在 Program Files 下）
        var needsElevation = installDir.StartsWith(
            Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),
            StringComparison.OrdinalIgnoreCase)
            || installDir.StartsWith(
            Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86),
            StringComparison.OrdinalIgnoreCase);

        var psi = new ProcessStartInfo
        {
            FileName = installerPath,
            Arguments = $"--update --target \"{installDir}\" --data-path \"{dataPath}\" --wait-pid {pid}",
            UseShellExecute = true,
        };
        if (needsElevation)
            psi.Verb = "runas";

        Process.Start(psi);

        Task.Run(async () => { await Task.Delay(800); Environment.Exit(0); });
    }

    private static string Normalize(string v)
    {
        var parts = v.Split('.', StringSplitOptions.RemoveEmptyEntries);
        return parts.Length switch { <= 1 => v + ".0.0", 2 => v + ".0", _ => v };
    }
}

/// <summary>单源下载结果</summary>
internal enum DownloadSourceResult
{
    /// <summary>下载完整，可以进入校验</summary>
    Success,
    /// <summary>硬失败（连接失败 / 非 2xx / DNS 失败）</summary>
    HardFail,
    /// <summary>速度太慢，被看门狗中断</summary>
    TooSlow,
    /// <summary>内容无效（大小不符 / HTML 错误页）</summary>
    InvalidContent,
}
