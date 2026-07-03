using System.Diagnostics;
using System.IO.Compression;
using System.Reflection;

namespace EngineeringManager.Installer;

public class InstallerService
{
    private static readonly string TempDir = Path.Combine(Path.GetTempPath(), "engineering-manager-installer");

    private const string PayloadMagic = "EMPAYLD1"; // 必须正好 8 字节
    private const int    FooterSize   = 16;         // 8(magic) + 8(Int64 长度)

    /// <summary>
    /// 解压 payload 到临时目录，返回解压路径。
    /// 优先从 exe 尾部追加段读取（单文件安装器），回退到 exe 同目录的 payload.zip。
    /// </summary>
    public static string ExtractPayload()
    {
        // 如果已解压过（WebView2 正在使用），直接返回，不重复解压
        if (Directory.Exists(TempDir) && Directory.Exists(Path.Combine(TempDir, "app-files")))
            return TempDir;

        if (Directory.Exists(TempDir))
            try { Directory.Delete(TempDir, true); } catch { }
        Directory.CreateDirectory(TempDir);

        using var payload = OpenPayloadStream();
        using var archive = new ZipArchive(payload, ZipArchiveMode.Read);
        archive.ExtractToDirectory(TempDir, overwriteFiles: true);
        return TempDir;
    }

    /// <summary>
    /// 从 exe 尾部追加段读取 payload；回退到 exe 同目录的 payload.zip
    /// </summary>
    private static Stream OpenPayloadStream()
    {
        var exePath = Environment.ProcessPath
            ?? Process.GetCurrentProcess().MainModule!.FileName;

        using (var fs = new FileStream(exePath, FileMode.Open, FileAccess.Read, FileShare.Read))
        {
            if (fs.Length > FooterSize)
            {
                fs.Seek(-FooterSize, SeekOrigin.End);
                var footer = new byte[FooterSize];
                fs.ReadExactly(footer, 0, FooterSize);
                var magic = System.Text.Encoding.ASCII.GetString(footer, 0, 8);
                if (magic == PayloadMagic)
                {
                    long len = BitConverter.ToInt64(footer, 8); // 小端
                    if (len > 0 && len <= fs.Length - FooterSize)
                    {
                        long start = fs.Length - FooterSize - len;
                        fs.Seek(start, SeekOrigin.Begin);
                        var buf = new byte[len];
                        fs.ReadExactly(buf, 0, (int)len);
                        return new MemoryStream(buf, writable: false);
                    }
                }
            }
        }

        // 回退：exe 同目录的 payload.zip
        var sideCar = Path.Combine(AppContext.BaseDirectory, "payload.zip");
        if (File.Exists(sideCar))
            return new FileStream(sideCar, FileMode.Open, FileAccess.Read, FileShare.Read);

        throw new FileNotFoundException(
            "找不到安装资源包 (payload.zip)：exe 尾部无有效追加段，且同目录无 payload.zip");
    }

    /// <summary>
    /// 安装到指定目录
    /// </summary>
    /// <param name="targetPath">安装目录</param>
    /// <param name="dataPath">数据存储路径</param>
    /// <param name="isUpdate">是否更新模式（跳过快捷方式、不覆盖已有 dataPath）</param>
    /// <param name="onProgress">进度回调</param>
    public async Task Install(string targetPath, string dataPath, bool isUpdate, Action<int, string> onProgress)
    {
        Directory.CreateDirectory(targetPath);

        // 更新模式：先杀旧进程 + 清理旧 dist/ 目录
        if (isUpdate)
        {
            // 杀掉正在运行的 EngineeringManager.Api.exe（否则 exe 文件被锁无法覆盖）
            KillRunningProcesses(targetPath);

            var oldDist = Path.Combine(targetPath, "dist");
            if (Directory.Exists(oldDist))
            {
                try { Directory.Delete(oldDist, true); }
                catch { /* 文件被占用则忽略，新文件会覆盖 */ }
            }
        }

        // 从嵌入资源解压
        onProgress(0, "正在释放安装文件...");
        var sourceDir = ExtractPayload();

        // 找到 app-files 目录（zip 里的结构：app-files/... + installer/dist/...）
        var appFilesDir = Path.Combine(sourceDir, "app-files");
        if (!Directory.Exists(appFilesDir))
            throw new DirectoryNotFoundException($"安装资源目录不存在: {appFilesDir}");

        var files = Directory.GetFiles(appFilesDir, "*", SearchOption.AllDirectories);
        var total = files.Length;

        for (int i = 0; i < total; i++)
        {
            var file = files[i];
            var relativePath = Path.GetRelativePath(appFilesDir, file);
            var destPath = Path.Combine(targetPath, relativePath);

            var destDir = Path.GetDirectoryName(destPath);
            if (destDir != null) Directory.CreateDirectory(destDir);

            // 带重试的文件复制（更新模式下文件可能被占用）
            await CopyFileWithRetry(file, destPath);

            var percent = (int)((i + 1) / (double)total * 100);
            var step = (i + 1) switch
            {
                < 30 => "正在解压程序文件...",
                < 60 => "正在配置运行环境...",
                < 80 => "正在初始化数据库...",
                < 95 => "正在创建快捷方式...",
                _ => "即将完成..."
            };
            onProgress(percent, step);

            await Task.Delay(10);
        }

        // 快捷方式（更新模式下覆盖同名，不重复堆叠）
        onProgress(95, "正在创建桌面快捷方式...");
        CreateShortcut(targetPath);

        // 写入数据存储路径配置（更新模式下：若用户未显式改动则保留现有 config.json）
        WriteDataPathConfig(dataPath, isUpdate);

        onProgress(100, isUpdate ? "更新完成！" : "安装完成！");

        // 清理临时文件
        try { Directory.Delete(sourceDir, true); } catch { }
    }

