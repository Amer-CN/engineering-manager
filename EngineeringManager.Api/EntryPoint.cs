using System.Diagnostics;

namespace EngineeringManager.Api;

/// <summary>
/// 应用程序入口点（带 [STAThread] 属性）
/// </summary>
public static class EntryPoint
{
    [STAThread]
    public static void Main(string[] args)
    {
        // 检查启动模式
        if (args.Contains("--api-only"))
        {
            // 纯 API 模式（开发用）
            var builder = WebApplication.CreateBuilder(args);
            ApiConfig.ConfigureServices(builder);
            var app = builder.Build();
            ApiConfig.InitializeDatabaseOrExit();
            ApiConfig.ConfigureApp(app);
            app.Run();
            return;
        }

        // 桌面模式：STA 主线程 + WebView2
        // ⚠️ 这些必须最先调用，在任何 COM 初始化之前
        Application.SetHighDpiMode(HighDpiMode.SystemAware);
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        // 记录启动前已有的 node 进程 PID（退出时不杀这些）
        var existingNodePids = new HashSet<int>();
        try { foreach (var p in Process.GetProcessesByName("node")) existingNodePids.Add(p.Id); } catch { }
        Console.WriteLine($"[App] Existing node processes: {existingNodePids.Count}");

        // 检测是否为生产模式（dist/ 目录存在）
        var distPath = Path.Combine(AppContext.BaseDirectory, "dist");
        bool isProduction = Directory.Exists(distPath);
        Console.WriteLine($"[App] Mode: {(isProduction ? "Production" : "Development")} (dist: {distPath})");

        // ── 启动 Vite（仅开发模式）──
        Process? viteProcess = null;
        if (!isProduction)
        {
            try
            {
                var projectDir = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", ".."));
                if (Directory.Exists(Path.Combine(projectDir, "node_modules")))
                {
                    viteProcess = new Process
                    {
                        StartInfo = new ProcessStartInfo
                        {
                            FileName = "cmd.exe",
                            Arguments = "/c npm run dev",
                            WorkingDirectory = projectDir,
                            CreateNoWindow = false,
                            UseShellExecute = false,
                        }
                    };
                    viteProcess.Start();
                    Console.WriteLine("[Vite] Frontend dev server started");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Vite] Failed to start: {ex.Message}");
            }
        }

        // API 在后台线程运行（MTA 模式）
        var apiThread = new Thread(() =>
        {
            var builder = WebApplication.CreateBuilder(args);
            ApiConfig.ConfigureServices(builder);
            var app = builder.Build();
            ApiConfig.InitializeDatabaseOrExit();
            ApiConfig.ConfigureApp(app);
            app.Run();
        });
        apiThread.IsBackground = true;
        apiThread.Start();

        // ── 主线程运行 WinForms 窗口 ──
        Console.WriteLine("[App] Opening window...");
        Application.Run(new MainWindow(isProduction));

        // 退出时清理 Vite
        if (viteProcess != null && !viteProcess.HasExited)
        {
            Console.WriteLine("[App] Shutting down Vite...");
            try { viteProcess.CloseMainWindow(); viteProcess.WaitForExit(2000); } catch { }
            if (!viteProcess.HasExited) viteProcess.Kill(entireProcessTree: true);
            viteProcess.Dispose();
        }

        // 清理 Vite 残留的 node（只杀我们启动后新增的）
        Console.WriteLine("[App] Cleaning up Vite node processes...");
        try
        {
            foreach (var p in Process.GetProcessesByName("node"))
            {
                if (!existingNodePids.Contains(p.Id))
                {
                    try { p.Kill(); p.WaitForExit(1000); } catch { Console.WriteLine($"[App]  Skip node PID {p.Id}"); }
                }
            }
        }
        catch { }

        Console.WriteLine("[App] Done.");
        Environment.Exit(0);
    }
}
