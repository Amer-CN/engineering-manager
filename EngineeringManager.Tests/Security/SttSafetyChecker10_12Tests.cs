using EngineeringManager.Api.Services.Stt;
using Xunit;

namespace EngineeringManager.Tests.Security;

/// <summary>
/// 10.12 新增反例测试：GPU 全量 offload 动态层数验证。
/// </summary>
public class SttSafetyChecker10_12Tests
{
    private const int GB = 1024 * 1024 * 1024;

    // ═══════════════════════════════════════════════════════════
    // n_gpu_layers=-1 + block_count 动态验证
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void CheckGpuFailClosed_NGpuLayersMinus1_WithBlockCount28_Pass()
    {
        // n_gpu_layers=-1 + 全部层标记 + block_count=28 → 通过
        var result = SttSafetyChecker.CheckGpuFailClosed(
            hasDiscreteGpu: true, supportsVulkan: true, vramMb: 8192,
            vramDetectionMethod: "registry", vulkanBackendConfirmed: true,
            offloadConfirmed: true, offloadLayers: null, offloadTotal: null,
            confirmedDeviceName: "AMD Radeon RX 580 2048SP", expectedDeviceName: "RX 580",
            nGpuLayers: -1, blockCount: 28, hasAllLayersMarker: true);

        Assert.True(result.IsOk);
        Assert.Contains("n_gpu_layers=-1", result.Message);
        Assert.Contains("block_count=28", result.Message);
    }

    [Fact]
    public void CheckGpuFailClosed_NGpuLayersMinus1_WithoutBlockCount_Fail()
    {
        // n_gpu_layers=-1 + 全部层标记但 block_count 未解析 → fail-closed
        var result = SttSafetyChecker.CheckGpuFailClosed(
            hasDiscreteGpu: true, supportsVulkan: true, vramMb: 8192,
            vramDetectionMethod: "registry", vulkanBackendConfirmed: true,
            offloadConfirmed: true, offloadLayers: null, offloadTotal: null,
            confirmedDeviceName: "AMD Radeon RX 580", expectedDeviceName: "RX 580",
            nGpuLayers: -1, blockCount: null, hasAllLayersMarker: true);

        Assert.True(result.ShouldFail);
        Assert.Contains("block_count 未解析", result.Message);
    }

    [Fact]
    public void CheckGpuFailClosed_NGpuLayersMinus1_WithoutAllLayersMarker_Fail()
    {
        // n_gpu_layers=-1 但没有"全部层"标记 → fail-closed
        var result = SttSafetyChecker.CheckGpuFailClosed(
            hasDiscreteGpu: true, supportsVulkan: true, vramMb: 8192,
            vramDetectionMethod: "registry", vulkanBackendConfirmed: true,
            offloadConfirmed: true, offloadLayers: null, offloadTotal: null,
            confirmedDeviceName: "AMD Radeon RX 580", expectedDeviceName: "RX 580",
            nGpuLayers: -1, blockCount: 28, hasAllLayersMarker: false);

        Assert.True(result.ShouldFail);
        Assert.Contains("fail-closed", result.Message);
    }

    // ═══════════════════════════════════════════════════════════
    // 28/28 显式 N/N + block_count=28 通过
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void CheckGpuFailClosed_28of28_WithBlockCount28_Pass()
    {
        var result = SttSafetyChecker.CheckGpuFailClosed(
            hasDiscreteGpu: true, supportsVulkan: true, vramMb: 8192,
            vramDetectionMethod: "registry", vulkanBackendConfirmed: true,
            offloadConfirmed: true, offloadLayers: 28, offloadTotal: 28,
            confirmedDeviceName: "AMD Radeon RX 580", expectedDeviceName: "RX 580",
            blockCount: 28);

        Assert.True(result.IsOk);
    }

    [Fact]
    public void CheckGpuFailClosed_27of28_WithBlockCount28_Fail()
    {
        var result = SttSafetyChecker.CheckGpuFailClosed(
            hasDiscreteGpu: true, supportsVulkan: true, vramMb: 8192,
            vramDetectionMethod: "registry", vulkanBackendConfirmed: true,
            offloadConfirmed: true, offloadLayers: 27, offloadTotal: 28,
            confirmedDeviceName: "AMD Radeon RX 580", expectedDeviceName: "RX 580",
            blockCount: 28);

        Assert.True(result.ShouldFail);
    }

