namespace EngineeringManager.Api.Services.Stt;

/// <summary>
/// STT 安全检查器：纯逻辑类，无外部依赖，可完全单元测试。
/// 实现资源保险丝和 GPU fail-closed 的判定逻辑。
/// </summary>
public static class SttSafetyChecker
{
    // ═══════════════════════════════════════════════════════════
    // 资源保险丝阈值
    // ═══════════════════════════════════════════════════════════

    /// <summary>transcribe.exe 进程 Private Bytes 上限：6GB</summary>
    public const long MaxPrivateBytes = 6L * 1024 * 1024 * 1024;

    /// <summary>系统内存使用率告警线：80%（仅记录高内存告警，不单独杀进程）</summary>
    public const double MaxRamUsagePercent = 80.0;

    /// <summary>Commit 使用率上限：90%（硬熔断，杀进程）</summary>
    public const double MaxCommitPercent = 90.0;

    /// <summary>运行时最小可用物理内存：2GB（低于此值杀进程树）</summary>
    public const long RuntimeMinAvailableBytes = 2L * 1024 * 1024 * 1024;

    // ═══════════════════════════════════════════════════════════
    // GPU fail-closed 阈值
    // ═══════════════════════════════════════════════════════════

    /// <summary>最小显存要求：2048MB</summary>
    public const int MinVramMb = 2048;

    /// <summary>要求的 GPU offload 总层数：29（= block_count 28 + 1 输出层；仅在日志未解析到 block_count 时作为回退）</summary>
    public const int RequiredOffloadLayers = 29;

    /// <summary>GPU 正向确认超时：30 秒</summary>
    public static readonly TimeSpan GpuConfirmTimeout = TimeSpan.FromSeconds(30);

    // ═══════════════════════════════════════════════════════════
    // Pre-job 资源门控（启动子进程前）
    // ═══════════════════════════════════════════════════════════

    /// <summary>Pre-job RAM 信息记录线：仅记录百分比，不硬拒绝</summary>
    public const double PreJobRamInfoPercent = 70.0;

    /// <summary>Pre-job Commit 门控阈值：启动子进程前检查</summary>
    public const double PreJobMaxCommitPercent = 85.0;

    /// <summary>Pre-job 最小可用物理内存：2.5GB（Qwen3-ASR-1.7B q4 加载实测峰值约 1.1GB 系统内存；4GB 会在 16GB 内存、常规后台应用运行的机器上频繁误拒）</summary>
    public const long PreJobMinAvailableBytes = 2560L * 1024 * 1024;

    /// <summary>
    /// 启动子进程前的资源门控检查（绝对资源门控版）。
    /// RAM 百分比仅记录，不硬拒绝；Commit ≤ 85%；可用物理内存 ≥ 2.5GB。
    /// RAM、CommitLimit 或可用内存读取失败必须 fail closed，子进程启动数=0。
    /// 所有值必须实时读取，不得缓存。
    /// </summary>
    /// <param name="ramUsagePercent">系统内存使用率（0-100），仅记录</param>
    /// <param name="commitBytes">系统 Commit 已用（字节）</param>
    /// <param name="commitLimitBytes">系统 Commit 上限（字节）</param>
    /// <param name="availableMemoryBytes">系统可用物理内存（字节）</param>
    /// <returns>安全检查结果（IsOk=通过，ShouldFail=拒绝启动）</returns>
    public static SttSafetyResult CheckPreJobResources(
        double ramUsagePercent,
        long commitBytes,
        long commitLimitBytes,
        long availableMemoryBytes)
    {
        // 1. RAM 仅记录百分比，不硬拒绝
        if (ramUsagePercent > PreJobRamInfoPercent)
            Console.WriteLine($"[SttSafetyChecker] Pre-job RAM 信息: {ramUsagePercent:F1}% > {PreJobRamInfoPercent}%（仅记录，不拒绝）");

        // 2. 可用内存读取失败 (<=0) → fail-closed 拒绝
        if (availableMemoryBytes <= 0)
            return SttSafetyResult.Fail(
                "Pre-job 可用内存门控: 读取失败(<=0)，fail-closed 拒绝启动子进程");

        // 3. 可用内存 < 4GB → 拒绝
        if (availableMemoryBytes < PreJobMinAvailableBytes)
            return SttSafetyResult.Fail(
                $"Pre-job 可用内存门控: {availableMemoryBytes / (1024 * 1024)}MB < {PreJobMinAvailableBytes / (1024 * 1024)}MB，拒绝启动子进程");

        // 4. Commit > 85% → 拒绝；CommitLimit<=0 表示获取失败 → fail-closed 拒绝
        if (commitLimitBytes <= 0)
            return SttSafetyResult.Fail(
                "Pre-job Commit 门控: CommitLimit 获取失败(=0)，fail-closed 拒绝启动子进程");
        var commitPercent = (double)commitBytes / commitLimitBytes * 100;
        if (commitPercent > PreJobMaxCommitPercent)
            return SttSafetyResult.Fail(
                $"Pre-job Commit 门控: {commitPercent:F1}% > {PreJobMaxCommitPercent}%，拒绝启动子进程");

        return SttSafetyResult.Pass(
            $"Pre-job 通过: RAM={ramUsagePercent:F1}%（信息）, Commit={commitPercent:F1}%, Avail={availableMemoryBytes / (1024 * 1024)}MB");
    }

