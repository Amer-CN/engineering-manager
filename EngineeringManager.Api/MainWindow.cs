using Microsoft.Web.WebView2.WinForms;
using System.Runtime.InteropServices;
using System.Text.Json;

namespace EngineeringManager.Api;

public class MainWindow : Form
{
    private readonly bool _isProduction;
    private WebView2? webView;
    private bool _isFullScreen;
    private bool _isMaximized;
    private FormBorderStyle _preFullScreenBorder;
    private Rectangle _preFullScreenBounds;
    private Rectangle _preMaximizeBounds;

    // ── 手动 resize ──
    private bool _isResizing;
    private int _resizeEdge;
    private Point _resizeStartMouse;
    private Rectangle _resizeStartBounds;

    // ── 双击检测 ──
    private DateTime _lastClickTime = DateTime.MinValue;

    public MainWindow(bool isProduction = false)
    {
        _isProduction = isProduction;
        FormBorderStyle = FormBorderStyle.None;
        Icon = new Icon(Path.Combine(AppContext.BaseDirectory, "app.ico"));
        Size = new Size(300, 400);
        StartPosition = FormStartPosition.CenterScreen;
        ApplyNativeRoundedCorners();
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
    [DllImport("dwmapi.dll")]
    private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int attrValue, int attrSize);
    [DllImport("user32.dll")]
    private static extern void ReleaseCapture();
    [DllImport("user32.dll")]
    private static extern void SendMessage(IntPtr hWnd, int msg, int wParam, int lParam);
    [DllImport("user32.dll")]
    private static extern bool SetCapture(IntPtr hWnd);

    // ═══ 常量 ═══
    private const int WS_THICKFRAME  = 0x00040000;
    private const int WS_MINIMIZEBOX = 0x00020000;
    private const int WS_MAXIMIZEBOX = 0x00010000;
    private const int HTLEFT = 10, HTRIGHT = 11, HTTOP = 12, HTTOPLEFT = 13;
    private const int HTTOPRIGHT = 14, HTBOTTOM = 15, HTBOTTOMLEFT = 16, HTBOTTOMRIGHT = 17;
    private const int BORDER_SIZE = 6;

    /// <summary>
    /// API 冷启动期间显示的"启动中"占位页。
    /// 底色用主题无关的中性墨（取自 graphite token）；logo 用全站唯一品牌色 #c87a30（= 前端 --brand）。
    /// </summary>
    private const string WarmingHtml = """
        <!DOCTYPE html>
        <html><head><meta charset="utf-8"><style>
          *{margin:0;padding:0;box-sizing:border-box}
          body{display:flex;align-items:center;justify-content:center;
               height:100vh;background:#181716;font-family:'Microsoft YaHei',sans-serif}
          .wrap{text-align:center}
          .logo{width:48px;height:48px;margin:0 auto 20px;animation:pulse 1.2s ease-in-out infinite}
          .text{color:#7c7a77;font-size:14px;letter-spacing:1px}
          @keyframes pulse{0%,100%{opacity:.4;transform:scale(.95)}50%{opacity:1;transform:scale(1.05)}}
        </style></head><body><div class="wrap">
          <svg class="logo" viewBox="0 0 18 18" fill="none">
            <defs><mask id="m"><rect width="18" height="18" fill="white"/>
            <path d="M5 14 L9 6 L13 14 Z" fill="black"/></mask></defs>
            <path d="M2 15.5 L9 2.5 L16 15.5 Z" fill="#c87a30" mask="url(#m)"/>
          </svg>
          <div class="text">正在启动…</div>
        </div></body></html>
        """;

    // ═══════════════════════════════════════════════════════════
    // WndProc — 只处理光标变化
    // resize 由前端 div → postMessage → OnWebViewMouseDown 启动
    // ═══════════════════════════════════════════════════════════

