using EngineeringManager.Api.Services.Stt;
using System.IO;
using System.Text;
using Xunit;

namespace EngineeringManager.Tests.Security;

/// <summary>
/// LogFileIncrementalReader 专项测试（9.2 新增）
/// 覆盖：陈旧日志/截断/轮转/半行/延迟flush/快速退出/文件不存在/冲突
/// </summary>
public class LogFileReaderTests : IDisposable
{
    private readonly string _tempDir;

    public LogFileReaderTests()
    {
        _tempDir = Path.Combine(Path.GetTempPath(), "stt_log_test_" + Guid.NewGuid().ToString("N")[..8]);
        Directory.CreateDirectory(_tempDir);
    }

    public void Dispose()
    {
        try { Directory.Delete(_tempDir, true); } catch { }
    }

    private string CreateLogFile(string content)
    {
        var path = Path.Combine(_tempDir, "test.log");
        File.WriteAllText(path, content);
        return path;
    }

    private string LogPath => Path.Combine(_tempDir, "test.log");

    // ═══════════════════════════════════════════════════════════
    // 1. 陈旧日志：旧 29/29 不得给新任务放行
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void StaleLog_OldSuccess_NotReturned()
    {
        // 旧日志包含 29/29 成功
        var staleContent = "loaded Vulkan backend\noffloaded 29/29 layers to GPU\n";
        File.WriteAllText(LogPath, staleContent);

        // 创建 reader — 应跳过陈旧内容
        var reader = new LogFileIncrementalReader(LogPath);

        // 不追加新内容
        reader.ReadIncremental();

        var content = reader.GetContent();
        Assert.DoesNotContain("29/29", content);
        Assert.DoesNotContain("Vulkan", content);
        Assert.Equal("", content);
    }

    [Fact]
    public void StaleLog_OldSuccess_NewContentReturned()
    {
        // 旧日志包含 29/29 成功
        var staleContent = "loaded Vulkan backend\noffloaded 29/29 layers to GPU\n";
        File.WriteAllText(LogPath, staleContent);

        // 创建 reader — 记录 offset 跳过陈旧
        var reader = new LogFileIncrementalReader(LogPath);

        // 追加新内容（本轮 fallback）
        File.AppendAllText(LogPath, "falling back to CPU backend\n");

        reader.ReadIncremental();

        var content = reader.GetContent();
        Assert.Contains("falling back to CPU", content);
        Assert.DoesNotContain("29/29", content); // 陈旧内容不得出现
    }

    [Fact]
    public void StaleLog_OldSuccess_NewSuccess_ReturnsNewOnly()
    {
        // 旧日志包含 29/29 成功
        var staleContent = "old: offloaded 29/29 layers to GPU\n";
        File.WriteAllText(LogPath, staleContent);

        var reader = new LogFileIncrementalReader(LogPath);

        // 追加新的 29/29 成功
        File.AppendAllText(LogPath, "new: offloaded 29/29 layers to GPU\n");

        reader.ReadIncremental();

        var content = reader.GetContent();
        Assert.Contains("new:", content);
        Assert.DoesNotContain("old:", content); // 陈旧内容不得出现
    }

    // ═══════════════════════════════════════════════════════════
    // 2. 截断/轮转
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void TruncatedFile_OffsetResets()
    {
        // 初始内容
        File.WriteAllText(LogPath, "line1\nline2\nline3\n");
        var reader = new LogFileIncrementalReader(LogPath);

        // 截断文件（内容变短）
        File.WriteAllText(LogPath, "truncated line\n");

        reader.ReadIncremental();

        var content = reader.GetContent();
        Assert.Contains("truncated line", content);
        Assert.DoesNotContain("line1", content);
    }

    [Fact]
    public void RotatedFile_OffsetResets()
    {
        // 初始内容
        File.WriteAllText(LogPath, "old content line1\nold content line2\n");
        var reader = new LogFileIncrementalReader(LogPath);

        // 模拟轮转：完全覆盖文件
        File.WriteAllText(LogPath, "rotated content\nnew line\n");

        reader.ReadIncremental();

        var content = reader.GetContent();
        Assert.Contains("rotated content", content);
        Assert.Contains("new line", content);
        Assert.DoesNotContain("old content", content);
    }

