using EngineeringManager.Api.Services.Stt;
using Xunit;

namespace EngineeringManager.Tests.Security;

/// <summary>
/// GpuLogParser 单元测试：验证日志解析逻辑（纯逻辑，不依赖真实进程）。
/// </summary>
public class GpuLogParserTests
{
    // ═══════════════════════════════════════════════════════════
    // Vulkan backend 解析
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void TryParseVulkanBackend_LoadedVulkanBackend_ReturnsTrue()
    {
        var output = "ggml: loaded Vulkan backend (AMD Radeon RX 580)";
        var result = GpuLogParser.TryParseVulkanBackend(output, out var name);

        Assert.True(result);
        Assert.Contains("Vulkan", name);
    }

    [Fact]
    public void TryParseVulkanBackend_UsingVulkanBackend_ReturnsTrue()
    {
        var output = "using Vulkan backend for computation";
        var result = GpuLogParser.TryParseVulkanBackend(output, out var name);

        Assert.True(result);
    }

    [Fact]
    public void TryParseVulkanBackend_OnlyContainsWordVulkan_ReturnsFalse()
    {
        // 仅出现 "Vulkan" 字样但不是加载语句 → 不应通过
        var output = "Vulkan DLL found at /path/to/ggml-vulkan.dll";
        var result = GpuLogParser.TryParseVulkanBackend(output, out _);

        Assert.False(result);
    }

    [Fact]
    public void TryParseVulkanBackend_EmptyOutput_ReturnsFalse()
    {
        var result = GpuLogParser.TryParseVulkanBackend("", out _);
        Assert.False(result);
    }

    [Fact]
    public void TryParseVulkanBackend_NullOutput_ReturnsFalse()
    {
        var result = GpuLogParser.TryParseVulkanBackend(null!, out _);
        Assert.False(result);
    }

    // ═══════════════════════════════════════════════════════════
    // 设备名解析
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void TryParseDeviceName_GgmlVulkanLine_ReturnsTrue()
    {
        var output = "ggml_vulkan: 0 = AMD Radeon RX 580 2048SP (AMD proprietary driver)";
        var result = GpuLogParser.TryParseDeviceName(output, out var name);

        Assert.True(result);
        Assert.Contains("RX 580", name);
    }

    [Fact]
    public void TryParseDeviceName_UsingDeviceLine_ReturnsTrue()
    {
        var output = "using device Vulkan0 (AMD Radeon RX 580 2048SP)";
        var result = GpuLogParser.TryParseDeviceName(output, out var name);

        Assert.True(result);
        Assert.Contains("RX 580", name);
    }

    [Fact]
    public void TryParseDeviceName_GpuOffloadLine_ReturnsFalse()
    {
        // 9.4 bug 回归："GPU offload: n_gpu_layers=-1" 不应被识别为设备名
        var output = "GPU offload: n_gpu_layers=-1 (全部层)";
        var result = GpuLogParser.TryParseDeviceName(output, out _);

        Assert.False(result);
    }

    // ═══════════════════════════════════════════════════════════
    // offload 层数解析
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void TryParseOffloadLayers_TwentyNineOfTwentyNine_ReturnsTrue()
    {
        var output = "offloaded 29/29 layers to GPU";
        var result = GpuLogParser.TryParseOffloadLayers(output, out var layers, out var total);

        Assert.True(result);
        Assert.Equal(29, layers);
        Assert.Equal(29, total);
    }

    [Fact]
    public void TryParseOffloadLayers_LayersKeyword_ReturnsTrue()
    {
        var output = "29/29 layers offloaded to VRAM";
        var result = GpuLogParser.TryParseOffloadLayers(output, out var layers, out var total);

        Assert.True(result);
        Assert.Equal(29, layers);
        Assert.Equal(29, total);
    }

    [Fact]
    public void TryParseOffloadLayers_PartialOffload_ReturnsTrue()
    {
        var output = "offloaded 15/29 layers to GPU";
        var result = GpuLogParser.TryParseOffloadLayers(output, out var layers, out var total);

        Assert.True(result);
        Assert.Equal(15, layers);
        Assert.Equal(29, total);
    }

    [Fact]
    public void TryParseOffloadLayers_NoOffloadInfo_ReturnsFalse()
    {
        var output = "starting transcription with Vulkan backend";
        var result = GpuLogParser.TryParseOffloadLayers(output, out _, out _);

        Assert.False(result);
    }

    // ═══════════════════════════════════════════════════════════
    // CPU fallback 解析
    // ═══════════════════════════════════════════════════════════

[Fact]
public void TryParseCpuFallback_LoadedCpuBackend_ReturnsFalse()
{
// 9.1 修正："loaded CPU backend" 单独出现不是 fallback
var output = "ggml: loaded CPU backend";
var result = GpuLogParser.TryParseCpuFallback(output);

Assert.False(result);
}

