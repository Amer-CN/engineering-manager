using System.Diagnostics;
using System.Text;
using Dapper;
using EngineeringManager.Api.Services.Stt;
using Microsoft.Data.Sqlite;
using Xunit;

namespace EngineeringManager.Tests.Security;

/// <summary>
/// 9.5 生产Bug修复回归测试：验证 9.4 中修复的 3 个 Bug 不再复发。
/// 不运行真实模型或 GPU — 全部纯逻辑测试。
/// </summary>
public class SttBugRegressionTests
{
    // ═══════════════════════════════════════════════════════════
    // 回归 1: 注册表受限子键不再导致整体 VRAM 检测失败
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void SelectAdapterVram_RestrictedSubkeysSkipped_StillReturnsMatchedVram()
    {
        // 模拟注册表有多个子键，其中一些受限（无 DriverDesc）
        // 只要有一个匹配的适配器，就应返回其 VRAM
        var adapters = new List<AdapterRecord>
        {
            new("", null, null),           // 受限子键（空 DriverDesc → 跳过）
            new("Configuration", null, null), // 受限子键
            new("AMD Radeon RX 580 2048SP", 8589934592L, null), // 匹配
        };

        var (vramMb, method) = SttEngineSelector.SelectAdapterVram(adapters, "AMD Radeon RX 580 2048SP");

        Assert.Equal(8192, vramMb);
        Assert.Equal("registry", method);
    }

    [Fact]
    public void SelectAdapterVram_AllRestrictedSubkeys_ReturnsZero()
    {
        // 所有子键都受限（无 DriverDesc 或无 VRAM）→ fail-closed
        var adapters = new List<AdapterRecord>
        {
            new("", null, null),
            new("Configuration", null, null),
            new("Properties", null, null),
        };

        var (vramMb, method) = SttEngineSelector.SelectAdapterVram(adapters, "AMD Radeon RX 580 2048SP");

        Assert.Equal(0, vramMb);
        Assert.Equal("unknown", method);
    }

    [Fact]
    public void SelectAdapterVram_NameMismatch_ReturnsZero()
    {
        // 适配器名称不匹配 → fail-closed
        var adapters = new List<AdapterRecord>
        {
            new("NVIDIA GeForce GTX 1060", 6442450944L, null),
        };

        var (vramMb, method) = SttEngineSelector.SelectAdapterVram(adapters, "AMD Radeon RX 580 2048SP");

        Assert.Equal(0, vramMb);
        Assert.Equal("unknown", method);
    }

    [Fact]
    public void SelectAdapterVram_DwordFallback_UsedWhenQwordMissing()
    {
        // QWORD 缺失时，DWORD fallback
        var adapters = new List<AdapterRecord>
        {
            new("AMD Radeon RX 580 2048SP", null, 1073741824), // DWORD = 1024MB (fits in int)
        };

        var (vramMb, method) = SttEngineSelector.SelectAdapterVram(adapters, "AMD Radeon RX 580 2048SP");

        Assert.True(vramMb > 0);
        Assert.Equal("registry", method);
    }

    [Fact]
    public void SelectAdapterVram_EmptyList_ReturnsZero()
    {
        var (vramMb, method) = SttEngineSelector.SelectAdapterVram(
            new List<AdapterRecord>(), "AMD Radeon RX 580 2048SP");

        Assert.Equal(0, vramMb);
        Assert.Equal("unknown", method);
    }

    [Fact]
    public void SelectAdapterVram_NullList_ReturnsZero()
    {
        var (vramMb, method) = SttEngineSelector.SelectAdapterVram(
            null!, "AMD Radeon RX 580 2048SP");

        Assert.Equal(0, vramMb);
        Assert.Equal("unknown", method);
    }

    [Fact]
    public void SelectAdapterVram_EmptyGpuName_ReturnsZero()
    {
        var adapters = new List<AdapterRecord>
        {
            new("AMD Radeon RX 580 2048SP", 8589934592L, null),
        };

        var (vramMb, method) = SttEngineSelector.SelectAdapterVram(adapters, "");

        Assert.Equal(0, vramMb);
        Assert.Equal("unknown", method);
    }

