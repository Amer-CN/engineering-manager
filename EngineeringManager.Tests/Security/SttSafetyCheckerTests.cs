using EngineeringManager.Api.Services.Stt;
using Xunit;

namespace EngineeringManager.Tests.Security;

/// <summary>
/// SttSafetyChecker 纯单元测试：验证资源保险丝和 GPU fail-closed 逻辑。
/// 不依赖真实进程、GPU 或硬件 — 全部使用注入的参数值。
/// </summary>
public class SttSafetyCheckerTests
{
    // ═══════════════════════════════════════════════════════════
    // 资源保险丝：CheckResources
    // ═══════════════════════════════════════════════════════════

    private const long GB = 1024L * 1024 * 1024;

    [Fact]
    public void CheckResources_NormalUsage_ReturnsContinue()
    {
        // 1GB private bytes, 50% RAM, 30% commit, 8GB avail → 正常
        var result = SttSafetyChecker.CheckResources(
            privateBytes: 1 * GB,
            ramUsagePercent: 50.0,
            commitBytes: 4 * GB,
            commitLimitBytes: 16 * GB,
            availableMemoryBytes: 8 * GB);

        Assert.True(result.IsOk);
        Assert.False(result.ShouldKill);
        Assert.Contains("PrivateBytes=1024MB", result.Message);
    }

    [Fact]
    public void CheckResources_PrivateBytesAt6GB_ReturnsKill()
    {
        // Private Bytes = 6GB → 触发杀进程
        var result = SttSafetyChecker.CheckResources(
            privateBytes: SttSafetyChecker.MaxPrivateBytes,
            ramUsagePercent: 50.0,
            commitBytes: 4 * GB,
            commitLimitBytes: 16 * GB,
            availableMemoryBytes: 8 * GB);

        Assert.True(result.ShouldKill);
        Assert.Contains("Private Bytes", result.Message);
        Assert.Contains("6144MB", result.Message);
    }

    [Fact]
    public void CheckResources_PrivateBytesOver6GB_ReturnsKill()
    {
        // Private Bytes = 7GB → 触发杀进程
        var result = SttSafetyChecker.CheckResources(
            privateBytes: 7 * GB,
            ramUsagePercent: 50.0,
            commitBytes: 4 * GB,
            commitLimitBytes: 16 * GB,
            availableMemoryBytes: 8 * GB);

        Assert.True(result.ShouldKill);
        Assert.Contains("7168MB", result.Message);
    }

    [Fact]
    public void CheckResources_RamAt80Percent_ReturnsContinue_OnlyWarning()
    {
        // RAM = 80% → 仅告警，不杀进程（10.6 绝对资源门控变更）
        var result = SttSafetyChecker.CheckResources(
            privateBytes: 1 * GB,
            ramUsagePercent: 80.0,
            commitBytes: 4 * GB,
            commitLimitBytes: 16 * GB,
            availableMemoryBytes: 8 * GB);

        Assert.False(result.ShouldKill); // 不再杀进程
        Assert.True(result.IsOk);          // 返回 Continue
    }

    [Fact]
    public void CheckResources_RamOver80Percent_ReturnsContinue_OnlyWarning()
    {
        // RAM = 85% → 仅告警，不杀进程（10.6 绝对资源门控变更）
        var result = SttSafetyChecker.CheckResources(
            privateBytes: 1 * GB,
            ramUsagePercent: 85.0,
            commitBytes: 4 * GB,
            commitLimitBytes: 16 * GB,
            availableMemoryBytes: 8 * GB);

        Assert.False(result.ShouldKill); // 不再杀进程
        Assert.True(result.IsOk);          // 返回 Continue
    }

    [Fact]
    public void CheckResources_RamJustBelow80Percent_ReturnsContinue()
    {
        // RAM = 79.9% → 不触发告警
        var result = SttSafetyChecker.CheckResources(
            privateBytes: 1 * GB,
            ramUsagePercent: 79.9,
            commitBytes: 4 * GB,
            commitLimitBytes: 16 * GB,
            availableMemoryBytes: 8 * GB);

        Assert.True(result.IsOk);
        Assert.False(result.ShouldKill);
    }

    [Fact]
    public void CheckResources_CommitAt90Percent_ReturnsKill()
    {
        // Commit = 93.75% → 触发杀进程
        var result = SttSafetyChecker.CheckResources(
            privateBytes: 1 * GB,
            ramUsagePercent: 50.0,
            commitBytes: 15 * GB,
            commitLimitBytes: 16 * GB,
            availableMemoryBytes: 8 * GB);

        Assert.True(result.ShouldKill);
        Assert.Contains("Commit", result.Message);
    }

    [Fact]
    public void CheckResources_CommitZeroLimit_DoesNotCrash()
    {
        // commitLimit = 0 → 不崩溃，不因 commit 触发（availableMem 正常时不杀）
        var result = SttSafetyChecker.CheckResources(
            privateBytes: 1 * GB,
            ramUsagePercent: 50.0,
            commitBytes: 0,
            commitLimitBytes: 0,
            availableMemoryBytes: 8 * GB);

        Assert.True(result.IsOk);
    }

    [Fact]
    public void CheckResources_PrivateBytesTakesPriorityOverAvailableMem()
    {
        // PB 超限 + avail 超限 → 应返回 Private Bytes 的消息（先检查）
        var result = SttSafetyChecker.CheckResources(
            privateBytes: 7 * GB,
            ramUsagePercent: 90.0,
            commitBytes: 4 * GB,
            commitLimitBytes: 16 * GB,
            availableMemoryBytes: 1 * GB); // < 2GB

        Assert.True(result.ShouldKill);
        Assert.Contains("Private Bytes", result.Message);
    }

    // ═══════════════════════════════════════════════════════════
    // GPU fail-closed: CheckGpuFailClosed
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void CheckGpuFailClosed_AllConditionsMet_ReturnsPass()
    {
        var result = SttSafetyChecker.CheckGpuFailClosed(
            hasDiscreteGpu: true,
            supportsVulkan: true,
            vramMb: 8192,
            vramDetectionMethod: "registry",
            vulkanBackendConfirmed: true,
            offloadConfirmed: true,
            offloadLayers: 29,
            offloadTotal: 29,
            confirmedDeviceName: "AMD Radeon RX 580",
            expectedDeviceName: "RX 580");

        Assert.True(result.IsOk);
        Assert.Contains("GPU 验证通过", result.Message);
        Assert.Contains("8192MB", result.Message);
        Assert.Contains("29/29", result.Message);
    }