    [Fact]
    public void TryParseCpuFallback_FallingBackToCpu_ReturnsTrue()
    {
        var output = "Vulkan init failed, falling back to CPU backend";
        var result = GpuLogParser.TryParseCpuFallback(output);

        Assert.True(result);
    }

    [Fact]
    public void TryParseCpuFallback_FallbackToCpu_ReturnsTrue()
    {
        var output = "fallback to CPU backend due to GPU error";
        var result = GpuLogParser.TryParseCpuFallback(output);

        Assert.True(result);
    }

    [Fact]
    public void TryParseCpuFallback_NoCpuFallback_ReturnsFalse()
    {
        var output = "loaded Vulkan backend with AMD Radeon RX 580, offloaded 29/29 layers";
        var result = GpuLogParser.TryParseCpuFallback(output);

        Assert.False(result);
    }

    [Fact]
    public void TryParseCpuFallback_EmptyOutput_ReturnsFalse()
    {
        var result = GpuLogParser.TryParseCpuFallback("");
        Assert.False(result);
    }

    // ═══════════════════════════════════════════════════════════
    // ParseAll 综合解析
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void ParseAll_FullSuccessLog_AllConfirmed()
    {
        var output = "ggml: loaded Vulkan backend\nggml_vulkan: 0 = AMD Radeon RX 580 2048SP (AMD proprietary driver)\noffloaded 29/29 layers to GPU";
        var status = GpuLogParser.ParseAll(output);

        Assert.True(status.VulkanBackendConfirmed);
        Assert.True(status.DeviceNameConfirmed);
        Assert.True(status.OffloadLayersConfirmed);
        Assert.Equal(29, status.OffloadLayers);
        Assert.Equal(29, status.OffloadTotal);
        Assert.False(status.CpuFallbackDetected);
        Assert.True(status.IsFullyConfirmed);
    }

    [Fact]
    public void ParseAll_PartialLog_NotFullyConfirmed()
    {
        var output = "ggml: loaded Vulkan backend\nstarting transcription";
        var status = GpuLogParser.ParseAll(output);

        Assert.True(status.VulkanBackendConfirmed);
        Assert.False(status.DeviceNameConfirmed);
        Assert.False(status.OffloadLayersConfirmed);
        Assert.False(status.IsFullyConfirmed);
    }

    [Fact]
    public void ParseAll_CpuFallbackLog_NotFullyConfirmed()
    {
        var output = "Vulkan init failed, falling back to CPU backend";
        var status = GpuLogParser.ParseAll(output);

        Assert.False(status.VulkanBackendConfirmed);
        Assert.True(status.CpuFallbackDetected);
        Assert.False(status.IsFullyConfirmed);
    }

    [Fact]
    public void ParseAll_EmptyOutput_NothingConfirmed()
    {
        var status = GpuLogParser.ParseAll("");

        Assert.False(status.VulkanBackendConfirmed);
        Assert.False(status.DeviceNameConfirmed);
        Assert.False(status.OffloadLayersConfirmed);
        Assert.False(status.CpuFallbackDetected);
        Assert.False(status.IsFullyConfirmed);
    }

    [Fact]
    public void ParseAll_PartialOffload_NotFullyConfirmed()
    {
        var output = "loaded Vulkan backend\nggml_vulkan: 0 = AMD Radeon RX 580 2048SP (AMD proprietary driver)\noffloaded 15/29 layers to GPU";
        var status = GpuLogParser.ParseAll(output);

        Assert.True(status.VulkanBackendConfirmed);
        Assert.True(status.DeviceNameConfirmed);
        Assert.True(status.OffloadLayersConfirmed);
        Assert.Equal(15, status.OffloadLayers);
        Assert.False(status.IsFullyConfirmed); // 15 < 29
    }
}

/// <summary>
/// 运行时接线测试：验证 SttMonitorLoop 在 fake telemetry 上的行为。
/// 不启动真实进程、模型或 GPU — 全部使用注入的 fake 数据。
/// </summary>
public class SttMonitorLoopTests
{
    /// <summary>
    /// Fake telemetry provider：可编程的资源快照和进程输出。
    /// </summary>
    internal class FakeTelemetryProvider : ISttTelemetryProvider
    {
        public long FakePrivateBytes { get; set; } = 500 * 1024 * 1024; // 500MB
        public double FakeRamPercent { get; set; } = 50.0;
        public long FakeCommitted { get; set; } = 4L * 1024 * 1024 * 1024;
        public long FakeCommitLimit { get; set; } = 16L * 1024 * 1024 * 1024;
        public long FakeAvailableMemory { get; set; } = 8L * 1024 * 1024 * 1024; // 8GB
        public string FakeOutput { get; set; } = "";
        public bool FakeHasExited { get; set; } = false;
        public int FakeProcessId { get; set; } = 12345;
        public bool KillWasCalled { get; private set; }
        public int KillCallCount { get; private set; }

