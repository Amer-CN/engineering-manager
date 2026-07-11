using System.Management;
using System.Runtime.InteropServices;

namespace EngineeringManager.Api.Services.Stt;

/// <summary>
/// STT 引擎选择器：探测独显、缓存结果、决定是否启用本地转写
/// 硬性规则：核显/无显卡 一律不启用本地转写
/// </summary>
public class SttEngineSelector
{
    private static GpuInfo? _cached;
    private static readonly object _lock = new();

    /// <summary>探测 GPU，结果缓存（整个进程生命周期不变）</summary>
    public static GpuInfo Detect()
    {
        lock (_lock)
        {
            if (_cached != null) return _cached;
            _cached = DetectInternal();
            Console.WriteLine($"[SttEngineSelector] GPU 探测结果: HasDiscreteGpu={_cached.HasDiscreteGpu}, Name={_cached.GpuName}, VRAM={_cached.VramMb}MB, Vulkan={_cached.SupportsVulkan}");
            return _cached;
        }
    }

    private static GpuInfo DetectInternal()
    {
        var info = new GpuInfo();

        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            // 非 Windows：暂不支持本地转写
            return info;
        }

        try
        {
            using var searcher = new ManagementObjectSearcher(
                "SELECT Name, AdapterRAM, VideoProcessor FROM Win32_VideoController");
            var gpus = searcher.Get();

            foreach (var gpu in gpus)
            {
                var name = gpu["Name"]?.ToString() ?? "";
                var vramBytes = gpu["AdapterRAM"];
                int vramMb = 0;
                if (vramBytes != null)
                {
                    // AdapterRAM is uint32, overflows for VRAM >4GB (wraps to 0 or small value)
                    // Known WMI bug: 8GB RX 580 reports 0. We compensate below.
                    try { vramMb = (int)Math.Min((uint)(long)vramBytes / (1024 * 1024), 32768); }
                    catch { }
                }

                // 判断是否独显
                var isDiscrete = name.Contains("AMD", StringComparison.OrdinalIgnoreCase)
                    || name.Contains("Radeon", StringComparison.OrdinalIgnoreCase)
                    || name.Contains("NVIDIA", StringComparison.OrdinalIgnoreCase)
                    || name.Contains("GeForce", StringComparison.OrdinalIgnoreCase)
                    || name.Contains("RTX", StringComparison.OrdinalIgnoreCase)
                    || name.Contains("GTX", StringComparison.OrdinalIgnoreCase)
                    || name.Contains("RX 5", StringComparison.OrdinalIgnoreCase)
                    || name.Contains("RX 6", StringComparison.OrdinalIgnoreCase)
                    || name.Contains("RX 7", StringComparison.OrdinalIgnoreCase);

                // 排除 AMD APU / Radeon Vega Mobile (核显)
                if (isDiscrete && (name.Contains("Vega", StringComparison.OrdinalIgnoreCase)
                    || name.Contains("APU", StringComparison.OrdinalIgnoreCase)
                    || name.Contains("Radeon Graphics", StringComparison.OrdinalIgnoreCase)))
                {
                    isDiscrete = false;
                }

                // WMI AdapterRAM uint32 溢出补偿：独显 VRAM 报 0 时给默认值
                if (isDiscrete && vramMb == 0)
                {
                    vramMb = 4096; // 独显至少 4GB，保守取 4096
                    Console.WriteLine($"[SttEngineSelector] VRAM 探测溢出（WMI uint32 bug），已补偿为 {vramMb}MB");
                }

                info.AllGpus.Add($"{name} ({vramMb}MB)");
                Console.WriteLine($"[SttEngineSelector] 发现显卡: {name}, VRAM={vramMb}MB, Discrete={isDiscrete}");

                if (isDiscrete && vramMb >= 2048)
                {
                    info.HasDiscreteGpu = true;
                    info.GpuName = name;
                    info.VramMb = vramMb;
                    // Vulkan 支持：AMD/NVIDIA 独显通常都支持 Vulkan
                    info.SupportsVulkan = true;
                }
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[SttEngineSelector] GPU 探测失败: {Common.Sanitize(ex.Message)}");
        }

        return info;
    }

    /// <summary>是否可以启用本地转写</summary>
    public static bool CanUseLocalStt()
    {
        var gpu = Detect();
        return gpu.HasDiscreteGpu && gpu.SupportsVulkan && gpu.VramMb >= 2048;
    }

    /// <summary>获取不可用原因（供前端展示）</summary>
    public static string GetUnavailableReason()
    {
        var gpu = Detect();
        if (gpu.AllGpus.Count == 0) return "未检测到显卡";
        if (!gpu.HasDiscreteGpu) return $"仅检测到核显（{string.Join(", ", gpu.AllGpus)}），本地语音转文字需要独立显卡";
        if (gpu.VramMb < 2048) return $"独显显存不足（{gpu.VramMb}MB），需要至少 2GB";
        if (!gpu.SupportsVulkan) return "独显不支持 Vulkan";
        return "";
    }
}