    [Fact]
    public void EmptyFile_NoContent()
    {
        File.WriteAllText(LogPath, "");
        var reader = new LogFileIncrementalReader(LogPath);

        reader.ReadIncremental();

        Assert.Equal("", reader.GetContent());
    }

    // ═══════════════════════════════════════════════════════════
    // 3. 半行跨写
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void HalfLine_PartialWrite_NotIncluded()
    {
        File.WriteAllText(LogPath, "line1\n");
        var reader = new LogFileIncrementalReader(LogPath);

        // 追加不完整行（没有换行）
        File.AppendAllText(LogPath, "partial line without newline");

        reader.ReadIncremental();

        var content = reader.GetContent();
        Assert.DoesNotContain("partial line", content); // 半行不返回
    }

    [Fact]
    public void HalfLine_CompletedOnNextRead()
    {
        File.WriteAllText(LogPath, "line1\n");
        var reader = new LogFileIncrementalReader(LogPath);

        // 第一次：追加半行
        File.AppendAllText(LogPath, "partial");
        reader.ReadIncremental();
        Assert.DoesNotContain("partial", reader.GetContent());

        // 第二次：完成该行
        File.AppendAllText(LogPath, " line completed\n");
        reader.ReadIncremental();

        var content = reader.GetContent();
        Assert.Contains("partial line completed", content);
    }

    [Fact]
    public void HalfLine_MultiplePartialWrites()
    {
        File.WriteAllText(LogPath, "init\n");
        var reader = new LogFileIncrementalReader(LogPath);

        // 多次半行写入
        File.AppendAllText(LogPath, "part1-");
        reader.ReadIncremental();
        Assert.Equal("", reader.GetContent());

        File.AppendAllText(LogPath, "part2-");
        reader.ReadIncremental();
        Assert.Equal("", reader.GetContent());

        File.AppendAllText(LogPath, "done\n");
        reader.ReadIncremental();

        Assert.Contains("part1-part2-done", reader.GetContent());
    }

    // ═══════════════════════════════════════════════════════════
    // 4. 延迟 flush / 快速退出最终行
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void Drain_FlushesRemainingContent()
    {
        File.WriteAllText(LogPath, "line1\n");
        var reader = new LogFileIncrementalReader(LogPath);

        // 追加有换行的内容
        File.AppendAllText(LogPath, "line2\nline3\n");
        reader.ReadIncremental();
        Assert.Contains("line2", reader.GetContent());

        // 追加更多内容（模拟退出前最后 flush）
        File.AppendAllText(LogPath, "final line\n");
        reader.Drain(0); // 不等待

        Assert.Contains("final line", reader.GetContent());
    }

    [Fact]
    public void Drain_OnlyCalledOnce()
    {
        File.WriteAllText(LogPath, "line1\n");
        var reader = new LogFileIncrementalReader(LogPath);

        File.AppendAllText(LogPath, "line2\n");
        reader.Drain(0);
        var contentAfterFirstDrain = reader.GetContent();

        // 再追加内容
        File.AppendAllText(LogPath, "line3\n");
        reader.Drain(0); // 应该被忽略

        // line3 不应该被读到（Drain 只调一次）
        Assert.DoesNotContain("line3", reader.GetContent());
    }

    [Fact]
    public void QuickExit_LastLineFlushed()
    {
        // 创建空文件（模拟新运行的日志）
        File.WriteAllText(LogPath, "");
        var reader = new LogFileIncrementalReader(LogPath);

        // 进程快速写入后退出
        File.AppendAllText(LogPath, "offloaded 29/29 layers to GPU\n");

        reader.Drain(0);

        Assert.Contains("29/29", reader.GetContent());
    }

    // ═══════════════════════════════════════════════════════════
    // 5. 文件不存在/异常 fail closed
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void FileNotExist_NoContent()
    {
        var reader = new LogFileIncrementalReader(Path.Combine(_tempDir, "nonexistent.log"));

        reader.ReadIncremental();

        Assert.Equal("", reader.GetContent());
    }

    [Fact]
    public void NullPath_NoContent()
    {
        var reader = new LogFileIncrementalReader(null);

        reader.ReadIncremental();

        Assert.Equal("", reader.GetContent());
    }

    [Fact]
    public void EmptyPath_NoContent()
    {
        var reader = new LogFileIncrementalReader("");

        reader.ReadIncremental();

        Assert.Equal("", reader.GetContent());
    }