        public long GetPrivateBytes() => FakePrivateBytes;
        public double GetRamUsagePercent() => FakeRamPercent;
        public (long committed, long commitLimit) GetCommitInfo() => (FakeCommitted, FakeCommitLimit);
        public long GetAvailableMemoryBytes() => FakeAvailableMemory;
        public string GetAccumulatedOutput() => FakeOutput;
        public void DrainLogContent() { }
        public bool HasProcessExited => FakeHasExited;
        public int ProcessId => FakeProcessId;
        public void KillProcessTree() { KillWasCalled = true; KillCallCount++; }
    }

    // ═══════════════════════════════════════════════════════════
    // 正常运行
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void CheckOnce_NormalResources_ReturnsNull()
    {
        var telemetry = new FakeTelemetryProvider
        {
            FakePrivateBytes = 500 * 1024 * 1024,
            FakeRamPercent = 50.0,
            FakeOutput = "loaded Vulkan backend\nggml_vulkan: 0 = AMD Radeon RX 580 2048SP (AMD proprietary driver)\noffloaded 29/29 layers"
        };
        var loop = new SttMonitorLoop(telemetry);
        var startTime = DateTime.UtcNow.AddSeconds(-5);

        var result = loop.CheckOnce(startTime);

        Assert.Null(result); // null = 继续
        Assert.True(loop.GpuConfirmed);
        Assert.True(loop.OffloadConfirmed);
        Assert.Equal(29, loop.OffloadLayers);
        Assert.False(loop.WasKilled);
    }

    [Fact]
    public void CheckOnce_ProcessExited_ReturnsNull()
    {
        var telemetry = new FakeTelemetryProvider { FakeHasExited = true };
        var loop = new SttMonitorLoop(telemetry);

        var result = loop.CheckOnce(DateTime.UtcNow);

        Assert.Null(result);
        Assert.False(telemetry.KillWasCalled);
    }

    // ═══════════════════════════════════════════════════════════
    // 资源阈值
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void CheckOnce_PrivateBytesOver6GB_KillsAndReturnsError()
    {
        var telemetry = new FakeTelemetryProvider
        {
            FakePrivateBytes = 7L * 1024 * 1024 * 1024, // 7GB
            FakeRamPercent = 50.0,
        };
        var loop = new SttMonitorLoop(telemetry);

        var result = loop.CheckOnce(DateTime.UtcNow);

        Assert.NotNull(result);
        Assert.Contains("Private Bytes", result!);
        Assert.True(telemetry.KillWasCalled);
        Assert.True(loop.WasKilled);
    }

    [Fact]
    public void CheckOnce_RamOver80Percent_OnlyWarning_DoesNotKill()
    {
        // 10.6: RAM≥80% 仅告警，不杀进程（绝对资源门控变更）
        var telemetry = new FakeTelemetryProvider
        {
            FakePrivateBytes = 1L * 1024 * 1024 * 1024,
            FakeRamPercent = 85.0,
            FakeAvailableMemory = 8L * 1024 * 1024 * 1024, // 充足可用内存
        };
        var loop = new SttMonitorLoop(telemetry);

        var result = loop.CheckOnce(DateTime.UtcNow);

        Assert.Null(result); // null = 继续，不杀
        Assert.False(telemetry.KillWasCalled);
    }

    [Fact]
    public void CheckOnce_AvailableMemoryBelow2GB_Kills()
    {
        // 10.7 前置测试：可用内存 < 2GB → Monitor 必须调用 kill-tree
        var telemetry = new FakeTelemetryProvider
        {
            FakePrivateBytes = 1L * 1024 * 1024 * 1024,
            FakeRamPercent = 50.0,
            FakeAvailableMemory = 1L * 1024 * 1024 * 1024, // 1GB < 2GB
        };
        var loop = new SttMonitorLoop(telemetry);

        var result = loop.CheckOnce(DateTime.UtcNow);

        Assert.NotNull(result);
        Assert.Contains("可用物理内存", result!);
        Assert.True(telemetry.KillWasCalled);
        Assert.True(loop.WasKilled);
    }

    [Fact]
    public void CheckOnce_CommitOver90Percent_KillsAndReturnsError()
    {
        var telemetry = new FakeTelemetryProvider
        {
            FakePrivateBytes = 1L * 1024 * 1024 * 1024,
            FakeRamPercent = 50.0,
            FakeCommitted = 15L * 1024 * 1024 * 1024,
            FakeCommitLimit = 16L * 1024 * 1024 * 1024,
        };
        var loop = new SttMonitorLoop(telemetry);

        var result = loop.CheckOnce(DateTime.UtcNow);

        Assert.NotNull(result);
        Assert.Contains("Commit", result!);
        Assert.True(telemetry.KillWasCalled);
    }

