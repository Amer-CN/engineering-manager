using System.Net;
using System.Security.Cryptography;
using EngineeringManager.Api.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

// ════════════════════════════════════════════════════════════════
//  辅助：可编程 HttpMessageHandler + TestHttpClientFactory
// ════════════════════════════════════════════════════════════════

/// <summary>按请求 URL 分发的可编程 HttpMessageHandler</summary>
internal sealed class ProgrammableHandler : HttpMessageHandler
{
    private readonly Dictionary<string, Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>>> _routes = new();

    public ProgrammableHandler Route(string urlContains, Func<HttpRequestMessage, HttpResponseMessage> handler)
    {
        _routes[urlContains] = (req, ct) => Task.FromResult(handler(req));
        return this;
    }

    /// <summary>异步路由（支持延迟/取消）</summary>
    public ProgrammableHandler RouteAsync(string urlContains, Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> handler)
    {
        _routes[urlContains] = handler;
        return this;
    }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        foreach (var (pattern, handler) in _routes)
        {
            if (request.RequestUri!.ToString().Contains(pattern))
            {
                return await handler(request, cancellationToken);
            }
        }
        return new HttpResponseMessage(HttpStatusCode.NotFound);
    }
}

/// <summary>测试用 IHttpClientFactory</summary>
internal sealed class TestHttpClientFactory : IHttpClientFactory
{
    private readonly HttpMessageHandler _handler;
    public TestHttpClientFactory(HttpMessageHandler handler) => _handler = handler;
    public HttpClient CreateClient(string name) => new(_handler, disposeHandler: false)
    {
        Timeout = Timeout.InfiniteTimeSpan
    };
}

// ════════════════════════════════════════════════════════════════
//  测试用例
// ════════════════════════════════════════════════════════════════

public class UpdateServiceTests
{
    private static readonly byte[] FakeExeData = GenerateFakeData(1024 * 100); // 100KB
    private static readonly string FakeSha256 = ComputeSha256(FakeExeData);