    // ═══════════════════════════════════════════════════════════
    // 资源保险丝检查（运行时）
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 检查进程资源使用是否超过安全阈值（绝对资源门控版）。
    /// 硬熔断条件：Private Bytes ≥ 6GB、Commit ≥ 90%、可用物理内存 < 2GB。
    /// RAM ≥ 80% 仅记录高内存告警，不再单独杀进程。
    /// 任一硬熔断触发即返回 Kill，调用方应杀掉进程树并标记失败。
    /// </summary>
    /// <param name="privateBytes">进程 PrivateMemorySize64（字节）</param>
    /// <param name="ramUsagePercent">系统内存使用率（0-100），仅告警</param>
    /// <param name="commitBytes">系统 Commit 已用（字节）</param>
    /// <param name="commitLimitBytes">系统 Commit 上限（字节）</param>
    /// <param name="availableMemoryBytes">系统可用物理内存（字节）</param>
    /// <returns>安全检查结果</returns>
    public static SttSafetyResult CheckResources(
        long privateBytes,
        double ramUsagePercent,
        long commitBytes,
        long commitLimitBytes,
        long availableMemoryBytes)
    {
        var privateMb = privateBytes / (1024 * 1024);
        var commitPercent = commitLimitBytes > 0
            ? (double)commitBytes / commitLimitBytes * 100
            : 0;

        // 1. Private Bytes ≥ 6GB → 杀进程
        if (privateBytes >= MaxPrivateBytes)
        {
            return SttSafetyResult.Kill(
                $"进程 Private Bytes {privateMb}MB 超过上限 {MaxPrivateBytes / (1024 * 1024)}MB");
        }

        // 2. 可用物理内存 < 2GB → 杀进程（fail-closed：读取失败=0 也杀）
        if (availableMemoryBytes < RuntimeMinAvailableBytes)
        {
            var availMb = availableMemoryBytes / (1024 * 1024);
            return SttSafetyResult.Kill(
                $"可用物理内存 {availMb}MB 低于运行时最小值 {RuntimeMinAvailableBytes / (1024 * 1024)}MB");
        }

        // 3. Commit 使用率 ≥ 90% → 杀进程（防止系统级 OOM）
        if (commitLimitBytes > 0 && commitPercent >= MaxCommitPercent)
        {
            return SttSafetyResult.Kill(
                $"系统 Commit 使用率 {commitPercent:F1}% 超过 {MaxCommitPercent}% 阈值");
        }

        // 4. RAM ≥ 80% → 仅记录高内存告警，不杀进程
        if (ramUsagePercent >= MaxRamUsagePercent)
        {
            Console.Error.WriteLine($"[SttSafetyChecker] 高内存告警: RAM={ramUsagePercent:F1}% ≥ {MaxRamUsagePercent}%（仅告警，不杀进程）");
        }

        return SttSafetyResult.Continue(
            $"PrivateBytes={privateMb}MB, RAM={ramUsagePercent:F1}%（告警线{MaxRamUsagePercent}%）, Commit={commitPercent:F1}%, Avail={availableMemoryBytes / (1024 * 1024)}MB");
    }