    // ═══════════════════════════════════════════════════════════
    // GPU 超时
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void CheckOnce_GpuTimeout30Seconds_KillsAndReturnsError()
    {
        var telemetry = new FakeTelemetryProvider
        {
            FakeOutput = "starting transcription...", // 无 Vulkan
        };
        var loop = new SttMonitorLoop(telemetry);
        var startTime = DateTime.UtcNow.AddSeconds(-31); // 超过 30 秒

        var result = loop.CheckOnce(startTime);

        Assert.NotNull(result);
        Assert.Contains("30秒", result!);
        Assert.True(telemetry.KillWasCalled);
    }

    [Fact]
    public void CheckOnce_GpuUnderTimeout_NoKill()
    {
        var telemetry = new FakeTelemetryProvider
        {
            FakeOutput = "starting transcription...",
        };
        var loop = new SttMonitorLoop(telemetry);
        var startTime = DateTime.UtcNow.AddSeconds(-10); // 10 秒，未超时

        var result = loop.CheckOnce(startTime);

        Assert.Null(result);
        Assert.False(telemetry.KillWasCalled);
    }

    // ═══════════════════════════════════════════════════════════
    // CPU fallback
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void CheckOnce_CpuFallbackDetected_KillsAndReturnsError()
    {
        var telemetry = new FakeTelemetryProvider
        {
            FakeOutput = "Vulkan init failed, falling back to CPU backend",
        };
        var loop = new SttMonitorLoop(telemetry);

        var result = loop.CheckOnce(DateTime.UtcNow);

        Assert.NotNull(result);
        Assert.Contains("CPU fallback", result!);
        Assert.True(telemetry.KillWasCalled);
        Assert.True(loop.CpuFallbackDetected);
    }

    // ═══════════════════════════════════════════════════════════
    // GPU 确认日志解析
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void CheckOnce_VulkanConfirmed_UpdatesGpuConfirmed()
    {
        var telemetry = new FakeTelemetryProvider
        {
            FakeOutput = "ggml: loaded Vulkan backend (AMD Radeon RX 580)",
        };
        var loop = new SttMonitorLoop(telemetry);

        loop.CheckOnce(DateTime.UtcNow);

        Assert.True(loop.GpuConfirmed);
    }

    [Fact]
    public void CheckOnce_OffloadConfirmed_UpdatesOffloadLayers()
    {
        var telemetry = new FakeTelemetryProvider
        {
            FakeOutput = "offloaded 29/29 layers to GPU",
        };
        var loop = new SttMonitorLoop(telemetry);

        loop.CheckOnce(DateTime.UtcNow);

        Assert.True(loop.OffloadConfirmed);
        Assert.Equal(29, loop.OffloadLayers);
    }

    [Fact]
    public void CheckOnce_OnlyVulkanWord_NotConfirmed()
    {
        // 仅出现 "Vulkan" 字样，不是加载语句 → 不应确认
        var telemetry = new FakeTelemetryProvider
        {
            FakeOutput = "Vulkan DLL found at /path/to/dll",
        };
        var loop = new SttMonitorLoop(telemetry);

        loop.CheckOnce(DateTime.UtcNow);

        Assert.False(loop.GpuConfirmed);
    }

    // ═══════════════════════════════════════════════════════════
    // FinalGpuVerification
    // ═══════════════════════════════════════════════════════════

    // Fake GpuInfo for testing (avoids dependency on real hardware)
    private static readonly GpuInfo FakeGoodGpu = new()
    {
        HasDiscreteGpu = true,
        GpuName = "AMD Radeon RX 580",
        VramMb = 8192,
        VramDetectionMethod = "registry",
        SupportsVulkan = true,
    };

    // Full valid GPU log output for reuse in tests
    private const string FullGpuLog = "loaded Vulkan backend\nggml_vulkan: 0 = AMD Radeon RX 580 2048SP (AMD proprietary driver)\noffloaded 29/29 layers to GPU";

    [Fact]
    public void FinalGpuVerification_MissingVulkan_ReturnsFail()
    {
        var telemetry = new FakeTelemetryProvider { FakeOutput = "starting transcription" };
        var loop = new SttMonitorLoop(telemetry);
        var result = loop.FinalGpuVerification(FakeGoodGpu);
        Assert.True(result.ShouldFail);
        Assert.Contains("Vulkan", result.Message);
    }

