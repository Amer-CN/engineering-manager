using Microsoft.Web.WebView2.WinForms;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text.Json;

namespace EngineeringManager.Uninstaller;

public class UninstallerWindow : Form
{
    private WebView2? webView;
    private readonly string _appDir;      // 前端资源目录(exe 同级的 uninstaller\)
    private readonly string _installPath; // 真实安装目录(从 uninstaller.json 解析)

    // ── resize 相关 ──
    private bool _isResizing;
    private int _resizeEdge;
    private Point _resizeStartMouse;
    private Rectangle _resizeStartBounds;

    // ── 双击检测 ──
    private DateTime _lastClickTime = DateTime.MinValue;

    private static readonly string LogFile = Path.Combine(Path.GetTempPath(), "uninstaller-log.txt");

    private static void Log(string msg)
    {
        try { File.AppendAllText(LogFile, $"[{DateTime.Now:HH:mm:ss.fff}] {msg}\n"); } catch { }
        Debug.WriteLine(msg);
    }

    public UninstallerWindow()
    {
        try { File.WriteAllText(LogFile, $"=== 卸载器启动 {DateTime.Now:yyyy-MM-dd HH:mm:ss} ===\n"); } catch { }

        FormBorderStyle = FormBorderStyle.None;

        try
        {
            var iconStream = typeof(UninstallerWindow).Assembly
                .GetManifestResourceStream("EngineeringManager.Uninstaller.app.ico");
            if (iconStream != null) Icon = new Icon(iconStream);
        }
        catch { }

        Size = new Size(520, 580);
        StartPosition = FormStartPosition.CenterScreen;
        ApplyNativeRoundedCorners();

        // 前端资源目录 = 本程序所在目录(exe 同级的 uninstaller\)
        _appDir = AppContext.BaseDirectory;
        Log($"[Uninstaller] appDir: {_appDir}");

        // 真实安装目录:从同目录 uninstaller.json 解析。卸载器位于 <安装目录>\uninstall\,
        // 或已被复制到 %TEMP% 运行,两种情况都不能用 BaseDirectory 当安装目录。
        try
        {
            _installPath = UninstallerService.GetInstallPath();
        }
        catch (Exception ex)
        {
            _installPath = "";
            Log($"[Uninstaller] 解析安装目录失败: {ex.Message}");
        }
        Log($"[Uninstaller] installPath: {_installPath}");
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

    private void DoResize(Point mouse)
    {
        int dx = mouse.X - _resizeStartMouse.X;
        int dy = mouse.Y - _resizeStartMouse.Y;
        var b = _resizeStartBounds;
        int nl = b.Left, nt = b.Top, nw = b.Width, nh = b.Height;
        bool isL = _resizeEdge == HTLEFT || _resizeEdge == HTTOPLEFT || _resizeEdge == HTBOTTOMLEFT;
        bool isR = _resizeEdge == HTRIGHT || _resizeEdge == HTTOPRIGHT || _resizeEdge == HTBOTTOMRIGHT;
        bool isT = _resizeEdge == HTTOP || _resizeEdge == HTTOPLEFT || _resizeEdge == HTTOPRIGHT;
        bool isB = _resizeEdge == HTBOTTOM || _resizeEdge == HTBOTTOMLEFT || _resizeEdge == HTBOTTOMRIGHT;
        if (isL) { nl = b.Left + dx; nw = b.Width - dx; }
        if (isR) nw = b.Width + dx;
        if (isT) { nt = b.Top + dy; nh = b.Height - dy; }
        if (isB) nh = b.Height + dy;
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

            var webView2CacheDir = Path.Combine(Path.GetTempPath(), "uninstaller-webview2");
            try { if (Directory.Exists(webView2CacheDir)) Directory.Delete(webView2CacheDir, true); } catch { }

            var env = await Microsoft.Web.WebView2.Core.CoreWebView2Environment.CreateAsync(
                null, webView2CacheDir,
                new Microsoft.Web.WebView2.Core.CoreWebView2EnvironmentOptions("--allow-file-access-from-files"));
            await webView.EnsureCoreWebView2Async(env);

            webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
            webView.CoreWebView2.Settings.AreDevToolsEnabled = true;
            webView.CoreWebView2.Settings.IsWebMessageEnabled = true;
            webView.CoreWebView2.WebMessageReceived += OnWebMessage;

            var indexPath = Path.Combine(_appDir, "uninstaller", "index.html");
            Log($"[Uninstaller] indexPath: {indexPath}");

            if (File.Exists(indexPath))
            {
                webView.CoreWebView2.Navigate("file:///" + indexPath.Replace('\\', '/'));
                webView.CoreWebView2.NavigationCompleted += (s, args) =>
                {
                    EvalJS($"window.__setInstallPath?.('{EscapeJS(_installPath)}')");
                };
            }
            else
            {
                webView.CoreWebView2.NavigateToString(@"
                    <html><body style='display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#f8fafc;color:#0f172a'>
                    <div style='text-align:center'><h2>卸载器资源缺失</h2><p>无法找到卸载器前端文件</p></div></body></html>");
            }
        }
        catch (Exception ex)
        {
            Log($"[Uninstaller] OnLoad error: {ex}");
            MessageBox.Show($"初始化失败：{ex.Message}", "错误", MessageBoxButtons.OK, MessageBoxIcon.Error);
            Close();
        }
    }

    // ═══ 消息处理 ═══
    private void OnWebMessage(object? s, Microsoft.Web.WebView2.Core.CoreWebView2WebMessageReceivedEventArgs e)
    {
        try
        {
            var raw = e.TryGetWebMessageAsString();
            var j = JsonDocument.Parse(raw);
            var a = j.RootElement.GetProperty("action").GetString();
            Log($"[Uninstaller] Action: {a}");
            Invoke(() =>
            {
                try
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
                            { _isResizing = true; _resizeEdge = htVal; _resizeStartMouse = Cursor.Position; _resizeStartBounds = Bounds; SetCapture(Handle); }
                            break;
                        case "minimize": WindowState = FormWindowState.Minimized; break;
                        case "maximize": ToggleMaximize(); break;
                        case "close": Close(); break;
                        case "uninstall":
                            Log("[Uninstaller] Uninstall requested");
                            _ = Task.Run(async () =>
                            {
                                try { await DoUninstall(); }
                                catch (Exception ex)
                                {
                                    Log($"[Uninstaller] Exception: {ex}");
                                    EvalJS($"window.__installError?.('卸载失败: {EscapeJS(ex.Message)}')");
                                }
                            });
                            break;
                    }
                }
                catch (Exception innerEx) { Log($"[Uninstaller] Inner error: {innerEx}"); }
            });
        }
        catch (Exception outerEx) { Log($"[Uninstaller] OnWebMessage error: {outerEx}"); }
    }

    private void EvalJS(string js)
    {
        try { webView?.CoreWebView2?.ExecuteScriptAsync(js); }
        catch (Exception ex) { Log($"[Uninstaller] EvalJS error: {ex.Message}"); }
    }

    private async Task DoUninstall()
    {
        Log($"[Uninstaller] 开始卸载: {_installPath}");

        if (string.IsNullOrEmpty(_installPath) || !Directory.Exists(_installPath))
        {
            Log("[Uninstaller] 无法确定安装目录,终止卸载");
            BeginInvoke(() => EvalJS("window.__installError?.('无法确定安装目录,卸载已终止')"));
            return;
        }

        var service = new UninstallerService();
        await service.Uninstall(_installPath, (percent, step) =>
        {
            BeginInvoke(() => EvalJS($"window.__updateProgress?.({percent}, '{EscapeJS(step)}')"));
        });

        Log("[Uninstaller] 卸载完成");
        BeginInvoke(() =>
        {
            EvalJS("window.__installComplete?.()");
        });
    }

    private void ToggleMaximize()
    {
        WindowState = WindowState == FormWindowState.Maximized ? FormWindowState.Normal : FormWindowState.Maximized;
    }

    private static string EscapeJS(string s) => s.Replace("\\", "\\\\").Replace("'", "\\'").Replace("\n", "\\n");
}