    [Fact]
    public void CheckGpuFailClosed_29of28_WithBlockCount28_Fail()
    {
        // offload 29 但 block_count=28 → 不匹配 → fail
        var result = SttSafetyChecker.CheckGpuFailClosed(
            hasDiscreteGpu: true, supportsVulkan: true, vramMb: 8192,
            vramDetectionMethod: "registry", vulkanBackendConfirmed: true,
            offloadConfirmed: true, offloadLayers: 29, offloadTotal: 29,
            confirmedDeviceName: "AMD Radeon RX 580", expectedDeviceName: "RX 580",
            blockCount: 28);

        Assert.True(result.ShouldFail);
        Assert.Contains("29", result.Message);
        Assert.Contains("28", result.Message);
    }

    // ═══════════════════════════════════════════════════════════
    // 旧版 29/29 回退（无 block_count）
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void CheckGpuFailClosed_29of29_WithoutBlockCount_Pass()
    {
        // 旧版回退：无 block_count 时 N/N 必须 N==29
        var result = SttSafetyChecker.CheckGpuFailClosed(
            hasDiscreteGpu: true, supportsVulkan: true, vramMb: 8192,
            vramDetectionMethod: "registry", vulkanBackendConfirmed: true,
            offloadConfirmed: true, offloadLayers: 29, offloadTotal: 29,
            confirmedDeviceName: "AMD Radeon RX 580", expectedDeviceName: "RX 580",
            blockCount: null);

        Assert.True(result.IsOk);
    }

    [Fact]
    public void CheckGpuFailClosed_28of28_WithoutBlockCount_Fail()
    {
        // 无 block_count 时 28/28 != 29 → fail
        var result = SttSafetyChecker.CheckGpuFailClosed(
            hasDiscreteGpu: true, supportsVulkan: true, vramMb: 8192,
            vramDetectionMethod: "registry", vulkanBackendConfirmed: true,
            offloadConfirmed: true, offloadLayers: 28, offloadTotal: 28,
            confirmedDeviceName: "AMD Radeon RX 580", expectedDeviceName: "RX 580",
            blockCount: null);

        Assert.True(result.ShouldFail);
        Assert.Contains("28", result.Message);
        Assert.Contains("29", result.Message);
    }

    // ═══════════════════════════════════════════════════════════
    // GpuLogParser 新增解析方法测试
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void TryParseNGpuLayers_Minus1_ReturnsTrue()
    {
        var output = "GPU offload: n_gpu_layers=-1 (全部层)";
        var result = GpuLogParser.TryParseNGpuLayers(output, out var nGpu);

        Assert.True(result);
        Assert.Equal(-1, nGpu);
    }

    [Fact]
    public void TryParseNGpuLayers_Positive29_ReturnsTrue()
    {
        var output = "n_gpu_layers: 29";
        var result = GpuLogParser.TryParseNGpuLayers(output, out var nGpu);

        Assert.True(result);
        Assert.Equal(29, nGpu);
    }

    [Fact]
    public void TryParseNGpuLayers_NotFound_ReturnsFalse()
    {
        var output = "no gpu layers info here";
        var result = GpuLogParser.TryParseNGpuLayers(output, out _);

        Assert.False(result);
    }

    [Fact]
    public void TryParseBlockCount_FromMetadata_ReturnsTrue()
    {
        var output = "qwen3vl.block_count u32 = 28";
        var result = GpuLogParser.TryParseBlockCount(output, out var count);

        Assert.True(result);
        Assert.Equal(28, count);
    }

    [Fact]
    public void TryParseBlockCount_NotFound_ReturnsFalse()
    {
        var output = "no block count info";
        var result = GpuLogParser.TryParseBlockCount(output, out _);

        Assert.False(result);
    }

    [Fact]
    public void HasAllLayersMarker_Chinese_ReturnsTrue()
    {
        // 10.12 收紧：只接受 "n_gpu_layers=-1 (全部层)" 共行格式
        Assert.True(GpuLogParser.HasAllLayersMarker("n_gpu_layers=-1 (全部层)"));
    }