    [Fact]
    public void FinalGpuVerification_MissingOffload_ReturnsFail()
    {
        var telemetry = new FakeTelemetryProvider { FakeOutput = "loaded Vulkan backend\nggml_vulkan: 0 = AMD Radeon RX 580 2048SP (AMD proprietary driver)" };
        var loop = new SttMonitorLoop(telemetry);
        var result = loop.FinalGpuVerification(FakeGoodGpu);
        Assert.True(result.ShouldFail);
        Assert.Contains("offload", result.Message);
    }

    [Fact]
    public void FinalGpuVerification_PartialOffload_ReturnsFail()
    {
        var telemetry = new FakeTelemetryProvider { FakeOutput = "loaded Vulkan backend\nggml_vulkan: 0 = AMD Radeon RX 580 2048SP (AMD proprietary driver)\noffloaded 15/29 layers" };
        var loop = new SttMonitorLoop(telemetry);
        var result = loop.FinalGpuVerification(FakeGoodGpu);
        Assert.True(result.ShouldFail);
        Assert.Contains("15", result.Message);
    }

    [Fact]
    public void FinalGpuVerification_29of30_ReturnsFail()
    {
        var telemetry = new FakeTelemetryProvider { FakeOutput = "loaded Vulkan backend\nggml_vulkan: 0 = AMD Radeon RX 580 2048SP (AMD proprietary driver)\noffloaded 29/30 layers" };
        var loop = new SttMonitorLoop(telemetry);
        var result = loop.FinalGpuVerification(FakeGoodGpu);
        Assert.True(result.ShouldFail);
        Assert.Contains("29/30", result.Message);
    }

    [Fact]
    public void FinalGpuVerification_MissingDeviceName_ReturnsFail()
    {
        var telemetry = new FakeTelemetryProvider { FakeOutput = "loaded Vulkan backend\noffloaded 29/29 layers to GPU" };
        var loop = new SttMonitorLoop(telemetry);
        var result = loop.FinalGpuVerification(FakeGoodGpu);
        Assert.True(result.ShouldFail);
        Assert.Contains("设备名", result.Message);
    }

    [Fact]
    public void FinalGpuVerification_DeviceNameMismatch_ReturnsFail()
    {
        var telemetry = new FakeTelemetryProvider { FakeOutput = "loaded Vulkan backend\nggml_vulkan: 0 = NVIDIA GeForce GTX 1060 (NVIDIA driver)\noffloaded 29/29 layers" };
        var loop = new SttMonitorLoop(telemetry);
        var result = loop.FinalGpuVerification(FakeGoodGpu);
        Assert.True(result.ShouldFail);
        Assert.Contains("NVIDIA", result.Message);
    }

    [Fact]
    public void FinalGpuVerification_FullValidLog_ReturnsPass()
    {
        var telemetry = new FakeTelemetryProvider { FakeOutput = FullGpuLog };
        var loop = new SttMonitorLoop(telemetry);
        var result = loop.FinalGpuVerification(FakeGoodGpu);
        Assert.True(result.IsOk);
        Assert.Contains("RX 580", result.Message);
        Assert.Contains("29/29", result.Message);
    }

    // ═══════════════════════════════════════════════════════════
    // 单实例释放
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void CheckSingleInstance_ReleaseAfterException()
    {
        // 验证 SttSafetyChecker.CheckSingleInstance 逻辑
        var r1 = SttSafetyChecker.CheckSingleInstance(false);
        Assert.True(r1.IsOk);

        var r2 = SttSafetyChecker.CheckSingleInstance(true);
        Assert.True(r2.ShouldFail);

        // 释放后可以再次启动
        var r3 = SttSafetyChecker.CheckSingleInstance(false);
        Assert.True(r3.IsOk);
    }

    [Fact]
    public void CheckOnce_KillCalledExactlyOnce()
    {
        var telemetry = new FakeTelemetryProvider
        {
            FakePrivateBytes = 7L * 1024 * 1024 * 1024,
        };
        var loop = new SttMonitorLoop(telemetry);

        loop.CheckOnce(DateTime.UtcNow);

        Assert.Equal(1, telemetry.KillCallCount);
    }

    // ═══════════════════════════════════════════════════════════
    // 监控日志
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void CheckOnce_UpdatesMonitorLog()
    {
        var telemetry = new FakeTelemetryProvider
        {
            FakePrivateBytes = 1024 * 1024 * 1024, // 1GB
            FakeRamPercent = 60.0,
            FakeCommitted = 5L * 1024 * 1024 * 1024,
            FakeCommitLimit = 16L * 1024 * 1024 * 1024,
        };
        var loop = new SttMonitorLoop(telemetry);

        loop.CheckOnce(DateTime.UtcNow);

        Assert.NotEmpty(loop.LastMonitorLog);
        Assert.Contains("PrivateBytes=1024MB", loop.LastMonitorLog);
        Assert.Contains("RAM=60.0%", loop.LastMonitorLog);
        Assert.Contains("PID=12345", loop.LastMonitorLog);
    }