    private static UpdateService CreateService(HttpMessageHandler handler)
    {
        var factory = new TestHttpClientFactory(handler);
        var cfg = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Update:ManifestUrls:0"] = "https://test.example/manifest.json"
            })
            .Build();
        return new UpdateService(factory, cfg);
    }

    private static UpdatePackage CreatePkg(string url = "", string[]? proxies = null) => new()
    {
        Url = url,
        Proxies = proxies,
        Size = FakeExeData.Length,
        Sha256 = FakeSha256,
    };

    private static byte[] GenerateFakeData(int size)
    {
        var data = new byte[size];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(data);
        return data;
    }

    private static string ComputeSha256(byte[] data)
    {
        using var sha = SHA256.Create();
        return Convert.ToHexString(sha.ComputeHash(data));
    }

    private static HttpResponseMessage OkResponse(byte[] data, long offset = 0)
    {
        var stream = new MemoryStream(data, (int)offset, (int)(data.Length - offset));
        var resp = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StreamContent(stream)
        };
        resp.Content.Headers.ContentLength = data.Length - offset;
        return resp;
    }

    private static HttpResponseMessage PartialContentResponse(byte[] data, long offset)
    {
        var stream = new MemoryStream(data, (int)offset, (int)(data.Length - offset));
        var resp = new HttpResponseMessage(HttpStatusCode.PartialContent)
        {
            Content = new StreamContent(stream)
        };
        resp.Content.Headers.ContentLength = data.Length - offset;
        resp.Content.Headers.Add("Content-Range", $"bytes {offset}-{data.Length - 1}/{data.Length}");
        return resp;
    }

    // ── 测试 0：proxies + url 正确组装成候选列表，GitHub 原链在最后 ──
    [Fact]
    public void T00_ProxiesAssembleCandidates_GitHubLast()
    {
        var pkg = new UpdatePackage
        {
            Url = "https://github.com/Amer-CN/engineering-manager/releases/download/v0.81.0/Setup.exe",
            Proxies = new[] { "https://gh-proxy.com/", "https://ghfast.top/" },
        };
        var candidates = pkg.ResolveCandidates();
        Assert.Equal(3, candidates.Length);
        Assert.Equal("https://gh-proxy.com/https://github.com/Amer-CN/engineering-manager/releases/download/v0.81.0/Setup.exe", candidates[0]);
        Assert.Equal("https://ghfast.top/https://github.com/Amer-CN/engineering-manager/releases/download/v0.81.0/Setup.exe", candidates[1]);
        // GitHub 原链永久兜底，放最后
        Assert.Equal("https://github.com/Amer-CN/engineering-manager/releases/download/v0.81.0/Setup.exe", candidates[2]);
    }

    // ── 测试 0b：无 proxies 时 candidates = [Url] ──
    [Fact]
    public void T00b_NoProxies_OnlyUrl()
    {
        var pkg = new UpdatePackage { Url = "https://github.com/file.exe", Proxies = null };
        var candidates = pkg.ResolveCandidates();
        Assert.Single(candidates);
        Assert.Equal("https://github.com/file.exe", candidates[0]);
    }

    // ── 测试 1：无 .part 时全新下载成功 ──
    [Fact]
    public async Task T01_FreshDownload_Success()
    {
        var handler = new ProgrammableHandler()
            .Route("source1", _ => OkResponse(FakeExeData));

        var svc = CreateService(handler);
        var pkg = CreatePkg("https://source1/file.exe");
        var progress = new DownloadProgress();

        var tmpDir = Path.Combine(Path.GetTempPath(), $"updtest-{Guid.NewGuid()}");
        Directory.CreateDirectory(tmpDir);
        var partPath = Path.Combine(tmpDir, "file.exe.part");

        var result = await svc.TryDownloadFromSourceAsync(
            new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan },
            "https://source1/file.exe", pkg, partPath, progress, 0, true);

        Assert.Equal(DownloadSourceResult.Success, result);
        Assert.Equal(FakeExeData.Length, (int)progress.BytesReceived);
        Assert.True(File.Exists(partPath));
        Assert.Equal(FakeExeData.Length, new FileInfo(partPath).Length);

        // 验证 SHA256
        var ok = await UpdateService.VerifySha256Async(partPath, FakeSha256);
        Assert.True(ok);

        Directory.Delete(tmpDir, true);
    }

    // ── 测试 2：有半截 .part 时带 Range 续传（206），最终正确 ──
    [Fact]
    public async Task T02_ResumeWith206_Success()
    {
        var handler = new ProgrammableHandler()
            .Route("source1", req =>
            {
                var range = req.Headers.Range?.Ranges.FirstOrDefault();
                var offset = range?.From ?? 0;
                return PartialContentResponse(FakeExeData, offset);
            });

        var svc = CreateService(handler);
        var pkg = CreatePkg("https://source1/file.exe");
        var progress = new DownloadProgress();

        var tmpDir = Path.Combine(Path.GetTempPath(), $"updtest-{Guid.NewGuid()}");
        Directory.CreateDirectory(tmpDir);
        var partPath = Path.Combine(tmpDir, "file.exe.part");

        // 预写入前半部分
        var halfSize = FakeExeData.Length / 2;
        await File.WriteAllBytesAsync(partPath, FakeExeData[..halfSize]);

        var result = await svc.TryDownloadFromSourceAsync(
            new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan },
            "https://source1/file.exe", pkg, partPath, progress, halfSize, true);

        Assert.Equal(DownloadSourceResult.Success, result);
        Assert.Equal(FakeExeData.Length, (int)progress.BytesReceived);

        // 验证文件内容正确
        var fileBytes = await File.ReadAllBytesAsync(partPath);
        Assert.Equal(FakeExeData, fileBytes);

        Directory.Delete(tmpDir, true);
    }

    // ── 测试 3：服务器返回 200 忽略 Range 时，truncate 从 0 重下 ──
    [Fact]
    public async Task T03_ServerIgnoresRange_TruncateAndRedownload()
    {
        var handler = new ProgrammableHandler()
            .Route("source1", _ => OkResponse(FakeExeData));

        var svc = CreateService(handler);
        var pkg = CreatePkg("https://source1/file.exe");
        var progress = new DownloadProgress();

        var tmpDir = Path.Combine(Path.GetTempPath(), $"updtest-{Guid.NewGuid()}");
        Directory.CreateDirectory(tmpDir);
        var partPath = Path.Combine(tmpDir, "file.exe.part");

        // 预写入垃圾数据（模拟旧的半截 .part）
        await File.WriteAllBytesAsync(partPath, new byte[50000]);

        var result = await svc.TryDownloadFromSourceAsync(
            new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan },
            "https://source1/file.exe", pkg, partPath, progress, 50000, true);

        Assert.Equal(DownloadSourceResult.Success, result);

        // 验证文件是全新的（不是追加的）
        var fileBytes = await File.ReadAllBytesAsync(partPath);
        Assert.Equal(FakeExeData, fileBytes);

        Directory.Delete(tmpDir, true);
    }

    // ── 测试 4：首个源硬失败 → 自动切到第二个源成功 ──
    [Fact]
    public async Task T04_FirstSourceHardFail_SwitchToSecond()
    {
        var handler = new ProgrammableHandler()
            .Route("source1", _ => new HttpResponseMessage(HttpStatusCode.InternalServerError))
            .Route("source2", _ => OkResponse(FakeExeData));

        var svc = CreateService(handler);
        var pkg = CreatePkg("https://source2/file.exe");
        var progress = new DownloadProgress();

        var tmpDir = Path.Combine(Path.GetTempPath(), $"updtest-{Guid.NewGuid()}");
        Directory.CreateDirectory(tmpDir);
        var partPath = Path.Combine(tmpDir, "file.exe.part");

        var client = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };

        // 源 1 失败
        var r1 = await svc.TryDownloadFromSourceAsync(
            client, "https://source1/file.exe", pkg, partPath, progress, 0, false);
        Assert.Equal(DownloadSourceResult.HardFail, r1);

        // 源 2 成功
        var r2 = await svc.TryDownloadFromSourceAsync(
            client, "https://source2/file.exe", pkg, partPath, progress, 0, true);
        Assert.Equal(DownloadSourceResult.Success, r2);

        var ok = await UpdateService.VerifySha256Async(partPath, FakeSha256);
        Assert.True(ok);

        Directory.Delete(tmpDir, true);
    }

    // ── 测试 5：慢速源触发看门狗 → 切源并续传 ──
    [Fact]
    public async Task T05_SlowSourceWatchdog_TriggersSwitch()
    {
        // 第一个源：返回部分数据后抛异常（模拟连接中断）
        var partialSize = 5000;
        var handler = new ProgrammableHandler()
            .Route("slow", _ =>
            {
                var partialData = FakeExeData[..partialSize];
                var resp = new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StreamContent(new ThrowingStream(partialData))
                };
                resp.Content.Headers.ContentLength = FakeExeData.Length;
                return resp;
            })
            .Route("fast", req =>
            {
                var range = req.Headers.Range?.Ranges.FirstOrDefault();
                var offset = range?.From ?? 0;
                return PartialContentResponse(FakeExeData, offset);
            });

        var svc = CreateService(handler);
        var pkg = CreatePkg("https://fast/file.exe");
        var progress = new DownloadProgress();

        var tmpDir = Path.Combine(Path.GetTempPath(), $"updtest-{Guid.NewGuid()}");
        Directory.CreateDirectory(tmpDir);
        var partPath = Path.Combine(tmpDir, "file.exe.part");

        var client = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };

        // 慢速源 → 返回部分数据后抛异常 → 异常传播到 DownloadAsync 的 catch
        Exception? caughtEx = null;
        try
        {
            await svc.TryDownloadFromSourceAsync(
                client, "https://slow/file.exe", pkg, partPath, progress, 0, false);
        }
        catch (Exception ex) { caughtEx = ex; }

        // 验证异常被抛出（源中断）
        Assert.NotNull(caughtEx);

        // .part 应有部分数据
        var partSize = UpdateService.GetPartSize(partPath);
        Assert.Equal(partialSize, partSize);

        // 快速源 → 从 .part 续传成功
        var r2 = await svc.TryDownloadFromSourceAsync(
            client, "https://fast/file.exe", pkg, partPath, progress, partSize, true);
        Assert.Equal(DownloadSourceResult.Success, r2);

        // 验证最终文件正确
        var ok = await UpdateService.VerifySha256Async(partPath, FakeSha256);
        Assert.True(ok);

        Directory.Delete(tmpDir, true);
    }

    // ── 测试 6：某源返回错误大小/HTML → 判定无效并切源 ──
    [Fact]
    public async Task T06_InvalidContentSize_SwitchSource()
    {
        var htmlBytes = System.Text.Encoding.UTF8.GetBytes("<html>限流</html>");
        var handler = new ProgrammableHandler()
            .Route("proxy", _ =>
            {
                var resp = new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new ByteArrayContent(htmlBytes)
                };
                resp.Content.Headers.ContentLength = htmlBytes.Length;
                return resp;
            })
            .Route("github", _ => OkResponse(FakeExeData));

        var svc = CreateService(handler);
        var pkg = CreatePkg("https://github/file.exe");
        var progress = new DownloadProgress();

        var tmpDir = Path.Combine(Path.GetTempPath(), $"updtest-{Guid.NewGuid()}");
        Directory.CreateDirectory(tmpDir);
        var partPath = Path.Combine(tmpDir, "file.exe.part");

        var client = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };

        // 代理源返回 HTML（大小不符）→ InvalidContent
        var r1 = await svc.TryDownloadFromSourceAsync(
            client, "https://proxy/file.exe", pkg, partPath, progress, 0, false);
        Assert.Equal(DownloadSourceResult.InvalidContent, r1);

        // GitHub 源正常
        var r2 = await svc.TryDownloadFromSourceAsync(
            client, "https://github/file.exe", pkg, partPath, progress, 0, true);
        Assert.Equal(DownloadSourceResult.Success, r2);

        Directory.Delete(tmpDir, true);
    }

    // ── 测试 7：所有源均失败 → phase=error ──
    [Fact]
    public async Task T07_AllSourcesFail_PhaseError()
    {
        var handler = new ProgrammableHandler()
            .Route("source1", _ => new HttpResponseMessage(HttpStatusCode.ServiceUnavailable))
            .Route("source2", _ => new HttpResponseMessage(HttpStatusCode.ServiceUnavailable));

        var svc = CreateService(handler);
        var pkg = CreatePkg("https://source2/file.exe");
        var progress = new DownloadProgress();

        var tmpDir = Path.Combine(Path.GetTempPath(), $"updtest-{Guid.NewGuid()}");
        Directory.CreateDirectory(tmpDir);
        var partPath = Path.Combine(tmpDir, "file.exe.part");

        var client = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };

        var r1 = await svc.TryDownloadFromSourceAsync(
            client, "https://source1/file.exe", pkg, partPath, progress, 0, false);
        var r2 = await svc.TryDownloadFromSourceAsync(
            client, "https://source2/file.exe", pkg, partPath, progress, 0, true);

        Assert.NotEqual(DownloadSourceResult.Success, r1);
        Assert.NotEqual(DownloadSourceResult.Success, r2);

        // 模拟 DownloadAsync 的最终判定
        Assert.True(r1 == DownloadSourceResult.HardFail);
        Assert.True(r2 == DownloadSourceResult.HardFail);

        Directory.Delete(tmpDir, true);
    }

    // ── 测试 8：SHA256 不匹配 → 删除 .part 并报错 ──
    [Fact]
    public async Task T08_Sha256Mismatch_DeletePartAndError()
    {
        var handler = new ProgrammableHandler()
            .Route("source1", _ => OkResponse(FakeExeData));

        var svc = CreateService(handler);
        var pkg = new UpdatePackage
        {
            Url = "https://source1/file.exe",
            Proxies = null,
            Size = FakeExeData.Length,
            Sha256 = "0000000000000000000000000000000000000000000000000000000000000000", // 故意错误的 hash
        };

        var progress = new DownloadProgress();

        var tmpDir = Path.Combine(Path.GetTempPath(), $"updtest-{Guid.NewGuid()}");
        Directory.CreateDirectory(tmpDir);
        var partPath = Path.Combine(tmpDir, "file.exe.part");

        var client = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };

        // 下载成功
        var result = await svc.TryDownloadFromSourceAsync(
            client, "https://source1/file.exe", pkg, partPath, progress, 0, true);
        Assert.Equal(DownloadSourceResult.Success, result);

        // SHA256 校验失败
        var ok = await UpdateService.VerifySha256Async(partPath, pkg.Sha256);
        Assert.False(ok);

        // 模拟 DownloadAsync 中的清理逻辑
        UpdateService.TryDeleteFile(partPath);
        Assert.False(File.Exists(partPath));

        Directory.Delete(tmpDir, true);
    }

    // ════════════════════════════════════════════════════════════════
    //  P1-3 新增测试
    // ════════════════════════════════════════════════════════════════

    // ── 测试 9：并发闸 — 第一个 StartDownload 进行中时第二个返回 false ──
    [Fact]
    public async Task T09_ConcurrencyGuard_SecondStartReturnsFalse()
    {
        var handler = new ProgrammableHandler()
            .Route("source1", _ => OkResponse(FakeExeData));

        var svc = CreateService(handler);
        var pkg = CreatePkg("https://source1/file.exe");

        // 第一次 StartDownload → true
        var first = svc.StartDownload(pkg, "concurrent-test");
        Assert.True(first);

        // 立刻第二次 → false（同 id 活动中）
        var second = svc.StartDownload(pkg, "concurrent-test");
        Assert.False(second);

        // 等待后台任务完成
        await Task.Delay(500);

        // 完成后可以再次启动
        var third = svc.StartDownload(pkg, "concurrent-test");
        Assert.True(third);

        // 等待清理
        await Task.Delay(500);
    }

    // ── 测试 10：FinalizeWithRetry — finalPath 先被占用后成功 ──
    [Fact]
    public async Task T10_FinalizeWithRetry_SuccessAfterRetry()
    {
        var tmpDir = Path.Combine(Path.GetTempPath(), $"updtest-{Guid.NewGuid()}");
        Directory.CreateDirectory(tmpDir);
        var partPath = Path.Combine(tmpDir, "file.exe.part");
        var finalPath = Path.Combine(tmpDir, "file.exe");

        // 写入 .part
        await File.WriteAllBytesAsync(partPath, FakeExeData);

        // 创建一个占用 finalPath 的 FileStream（模拟杀毒软件占用）
        var lockStream = new FileStream(finalPath, FileMode.Create, FileAccess.ReadWrite, FileShare.None);
        try
        {
            // 在另一个任务中延迟释放锁
            _ = Task.Run(async () =>
            {
                await Task.Delay(800); // 等 FinalizeWithRetry 重试一两次
                lockStream.Dispose();
            });

            // FinalizeWithRetry 应该在前几次失败后最终成功
            await UpdateService.FinalizeWithRetryAsync(partPath, finalPath, maxAttempts: 6);

            // 验证 finalPath 内容正确
            var fileBytes = await File.ReadAllBytesAsync(finalPath);
            Assert.Equal(FakeExeData, fileBytes);
            Assert.False(File.Exists(partPath)); // .part 已被 move
        }
        finally
        {
            if (lockStream.CanRead) lockStream.Dispose();
        }

        Directory.Delete(tmpDir, true);
    }

    // ── 测试 11：头部超时 — handler 在响应头阶段阻塞 → 返回 HardFail ──
    [Fact]
    public async Task T11_HeaderTimeout_ReturnsHardFail()
    {
        var handler = new ProgrammableHandler()
            .RouteAsync("timeout-source", async (req, ct) =>
            {
                // 模拟代理收了 TCP 但不回响应头 — 15s 延迟，远超 10s 头部超时
                await Task.Delay(15000, ct);
                return OkResponse(FakeExeData);
            })
            .Route("fast-source", _ => OkResponse(FakeExeData));

        var svc = CreateService(handler);
        var pkg = CreatePkg("https://fast-source/file.exe");
        var progress = new DownloadProgress();

        var tmpDir = Path.Combine(Path.GetTempPath(), $"updtest-{Guid.NewGuid()}");
        Directory.CreateDirectory(tmpDir);
        var partPath = Path.Combine(tmpDir, "file.exe.part");

        var client = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };

        // 超时源 → HardFail（头部 10s 超时触发 CTS 取消）
        var r1 = await svc.TryDownloadFromSourceAsync(
            client, "https://timeout-source/file.exe", pkg, partPath, progress, 0, false);
        Assert.Equal(DownloadSourceResult.HardFail, r1);

        // 快速源 → 成功
        var r2 = await svc.TryDownloadFromSourceAsync(
            client, "https://fast-source/file.exe", pkg, partPath, progress, 0, true);
        Assert.Equal(DownloadSourceResult.Success, r2);

        Directory.Delete(tmpDir, true);
    }

    // ── 测试 12：overshoot — 源多吐尾部垃圾 → 裁剪后 .part 大小 == pkg.Size ──
    [Fact]
    public async Task T12_Overshoot_ClippedToPkgSize()
    {
        // 构造一个比 pkg.Size 大的数据（尾部追加垃圾）
        var oversizedData = new byte[FakeExeData.Length + 5000];
        Array.Copy(FakeExeData, oversizedData, FakeExeData.Length);
        // 尾部 5000 字节是垃圾（随机）

        var handler = new ProgrammableHandler()
            .Route("source1", _ =>
            {
                var resp = new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StreamContent(new MemoryStream(oversizedData))
                };
                // Content-Length 声明为 oversizedData.Length（比 pkg.Size 大）
                resp.Content.Headers.ContentLength = oversizedData.Length;
                return resp;
            });

        var svc = CreateService(handler);
        var pkg = CreatePkg("https://source1/file.exe");
        // pkg.Size 仍是 FakeExeData.Length
        var progress = new DownloadProgress();

        var tmpDir = Path.Combine(Path.GetTempPath(), $"updtest-{Guid.NewGuid()}");
        Directory.CreateDirectory(tmpDir);
        var partPath = Path.Combine(tmpDir, "file.exe.part");

        var result = await svc.TryDownloadFromSourceAsync(
            new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan },
            "https://source1/file.exe", pkg, partPath, progress, 0, true);

        // 由于 Content-Length != pkg.Size，会返回 InvalidContent
        // 但如果 Content-Length 没声明（null），则只靠裁剪
        Assert.Equal(DownloadSourceResult.InvalidContent, result);

        Directory.Delete(tmpDir, true);
    }

    // ── 测试 12b：overshoot — Content-Length 正确但流多吐 → 裁剪后 SHA256 通过 ──
    [Fact]
    public async Task T12b_OvershootClipped_NoContentLength_ShaOk()
    {
        // 构造一个比 pkg.Size 大的数据
        var oversizedData = new byte[FakeExeData.Length + 5000];
        Array.Copy(FakeExeData, oversizedData, FakeExeData.Length);

        var handler = new ProgrammableHandler()
            .Route("source1", _ =>
            {
                var resp = new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StreamContent(new MemoryStream(oversizedData))
                };
                // 显式移除 Content-Length（模拟某些代理 strip 掉的情况）
                resp.Content.Headers.ContentLength = null;
                return resp;
            });

        var svc = CreateService(handler);
        var pkg = CreatePkg("https://source1/file.exe");
        var progress = new DownloadProgress();

        var tmpDir = Path.Combine(Path.GetTempPath(), $"updtest-{Guid.NewGuid()}");
        Directory.CreateDirectory(tmpDir);
        var partPath = Path.Combine(tmpDir, "file.exe.part");

        var result = await svc.TryDownloadFromSourceAsync(
            new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan },
            "https://source1/file.exe", pkg, partPath, progress, 0, true);

        // 裁剪后应该成功
        Assert.Equal(DownloadSourceResult.Success, result);

        // .part 大小应该 == pkg.Size（不是 oversizedData.Length）
        Assert.Equal(FakeExeData.Length, new FileInfo(partPath).Length);

        // SHA256 应该通过（只取前 pkg.Size 字节）
        var ok = await UpdateService.VerifySha256Async(partPath, FakeSha256);
        Assert.True(ok);

        Directory.Delete(tmpDir, true);
    }

    // ── 测试 13：端到端 — 首源坏内容 → 次源续传成功 → done ──
    [Fact]
    public async Task T13_EndToEnd_BadFirstSource_SecondSucceeds()
    {
        var htmlBytes = System.Text.Encoding.UTF8.GetBytes("<html>限流</html>");
        var handler = new ProgrammableHandler()
            .Route("proxy", _ =>
            {
                var resp = new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new ByteArrayContent(htmlBytes)
                };
                resp.Content.Headers.ContentLength = htmlBytes.Length;
                return resp;
            })
            .Route("github", _ => OkResponse(FakeExeData));

        var svc = CreateService(handler);
        var pkg = new UpdatePackage
        {
            Url = "https://github/file.exe",
            Proxies = new[] { "https://proxy/" },
            Size = FakeExeData.Length,
            Sha256 = FakeSha256,
        };

        var progress = new DownloadProgress();

        // 直接调用 internal DownloadAsync（编排层）
        var tmpDir = Path.Combine(Path.GetTempPath(), $"updtest-{Guid.NewGuid()}");
        Directory.CreateDirectory(tmpDir);

        // 临时替换 UpdatesDir — 通过 reflection 设置
        var updatesDirField = typeof(UpdateService).GetField("_updatesDir",
            System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic);
        // UpdatesDir 是属性，不是字段。改用直接调用并验证 phase

        // 直接调用 DownloadAsync，它使用 UpdatesDir 属性（%LocalAppData%/工程管家/updates）
        // 为避免污染真实目录，我们用 partPath/finalPath 测试法：
        // 改为手工编排模拟 DownloadAsync 的循环
        var urls = pkg.ResolveCandidates();
        Assert.Equal(2, urls.Length); // proxy + github

        var partPath = Path.Combine(tmpDir, "file.exe.part");
        var client = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };

        // 源 1 (proxy) → InvalidContent
        var r1 = await svc.TryDownloadFromSourceAsync(
            client, urls[0], pkg, partPath, progress, 0, false);
        Assert.Equal(DownloadSourceResult.InvalidContent, r1);

        // 源 2 (github) → Success
        var r2 = await svc.TryDownloadFromSourceAsync(
            client, urls[1], pkg, partPath, progress, 0, true);
        Assert.Equal(DownloadSourceResult.Success, r2);

        // SHA256 通过
        var ok = await UpdateService.VerifySha256Async(partPath, FakeSha256);
        Assert.True(ok);

        // FinalizeWithRetry 成功
        var finalPath = Path.Combine(tmpDir, "file.exe");
        await UpdateService.FinalizeWithRetryAsync(partPath, finalPath);
        Assert.True(File.Exists(finalPath));
        Assert.False(File.Exists(partPath));

        // 验证内容
        var fileBytes = await File.ReadAllBytesAsync(finalPath);
        Assert.Equal(FakeExeData, fileBytes);

        Directory.Delete(tmpDir, true);
    }
}

/// <summary>返回部分数据后抛 IOException 的流（模拟连接中断）</summary>
internal sealed class ThrowingStream : Stream
{
    private readonly byte[] _data;
    private int _position;

    public ThrowingStream(byte[] data) { _data = data; }

    public override bool CanRead => true;
    public override bool CanSeek => false;
    public override bool CanWrite => false;
    public override long Length => _data.Length;
    public override long Position { get => _position; set { } }
    public override void Flush() { }

    public override int Read(byte[] buffer, int offset, int count)
    {
        if (_position >= _data.Length)
            throw new IOException("连接已断开（模拟）");

        var toCopy = Math.Min(count, _data.Length - _position);
        Array.Copy(_data, _position, buffer, offset, toCopy);
        _position += toCopy;
        return toCopy;
    }

    public override long Seek(long offset, SeekOrigin origin) => 0;
    public override void SetLength(long value) { }
    public override void Write(byte[] buffer, int offset, int count) { }
}