    // ═══════════════════════════════════════════════════════════
    // GPU fail-closed 检查
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 检查 GPU 是否满足 fail-closed 条件。
    /// 所有条件必须正向确认，任一缺失即返回 Fail。
    /// 10.12 修正：offload 层数不再硬编码 29/29，改为基于运行时总层数验证。
    /// </summary>
    /// <param name="hasDiscreteGpu">是否检测到独显</param>
    /// <param name="supportsVulkan">Vulkan DLL 是否存在</param>
    /// <param name="vramMb">显存大小（MB）</param>
    /// <param name="vramDetectionMethod">显存检测方式（"registry"/"dxgi"/"unknown"）</param>
    /// <param name="vulkanBackendConfirmed">运行时是否确认 Vulkan 后端加载</param>
    /// <param name="offloadConfirmed">是否确认模型层 offload 到 VRAM</param>
    /// <param name="offloadLayers">offload 的层数（null=未检测到）</param>
    /// <param name="offloadTotal">日志中的总层数（null=未检测到）</param>
    /// <param name="confirmedDeviceName">运行时日志中解析到的设备名（null=未检测到）</param>
    /// <param name="expectedDeviceName">预检选中的 GPU 设备名（如 "RX 580"）</param>
    /// <param name="nGpuLayers">n_gpu_layers 参数值（null=未解析到，-1=全部层）</param>
    /// <param name="blockCount">模型 block_count（总层数，null=未解析到）</param>
    /// <param name="hasAllLayersMarker">日志是否包含"全部层"标记</param>
    public static SttSafetyResult CheckGpuFailClosed(
        bool hasDiscreteGpu,
        bool supportsVulkan,
        int vramMb,
        string vramDetectionMethod,
        bool vulkanBackendConfirmed,
        bool offloadConfirmed,
        int? offloadLayers,
        int? offloadTotal = null,
        string? confirmedDeviceName = null,
        string? expectedDeviceName = null,
        int? nGpuLayers = null,
        int? blockCount = null,
        bool hasAllLayersMarker = false)
    {
        // 1. 必须有独显
        if (!hasDiscreteGpu)
            return SttSafetyResult.Fail("未检测到独显");

        // 2. Vulkan DLL 必须存在
        if (!supportsVulkan)
            return SttSafetyResult.Fail("Vulkan 不可用 (ggml-vulkan.dll 未找到)");

        // 3. 显存必须 ≥ 2GB
        if (vramMb < MinVramMb)
            return SttSafetyResult.Fail($"显存不足: {vramMb}MB (需要 ≥{MinVramMb}MB)");

        // 4. 显存必须来自可靠检测（注册表/DXGI），不能是型号推断
        if (!IsVramDetectionReliable(vramDetectionMethod))
            return SttSafetyResult.Fail(
                $"显存检测方式不可靠: {vramDetectionMethod} (需要 registry 或 dxgi，禁止型号推断)");

        // 5. 运行时必须正向确认 Vulkan 后端加载
        if (!vulkanBackendConfirmed)
            return SttSafetyResult.Fail("30秒内未确认 Vulkan 后端加载");

        // 6. 必须确认模型层 offload 到 VRAM
        if (!offloadConfirmed)
            return SttSafetyResult.Fail("未确认模型层 offload 到 VRAM");

        // 7. 10.12 修正：基于运行时总层数验证全量 offload
        // 两种通过路径：
        // a) 显式 N/N layers（N > 0 且 N == Total），且：
        //    - BlockCount 已知 → N == BlockCount + 1（llama.cpp 总层数 = 块数 + 输出层）
        //    - BlockCount 未知 → N == RequiredOffloadLayers（旧版 29 回退）
        // b) n_gpu_layers=-1 + "全部层"标记 + BlockCount 已知 + 无 CPU fallback
        bool isFullyOffloaded = false;
        string offloadDetail = "";

        // 确定要求的层数（BlockCount+1 优先，否则回退旧版 29）
        int requiredLayers = blockCount is int bc && bc > 0 ? bc + 1 : RequiredOffloadLayers;

        // 路径 a：显式 N/N
        if (offloadLayers is int ol && offloadTotal is int ot && ol > 0 && ol == ot)
        {
            if (ol != requiredLayers)
            {
                return SttSafetyResult.Fail(
                    $"offload 层数 {ol}/{ot} 不等于要求层数 {requiredLayers}" +
                    (blockCount is int bc2 && bc2 > 0 ? $" (block_count={bc2}+1 输出层，实际 {ol}/{bc2 + 1})" : " (旧版 29 回退)") +
                    "，fail-closed");
            }
            isFullyOffloaded = true;
            offloadDetail = $"{ol}/{ot} layers (required={requiredLayers})";
        }

        // 路径 b：n_gpu_layers=-1 + 全部层标记
        if (!isFullyOffloaded && nGpuLayers == -1 && hasAllLayersMarker)
        {
            if (blockCount is int bc3 && bc3 > 0)
            {
                isFullyOffloaded = true;
                offloadDetail = $"n_gpu_layers=-1 (全部层), block_count={bc3}";
            }
            else
            {
                return SttSafetyResult.Fail(
                    "n_gpu_layers=-1 + 全部层标记，但 block_count 未解析到，无法确认全量 offload，fail-closed");
            }
        }

        if (!isFullyOffloaded)
        {
            var layersStr = offloadLayers?.ToString() ?? "null";
            var totalStr = offloadTotal?.ToString() ?? "null";
            var nGpuStr = nGpuLayers?.ToString() ?? "null";
            var blockStr = blockCount?.ToString() ?? "null";
            return SttSafetyResult.Fail(
                $"offload 未证明全量: layers={layersStr}/{totalStr}, n_gpu_layers={nGpuStr}, block_count={blockStr}, allLayers={hasAllLayersMarker}。" +
                $"要求 {requiredLayers}/{requiredLayers} 或 n_gpu_layers=-1+全部层+BlockCount已知，fail-closed");
        }

        // 8. 运行时设备名必须与预检选中适配器绑定（规范化匹配）
        if (string.IsNullOrEmpty(confirmedDeviceName))
            return SttSafetyResult.Fail("运行时未检测到 GPU 设备名（日志中无设备标识）");
        if (!string.IsNullOrEmpty(expectedDeviceName) &&
            !SttEngineSelector.IsGpuNameMatch(confirmedDeviceName, expectedDeviceName))
            return SttSafetyResult.Fail(
                $"运行时设备名 '{confirmedDeviceName}' 与预检设备 '{expectedDeviceName}' 不匹配");

        return SttSafetyResult.Pass(
            $"GPU 验证通过: 独显+Vulkan+VRAM({vramMb}MB via {vramDetectionMethod})+device({confirmedDeviceName})+offload({offloadDetail})");
    }