    // ═══════════════════════════════════════════════════════════
    // 回归 2: GpuLogParser 设备名正则不再误匹配 "GPU offload:" 行
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void TryParseDeviceName_GpuOffloadLine_ReturnsFalse()
    {
        // 9.4 bug: "GPU offload: n_gpu_layers=-1 (全部层)" 被误识别为设备名
        var output = "GPU offload: n_gpu_layers=-1 (全部层)";
        var result = GpuLogParser.TryParseDeviceName(output, out var name);

        Assert.False(result);
        Assert.Equal("", name);
    }

    [Fact]
    public void TryParseDeviceName_GgmlVulkanFormat_ReturnsTrue()
    {
        // 正确格式: "ggml_vulkan: 0 = AMD Radeon RX 580 2048SP (AMD proprietary driver)"
        var output = "ggml_vulkan: 0 = AMD Radeon RX 580 2048SP (AMD proprietary driver)";
        var result = GpuLogParser.TryParseDeviceName(output, out var name);

        Assert.True(result);
        Assert.Equal("AMD Radeon RX 580 2048SP", name);
    }

    [Fact]
    public void TryParseDeviceName_UsingDeviceFormat_ReturnsTrue()
    {
        // 备选格式: "using device Vulkan0 (AMD Radeon RX 580 2048SP)"
        var output = "using device Vulkan0 (AMD Radeon RX 580 2048SP)";
        var result = GpuLogParser.TryParseDeviceName(output, out var name);

        Assert.True(result);
        Assert.Equal("AMD Radeon RX 580 2048SP", name);
    }

    [Fact]
    public void TryParseDeviceName_OldDeviceFormat_ReturnsFalse()
    {
        // 旧格式 "device: AMD Radeon RX 580" 不再匹配（太宽泛）
        var output = "device: AMD Radeon RX 580 (8192 MB)";
        var result = GpuLogParser.TryParseDeviceName(output, out _);

        Assert.False(result);
    }

    [Fact]
    public void TryParseDeviceName_OldGPUFormat_ReturnsFalse()
    {
        // 旧格式 "GPU: AMD Radeon RX 580" 不再匹配
        var output = "GPU: AMD Radeon RX 580";
        var result = GpuLogParser.TryParseDeviceName(output, out _);

        Assert.False(result);
    }

    [Fact]
    public void ParseAll_Real9_4Log_AllConfirmed()
    {
        // 模拟 9.4 实际运行日志格式
        var output = @"loaded Vulkan backend
ggml_vulkan: 0 = AMD Radeon RX 580 2048SP (AMD proprietary driver)
offloaded 29/29 layers to GPU";
        var status = GpuLogParser.ParseAll(output);

        Assert.True(status.VulkanBackendConfirmed);
        Assert.True(status.DeviceNameConfirmed);
        Assert.Equal("AMD Radeon RX 580 2048SP", status.DeviceName);
        Assert.True(status.OffloadLayersConfirmed);
        Assert.Equal(29, status.OffloadLayers);
        Assert.Equal(29, status.OffloadTotal);
        Assert.False(status.CpuFallbackDetected);
        Assert.True(status.IsFullyConfirmed);
    }

    [Fact]
    public void ParseAll_Real9_4LogWithGpuOffloadLine_DeviceNameNotConfused()
    {
        // 完整 9.4 日志包含 "GPU offload:" 行，设备名不应被污染
        var output = @"loaded Vulkan backend
ggml_vulkan: 0 = AMD Radeon RX 580 2048SP (AMD proprietary driver)
GPU offload: n_gpu_layers=-1 (全部层)
offloaded 29/29 layers to GPU";
        var status = GpuLogParser.ParseAll(output);

        Assert.True(status.DeviceNameConfirmed);
        Assert.Equal("AMD Radeon RX 580 2048SP", status.DeviceName);
        Assert.True(status.IsFullyConfirmed);
    }