    [Fact]
    public void CheckGpuFailClosed_NoDiscreteGpu_ReturnsFail()
    {
        var result = SttSafetyChecker.CheckGpuFailClosed(
            hasDiscreteGpu: false,
            supportsVulkan: true,
            vramMb: 8192,
            vramDetectionMethod: "registry",
            vulkanBackendConfirmed: true,
            offloadConfirmed: true,
            offloadLayers: 29);

        Assert.True(result.ShouldFail);
        Assert.Contains("未检测到独显", result.Message);
    }

    [Fact]
    public void CheckGpuFailClosed_NoVulkan_ReturnsFail()
    {
        var result = SttSafetyChecker.CheckGpuFailClosed(
            hasDiscreteGpu: true,
            supportsVulkan: false,
            vramMb: 8192,
            vramDetectionMethod: "registry",
            vulkanBackendConfirmed: true,
            offloadConfirmed: true,
            offloadLayers: 29);

        Assert.True(result.ShouldFail);
        Assert.Contains("Vulkan", result.Message);
    }

    [Fact]
    public void CheckGpuFailClosed_VramBelow2GB_ReturnsFail()
    {
        var result = SttSafetyChecker.CheckGpuFailClosed(
            hasDiscreteGpu: true,
            supportsVulkan: true,
            vramMb: 1024,
            vramDetectionMethod: "registry",
            vulkanBackendConfirmed: true,
            offloadConfirmed: true,
            offloadLayers: 29);

        Assert.True(result.ShouldFail);
        Assert.Contains("显存不足", result.Message);
        Assert.Contains("1024MB", result.Message);
    }

    [Fact]
    public void CheckGpuFailClosed_VramFromInference_ReturnsFail()
    {
        // 即使 VRAM 看起来够，如果检测方式是 "inferred"（型号推断），也拒绝
        var result = SttSafetyChecker.CheckGpuFailClosed(
            hasDiscreteGpu: true,
            supportsVulkan: true,
            vramMb: 8192,
            vramDetectionMethod: "inferred",
            vulkanBackendConfirmed: true,
            offloadConfirmed: true,
            offloadLayers: 29);

        Assert.True(result.ShouldFail);
        Assert.Contains("不可靠", result.Message);
        Assert.Contains("inferred", result.Message);
    }

    [Fact]
    public void CheckGpuFailClosed_VramFromUnknown_ReturnsFail()
    {
        var result = SttSafetyChecker.CheckGpuFailClosed(
            hasDiscreteGpu: true,
            supportsVulkan: true,
            vramMb: 8192,
            vramDetectionMethod: "unknown",
            vulkanBackendConfirmed: true,
            offloadConfirmed: true,
            offloadLayers: 29);

        Assert.True(result.ShouldFail);
        Assert.Contains("不可靠", result.Message);
    }

    [Fact]
    public void CheckGpuFailClosed_VulkanNotConfirmed_ReturnsFail()
    {
        var result = SttSafetyChecker.CheckGpuFailClosed(
            hasDiscreteGpu: true,
            supportsVulkan: true,
            vramMb: 8192,
            vramDetectionMethod: "registry",
            vulkanBackendConfirmed: false,
            offloadConfirmed: true,
            offloadLayers: 29);

        Assert.True(result.ShouldFail);
        Assert.Contains("30秒", result.Message);
        Assert.Contains("Vulkan", result.Message);
    }

    [Fact]
    public void CheckGpuFailClosed_OffloadNotConfirmed_ReturnsFail()
    {
        var result = SttSafetyChecker.CheckGpuFailClosed(
            hasDiscreteGpu: true,
            supportsVulkan: true,
            vramMb: 8192,
            vramDetectionMethod: "registry",
            vulkanBackendConfirmed: true,
            offloadConfirmed: false,
            offloadLayers: null);

        Assert.True(result.ShouldFail);
        Assert.Contains("offload", result.Message);
    }

    [Fact]
    public void CheckGpuFailClosed_OffloadLayersBelow29_ReturnsFail()
    {
        var result = SttSafetyChecker.CheckGpuFailClosed(
            hasDiscreteGpu: true,
            supportsVulkan: true,
            vramMb: 8192,
            vramDetectionMethod: "registry",
            vulkanBackendConfirmed: true,
            offloadConfirmed: true,
            offloadLayers: 15);

        Assert.True(result.ShouldFail);
        Assert.Contains("15", result.Message);
        Assert.Contains("fail-closed", result.Message);
    }

    [Fact]
    public void CheckGpuFailClosed_OffloadLayersExactly29of29_ReturnsPass()
    {
        var result = SttSafetyChecker.CheckGpuFailClosed(
            hasDiscreteGpu: true,
            supportsVulkan: true,
            vramMb: 2048,
            vramDetectionMethod: "dxgi",
            vulkanBackendConfirmed: true,
            offloadConfirmed: true,
            offloadLayers: 29,
            offloadTotal: 29,
            confirmedDeviceName: "AMD Radeon RX 580",
            expectedDeviceName: "RX 580");

        Assert.True(result.IsOk);
    }

    [Fact]
    public void CheckGpuFailClosed_VramExactly2GB_ReturnsPass()
    {
        var result = SttSafetyChecker.CheckGpuFailClosed(
            hasDiscreteGpu: true,
            supportsVulkan: true,
            vramMb: 2048,
            vramDetectionMethod: "registry",
            vulkanBackendConfirmed: true,
            offloadConfirmed: true,
            offloadLayers: 29,
            offloadTotal: 29,
            confirmedDeviceName: "AMD Radeon RX 580",
            expectedDeviceName: "RX 580");

        Assert.True(result.IsOk);
    }

    // ═══════════════════════════════════════════════════════════
    // VRAM 检测可靠性: IsVramDetectionReliable
    // ═══════════════════════════════════════════════════════════

    [Theory]
    [InlineData("registry", true)]
    [InlineData("dxgi", true)]
    [InlineData("wmi", false)]
    [InlineData("inferred", false)]
    [InlineData("unknown", false)]
    [InlineData("", false)]
    public void IsVramDetectionReliable_VariousMethods(string method, bool expected)
    {
        Assert.Equal(expected, SttSafetyChecker.IsVramDetectionReliable(method));
    }

    // ═══════════════════════════════════════════════════════════
    // GPU 确认超时: CheckGpuConfirmTimeout
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void CheckGpuConfirmTimeout_AlreadyConfirmed_ReturnsContinue()
    {
        var result = SttSafetyChecker.CheckGpuConfirmTimeout(
            elapsed: TimeSpan.FromSeconds(10),
            gpuConfirmed: true);

        Assert.True(result.IsOk);
        Assert.Contains("已确认", result.Message);
    }

    [Fact]
    public void CheckGpuConfirmTimeout_NotConfirmedUnder30s_ReturnsContinue()
    {
        var result = SttSafetyChecker.CheckGpuConfirmTimeout(
            elapsed: TimeSpan.FromSeconds(25),
            gpuConfirmed: false);

        Assert.True(result.IsOk);
        Assert.Contains("等待中", result.Message);
        Assert.Contains("25", result.Message);
    }