    /// <summary>
    /// 检查 VRAM 检测方式是否可靠。
    /// 只有 registry 和 dxgi 被视为可靠；型号推断 ("inferred") 不可接受。
    /// </summary>
    public static bool IsVramDetectionReliable(string detectionMethod)
    {
        return detectionMethod is "registry" or "dxgi";
    }

    // ═══════════════════════════════════════════════════════════
    // GPU 确认超时检查
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 检查 GPU 确认是否超时。
    /// </summary>
    /// <param name="elapsed">自进程启动以来经过的时间</param>
    /// <param name="gpuConfirmed">是否已确认 GPU</param>
    public static SttSafetyResult CheckGpuConfirmTimeout(TimeSpan elapsed, bool gpuConfirmed)
    {
        if (gpuConfirmed)
            return SttSafetyResult.Continue("GPU 已确认");

        if (elapsed >= GpuConfirmTimeout)
            return SttSafetyResult.Kill(
                $"GPU fail-closed: {GpuConfirmTimeout.TotalSeconds:F0}秒内未检测到 Vulkan 后端，杀进程拒绝运行");

        return SttSafetyResult.Continue(
            $"GPU 确认等待中... {elapsed.TotalSeconds:F0}/{GpuConfirmTimeout.TotalSeconds:F0}s");
    }

    // ═══════════════════════════════════════════════════════════
    // 单实例检查
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 检查是否已有转写进程在运行（单实例约束）。
    /// </summary>
    /// <param name="isRunning">当前是否有进程在运行</param>
    public static SttSafetyResult CheckSingleInstance(bool isRunning)
    {
        if (isRunning)
            return SttSafetyResult.Fail("已有转写进程在运行，禁止并发模型加载");

        return SttSafetyResult.Pass("单实例检查通过");
    }
}

/// <summary>
/// 安全检查结果
/// </summary>
public class SttSafetyResult
{
    /// <summary>是否应杀掉进程</summary>
    public bool ShouldKill { get; init; }

    /// <summary>是否应拒绝任务（fail-closed）</summary>
    public bool ShouldFail { get; init; }

    /// <summary>结果消息</summary>
    public string Message { get; init; } = "";

    /// <summary>是否通过（无操作）</summary>
    public bool IsOk => !ShouldKill && !ShouldFail;

    public static SttSafetyResult Continue(string msg) => new() { Message = msg };
    public static SttSafetyResult Kill(string msg) => new() { ShouldKill = true, Message = msg };
    public static SttSafetyResult Fail(string msg) => new() { ShouldFail = true, Message = msg };
    public static SttSafetyResult Pass(string msg) => new() { Message = msg };

    public override string ToString() =>
        ShouldKill ? $"[KILL] {Message}" :
        ShouldFail ? $"[FAIL] {Message}" :
        $"[OK] {Message}";
}
