using System.Diagnostics;
using System.Management;
using System.Runtime.InteropServices;

namespace EngineeringManager.Api.Services.Stt;

/// <summary>
/// GPU 检测与 STT 引擎选择器。
/// VRAM 检测：仅使用注册表 qwMemorySize（可靠），禁止型号推断。
/// 适配器绑定：通过 DriverDesc 匹配 WMI GPU 名称，确保 VRAM 属于同一适配器。
/// fail-closed：无同一适配器匹配时返回 (0, "unknown")，绝不回退到其他适配器。
/// </summary>
public static class SttEngineSelector
{
    private static GpuInfo? _cached;

    public static GpuInfo Detect()
    {
        if (_cached != null) return _cached;

        var info = new GpuInfo();

        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
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

                // 优先用注册表获取准确 VRAM（WMI AdapterRAM 是 uint32，>4GB 会溢出报 0）
                // 绑定到当前 WMI GPU 名称，确保 VRAM 属于同一适配器
                var (registryVram, registryMethod) = DetectVramViaRegistry(name);

                // WMI AdapterRAM 是 boxed uint32，>4GB 会溢出报 0
                // 使用 ConvertWmiAdapterRam 纯函数安全转换（可单元测试）
                var vramMb = ConvertWmiAdapterRam(gpu["AdapterRAM"]);

                var isDiscrete = name.Contains("AMD", StringComparison.OrdinalIgnoreCase)
                    || name.Contains("Radeon", StringComparison.OrdinalIgnoreCase)
                    || name.Contains("NVIDIA", StringComparison.OrdinalIgnoreCase)
                    || name.Contains("GeForce", StringComparison.OrdinalIgnoreCase)
                    || name.Contains("RTX", StringComparison.OrdinalIgnoreCase)
                    || name.Contains("GTX", StringComparison.OrdinalIgnoreCase)
                    || name.Contains("RX 5", StringComparison.OrdinalIgnoreCase)
                    || name.Contains("RX 6", StringComparison.OrdinalIgnoreCase)
                    || name.Contains("RX 7", StringComparison.OrdinalIgnoreCase);

                if (isDiscrete && (name.Contains("Vega", StringComparison.OrdinalIgnoreCase)
                    || name.Contains("APU", StringComparison.OrdinalIgnoreCase)
                    || name.Contains("Radeon Graphics", StringComparison.OrdinalIgnoreCase)))
                {
                    isDiscrete = false;
                }

                int finalVramMb = 0;
                string detectionMethod = "unknown";

                if (isDiscrete)
                {
                    if (registryVram > 0)
                    {
                        finalVramMb = registryVram;
                        detectionMethod = registryMethod;
                    }
                    else if (vramMb > 0)
                    {
                        finalVramMb = vramMb;
                        detectionMethod = "wmi";
                    }
                }

                info.AllGpus.Add($"{name} ({finalVramMb}MB via {detectionMethod})");
                Console.WriteLine($"[SttEngineSelector] 发现显卡: {name}, VRAM={finalVramMb}MB (via {detectionMethod}), Discrete={isDiscrete}");

                if (isDiscrete && finalVramMb >= 2048)
                {
                    info.HasDiscreteGpu = true;
                    info.GpuName = name;
                    info.VramMb = finalVramMb;
                    info.VramDetectionMethod = detectionMethod;
                    info.SupportsVulkan = CheckVulkanDll();
                    if (!info.SupportsVulkan)
                        Console.WriteLine("[SttEngineSelector] 警告: ggml-vulkan.dll 未找到，Vulkan 不可用");
                }
                else if (isDiscrete && finalVramMb == 0)
                {
                    Console.WriteLine($"[SttEngineSelector] 独显 {name} 的 VRAM 无法可靠检测，fail-closed 禁止本地 STT");
                    info.HasDiscreteGpu = true;
                    info.GpuName = name;
                    info.VramMb = 0;
                    info.VramDetectionMethod = "unknown";
                    info.SupportsVulkan = false;
                }
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[SttEngineSelector] GPU 探测失败: {Common.Sanitize(ex.Message)}");
        }