    [Fact]
    public void CheckGpuConfirmTimeout_NotConfirmedAt30s_ReturnsKill()
    {
        var result = SttSafetyChecker.CheckGpuConfirmTimeout(
            elapsed: TimeSpan.FromSeconds(30),
            gpuConfirmed: false);

        Assert.True(result.ShouldKill);
        Assert.Contains("30秒", result.Message);
        Assert.Contains("Vulkan", result.Message);
    }

    [Fact]
    public void CheckGpuConfirmTimeout_NotConfirmedOver30s_ReturnsKill()
    {
        var result = SttSafetyChecker.CheckGpuConfirmTimeout(
            elapsed: TimeSpan.FromSeconds(45),
            gpuConfirmed: false);

        Assert.True(result.ShouldKill);
    }

    // ═══════════════════════════════════════════════════════════
    // 单实例检查: CheckSingleInstance
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void CheckSingleInstance_NotRunning_ReturnsPass()
    {
        var result = SttSafetyChecker.CheckSingleInstance(isRunning: false);
        Assert.True(result.IsOk);
    }

    [Fact]
    public void CheckSingleInstance_AlreadyRunning_ReturnsFail()
    {
        var result = SttSafetyChecker.CheckSingleInstance(isRunning: true);
        Assert.True(result.ShouldFail);
        Assert.Contains("并发", result.Message);
    }

    // ═══════════════════════════════════════════════════════════
    // 边界值
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void CheckResources_PrivateBytesJustBelow6GB_ReturnsContinue()
    {
        // 5.99GB → 不触发
        var result = SttSafetyChecker.CheckResources(
            privateBytes: SttSafetyChecker.MaxPrivateBytes - 1,
            ramUsagePercent: 50.0,
            commitBytes: 4 * GB,
            commitLimitBytes: 16 * GB,
            availableMemoryBytes: 8 * GB);

        Assert.True(result.IsOk);
    }

    [Fact]
    public void CheckResources_ZeroAvailableMemory_ReturnsKill_FailClosed()
    {
        // availableMemory = 0 → fail-closed 杀进程（读取失败=0）
        var result = SttSafetyChecker.CheckResources(
            privateBytes: 1 * GB,
            ramUsagePercent: 50.0,
            commitBytes: 4 * GB,
            commitLimitBytes: 16 * GB,
            availableMemoryBytes: 0);

        Assert.True(result.ShouldKill);
        Assert.Contains("可用物理内存", result.Message);
    }

    [Fact]
    public void CheckGpuFailClosed_OffloadLayersNullButConfirmed_ReturnsFail()
    {
        // offload confirmed but layers not parsed → must FAIL (P0 fix: null = not proven = fail-closed)
        var result = SttSafetyChecker.CheckGpuFailClosed(
            hasDiscreteGpu: true,
            supportsVulkan: true,
            vramMb: 8192,
            vramDetectionMethod: "registry",
            vulkanBackendConfirmed: true,
            offloadConfirmed: true,
            offloadLayers: null);

        Assert.True(result.ShouldFail);
        Assert.Contains("null", result.Message);
        Assert.Contains("fail-closed", result.Message);
    }

    // ═══════════════════════════════════════════════════════════
    // SttSafetyResult 行为验证
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void SttSafetyResult_Continue_IsOk()
    {
        var r = SttSafetyResult.Continue("ok");
        Assert.True(r.IsOk);
        Assert.False(r.ShouldKill);
        Assert.False(r.ShouldFail);
        Assert.Equal("ok", r.Message);
    }

    [Fact]
    public void SttSafetyResult_Kill_NotOk()
    {
        var r = SttSafetyResult.Kill("kill msg");
        Assert.False(r.IsOk);
        Assert.True(r.ShouldKill);
        Assert.Equal("kill msg", r.Message);
    }

    [Fact]
    public void SttSafetyResult_Fail_NotOk()
    {
        var r = SttSafetyResult.Fail("fail msg");
        Assert.False(r.IsOk);
        Assert.True(r.ShouldFail);
        Assert.Equal("fail msg", r.Message);
    }

    [Fact]
    public void SttSafetyResult_Pass_IsOk()
    {
        var r = SttSafetyResult.Pass("pass msg");
        Assert.True(r.IsOk);
        Assert.Equal("pass msg", r.Message);
    }

    [Fact]
    public void SttSafetyResult_ToString_Kill_HasPrefix()
    {
        var r = SttSafetyResult.Kill("test");
        Assert.Contains("[KILL]", r.ToString());
    }

    [Fact]
    public void SttSafetyResult_ToString_Fail_HasPrefix()
    {
        var r = SttSafetyResult.Fail("test");
        Assert.Contains("[FAIL]", r.ToString());
    }

    [Fact]
    public void SttSafetyResult_ToString_Ok_HasPrefix()
    {
        var r = SttSafetyResult.Continue("test");
        Assert.Contains("[OK]", r.ToString());
    }

    // ═══════════════════════════════════════════════════════════
    // 严格 29/29 offload 反例测试（8.8 新增）
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void CheckGpuFailClosed_Offload29of30_ReturnsFail()
    {
        var result = SttSafetyChecker.CheckGpuFailClosed(
            hasDiscreteGpu: true, supportsVulkan: true, vramMb: 8192,
            vramDetectionMethod: "registry", vulkanBackendConfirmed: true,
            offloadConfirmed: true, offloadLayers: 29, offloadTotal: 30,
            confirmedDeviceName: "AMD Radeon RX 580", expectedDeviceName: "RX 580");

        Assert.True(result.ShouldFail);
        Assert.Contains("29/30", result.Message);
    }

    [Fact]
    public void CheckGpuFailClosed_Offload30of29_ReturnsFail()
    {
        var result = SttSafetyChecker.CheckGpuFailClosed(
            hasDiscreteGpu: true, supportsVulkan: true, vramMb: 8192,
            vramDetectionMethod: "registry", vulkanBackendConfirmed: true,
            offloadConfirmed: true, offloadLayers: 30, offloadTotal: 29,
            confirmedDeviceName: "AMD Radeon RX 580", expectedDeviceName: "RX 580");

        Assert.True(result.ShouldFail);
        Assert.Contains("30/29", result.Message);
    }

    [Fact]
    public void CheckGpuFailClosed_Offload30of30_ReturnsFail()
    {
        var result = SttSafetyChecker.CheckGpuFailClosed(
            hasDiscreteGpu: true, supportsVulkan: true, vramMb: 8192,
            vramDetectionMethod: "registry", vulkanBackendConfirmed: true,
            offloadConfirmed: true, offloadLayers: 30, offloadTotal: 30,
            confirmedDeviceName: "AMD Radeon RX 580", expectedDeviceName: "RX 580");

        Assert.True(result.ShouldFail);
        Assert.Contains("30", result.Message);
        Assert.Contains("29", result.Message); // 30 != required 29
    }

