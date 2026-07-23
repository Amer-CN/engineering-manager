using System.Diagnostics;
using System.Text;

namespace EngineeringManager.Api.Services.Stt;

/// <summary>
/// STT 进程遥测接口：提供资源快照、进程输出和进程控制。
/// 可注入 fake 实现进行运行时接线测试，不依赖真实进程。
/// </summary>
public interface ISttTelemetryProvider
{
    /// <summary>获取进程 PrivateMemorySize64（字节）</summary>
    long GetPrivateBytes();

    /// <summary>获取系统内存使用率（0-100）</summary>
    double GetRamUsagePercent();

    /// <summary>获取系统 Commit 信息（已用字节, 上限字节）</summary>
    (long committed, long commitLimit) GetCommitInfo();

    /// <summary>获取系统可用物理内存（字节）</summary>
    long GetAvailableMemoryBytes();

    /// <summary>获取已累积的 stdout/stderr/日志文件 输出（线程安全快照）</summary>
    string GetAccumulatedOutput();

    /// <summary>最终排空：进程退出后强制读取日志文件剩余内容</summary>
    void DrainLogContent();

    /// <summary>进程是否已退出</summary>
    bool HasProcessExited { get; }

    /// <summary>进程 ID</summary>
    int ProcessId { get; }

    /// <summary>杀掉整个进程树</summary>
    void KillProcessTree();
}

/// <summary>
/// 日志文件增量读取器：从指定文件路径增量读取日志内容。
/// 完全可测试，不依赖 Process 对象。
///
/// 防护措施：
/// - 陈旧日志：构造函数记录初始 offset，只读新内容
/// - 截断/轮转：fileInfo.Length < offset → 重置 offset=0，清空 builder
/// - 半行：只取到最后一个 \n，剩余字节下次读
/// - 延迟 flush：Drain() 等待后强制再读一次
/// - 文件不存在/异常：安全跳过，不抛异常
/// </summary>
public class LogFileIncrementalReader
{
    private readonly string? _logFilePath;
    private readonly StringBuilder _logBuilder = new();
    private long _logOffset;
    private bool _drained;

    /// <summary>当前读取 offset（字节）</summary>
    public long CurrentOffset => _logOffset;

    /// <summary>
    /// 为新运行准备日志文件：重命名旧文件到 .bak，失败则删除，再失败则返回 false。
    /// 成功后 reader 从 offset 0 开始读取本轮新内容，杜绝陈旧日志误放行。
    /// 必须在获取单实例锁后、启动模型前调用。
    /// </summary>
    public static bool PrepareForNewRun(string? logFilePath)
    {
        if (string.IsNullOrEmpty(logFilePath))
            return true; // 无日志文件，无需准备

        // 确保目录存在
        var dir = Path.GetDirectoryName(logFilePath);
        if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
        {
            try { Directory.CreateDirectory(dir); } catch { }
        }

        if (!File.Exists(logFilePath))
            return true; // 文件不存在，无需准备

        // 先尝试重命名（保留旧日志）
        try
        {
            var backupPath = logFilePath + "." + DateTime.UtcNow.ToString("yyyyMMddHHmmss") + ".bak";
            File.Move(logFilePath, backupPath);
            return true;
        }
        catch
        {
            // 重命名失败（文件被锁定），尝试删除
            try
            {
                File.Delete(logFilePath);
                return true;
            }
            catch
            {
                // 删除也失败 — fail closed
                Console.Error.WriteLine($"[SttEngine] 日志文件准备失败（重命名/删除均失败），fail closed: {logFilePath}");
                return false;
            }
        }
    }

    /// <summary>已累积的日志内容</summary>
    public string GetContent()
    {
        lock (_logBuilder)
        {
            return _logBuilder.ToString();
        }
    }

    public LogFileIncrementalReader(string? logFilePath)
    {
        _logFilePath = logFilePath;

        if (!string.IsNullOrEmpty(_logFilePath))
        {
            try
            {
                if (File.Exists(_logFilePath))
                {
                    _logOffset = new FileInfo(_logFilePath).Length;
                }
            }
            catch { }
        }
    }

