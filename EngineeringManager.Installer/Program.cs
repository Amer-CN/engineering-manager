using System.Diagnostics;

namespace EngineeringManager.Installer;

public class UpdateOptions
{
    public bool IsUpdate { get; set; }
    public string? TargetPath { get; set; }
    public string? DataPath { get; set; }
    public int WaitPid { get; set; }
}

public static class Program
{
    [STAThread]
    static void Main(string[] args)
    {
        Application.SetHighDpiMode(HighDpiMode.SystemAware);
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        var opts = ParseArgs(args);
        Application.Run(new InstallerWindow(opts));
    }

    private static UpdateOptions ParseArgs(string[] args)
    {
        var opts = new UpdateOptions();
        for (int i = 0; i < args.Length; i++)
        {
            switch (args[i])
            {
                case "--update":
                    opts.IsUpdate = true;
                    break;
                case "--target" when i + 1 < args.Length:
                    opts.TargetPath = args[++i];
                    break;
                case "--data-path" when i + 1 < args.Length:
                    opts.DataPath = args[++i];
                    break;
                case "--wait-pid" when i + 1 < args.Length:
                    if (int.TryParse(args[++i], out var pid))
                        opts.WaitPid = pid;
                    break;
            }
        }
        return opts;
    }
}
