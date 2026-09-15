using System.IO.Compression;
using System.Net;
using EngineeringManager.Api.Services.Stt;
using Xunit;

namespace EngineeringManager.Tests.Services;

/// <summary>
/// 模型下载中心测试：清单结构 / 就绪状态 / 缺失汇总 / 断点续下 / 原子改名 /
/// 包内解压 / 同引擎重复触发闸 / 手动放置项。
/// 全部走临时目录 + 注入 delegate，不碰生产 asr-engine/，不真下大文件。
/// 与 M2FourthRoundTests 共用 SttModelManager 的静态注入点（EngineDirProvider /
/// DownloadDelegate），必须同集合串行，否则互相覆盖导致 flaky。
/// </summary>
[Collection("M2FifthRound")]
public class SttModelDownloadCenterTests : IDisposable
{
    private readonly string _tempDir;

    public SttModelDownloadCenterTests()
    {
        _tempDir = Path.Combine(Path.GetTempPath(), $"stt-models-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempDir);
        SttModelManager.SetEngineDirProvider(() => _tempDir);
    }

    public void Dispose()
    {
        SttModelManager.SetEngineDirProvider(null);
        SttModelManager.SetDownloadDelegate(null);
        try { Directory.Delete(_tempDir, true); } catch { }
    }

    // ═══════════════════════════════════════════════════════════
    // 一、清单结构
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void Manifest_CoversThreeEngines_WithExpectedIds()
    {
        var ids = SttModelManager.ModelManifest.Select(m => m.EngineId).ToList();
        Assert.Contains(SttModelManager.QwenEngineId, ids);
        Assert.Contains(MossTranscribeEngine.EngineId, ids);
        Assert.Contains(ParaformerEngine.EngineId, ids);
        Assert.Equal(3, SttModelManager.ModelManifest.Count);
    }

    [Fact]
    public void Manifest_EveryFileHasPositiveBytesAndRelativePath()
    {
        foreach (var spec in SttModelManager.ModelManifest)
        {
            Assert.False(string.IsNullOrWhiteSpace(spec.DisplayName));
            Assert.NotEmpty(spec.Files);
            foreach (var f in spec.Files)
            {
                Assert.False(string.IsNullOrWhiteSpace(f.RelPath));
                // relPath 必须相对 asr-engine/：不得是绝对路径，不得带盘符/前导斜杠
                Assert.False(Path.IsPathRooted(f.RelPath), $"{f.RelPath} 不应是绝对路径");
                Assert.DoesNotContain("..", f.RelPath);
                Assert.True(f.Bytes > 0, $"{f.RelPath} 缺少字节数");
            }
        }
    }

    [Fact]
    public void Manifest_AddressesAreHttpsOrManual()
    {
        // 地址纪律：要么空（手动放置），要么 https 直链；不允许 http/相对地址
        foreach (var spec in SttModelManager.ModelManifest)
        {
            foreach (var f in spec.Files)
            {
                foreach (var url in f.Urls)
                    Assert.StartsWith("https://", url);
                if (f.ZipEntry != null)
                {
                    Assert.NotNull(spec.ArchiveUrl);
                    Assert.StartsWith("https://", spec.ArchiveUrl!);
                    Assert.True(spec.ArchiveBytes > 0);
                }
            }
        }
    }

    [Fact]
    public void Manifest_QwenFilesComeFromVerifiedArchive()
    {
        // Qwen 三件套的包内清单经 zip 中央目录 Range 解析确认（名称 + 解压后大小）
        var qwen = SttModelManager.FindEngineSpec(SttModelManager.QwenEngineId)!;
        Assert.Equal(3, qwen.Files.Count);
        Assert.Equal(1410584479L, qwen.ArchiveBytes);
        Assert.All(qwen.Files, f => Assert.NotNull(f.ZipEntry));
        Assert.Contains(qwen.Files, f => f.ZipEntry == "qwen3_asr_llm.q4_k.gguf");
        Assert.Contains(qwen.Files, f => f.ZipEntry == "qwen3_asr_encoder_backend.int4.onnx");
        Assert.Contains(qwen.Files, f => f.ZipEntry == "qwen3_asr_encoder_frontend.int4.onnx");
    }

    [Fact]
    public void Manifest_ParaformerHasTwoDownloadableFiles()
    {
        var para = SttModelManager.FindEngineSpec(ParaformerEngine.EngineId)!;
        Assert.Equal(2, para.Files.Count);
        Assert.All(para.Files, f => Assert.True(f.Downloadable));
        Assert.Contains(para.Files, f => f.RelPath == "paraformer/model.int8.onnx" && f.Bytes == 238429929L);
        Assert.Contains(para.Files, f => f.RelPath == "paraformer/tokens.txt" && f.Bytes == 75756L);
    }

    [Fact]
    public void Manifest_MossGgufPrefersModelScopeThenHf()
    {
        var moss = SttModelManager.FindEngineSpec(MossTranscribeEngine.EngineId)!;
        var gguf = Assert.Single(moss.Files);
        Assert.Equal("moss/moss-transcribe-q8_0.gguf", gguf.RelPath);
        Assert.Equal(986881024L, gguf.Bytes);
        Assert.Equal(2, gguf.Urls.Count);
        Assert.Contains("modelscope.cn", gguf.Urls[0]); // 国内优先
        Assert.Contains("huggingface.co", gguf.Urls[1]); // fallback
    }

    [Fact]
    public void FindEngineSpec_UnknownEngine_ReturnsNull()
    {
        Assert.Null(SttModelManager.FindEngineSpec("no-such-engine"));
    }

    [Fact]
    public void FindEngineSpec_IsCaseInsensitive()
    {
        Assert.NotNull(SttModelManager.FindEngineSpec(SttModelManager.QwenEngineId.ToUpperInvariant()));
    }

    // ═══════════════════════════════════════════════════════════
    // 二、就绪状态 / 缺失汇总
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void GetModelStatus_EmptyDir_AllMissingWithByteTotals()
    {
        var status = SttModelManager.GetModelStatus();

        Assert.Equal(3, status.Count);
        Assert.All(status, s => Assert.False(s.Ready));

        var para = status.First(s => s.EngineId == ParaformerEngine.EngineId);
        Assert.Equal(2, para.MissingFiles.Count);
        Assert.Equal(238429929L + 75756L, para.MissingBytes);

        var qwen = status.First(s => s.EngineId == SttModelManager.QwenEngineId);
        Assert.Equal(3, qwen.MissingFiles.Count);
        Assert.Equal(1282434624L + 164740452L + 20876699L, qwen.MissingBytes);
    }

    [Fact]
    public void GetModelStatus_AllFilesPresent_ReportsReady()
    {
        foreach (var spec in SttModelManager.ModelManifest)
            foreach (var f in spec.Files)
                WriteFile(f.RelPath, f.Bytes);

        var status = SttModelManager.GetModelStatus();
        Assert.All(status, s =>
        {
            Assert.True(s.Ready, $"{s.EngineId} 应就绪");
            Assert.Empty(s.MissingFiles);
            Assert.Equal(0, s.MissingBytes);
        });
    }

    [Fact]
    public void GetModelStatus_PartiallyPresent_ReportsOnlyMissing()
    {
        WriteFile("paraformer/tokens.txt", 75756L); // 只放 tokens

        var para = SttModelManager.GetModelStatus().First(s => s.EngineId == ParaformerEngine.EngineId);
        Assert.False(para.Ready);
        var only = Assert.Single(para.MissingFiles);
        Assert.Equal("paraformer/model.int8.onnx", only.RelPath);
        Assert.Equal(238429929L, para.MissingBytes);
    }

    [Fact]
    public void GetModelStatus_MissingBytesEqualsSumOfMissingFiles()
    {
        WriteFile("moss/moss-transcribe-q8_0.gguf", 1000L); // 存在但大小不对：只判存在，不算缺失
        foreach (var s in SttModelManager.GetModelStatus())
            Assert.Equal(s.MissingFiles.Sum(f => f.Bytes), s.MissingBytes);
    }

    // ═══════════════════════════════════════════════════════════
    // 三、下载编排（注入 delegate，不真下）
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task Download_Paraformer_MissingFiles_DownloadedAndReady()
    {
        var downloaded = new List<string>();
        SttModelManager.SetDownloadDelegate((url, destPath, ct) =>
        {
            downloaded.Add(url);
            // 按 URL 末段写入清单声明的字节数（模拟真实下载）
            var name = url.EndsWith("tokens.txt") ? "tokens.txt" : "model.int8.onnx";
            var bytes = name == "tokens.txt" ? 75756L : 238429929L;
            Directory.CreateDirectory(Path.GetDirectoryName(destPath)!);
            using var fs = File.Create(destPath);
            fs.SetLength(bytes);
            return Task.CompletedTask;
        });

        Assert.True(SttModelManager.StartModelDownload(ParaformerEngine.EngineId));
        await WaitForPhaseAsync(ParaformerEngine.EngineId, "done");

        var progress = SttModelManager.GetModelDownloadProgress(ParaformerEngine.EngineId)!;
        Assert.Null(progress.Error);
        Assert.Equal(2, downloaded.Count);
        Assert.Equal(238429929L + 75756L, progress.TotalBytes);

        // 落盘：最终路径存在且字节数对，.tmp 已清理
        Assert.Equal(238429929L, new FileInfo(Path.Combine(_tempDir, "paraformer", "model.int8.onnx")).Length);
        Assert.Equal(75756L, new FileInfo(Path.Combine(_tempDir, "paraformer", "tokens.txt")).Length);
        Assert.False(File.Exists(Path.Combine(_tempDir, "paraformer", "tokens.txt.tmp")));

        Assert.True(SttModelManager.GetModelStatus().First(s => s.EngineId == ParaformerEngine.EngineId).Ready);
    }

    [Fact]
    public async Task Download_AlreadyReady_IsNoOp()
    {
        foreach (var f in SttModelManager.FindEngineSpec(ParaformerEngine.EngineId)!.Files)
            WriteFile(f.RelPath, f.Bytes);

        var calls = 0;
        SttModelManager.SetDownloadDelegate((_, _, _) => { Interlocked.Increment(ref calls); return Task.CompletedTask; });

        Assert.True(SttModelManager.StartModelDownload(ParaformerEngine.EngineId));
        await WaitForPhaseAsync(ParaformerEngine.EngineId, "done");

        Assert.Equal(0, calls);
        Assert.Equal(0, SttModelManager.GetModelDownloadProgress(ParaformerEngine.EngineId)!.TotalBytes);
    }

    [Fact]
    public async Task Download_SizeMismatch_ReportsErrorAndDoesNotLandFile()
    {
        // delegate 只写一半 → 校验失败 → 不得落到最终路径
        SttModelManager.SetDownloadDelegate((_, destPath, _) =>
        {
            Directory.CreateDirectory(Path.GetDirectoryName(destPath)!);
            using var fs = File.Create(destPath);
            fs.SetLength(100);
            return Task.CompletedTask;
        });

        Assert.True(SttModelManager.StartModelDownload(ParaformerEngine.EngineId));
        await WaitForPhaseAsync(ParaformerEngine.EngineId, "error");

        Assert.NotNull(SttModelManager.GetModelDownloadProgress(ParaformerEngine.EngineId)!.Error);
        Assert.False(File.Exists(Path.Combine(_tempDir, "paraformer", "model.int8.onnx")));
    }

    [Fact]
    public async Task Download_FailsForMissingFile_LeavesExistingFileIntact()
    {
        // tokens.txt 已就位（内容标记），model.int8.onnx 缺失且下载失败：
        // 已就位的文件不得被这次失败下载动到
        var tokensPath = Path.Combine(_tempDir, "paraformer", "tokens.txt");
        Directory.CreateDirectory(Path.GetDirectoryName(tokensPath)!);
        File.WriteAllText(tokensPath, "KEEP-ME");

        SttModelManager.SetDownloadDelegate((_, _, _) => throw new InvalidOperationException("网络不可达"));

        Assert.True(SttModelManager.StartModelDownload(ParaformerEngine.EngineId));
        await WaitForPhaseAsync(ParaformerEngine.EngineId, "error");

        Assert.Contains("网络不可达", SttModelManager.GetModelDownloadProgress(ParaformerEngine.EngineId)!.Error);
        Assert.Equal("KEEP-ME", File.ReadAllText(tokensPath));
        Assert.False(File.Exists(Path.Combine(_tempDir, "paraformer", "model.int8.onnx")));
    }

    [Fact]
    public async Task Download_ConcurrentSameEngine_SecondIsRejected()
    {
        var gate = new TaskCompletionSource();
        SttModelManager.SetDownloadDelegate(async (_, destPath, _) =>
        {
            await gate.Task;
            Directory.CreateDirectory(Path.GetDirectoryName(destPath)!);
            using var fs = File.Create(destPath);
            fs.SetLength(75756);
        });

        Assert.True(SttModelManager.StartModelDownload(ParaformerEngine.EngineId));
        // 第二次触发被内存闸拒绝
        Assert.False(SttModelManager.StartModelDownload(ParaformerEngine.EngineId));
        Assert.True(SttModelManager.IsModelDownloadActive(ParaformerEngine.EngineId));

        gate.SetResult();
        await WaitForPhaseAsync(ParaformerEngine.EngineId, "error"); // 第二项 100 字节不符 → error
        Assert.False(SttModelManager.IsModelDownloadActive(ParaformerEngine.EngineId));
    }

    [Fact]
    public void StartModelDownload_UnknownEngine_Throws()
    {
        Assert.Throws<InvalidOperationException>(() => SttModelManager.StartModelDownload("no-such-engine"));
    }

    // ═══════════════════════════════════════════════════════════
    // 四、断点续下 / 原子改名（直接测下载内核，走真实 HTTP 服务端）
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task Resumable_ExistingPartialFile_ContinuesWithRange()
    {
        var payload = new byte[4096];
        Random.Shared.NextBytes(payload);
        using var server = new LocalHttpServer(payload, supportRange: true);

        var tmp = Path.Combine(_tempDir, "resume.bin");
        File.WriteAllBytes(tmp, payload[..1024]); // 已有前 1/4

        var lastSeen = 0L;
        await SttModelManager.DownloadToTmpResumableAsync(
            new[] { server.Url }, tmp, payload.Length, n => lastSeen = n, default);

        Assert.Equal(payload.Length, new FileInfo(tmp).Length);
        Assert.Equal(payload, File.ReadAllBytes(tmp));
        Assert.Equal(payload.Length, lastSeen);
        Assert.True(server.SawRangeRequest, "应发出 Range 续传请求");
    }

    [Fact]
    public async Task Resumable_ServerIgnoresRange_FallsBackToFullDownload()
    {
        var payload = new byte[2048];
        Random.Shared.NextBytes(payload);
        using var server = new LocalHttpServer(payload, supportRange: false);

        var tmp = Path.Combine(_tempDir, "norange.bin");
        File.WriteAllBytes(tmp, payload[..512]); // 残留半截

        await SttModelManager.DownloadToTmpResumableAsync(
            new[] { server.Url }, tmp, payload.Length, _ => { }, default);

        // 服务器不支持 Range → 整下覆盖，内容必须完全一致（不能拼出 512+2048 的脏文件）
        Assert.Equal(payload, File.ReadAllBytes(tmp));
    }

    [Fact]
    public async Task Resumable_TmpAlreadyComplete_SkipsDownload()
    {
        var payload = new byte[512];
        Random.Shared.NextBytes(payload);
        using var server = new LocalHttpServer(payload, supportRange: true);

        var tmp = Path.Combine(_tempDir, "complete.bin");
        File.WriteAllBytes(tmp, payload); // 上次已下完（改名失败残留）

        await SttModelManager.DownloadToTmpResumableAsync(
            new[] { server.Url }, tmp, payload.Length, _ => { }, default);

        Assert.Equal(0, server.RequestCount); // 无需重下
        Assert.Equal(payload, File.ReadAllBytes(tmp));
    }

    [Fact]
    public async Task Resumable_OversizedTmp_DiscardedAndRedownloaded()
    {
        var payload = new byte[512];
        Random.Shared.NextBytes(payload);
        using var server = new LocalHttpServer(payload, supportRange: true);

        var tmp = Path.Combine(_tempDir, "oversize.bin");
        File.WriteAllBytes(tmp, new byte[9999]); // 比期望大：不可信

        await SttModelManager.DownloadToTmpResumableAsync(
            new[] { server.Url }, tmp, payload.Length, _ => { }, default);

        Assert.Equal(payload, File.ReadAllBytes(tmp));
    }

    [Fact]
    public async Task Resumable_FirstSourceFails_UsesSecond()
    {
        var payload = new byte[256];
        Random.Shared.NextBytes(payload);
        using var server = new LocalHttpServer(payload, supportRange: true);

        var tmp = Path.Combine(_tempDir, "fallback.bin");
        await SttModelManager.DownloadToTmpResumableAsync(
            new[] { "http://127.0.0.1:1/unreachable", server.Url }, tmp, payload.Length, _ => { }, default);

        Assert.Equal(payload, File.ReadAllBytes(tmp));
    }

    [Fact]
    public async Task Resumable_AllSourcesFail_ThrowsWithReason()
    {
        var tmp = Path.Combine(_tempDir, "allfail.bin");
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            SttModelManager.DownloadToTmpResumableAsync(
                new[] { "http://127.0.0.1:1/a", "http://127.0.0.1:1/b" }, tmp, 100, _ => { }, default));
        Assert.Contains("所有下载源均失败", ex.Message);
    }