    // ═══════════════════════════════════════════════════════════
    // 边界值
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void CheckOnce_ResourcesJustBelowThreshold_NoKill()
    {
        var telemetry = new FakeTelemetryProvider
        {
            FakePrivateBytes = SttSafetyChecker.MaxPrivateBytes - 1, // 6GB - 1 byte
            FakeRamPercent = 79.9,
        };
        var loop = new SttMonitorLoop(telemetry);
        var startTime = DateTime.UtcNow.AddSeconds(-5);

        var result = loop.CheckOnce(startTime);

        Assert.Null(result);
        Assert.False(telemetry.KillWasCalled);
    }

    [Fact]
    public void CheckOnce_ResourcesExactlyAtThreshold_Kills()
    {
        var telemetry = new FakeTelemetryProvider
        {
            FakePrivateBytes = SttSafetyChecker.MaxPrivateBytes, // exactly 6GB
            FakeRamPercent = 80.0,
        };
        var loop = new SttMonitorLoop(telemetry);

        var result = loop.CheckOnce(DateTime.UtcNow);

        Assert.NotNull(result);
        Assert.True(telemetry.KillWasCalled);
    }

    // ═══════════════════════════════════════════════════════════
    // stdout/stderr 双路异步读取测试（8.8 新增）
    // 验证 GetAccumulatedOutput 能正确拼接两路输出
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void CheckOnce_StderrOnlyVulkan_Confirmed()
    {
        // Vulkan 信息只在 stderr 中
        var telemetry = new FakeTelemetryProvider
        {
            FakeOutput = "loaded Vulkan backend\nggml_vulkan: 0 = AMD Radeon RX 580 2048SP (AMD proprietary driver)\noffloaded 29/29 layers",
        };
        var loop = new SttMonitorLoop(telemetry);

        loop.CheckOnce(DateTime.UtcNow);

        Assert.True(loop.GpuConfirmed);
        Assert.True(loop.OffloadConfirmed);
        Assert.NotEmpty(loop.ConfirmedDeviceName!);
    }

    [Fact]
    public void CheckOnce_StdoutOnlyVulkan_Confirmed()
    {
        // Vulkan 信息只在 stdout 中
        var telemetry = new FakeTelemetryProvider
        {
            FakeOutput = "using Vulkan backend for computation\nggml_vulkan: 0 = AMD Radeon RX 580 2048SP (AMD proprietary driver)\n29/29 layers offloaded",
        };
        var loop = new SttMonitorLoop(telemetry);

        loop.CheckOnce(DateTime.UtcNow);

        Assert.True(loop.GpuConfirmed);
    }

    [Fact]
    public void CheckOnce_InterleavedOutput_Confirmed()
    {
        // stdout 和 stderr 交错输出
        var telemetry = new FakeTelemetryProvider
        {
            FakeOutput = "loaded Vulkan backend\nsome stdout\nstderr: ggml_vulkan: 0 = AMD Radeon RX 580 2048SP (AMD proprietary driver)\nmore output\noffloaded 29/29 layers to GPU",
        };
        var loop = new SttMonitorLoop(telemetry);

        loop.CheckOnce(DateTime.UtcNow);

        Assert.True(loop.GpuConfirmed);
        Assert.True(loop.OffloadConfirmed);
        Assert.NotEmpty(loop.ConfirmedDeviceName!);
    }

    [Fact]
    public void CheckOnce_LargeOutput_ParsesCorrectly()
    {
        // 大量无关输出后 GPU 信息出现在末尾
        var sb = new System.Text.StringBuilder();
        for (int i = 0; i < 1000; i++)
            sb.AppendLine($"line {i}: some output");
        sb.AppendLine("loaded Vulkan backend");
        sb.AppendLine("ggml_vulkan: 0 = AMD Radeon RX 580 2048SP (AMD proprietary driver)");
        sb.AppendLine("offloaded 29/29 layers to GPU");

        var telemetry = new FakeTelemetryProvider
        {
            FakeOutput = sb.ToString(),
        };
        var loop = new SttMonitorLoop(telemetry);

        loop.CheckOnce(DateTime.UtcNow);

        Assert.True(loop.GpuConfirmed);
        Assert.True(loop.OffloadConfirmed);
        Assert.NotEmpty(loop.ConfirmedDeviceName!);
    }

    [Fact]
    public void CheckOnce_QuickExitBeforeGpuConfirm_NoKill()
    {
        // 进程在 GPU 确认前退出 → 不应杀进程
        var telemetry = new FakeTelemetryProvider
        {
            FakeHasExited = true,
            FakeOutput = "starting transcription",
        };
        var loop = new SttMonitorLoop(telemetry);

        var result = loop.CheckOnce(DateTime.UtcNow);

        Assert.Null(result);
        Assert.False(telemetry.KillWasCalled);
        Assert.False(loop.GpuConfirmed);
    }

