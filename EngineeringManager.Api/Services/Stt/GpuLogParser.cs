using System.Text.RegularExpressions;

namespace EngineeringManager.Api.Services.Stt;

/// <summary>
/// GPU 日志解析器：从 transcribe.exe 的 stdout/stderr 中提取 GPU 运行时状态。
/// 纯逻辑类，无外部依赖，完全可测试。
///
/// 解析目标（fail-closed：全部必须正向确认）：
/// 1. Vulkan backend 加载确认（不是仅出现 "Vulkan" 字样）
/// 2. 实际设备名/标识（如 "AMD Radeon RX 580"）
/// 3. offload 层数（如 "29/29 layers" 或 "offloaded 29/29"）
/// 4. CPU fallback 检测（如 "loaded CPU backend"、"falling back to CPU"）
/// </summary>
public static class GpuLogParser
{
    // Vulkan backend 加载确认：必须包含明确的加载语句
    private static readonly Regex VulkanBackendPattern = new(
        @"(?:loaded|using|init).*Vulkan.*backend",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    // 设备名提取：匹配 ggml_vulkan 行格式（如 "ggml_vulkan: 0 = AMD Radeon RX 580 2048SP (AMD proprietary driver)"）
    private static readonly Regex DeviceNamePattern = new(
        @"ggml_vulkan:\s*\d+\s*=\s*(.+?)(?:\s*\(|$)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    // 设备名提取（备选）：匹配 "using device Vulkan0 (AMD Radeon RX 580 2048SP)" 格式
    private static readonly Regex DeviceNameFallbackPattern = new(
        @"using device\s+\w+\s*\(([^)]+)\)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    // offload 层数提取：匹配 "29/29"、"offloaded 29/29 layers" 等格式
    private static readonly Regex OffloadLayersPattern = new(
        @"(\d+)\s*/\s*(\d+)\s*(?:layers?|offload)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    // n_gpu_layers 解析：匹配 "n_gpu_layers=-1" 或 "n_gpu_layers: -1" 等
    private static readonly Regex NGpuLayersPattern = new(
        @"n_gpu_layers\s*[=:]\s*(-?\d+)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    // block_count 解析：从模型元数据 "block_count u32 = 28" 提取
    private static readonly Regex BlockCountPattern = new(
        @"block_count\s*(?:u32|i32)?\s*=\s*(\d+)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    // "全部层" 标记 — 10.12 收紧：必须与 n_gpu_layers=-1 在同一行
    // 格式为 "n_gpu_layers=-1 (全部层)" 或 "n_gpu_layers=-1 (all layers)"
    // 不得接受包装器、测试脚本或任意文本中的孤立 "全部层/all layers" 字样
    private static readonly Regex AllLayersPattern = new(
        @"n_gpu_layers\s*[=:]\s*-1\s*\((?:\s*(?:全部层|all\s+layers)\s*)\)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    // CPU fallback 检测：仅匹配真正的 fallback 指标，不匹配 "loaded CPU backend"
    // 正常 Vulkan 运行也加载 CPU backend 作为辅助设备，这不是 fallback。
    // 真正的 fallback 指标：
    // - "falling back to CPU" / "fallback to CPU"
    // - "no suitable GPU" / "no GPU device"
    // - "CPU only" mode
    // - "0/N layers to GPU" (零层 offload)
    private static readonly Regex CpuFallbackPattern = new(
        @"(?:falling\s+back\s+to\s+CPU|fallback\s+to\s+CPU|no\s+suitable\s+GPU|no\s+GPU\s+device|CPU[-_\s]only\s+mode|0\s*/\s*\d+\s*layers?\s+to\s+GPU)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    /// <summary>
    /// 检查日志中是否确认了 Vulkan 后端加载。
    /// 不能仅靠 Contains("Vulkan")，必须匹配明确的加载语句。
    /// </summary>
    public static bool TryParseVulkanBackend(string output, out string backendName)
    {
        backendName = "";
        if (string.IsNullOrEmpty(output)) return false;

        var match = VulkanBackendPattern.Match(output);
        if (match.Success)
        {
            backendName = match.Value.Trim();
            return true;
        }
        return false;
    }

    /// <summary>
    /// 从日志中提取 GPU 设备名。
    /// </summary>
    public static bool TryParseDeviceName(string output, out string deviceName)
    {
        deviceName = "";
        if (string.IsNullOrEmpty(output)) return false;

        var match = DeviceNamePattern.Match(output);
        if (!match.Success)
            match = DeviceNameFallbackPattern.Match(output);
        if (match.Success && match.Groups.Count > 1)
        {
            deviceName = match.Groups[1].Value.Trim();
            return !string.IsNullOrEmpty(deviceName);
        }
        return false;
    }

    /// <summary>
    /// 从日志中提取 offload 层数。
    /// 如 "29/29 layers" → (29, 29)
    /// </summary>
    public static bool TryParseOffloadLayers(string output, out int layers, out int total)
    {
        layers = 0;
        total = 0;
        if (string.IsNullOrEmpty(output)) return false;

        var match = OffloadLayersPattern.Match(output);
        if (match.Success && match.Groups.Count > 2)
        {
            if (int.TryParse(match.Groups[1].Value, out layers) &&
                int.TryParse(match.Groups[2].Value, out total))
            {
                return true;
            }
        }
        return false;
    }

    /// <summary>
    /// 从日志中提取 n_gpu_layers 参数值。
    /// 如 "n_gpu_layers=-1" → -1, "n_gpu_layers: 29" → 29
    /// </summary>
    public static bool TryParseNGpuLayers(string output, out int nGpuLayers)
    {
        nGpuLayers = 0;
        if (string.IsNullOrEmpty(output)) return false;

        var match = NGpuLayersPattern.Match(output);
        if (match.Success && int.TryParse(match.Groups[1].Value, out nGpuLayers))
        {
            return true;
        }
        return false;
    }

    /// <summary>
    /// 从日志中提取模型 block_count（总层数）。
    /// 如 "block_count u32 = 28" → 28
    /// </summary>
    public static bool TryParseBlockCount(string output, out int blockCount)
    {
        blockCount = 0;
        if (string.IsNullOrEmpty(output)) return false;

        var match = BlockCountPattern.Match(output);
        if (match.Success && int.TryParse(match.Groups[1].Value, out blockCount))
        {
            return true;
        }
        return false;
    }

    /// <summary>
    /// 检查日志是否包含"全部层"标记（如 "n_gpu_layers=-1 (全部层)"）。
    /// </summary>
    public static bool HasAllLayersMarker(string output)
    {
        if (string.IsNullOrEmpty(output)) return false;
        return AllLayersPattern.IsMatch(output);
    }

    /// <summary>
    /// 检测日志中是否出现 CPU fallback 标记。
    /// </summary>
    public static bool TryParseCpuFallback(string output)
    {
        if (string.IsNullOrEmpty(output)) return false;
        return CpuFallbackPattern.IsMatch(output);
    }

    /// <summary>
    /// 综合解析 GPU 日志，返回完整的 GPU 运行时状态。
    /// </summary>
    public static GpuLogStatus ParseAll(string output)
    {
        var status = new GpuLogStatus();

        if (string.IsNullOrEmpty(output))
            return status;

        status.VulkanBackendConfirmed = TryParseVulkanBackend(output, out var backend);
        status.BackendName = backend;

        status.DeviceNameConfirmed = TryParseDeviceName(output, out var device);
        status.DeviceName = device;

        status.OffloadLayersConfirmed = TryParseOffloadLayers(output, out var layers, out var total);
        status.OffloadLayers = layers;
        status.OffloadTotal = total;

        status.NGpuLayersParsed = TryParseNGpuLayers(output, out var nGpu);
        status.NGpuLayers = nGpu;

        status.BlockCountParsed = TryParseBlockCount(output, out var blockCount);
        status.BlockCount = blockCount;

        status.HasAllLayersMarker = HasAllLayersMarker(output);

        // 10.12: n_gpu_layers=-1 + 全部层标记 → 视为 offload 已确认
        if (!status.OffloadLayersConfirmed && status.NGpuLayersParsed && status.NGpuLayers == -1 && status.HasAllLayersMarker)
        {
            status.OffloadLayersConfirmed = true;
        }

        status.CpuFallbackDetected = TryParseCpuFallback(output);

        return status;
    }
}

/// <summary>
/// GPU 日志解析结果
/// </summary>
public class GpuLogStatus
{
    /// <summary>Vulkan 后端是否确认加载</summary>
    public bool VulkanBackendConfirmed { get; set; }
    public string BackendName { get; set; } = "";

    /// <summary>设备名是否提取到</summary>
    public bool DeviceNameConfirmed { get; set; }
    public string DeviceName { get; set; } = "";

    /// <summary>offload 层数是否提取到</summary>
    public bool OffloadLayersConfirmed { get; set; }
    public int OffloadLayers { get; set; }
    public int OffloadTotal { get; set; }

    /// <summary>n_gpu_layers 参数是否解析到</summary>
    public bool NGpuLayersParsed { get; set; }
    public int NGpuLayers { get; set; }

    /// <summary>模型 block_count（总层数）是否解析到</summary>
    public bool BlockCountParsed { get; set; }
    public int BlockCount { get; set; }

    /// <summary>日志是否包含"全部层"标记</summary>
    public bool HasAllLayersMarker { get; set; }

    /// <summary>是否检测到 CPU fallback</summary>
    public bool CpuFallbackDetected { get; set; }

    /// <summary>
    /// 是否全部层 offload 到 GPU。
    /// 10.12 修正：不再硬编码 29/29，而是基于运行时总层数验证。
    /// 两种通过路径：
    /// 1. 显式 N/N layers（如 "29/29 layers"），N 等于 BlockCount（如果 BlockCount 已解析）
    /// 2. n_gpu_layers=-1 + "全部层" 标记 + BlockCount 已解析 + 无 CPU fallback
    /// </summary>
    public bool IsFullyOffloaded
    {
        get
        {
            // 确定要求的层数
            int required = BlockCountParsed && BlockCount > 0 ? BlockCount : SttSafetyChecker.RequiredOffloadLayers;

            // 路径1：显式 N/N layers，N > 0 且 N == Total 且 N == required
            if (OffloadLayersConfirmed && OffloadLayers > 0 && OffloadLayers == OffloadTotal && OffloadLayers == required)
            {
                return true;
            }

            // 路径2：n_gpu_layers=-1 + "全部层" + BlockCount 已知 + 无 CPU fallback
            if (NGpuLayersParsed && NGpuLayers == -1 && HasAllLayersMarker && BlockCountParsed && BlockCount > 0)
            {
                return !CpuFallbackDetected;
            }

            return false;
        }
    }

    /// <summary>
    /// 是否全部通过。
    /// 10.12 修正：基于运行时总层数验证全量 offload，不再硬编码 29/29。
    /// </summary>
    public bool IsFullyConfirmed =>
        VulkanBackendConfirmed &&
        DeviceNameConfirmed &&
        IsFullyOffloaded &&
        !CpuFallbackDetected;
}