    [Fact]
    public void FileNotExist_Drain_NoException()
    {
        var reader = new LogFileIncrementalReader(Path.Combine(_tempDir, "nonexistent.log"));

        reader.Drain(0); // 不应抛异常

        Assert.Equal("", reader.GetContent());
    }

    // ═══════════════════════════════════════════════════════════
    // 6. 上轮成功 + 本轮 fallback 冲突 → 本轮失败
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void PreviousSuccess_CurrentFallback_CurrentFails()
    {
        // 旧日志：成功
        var oldLog = "loaded Vulkan backend\noffloaded 29/29 layers to GPU\n";
        File.WriteAllText(LogPath, oldLog);

        // 新 reader 跳过旧日志
        var reader = new LogFileIncrementalReader(LogPath);

        // 本轮追加 fallback
        File.AppendAllText(LogPath, "falling back to CPU backend\n");

        reader.ReadIncremental();
        var content = reader.GetContent();

        // GpuLogParser 解析
        var status = GpuLogParser.ParseAll(content);

        // 本轮 fallback 应该被检测到
        Assert.True(status.CpuFallbackDetected);
        // 旧的 29/29 不应该出现
        Assert.False(status.OffloadLayersConfirmed);
    }

    [Fact]
    public void PreviousSuccess_CurrentSuccess_CurrentPasses()
    {
        // 旧日志：成功
        var oldLog = "old: offloaded 29/29 layers to GPU\n";
        File.WriteAllText(LogPath, oldLog);

        var reader = new LogFileIncrementalReader(LogPath);

        // 本轮追加新的成功
        File.AppendAllText(LogPath, "loaded Vulkan backend\nnew: offloaded 29/29 layers to GPU\n");

        reader.ReadIncremental();
        var content = reader.GetContent();

        var status = GpuLogParser.ParseAll(content);

        // 本轮成功应该被检测到
        Assert.True(status.OffloadLayersConfirmed);
        Assert.Equal(29, status.OffloadLayers);
        Assert.False(status.CpuFallbackDetected);
    }

    [Fact]
    public void PreviousSuccess_CurrentEmpty_CurrentFails()
    {
        // 旧日志：成功
        var oldLog = "offloaded 29/29 layers to GPU\n";
        File.WriteAllText(LogPath, oldLog);

        var reader = new LogFileIncrementalReader(LogPath);

        // 本轮不追加任何内容（进程崩溃前没写日志）
        reader.ReadIncremental();
        var content = reader.GetContent();

        var status = GpuLogParser.ParseAll(content);

        // 没有新的 GPU 证据 → 不应该通过
        Assert.False(status.OffloadLayersConfirmed);
        Assert.False(status.VulkanBackendConfirmed);
        Assert.False(status.IsFullyConfirmed);
    }

    // ═══════════════════════════════════════════════════════════
    // 7. 综合端到端：模拟 9.0 真实日志场景
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void EndToEnd_Real9_0_LogScenario()
    {
        // 模拟 latest.log 已有陈旧内容（9.0 之前的日志）
        var staleLog = @"2026-07-09 20:16:04 - old run content
load_backend: loaded CPU backend from old path
offloaded 29/29 layers to GPU
";
        File.WriteAllText(LogPath, staleLog);

        // 创建 reader — 跳过陈旧
        var reader = new LogFileIncrementalReader(LogPath);
        Assert.Equal("", reader.GetContent()); // 初始为空

        // 模拟本轮运行写入新日志
        var newLog = @"2026-07-14 10:56:12,122 - ggml_vulkan: 0 = AMD Radeon RX 580 2048SP
2026-07-14 10:56:12,122 - load_backend: loaded Vulkan backend from ggml-vulkan.dll
2026-07-14 10:56:12,143 - load_backend: loaded CPU backend from ggml-cpu-haswell.dll
2026-07-14 10:56:12,544 - load_tensors: offloaded 29/29 layers to GPU
";
        File.AppendAllText(LogPath, newLog);

        // 读取
        reader.ReadIncremental();
        reader.Drain(0);
        var content = reader.GetContent();

        // 验证：只包含本轮内容
        Assert.Contains("AMD Radeon RX 580 2048SP", content);
        Assert.Contains("offloaded 29/29 layers to GPU", content);
        Assert.DoesNotContain("2026-07-09", content); // 陈旧内容
        Assert.DoesNotContain("old run content", content);

        // GpuLogParser 应该能解析成功
        var status = GpuLogParser.ParseAll(content);
        Assert.True(status.VulkanBackendConfirmed);
        Assert.True(status.OffloadLayersConfirmed);
        Assert.Equal(29, status.OffloadLayers);
        Assert.False(status.CpuFallbackDetected); // CPU backend 但不是 fallback
    }