    [Fact]
    public void CheckGpuFailClosed_Offload29of29NullTotal_ReturnsFail()
    {
        var result = SttSafetyChecker.CheckGpuFailClosed(
            hasDiscreteGpu: true, supportsVulkan: true, vramMb: 8192,
            vramDetectionMethod: "registry", vulkanBackendConfirmed: true,
            offloadConfirmed: true, offloadLayers: 29, offloadTotal: null,
            confirmedDeviceName: "AMD Radeon RX 580", expectedDeviceName: "RX 580");

        Assert.True(result.ShouldFail);
        Assert.Contains("29/null", result.Message);
    }

    // ═══════════════════════════════════════════════════════════
    // 设备名绑定测试（8.8 新增）
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void CheckGpuFailClosed_DeviceNameMissing_ReturnsFail()
    {
        var result = SttSafetyChecker.CheckGpuFailClosed(
            hasDiscreteGpu: true, supportsVulkan: true, vramMb: 8192,
            vramDetectionMethod: "registry", vulkanBackendConfirmed: true,
            offloadConfirmed: true, offloadLayers: 29, offloadTotal: 29,
            confirmedDeviceName: null, expectedDeviceName: "RX 580");

        Assert.True(result.ShouldFail);
        Assert.Contains("设备名", result.Message);
    }

    [Fact]
    public void CheckGpuFailClosed_DeviceNameEmpty_ReturnsFail()
    {
        var result = SttSafetyChecker.CheckGpuFailClosed(
            hasDiscreteGpu: true, supportsVulkan: true, vramMb: 8192,
            vramDetectionMethod: "registry", vulkanBackendConfirmed: true,
            offloadConfirmed: true, offloadLayers: 29, offloadTotal: 29,
            confirmedDeviceName: "", expectedDeviceName: "RX 580");

        Assert.True(result.ShouldFail);
        Assert.Contains("设备名", result.Message);
    }

    [Fact]
    public void CheckGpuFailClosed_DeviceNameMismatch_ReturnsFail()
    {
        var result = SttSafetyChecker.CheckGpuFailClosed(
            hasDiscreteGpu: true, supportsVulkan: true, vramMb: 8192,
            vramDetectionMethod: "registry", vulkanBackendConfirmed: true,
            offloadConfirmed: true, offloadLayers: 29, offloadTotal: 29,
            confirmedDeviceName: "NVIDIA GeForce GTX 1060", expectedDeviceName: "RX 580");

        Assert.True(result.ShouldFail);
        Assert.Contains("NVIDIA", result.Message);
        Assert.Contains("RX 580", result.Message);
    }

    [Fact]
    public void CheckGpuFailClosed_DeviceNameMatches_ReturnsPass()
    {
        var result = SttSafetyChecker.CheckGpuFailClosed(
            hasDiscreteGpu: true, supportsVulkan: true, vramMb: 8192,
            vramDetectionMethod: "registry", vulkanBackendConfirmed: true,
            offloadConfirmed: true, offloadLayers: 29, offloadTotal: 29,
            confirmedDeviceName: "AMD Radeon RX 580 Series", expectedDeviceName: "RX 580");

        Assert.True(result.IsOk);
    }

    [Fact]
    public void CheckGpuFailClosed_DeviceNameNoExpected_ReturnsPass()
    {
        // expectedDeviceName 为空时不做绑定校验（兼容未设置场景）
        var result = SttSafetyChecker.CheckGpuFailClosed(
            hasDiscreteGpu: true, supportsVulkan: true, vramMb: 8192,
            vramDetectionMethod: "registry", vulkanBackendConfirmed: true,
            offloadConfirmed: true, offloadLayers: 29, offloadTotal: 29,
            confirmedDeviceName: "AMD Radeon RX 580", expectedDeviceName: "");

        Assert.True(result.IsOk);
    }

    [Fact]
    public void CheckGpuFailClosed_IntelIgpuDeviceName_ReturnsFail()
    {
        // 核显冒充独显场景
        var result = SttSafetyChecker.CheckGpuFailClosed(
            hasDiscreteGpu: true, supportsVulkan: true, vramMb: 8192,
            vramDetectionMethod: "registry", vulkanBackendConfirmed: true,
            offloadConfirmed: true, offloadLayers: 29, offloadTotal: 29,
            confirmedDeviceName: "Intel(R) UHD Graphics 630", expectedDeviceName: "RX 580");

        Assert.True(result.ShouldFail);
        Assert.Contains("Intel", result.Message);
    }

    // ═══════════════════════════════════════════════════════════
    // IsGpuNameMatch 规范化匹配测试（8.10 新增）
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void IsGpuNameMatch_ExactMatch_ReturnsTrue()
    {
        Assert.True(SttEngineSelector.IsGpuNameMatch("AMD Radeon RX 580", "AMD Radeon RX 580"));
    }

    [Fact]
    public void IsGpuNameMatch_CaseInsensitive_ReturnsTrue()
    {
        Assert.True(SttEngineSelector.IsGpuNameMatch("amd radeon rx 580", "AMD Radeon RX 580"));
    }

    [Fact]
    public void IsGpuNameMatch_ParenthesesStripped_ReturnsTrue()
    {
        // WMI: "AMD Radeon RX 580" vs Registry: "AMD Radeon RX 580 (8192 MB)"
        Assert.True(SttEngineSelector.IsGpuNameMatch("AMD Radeon RX 580", "AMD Radeon RX 580 (8192 MB)"));
    }

    [Fact]
    public void IsGpuNameMatch_ExtraSpaces_ReturnsTrue()
    {
        Assert.True(SttEngineSelector.IsGpuNameMatch("AMD  Radeon   RX  580", "AMD Radeon RX 580"));
    }

    [Fact]
    public void IsGpuNameMatch_Substring_ReturnsTrue()
    {
        // "AMD Radeon RX 580" is a substring of "AMD Radeon RX 580 Series"
        Assert.True(SttEngineSelector.IsGpuNameMatch("AMD Radeon RX 580", "AMD Radeon RX 580 Series"));
    }

    [Fact]
    public void IsGpuNameMatch_RX570_vs_RX580_ReturnsFalse()
    {
        Assert.False(SttEngineSelector.IsGpuNameMatch("AMD Radeon RX 570", "AMD Radeon RX 580"));
    }

    [Fact]
    public void IsGpuNameMatch_RX590_vs_RX580_ReturnsFalse()
    {
        Assert.False(SttEngineSelector.IsGpuNameMatch("AMD Radeon RX 590", "AMD Radeon RX 580"));
    }

