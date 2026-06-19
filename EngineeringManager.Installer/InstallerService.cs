using System.IO.Compression;
using System.Reflection;

namespace EngineeringManager.Installer;

public class InstallerService
{
    private static readonly string TempDir = Path.Combine(Path.GetTempPath(), "engineering-manager-installer");

    /// <summary>
    /// 解压嵌入的 payload.zip 到临时目录，返回解压路径
    /// </summary>
    public static string ExtractPayload()
    {
        var assembly = Assembly.GetExecutingAssembly();
        var resourceName = assembly.GetManifestResourceNames()
            .FirstOrDefault(n => n.EndsWith("payload.zip"));

        if (resourceName == null)
            throw new FileNotFoundException("安装资源包 (payload.zip) 未嵌入到程序中");

        // 清理旧的临时目录
        if (Directory.Exists(TempDir))
            try { Directory.Delete(TempDir, true); } catch { }

        Directory.CreateDirectory(TempDir);

        using var stream = assembly.GetManifestResourceStream(resourceName)!;
        using var archive = new ZipArchive(stream, ZipArchiveMode.Read);
        archive.ExtractToDirectory(TempDir, overwriteFiles: true);

        return TempDir;
    }

    /// <summary>
    /// 安装到指定目录
    /// </summary>
    public async Task Install(string targetPath, Action<int, string> onProgress)
    {
        Directory.CreateDirectory(targetPath);

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

            File.Copy(file, destPath, true);

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

        onProgress(95, "正在创建桌面快捷方式...");
        CreateShortcut(targetPath);

        onProgress(100, "安装完成！");

        // 清理临时文件
        try { Directory.Delete(sourceDir, true); } catch { }
    }

    /// <summary>
    /// 获取安装界面前端文件路径
    /// </summary>
    public static string GetInstallerFrontendDir()
    {
        // 优先从嵌入资源解压
        var sourceDir = ExtractPayload();
        var frontendDir = Path.Combine(sourceDir, "installer", "dist");
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
