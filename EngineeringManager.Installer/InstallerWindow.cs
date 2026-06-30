using Microsoft.Web.WebView2.WinForms;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text.Json;

namespace EngineeringManager.Installer;

public class InstallerWindow : Form
{
    private WebView2? webView;
    private string _frontendDir = "";

    // ── resize 相关 ──
    private bool _isResizing;
    private int _resizeEdge;
    private Point _resizeStartMouse;
    private Rectangle _resizeStartBounds;

    // ── 双击检测 ──
    private DateTime _lastClickTime = DateTime.MinValue;

    public InstallerWindow()
    {
        FormBorderStyle = FormBorderStyle.None;

        // 从嵌入资源加载图标
        try
        {
            var iconStream = typeof(InstallerWindow).Assembly
                .GetManifestResourceStream("EngineeringManager.Installer.app.ico");
            if (iconStream != null) Icon = new Icon(iconStream);
        }
        catch { }

        Size = new Size(520, 580);
        StartPosition = FormStartPosition.CenterScreen;
        ApplyNativeRoundedCorners();

        // 预解压：在构造函数中同步解压，确保 OnLoad 时文件已就绪
        try
        {
            _frontendDir = InstallerService.GetInstallerFrontendDir();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Installer] 解压失败: {ex.Message}");
        }
    }

    protected override CreateParams CreateParams
    {
        get
        {
            var cp = base.CreateParams;
            cp.Style |= WS_THICKFRAME | WS_MINIMIZEBOX | WS_MAXIMIZEBOX;
            return cp;
        }
    }

    private void ApplyNativeRoundedCorners()
    {
        try { int p = 2; DwmSetWindowAttribute(Handle, 33, ref p, sizeof(int)); } catch { }
    }

    // ═══ P/Invoke ═══
    [DllImport("dwmapi.dll")] private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int attrValue, int attrSize);
    [DllImport("user32.dll")] private static extern void ReleaseCapture();
    [DllImport("user32.dll")] private static extern void SendMessage(IntPtr hWnd, int msg, int wParam, int lParam);
    [DllImport("user32.dll")] private static extern bool SetCapture(IntPtr hWnd);
    [DllImport("user32.dll")] private static extern IntPtr LoadCursor(IntPtr h, IntPtr id);
    [DllImport("user32.dll")] private static extern IntPtr SetCursor(IntPtr h);

    private const int WS_THICKFRAME  = 0x00040000;
    private const int WS_MINIMIZEBOX = 0x00020000;
    private const int WS_MAXIMIZEBOX = 0x00010000;
    private const int HTLEFT = 10, HTRIGHT = 11, HTTOP = 12, HTTOPLEFT = 13;
    private const int HTTOPRIGHT = 14, HTBOTTOM = 15, HTBOTTOMLEFT = 16, HTBOTTOMRIGHT = 17;
    private const int BORDER_SIZE = 6;

    // ═══ WndProc ═══
    protected override void WndProc(ref Message m)
    {
        if (_isResizing)
        {
            switch (m.Msg)
            {
                case 0x0200: DoResize(Cursor.Position); m.Result = IntPtr.Zero; return;
                case 0x0202: _isResizing = false; ReleaseCapture(); m.Result = IntPtr.Zero; return;
            }
        }

        switch (m.Msg)
        {
            case 0x0083:
                if (m.WParam != IntPtr.Zero) { m.Result = IntPtr.Zero; return; }
                break;
            case 0x0020:
                if (!DesignMode && !_isResizing)
                {
                    int ht = HitTestEdge(Cursor.Position, Bounds);
                    if (ht != 0)
                    {
                        int id = ht switch
                        {
                            HTLEFT or HTRIGHT => 32644,
                            HTTOP or HTBOTTOM => 32645,
                            HTTOPLEFT or HTBOTTOMRIGHT => 32642,
                            _ => 32643
                        };
                        SetCursor(LoadCursor(IntPtr.Zero, (IntPtr)id));
                        m.Result = IntPtr.Zero;
                        return;
                    }
                }
                break;
        }
        base.WndProc(ref m);
    }

    // ═══ Resize ═══
    private void DoResize(Point mouse)
    {
        int dx = mouse.X - _resizeStartMouse.X;
        int dy = mouse.Y - _resizeStartMouse.Y;
        var b = _resizeStartBounds;
        int nl = b.Left, nt = b.Top, nw = b.Width, nh = b.Height;

        bool isL = _resizeEdge == HTLEFT   || _resizeEdge == HTTOPLEFT   || _resizeEdge == HTBOTTOMLEFT;
        bool isR = _resizeEdge == HTRIGHT  || _resizeEdge == HTTOPRIGHT  || _resizeEdge == HTBOTTOMRIGHT;
        bool isT = _resizeEdge == HTTOP    || _resizeEdge == HTTOPLEFT   || _resizeEdge == HTTOPRIGHT;
        bool isB = _resizeEdge == HTBOTTOM || _resizeEdge == HTBOTTOMLEFT || _resizeEdge == HTBOTTOMRIGHT;

        if (isL) { nl = b.Left + dx; nw = b.Width - dx; }
        if (isR) { nw = b.Width + dx; }
        if (isT) { nt = b.Top + dy;  nh = b.Height - dy; }
        if (isB) { nh = b.Height + dy; }

        if (nw < 200) { nw = 200; if (isL) nl = b.Right - 200; }
        if (nh < 200) { nh = 200; if (isT) nt = b.Bottom - 200; }

        SetBounds(nl, nt, nw, nh);
    }

    private static int HitTestEdge(Point cursor, Rectangle rect)
    {
        bool l = cursor.X <= rect.Left + BORDER_SIZE;
        bool r = cursor.X >= rect.Right - BORDER_SIZE;
        bool t = cursor.Y <= rect.Top + BORDER_SIZE;
        bool b = cursor.Y >= rect.Bottom - BORDER_SIZE;
        if (t && l) return HTTOPLEFT;
        if (t && r) return HTTOPRIGHT;
        if (b && l) return HTBOTTOMLEFT;
        if (b && r) return HTBOTTOMRIGHT;
        if (l) return HTLEFT;
        if (r) return HTRIGHT;
        if (t) return HTTOP;
        if (b) return HTBOTTOM;
        return 0;
    }

    // ═══ WebView2 ═══
    protected override async void OnLoad(EventArgs e)
    {
        base.OnLoad(e);
        try
        {
            webView = new WebView2 { Dock = DockStyle.Fill };
            Controls.Add(webView);

            var env = await Microsoft.Web.WebView2.Core.CoreWebView2Environment.CreateAsync(
                null, Path.Combine(Path.GetTempPath(), "installer-webview2"));
            await webView.EnsureCoreWebView2Async(env);

            webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
            webView.CoreWebView2.Settings.AreDevToolsEnabled = true;
            webView.CoreWebView2.Settings.IsWebMessageEnabled = true;
            webView.CoreWebView2.WebMessageReceived += OnWebMessage;

            // 加载前端（用虚拟域名避免 file:// CORS 限制）
            var indexPath = Path.Combine(_frontendDir, "index.html");
            if (!string.IsNullOrEmpty(_frontendDir) && File.Exists(indexPath))
            {
                webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                    "installer.local", _frontendDir,
                    Microsoft.Web.WebView2.Core.CoreWebView2HostResourceAccessKind.Allow);
                webView.CoreWebView2.Navigate("http://installer.local/index.html");
            }
            else
            {
                webView.CoreWebView2.NavigateToString(@"
                    <html><body style='display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#f8fafc;color:#0f172a'>
                    <div style='text-align:center'>
                        <h2>安装器资源缺失</h2>
                        <p>找不到安装资源包 (payload.zip)</p>
                        <p style='color:#94a3b8;font-size:12px'>请确保安装器文件完整</p>
                    </div></body></html>");
            }
        }
        catch (Exception ex)
        {
            MessageBox.Show($"初始化失败：{ex.Message}", "错误", MessageBoxButtons.OK, MessageBoxIcon.Error);
            Close();
        }
    }

    // ═══ 消息处理 ═══
    private void OnWebMessage(object? s, Microsoft.Web.WebView2.Core.CoreWebView2WebMessageReceivedEventArgs e)
    {
        try
        {
            var j = JsonDocument.Parse(e.TryGetWebMessageAsString());
            var a = j.RootElement.GetProperty("action").GetString();
            Invoke(() =>
            {
                switch (a)
                {
                    case "startDrag":
                        var now = DateTime.Now;
                        if ((now - _lastClickTime).TotalMilliseconds < 500)
                        { _lastClickTime = DateTime.MinValue; ToggleMaximize(); }
                        else
                        { _lastClickTime = now; ReleaseCapture(); SendMessage(Handle, 0xA1, 0x2, 0); }
                        break;
                    case "startResize":
                        var edge = j.RootElement.GetProperty("edge").GetString() ?? "";
                        int htVal = edge switch
                        {
                            "left" => HTLEFT, "right" => HTRIGHT, "top" => HTTOP, "bottom" => HTBOTTOM,
                            "top-left" => HTTOPLEFT, "top-right" => HTTOPRIGHT,
                            "bottom-left" => HTBOTTOMLEFT, "bottom-right" => HTBOTTOMRIGHT, _ => 0
                        };
                        if (htVal != 0)
                        {
                            _isResizing = true; _resizeEdge = htVal;
                            _resizeStartMouse = Cursor.Position; _resizeStartBounds = Bounds;
                            SetCapture(Handle);
                        }
                        break;
                    case "minimize": WindowState = FormWindowState.Minimized; break;
                    case "maximize": ToggleMaximize(); break;
                    case "close": Close(); break;
                    case "browsePath":
                        using (var dlg = new FolderBrowserDialog())
                        {
                            dlg.Description = "选择安装位置";
                            if (dlg.ShowDialog() == DialogResult.OK)
                                SendToWeb(new { type = "selectedPath", path = dlg.SelectedPath });
                        }
                        break;
                    case "install":
                        var installPath = j.RootElement.GetProperty("path").GetString() ?? "";
                        Task.Run(() => DoInstall(installPath));
                        break;
                    case "launch":
                        var exePath = j.RootElement.GetProperty("path").GetString() ?? "";
                        if (File.Exists(exePath))
                            Process.Start(new ProcessStartInfo(exePath) { UseShellExecute = true });
                        Close();
                        break;
                }
            });
        }
        catch { }
    }

    private void SendToWeb(object data)
    {
        webView?.CoreWebView2?.PostWebMessageAsJson(JsonSerializer.Serialize(data));
    }

    private async void DoInstall(string installPath)
    {
        try
        {
            var service = new InstallerService();
            await service.Install(installPath, (percent, step) =>
            {
                SendToWeb(new { type = "progress", percent, step });
            });
            SendToWeb(new { type = "installComplete", path = installPath });
        }
        catch (Exception ex)
        {
            SendToWeb(new { type = "installError", message = ex.Message });
        }
    }

    private void ToggleMaximize()
    {
        WindowState = WindowState == FormWindowState.Maximized
            ? FormWindowState.Normal : FormWindowState.Maximized;
    }
}