    [Fact]
    public void EndToEnd_Real9_0_LogScenario_WithHalfLine()
    {
        // 陈旧日志
        File.WriteAllText(LogPath, "old stale content\n");

        var reader = new LogFileIncrementalReader(LogPath);

        // 追加新内容（含半行）
        File.AppendAllText(LogPath, "loaded Vulkan backend\noffloaded 29/29 layers to GPU\npartial half line");

        reader.ReadIncremental();

        var content = reader.GetContent();
        Assert.Contains("29/29", content);
        Assert.DoesNotContain("partial half line", content); // 半行不返回

        // 完成半行
        File.AppendAllText(LogPath, " completed\n");
        reader.ReadIncremental();

        Assert.Contains("partial half line completed", reader.GetContent());
    }

    // ═══════════════════════════════════════════════════════════
    // 8. PrepareForNewRun：重命名/删除旧日志
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void PrepareForNewRun_RenamesOldFile()
    {
        File.WriteAllText(LogPath, "old stale content\n");
        Assert.True(LogFileIncrementalReader.PrepareForNewRun(LogPath));
        Assert.False(File.Exists(LogPath)); // 旧文件已重命名
        // 新空文件
        File.WriteAllText(LogPath, "");
        // reader 先创建（offset=0），再写入新内容
        var reader = new LogFileIncrementalReader(LogPath);
        File.AppendAllText(LogPath, "new content\n");
        reader.ReadIncremental();
        Assert.Contains("new content", reader.GetContent());
        Assert.DoesNotContain("old stale", reader.GetContent());
    }

    [Fact]
    public void PrepareForNewRun_NoExistingFile_ReturnsTrue()
    {
        var path = Path.Combine(_tempDir, "nonexistent.log");
        Assert.True(LogFileIncrementalReader.PrepareForNewRun(path));
    }

    [Fact]
    public void PrepareForNewRun_NullPath_ReturnsTrue()
    {
        Assert.True(LogFileIncrementalReader.PrepareForNewRun(null));
    }

    [Fact]
    public void PrepareForNewRun_EmptyPath_ReturnsTrue()
    {
        Assert.True(LogFileIncrementalReader.PrepareForNewRun(""));
    }

    [Fact]
    public void PrepareForNewRun_FileLocked_FailClosed()
    {
        File.WriteAllText(LogPath, "locked content\n");
        // 用独占锁锁定文件
        using var lockStream = new FileStream(LogPath, FileMode.Open, FileAccess.ReadWrite, FileShare.None);
        // 重命名和删除都应失败
        Assert.False(LogFileIncrementalReader.PrepareForNewRun(LogPath));
        // 文件仍然存在，内容不变
        Assert.True(File.Exists(LogPath));
    }

    [Fact]
    public void PrepareForNewRun_CreatesDirectoryIfMissing()
    {
        var nestedPath = Path.Combine(_tempDir, "sub", "deep", "test.log");
        Assert.True(LogFileIncrementalReader.PrepareForNewRun(nestedPath));
        Assert.True(Directory.Exists(Path.Combine(_tempDir, "sub", "deep")));
    }

    // ═══════════════════════════════════════════════════════════
    // 9. 同长度轮转（旧 offset 方式的漏洞证明 + 新方式修复）
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void SameLengthRotation_PrepareForNewRun_PreventsStaleContent()
    {
        // 旧日志恰好 100 字节
        var oldContent = "old: offloaded 29/29 layers to GPU\n";
        while (oldContent.Length < 100) oldContent += "x";
        oldContent += "\n";
        File.WriteAllText(LogPath, oldContent);

        // PrepareForNewRun 重命名旧文件
        Assert.True(LogFileIncrementalReader.PrepareForNewRun(LogPath));

        // 新空文件
        File.WriteAllText(LogPath, "");
        // reader 先创建（offset=0），再写入新内容
        var reader = new LogFileIncrementalReader(LogPath);

        // 本轮写入同样长度的内容（但内容不同）
        var newContent = "new: falling back to CPU backend!!\n";
        while (newContent.Length < oldContent.Length) newContent += "y";
        newContent += "\n";
        File.AppendAllText(LogPath, newContent);

        reader.ReadIncremental();

        var content = reader.GetContent();
        Assert.Contains("falling back to CPU", content);
        Assert.DoesNotContain("old:", content);
    }

