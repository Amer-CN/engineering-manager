using Microsoft.Web.WebView2.WinForms;
using System.Runtime.InteropServices;
using System.Text.Json;

namespace EngineeringManager.Api;

public class MainWindow : Form
{
    private WebView2? webView;

    public MainWindow()
    {
        FormBorderStyle = FormBorderStyle.None;
        Icon = new Icon(Path.Combine(AppContext.BaseDirectory, "app.ico"));
        Size = new Size(300, 400);
        StartPosition = FormStartPosition.CenterScreen;

        ApplyNativeRoundedCorners();

        // 鼠标按下时开始拖动（整个窗口区域）
        MouseDown += OnMouseDown;
    }

    private void ApplyNativeRoundedCorners()
    {
        try
        {
            int preference = 2; // DWMWCP_ROUND
            DwmSetWindowAttribute(Handle, 33, ref preference, sizeof(int));
        }
        catch { }
    }

    [DllImport("dwmapi.dll")]
    private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int attrValue, int attrSize);

    [DllImport("user32.dll")]
    private static extern void ReleaseCapture();

    [DllImport("user32.dll")]
    private static extern void SendMessage(IntPtr hWnd, int msg, int wParam, int lParam);

    private void OnMouseDown(object? sender, MouseEventArgs e)
    {
        if (e.Button == MouseButtons.Left)
        {
            ReleaseCapture();
            SendMessage(Handle, 0xA1, 0x2, 0); // WM_NCLBUTTONDOWN, HTCAPTION
        }
    }

    protected override async void OnLoad(EventArgs e)
    {
        base.OnLoad(e);

        try
        {
            webView = new WebView2 { Dock = DockStyle.Fill };
            Controls.Add(webView);

            var env = await Microsoft.Web.WebView2.Core.CoreWebView2Environment.CreateAsync(
                null, Path.Combine(Path.GetTempPath(), "engineering-manager-webview2"));

            await webView.EnsureCoreWebView2Async(env);

            webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
            webView.CoreWebView2.Settings.AreDevToolsEnabled = true;
            webView.CoreWebView2.Settings.IsWebMessageEnabled = true;

            webView.CoreWebView2.WebMessageReceived += OnWebMessage;
            webView.CoreWebView2.Navigate("http://localhost:5173");

            // WebView2 获取焦点后，鼠标事件穿透到 Form
            webView.MouseDown += OnMouseDown;

            webView.CoreWebView2.DocumentTitleChanged += (_, _) =>
                Text = $"工程管家 - {webView.CoreWebView2.DocumentTitle}";
        }
        catch (Exception ex)
        {
            MessageBox.Show($"WebView2 初始化失败：{ex.Message}",
                "错误", MessageBoxButtons.OK, MessageBoxIcon.Error);
            Close();
        }
    }

    private void OnWebMessage(object? sender, Microsoft.Web.WebView2.Core.CoreWebView2WebMessageReceivedEventArgs e)
    {
        try
        {
            var json = JsonDocument.Parse(e.TryGetWebMessageAsString());
            var action = json.RootElement.GetProperty("action").GetString();

            Invoke(() =>
            {
                switch (action)
                {
                    case "resize":
                        var w = json.RootElement.GetProperty("width").GetInt32();
                        var h = json.RootElement.GetProperty("height").GetInt32();
                        Size = new Size(w, h);
                        CenterToScreen();
                        break;
                    case "minimize":
                        WindowState = FormWindowState.Minimized;
                        break;
                    case "maximize":
                        WindowState = WindowState == FormWindowState.Maximized
                            ? FormWindowState.Normal
                            : FormWindowState.Maximized;
                        break;
                    case "close":
                        Close();
                        break;
                }
            });
        }
        catch { }
    }

    private Icon? _whiteIcon, _graphiteIcon, _sandstoneIcon, _currentIcon;
    private string _currentTheme = "";

    private void LoadThemeIcons()
    {
        try
        {
            var dir = Path.GetDirectoryName(Application.ExecutablePath) ?? AppContext.BaseDirectory;
            var load = (string file) =>
            {
                var path = Path.Combine(dir, file);
                return File.Exists(path)
                    ? Icon.FromHandle(new Bitmap(Image.FromFile(path)).GetHicon())
                    : null;
            };
            _whiteIcon = load("theme-white.png");
            _graphiteIcon = load("theme-graphite.png");
            _sandstoneIcon = load("theme-sandstone.png");
        }
        catch { }
    }

    private void UpdateAppIcon(string theme)
    {
        if (theme == _currentTheme) return; // 防重复
        _currentTheme = theme;

        var newIcon = theme switch
        {
            "graphite" => _graphiteIcon,
            "sandstone" => _sandstoneIcon,
            _ => _whiteIcon
        };

        if (newIcon != null && newIcon != _currentIcon)
        {
            if (_currentIcon != null)
            {
                try { DestroyIcon(_currentIcon.Handle); } catch { }
                _currentIcon.Dispose();
            }
            _currentIcon = (Icon)newIcon.Clone();
            Icon = _currentIcon;
        }
    }

    [DllImport("user32.dll")]
    private static extern bool DestroyIcon(IntPtr hIcon);
}