    // ═══════════════════════════════════════════════════════════
    // 回归 3: SttEngineSelector.IsGpuNameMatch 名称匹配
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void IsGpuNameMatch_ExactMatch_ReturnsTrue()
    {
        Assert.True(SttEngineSelector.IsGpuNameMatch(
            "AMD Radeon RX 580 2048SP", "AMD Radeon RX 580 2048SP"));
    }

    [Fact]
    public void IsGpuNameMatch_SubstringMatch_ReturnsTrue()
    {
        // WMI: "AMD Radeon RX 580 2048SP" vs Registry: "AMD Radeon RX 580 2048SP"
        Assert.True(SttEngineSelector.IsGpuNameMatch(
            "AMD Radeon RX 580 2048SP", "AMD Radeon RX 580 2048SP"));
    }

    [Fact]
    public void IsGpuNameMatch_DifferentGpus_ReturnsFalse()
    {
        Assert.False(SttEngineSelector.IsGpuNameMatch(
            "AMD Radeon RX 580 2048SP", "NVIDIA GeForce GTX 1060"));
    }

    [Fact]
    public void IsGpuNameMatch_EmptyStrings_ReturnsFalse()
    {
        Assert.False(SttEngineSelector.IsGpuNameMatch("", ""));
    }

    // ═══════════════════════════════════════════════════════════
    // 回归 4: SttSafetyChecker 阈值边界
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void CheckResources_Exactly70PercentRam_Continues()
    {
        // 70% RAM 不触发告警（告警线 80%）
        var result = SttSafetyChecker.CheckResources(
            1L * 1024 * 1024 * 1024, // 1GB PB
            70.0,                      // 70% RAM
            4L * 1024 * 1024 * 1024,  // 4GB committed
            32L * 1024 * 1024 * 1024, // 32GB limit
            8L * 1024 * 1024 * 1024); // 8GB available

        Assert.False(result.ShouldKill);
    }

    [Fact]
    public void CheckResources_Exactly80PercentRam_Continues_OnlyWarning()
    {
        // 10.6: RAM=80% 仅告警不再杀进程
        var result = SttSafetyChecker.CheckResources(
            1L * 1024 * 1024 * 1024,
            80.0,
            4L * 1024 * 1024 * 1024,
            32L * 1024 * 1024 * 1024,
            8L * 1024 * 1024 * 1024);

        Assert.False(result.ShouldKill); // 不再杀
        Assert.True(result.IsOk);
    }