    // 兼容旧签名
    public Task Install(string targetPath, string dataPath, Action<int, string> onProgress)
        => Install(targetPath, dataPath, false, onProgress);

    /// <summary>
    /// 杀掉指定安装目录下正在运行的 EngineeringManager.Api.exe 及其子进程（msedgewebview2）。
    /// 更新模式下必须先杀进程，否则 exe 文件被锁无法覆盖。
    /// 硬化：不再静默吞异常，所有失败写入 installer-debug.log；主程序进程名唯一，
    /// 读不到路径时降级为按名强杀；msedgewebview2 为共享进程，仅在路径匹配时才杀，
    /// 读不到路径则跳过（避免误杀安装器自身或其他应用的 WebView2）。
    /// </summary>
    private static void KillRunningProcesses(string targetPath)
    {
        var exePath = Path.Combine(targetPath, "EngineeringManager.Api.exe");
        var normalizedTarget = Path.GetFullPath(targetPath).TrimEnd('\\').ToLowerInvariant();

        // 主程序：进程名唯一属于本应用，路径读不到时可降级按名强杀
        KillMatchingProcesses("EngineeringManager.Api", normalizedTarget, waitMs: 5000, allowNameOnlyFallback: true);
        // WebView2：共享进程，仅在路径匹配安装目录时才杀，读不到路径一律跳过
        KillMatchingProcesses("msedgewebview2", normalizedTarget, waitMs: 3000, allowNameOnlyFallback: false);

        // 给操作系统一点时间释放文件句柄
        Thread.Sleep(500);

        // 最终校验：若目标 exe 仍被占用，显式告警（不再静默，便于发版排障）
        if (File.Exists(exePath) && IsFileLocked(exePath))
            InstallerLog($"[KillRunningProcesses] 警告: 杀进程后 {exePath} 仍被占用，覆盖可能失败");
    }

    /// <summary>
    /// 按进程名结束匹配安装目录的进程。
    /// allowNameOnlyFallback=true 时，读不到进程路径也会按名强杀（仅用于名字唯一属于本应用的进程）。
    /// </summary>
    private static void KillMatchingProcesses(string processName, string normalizedTarget, int waitMs, bool allowNameOnlyFallback)
    {
        Process[] procs;
        try { procs = Process.GetProcessesByName(processName); }
        catch (Exception ex)
        {
            InstallerLog($"[KillRunningProcesses] 枚举进程 {processName} 失败: {ex.Message}");
            return;
        }

        foreach (var proc in procs)
        {
            try
            {
                // 尝试读取进程路径以匹配安装目录；跨架构/权限不足时读不到
                string? procPath = null;
                try
                {
                    var raw = proc.MainModule?.FileName;
                    procPath = string.IsNullOrEmpty(raw) ? null : Path.GetFullPath(raw).ToLowerInvariant();
                }
                catch (Exception ex)
                {
                    InstallerLog($"[KillRunningProcesses] 无法读取 {processName} (PID {proc.Id}) 路径: {ex.Message}");
                }

                var matched = procPath != null && procPath.StartsWith(normalizedTarget);
                var nameOnly = procPath == null && allowNameOnlyFallback;

                if (!matched && !nameOnly)
                {
                    if (procPath == null)
                        InstallerLog($"[KillRunningProcesses] 跳过 {processName} (PID {proc.Id}): 路径不可读且不允许按名降级");
                    continue;
                }

                InstallerLog($"[KillRunningProcesses] 结束进程 {processName} PID {proc.Id}{(nameOnly ? " (按名降级)" : $" ({procPath})")}");
                proc.Kill(entireProcessTree: true);
                if (!proc.WaitForExit(waitMs))
                    InstallerLog($"[KillRunningProcesses] 警告: {processName} PID {proc.Id} 在 {waitMs}ms 内未退出");
            }
            catch (Exception ex)
            {
                InstallerLog($"[KillRunningProcesses] 结束 {processName} (PID {proc.Id}) 失败: {ex.Message}");
            }
            finally
            {
                proc.Dispose();
            }
        }
    }