    [Fact]
    public void HasAllLayersMarker_English_ReturnsTrue()
    {
        // 10.12 收紧：只接受 "n_gpu_layers=-1 (all layers)" 共行格式
        Assert.True(GpuLogParser.HasAllLayersMarker("n_gpu_layers=-1 (all layers)"));
    }

    [Fact]
    public void HasAllLayersMarker_IsolatedChinese_ReturnsFalse()
    {
        // 10.12 收紧：孤立的"全部层"不在 n_gpu_layers 行 → 拒绝
        Assert.False(GpuLogParser.HasAllLayersMarker("全部层"));
    }

    [Fact]
    public void HasAllLayersMarker_IsolatedEnglish_ReturnsFalse()
    {
        // 10.12 收紧：孤立的"all layers"不在 n_gpu_layers 行 → 拒绝
        Assert.False(GpuLogParser.HasAllLayersMarker("all layers to GPU"));
    }

    [Fact]
    public void HasAllLayersMarker_ForgeWrapperText_ReturnsFalse()
    {
        // 10.12 收紧：包装器伪造的"全部层" → 拒绝
        Assert.False(GpuLogParser.HasAllLayersMarker("wrapper: all layers confirmed"));
    }

    [Fact]
    public void HasAllLayersMarker_ForgeTestScript_ReturnsFalse()
    {
        // 10.12 收紧：测试脚本伪造的"全部层" → 拒绝
        Assert.False(GpuLogParser.HasAllLayersMarker("test script: n_gpu_layers=29 (全部层)"));
    }

    [Fact]
    public void HasAllLayersMarker_NGpuLayers0_ReturnsFalse()
    {
        // n_gpu_layers=0 (全部层) — 不是 -1 → 拒绝
        Assert.False(GpuLogParser.HasAllLayersMarker("n_gpu_layers=0 (全部层)"));
    }

    // ═══════════════════════════════════════════════════════════
    // 10.11 真实日志集成测试
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void ParseAll_Real1011Log_NGpuLayersAndBlockCountParsed()
    {
        // 使用 10.11 真实日志片段
        var output = @"load_backend: loaded Vulkan backend from ggml-vulkan.dll
ggml_vulkan: 0 = AMD Radeon RX 580 2048SP (AMD proprietary driver)
GPU offload: n_gpu_layers=-1 (全部层)
using device Vulkan0 (AMD Radeon RX 580 2048SP) - 7402 MiB free
qwen3vl.block_count u32 = 28
llama_kv_cache: layer   0: dev = Vulkan0
llama_kv_cache: layer  27: dev = Vulkan0";

        var status = GpuLogParser.ParseAll(output);

        Assert.True(status.VulkanBackendConfirmed);
        Assert.True(status.DeviceNameConfirmed);
        Assert.True(status.NGpuLayersParsed);
        Assert.Equal(-1, status.NGpuLayers);
        Assert.True(status.BlockCountParsed);
        Assert.Equal(28, status.BlockCount);
        Assert.True(status.HasAllLayersMarker);
        Assert.False(status.CpuFallbackDetected);
        Assert.True(status.IsFullyOffloaded);
        Assert.True(status.IsFullyConfirmed);
    }

    [Fact]
    public void ParseAll_Real1011Log_FinalGpuVerification_Pass()
    {
        var output = @"load_backend: loaded Vulkan backend from ggml-vulkan.dll
ggml_vulkan: 0 = AMD Radeon RX 580 2048SP (AMD proprietary driver)
GPU offload: n_gpu_layers=-1 (全部层)
using device Vulkan0 (AMD Radeon RX 580 2048SP) - 7402 MiB free
qwen3vl.block_count u32 = 28
llama_kv_cache: layer   0: dev = Vulkan0
llama_kv_cache: layer  27: dev = Vulkan0";

        var telemetry = new SttMonitorLoopTests.FakeTelemetryProvider { FakeOutput = output };
        var loop = new SttMonitorLoop(telemetry);
        var gpuInfo = new GpuInfo
        {
            HasDiscreteGpu = true,
            GpuName = "AMD Radeon RX 580 2048SP",
            VramMb = 8192,
            VramDetectionMethod = "registry",
            SupportsVulkan = true,
        };

        var result = loop.FinalGpuVerification(gpuInfo);

        Assert.True(result.IsOk);
        Assert.Contains("n_gpu_layers=-1", result.Message);
        Assert.Contains("block_count=28", result.Message);
    }
}