    [Fact]
    public void IsGpuNameMatch_Intel_vs_AMD_ReturnsFalse()
    {
        Assert.False(SttEngineSelector.IsGpuNameMatch("Intel(R) UHD Graphics 630", "AMD Radeon RX 580"));
    }

    [Fact]
    public void IsGpuNameMatch_NVIDIA_vs_AMD_ReturnsFalse()
    {
        Assert.False(SttEngineSelector.IsGpuNameMatch("NVIDIA GeForce GTX 1060", "AMD Radeon RX 580"));
    }

    [Fact]
    public void IsGpuNameMatch_NVIDIA_vs_NVIDIA_ReturnsTrue()
    {
        Assert.True(SttEngineSelector.IsGpuNameMatch("NVIDIA GeForce GTX 1060", "NVIDIA GeForce GTX 1060"));
    }

    [Fact]
    public void IsGpuNameMatch_EmptyName1_ReturnsFalse()
    {
        Assert.False(SttEngineSelector.IsGpuNameMatch("", "AMD Radeon RX 580"));
    }

    [Fact]
    public void IsGpuNameMatch_EmptyName2_ReturnsFalse()
    {
        Assert.False(SttEngineSelector.IsGpuNameMatch("AMD Radeon RX 580", ""));
    }

    [Fact]
    public void IsGpuNameMatch_BothEmpty_ReturnsFalse()
    {
        Assert.False(SttEngineSelector.IsGpuNameMatch("", ""));
    }

    [Fact]
    public void IsGpuNameMatch_NullName1_ReturnsFalse()
    {
        Assert.False(SttEngineSelector.IsGpuNameMatch(null!, "AMD Radeon RX 580"));
    }

    [Fact]
    public void IsGpuNameMatch_SimilarButDifferent_ReturnsFalse()
    {
        // RX 580 vs RX Vega 56 — 都有 "RX" 但型号完全不同
        Assert.False(SttEngineSelector.IsGpuNameMatch("AMD Radeon RX 580", "AMD Radeon RX Vega 56"));
    }

    [Fact]
    public void IsGpuNameMatch_GTX1060_vs_GTX1070_ReturnsFalse()
    {
        Assert.False(SttEngineSelector.IsGpuNameMatch("NVIDIA GeForce GTX 1060", "NVIDIA GeForce GTX 1070"));
    }

    [Fact]
    public void IsGpuNameMatch_RadeonVega_vs_RX580_ReturnsFalse()
    {
        // 核显 vs 独显
        Assert.False(SttEngineSelector.IsGpuNameMatch("AMD Radeon Vega 8 Graphics", "AMD Radeon RX 580"));
    }

    // ═══════════════════════════════════════════════════════════
    // 多 GPU 场景设备名绑定测试（8.10 新增）
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void CheckGpuFailClosed_MultiGpu_NVIDIADeviceName_ReturnsFail()
    {
        // 系统：Intel 核显 + NVIDIA 独显 + RX 580
        // 运行时日志显示 NVIDIA 设备名 → 与预检 RX 580 不匹配
        var result = SttSafetyChecker.CheckGpuFailClosed(
            hasDiscreteGpu: true, supportsVulkan: true, vramMb: 8192,
            vramDetectionMethod: "registry", vulkanBackendConfirmed: true,
            offloadConfirmed: true, offloadLayers: 29, offloadTotal: 29,
            confirmedDeviceName: "NVIDIA GeForce GTX 1060 6GB",
            expectedDeviceName: "AMD Radeon RX 580");

        Assert.True(result.ShouldFail);
        Assert.Contains("NVIDIA", result.Message);
        Assert.Contains("RX 580", result.Message);
    }

    [Fact]
    public void CheckGpuFailClosed_MultiGpu_IntelDeviceName_ReturnsFail()
    {
        // 核显冒充
        var result = SttSafetyChecker.CheckGpuFailClosed(
            hasDiscreteGpu: true, supportsVulkan: true, vramMb: 8192,
            vramDetectionMethod: "registry", vulkanBackendConfirmed: true,
            offloadConfirmed: true, offloadLayers: 29, offloadTotal: 29,
            confirmedDeviceName: "Intel(R) Iris(R) Xe Graphics",
            expectedDeviceName: "AMD Radeon RX 580");

        Assert.True(result.ShouldFail);
        Assert.Contains("Intel", result.Message);
    }

    [Fact]
    public void CheckGpuFailClosed_MultiGpu_RX570_ReturnsFail()
    {
        // 相似型号 RX 570 冒充 RX 580
        var result = SttSafetyChecker.CheckGpuFailClosed(
            hasDiscreteGpu: true, supportsVulkan: true, vramMb: 8192,
            vramDetectionMethod: "registry", vulkanBackendConfirmed: true,
            offloadConfirmed: true, offloadLayers: 29, offloadTotal: 29,
            confirmedDeviceName: "AMD Radeon RX 570",
            expectedDeviceName: "AMD Radeon RX 580");

        Assert.True(result.ShouldFail);
        Assert.Contains("RX 570", result.Message);
    }

    [Fact]
    public void CheckGpuFailClosed_MultiGpu_RX580WithSeries_ReturnsPass()
    {
        // 设备名 "AMD Radeon RX 580 Series" 与预检 "AMD Radeon RX 580" 匹配
        var result = SttSafetyChecker.CheckGpuFailClosed(
            hasDiscreteGpu: true, supportsVulkan: true, vramMb: 8192,
            vramDetectionMethod: "registry", vulkanBackendConfirmed: true,
            offloadConfirmed: true, offloadLayers: 29, offloadTotal: 29,
            confirmedDeviceName: "AMD Radeon RX 580 Series",
            expectedDeviceName: "AMD Radeon RX 580");

        Assert.True(result.IsOk);
    }

    [Fact]
    public void CheckGpuFailClosed_DeviceNameWithParens_ReturnsPass()
    {
        // 注册表 DriverDesc 带括号信息
        var result = SttSafetyChecker.CheckGpuFailClosed(
            hasDiscreteGpu: true, supportsVulkan: true, vramMb: 8192,
            vramDetectionMethod: "registry", vulkanBackendConfirmed: true,
            offloadConfirmed: true, offloadLayers: 29, offloadTotal: 29,
            confirmedDeviceName: "AMD Radeon RX 580 (8192 MB)",
            expectedDeviceName: "AMD Radeon RX 580");

        Assert.True(result.IsOk);
    }

