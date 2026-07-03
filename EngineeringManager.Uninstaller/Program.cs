using System.Diagnostics;

namespace EngineeringManager.Uninstaller;

public static class Program
{
    private const string RelaunchedFlag = "--relaunched-from-temp";

    [STAThread]
    static void Main(string[] args)
    {
        Application.SetHighDpiMode(HighDpiMode.SystemAware);
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        // 卸载器随程序安装在 <安装目录>\uninstall\。若直接在此运行并删除安装目录,
        // 自身 exe 会被文件锁,导致安装目录删不干净。故先把整个卸载目录复制到 %TEMP%
        // 并重启副本,由副本删除安装目录;副本退出后再自清理临时目录。
        if (RelaunchFromTempIfNeeded(args))
            return;

        Application.Run(new UninstallerWindow());

        // 当前进程若为 %TEMP% 副本,窗口关闭后调度延时自删除临时目录。
        ScheduleTempSelfCleanupIfNeeded();
    }

    /// <summary>
    /// 未带 relaunch 标记且当前不在 %TEMP% 下运行时:把卸载器所在目录整体复制到
    /// %TEMP%\em-uninstall-{guid},启动该副本(带 relaunch 标记),返回 true 表示当前进程应退出。
    /// 任何异常返回 false,回退为原地运行(尽力而为,绝不因此阻断卸载)。
    /// </summary>
    private static bool RelaunchFromTempIfNeeded(string[] args)
    {
        try
        {
            if (args.Contains(RelaunchedFlag))
                return false;

            var baseDir = AppContext.BaseDirectory.TrimEnd('\\');
            var tempRoot = Path.GetFullPath(Path.GetTempPath()).TrimEnd('\\');

            // 已在 %TEMP% 下运行则不再重启(防御,避免递归)
            if (baseDir.StartsWith(tempRoot, StringComparison.OrdinalIgnoreCase))
                return false;

            var tempDir = Path.Combine(Path.GetTempPath(), "em-uninstall-" + Guid.NewGuid().ToString("N"));
            CopyDirectory(baseDir, tempDir);

            var tempExe = Path.Combine(tempDir, "工程管家卸载.exe");
            if (!File.Exists(tempExe))
                return false; // 复制不完整,回退原地运行

            Process.Start(new ProcessStartInfo(tempExe, RelaunchedFlag) { UseShellExecute = true });
            return true;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>窗口关闭后,若当前运行于 %TEMP% 副本,调度一个延时命令删除该临时目录。</summary>
    private static void ScheduleTempSelfCleanupIfNeeded()
    {
        try
        {
            var baseDir = AppContext.BaseDirectory.TrimEnd('\\');
            var tempRoot = Path.GetFullPath(Path.GetTempPath()).TrimEnd('\\');
            if (!baseDir.StartsWith(tempRoot, StringComparison.OrdinalIgnoreCase))
                return;

            Process.Start(new ProcessStartInfo("cmd.exe",
                $"/c timeout /t 3 /nobreak >nul & rmdir /s /q \"{baseDir}\"")
            {
                UseShellExecute = false,
                CreateNoWindow = true
            });
        }
        catch { }
    }

    private static void CopyDirectory(string sourceDir, string destDir)
    {
        Directory.CreateDirectory(destDir);
        foreach (var file in Directory.GetFiles(sourceDir))
            File.Copy(file, Path.Combine(destDir, Path.GetFileName(file)), true);
        foreach (var dir in Directory.GetDirectories(sourceDir))
            CopyDirectory(dir, Path.Combine(destDir, Path.GetFileName(dir)));
    }
}