        _cached = info;
        Console.WriteLine($"[SttEngineSelector] GPU 探测结果: HasDiscreteGpu={_cached.HasDiscreteGpu}, Name={_cached.GpuName}, VRAM={_cached.VramMb}MB (via {_cached.VramDetectionMethod}), Vulkan={_cached.SupportsVulkan}");
        return _cached;
    }

    /// <summary>
    /// 通过注册表读取指定显卡的显存（绕过 WMI uint32 溢出 bug）。
    /// 路径: HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-...}\*
    /// 下的 HardwareInformation.qwMemorySize (REG_QWORD, 单位 bytes)
    ///
    /// 适配器绑定：通过 DriverDesc 匹配 WMI 中的 GPU 名称，
    /// 确保读取的 VRAM 属于实际选中的适配器，而非任意显卡。
    ///
    /// fail-closed 原则：如果找不到同一适配器的匹配，返回 (0, "unknown")，
    /// 绝不回退到其他适配器的 VRAM 值。
    /// </summary>
    /// <param name="gpuName">WMI 检测到的 GPU 名称（用于匹配注册表 DriverDesc）</param>
    /// <returns>(VRAM in MB, detection method description)</returns>
    private static (int vramMb, string method) DetectVramViaRegistry(string gpuName = "")
    {
        try
        {
            using var key = Microsoft.Win32.Registry.LocalMachine.OpenSubKey(
                @"SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}");
            if (key == null) return (0, "unknown");

            // 收集所有适配器记录
            var adapters = new List<AdapterRecord>();
            foreach (var subKeyName in key.GetSubKeyNames())
            {
                Microsoft.Win32.RegistryKey? subKey = null;
                try
                {
                    subKey = key.OpenSubKey(subKeyName);
                }
                catch
                {
                    // Skip subkeys with restricted permissions (e.g., "Configuration", "Properties")
                    continue;
                }
                if (subKey == null) continue;
                using (subKey)
                {
                var driverDesc = subKey.GetValue("DriverDesc")?.ToString() ?? "";

                long? qwMemorySize = null;
                var memSize = subKey.GetValue("HardwareInformation.qwMemorySize");
                if (memSize is long longVal && longVal > 0)
                    qwMemorySize = longVal;

                int? dwordMemorySize = null;
                var dwordMem = subKey.GetValue("HardwareInformation.MemorySize");
                if (dwordMem is int intVal && intVal > 0)
                    dwordMemorySize = intVal;
                else if (dwordMem is uint uintVal && uintVal > 0)
                    dwordMemorySize = (int)Math.Min(uintVal, (uint)int.MaxValue);

                adapters.Add(new AdapterRecord(driverDesc, qwMemorySize, dwordMemorySize));
                } // end using subKey
            }

            // 委托给纯函数
            return SelectAdapterVram(adapters, gpuName);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[SttEngineSelector] 注册表 VRAM 探测失败: {Common.Sanitize(ex.Message)}");
            return (0, "unknown");
        }
    }

    /// <summary>
    /// 纯函数：从适配器记录列表中选择与指定 GPU 名称匹配的 VRAM。
    /// 不访问注册表，完全可测试。
    ///
    /// fail-closed 原则：
    /// - 无匹配 → (0, "unknown")
    /// - 非法 QWORD → 跳过该记录
    /// - 空 DriverDesc → 跳过该记录
    /// - 不回退到其他适配器的最大值
    /// </summary>
    public static (int vramMb, string method) SelectAdapterVram(
        IReadOnlyList<AdapterRecord> adapters, string gpuName)
    {
        if (string.IsNullOrEmpty(gpuName) || adapters == null || adapters.Count == 0)
            return (0, "unknown");

        int matchedVram = 0;
        bool hasNameMatch = false;

        foreach (var adapter in adapters)
        {
            // 空 DriverDesc → 跳过
            if (string.IsNullOrEmpty(adapter.DriverDesc))
                continue;

            // 计算 VRAM（优先 QWORD，退化 DWORD）
            int mb = 0;
            if (adapter.QwMemorySize is long qwVal && qwVal > 0)
            {
                mb = (int)(qwVal / (1024 * 1024));
            }
            else if (adapter.DwordMemorySize is int dwVal && dwVal > 0)
            {
                mb = dwVal / (1024 * 1024);
            }

            if (mb <= 0) continue;

            // 适配器名称绑定
            if (IsGpuNameMatch(gpuName, adapter.DriverDesc))
            {
                matchedVram = mb;
                hasNameMatch = true;
            }
        }

        if (hasNameMatch)
            return (matchedVram, "registry");

        return (0, "unknown");
    }

    /// <summary>
    /// 规范化 GPU 名称比较：提取厂商+型号关键标记后比较，避免宽松 Contains 误匹配。
    ///
    /// 规范化规则：
    /// 1. 转小写、去除括号内容、去除多余空格
    /// 2. 双向包含（规范化后）
    /// </summary>
    public static bool IsGpuNameMatch(string name1, string name2)
    {
        if (string.IsNullOrEmpty(name1) || string.IsNullOrEmpty(name2))
            return false;

        if (name1.Equals(name2, StringComparison.OrdinalIgnoreCase))
            return true;

        var norm1 = NormalizeGpuName(name1);
        var norm2 = NormalizeGpuName(name2);

        if (norm1 == norm2)
            return true;

        if (norm1.Contains(norm2, StringComparison.OrdinalIgnoreCase) ||
            norm2.Contains(norm1, StringComparison.OrdinalIgnoreCase))
            return true;

        return false;
    }

    /// <summary>
    /// 规范化 GPU 名称：转小写、去括号内容、压缩空格
    /// </summary>
    private static string NormalizeGpuName(string name)
    {
        var n = name.ToLowerInvariant().Trim();
        n = System.Text.RegularExpressions.Regex.Replace(n, @"\([^)]*\)", "");
        n = System.Text.RegularExpressions.Regex.Replace(n, @"\s+", " ").Trim();
        return n;
    }

    /// <summary>
    /// 检查 ggml-vulkan.dll 是否存在于 inference/bin 目录。
    /// </summary>
    private static bool CheckVulkanDll()
    {
        try
        {
            var engineDir = SttModelManager.GetEngineDir();
            var vulkanDll = Path.Combine(engineDir, "qwen_asr_gguf", "inference", "bin", "ggml-vulkan.dll");
            var exists = File.Exists(vulkanDll);
            Console.WriteLine($"[SttEngineSelector] Vulkan DLL 检查: {vulkanDll} → {(exists ? "存在" : "不存在")}");
            return exists;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[SttEngineSelector] Vulkan DLL 检查失败: {Common.Sanitize(ex.Message)}");
            return false;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 系统内存信息
    // ═══════════════════════════════════════════════════════════

    [StructLayout(LayoutKind.Sequential)]
    private struct MEMORYSTATUSEX
    {
        public uint dwLength;
        public uint dwMemoryLoad;
        public ulong ullTotalPhys;
        public ulong ullAvailPhys;
        public ulong ullTotalPageFile;
        public ulong ullAvailPageFile;
        public ulong ullTotalVirtual;
        public ulong ullAvailVirtual;
        public ulong ullAvailExtendedVirtual;
    }

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool GlobalMemoryStatusEx(ref MEMORYSTATUSEX lpBuffer);

    /// <summary>
    /// 获取系统内存使用率（百分比）
    /// </summary>
    public static double GetRamUsagePercent()
    {
        try
        {
            var memStatus = new MEMORYSTATUSEX { dwLength = (uint)Marshal.SizeOf<MEMORYSTATUSEX>() };
            if (GlobalMemoryStatusEx(ref memStatus))
            {
                return memStatus.dwMemoryLoad;
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[SttEngineSelector] 内存信息获取失败: {Common.Sanitize(ex.Message)}");
        }
        return 100; // fail-closed
    }

    /// <summary>
    /// 获取系统可用物理内存（字节）
    /// </summary>
    public static long GetAvailableMemoryBytes()
    {
        try
        {
            var memStatus = new MEMORYSTATUSEX { dwLength = (uint)Marshal.SizeOf<MEMORYSTATUSEX>() };
            if (GlobalMemoryStatusEx(ref memStatus))
            {
                return (long)memStatus.ullAvailPhys;
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[SttEngineSelector] 可用内存获取失败: {Common.Sanitize(ex.Message)}");
        }
        return 0; // fail-closed
    }

    /// <summary>
    /// 将 WMI AdapterRAM（boxed uint/int/long, 可能溢出为 0）安全转换为 MB。
    /// 使用 Convert.ToInt64 而非直接强转，避免 unboxing 异常。
    /// 注意：不再使用 (uint) 截断，因为对于 boxed long 值（>4GB）会归零。
    /// </summary>
    public static int ConvertWmiAdapterRam(object? vramBytes)
    {
        if (vramBytes == null) return 0;
        try
        {
            var bytes = Convert.ToInt64(vramBytes);
            if (bytes <= 0) return 0;
            var mb = bytes / (1024 * 1024);
            return (int)Math.Min(mb, 32768);
        }
        catch
        {
            return 0;
        }
    }

    /// <summary>
    /// 获取系统 Commit 信息（已用字节, 上限字节）
    /// </summary>
    public static (long committed, long commitLimit) GetCommitInfo()
    {
        try
        {
            var memStatus = new MEMORYSTATUSEX { dwLength = (uint)Marshal.SizeOf<MEMORYSTATUSEX>() };
            if (GlobalMemoryStatusEx(ref memStatus))
            {
                var committed = (long)(memStatus.ullTotalPageFile - memStatus.ullAvailPageFile);
                var commitLimit = (long)memStatus.ullTotalPageFile;
                return (committed, commitLimit);
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[SttEngineSelector] Commit 信息获取失败: {Common.Sanitize(ex.Message)}");
        }
        return (0, 0); // fail-closed
    }

    // ═══════════════════════════════════════════════════════════
    // 本地 STT 可用性检查
    // ═══════════════════════════════════════════════════════════

    public static bool CanUseLocalStt()
    {
        var gpu = Detect();

        if (!gpu.HasDiscreteGpu)
        {
            Console.WriteLine("[SttEngineSelector] 拒绝启动：未检测到独显");
            return false;
        }

        if (!gpu.SupportsVulkan)
        {
            Console.WriteLine("[SttEngineSelector] 拒绝启动：Vulkan 不可用");
            return false;
        }

        if (gpu.VramMb < SttSafetyChecker.MinVramMb)
        {
            Console.WriteLine($"[SttEngineSelector] 拒绝启动：显存不足 ({gpu.VramMb}MB < {SttSafetyChecker.MinVramMb}MB)");
            return false;
        }

        if (!SttSafetyChecker.IsVramDetectionReliable(gpu.VramDetectionMethod))
        {
            Console.WriteLine($"[SttEngineSelector] 拒绝启动：VRAM 检测方式不可靠 ({gpu.VramDetectionMethod})，需要 registry 或 dxgi");
            return false;
        }

        return true;
    }

    public static string GetSttStatus()
    {
        var gpu = Detect();

        if (!gpu.HasDiscreteGpu)
            return "未检测到独显，无法使用本地转写";

        if (!gpu.SupportsVulkan)
            return $"Vulkan 不可用（ggml-vulkan.dll 未找到），GPU: {gpu.GpuName}";

        if (gpu.VramMb < SttSafetyChecker.MinVramMb)
            return $"显存不足: {gpu.VramMb}MB (需要 ≥{SttSafetyChecker.MinVramMb}MB)，GPU: {gpu.GpuName}";

        if (!SttSafetyChecker.IsVramDetectionReliable(gpu.VramDetectionMethod))
            return $"显存检测方式不可靠（{gpu.VramDetectionMethod}），需要注册表或 DXGI 检测，禁止型号推断";

        return $"可用: {gpu.GpuName}, VRAM={gpu.VramMb}MB (via {gpu.VramDetectionMethod}), Vulkan=支持";
    }

    /// <summary>
    /// 返回本地 STT 不可用的原因（用于错误提示）。
    /// </summary>
    public static string GetUnavailableReason()
    {
        var gpu = Detect();

        if (!gpu.HasDiscreteGpu)
            return "未检测到独显";

        if (!gpu.SupportsVulkan)
            return $"Vulkan 不可用（ggml-vulkan.dll 未找到），GPU: {gpu.GpuName}";

        if (gpu.VramMb < SttSafetyChecker.MinVramMb)
            return $"显存不足: {gpu.VramMb}MB (需要 ≥{SttSafetyChecker.MinVramMb}MB)";

        if (!SttSafetyChecker.IsVramDetectionReliable(gpu.VramDetectionMethod))
            return $"显存检测方式不可靠（{gpu.VramDetectionMethod}），需要注册表或 DXGI 检测";

        // 全部检查通过 → 本地 STT 可用，无不可用原因（空串约定见 CanUseLocalStt 一致性）
        return "";
    }
}