    // ═══════════════════════════════════════════════════════════
    // SelectAdapterVram 纯函数测试（8.11 新增）
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void SelectAdapterVram_SingleMatch_ReturnsVram()
    {
        var adapters = new List<AdapterRecord>
        {
            new("AMD Radeon RX 580", 8L * 1024 * 1024 * 1024, null),
        };

        var (vram, method) = SttEngineSelector.SelectAdapterVram(adapters, "AMD Radeon RX 580");

        Assert.Equal(8192, vram);
        Assert.Equal("registry", method);
    }

    [Fact]
    public void SelectAdapterVram_MultiGpu_MatchesCorrectAdapter()
    {
        // 系统：Intel 核显 128MB + NVIDIA 6GB + AMD RX 580 8GB
        var adapters = new List<AdapterRecord>
        {
            new("Intel(R) UHD Graphics 630", 128L * 1024 * 1024, null),
            new("NVIDIA GeForce GTX 1060", 6L * 1024 * 1024 * 1024, null),
            new("AMD Radeon RX 580", 8L * 1024 * 1024 * 1024, null),
        };

        var (vram, method) = SttEngineSelector.SelectAdapterVram(adapters, "AMD Radeon RX 580");

        Assert.Equal(8192, vram);
        Assert.Equal("registry", method);
    }

    [Fact]
    public void SelectAdapterVram_NoMatch_ReturnsUnknown()
    {
        // 没有 RX 580，只有 NVIDIA
        var adapters = new List<AdapterRecord>
        {
            new("NVIDIA GeForce GTX 1060", 6L * 1024 * 1024 * 1024, null),
        };

        var (vram, method) = SttEngineSelector.SelectAdapterVram(adapters, "AMD Radeon RX 580");

        Assert.Equal(0, vram);
        Assert.Equal("unknown", method);
    }

    [Fact]
    public void SelectAdapterVram_NoMatch_DoesNotFallbackToMax()
    {
        // 即使有更大的 VRAM 适配器，无匹配也不回退
        var adapters = new List<AdapterRecord>
        {
            new("NVIDIA GeForce RTX 4090", 24L * 1024 * 1024 * 1024, null),
        };

        var (vram, method) = SttEngineSelector.SelectAdapterVram(adapters, "AMD Radeon RX 580");

        Assert.Equal(0, vram);
        Assert.Equal("unknown", method);
    }

    [Fact]
    public void SelectAdapterVram_EmptyDriverDesc_Skipped()
    {
        var adapters = new List<AdapterRecord>
        {
            new("", 8L * 1024 * 1024 * 1024, null),
            new("AMD Radeon RX 580", 8L * 1024 * 1024 * 1024, null),
        };

        var (vram, method) = SttEngineSelector.SelectAdapterVram(adapters, "AMD Radeon RX 580");

        Assert.Equal(8192, vram);
        Assert.Equal("registry", method);
    }

    [Fact]
    public void SelectAdapterVram_NullDriverDesc_Skipped()
    {
        var adapters = new List<AdapterRecord>
        {
            new(null!, 8L * 1024 * 1024 * 1024, null),
            new("AMD Radeon RX 580", 8L * 1024 * 1024 * 1024, null),
        };

        var (vram, method) = SttEngineSelector.SelectAdapterVram(adapters, "AMD Radeon RX 580");

        Assert.Equal(8192, vram);
        Assert.Equal("registry", method);
    }

    [Fact]
    public void SelectAdapterVram_InvalidQword_FallsBackToDword()
    {
        // QWORD 为 0 或负数 → 退化到 DWORD（1GB）
        var adapters = new List<AdapterRecord>
        {
            new("AMD Radeon RX 580", 0, 1 * 1024 * 1024 * 1024),
        };

        var (vram, method) = SttEngineSelector.SelectAdapterVram(adapters, "AMD Radeon RX 580");

        Assert.Equal(1024, vram);
        Assert.Equal("registry", method);
    }

    [Fact]
    public void SelectAdapterVram_NullQword_UsesDword()
    {
        var adapters = new List<AdapterRecord>
        {
            new("AMD Radeon RX 580", null, 1 * 1024 * 1024 * 1024),
        };

        var (vram, method) = SttEngineSelector.SelectAdapterVram(adapters, "AMD Radeon RX 580");

        Assert.Equal(1024, vram);
        Assert.Equal("registry", method);
    }

    [Fact]
    public void SelectAdapterVram_BothQwordAndDwordNull_Skipped()
    {
        var adapters = new List<AdapterRecord>
        {
            new("AMD Radeon RX 580", null, null),
        };

        var (vram, method) = SttEngineSelector.SelectAdapterVram(adapters, "AMD Radeon RX 580");

        Assert.Equal(0, vram);
        Assert.Equal("unknown", method);
    }

    [Fact]
    public void SelectAdapterVram_NegativeQword_Skipped()
    {
        var adapters = new List<AdapterRecord>
        {
            new("AMD Radeon RX 580", -1, null),
        };

        var (vram, method) = SttEngineSelector.SelectAdapterVram(adapters, "AMD Radeon RX 580");

        Assert.Equal(0, vram);
        Assert.Equal("unknown", method);
    }

    [Fact]
    public void SelectAdapterVram_EmptyAdapterList_ReturnsUnknown()
    {
        var (vram, method) = SttEngineSelector.SelectAdapterVram(
            new List<AdapterRecord>(), "AMD Radeon RX 580");

        Assert.Equal(0, vram);
        Assert.Equal("unknown", method);
    }

    [Fact]
    public void SelectAdapterVram_NullAdapterList_ReturnsUnknown()
    {
        var (vram, method) = SttEngineSelector.SelectAdapterVram(
            null!, "AMD Radeon RX 580");

        Assert.Equal(0, vram);
        Assert.Equal("unknown", method);
    }

    [Fact]
    public void SelectAdapterVram_EmptyGpuName_ReturnsUnknown()
    {
        var adapters = new List<AdapterRecord>
        {
            new("AMD Radeon RX 580", 8L * 1024 * 1024 * 1024, null),
        };

        var (vram, method) = SttEngineSelector.SelectAdapterVram(adapters, "");

        Assert.Equal(0, vram);
        Assert.Equal("unknown", method);
    }

    [Fact]
    public void SelectAdapterVram_MultipleMatchingTakesLast()
    {
        // 多个匹配项（不太可能但需要定义行为）→ 取最后一个匹配
        var adapters = new List<AdapterRecord>
        {
            new("AMD Radeon RX 580", 4L * 1024 * 1024 * 1024, null),
            new("AMD Radeon RX 580", 8L * 1024 * 1024 * 1024, null),
        };

        var (vram, method) = SttEngineSelector.SelectAdapterVram(adapters, "AMD Radeon RX 580");

        Assert.Equal(8192, vram);
        Assert.Equal("registry", method);
    }