    protected override void WndProc(ref Message m)
    {
        // resize 进行中：拦截鼠标移动和释放
        if (_isResizing)
        {
            switch (m.Msg)
            {
                case 0x0200: // WM_MOUSEMOVE
                    DoResize(Cursor.Position);
                    m.Result = IntPtr.Zero;
                    return;
                case 0x0202: // WM_LBUTTONUP
                    _isResizing = false;
                    ReleaseCapture();
                    m.Result = IntPtr.Zero;
                    return;
            }
        }

        switch (m.Msg)
        {
            case 0x0083: // WM_NCCALCSIZE
                if (m.WParam != IntPtr.Zero) { m.Result = IntPtr.Zero; return; }
                break;

            case 0x0020: // WM_SETCURSOR — 边缘光标
                if (!DesignMode && !_isFullScreen && !_isResizing)
                {
                    int ht = HitTestEdge(Cursor.Position, Bounds);
                    if (ht != 0)
                    {
                        int id = ht switch
                        {
                            HTLEFT or HTRIGHT => 32644,
                            HTTOP or HTBOTTOM => 32645,
                            HTTOPLEFT or HTBOTTOMRIGHT => 32642,
                            _ => 32643 // HTTOPRIGHT or HTBOTTOMLEFT
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

    [DllImport("user32.dll")]
    private static extern IntPtr LoadCursor(IntPtr h, IntPtr id);
    [DllImport("user32.dll")]
    private static extern IntPtr SetCursor(IntPtr h);

    // ═══════════════════════════════════════════════════════════
    // WebView2 鼠标事件 — 边缘启动 resize
    // ═══════════════════════════════════════════════════════════

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

    // ═══════════════════════════════════════════════════════════
    // WebView2 初始化
    // ═══════════════════════════════════════════════════════════

    protected override async void OnLoad(EventArgs e)
    {
        base.OnLoad(e);
        try
        {
            // ── 版本化缓存目录：每个版本独立缓存，彻底杜绝旧缓存 ──
            var appVersion = ReadFrontendVersion();
            var cacheDir = string.IsNullOrEmpty(appVersion)
                ? Path.Combine(Path.GetTempPath(), "engineering-manager-webview2")
                : Path.Combine(Path.GetTempPath(), $"engineering-manager-webview2-v{appVersion}");

            // 清理旧版本缓存目录（只删非当前版本的）
            CleanupOldCacheDirs(appVersion);

            webView = new WebView2 { Dock = DockStyle.Fill };
            Controls.Add(webView);

            var env = await Microsoft.Web.WebView2.Core.CoreWebView2Environment.CreateAsync(
                null, cacheDir);
            await webView.EnsureCoreWebView2Async(env);

            webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
            webView.CoreWebView2.Settings.AreDevToolsEnabled = true;
            webView.CoreWebView2.Settings.IsWebMessageEnabled = true;

            webView.CoreWebView2.WebMessageReceived += OnWebMessage;
            var frontendUrl = _isProduction ? "http://localhost:5048" : "http://localhost:5173";

            // 生产模式：WebView2 初始化与 API 冷启动并行后，导航前快速轮询就绪
            if (_isProduction)
            {
                // 先显示"启动中"占位页，避免轮询期间窗口空白
                webView.CoreWebView2.NavigateToString(WarmingHtml);
                using var client = new System.Net.Http.HttpClient { Timeout = TimeSpan.FromSeconds(1) };
                for (int i = 0; i < 150; i++) // 100ms × 150 ≈ 15s 兜底
                {
                    try { if ((await client.GetAsync("http://localhost:5048/api/health")).IsSuccessStatusCode) break; }
                    catch { }
                    await Task.Delay(100);
                }
            }
            webView.CoreWebView2.Navigate(frontendUrl);

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

    // ═══════════════════════════════════════════════════════════
    // WebView2 缓存管理 — 版本化缓存目录
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 从 dist/index.html 读取前端版本号（__APP_VERSION__）。
    /// 不依赖 C# Assembly version（可能因 MSBuild 评估时机滞后）。
    /// </summary>
    private static string? ReadFrontendVersion()
    {
        try
        {
            var exeDir = AppContext.BaseDirectory;
            var indexPath = Path.Combine(exeDir, "dist", "index.html");
            if (!File.Exists(indexPath)) return null;

            var html = File.ReadAllText(indexPath);
            // 匹配 window.__APP_VERSION__ = 'x.y.z'
            var match = System.Text.RegularExpressions.Regex.Match(
                html, @"__APP_VERSION__' *]= *'([0-9]+\.[0-9]+\.[0-9]+)'");
            return match.Success ? match.Groups[1].Value : null;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[MainWindow] 读取前端版本失败: {ex.Message}");
            return null;
        }
    }

    /// <summary>
    /// 清理旧版本的 WebView2 缓存目录（保留当前版本）。
    /// 在 WebView2 启动前执行，此时旧目录无文件锁。
    /// </summary>
    private static void CleanupOldCacheDirs(string? currentVersion)
    {
        try
        {
            var tempPath = Path.GetTempPath();
            var prefix = "engineering-manager-webview2";
            foreach (var dir in Directory.GetDirectories(tempPath, prefix + "*"))
            {
                var dirName = Path.GetFileName(dir);
                // 保留：无版本后缀的旧目录（兼容）+ 当前版本目录
                if (dirName == prefix) continue;  // 旧格式目录，跳过（可能有锁）
                if (dirName == $"{prefix}-v{currentVersion}") continue;  // 当前版本

                Console.WriteLine($"[MainWindow] 清理旧缓存: {dirName}");
                try { Directory.Delete(dir, true); }
                catch { /* 被占用则忽略 */ }
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[MainWindow] 清理旧缓存失败: {ex.Message}");
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 前端消息处理
    // startDrag — 立即拖动（无延迟），双击检测在 C# 侧
    // ═══════════════════════════════════════════════════════════

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
                    case "resize":
                        int w = j.RootElement.GetProperty("width").GetInt32();
                        int h = j.RootElement.GetProperty("height").GetInt32();
                        // 主界面大窗施加最小尺寸，防止拖得过窄导致布局挤压；登录小窗（300×400）不受限
                        MinimumSize = (w >= 900) ? new Size(960, 640) : Size.Empty;
                        Size = new Size(w, h); CenterToScreen(); break;
                    case "minimize":        WindowState = FormWindowState.Minimized; break;
                    case "maximize":        ToggleMaximize(); break;
                    case "fullscreen":      ToggleFullScreen(); break;
                    case "close":           Close(); break;
                    case "devtools":        webView!.CoreWebView2.OpenDevToolsWindow(); break;
                    case "startResize":
                        var edge = j.RootElement.GetProperty("edge").GetString() ?? "";
                        int htVal = edge switch
                        {
                            "left" => HTLEFT, "right" => HTRIGHT,
                            "top" => HTTOP, "bottom" => HTBOTTOM,
                            "top-left" => HTTOPLEFT, "top-right" => HTTOPRIGHT,
                            "bottom-left" => HTBOTTOMLEFT, "bottom-right" => HTBOTTOMRIGHT,
                            _ => 0
                        };
                        if (htVal != 0 && !_isFullScreen)
                        {
                            _isResizing = true;
                            _resizeEdge = htVal;
                            _resizeStartMouse = Cursor.Position;
                            _resizeStartBounds = Bounds;
                            SetCapture(Handle);
                        }
                        break;
                    case "startDrag":
                        // 双击检测：500ms 内两次 startDrag → 最大化
                        var now = DateTime.Now;
                        if ((now - _lastClickTime).TotalMilliseconds < 500)
                        {
                            _lastClickTime = DateTime.MinValue;
                            ToggleMaximize();
                        }
                        else
                        {
                            _lastClickTime = now;
                            ReleaseCapture();
                            SendMessage(Handle, 0xA1, 0x2, 0);
                        }
                        break;
                }
            });
        }
        catch { }
    }

    private void ToggleMaximize()
    {
        if (_isFullScreen) { _isFullScreen = false; FormBorderStyle = _preFullScreenBorder; NotifyFullScreenChange(); }
        if (_isMaximized) { _isMaximized = false; Bounds = _preMaximizeBounds; }
        else { _isMaximized = true; _preMaximizeBounds = Bounds; Bounds = Screen.FromHandle(Handle).WorkingArea; }
        NotifyMaximizeChange();
    }

    private void ToggleFullScreen()
    {
        if (_isFullScreen) { _isFullScreen = false; FormBorderStyle = _preFullScreenBorder; Bounds = _preFullScreenBounds; }
        else { _isFullScreen = true; _preFullScreenBorder = FormBorderStyle; _preFullScreenBounds = _isMaximized ? _preMaximizeBounds : Bounds; _isMaximized = false; FormBorderStyle = FormBorderStyle.None; Bounds = Screen.FromHandle(Handle).Bounds; }
        NotifyFullScreenChange();
    }

    private void NotifyMaximizeChange()
    {
        try { webView?.CoreWebView2?.PostWebMessageAsJson(JsonSerializer.Serialize(new { type = "maximizeChange", isMaximized = _isMaximized })); } catch { }
    }
    private void NotifyFullScreenChange()
    {
        try { webView?.CoreWebView2?.PostWebMessageAsJson(JsonSerializer.Serialize(new { type = "fullScreenChange", isFullScreen = _isFullScreen })); } catch { }
    }
}