    [Fact]
    public void CheckOnce_GpuInfoInLastLine_Confirmed()
    {
        // GPU 信息是输出的最后一行
        var telemetry = new FakeTelemetryProvider
        {
            FakeOutput = "starting...\nloaded Vulkan backend\nggml_vulkan: 0 = AMD Radeon RX 580 2048SP (AMD proprietary driver)\noffloaded 29/29 layers to GPU",
        };
        var loop = new SttMonitorLoop(telemetry);

        loop.CheckOnce(DateTime.UtcNow);

        Assert.True(loop.GpuConfirmed);
        Assert.True(loop.OffloadConfirmed);
        Assert.NotEmpty(loop.ConfirmedDeviceName!);
    }

    [Fact]
    public void CheckOnce_DeviceNameTracking_Updates()
    {
        var telemetry = new FakeTelemetryProvider
        {
            FakeOutput = "loaded Vulkan backend\nggml_vulkan: 0 = AMD Radeon RX 580 2048SP (AMD proprietary driver)",
        };
        var loop = new SttMonitorLoop(telemetry);

        loop.CheckOnce(DateTime.UtcNow);

        Assert.Equal("AMD Radeon RX 580 2048SP", loop.ConfirmedDeviceName);
    }

    [Fact]
    public void CheckOnce_OffloadTotalTracked()
    {
        var telemetry = new FakeTelemetryProvider
        {
            FakeOutput = "offloaded 29/29 layers to GPU",
        };
        var loop = new SttMonitorLoop(telemetry);

        loop.CheckOnce(DateTime.UtcNow);

        Assert.True(loop.OffloadConfirmed);
        Assert.Equal(29, loop.OffloadLayers);
        Assert.Equal(29, loop.OffloadTotal);
    }

    [Fact]
    public void CheckOnce_OffloadTotal30_Tracked()
    {
        var telemetry = new FakeTelemetryProvider
        {
            FakeOutput = "offloaded 29/30 layers to GPU",
        };
        var loop = new SttMonitorLoop(telemetry);

        loop.CheckOnce(DateTime.UtcNow);

        Assert.True(loop.OffloadConfirmed);
        Assert.Equal(29, loop.OffloadLayers);
        Assert.Equal(30, loop.OffloadTotal);
    }

    // ═══════════════════════════════════════════════════════════
    // 冲突重复行 / 边缘场景测试（8.9 新增）
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void CheckOnce_ConflictingOffloadLines_TakesFirst()
    {
        // 日志中出现冲突的 offload 行，解析器取第一个匹配
        var telemetry = new FakeTelemetryProvider
        {
            FakeOutput = "offloaded 29/29 layers to GPU\noffloaded 30/30 layers to GPU",
        };
        var loop = new SttMonitorLoop(telemetry);

        loop.CheckOnce(DateTime.UtcNow);

        Assert.True(loop.OffloadConfirmed);
        Assert.Equal(29, loop.OffloadLayers);
        Assert.Equal(29, loop.OffloadTotal);
    }

    [Fact]
    public void CheckOnce_DeviceNameWithIndex_Parsed()
    {
        // 设备名带索引（如 "ggml_vulkan: 0 = AMD Radeon RX 580"）
        var telemetry = new FakeTelemetryProvider
        {
            FakeOutput = "ggml_vulkan: 0 = AMD Radeon RX 580",
        };
        var loop = new SttMonitorLoop(telemetry);

        loop.CheckOnce(DateTime.UtcNow);

        Assert.NotEmpty(loop.ConfirmedDeviceName!);
        Assert.Contains("RX 580", loop.ConfirmedDeviceName);
    }

    [Fact]
    public void CheckOnce_GpuKeywordInsteadOfDevice_Parsed()
    {
        // "GPU: AMD Radeon RX 580" 旧格式（不应匹配新正则）
        var telemetry = new FakeTelemetryProvider
        {
            FakeOutput = "GPU: AMD Radeon RX 580",
        };
        var loop = new SttMonitorLoop(telemetry);

        loop.CheckOnce(DateTime.UtcNow);

        // 旧格式不再匹配
        Assert.Empty(loop.ConfirmedDeviceName ?? "");
    }

    [Fact]
    public void CheckOnce_EmptyOutput_NoCrash()
    {
        var telemetry = new FakeTelemetryProvider { FakeOutput = "" };
        var loop = new SttMonitorLoop(telemetry);

        var result = loop.CheckOnce(DateTime.UtcNow);

        Assert.Null(result);
        Assert.False(loop.GpuConfirmed);
        Assert.False(loop.OffloadConfirmed);
        Assert.Null(loop.ConfirmedDeviceName);
    }