    [Fact]
    public void SelectAdapterVram_DwordOnly_LessThan4GB()
    {
        // DWORD 场景：1GB 显卡报告为 1024MB（DWORD 有效范围）
        var adapters = new List<AdapterRecord>
        {
            new("AMD Radeon RX 580", null, 1 * 1024 * 1024 * 1024),
        };

        var (vram, _) = SttEngineSelector.SelectAdapterVram(adapters, "AMD Radeon RX 580");

        Assert.Equal(1024, vram);
    }

    [Fact]
    public void SelectAdapterVram_DwordOverflow_ReturnsSmallValue()
    {
        // WMI uint32 溢出：8GB → 0（注册表 DWORD 也会溢出）
        // 这种情况下 QWORD 应该有值，但如果 QWORD 缺失且 DWORD 溢出为 0，应跳过
        var adapters = new List<AdapterRecord>
        {
            new("AMD Radeon RX 580", null, 0), // DWORD 溢出为 0
        };

        var (vram, method) = SttEngineSelector.SelectAdapterVram(adapters, "AMD Radeon RX 580");

        Assert.Equal(0, vram);
        Assert.Equal("unknown", method);
    }

    // ═══════════════════════════════════════════════════════════
    // CPU fallback 规则修正测试（9.1 新增）
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void CpuFallback_LoadedCpuBackend_AloneNotFallback()
    {
        // "loaded CPU backend" 单独出现不等于 fallback
        var output = "load_backend: loaded CPU backend from ggml-cpu-haswell.dll";
        Assert.False(GpuLogParser.TryParseCpuFallback(output));
    }

    [Fact]
    public void CpuFallback_LoadedCpuBackend_WithVulkan_29of29_NotFallback()
    {
        // CPU 辅助 backend + Vulkan + 29/29 = 正常运行，不是 fallback
        var output = @"load_backend: loaded CPU backend from ggml-cpu-haswell.dll
load_backend: loaded Vulkan backend from ggml-vulkan.dll
load_tensors: offloaded 29/29 layers to GPU";
        Assert.False(GpuLogParser.TryParseCpuFallback(output));
    }

    [Fact]
    public void CpuFallback_FallingBackToCpu_IsFallback()
    {
        var output = "falling back to CPU backend";
        Assert.True(GpuLogParser.TryParseCpuFallback(output));
    }

    [Fact]
    public void CpuFallback_FallbackToCpu_IsFallback()
    {
        var output = "fallback to CPU";
        Assert.True(GpuLogParser.TryParseCpuFallback(output));
    }

    [Fact]
    public void CpuFallback_NoSuitableGpu_IsFallback()
    {
        var output = "no suitable GPU found";
        Assert.True(GpuLogParser.TryParseCpuFallback(output));
    }

    [Fact]
    public void CpuFallback_CpuOnlyMode_IsFallback()
    {
        var output = "CPU only mode";
        Assert.True(GpuLogParser.TryParseCpuFallback(output));
    }

    [Fact]
    public void CpuFallback_ZeroLayersToGpu_IsFallback()
    {
        var output = "offloaded 0/29 layers to GPU";
        Assert.True(GpuLogParser.TryParseCpuFallback(output));
    }

    [Fact]
    public void CpuFallback_29of29Layers_NotFallback()
    {
        // 29/29 层 offload 到 GPU，即使有 CPU backend 也不是 fallback
        var output = @"load_backend: loaded CPU backend from ggml-cpu-haswell.dll
load_backend: loaded Vulkan backend from ggml-vulkan.dll
load_tensors: offloaded 29/29 layers to GPU";
        var status = GpuLogParser.ParseAll(output);
        Assert.False(status.CpuFallbackDetected);
        Assert.True(status.OffloadLayersConfirmed);
        Assert.Equal(29, status.OffloadLayers);
        Assert.Equal(29, status.OffloadTotal);
    }

    [Fact]
    public void CpuFallback_RealLogFrom9_0_NotFallback()
    {
        // 使用 9.0 实测日志验证：CPU backend + Vulkan + 29/29 = 通过
        var output = @"2026-07-14 10:56:12,081 - load_backend: loaded RPC backend from ggml-rpc.dll
2026-07-14 10:56:12,122 - ggml_vulkan: 0 = AMD Radeon RX 580 2048SP (AMD proprietary driver)
2026-07-14 10:56:12,122 - load_backend: loaded Vulkan backend from ggml-vulkan.dll
2026-07-14 10:56:12,143 - load_backend: loaded CPU backend from ggml-cpu-haswell.dll
2026-07-14 10:56:12,143 - GPU offload: n_gpu_layers=-1 (全部层)
2026-07-14 10:56:12,146 - llama_model_load_from_file_impl: using device Vulkan0 (AMD Radeon RX 580 2048SP)
2026-07-14 10:56:12,544 - load_tensors: offloaded 29/29 layers to GPU";
        var status = GpuLogParser.ParseAll(output);
        Assert.False(status.CpuFallbackDetected);
        Assert.True(status.VulkanBackendConfirmed);
        Assert.True(status.OffloadLayersConfirmed);
        Assert.Equal(29, status.OffloadLayers);
        // 该日志含 "using device Vulkan0 (AMD Radeon RX 580 2048SP)"（DeviceNameFallbackPattern 可命中），
        // 29/29 满足 IsFullyOffloaded 路径 1，无 CPU fallback → IsFullyConfirmed = true
        Assert.True(status.DeviceNameConfirmed, "日志含 using device 行，设备名应被解析确认");
        Assert.True(status.IsFullyConfirmed, "Vulkan + 设备名 + 29/29 全量 offload + 无 fallback → 应完全确认");
    }

    // ═══════════════════════════════════════════════════════════
    // 10.6 绝对资源门控：Runtime 可用内存边界测试
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void CheckResources_AvailableMemoryBelow2GB_ReturnsKill()
    {
        // 可用内存 1GB < 2GB → 杀进程
        var result = SttSafetyChecker.CheckResources(
            privateBytes: 1 * GB,
            ramUsagePercent: 50.0,
            commitBytes: 4 * GB,
            commitLimitBytes: 16 * GB,
            availableMemoryBytes: 1 * GB);

        Assert.True(result.ShouldKill);
        Assert.Contains("可用物理内存", result.Message);
        Assert.Contains("1024MB", result.Message);
    }

    [Fact]
    public void CheckResources_AvailableMemoryExactly2GB_ReturnsContinue()
    {
        // 可用内存恰好 2GB → 不杀（边界值，< 2GB 才杀）
        var result = SttSafetyChecker.CheckResources(
            privateBytes: 1 * GB,
            ramUsagePercent: 50.0,
            commitBytes: 4 * GB,
            commitLimitBytes: 16 * GB,
            availableMemoryBytes: 2 * GB);

        Assert.False(result.ShouldKill);
        Assert.True(result.IsOk);
    }