    [Fact]
    public async Task Resumable_WrongSize_Throws()
    {
        var payload = new byte[100];
        using var server = new LocalHttpServer(payload, supportRange: true);
        var tmp = Path.Combine(_tempDir, "wrongsize.bin");

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            SttModelManager.DownloadToTmpResumableAsync(new[] { server.Url }, tmp, 999, _ => { }, default));
        Assert.Contains("字节数不符", ex.Message);
    }

    // ═══════════════════════════════════════════════════════════
    // 五、包内解压（Qwen zip 路径）
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void ExtractZipEntries_ExtractsToFinalPathAndValidatesSize()
    {
        var payload = new byte[1234];
        Random.Shared.NextBytes(payload);
        var zipPath = Path.Combine(_tempDir, "pkg.zip");
        File.WriteAllBytes(zipPath, BuildZip(new Dictionary<string, byte[]> { ["inner.bin"] = payload }));

        var files = new List<SttModelManager.SttModelFileSpec>
        {
            new() { RelPath = "model/inner.bin", Bytes = payload.Length, ZipEntry = "inner.bin" },
        };
        var progress = new SttModelManager.SttDownloadProgress { EngineId = "x" };

        SttModelManager.ExtractZipEntries(zipPath, _tempDir, files, progress);

        var outPath = Path.Combine(_tempDir, "model", "inner.bin");
        Assert.Equal(payload, File.ReadAllBytes(outPath));
        Assert.False(File.Exists(outPath + ".tmp"), "解压临时文件应已清理");
        Assert.Equal("model/inner.bin", progress.File);
    }

    [Fact]
    public void ExtractZipEntries_SizeMismatch_ThrowsAndDoesNotLandFile()
    {
        var zipPath = Path.Combine(_tempDir, "bad.zip");
        File.WriteAllBytes(zipPath, BuildZip(new Dictionary<string, byte[]> { ["inner.bin"] = new byte[10] }));

        var files = new List<SttModelManager.SttModelFileSpec>
        {
            new() { RelPath = "model/inner.bin", Bytes = 999, ZipEntry = "inner.bin" },
        };

        Assert.Throws<InvalidOperationException>(() =>
            SttModelManager.ExtractZipEntries(zipPath, _tempDir, files, new SttModelManager.SttDownloadProgress { EngineId = "x" }));
        Assert.False(File.Exists(Path.Combine(_tempDir, "model", "inner.bin")));
    }

    [Fact]
    public void ExtractZipEntries_MissingEntry_Throws()
    {
        var zipPath = Path.Combine(_tempDir, "missing.zip");
        File.WriteAllBytes(zipPath, BuildZip(new Dictionary<string, byte[]> { ["other.bin"] = new byte[4] }));

        var files = new List<SttModelManager.SttModelFileSpec>
        {
            new() { RelPath = "model/inner.bin", Bytes = 4, ZipEntry = "inner.bin" },
        };

        var ex = Assert.Throws<InvalidOperationException>(() =>
            SttModelManager.ExtractZipEntries(zipPath, _tempDir, files, new SttModelManager.SttDownloadProgress { EngineId = "x" }));
        Assert.Contains("缺少 inner.bin", ex.Message);
    }

    [Fact]
    public void ExtractZipEntries_ExistingFile_ReplacedOnlyAfterSuccess()
    {
        // 老文件先就位：解压失败不得把它删掉
        var destPath = Path.Combine(_tempDir, "model", "inner.bin");
        Directory.CreateDirectory(Path.GetDirectoryName(destPath)!);
        File.WriteAllBytes(destPath, new byte[] { 1, 2, 3 });

        var zipPath = Path.Combine(_tempDir, "bad2.zip");
        File.WriteAllBytes(zipPath, BuildZip(new Dictionary<string, byte[]> { ["inner.bin"] = new byte[10] }));

        var files = new List<SttModelManager.SttModelFileSpec>
        {
            new() { RelPath = "model/inner.bin", Bytes = 999, ZipEntry = "inner.bin" },
        };
        Assert.Throws<InvalidOperationException>(() =>
            SttModelManager.ExtractZipEntries(zipPath, _tempDir, files, new SttModelManager.SttDownloadProgress { EngineId = "x" }));

        Assert.Equal(new byte[] { 1, 2, 3 }, File.ReadAllBytes(destPath));
    }

    [Fact]
    public void ExtractZip_IsWiredIntoDownloadPath()
    {
        // Qwen 清单必须走 ArchiveUrl（包内解压），不得出现"没有地址"的 Qwen 文件
        var qwen = SttModelManager.FindEngineSpec(SttModelManager.QwenEngineId)!;
        Assert.NotNull(qwen.ArchiveUrl);
        Assert.NotNull(qwen.ArchiveName);
        Assert.All(qwen.Files, f => Assert.True(f.Downloadable));
    }

    // ═══════════════════════════════════════════════════════════
    // 六、手动放置项（无验证地址）
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void ManualPlacement_FileWithoutUrls_IsNotDownloadable()
    {
        var spec = new SttModelManager.SttModelFileSpec { RelPath = "x/y.bin", Bytes = 10 };
        Assert.False(spec.Downloadable);
        Assert.Empty(spec.Urls);
    }

    [Fact]
    public void ZipEntry_CountsAsDownloadable()
    {
        var spec = new SttModelManager.SttModelFileSpec
        {
            RelPath = "model/a.gguf", Bytes = 10, ZipEntry = "a.gguf",
        };
        Assert.True(spec.Downloadable);
    }

    // ═══════════════════════════════════════════════════════════
    // 辅助
    // ═══════════════════════════════════════════════════════════

    private void WriteFile(string relPath, long bytes)
    {
        var full = Path.Combine(_tempDir, relPath.Replace('/', Path.DirectorySeparatorChar));
        Directory.CreateDirectory(Path.GetDirectoryName(full)!);
        using var fs = File.Create(full);
        fs.SetLength(bytes);
    }

    private static byte[] BuildZip(Dictionary<string, byte[]> entries)
    {
        using var ms = new MemoryStream();
        using (var zip = new ZipArchive(ms, ZipArchiveMode.Create, leaveOpen: true))
        {
            foreach (var (name, data) in entries)
            {
                var entry = zip.CreateEntry(name);
                using var s = entry.Open();
                s.Write(data);
            }
        }
        return ms.ToArray();
    }

    private static async Task WaitForPhaseAsync(string engineId, string phase, int timeoutMs = 15000)
    {
        var sw = System.Diagnostics.Stopwatch.StartNew();
        while (sw.ElapsedMilliseconds < timeoutMs)
        {
            var p = SttModelManager.GetModelDownloadProgress(engineId);
            if (p != null && p.Phase == phase) return;
            await Task.Delay(25);
        }
        var actual = SttModelManager.GetModelDownloadProgress(engineId);
        Assert.Fail($"等待 {engineId} 进入 {phase} 超时（实际 {actual?.Phase}，错误 {actual?.Error}）");
    }

    /// <summary>
    /// 极简本地 HTTP 服务端：支持/不支持 Range 两种形态，用于真实走一遍续传分支。
    /// </summary>
    private sealed class LocalHttpServer : IDisposable
    {
        private readonly HttpListener _listener = new();
        private readonly byte[] _payload;
        private readonly bool _supportRange;
        private readonly CancellationTokenSource _cts = new();

        public string Url { get; }
        public int RequestCount;
        public bool SawRangeRequest;

        public LocalHttpServer(byte[] payload, bool supportRange)
        {
            _payload = payload;
            _supportRange = supportRange;
            var port = GetFreePort();
            Url = $"http://127.0.0.1:{port}/payload.bin";
            _listener.Prefixes.Add($"http://127.0.0.1:{port}/");
            _listener.Start();
            _ = Task.Run(LoopAsync);
        }

        private static int GetFreePort()
        {
            var l = new System.Net.Sockets.TcpListener(System.Net.IPAddress.Loopback, 0);
            l.Start();
            var port = ((System.Net.IPEndPoint)l.LocalEndpoint).Port;
            l.Stop();
            return port;
        }

        private async Task LoopAsync()
        {
            while (!_cts.IsCancellationRequested)
            {
                HttpListenerContext ctx;
                try { ctx = await _listener.GetContextAsync(); }
                catch { return; }

                Interlocked.Increment(ref RequestCount);
                var range = ctx.Request.Headers["Range"];
                var start = 0;
                var partial = false;
                if (_supportRange && !string.IsNullOrEmpty(range) && range!.StartsWith("bytes="))
                {
                    var spec = range.Substring(6).Split('-')[0];
                    if (int.TryParse(spec, out var s) && s >= 0 && s < _payload.Length)
                    {
                        start = s;
                        partial = true;
                        SawRangeRequest = true;
                    }
                }

                var slice = _payload[start..];
                ctx.Response.StatusCode = partial ? 206 : 200;
                ctx.Response.ContentType = "application/octet-stream";
                if (partial)
                    ctx.Response.Headers["Content-Range"] = $"bytes {start}-{_payload.Length - 1}/{_payload.Length}";
                ctx.Response.ContentLength64 = slice.Length;
                await ctx.Response.OutputStream.WriteAsync(slice);
                ctx.Response.Close();
            }
        }

        public void Dispose()
        {
            _cts.Cancel();
            try { _listener.Stop(); } catch { }
            try { _listener.Close(); } catch { }
            _cts.Dispose();
        }
    }
}
