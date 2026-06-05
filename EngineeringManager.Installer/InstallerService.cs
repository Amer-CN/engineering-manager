namespace EngineeringManager.Installer;

public class InstallerService
{
    /// <summary>
    /// 安装到指定目录
    /// </summary>
    public async Task Install(string targetPath, Action<int, string> onProgress)
    {
        // 确保目标目录存在
        Directory.CreateDirectory(targetPath);

        // 主程序的资源文件（嵌入在本 exe 中）
        var resourceDir = Path.Combine(AppContext.BaseDirectory, "app-files");

        if (!Directory.Exists(resourceDir))
        {
            throw new DirectoryNotFoundException($"安装资源目录不存在: {resourceDir}");
        }

        // 获取所有要复制的文件
        var files = Directory.GetFiles(resourceDir, "*", SearchOption.AllDirectories);
        var total = files.Length;

        for (int i = 0; i < total; i++)
        {
            var file = files[i];
            var relativePath = Path.GetRelativePath(resourceDir, file);
            var destPath = Path.Combine(targetPath, relativePath);

            // 确保目标子目录存在
            var destDir = Path.GetDirectoryName(destPath);
            if (destDir != null) Directory.CreateDirectory(destDir);

            // 复制文件
            File.Copy(file, destPath, true);

            // 回报进度
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

            // 模拟安装延迟（让动画可见）
            await Task.Delay(15);
        }

        // 创建桌面快捷方式
        onProgress(95, "正在创建桌面快捷方式...");
        CreateShortcut(targetPath);

        onProgress(100, "安装完成！");
    }

    private void CreateShortcut(string installPath)
    {
        try
        {
            var desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
            var shortcutPath = Path.Combine(desktopPath, "工程管家.lnk");
            var exePath = Path.Combine(installPath, "EngineeringManager.Api.exe");

            // 使用 COM 创建快捷方式
            var shell = (dynamic)Activator.CreateInstance(
                Type.GetTypeFromProgID("WScript.Shell")!);
            var shortcut = shell.CreateShortcut(shortcutPath);
            shortcut.TargetPath = exePath;
            shortcut.WorkingDirectory = installPath;
            shortcut.Description = "工程管家 - 工程项目管理系统";
            shortcut.Save();
        }
        catch { }
    }
}
