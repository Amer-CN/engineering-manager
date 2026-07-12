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
            // 优先用 DXGI 获取准确 VRAM（WMI AdapterRAM 是 uint32，>4GB 会溢出报 0）
            var dxgiVram = DetectVramViaRegistry();

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

                // WMI AdapterRAM uint32 溢出补偿：优先用注册表/DXGI 值，其次按显卡名推断
                if (isDiscrete && vramMb == 0)
                {
                    // 优先用注册表查到的准确值
                    if (dxgiVram > 0)
                    {
                        vramMb = dxgiVram;
                        Console.WriteLine($"[SttEngineSelector] VRAM 从注册表获取: {vramMb}MB");
                    }
                    else
                    {
                        // 按显卡名推断显存
                        vramMb = InferVramFromName(name);
                        Console.WriteLine($"[SttEngineSelector] VRAM 探测溢出（WMI uint32 bug），按型号推断为 {vramMb}MB");
                    }
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

    /// <summary>
    /// 通过注册表读取显卡显存（绕过 WMI uint32 溢出 bug）
    /// 路径: HKLM\SYSTEM\CurrentControlSet\Enum\PCI\*\*\Device Parameters\VideoMemory
    /// 或通过 DXGI Adapter 的 DedicatedVideoMemory
    /// </summary>
    private static int DetectVramViaRegistry()
    {
        try
        {
            // 方法1: 通过 dxdiag 不行（需要等进程退出），改用注册表
            // 注册表 HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\*
            // 下的 HardwareInformation.qwMemorySize (REG_QWORD, 单位 bytes)
            using var key = Microsoft.Win32.Registry.LocalMachine.OpenSubKey(
                @"SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}");
            if (key == null) return 0;

            int bestVram = 0;
            foreach (var subKeyName in key.GetSubKeyNames())
            {
                using var subKey = key.OpenSubKey(subKeyName);
                if (subKey == null) continue;

                // HardwareInformation.qwMemorySize 是 REG_QWORD (8 bytes)，准确反映 >4GB VRAM
                var memSize = subKey.GetValue("HardwareInformation.qwMemorySize");
                if (memSize is long longVal && longVal > 0)
                {
                    var mb = (int)(longVal / (1024 * 1024));
                    if (mb > bestVram) bestVram = mb;
                    continue;
                }

                // 退化: HardwareInformation.MemorySize 是 REG_DWORD (uint32)，>4GB 也会溢出
                var dwordMem = subKey.GetValue("HardwareInformation.MemorySize");
                if (dwordMem is int intVal && intVal > 0)
                {
                    var mb = intVal / (1024 * 1024);
                    if (mb > bestVram) bestVram = mb;
                }
            }
            return bestVram;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[SttEngineSelector] 注册表 VRAM 探测失败: {Common.Sanitize(ex.Message)}");
            return 0;
        }
    }

    /// <summary>
    /// 按显卡型号名推断显存大小（WMI uint32 溢出且注册表也失败时的兜底方案）
    /// </summary>
    private static int InferVramFromName(string name)
    {
        // RX 580 系列
        if (name.Contains("RX 580", StringComparison.OrdinalIgnoreCase))
            return 8192; // RX 580 通常 8GB（2048SP 也是 8GB）
        // RX 570/590 系列
        if (name.Contains("RX 570", StringComparison.OrdinalIgnoreCase))
            return 8192;
        if (name.Contains("RX 590", StringComparison.OrdinalIgnoreCase))
            return 8192;
        // RX 5600/5700 系列
        if (name.Contains("RX 5600", StringComparison.OrdinalIgnoreCase))
            return 6144;
        if (name.Contains("RX 5700", StringComparison.OrdinalIgnoreCase))
            return 8192;
        // RX 6000 系列
        if (name.Contains("RX 6600", StringComparison.OrdinalIgnoreCase))
            return 8192;
        if (name.Contains("RX 6700", StringComparison.OrdinalIgnoreCase))
            return 12288;
        if (name.Contains("RX 6800", StringComparison.OrdinalIgnoreCase))
            return 16384;
        if (name.Contains("RX 6900", StringComparison.OrdinalIgnoreCase))
            return 16384;
        // RX 7000 系列
        if (name.Contains("RX 7600", StringComparison.OrdinalIgnoreCase))
            return 8192;
        if (name.Contains("RX 7700", StringComparison.OrdinalIgnoreCase))
            return 12288;
        if (name.Contains("RX 7800", StringComparison.OrdinalIgnoreCase))
            return 16384;
        if (name.Contains("RX 7900", StringComparison.OrdinalIgnoreCase))
            return 20480;
        // NVIDIA
        if (name.Contains("RTX 4090", StringComparison.OrdinalIgnoreCase))
            return 24576;
        if (name.Contains("RTX 4080", StringComparison.OrdinalIgnoreCase))
            return 16384;
        if (name.Contains("RTX 4070", StringComparison.OrdinalIgnoreCase))
            return 12288;
        if (name.Contains("RTX 4060", StringComparison.OrdinalIgnoreCase))
            return 8192;
        if (name.Contains("RTX 3090", StringComparison.OrdinalIgnoreCase))
            return 24576;
        if (name.Contains("RTX 3080", StringComparison.OrdinalIgnoreCase))
            return 10240;
        if (name.Contains("RTX 3070", StringComparison.OrdinalIgnoreCase))
            return 8192;
        if (name.Contains("RTX 3060", StringComparison.OrdinalIgnoreCase))
            return 12288;
        if (name.Contains("RTX 3050", StringComparison.OrdinalIgnoreCase))
            return 8192;
        // 兜底
        return 4096;
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