    [Fact]
    public void OldShort_NewLong_OnlyNewReturned()
    {
        // 旧 100 字节成功
        var oldContent = new string('A', 99) + "\n";
        File.WriteAllText(LogPath, oldContent);

        // PrepareForNewRun 清理
        Assert.True(LogFileIncrementalReader.PrepareForNewRun(LogPath));

        // 新空文件
        File.WriteAllText(LogPath, "");
        // reader 先创建（offset=0），再写入新内容
        var reader = new LogFileIncrementalReader(LogPath);

        // 本轮 200 字节 fallback
        var newContent = "falling back to CPU backend\n" + new string('B', 170);
        File.AppendAllText(LogPath, newContent);

        reader.ReadIncremental();

        Assert.Contains("falling back to CPU", reader.GetContent());
        Assert.DoesNotContain("A", reader.GetContent().TrimEnd('B'));
    }

    // ═══════════════════════════════════════════════════════════
    // 10. 异常时不得返回旧内容，最终 GPU 验证必须失败
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void ReadIncremental_FileLocked_NoOldContent()
    {
        // 先写入旧成功内容
        File.WriteAllText(LogPath, "offloaded 29/29 layers to GPU\n");
        var reader = new LogFileIncrementalReader(LogPath);

        // 本轮用独占锁写入（模拟 llama.cpp 写入时锁定）
        using (var lockStream = new FileStream(LogPath, FileMode.Append, FileAccess.Write, FileShare.None))
        {
            // 此时 reader 读取会遇到 IOException（文件被锁定）
            // 但不应该返回旧内容
            reader.ReadIncremental();
        }

        // 旧内容不应该被返回（因为 offset 已跳过）
        Assert.DoesNotContain("29/29", reader.GetContent());
    }

    [Fact]
    public void ExceptionDuringRead_OldSuccessNotReturned()
    {
        // 旧日志有成功内容
        File.WriteAllText(LogPath, "old: offloaded 29/29 layers to GPU\n");
        var reader = new LogFileIncrementalReader(LogPath);

        // 用独占锁阻止读取
        using var lockStream = new FileStream(LogPath, FileMode.Open, FileAccess.ReadWrite, FileShare.None);

        // reader 读取应该异常但不抛出
        reader.ReadIncremental();

        // 旧内容不应出现
        Assert.DoesNotContain("29/29", reader.GetContent());
    }

    [Fact]
    public void PrepareForNewRun_Fails_FinalGpuVerificationFails()
    {
        // 模拟：旧日志有成功内容，但 PrepareForNewRun 失败（文件锁定）
        File.WriteAllText(LogPath, "offloaded 29/29 layers to GPU\n");
        using var lockStream = new FileStream(LogPath, FileMode.Open, FileAccess.ReadWrite, FileShare.None);

        // PrepareForNewRun 失败 = fail closed
        var prepared = LogFileIncrementalReader.PrepareForNewRun(LogPath);
        Assert.False(prepared);

        // 如果 fail closed，生产代码不会启动模型
        // 所以不会有 reader，最终 GPU 验证自然失败
    }

    [Fact]
    public void PrepareForNewRun_Success_NewEmptyLog_ReaderStartsFromZero()
    {
        // 旧日志 1000 字节成功
        File.WriteAllText(LogPath, new string('X', 999) + "\n");
        Assert.True(LogFileIncrementalReader.PrepareForNewRun(LogPath));

        // 新空文件 — reader 从 offset 0 开始
        File.WriteAllText(LogPath, "");
        var reader = new LogFileIncrementalReader(LogPath);
        Assert.Equal(0, reader.CurrentOffset);

        // 写入本轮内容
        File.AppendAllText(LogPath, "loaded Vulkan backend\noffloaded 29/29 layers to GPU\n");
        reader.ReadIncremental();

        var status = GpuLogParser.ParseAll(reader.GetContent());
        Assert.True(status.OffloadLayersConfirmed);
        Assert.Equal(29, status.OffloadLayers);
        Assert.DoesNotContain("X", reader.GetContent());
    }
}