    /// <summary>
    /// 增量读取日志文件新内容。
    /// </summary>
    public void ReadIncremental()
    {
        if (string.IsNullOrEmpty(_logFilePath) || !File.Exists(_logFilePath))
            return;

        var fileInfo = new FileInfo(_logFilePath);

        // 截断/轮转
        if (fileInfo.Length < _logOffset)
        {
            _logOffset = 0;
            lock (_logBuilder)
            {
                _logBuilder.Clear();
            }
        }

        if (fileInfo.Length == _logOffset)
            return;

        using var fs = new FileStream(_logFilePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
        fs.Seek(_logOffset, SeekOrigin.Begin);
        using var reader = new StreamReader(fs);

        var newContent = reader.ReadToEnd();
        if (string.IsNullOrEmpty(newContent))
            return;

        // 半行处理：只取到最后一个完整换行
        var lastNewline = newContent.LastIndexOf('\n');
        if (lastNewline < 0)
        {
            // 没有完整行 — 等待下次读取
            return;
        }

        string completeContent;
        if (lastNewline == newContent.Length - 1)
        {
            // 内容以换行结尾 — 全部完整
            completeContent = newContent;
            _logOffset = fileInfo.Length;
        }
        else
        {
            // 有半行 — 只取到最后一个换行
            completeContent = newContent.Substring(0, lastNewline + 1);
            _logOffset += lastNewline + 1;
        }

        lock (_logBuilder)
        {
            _logBuilder.Append(completeContent);
        }
    }

    /// <summary>
    /// 最终排空：等待 flush 后强制再读一次。
    /// </summary>
    public void Drain(int waitMs = 200)
    {
        if (_drained) return;
        _drained = true;

        if (!string.IsNullOrEmpty(_logFilePath))
        {
            try
            {
                Thread.Sleep(waitMs);
                ReadIncremental();
            }
            catch { }
        }
    }

    /// <summary>
    /// 重置排空状态（用于测试多次调用）。
    /// </summary>
    public void ResetDrain() => _drained = false;
}

/// <summary>
/// 真实遥测实现：从 Process 对象和系统 API 获取资源数据。
/// 同时读取 llama.cpp 日志文件（logs/latest.log）的增量内容。
/// </summary>
public class SttTelemetryProvider : ISttTelemetryProvider
{
    private readonly Process _process;
    private readonly object _outputLock;
    private readonly StringBuilder _outputBuilder;
    private readonly StringBuilder _errorBuilder;
    private readonly LogFileIncrementalReader _logReader;

    public SttTelemetryProvider(
        Process process,
        object outputLock,
        StringBuilder outputBuilder,
        StringBuilder errorBuilder,
        string? logFilePath = null)
    {
        _process = process;
        _outputLock = outputLock;
        _outputBuilder = outputBuilder;
        _errorBuilder = errorBuilder;
        _logReader = new LogFileIncrementalReader(logFilePath);
    }

    public long GetPrivateBytes()
    {
        _process.Refresh();
        return _process.PrivateMemorySize64;
    }

    public double GetRamUsagePercent() => SttEngineSelector.GetRamUsagePercent();

    public (long committed, long commitLimit) GetCommitInfo() => SttEngineSelector.GetCommitInfo();

    public long GetAvailableMemoryBytes() => SttEngineSelector.GetAvailableMemoryBytes();

    public string GetAccumulatedOutput()
    {
        _logReader.ReadIncremental();

        lock (_outputLock)
        {
            return _outputBuilder.ToString() + _errorBuilder.ToString() + _logReader.GetContent();
        }
    }

    public void DrainLogContent()
    {
        _logReader.Drain();
    }

    public bool HasProcessExited => _process.HasExited;

    public int ProcessId => _process.Id;

    public void KillProcessTree()
    {
        if (_process.HasExited) return;

        try
        {
            var pid = _process.Id;
            Console.WriteLine($"[SttEngine] 杀掉进程树 PID={pid}");

            var psi = new ProcessStartInfo
            {
                FileName = "taskkill",
                Arguments = $"/F /T /PID {pid}",
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
            };
            using var killer = Process.Start(psi);
            killer?.WaitForExit(5000);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[SttEngine] 杀进程树失败: {Common.Sanitize(ex.Message)}");
            try { _process.Kill(entireProcessTree: true); } catch { }
        }
    }
}
