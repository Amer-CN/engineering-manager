using System.Diagnostics;

namespace EngineeringManager.Api.Uninstall;

/// <summary>
/// 极简卸载确认 + 进度窗口（纯 WinForms，不用 WebView2/React）。
/// 用户点「确认卸载」→ 执行 UninstallService → 显示进度 → 完成后关闭。
/// </summary>
public class UninstallForm : Form
{
    private readonly string _installPath;
    private readonly Label _statusLabel;
    private readonly ProgressBar _progressBar;
    private readonly Button _confirmButton;
    private readonly Button _cancelButton;
    private readonly Panel _progressPanel;

    private bool _uninstallRunning;
    private bool _uninstallCompleted;

    /// <summary>卸载是否成功（EntryPoint 据此决定退出码；未实际执行卸载的取消不算失败）。</summary>
    public bool UninstallSucceeded { get; private set; } = true;

    private static readonly string LogFile = Path.Combine(Path.GetTempPath(), "uninstaller-log.txt");

    private static void Log(string msg)
    {
        try { File.AppendAllText(LogFile, $"[{DateTime.Now:HH:mm:ss.fff}] [Form] {msg}\n"); } catch { }
        Debug.WriteLine(msg);
    }

    public UninstallForm(string installPath)
    {
        _installPath = installPath;

        Text = "卸载工程管家";
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        MinimizeBox = false;
        StartPosition = FormStartPosition.CenterScreen;
        Size = new Size(420, 220);

        try
        {
            var iconStream = typeof(UninstallForm).Assembly
                .GetManifestResourceStream("EngineeringManager.Api.app.ico");
            if (iconStream != null) Icon = new Icon(iconStream);
        }
        catch { }

        // ── 确认面板 ──
        var confirmPanel = new Panel { Dock = DockStyle.Fill };

        var titleLabel = new Label
        {
            Text = "确认卸载工程管家？",
            Font = new Font("Microsoft YaHei UI", 14F, FontStyle.Bold),
            Location = new Point(20, 25),
            Size = new Size(360, 30),
            TextAlign = ContentAlignment.MiddleCenter,
        };

        var descLabel = new Label
        {
            Text = "卸载将删除程序文件、快捷方式和注册表项。\n您的数据文件不会被删除，可安全保留。",
            Font = new Font("Microsoft YaHei UI", 9F),
            Location = new Point(20, 60),
            Size = new Size(360, 40),
            TextAlign = ContentAlignment.MiddleCenter,
        };

        _confirmButton = new Button
        {
            Text = "确认卸载",
            Font = new Font("Microsoft YaHei UI", 9F),
            Location = new Point(100, 120),
            Size = new Size(100, 36),
            BackColor = Color.FromArgb(239, 68, 68),
            ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat,
        };
        _confirmButton.FlatAppearance.BorderSize = 0;
        _confirmButton.Click += async (_, _) => await StartUninstall();

        _cancelButton = new Button
        {
            Text = "取消",
            Font = new Font("Microsoft YaHei UI", 9F),
            Location = new Point(220, 120),
            Size = new Size(100, 36),
            FlatStyle = FlatStyle.Flat,
        };
        _cancelButton.FlatAppearance.BorderSize = 0;
        _cancelButton.Click += (_, _) => Close();

        confirmPanel.Controls.AddRange(new Control[] { titleLabel, descLabel, _confirmButton, _cancelButton });

        // ── 进度面板（初始隐藏）──
        _progressPanel = new Panel { Dock = DockStyle.Fill, Visible = false };

        _progressBar = new ProgressBar
        {
            Location = new Point(20, 50),
            Size = new Size(360, 24),
            Minimum = 0,
            Maximum = 100,
        };

        _statusLabel = new Label
        {
            Text = "准备卸载...",
            Font = new Font("Microsoft YaHei UI", 9F),
            Location = new Point(20, 85),
            Size = new Size(360, 24),
            TextAlign = ContentAlignment.MiddleCenter,
        };

        _progressPanel.Controls.AddRange(new Control[] { _progressBar, _statusLabel });

        Controls.Add(confirmPanel);
        Controls.Add(_progressPanel);
    }

    protected override void OnFormClosing(FormClosingEventArgs e)
    {
        // 卸载进行中禁止关闭（X / Alt+F4）；完成后恢复正常关闭
        if (_uninstallRunning && !_uninstallCompleted)
        {
            e.Cancel = true;
            _statusLabel.Text = "卸载进行中，请稍候...";
        }
        base.OnFormClosing(e);
    }

    private async Task StartUninstall()
    {
        // 切换到进度面板
        _uninstallRunning = true;
        _confirmButton.Visible = false;
        _cancelButton.Visible = false;
        _progressPanel.Visible = true;
        _progressPanel.BringToFront();

        Log($"[UninstallForm] 开始卸载: {_installPath}");

        var service = new UninstallService();
        try
        {
            await service.Uninstall(_installPath, (percent, step) =>
            {
                Invoke(() =>
                {
                    _progressBar.Value = Math.Min(percent, 100);
                    _statusLabel.Text = step;
                });
            });
        }
        catch (Exception ex)
        {
            UninstallSucceeded = false;
            Log($"[UninstallForm] 卸载异常: {ex}");
        }

        // 短暂展示完成状态后关闭（cmd.exe 会在 2 秒后删除安装目录）
        await Task.Delay(800);
        _uninstallCompleted = true;
        Close();
    }
}
