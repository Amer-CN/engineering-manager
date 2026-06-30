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
    public async Task Install(string targetPath, string dataPath, Action<int, string> onProgress)
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

        // 写入数据存储路径配置（主程序 ResolveDataPath() 会读取此文件）
        if (!string.IsNullOrWhiteSpace(dataPath))
        {
            try
            {
                var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
                var cfgDir = Path.Combine(appData, "工程管家");
                Directory.CreateDirectory(cfgDir);
                var cfgPath = Path.Combine(cfgDir, "config.json");
                var json = System.Text.Json.JsonSerializer.Serialize(
                    new { dataPath },
                    new System.Text.Json.JsonSerializerOptions { WriteIndented = true });
                File.WriteAllText(cfgPath, json);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[Installer] 写入 config.json 失败: {ex.Message}");
            }
        }

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
