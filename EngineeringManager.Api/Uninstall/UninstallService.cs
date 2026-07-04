using System.Diagnostics;

namespace EngineeringManager.Api.Uninstall;

/// <summary>
/// 卸载服务（从独立卸载器合并到主程序 --uninstall 模式）。
/// 主 exe 就在安装目录里，installPath = AppContext.BaseDirectory，不再需要 uninstaller.json。
/// 绝不删用户数据存储路径（如 F:\Company Database），无论何种情况。
/// </summary>
public class UninstallService
{
    private static readonly string LogFile = Path.Combine(Path.GetTempPath(), "uninstaller-log.txt");

    private static void Log(string msg)
    {
        try { File.AppendAllText(LogFile, $"[{DateTime.Now:HH:mm:ss.fff}] {msg}\n"); } catch { }
        Debug.WriteLine(msg);
    }

    /// <summary>
    /// 执行卸载。installPath = 主 exe 所在目录（AppContext.BaseDirectory）。
    /// </summary>
    public async Task Uninstall(string installPath, Action<int, string> onProgress)
    {
        Log($"[UninstallService] 开始卸载: {installPath}");

        var currentProcessId = Environment.ProcessId;
        var normalizedInstallPath = Path.GetFullPath(installPath).TrimEnd('\\').ToLowerInvariant();

        // ── 1. 杀掉除自身外的 EngineeringManager.Api 进程 ──
        onProgress(0, "正在停止程序进程...");
        try
        {
            foreach (var p in Process.GetProcessesByName("EngineeringManager.Api"))
            {
                if (p.Id == currentProcessId) continue; // 不杀自己
                try { p.Kill(); p.WaitForExit(3000); } catch { }
            }
        }
        catch { }

        // ── 2. 杀掉匹配安装路径的 msedgewebview2（共享进程，仅杀路径匹配的）──
        try
        {
            foreach (var p in Process.GetProcessesByName("msedgewebview2"))
            {
                try
                {
                    var procPath = p.MainModule?.FileName;
                    if (procPath != null &&
                        Path.GetFullPath(procPath).ToLowerInvariant().StartsWith(normalizedInstallPath))
                    {
                        p.Kill();
                        p.WaitForExit(3000);
                    }
                }
                catch { /* 路径读不到则跳过，避免误杀其他应用的 WebView2 */ }
            }
        }
        catch { }

        onProgress(10, "正在删除程序文件...");

        // ── 3. 删除安装目录里除当前运行 exe 之外的文件 ──
        var currentExePath = Environment.ProcessPath ?? "";
        if (Directory.Exists(installPath))
        {
            // 先删子目录
            foreach (var dir in Directory.GetDirectories(installPath, "*", SearchOption.AllDirectories)
                         .OrderByDescending(d => d.Length)) // 深度优先，先删子目录
            {
                try { Directory.Delete(dir, true); }
                catch (Exception ex) { Log($"[UninstallService] 删除目录失败 {dir}: {ex.Message}"); }
            }

            // 再删文件（跳过当前运行的 exe）
            foreach (var file in Directory.GetFiles(installPath))
            {
                try
                {
                    if (!string.Equals(file, currentExePath, StringComparison.OrdinalIgnoreCase))
                        File.Delete(file);
                }
                catch (Exception ex) { Log($"[UninstallService] 删除文件失败 {file}: {ex.Message}"); }
            }

            for (int i = 10; i <= 35; i += 5)
            {
                onProgress(i, "正在删除程序文件...");
                await Task.Delay(80);
            }
        }

        onProgress(40, "正在清理配置文件...");
        await Task.Delay(150);

        // ── 4. 清理 AppData 配置目录（config.json 等，不影响用户数据存储路径）──
        var appDataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "工程管家");
        if (Directory.Exists(appDataDir))
        {
            try { Directory.Delete(appDataDir, true); Log($"[UninstallService] 已清理配置目录: {appDataDir}"); }
            catch (Exception ex) { Log($"[UninstallService] 清理配置目录失败: {ex.Message}"); }
        }

        // 绝不删除用户数据存储路径（如 F:\Company Database），无论何种情况

        onProgress(60, "正在删除快捷方式...");
        await Task.Delay(150);

        // ── 5. 删除桌面快捷方式 ──
        try
        {
            var desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
            var lnkPath = Path.Combine(desktopPath, "工程管家.lnk");
            if (File.Exists(lnkPath)) File.Delete(lnkPath);
            var uninstallLnk = Path.Combine(desktopPath, "卸载工程管家.lnk");
            if (File.Exists(uninstallLnk)) File.Delete(uninstallLnk);
        }
        catch (Exception ex) { Log($"[UninstallService] 删除桌面快捷方式失败: {ex.Message}"); }

        // ── 6. 删除开始菜单快捷方式 ──
        try
        {
            var startMenuPath = Environment.GetFolderPath(Environment.SpecialFolder.StartMenu);
            var startLnk = Path.Combine(startMenuPath, "工程管家.lnk");
            if (File.Exists(startLnk)) File.Delete(startLnk);
        }
        catch (Exception ex) { Log($"[UninstallService] 删除开始菜单快捷方式失败: {ex.Message}"); }

        onProgress(80, "正在清理注册表...");
        await Task.Delay(150);

        // ── 7. 清理注册表 ──
        // 7a. "程序和功能" 卸载项
        try
        {
            Microsoft.Win32.Registry.CurrentUser.OpenSubKey(
                @"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall", true)?
                .DeleteSubKeyTree("工程管家", false);
            Log("[UninstallService] 已清理 Uninstall 注册表");
        }
        catch (Exception ex) { Log($"[UninstallService] 清理 Uninstall 注册表失败: {ex.Message}"); }

        // 7b. 应用自身注册表
        try
        {
            Microsoft.Win32.Registry.CurrentUser.OpenSubKey("Software", true)?
                .DeleteSubKeyTree("工程管家", false);
            Log("[UninstallService] 已清理应用注册表");
        }
        catch (Exception ex) { Log($"[UninstallService] 清理应用注册表失败: {ex.Message}"); }

        onProgress(95, "正在完成卸载...");
        await Task.Delay(200);

        // ── 8. 自删除：detached cmd.exe 在本进程退出后删掉整个安装目录（含 exe 自身）──
        try
        {
            var safePath = installPath.TrimEnd('\\');
            var deleteCmd = $"/c timeout /t 2 /nobreak >nul & rmdir /s /q \"{safePath}\"";
            Process.Start(new ProcessStartInfo("cmd.exe", deleteCmd)
            {
                UseShellExecute = false,
                CreateNoWindow = true,
            });
            Log($"[UninstallService] 已调度自删除: {deleteCmd}");
        }
        catch (Exception ex)
        {
            Log($"[UninstallService] 调度自删除失败: {ex.Message}");
        }

        onProgress(100, "卸载完成！");
        Log("[UninstallService] 卸载完成");
    }
}