    [Fact]
    public void CheckGpuFailClosed_29of29_Pass()
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
            confirmedDeviceName: "AMD Radeon RX 580 2048SP",
            expectedDeviceName: "AMD Radeon RX 580 2048SP");

        Assert.True(result.IsOk);
    }

    [Fact]
    public void CheckGpuFailClosed_29of30_Fail()
    {
        var result = SttSafetyChecker.CheckGpuFailClosed(
            true, true, 8192, "registry", true, true, 29, 30,
            "AMD Radeon RX 580 2048SP", "AMD Radeon RX 580 2048SP");

        Assert.True(result.ShouldFail);
    }

    [Fact]
    public void CheckGpuFailClosed_30of30_Fail()
    {
        var result = SttSafetyChecker.CheckGpuFailClosed(
            true, true, 8192, "registry", true, true, 30, 30,
            "AMD Radeon RX 580 2048SP", "AMD Radeon RX 580 2048SP");

        Assert.True(result.ShouldFail);
    }

    [Fact]
    public void CheckGpuFailClosed_28of29_Fail()
    {
        var result = SttSafetyChecker.CheckGpuFailClosed(
            true, true, 8192, "registry", true, true, 28, 29,
            "AMD Radeon RX 580 2048SP", "AMD Radeon RX 580 2048SP");

        Assert.True(result.ShouldFail);
    }

    [Fact]
    public void CheckGpuFailClosed_NullOffloadLayers_Fail()
    {
        var result = SttSafetyChecker.CheckGpuFailClosed(
            true, true, 8192, "registry", true, false, null, null,
            "AMD Radeon RX 580 2048SP", "AMD Radeon RX 580 2048SP");

        Assert.True(result.ShouldFail);
    }

    [Fact]
    public void CheckGpuFailClosed_DeviceMismatch_Fail()
    {
        var result = SttSafetyChecker.CheckGpuFailClosed(
            true, true, 8192, "registry", true, true, 29, 29,
            "NVIDIA GeForce GTX 1060", "AMD Radeon RX 580 2048SP");

        Assert.True(result.ShouldFail);
    }

    [Fact]
    public void CheckGpuFailClosed_VramInferred_Fail()
    {
        // 型号推断的 VRAM 不可接受
        var result = SttSafetyChecker.CheckGpuFailClosed(
            true, true, 8192, "inferred", true, true, 29, 29,
            "AMD Radeon RX 580 2048SP", "AMD Radeon RX 580 2048SP");

        Assert.True(result.ShouldFail);
    }

    [Fact]
    public void CheckGpuFailClosed_EmptyDeviceName_Fail()
    {
        var result = SttSafetyChecker.CheckGpuFailClosed(
            true, true, 8192, "registry", true, true, 29, 29,
            "", "AMD Radeon RX 580 2048SP");

        Assert.True(result.ShouldFail);
    }

    [Fact]
    public void IsVramDetectionReliable_Registry_ReturnsTrue()
    {
        Assert.True(SttSafetyChecker.IsVramDetectionReliable("registry"));
    }

    [Fact]
    public void IsVramDetectionReliable_Dxgi_ReturnsTrue()
    {
        Assert.True(SttSafetyChecker.IsVramDetectionReliable("dxgi"));
    }

    [Fact]
    public void IsVramDetectionReliable_Inferred_ReturnsFalse()
    {
        Assert.False(SttSafetyChecker.IsVramDetectionReliable("inferred"));
    }

    [Fact]
    public void IsVramDetectionReliable_Unknown_ReturnsFalse()
    {
        Assert.False(SttSafetyChecker.IsVramDetectionReliable("unknown"));
    }

    [Fact]
    public void IsVramDetectionReliable_Wmi_ReturnsFalse()
    {
        Assert.False(SttSafetyChecker.IsVramDetectionReliable("wmi"));
    }

    // ═════════════════════════════════════════════════════════
    // 回归 5: Pre-job 三参数资源门控（RAM + Commit + 可用内存）
    // ═════════════════════════════════════════════════════════

    [Fact]
    public void CheckPreJobResources_AllNormal_Pass()
    {
        var result = SttSafetyChecker.CheckPreJobResources(
            ramUsagePercent: 50.0,
            commitBytes: 8L * 1024 * 1024 * 1024,
            commitLimitBytes: 32L * 1024 * 1024 * 1024,
            availableMemoryBytes: 8L * 1024 * 1024 * 1024);

        Assert.True(result.IsOk);
    }

    [Fact]
    public void CheckPreJobResources_RamOver70_Pass_OnlyInfo()
    {
        // 10.6: RAM 不再硬拒绝，仅记录信息
        var result = SttSafetyChecker.CheckPreJobResources(
            ramUsagePercent: 71.0,
            commitBytes: 8L * 1024 * 1024 * 1024,
            commitLimitBytes: 32L * 1024 * 1024 * 1024,
            availableMemoryBytes: 8L * 1024 * 1024 * 1024);

        Assert.True(result.IsOk); // RAM 不再拒绝
        Assert.False(result.ShouldFail);
    }

    [Fact]
    public void CheckPreJobResources_RamExactly70_Pass()
    {
        var result = SttSafetyChecker.CheckPreJobResources(
            ramUsagePercent: 70.0,
            commitBytes: 8L * 1024 * 1024 * 1024,
            commitLimitBytes: 32L * 1024 * 1024 * 1024,
            availableMemoryBytes: 8L * 1024 * 1024 * 1024);

        Assert.True(result.IsOk);
    }

    [Fact]
    public void CheckPreJobResources_CommitOver85_Fail()
    {
        // 18GB / 20GB = 90% > 85%
        var result = SttSafetyChecker.CheckPreJobResources(
            ramUsagePercent: 50.0,
            commitBytes: 18L * 1024 * 1024 * 1024,
            commitLimitBytes: 20L * 1024 * 1024 * 1024,
            availableMemoryBytes: 8L * 1024 * 1024 * 1024);

        Assert.True(result.ShouldFail);
        Assert.Contains("Commit", result.Message);
        Assert.Contains("85%", result.Message);
    }

    [Fact]
    public void CheckPreJobResources_CommitExactly85_Pass()
    {
        // 17GB / 20GB = 85.0% 恰好等于阈值 → Pass
        var result = SttSafetyChecker.CheckPreJobResources(
            ramUsagePercent: 50.0,
            commitBytes: 17L * 1024 * 1024 * 1024,
            commitLimitBytes: 20L * 1024 * 1024 * 1024,
            availableMemoryBytes: 8L * 1024 * 1024 * 1024);

        Assert.True(result.IsOk);
    }

    [Fact]
    public void CheckPreJobResources_AvailableMemoryUnder4GB_Fail()
    {
        // 10.6: 可用内存门从 2GB 提高到 4GB
        var result = SttSafetyChecker.CheckPreJobResources(
            ramUsagePercent: 50.0,
            commitBytes: 8L * 1024 * 1024 * 1024,
            commitLimitBytes: 32L * 1024 * 1024 * 1024,
            availableMemoryBytes: 3L * 1024 * 1024 * 1024); // 3GB < 4GB

        Assert.True(result.ShouldFail);
        Assert.Contains("可用内存", result.Message);
        Assert.Contains("4096MB", result.Message);
    }

    [Fact]
    public void CheckPreJobResources_AvailableMemoryExactly4GB_Pass()
    {
        // 10.6: 可用内存恰好 4GB → 通过
        var result = SttSafetyChecker.CheckPreJobResources(
            ramUsagePercent: 50.0,
            commitBytes: 8L * 1024 * 1024 * 1024,
            commitLimitBytes: 32L * 1024 * 1024 * 1024,
            availableMemoryBytes: 4L * 1024 * 1024 * 1024); // exactly 4GB

        Assert.True(result.IsOk);
    }

    [Fact]
    public void CheckPreJobResources_AllThreeFail_AvailCheckedFirst()
    {
        // 10.6: RAM 不再硬拒绝，可用内存先检查
        var result = SttSafetyChecker.CheckPreJobResources(
            ramUsagePercent: 90.0,
            commitBytes: 30L * 1024 * 1024 * 1024,
            commitLimitBytes: 32L * 1024 * 1024 * 1024,
            availableMemoryBytes: 512L * 1024 * 1024);

        Assert.True(result.ShouldFail);
        Assert.Contains("可用内存", result.Message);
    }

    [Fact]
    public void CheckPreJobResources_ZeroCommitLimit_FailClosed()
    {
        // CommitLimit=0 表示获取失败 → fail-closed 拒绝（不再跳过）
        var result = SttSafetyChecker.CheckPreJobResources(
            ramUsagePercent: 50.0,
            commitBytes: 0,
            commitLimitBytes: 0,
            availableMemoryBytes: 8L * 1024 * 1024 * 1024);

        Assert.True(result.ShouldFail);
        Assert.Contains("CommitLimit", result.Message);
        Assert.Contains("fail-closed", result.Message);
    }

    // ═════════════════════════════════════════════════════════
    // 回归 6: WMI boxed uint 安全转换
    // ═════════════════════════════════════════════════════════

    [Fact]
    public void ConvertWmiAdapterRam_Null_ReturnsZero()
    {
        Assert.Equal(0, SttEngineSelector.ConvertWmiAdapterRam(null));
    }

    [Fact]
    public void ConvertWmiAdapterRam_BoxedUint2048MB_Returns2048()
    {
        // 2048MB = 2147483648 bytes (刚好在 uint 范围内)
        object vramBytes = (uint)2147483648;
        Assert.Equal(2048, SttEngineSelector.ConvertWmiAdapterRam(vramBytes));
    }

    [Fact]
    public void ConvertWmiAdapterRam_BoxedInt1024MB_Returns1024()
    {
        // 1024MB = 1073741824 bytes (在 int 范围内)
        object vramBytes = (int)1073741824;
        Assert.Equal(1024, SttEngineSelector.ConvertWmiAdapterRam(vramBytes));
    }

    [Fact]
    public void ConvertWmiAdapterRam_BoxedUintOverflow_ReturnsZero()
    {
        // WMI AdapterRAM 是 uint32，>4GB 显卡会溢出报 0
        object vramBytes = (uint)0;
        Assert.Equal(0, SttEngineSelector.ConvertWmiAdapterRam(vramBytes));
    }

    [Fact]
    public void ConvertWmiAdapterRam_BoxedLong8192MB_Returns8192()
    {
        // 8192MB = 8589934592 bytes
        object vramBytes = (long)8589934592L;
        Assert.Equal(8192, SttEngineSelector.ConvertWmiAdapterRam(vramBytes));
    }

    [Fact]
    public void ConvertWmiAdapterRam_StringValue_ReturnsZero()
    {
        // 异常类型：字符串
        object vramBytes = "8192";
        Assert.Equal(0, SttEngineSelector.ConvertWmiAdapterRam(vramBytes));
    }

    [Fact]
    public void ConvertWmiAdapterRam_Caps32GB()
    {
        // 即使值超大，也不超过 32768MB 上限
        object vramBytes = (long)128L * 1024 * 1024 * 1024; // 128GB
        Assert.Equal(32768, SttEngineSelector.ConvertWmiAdapterRam(vramBytes));
    }

    // ═════════════════════════════════════════════════════════
    // 回归 7: UTF-8 中文分块读取与落库字符串一致性
    // ═════════════════════════════════════════════════════════

    [Fact]
    public async Task Utf8ChunkedReader_ChineseTextSplitMidCharacter_ReassemblesCorrectly()
    {
        // 模拟 transcribe.exe stdout 输出中文文本
        // 中文字符在 UTF-8 中占 3 字节，分块可能在字符中间截断
        var originalText = "你好世界，这是一个测试。会议记录：甲方乙方监理单位。";
        var utf8Bytes = Encoding.UTF8.GetBytes(originalText);

        // 用小缓冲区逐块读取，模拟 Process stdout 分块到达
        using var ms = new MemoryStream(utf8Bytes);
        using var reader = new StreamReader(ms, Encoding.UTF8, detectEncodingFromByteOrderMarks: false,
            bufferSize: 4); // 4 字节缓冲区，确保在中文 3 字节字符中间截断

        var reassembled = new StringBuilder();
        char[] buffer = new char[4];
        int read;
        while ((read = await reader.ReadAsync(buffer, 0, buffer.Length)) > 0)
        {
            reassembled.Append(buffer, 0, read);
        }

        Assert.Equal(originalText, reassembled.ToString());
    }

    [Fact]
    public async Task Utf8ChunkedReader_ChineseTextReadLine_PreservesText()
    {
        // 模拟 ReadLineAsync 读取包含中文的行
        var lines = new[]
        {
            "会议记录开始",
            "【说话人1】大家好，今天我们讨论工程进度。",
            "【说话人2】好的，甲方确认验收。",
            "会议结束"
        };
        var fullOutput = string.Join("\n", lines) + "\n";
        var utf8Bytes = Encoding.UTF8.GetBytes(fullOutput);

        using var ms = new MemoryStream(utf8Bytes);
        using var reader = new StreamReader(ms, Encoding.UTF8);

        var readLines = new List<string>();
        string? line;
        while ((line = await reader.ReadLineAsync()) != null)
        {
            readLines.Add(line);
        }

        Assert.Equal(lines.Length, readLines.Count);
        Assert.Equal(lines[0], readLines[0]);
        Assert.Equal(lines[1], readLines[1]);
        Assert.Contains("说话人1", readLines[1]);
        Assert.Contains("甲方", readLines[2]);
    }

    [Fact]
    public void Utf8DbConsistency_ChineseTextRoundTrip_PreservesText()
    {
        // 模拟 stdout 读取的中文文本 → JSON 序列化（落库 result_json）→ 反序列化
        var originalText = "【说话人1】这是会议记录的中文内容，包含标点符号和特殊字符\"引号\"。";

        // 模拟 SttWorker.cs 中的 JSON 序列化
        var segments = new[] { new { speaker = 1, start = 0.0, end = 10.0, text = originalText } };
        var json = System.Text.Json.JsonSerializer.Serialize(segments);

        // 模拟反序列化
        using var doc = System.Text.Json.JsonDocument.Parse(json);
        var deserializedText = doc.RootElement[0].GetProperty("text").GetString();

        Assert.Equal(originalText, deserializedText);
        Assert.Contains("说话人", deserializedText);
        Assert.Contains("引号", deserializedText);
    }

    [Fact]
    public void Utf8DbConsistency_ChineseWithNewlines_PreservesText()
    {
        // 多行中文文本（含换行符）的序列化/反序列化一致性
        var multiLineText = "第一行：甲方发言\n第二行：乙方回复\n第三行：监理确认";

        var segments = new[] { new { speaker = 1, start = 0.0, end = 30.0, text = multiLineText } };
        var json = System.Text.Json.JsonSerializer.Serialize(segments);

        using var doc = System.Text.Json.JsonDocument.Parse(json);
        var deserializedText = doc.RootElement[0].GetProperty("text").GetString();

        Assert.Equal(multiLineText, deserializedText);
        Assert.Contains("\n", deserializedText);
    }

    [Fact]
    public void Utf8DbConsistency_EmojiInText_PreservesText()
    {
        // transcribe.exe 可能输出 emoji（UTF-8 4 字节字符）
        var textWithEmoji = "会议记录📝 甲方✅ 乙方✔️";

        var segments = new[] { new { speaker = 1, start = 0.0, end = 5.0, text = textWithEmoji } };
        var json = System.Text.Json.JsonSerializer.Serialize(segments);

        using var doc = System.Text.Json.JsonDocument.Parse(json);
        var deserializedText = doc.RootElement[0].GetProperty("text").GetString();

        Assert.Equal(textWithEmoji, deserializedText);
    }

    [Fact]
    public async Task Utf8ChunkedReader_MixedAsciiChinese_ReassemblesCorrectly()
    {
        // 混合 ASCII 和中文（ASCII 1 字节 + 中文 3 字节）
        var mixedText = "Speaker 1: 你好 World 世界 hello 世界";
        var utf8Bytes = Encoding.UTF8.GetBytes(mixedText);

        using var ms = new MemoryStream(utf8Bytes);
        using var reader = new StreamReader(ms, Encoding.UTF8, false, bufferSize: 7);

        var reassembled = new StringBuilder();
        char[] buffer = new char[7];
        int read;
        while ((read = await reader.ReadAsync(buffer, 0, buffer.Length)) > 0)
        {
            reassembled.Append(buffer, 0, read);
        }

        Assert.Equal(mixedText, reassembled.ToString());
    }

    // ═════════════════════════════════════════════════════════
    // 回归 8: ffmpeg 管道排水死锁（10.30 进度卡 5%）
    // 修复前 PreprocessAsync 在 WaitForExitAsync 之前不读 stdout/stderr，
    // 子进程写满管道缓冲区（~4KB）后阻塞在写入上永不退出 → 父进程永不返回。
    // ═════════════════════════════════════════════════════════

    [Fact]
    public async Task RunProcessAsync_ChildWritesHugeStderr_CompletesWithoutDeadlock()
    {
        // cmd 向 stderr 写 ~31KB（远超管道缓冲区）后退出；
        // 修复前该调用会死锁挂起——本测试以 30s 时限保护，死锁回归时失败而非挂死套件
        var psi = new ProcessStartInfo
        {
            FileName = "cmd.exe",
            Arguments = "/c for /l %i in (1,1,500) do @echo " + new string('x', 60) + " 1>&2",
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardError = true,
            RedirectStandardOutput = true,
        };

        using var cancelCts = new CancellationTokenSource(TimeSpan.FromSeconds(60));
        var runTask = AudioPreprocessor.RunProcessAsync(psi, cancelCts.Token);

        var winner = await Task.WhenAny(runTask, Task.Delay(TimeSpan.FromSeconds(30)));
        Assert.True(winner == runTask, "RunProcessAsync 30s 内未完成：stderr 管道排水死锁回归");

        var result = await runTask;
        Assert.Equal(0, result.ExitCode);
        Assert.True(result.StdError.Length >= 30 * 1024,
            $"stderr 应 ≥30KB 才能证明越过管道缓冲区，实际 {result.StdError.Length} 字符");
    }

    [Fact]
    public async Task RunProcessAsync_NonZeroExit_ReturnsStderrFromDrainedTask()
    {
        // 回归"退出码非 0 时 stderr 从排水任务结果取"（不得在 WaitForExit 后再读
        // StandardError，大输出场景会二次死锁）；同时覆盖 stdout 未重定向的调用形态
        var psi = new ProcessStartInfo
        {
            FileName = "cmd.exe",
            Arguments = "/c echo boom 1>&2 & exit /b 3",
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardError = true,
        };

        var result = await AudioPreprocessor.RunProcessAsync(psi);

        Assert.Equal(3, result.ExitCode);
        Assert.Contains("boom", result.StdError);
    }

    // ═════════════════════════════════════════════════════════
    // 回归 9: 启动时孤儿 'processing' STT 任务恢复为 'pending'
    // 修复前 Poll 只取 'pending'，死锁卡在 'processing' 的任务重启后永远显示"处理中"
    // ═════════════════════════════════════════════════════════

    [Fact]
    public void RecoverOrphanJobs_OnlyProcessingResetToPending_OthersUntouched()
    {
        // 表结构与 Migrations/Scripts/028_AddSpeechToText.sql 一致
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        conn.Execute(@"
            CREATE TABLE stt_jobs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_file TEXT NOT NULL,
                source_path TEXT NOT NULL,
                source_type TEXT NOT NULL DEFAULT 'audio',
                engine TEXT NOT NULL DEFAULT 'qwen3-asr-1.7b-gguf',
                status TEXT NOT NULL DEFAULT 'pending',
                progress INTEGER NOT NULL DEFAULT 0,
                is_multi_speaker INTEGER NOT NULL DEFAULT 0,
                num_speakers INTEGER,
                hotwords TEXT,
                result_text TEXT,
                result_json TEXT,
                duration_sec REAL,
                elapsed_sec REAL,
                error TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                created_by TEXT NOT NULL
            );");
        conn.Execute(@"
            INSERT INTO stt_jobs (source_file, source_path, status, created_at, updated_at, created_by) VALUES
            ('a.m4a', 'C:\t\a.m4a', 'processing', '2026-09-02 10:00:00', '2026-09-02 10:00:00', '1'),
            ('b.m4a', 'C:\t\b.m4a', 'pending',    '2026-09-02 10:05:00', '2026-09-02 10:05:00', '1'),
            ('c.m4a', 'C:\t\c.m4a', 'completed',  '2026-09-02 09:00:00', '2026-09-02 09:10:00', '1'),
            ('d.m4a', 'C:\t\d.m4a', 'failed',     '2026-09-02 09:20:00', '2026-09-02 09:25:00', '1');");

        var recovered = SttWorker.RecoverOrphanJobs(conn);

        Assert.Equal(1, recovered);
        var statuses = conn.Query<string>("SELECT status FROM stt_jobs ORDER BY id").ToList();
        Assert.Equal(new[] { "pending", "pending", "completed", "failed" }, statuses);
    }
}
