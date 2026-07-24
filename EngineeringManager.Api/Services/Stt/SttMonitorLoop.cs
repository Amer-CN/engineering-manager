using System.Diagnostics;

namespace EngineeringManager.Api.Services.Stt;

/// <summary>
/// STT 监控循环：使用 ISttTelemetryProvider 执行资源保险丝和 GPU fail-closed 检查。
/// 此类是可测试的运行时接线层 — 在 fake telemetry 上验证监控逻辑。
/// </summary>
public class SttMonitorLoop
{
    private readonly ISttTelemetryProvider _telemetry;

    public bool GpuConfirmed { get; private set; }
    public bool OffloadConfirmed { get; private set; }
    public int? OffloadLayers { get; private set; }
    public int? OffloadTotal { get; private set; }
    public string? ConfirmedDeviceName { get; private set; }
    public bool CpuFallbackDetected { get; private set; }
    public bool WasKilled { get; private set; }
    public string LastMonitorLog { get; private set; } = "";

    public SttMonitorLoop(ISttTelemetryProvider telemetry)
    {
        _telemetry = telemetry;
    }

    /// <summary>
    /// 执行一次监控检查。
    /// 返回 null 表示正常继续，返回非 null 表示应停止（含错误消息）。
    /// </summary>
    public string? CheckOnce(DateTime startTime)
    {
        if (_telemetry.HasProcessExited)
            return null; // 进程已退出，不需要监控

        // 1. 获取累积输出，解析 GPU 状态
        var output = _telemetry.GetAccumulatedOutput();
        var gpuStatus = GpuLogParser.ParseAll(output);

        // 更新内部状态
        if (!GpuConfirmed && gpuStatus.VulkanBackendConfirmed)
        {
            GpuConfirmed = true;
            Console.WriteLine($"[SttEngine] GPU 确认: {gpuStatus.BackendName}");
        }

        if (!OffloadConfirmed && gpuStatus.OffloadLayersConfirmed)
        {
            OffloadConfirmed = true;
            OffloadLayers = gpuStatus.OffloadLayers;
            OffloadTotal = gpuStatus.OffloadTotal;
            Console.WriteLine($"[SttEngine] GPU offload 确认: {gpuStatus.OffloadLayers}/{gpuStatus.OffloadTotal}");
        }

        if (string.IsNullOrEmpty(ConfirmedDeviceName) && gpuStatus.DeviceNameConfirmed)
        {
            ConfirmedDeviceName = gpuStatus.DeviceName;
            Console.WriteLine($"[SttEngine] GPU 设备名确认: {gpuStatus.DeviceName}");
        }

        if (gpuStatus.CpuFallbackDetected)
        {
            CpuFallbackDetected = true;
            Console.Error.WriteLine("[SttEngine] 检测到 CPU fallback，拒绝结果");
            _telemetry.KillProcessTree();
            WasKilled = true;
            return "GPU fail-closed: 检测到 CPU fallback，结果被拒绝";
        }

        // 2. GPU 确认超时检查
        var elapsed = DateTime.UtcNow - startTime;
        var gpuTimeoutCheck = SttSafetyChecker.CheckGpuConfirmTimeout(elapsed, GpuConfirmed);
        if (gpuTimeoutCheck.ShouldKill)
        {
            _telemetry.KillProcessTree();
            WasKilled = true;
            return gpuTimeoutCheck.Message;
        }

        // 3. 资源保险丝（绝对资源门控版）
        var privateBytes = _telemetry.GetPrivateBytes();
        var ramPercent = _telemetry.GetRamUsagePercent();
        var (committed, commitLimit) = _telemetry.GetCommitInfo();
        var availableMemory = _telemetry.GetAvailableMemoryBytes();

        var resourceCheck = SttSafetyChecker.CheckResources(
            privateBytes, ramPercent, committed, commitLimit, availableMemory);

        if (resourceCheck.ShouldKill)
        {
            _telemetry.KillProcessTree();
            WasKilled = true;
            return $"资源保险丝: {resourceCheck.Message}";
        }

        // 4. 记录监控日志
        var privateMb = privateBytes / (1024 * 1024);
        var commitMb = committed / (1024 * 1024);
        var commitLimitMb = commitLimit / (1024 * 1024);
        var availMb = availableMemory / (1024 * 1024);
        LastMonitorLog = $"PID={_telemetry.ProcessId}, PrivateBytes={privateMb}MB, RAM={ramPercent:F1}%, Commit={commitMb}/{commitLimitMb}MB, Avail={availMb}MB, GPU={(GpuConfirmed ? "OK" : "pending")}, Offload={(OffloadConfirmed ? $"{OffloadLayers}" : "pending")}";
        Console.WriteLine($"[SttEngine] 监控: {LastMonitorLog}");

        return null; // 正常继续
    }

    /// <summary>
    /// 最终 GPU 验证（进程结束后调用）。
    /// 使用 GpuLogParser 严格解析，通过 SttSafetyChecker.CheckGpuFailClosed 验证。
    /// 可注入 GpuInfo 用于测试（默认从 SttEngineSelector.Detect() 获取）。
    /// </summary>
    public SttSafetyResult FinalGpuVerification(GpuInfo? gpuInfo = null)
    {
        // 排空日志文件剩余内容（进程退出后日志可能有延迟 flush）
        _telemetry.DrainLogContent();

        var output = _telemetry.GetAccumulatedOutput();
        var gpuStatus = GpuLogParser.ParseAll(output);

        var info = gpuInfo ?? SttEngineSelector.Detect();

        return SttSafetyChecker.CheckGpuFailClosed(
            info.HasDiscreteGpu,
            info.SupportsVulkan,
            info.VramMb,
            info.VramDetectionMethod,
            gpuStatus.VulkanBackendConfirmed,
            gpuStatus.OffloadLayersConfirmed,
            gpuStatus.OffloadLayersConfirmed ? gpuStatus.OffloadLayers : null,
            gpuStatus.OffloadLayersConfirmed ? gpuStatus.OffloadTotal : null,
            gpuStatus.DeviceNameConfirmed ? gpuStatus.DeviceName : null,
            info.GpuName,
            gpuStatus.NGpuLayersParsed ? gpuStatus.NGpuLayers : null,
            gpuStatus.BlockCountParsed ? gpuStatus.BlockCount : null,
            gpuStatus.HasAllLayersMarker);
    }
}