    [Fact]
    public void CheckResources_AvailableMemoryJustBelow2GB_ReturnsKill()
    {
        // 可用内存 2047MB < 2048MB → 杀进程
        var result = SttSafetyChecker.CheckResources(
            privateBytes: 1 * GB,
            ramUsagePercent: 50.0,
            commitBytes: 4 * GB,
            commitLimitBytes: 16 * GB,
            availableMemoryBytes: 2 * GB - 1); // 2047MB

        Assert.True(result.ShouldKill);
        Assert.Contains("可用物理内存", result.Message);
    }

    [Fact]
    public void CheckResources_AvailableMemoryTakesPriorityOverRam()
    {
        // 可用内存 < 2GB 但 RAM 也高 → 应返回可用内存的消息（先检查）
        var result = SttSafetyChecker.CheckResources(
            privateBytes: 1 * GB,
            ramUsagePercent: 95.0,
            commitBytes: 4 * GB,
            commitLimitBytes: 16 * GB,
            availableMemoryBytes: 1 * GB);

        Assert.True(result.ShouldKill);
        Assert.Contains("可用物理内存", result.Message);
    }

    [Fact]
    public void CheckResources_HighRamButAvailOk_ReturnsContinue()
    {
        // RAM = 95% 但可用内存充足 → 不杀（RAM 仅告警）
        var result = SttSafetyChecker.CheckResources(
            privateBytes: 1 * GB,
            ramUsagePercent: 95.0,
            commitBytes: 4 * GB,
            commitLimitBytes: 16 * GB,
            availableMemoryBytes: 5 * GB);

        Assert.False(result.ShouldKill);
        Assert.True(result.IsOk);
    }

    [Fact]
    public void CheckResources_CommitAndAvailBothFail_CommitCheckedFirst()
    {
        // Commit 超标 + 可用内存低 → Commit 先检查（顺序在 availableMem 之后）
        // 但 PB 正常 + availableMem 低 → 应返回 availableMem 的消息
        var result = SttSafetyChecker.CheckResources(
            privateBytes: 1 * GB,
            ramUsagePercent: 50.0,
            commitBytes: 15 * GB,
            commitLimitBytes: 16 * GB,
            availableMemoryBytes: 1 * GB);

        // availableMem 先检查（顺序 2），所以返回 availableMem 的消息
        Assert.True(result.ShouldKill);
        Assert.Contains("可用物理内存", result.Message);
    }

    // ═══════════════════════════════════════════════════════════
    // 10.6 绝对资源门控：Pre-job 边界测试
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void CheckPreJobResources_AllNormal_Pass()
    {
        var result = SttSafetyChecker.CheckPreJobResources(
            ramUsagePercent: 50.0,
            commitBytes: 8 * GB,
            commitLimitBytes: 32 * GB,
            availableMemoryBytes: 8 * GB);

        Assert.True(result.IsOk);
    }

    [Fact]
    public void CheckPreJobResources_AvailableMemoryBelow4GB_Fail()
    {
        // 可用内存 3GB < 4GB → 拒绝
        var result = SttSafetyChecker.CheckPreJobResources(
            ramUsagePercent: 50.0,
            commitBytes: 8 * GB,
            commitLimitBytes: 32 * GB,
            availableMemoryBytes: 3 * GB);

        Assert.True(result.ShouldFail);
        Assert.Contains("可用内存", result.Message);
        Assert.Contains("4096MB", result.Message);
    }

    [Fact]
    public void CheckPreJobResources_AvailableMemoryExactly4GB_Pass()
    {
        // 可用内存恰好 4GB → 通过
        var result = SttSafetyChecker.CheckPreJobResources(
            ramUsagePercent: 50.0,
            commitBytes: 8 * GB,
            commitLimitBytes: 32 * GB,
            availableMemoryBytes: 4 * GB);

        Assert.True(result.IsOk);
    }

    [Fact]
    public void CheckPreJobResources_AvailableMemoryZero_FailClosed()
    {
        // 可用内存 = 0 → fail-closed
        var result = SttSafetyChecker.CheckPreJobResources(
            ramUsagePercent: 50.0,
            commitBytes: 8 * GB,
            commitLimitBytes: 32 * GB,
            availableMemoryBytes: 0);

        Assert.True(result.ShouldFail);
        Assert.Contains("fail-closed", result.Message);
    }

    [Fact]
    public void CheckPreJobResources_RamHighButAvailOk_Pass()
    {
        // RAM = 90% 但可用内存 > 4GB → 通过（RAM 不再硬拒绝）
        var result = SttSafetyChecker.CheckPreJobResources(
            ramUsagePercent: 90.0,
            commitBytes: 8 * GB,
            commitLimitBytes: 32 * GB,
            availableMemoryBytes: 5 * GB);

        Assert.True(result.IsOk);
    }

    [Fact]
    public void CheckPreJobResources_CommitOver85_Fail()
    {
        // Commit = 90% > 85% → 拒绝
        var result = SttSafetyChecker.CheckPreJobResources(
            ramUsagePercent: 50.0,
            commitBytes: 18 * GB,
            commitLimitBytes: 20 * GB, // 90%
            availableMemoryBytes: 8 * GB);

        Assert.True(result.ShouldFail);
        Assert.Contains("Commit", result.Message);
        Assert.Contains("85%", result.Message);
    }

    [Fact]
    public void CheckPreJobResources_CommitExactly85_Pass()
    {
        // Commit = 85.0% → 通过
        var result = SttSafetyChecker.CheckPreJobResources(
            ramUsagePercent: 50.0,
            commitBytes: 17 * GB,
            commitLimitBytes: 20 * GB, // 85%
            availableMemoryBytes: 8 * GB);

        Assert.True(result.IsOk);
    }

    [Fact]
    public void CheckPreJobResources_ZeroCommitLimit_FailClosed()
    {
        var result = SttSafetyChecker.CheckPreJobResources(
            ramUsagePercent: 50.0,
            commitBytes: 0,
            commitLimitBytes: 0,
            availableMemoryBytes: 8 * GB);

        Assert.True(result.ShouldFail);
        Assert.Contains("CommitLimit", result.Message);
        Assert.Contains("fail-closed", result.Message);
    }

    [Fact]
    public void CheckPreJobResources_AvailAndCommitFail_AvailCheckedFirst()
    {
        // 可用内存低 + Commit 超标 → 可用内存先检查
        var result = SttSafetyChecker.CheckPreJobResources(
            ramUsagePercent: 50.0,
            commitBytes: 18 * GB,
            commitLimitBytes: 20 * GB,
            availableMemoryBytes: 1 * GB);

        Assert.True(result.ShouldFail);
        Assert.Contains("可用内存", result.Message);
    }
}
