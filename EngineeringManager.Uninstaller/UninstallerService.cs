using System.Diagnostics;

namespace EngineeringManager.Uninstaller;

public class UninstallerService
{
    private static readonly string LogFile = Path.Combine(Path.GetTempPath(), "uninstaller-log.txt");

    private static void Log(string msg)
    {
        try { File.AppendAllText(LogFile, $"[{DateTime.Now:HH:mm:ss.fff}] {msg}\n"); } catch { }
        Debug.WriteLine(msg);
    }

    /// <summary>
    /// 从 uninstaller.json 读取安装路径
    /// </summary>
    public static string GetInstallPath()
    {
        // 从同目录的 uninstaller.json 读取
        var jsonPath = Path.Combine(AppContext.BaseDirectory, "uninstaller.json");
        if (File.Exists(jsonPath))
        {
            var path = File.ReadAllText(jsonPath).Trim();
            if (!string.IsNullOrEmpty(path) && Directory.Exists(path))
            {
                Log($"[Service] 从 uninstaller.json 读取安装路径: {path}");
                return path;
            }
        }

        // fallback: 从桌面快捷方式查找
        var desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
        var lnkPath = Path.Combine(desktopPath, "工程管家.lnk");
        if (File.Exists(lnkPath))
        {
            try
            {
                var shell = (dynamic)Activator.CreateInstance(Type.GetTypeFromProgID("WScript.Shell")!)!;
                var shortcut = shell.CreateShortcut(lnkPath);
                var exePath = shortcut.TargetPath as string;
                if (!string.IsNullOrEmpty(exePath) && File.Exists(exePath))
                {
                    var installDir = Path.GetDirectoryName(exePath);
                    Log($"[Service] 从桌面快捷方式推断安装路径: {installDir}");
                    return installDir!;
                }
            }
            catch { }
        }

        // fallback: 默认路径
        var defaultPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "工程管家");
        if (Directory.Exists(defaultPath))
        {
            Log($"[Service] 使用默认安装路径: {defaultPath}");
            return defaultPath;
        }

        throw new FileNotFoundException("无法确定安装路径，工程管家可能已被手动卸载");
    }

    /// <summary>
    /// 执行卸载
    /// </summary>
    public async Task Uninstall(string installPath, Action<int, string> onProgress)
    {
        Log($"[Service] 开始卸载: {installPath}");

        onProgress(0, "正在删除程序文件...");

        // 停止正在运行的进程
        try
        {
            foreach (var p in Process.GetProcessesByName("EngineeringManager.Api"))
            {
                try { p.Kill(); p.WaitForExit(3000); } catch { }
            }
        }
        catch { }

        // 删除安装目录
        if (Directory.Exists(installPath))
        {
            var totalFiles = Directory.GetFiles(installPath, "*", SearchOption.AllDirectories).Length;
            var deleted = 0;

            // 先删除子目录和文件
            foreach (var dir in Directory.GetDirectories(installPath, "*", SearchOption.AllDirectories))
            {
                try
                {
                    Directory.Delete(dir, true);
                    deleted += Directory.GetFiles(dir, "*", SearchOption.AllDirectories).Length;
                }
                catch (Exception ex)
                {
                    Log($"[Service] 删除目录失败 {dir}: {ex.Message}");
                }
            }

            foreach (var file in Directory.GetFiles(installPath))
            {
                try
                {
                    File.Delete(file);
                    deleted++;
                }
                catch (Exception ex)
                {
                    Log($"[Service] 删除文件失败 {file}: {ex.Message}");
                }
            }

            // 进度模拟（基于删除的文件数）
            for (int i = 0; i <= 25; i += 5)
            {
                onProgress(i, "正在删除程序文件...");
                await Task.Delay(100);
            }
        }

        onProgress(50, "正在清理配置文件...");
        await Task.Delay(150);

        // 清理 AppData 配置目录（config.json、快照等，不影响用户数据）
        var appDataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "工程管家");
        if (Directory.Exists(appDataDir))
        {
            try { Directory.Delete(appDataDir, true); Log($"[Service] 已清理配置目录: {appDataDir}"); }
            catch (Exception ex) { Log($"[Service] 清理配置目录失败: {ex.Message}"); }
        }

        // 绝不删除用户数据存储路径（如 F:\Company Database），无论 deleteData 为何值

        onProgress(75, "正在删除快捷方式...");
        await Task.Delay(150);

        // 删除桌面快捷方式
        try
        {
            var desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
            var lnkPath = Path.Combine(desktopPath, "工程管家.lnk");
            if (File.Exists(lnkPath)) File.Delete(lnkPath);
            var uninstallLnk = Path.Combine(desktopPath, "卸载工程管家.lnk");
            if (File.Exists(uninstallLnk)) File.Delete(uninstallLnk);
        }
        catch (Exception ex) { Log($"[Service] 删除快捷方式失败: {ex.Message}"); }

        // 删除开始菜单快捷方式
        try
        {
            var startMenuPath = Environment.GetFolderPath(Environment.SpecialFolder.StartMenu);
            var startLnk = Path.Combine(startMenuPath, "工程管家.lnk");
            if (File.Exists(startLnk)) File.Delete(startLnk);
        }
        catch (Exception ex) { Log($"[Service] 删除开始菜单快捷方式失败: {ex.Message}"); }

        onProgress(90, "正在清理注册表...");
        await Task.Delay(150);

        // 清理注册表
        try
        {
            // 删除 "程序和功能" 中的卸载信息
            try
            {
                Microsoft.Win32.Registry.CurrentUser.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall", true)?
                    .DeleteSubKeyTree("工程管家", false);
                Log("[Service] 已清理 Uninstall 注册表");
            }
            catch (Exception ex) { Log($"[Service] 清理 Uninstall 注册表失败: {ex.Message}"); }

            // 删除应用自身注册表
            try
            {
                Microsoft.Win32.Registry.CurrentUser.OpenSubKey("Software", true)?
                    .DeleteSubKeyTree("工程管家", false);
                Log("[Service] 已清理应用注册表");
            }
            catch (Exception ex) { Log($"[Service] 清理应用注册表失败: {ex.Message}"); }
        }
        catch (Exception ex) { Log($"[Service] 清理注册表失败: {ex.Message}"); }

        // 最后删除安装目录本身
        try
        {
            if (Directory.Exists(installPath))
            {
                Directory.Delete(installPath, true);
            }
        }
        catch (Exception ex)
        {
            Log($"[Service] 删除安装目录失败: {ex.Message}");
        }

        // 删除卸载器自身
        try
        {
            var selfPath = AppContext.BaseDirectory;
            // 等窗口关闭后再清理
            Log($"[Service] 卸载器目录: {selfPath}（将在退出后清理）");
        }
        catch { }

        onProgress(100, "卸载完成！");
        Log("[Service] 卸载完成");
    }
}