    /// <summary>
    /// 探测文件是否被占用（独占打开失败即视为被锁）。
    /// </summary>
    private static bool IsFileLocked(string path)
    {
        try
        {
            using var fs = new FileStream(path, FileMode.Open, FileAccess.ReadWrite, FileShare.None);
            return false;
        }
        catch (IOException)
        {
            return true;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// 带重试的文件复制（更新模式下文件可能仍被占用）
    /// </summary>
    private static async Task CopyFileWithRetry(string src, string dest, int maxRetries = 10)
    {
        for (int retry = 0; ; retry++)
        {
            try
            {
                File.Copy(src, dest, true);
                return;
            }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException && retry < maxRetries)
            {
                await Task.Delay(300 + retry * 200);
            }
        }
    }

    /// <summary>
    /// 写入数据存储路径配置
    /// </summary>
    private void WriteDataPathConfig(string dataPath, bool isUpdate)
    {
        var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
        var cfgDir = Path.Combine(appData, "工程管家");
        var cfgPath = Path.Combine(cfgDir, "config.json");

        InstallerLog($"[WriteDataPathConfig] 入口: dataPath='{dataPath}', isUpdate={isUpdate}, cfgPath='{cfgPath}'");

        // 更新模式下：若用户未显式改动则保留现有 config.json
        if (isUpdate && File.Exists(cfgPath) && string.IsNullOrWhiteSpace(dataPath))
        {
            InstallerLog("[WriteDataPathConfig] 更新模式 + dataPath 为空 + cfgPath 存在 → 跳过写入");
            return;
        }

        try
        {
            // 检查磁盘是否存在，不存在则回退到默认路径
            if (!string.IsNullOrWhiteSpace(dataPath))
            {
                var driveRoot = Path.GetPathRoot(dataPath);
                InstallerLog($"[WriteDataPathConfig] driveRoot='{driveRoot}', Directory.Exists={Directory.Exists(driveRoot)}");
                if (string.IsNullOrEmpty(driveRoot) || !Directory.Exists(driveRoot))
                {
                    InstallerLog($"[WriteDataPathConfig] 磁盘不存在，回退到默认路径");
                    dataPath = Path.Combine(appData, "工程管家");
                }
                Directory.CreateDirectory(dataPath);
            }

            if (string.IsNullOrWhiteSpace(dataPath))
            {
                dataPath = Path.Combine(appData, "工程管家");
                InstallerLog($"[WriteDataPathConfig] dataPath 为空，使用默认值: {dataPath}");
            }

            Directory.CreateDirectory(cfgDir);
            var json = System.Text.Json.JsonSerializer.Serialize(
                new { dataPath },
                new System.Text.Json.JsonSerializerOptions { WriteIndented = true });
            File.WriteAllText(cfgPath, json);
            InstallerLog($"[WriteDataPathConfig] config.json 已写入: {cfgPath} → {dataPath}");
        }
        catch (Exception ex)
        {
            InstallerLog($"[WriteDataPathConfig] 写入 config.json 失败: {ex.Message}");
        }
    }

    private static void InstallerLog(string msg)
    {
        try
        {
            var logPath = Path.Combine(Path.GetTempPath(), "工程管家-installer-debug.log");
            File.AppendAllText(logPath, $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss.fff}] {msg}\n");
        }
        catch { }
    }

    /// <summary>
    /// 获取安装界面前端文件路径
    /// </summary>
    public static string GetInstallerFrontendDir()
    {
        // 优先从嵌入资源解压
        var sourceDir = ExtractPayload();

        // payload.zip 里 installer/dist 被压缩为根级 dist/（Compress-Archive 行为）
        var frontendDir = Path.Combine(sourceDir, "dist");
        if (Directory.Exists(frontendDir))
            return frontendDir;

        // 回退：尝试 installer/dist 子目录
        frontendDir = Path.Combine(sourceDir, "installer", "dist");
        if (Directory.Exists(frontendDir))
            return frontendDir;

        // 回退：从 exe 同目录查找
        var localDir = Path.Combine(AppContext.BaseDirectory, "installer", "dist");
        if (Directory.Exists(localDir))
            return localDir;

        return "";
    }

    private void CreateShortcut(string installPath)
    {
        try
        {
            var desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
            var shortcutPath = Path.Combine(desktopPath, "工程管家.lnk");
            var exePath = Path.Combine(installPath, "EngineeringManager.Api.exe");

            var shell = (dynamic)Activator.CreateInstance(
                Type.GetTypeFromProgID("WScript.Shell")!)!;
            var shortcut = shell.CreateShortcut(shortcutPath);
            shortcut.TargetPath = exePath;
            shortcut.WorkingDirectory = installPath;
            shortcut.Description = "工程管家 - 工程项目管理系统";
            shortcut.Save();
        }
        catch { }
    }
}