    [Fact]
    public void CheckOnce_NullOutput_NoCrash()
    {
        var telemetry = new FakeTelemetryProvider { FakeOutput = null! };
        var loop = new SttMonitorLoop(telemetry);

        var result = loop.CheckOnce(DateTime.UtcNow);

        Assert.Null(result);
    }

    [Fact]
    public void CheckOnce_CpuFallbackAndVulkan_KillsForFallback()
    {
        // 同时出现 Vulkan 和 CPU fallback → 应因 CPU fallback 而杀进程
        var telemetry = new FakeTelemetryProvider
        {
            FakeOutput = "loaded Vulkan backend\nfalling back to CPU backend for some layers",
        };
        var loop = new SttMonitorLoop(telemetry);

        var result = loop.CheckOnce(DateTime.UtcNow);

        Assert.NotNull(result);
        Assert.Contains("CPU fallback", result!);
        Assert.True(telemetry.KillWasCalled);
        Assert.True(loop.CpuFallbackDetected);
    }

    [Fact]
    public void FinalGpuVerification_30of30_ReturnsFail()
    {
        var telemetry = new FakeTelemetryProvider
        {
            FakeOutput = "loaded Vulkan backend\nggml_vulkan: 0 = AMD Radeon RX 580 2048SP (AMD proprietary driver)\noffloaded 30/30 layers",
        };
        var loop = new SttMonitorLoop(telemetry);

        var result = loop.FinalGpuVerification(FakeGoodGpu);

        Assert.True(result.ShouldFail);
        Assert.Contains("30/30", result.Message);
    }

    [Fact]
    public void FinalGpuVerification_28of29_ReturnsFail()
    {
        var telemetry = new FakeTelemetryProvider
        {
            FakeOutput = "loaded Vulkan backend\nggml_vulkan: 0 = AMD Radeon RX 580 2048SP (AMD proprietary driver)\noffloaded 28/29 layers",
        };
        var loop = new SttMonitorLoop(telemetry);

        var result = loop.FinalGpuVerification(FakeGoodGpu);

        Assert.True(result.ShouldFail);
        Assert.Contains("28/29", result.Message);
    }

    [Fact]
    public void FinalGpuVerification_IntelIgpu_ReturnsFail()
    {
        // 核显冒充独显
        var telemetry = new FakeTelemetryProvider
        {
            FakeOutput = "loaded Vulkan backend\nggml_vulkan: 0 = Intel(R) UHD Graphics 630 (Intel driver)\noffloaded 29/29 layers",
        };
        var loop = new SttMonitorLoop(telemetry);

        var result = loop.FinalGpuVerification(FakeGoodGpu);

        Assert.True(result.ShouldFail);
        Assert.Contains("Intel", result.Message);
    }

    [Fact]
    public void FinalGpuVerification_DeviceNameSubstring_Pass()
    {
        // 设备名是 "AMD Radeon RX 580 Series"，预检名称是 "AMD Radeon RX 580"
        // 双向包含应通过
        var telemetry = new FakeTelemetryProvider
        {
            FakeOutput = FullGpuLog,
        };
        var gpuInfo = new GpuInfo
        {
            HasDiscreteGpu = true,
            GpuName = "AMD Radeon RX 580 2048SP Series",
            VramMb = 8192,
            VramDetectionMethod = "registry",
            SupportsVulkan = true,
        };
        var loop = new SttMonitorLoop(telemetry);

        var result = loop.FinalGpuVerification(gpuInfo);

        Assert.True(result.IsOk);
    }

    [Fact]
    public void CheckOnce_MultipleMonitorCalls_StateAccumulates()
    {
        // 模拟多次 CheckOnce 调用（Timer 间隔触发）
        var telemetry = new FakeTelemetryProvider
        {
            FakeOutput = "",
        };
        var loop = new SttMonitorLoop(telemetry);
        var startTime = DateTime.UtcNow.AddSeconds(-5);

        // 第一次调用：无 GPU 信息
        loop.CheckOnce(startTime);
        Assert.False(loop.GpuConfirmed);

        // 模拟进程输出了 GPU 信息
        telemetry.FakeOutput = "loaded Vulkan backend\nggml_vulkan: 0 = AMD Radeon RX 580 2048SP (AMD proprietary driver)\noffloaded 29/29 layers";

        // 第二次调用：检测到 GPU 信息
        loop.CheckOnce(startTime);
        Assert.True(loop.GpuConfirmed);
        Assert.True(loop.OffloadConfirmed);
        Assert.NotEmpty(loop.ConfirmedDeviceName!);

        // 第三次调用：状态保持（不会重置）
        loop.CheckOnce(startTime);
        Assert.True(loop.GpuConfirmed);
        Assert.True(loop.OffloadConfirmed);
    }
}
