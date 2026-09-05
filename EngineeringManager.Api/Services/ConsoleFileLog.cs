using System.Text;

namespace EngineeringManager.Api.Services;

/// <summary>
/// F2(审计): 生产日志不蒸发 —— 桌面 WinExe 无控制台，全库海量 Console.*
/// 输出原本直接丢失。本类把 Console.Out / Console.Error 重定向到
/// {ApiConfig.ResolveDataPath()}/logs/app-{yyyyMMdd}.log：
/// 按天滚动、lock 串行化线程安全、每条即写即刷；启动时清理 14 天前旧日志。
/// 不引入第三方日志包；写盘失败静默吞掉（日志不反噬业务）。
/// </summary>
public class ConsoleFileLog : TextWriter
{
    private const int RetentionDays = 14;
    private readonly string _logDir;
    private readonly object _lock = new();
    private StreamWriter? _writer;
    private string? _writerDate;

    public ConsoleFileLog()
    {
        _logDir = Path.Combine(ApiConfig.ResolveDataPath(), "logs");
        try { Directory.CreateDirectory(_logDir); } catch { }
        CleanOldLogs();
    }

    public override Encoding Encoding => Encoding.UTF8;

    public override void Write(char value) => WriteCore(value.ToString());

    public override void Write(string? value) => WriteCore(value ?? string.Empty);

    public override void WriteLine() => WriteCore(Environment.NewLine);

    public override void WriteLine(string? value) => WriteCore((value ?? string.Empty) + Environment.NewLine);

    private void WriteCore(string text)
    {
        if (string.IsNullOrEmpty(text)) return;
        try
        {
            lock (_lock)
            {
                var writer = GetWriter(DateTime.Now);
                writer.Write(text);
                writer.Flush();
            }
        }
        catch { /* 日志写盘失败不反噬业务 */ }
    }

    private StreamWriter GetWriter(DateTime now)
    {
        var date = now.ToString("yyyyMMdd");
        if (_writer != null && _writerDate == date) return _writer;

        _writer?.Dispose();
        var path = Path.Combine(_logDir, $"app-{date}.log");
        _writer = new StreamWriter(path, append: true, Encoding.UTF8) { AutoFlush = true };
        _writerDate = date;
        return _writer;
    }

    private void CleanOldLogs()
    {
        try
        {
            var cutoff = DateTime.Now.AddDays(-RetentionDays);
            foreach (var file in Directory.GetFiles(_logDir, "app-*.log"))
            {
                // 文件名即日期（app-yyyyMMdd.log），解析失败按文件时间兜底
                var name = Path.GetFileNameWithoutExtension(file); // app-yyyyMMdd
                var datePart = name.Length > 4 ? name[4..] : "";
                if (!DateTime.TryParseExact(datePart, "yyyyMMdd", null,
                        System.Globalization.DateTimeStyles.None, out var d))
                    d = File.GetLastWriteTime(file);
                if (d < cutoff)
                    File.Delete(file);
            }
        }
        catch { /* 清理失败不影响启动 */ }
    }
}
