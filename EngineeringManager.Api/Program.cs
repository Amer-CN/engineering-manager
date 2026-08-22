using System.Data;
using System.Security.Cryptography;
using Microsoft.Data.Sqlite;
using Dapper;
using Microsoft.Extensions.FileProviders;
using EngineeringManager.Api;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Http.Features;

// ============ API 配置类（供 EntryPoint.cs 调用） ============

/// <summary>
/// JWT secret 提供者 (P0-1/P0-8 修复)。
/// 优先级: JWT_SECRET 环境变量 > 持久化文件 (%APPDATA%\工程管家\jwt.key) > 首次生成。
/// 持久化文件机器绑定,不随数据存储路径迁移,避免密钥外泄到备份/其他机器。
/// </summary>
public static class JwtSecretProvider
{
    private static string? _cached;
    private static readonly object _lock = new();

    public static string GetOrCreate()
    {
        lock (_lock)
        {
            if (_cached != null) return _cached;

            // 1. 优先环境变量 (开发/运维场景显式覆盖)
            var env = Environment.GetEnvironmentVariable("JWT_SECRET");
            if (!string.IsNullOrWhiteSpace(env) && env.Length >= 32)
            {
                _cached = env;
                return _cached;
            }

            // 2. 持久化文件
            var path = GetKeyPath();
            try
            {
                if (File.Exists(path))
                {
                    var fromFile = File.ReadAllText(path).Trim();
                    if (fromFile.Length >= 32) { _cached = fromFile; return _cached; }
                }
            }
            catch (Exception ex) { Console.Error.WriteLine($"[JwtSecret] 读取持久化文件失败: {Common.Sanitize(ex.Message)}"); }

            // 3. 首次启动生成随机 32 字节密钥 (base64 编码),持久化
            var bytes = RandomNumberGenerator.GetBytes(32);
            var generated = Convert.ToBase64String(bytes);
            try
            {
                Directory.CreateDirectory(Path.GetDirectoryName(path)!);
                File.WriteAllText(path, generated);
                Console.Out.WriteLine("[JwtSecret] 已生成并持久化随机 JWT secret (首次启动)");
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[JwtSecret] 持久化失败,使用内存临时密钥: {Common.Sanitize(ex.Message)}");
            }
            _cached = generated;
            return _cached;
        }
    }

    private static string GetKeyPath() =>
        Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "工程管家", "jwt.key");
}

public static class ApiConfig
{
    // ── M-EDITION1: 版本开关 ──
    private static string? _cachedEdition;

    /// <summary>
    /// 读取 config.json 中的 edition 字段（"personal" | "enterprise"），默认 "personal"。
    /// 启动后缓存，运行期不变。
    /// </summary>
    public static string GetEdition()
    {
        if (_cachedEdition != null) return _cachedEdition;
        // 环境变量优先（用于测试 / CI 隔离）
        var envEdition = Environment.GetEnvironmentVariable("ENGINEERING_MANAGER_EDITION");
        if (!string.IsNullOrEmpty(envEdition))
        {
            _cachedEdition = envEdition == "enterprise" ? "enterprise" : "personal";
            return _cachedEdition;
        }
        try
        {
            var configPath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "工程管家", "config.json");
            if (File.Exists(configPath))
            {
                var json = File.ReadAllText(configPath);
                using var doc = System.Text.Json.JsonDocument.Parse(json);
                if (doc.RootElement.TryGetProperty("edition", out var ed) && ed.GetString() is { Length: > 0 } val)
                {
                    _cachedEdition = val == "enterprise" ? "enterprise" : "personal";
                    return _cachedEdition;
                }
            }
        }
        catch { }
        _cachedEdition = "personal";
        return _cachedEdition;
    }

    // X8: IsPersonal / IsEnterprise 已移除。业务代码统一用 EditionFeatures.Has(key)。
    // edition 值仅通过 GetEdition() 暴露给 EditionFeatures 映射表。

    public static void ConfigureServices(WebApplicationBuilder builder)
    {
        // 生产 5048; 测试环境 (ASPNETCORE_ENVIRONMENT=Development) 用 random port 0
        // 测试 base 设了 ASPNETCORE_ENVIRONMENT=Development, 避免端口冲突
        var testMode = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development"
            && Environment.GetEnvironmentVariable("DISABLE_RATELIMIT") == "1";
        builder.WebHost.UseUrls(testMode ? "http://127.0.0.1:0" : "http://localhost:5048");

        // M4: 允许大音频上传 (500MB) — multipart/form-data 流式上传
        // Kestrel MaxRequestBodySize 控制整体 HTTP body 上限
        // FormOptions.MultipartBodyLengthLimit 控制 multipart 单段上限（默认 128MB，不够）
        builder.WebHost.ConfigureKestrel(options =>
        {
            options.Limits.MaxRequestBodySize = 550 * 1024 * 1024; // 550MB (略大于 500MB 上限)
        });
        builder.Services.Configure<FormOptions>(options =>
        {
            options.MultipartBodyLengthLimit = 550 * 1024 * 1024; // 550MB
        });

        // v1.2.0: PII 字段级加密 (AES-GCM + DPAPI master key)
        builder.Services.AddSingleton<EngineeringManager.Api.Security.PiiProtector>();
        // v0.78.0 PII 后台 re-encrypt worker (admin rotate key 后调用)
        builder.Services.AddSingleton<EngineeringManager.Api.Security.PiiReencryptWorker>();

        // v1.3.0 Agent AI 助手服务
        builder.Services.AddSingleton<EngineeringManager.Api.Services.LlmConfigResolver>();
        builder.Services.AddSingleton<EngineeringManager.Api.Services.LlmProviderService>();
        builder.Services.AddSingleton<EngineeringManager.Api.Services.ILlmChatService>(sp =>
            sp.GetRequiredService<EngineeringManager.Api.Services.LlmProviderService>());
        builder.Services.AddSingleton<EngineeringManager.Api.Services.IModelRouter, EngineeringManager.Api.Services.ModelRoutingService>();
        builder.Services.AddSingleton<EngineeringManager.Api.Services.AgentToolService>();
        builder.Services.AddSingleton<EngineeringManager.Api.Services.AgentConversationService>();
        builder.Services.AddSingleton<EngineeringManager.Api.Services.ReportGenerationService>();
        builder.Services.AddSingleton<EngineeringManager.Api.Services.WritingSkillService>();
        builder.Services.AddSingleton<EngineeringManager.Api.Services.UpdateService>();

        // v0.83 STT 语音转文字后台 worker（单并发）
        builder.Services.AddHostedService<EngineeringManager.Api.Services.Stt.SttWorker>();

        // v0.84 M2 知识库：文本嵌入服务 + 知识库服务
        builder.Services.AddSingleton<EngineeringManager.Api.Services.IEmbeddingService, EngineeringManager.Api.Services.BgeEmbeddingService>();

        builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
            p.WithOrigins("http://localhost:5173", "http://localhost:3000", "http://localhost:5048")
             .AllowAnyMethod()
             .AllowAnyHeader()));

                builder.Services.AddScoped<IDbConnection>(_ =>
        {
            // 连接工厂只负责创建/打开连接：建表与迁移已移至启动期 InitializeDatabase 一次性执行，
            // 避免每个 Scoped 连接重跑迁移（冷启动慢 + 迁移日志重复的根因）
            var dbPath = Path.Combine(ResolveDataPath(), "engineering.db");
            var dir = Path.GetDirectoryName(dbPath)!;
            if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
            var conn = new SqliteConnection($"Data Source={dbPath}");
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "PRAGMA journal_mode=WAL";
            cmd.ExecuteNonQuery();
            return conn;
        });


        builder.Services.AddAuthentication(Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
            {
                // P0-1/P0-8: JWT secret 不再硬编码默认值。优先级: 环境变量 > 持久化文件。
                // 首次启动若无环境变量则生成随机 32 字节密钥,持久化到 %APPDATA%\工程管家\jwt.key
                // (机器绑定: 不随数据备份迁移到其他机器, 避免密钥外泄)
                var jwtSecret = JwtSecretProvider.GetOrCreate();
                options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
                {
                    ValidateIssuer = true, ValidateAudience = true, ValidateLifetime = true, ValidateIssuerSigningKey = true,
                    ValidIssuer = "engineering-manager", ValidAudience = "engineering-manager",
                    IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(jwtSecret))
                };
            });
        builder.Services.AddAuthorization();
        builder.Services.AddHttpClient();

// 版本更新：manifest 拉取（30s 短超时）
builder.Services.AddHttpClient("update", c => c.Timeout = TimeSpan.FromSeconds(30));
// 安装包下载：连接/响应头超时 10s，但【无整体下载死超时】（大文件靠慢速看门狗控制）
builder.Services.AddHttpClient("update-download", c =>
{
    c.Timeout = Timeout.InfiniteTimeSpan; // 禁用整体超时，靠看门狗
});

        // P0-4: 限流（登录防爆破 + 写防滥用）
        builder.Services.AddRateLimiter(options =>
            {
                // 登录限流：1 个 IP 1 分钟最多 5 次
                options.AddPolicy("login", httpContext =>
                {
                    var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                    return System.Threading.RateLimiting.RateLimitPartition.GetFixedWindowLimiter(
                        ip,
                        _ => new System.Threading.RateLimiting.FixedWindowRateLimiterOptions
                        {
                            PermitLimit = 5,
                            Window = TimeSpan.FromMinutes(1),
                            QueueLimit = 0
                        });
                });

                // 写限流：1 个 IP 1 秒最多 30 次
                options.AddPolicy("write", httpContext =>
                {
                    var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                    return System.Threading.RateLimiting.RateLimitPartition.GetFixedWindowLimiter(
                        ip,
                        _ => new System.Threading.RateLimiting.FixedWindowRateLimiterOptions
                        {
                            PermitLimit = 30,
                            Window = TimeSpan.FromSeconds(1),
                            QueueLimit = 0
                        });
                });

                // 429 响应
                options.OnRejected = async (context, token) =>
                {
                    context.HttpContext.Response.StatusCode = 429;
                    await context.HttpContext.Response.WriteAsJsonAsync(new { success = false, error = "请求过于频繁，请稍后再试" }, token);
                };
            });

// 支持 camelCase JSON 反序列化（前端发 camelCase，后端 DTO 用 PascalCase）
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNameCaseInsensitive = true;
});
    }

    /// <summary>
    /// 生产模式标记：dist/ 存在时为 true（C# 自托管前端静态文件）
    /// </summary>
    public static bool IsProduction { get; private set; }

    public static void ConfigureApp(WebApplication app)
    {
        // 检测 dist/ 是否存在 → 生产模式
        var distPath = Path.Combine(AppContext.BaseDirectory, "dist");
        IsProduction = Directory.Exists(distPath);

        if (IsProduction)
        {
            Console.WriteLine($"[App] 生产模式：托管前端静态文件 {distPath}");

            // 0. 安全：ocr-config.json 含百度密钥，禁止经 HTTP 下发（含静态文件与 SPA 回退两条路径；
            //    后端 LoadOcrConfig 仍可从本地路径读取该文件做兼容回退）。
            //    OnPrepareResponse 无法阻止中间件写出文件体（实测 404 状态码下 body 仍下发），
            //    SPA 回退 MapWhen 也会拦截该路径返回 index.html，故用内联中间件在两者之前终结请求。
            app.Use(async (ctx, next) =>
            {
                if (string.Equals(ctx.Request.Path.Value, "/ocr-config.json", StringComparison.OrdinalIgnoreCase))
                {
                    ctx.Response.StatusCode = StatusCodes.Status404NotFound;
                    ctx.Response.Headers["Cache-Control"] = "no-cache, no-store";
                    return;
                }
                await next();
            });

            // 1. SPA 默认文件（index.html）
            app.UseDefaultFiles(new DefaultFilesOptions
            {
                FileProvider = new PhysicalFileProvider(distPath)
            });

            // 2. 静态文件服务（JS/CSS/图片 + ocr-config.json 等）
            // 缓存策略：
            //   - index.html (入口 HTML): no-cache, no-store, must-revalidate — 每次必须重新验证，防 WebView2 缓存旧前端
            //   - 带 hash 的 JS/CSS (如 index-B2cgUbMM.js): public, max-age=31536000, immutable — 长期缓存，文件名变=自动失效
            //   - 其他静态文件 (ocr-config.json 等): no-cache — 每次重新验证
            app.UseStaticFiles(new StaticFileOptions
            {
                FileProvider = new PhysicalFileProvider(distPath),
                OnPrepareResponse = ctx =>
                {
                    var path = ctx.File.Name;
                    if (path.EndsWith(".html", StringComparison.OrdinalIgnoreCase))
                    {
                        // 入口 HTML 禁止缓存
                        ctx.Context.Response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
                        ctx.Context.Response.Headers["Pragma"] = "no-cache";
                        ctx.Context.Response.Headers["Expires"] = "0";
                    }
                    else if (path.EndsWith(".js", StringComparison.OrdinalIgnoreCase) ||
                             path.EndsWith(".css", StringComparison.OrdinalIgnoreCase))
                    {
                        // 带 content-hash 的 JS/CSS 长期缓存 + immutable
                        // Vite 生成的文件名含 content hash，文件内容变=文件名变=自动失效
                        ctx.Context.Response.Headers["Cache-Control"] = "public, max-age=31536000, immutable";
                    }
                    else
                    {
                        // 其他静态文件（如 ocr-config.json）每次验证
                        ctx.Context.Response.Headers["Cache-Control"] = "no-cache";
                    }
                }
            });
        }

        // 启动期防呆：检查 Update:ManifestUrls 是否仍含占位符
        try
        {
            var manifestUrls = app.Configuration.GetSection("Update:ManifestUrls").Get<string[]>();
            if (manifestUrls != null)
            {
                foreach (var url in manifestUrls)
                {
                    if (url.Contains("example.cn", StringComparison.OrdinalIgnoreCase))
                    {
                        Console.Error.WriteLine("[WARN] [Update] ManifestUrls 仍含占位符 example.cn，线上请替换为真实地址");
                        break;
                    }
                }
            }
        }
        catch { /* 配置读取异常不阻塞启动 */ }

        app.UseCors();
        app.UseExceptionHandler(errorApp =>
        {
            errorApp.Run(async context =>
            {
                context.Response.StatusCode = 500;
                context.Response.ContentType = "application/json";
                var error = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>();
                if (error != null)
                {
                    Console.Error.WriteLine($"[Global] 未处理异常: {error.Error.Message}");
                    await context.Response.WriteAsJsonAsync(new { success = false, error = "服务器内部错误" });
                }
            });
        });
        app.UseAuthentication();
        app.UseAuthorization();
        app.UseMiddleware<EngineeringManager.Api.GlobalAuthMiddleware>();
        // v1.1.0: 测试环境 (DISABLE_RATELIMIT=1) 跳过 rate limiter
        if (Environment.GetEnvironmentVariable("DISABLE_RATELIMIT") != "1")
        {
            app.UseRateLimiter();
        }
        RegisterEndpoints(app);

        // v0.76.0 累计待办 #5: PII 列级 key rotation - 启动时初始化 PiiProtector (从 pii_keys 表加载所有 key, 旧 pii_keys 空时从 pp.key 迁移)
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<IDbConnection>();
            var pii = app.Services.GetRequiredService<EngineeringManager.Api.Security.PiiProtector>();
            pii.Initialize(db);
        }

        if (IsProduction)
        {
            // 3. SPA 回退：非 /api 路由全部返回 index.html
            // 必须设置 no-cache 头：SPA fallback 使用 SendFileAsync 绕过了 UseStaticFiles 的 OnPrepareResponse，
            // 如果不显式设置 Cache-Control，浏览器/WebView2 可能缓存旧版 index.html，
            // 导致引用的旧 hash JS/CSS 文件名 404 或加载过时前端。
            app.MapWhen(ctx => !ctx.Request.Path.StartsWithSegments("/api"), spa =>
            {
                spa.Use(async (ctx, next) =>
                {
                    var indexPath = Path.Combine(distPath, "index.html");
                    if (File.Exists(indexPath))
                    {
                        ctx.Response.ContentType = "text/html; charset=utf-8";
                        // 入口 HTML 必须禁止缓存（与 UseStaticFiles 的 OnPrepareResponse 策略一致）
                        ctx.Response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
                        ctx.Response.Headers["Pragma"] = "no-cache";
                        ctx.Response.Headers["Expires"] = "0";
                        await ctx.Response.SendFileAsync(indexPath);
                    }
                    else
                    {
                        await next();
                    }
                });
            });
        }
    }

    private static void RegisterEndpoints(WebApplication app)
    {
        // 认证 + 角色 + 用户管理
        app.RegisterAuthEndpoints();

        // 用户偏好 (v0.75.0 PII Mask toggle 多设备同步)
        app.RegisterUserPreferencesEndpoints();
        app.RegisterPiiKeyEndpoints(); // v0.76.0 累计待办 #5: PII key rotation API

        // 项目 + 仪表盘 + 项目成员
        app.RegisterProjectEndpoints();

        // 成员 + 工人 + 项目工人 + 班组 + 部门
        app.RegisterMemberEndpoints();

        // 合作伙伴 + 监管单位
        app.RegisterPartnerEndpoints();

        // 发票 + 收付款记录
        app.RegisterInvoiceEndpoints();

        // 合同 + 合同模板 + 结算
        app.RegisterContractEndpoints();

        // 工资 + 考勤 + 薪资历史
        app.RegisterWageEndpoints();

        // 成本台账
        app.RegisterCostLedgerEndpoints();

        // 库存 + 物料
        app.RegisterInventoryEndpoints();

        // 文件操作 + 图纸
        app.RegisterFileEndpoints();

        // 区域 + 模板 + 项目工人杂项
        app.RegisterRegionEndpoints();
        app.RegisterTemplateEndpoints();
        app.RegisterProjectWorkerMiscEndpoints();

        // OCR（百度）
        app.RegisterOcrEndpoints();
        OcrSetupWizard.Map(app);

        // 健康检查 + 快照 + 配置 + 审计日志
        app.RegisterSystemEndpoints();

        // v1.3.0 Agent AI 助手
        app.RegisterAgentEndpoints();

        // v0.80 版本更新检查
        app.RegisterUpdateEndpoints();

        // v0.83 STT 语音转文字
        app.RegisterSttEndpoints();

        // v0.84 M2 知识库
        app.RegisterKnowledgeEndpoints();
        // M3 知识库文件夹
        app.RegisterKnowledgeFolderEndpoints();

        // v0.92 写作中心
        app.RegisterWritingEndpoints();
        // R3 写作中心文件夹
        app.RegisterWritingFolderEndpoints();

        // v1.4.0 报告生成
        app.RegisterReportEndpoints();
    }
    // ============ P0-1: 从 config.json 读取 dataPath ============
    public static string ResolveDataPath()
    {
        // 环境变量优先级最高 — 用于开发版与安装版数据隔离
        var envPath = Environment.GetEnvironmentVariable("ENGINEERING_MANAGER_DATA_PATH");
        if (!string.IsNullOrEmpty(envPath))
            return envPath;

        var defaultPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "工程管家");
        try
        {
            var configPath = Path.Combine(defaultPath, "config.json");
            if (File.Exists(configPath))
            {
                var json = File.ReadAllText(configPath);
                var doc = System.Text.Json.JsonDocument.Parse(json);
                if (doc.RootElement.TryGetProperty("dataPath", out var dp) && dp.GetString() is { Length: > 0 } path)
                    return path;
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[ResolveDataPath] 读取 config.json 失败: {ex.Message}");
        }
        return defaultPath;
    }

    /// <summary>
    /// 应用启动期一次性数据库初始化：建目录 → 打开初始化连接 → EnsureTables → 幂等列迁移 →
    /// 种子管理员 → MigrationRunner.Run → 关闭连接。必须在开始接受请求前完成。
    /// </summary>
    public static void InitializeDatabase()
    {
        var dbPath = Path.Combine(ResolveDataPath(), "engineering.db");
        var dir = Path.GetDirectoryName(dbPath)!;
        if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
        using var conn = new SqliteConnection($"Data Source={dbPath}");
        conn.Open();
        using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = "PRAGMA journal_mode=WAL";
            cmd.ExecuteNonQuery();
        }
        EnsureTables(conn);
        // v0.80: is_default_password 列迁移（幂等；先探测列是否存在，避免依赖静默 catch）
        if (conn.ExecuteScalar<int>("SELECT COUNT(*) FROM pragma_table_info('users') WHERE name='is_default_password'") == 0)
            conn.Execute(@"ALTER TABLE users ADD COLUMN is_default_password INTEGER DEFAULT 0");
        // v0.80: 种子管理员（仅在 users 空表时触发）
        SeedDefaultAdmin(conn);
        // v0.72.0: 跑 migrations 脚本（idempotent，自动跳过已跑的）
        EngineeringManager.Api.Migrations.MigrationRunner.Run($"Data Source={dbPath}");
    }

    /// <summary>
    /// 启动期初始化（带失败处理）：失败则记录完整异常并以非零码退出，
    /// 不允许带着半迁移数据库继续监听端口。
    /// </summary>
    public static void InitializeDatabaseOrExit()
    {
        try
        {
            InitializeDatabase();
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[Startup] 数据库初始化失败，应用以非零码退出: {ex}");
            Environment.Exit(1);
        }
    }

    // ============ P0-7: 建表逻辑 ============
    private static void EnsureTables(IDbConnection db)
    {
        db.Execute(@"
CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT, address TEXT, start_date TEXT, end_date TEXT, status TEXT DEFAULT 'active', budget REAL DEFAULT 0, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS members (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT, email TEXT, member_type TEXT DEFAULT 'staff', role TEXT, id_card TEXT, gender TEXT, ethnicity TEXT, birth_date TEXT, id_card_address TEXT, base_salary REAL, daily_wage REAL, entry_date TEXT, status TEXT DEFAULT 'active', department_id INTEGER, position TEXT, bank_account TEXT, bank_name TEXT, bank_line_no TEXT, photo TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS workers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, id_card TEXT, gender TEXT, phone TEXT, address TEXT, bank_account TEXT, bank_name TEXT, bank_line_no TEXT, worker_type TEXT, daily_wage REAL, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS project_workers (id INTEGER PRIMARY KEY AUTOINCREMENT, worker_id INTEGER, project_id INTEGER, team_id INTEGER, daily_wage REAL, worker_type TEXT, entry_date TEXT, status TEXT DEFAULT 'active', created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS income_contracts (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, name TEXT NOT NULL, amount REAL, counterparty TEXT, sign_date TEXT, status TEXT DEFAULT 'draft', remark TEXT, files TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS expense_contracts (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, name TEXT NOT NULL, amount REAL, counterparty TEXT, sign_date TEXT, status TEXT DEFAULT 'draft', remark TEXT, files TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS agreement_contracts (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, name TEXT NOT NULL, amount REAL, counterparty TEXT, sign_date TEXT, agreement_type TEXT, status TEXT DEFAULT 'draft', remark TEXT, files TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    seller_id INTEGER,
    buyer_id INTEGER,
    contract_id INTEGER,
    type TEXT,
    invoice_kind TEXT,
    invoice_no TEXT,
    invoice_code TEXT,
    name TEXT,
    amount REAL DEFAULT 0,
    price_amount REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    tax_rate REAL DEFAULT 0,
    received_amount REAL DEFAULT 0,
    settlement_id INTEGER,
    issue_date TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    remarks TEXT DEFAULT '',
    file_url TEXT,
    file_type TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS payment_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    amount REAL DEFAULT 0,
    record_date TEXT DEFAULT '',
    project_id INTEGER,
    partner_id INTEGER,
    contract_id INTEGER,
    invoice_details TEXT DEFAULT '[]',
    remarks TEXT DEFAULT '',
    file_url TEXT,
    file_type TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS partners (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT, contact TEXT, phone TEXT, email TEXT, address TEXT, bank_account TEXT, bank_name TEXT, credit_code TEXT, registered_address TEXT, business_scope TEXT, tax_type TEXT, license_file TEXT, license_file_type TEXT, other_files TEXT, other_files_type TEXT, project_ids TEXT, remarks TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS supervisors (id INTEGER PRIMARY KEY AUTOINCREMENT, region_id INTEGER, name TEXT NOT NULL, category TEXT, contact TEXT, phone TEXT, address TEXT, project_ids TEXT, remarks TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS wages (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, member_id INTEGER, project_worker_id INTEGER, year_month TEXT, daily_wage REAL, work_days REAL, bonus REAL DEFAULT 0, deduction REAL DEFAULT 0, actual_wage REAL, paid_amount REAL, paid_date TEXT, status TEXT DEFAULT 'pending', created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS attendances (id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER, project_id INTEGER, project_worker_id INTEGER, year_month TEXT, work_days REAL, days_off INTEGER, is_full_attendance INTEGER, daily_status TEXT, file_url TEXT, file_name TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS settlements (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, contract_id INTEGER, partner_id INTEGER, type TEXT, sub_type TEXT, name TEXT, category TEXT, settlement_no TEXT, amount REAL, status TEXT DEFAULT 'pending', settlement_date TEXT, date TEXT, remark TEXT, remarks TEXT, files TEXT, items TEXT, invoice_details TEXT, created_by TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS cost_ledger (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, batch_id INTEGER, voucher_no TEXT, date TEXT, direction TEXT, category TEXT, amount REAL, counterparty TEXT, channel TEXT, summary TEXT, notes TEXT, attachments TEXT, linked_invoice_id INTEGER, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS cost_ledger_categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, direction TEXT, level1 TEXT, color TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS cost_ledger_match_rules (id INTEGER PRIMARY KEY AUTOINCREMENT, pattern TEXT, category TEXT, direction TEXT, priority INTEGER, created_at TEXT);
CREATE TABLE IF NOT EXISTS inventory_items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT, unit TEXT, quantity REAL DEFAULT 0, min_quantity REAL, location TEXT, notes TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS inventory_transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, item_id INTEGER, project_id INTEGER, type TEXT, quantity REAL, unit_price REAL, date TEXT, notes TEXT, operator TEXT, remark TEXT, created_by TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS materials (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT, unit TEXT, specifications TEXT, supplier TEXT, notes TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS templates (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT, category TEXT, content TEXT, description TEXT, file_name TEXT, stored_file_name TEXT, file_type TEXT, variables TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT, level TEXT, user_id TEXT, user_name TEXT, resource TEXT, resource_id TEXT, details TEXT, ip_address TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS roles (id TEXT PRIMARY KEY, name TEXT NOT NULL, permissions TEXT, is_system INTEGER DEFAULT 0, created_at TEXT);
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT, password_hash TEXT NOT NULL, password_salt TEXT, password_hash_version INTEGER DEFAULT 1, salt TEXT, display_name TEXT, role_id TEXT, status TEXT DEFAULT 'active', avatar TEXT, is_default_password INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS snapshots (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, size INTEGER, created_at TEXT);
CREATE TABLE IF NOT EXISTS departments (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, manager_id INTEGER, positions TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS salary_history (id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER, effective_date TEXT, base_salary REAL, subsidy REAL, subsidy_note TEXT, note TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS worker_teams (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, project_id INTEGER, leader_id INTEGER, remark TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS project_members (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, member_id INTEGER, joined_at TEXT);
CREATE TABLE IF NOT EXISTS regions (id INTEGER PRIMARY KEY AUTOINCREMENT, province TEXT, city TEXT, district TEXT);
CREATE TABLE IF NOT EXISTS drawings (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, name TEXT, file_url TEXT, file_name TEXT, file_type TEXT, drawing_type TEXT, scale TEXT, notes TEXT, remark TEXT, created_by TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS contract_templates (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT, content TEXT, variables TEXT, created_at TEXT, updated_at TEXT);
");

            // invoices 表迁移：添加缺失列
            try { db.Execute(@"ALTER TABLE invoices ADD COLUMN seller_id INTEGER"); } catch (Exception ex) { Console.Error.WriteLine($"[EnsureTables] invoices seller_id: {ex.Message}"); }
            try { db.Execute(@"ALTER TABLE invoices ADD COLUMN buyer_id INTEGER"); } catch (Exception ex) { Console.Error.WriteLine($"[EnsureTables] invoices buyer_id: {ex.Message}"); }
            try { db.Execute(@"ALTER TABLE invoices ADD COLUMN received_amount REAL DEFAULT 0"); } catch (Exception ex) { Console.Error.WriteLine($"[EnsureTables] invoices received_amount: {ex.Message}"); }
            try { db.Execute(@"ALTER TABLE invoices ADD COLUMN settlement_id INTEGER"); } catch (Exception ex) { Console.Error.WriteLine($"[EnsureTables] invoices settlement_id: {ex.Message}"); }

            // contract_templates 表迁移：旧库（早期版本建表）缺 content/variables 等列，自愈补齐（重复列报错属预期，记录即可）
            try { db.Execute(@"ALTER TABLE contract_templates ADD COLUMN content TEXT"); } catch (Exception ex) { Console.Error.WriteLine($"[EnsureTables] contract_templates content: {ex.Message}"); }
            try { db.Execute(@"ALTER TABLE contract_templates ADD COLUMN variables TEXT"); } catch (Exception ex) { Console.Error.WriteLine($"[EnsureTables] contract_templates variables: {ex.Message}"); }
            try { db.Execute(@"ALTER TABLE contract_templates ADD COLUMN created_at TEXT"); } catch (Exception ex) { Console.Error.WriteLine($"[EnsureTables] contract_templates created_at: {ex.Message}"); }
            try { db.Execute(@"ALTER TABLE contract_templates ADD COLUMN updated_at TEXT"); } catch (Exception ex) { Console.Error.WriteLine($"[EnsureTables] contract_templates updated_at: {ex.Message}"); }
            try { db.Execute(@"ALTER TABLE contract_templates ADD COLUMN created_by INTEGER"); } catch (Exception ex) { Console.Error.WriteLine($"[EnsureTables] contract_templates created_by: {ex.Message}"); }
            try { db.Execute(@"ALTER TABLE contract_templates ADD COLUMN version INTEGER DEFAULT 1"); } catch (Exception ex) { Console.Error.WriteLine($"[EnsureTables] contract_templates version: {ex.Message}"); }
            try { db.Execute(@"ALTER TABLE contract_templates ADD COLUMN last_modified_at TEXT"); } catch (Exception ex) { Console.Error.WriteLine($"[EnsureTables] contract_templates last_modified_at: {ex.Message}"); }

            // payment_records 表迁移
            try
            {
                var hasOldSchema = db.ExecuteScalar<int>(@"SELECT COUNT(*) FROM pragma_table_info('payment_records') WHERE name='date'") > 0;
                if (hasOldSchema)
                {
                    db.Execute(@"
                        CREATE TABLE IF NOT EXISTS payment_records_new (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            type TEXT NOT NULL DEFAULT 'payment_out',
                            amount REAL DEFAULT 0,
                            record_date TEXT DEFAULT '',
                            project_id INTEGER,
                            partner_id INTEGER,
                            contract_id INTEGER,
                            invoice_details TEXT DEFAULT '[]',
                            remarks TEXT DEFAULT '',
                            file_url TEXT,
                            file_type TEXT,
                            created_at TEXT DEFAULT (datetime('now'))
                        );
                        INSERT INTO payment_records_new (id, amount, record_date, remarks, created_at)
                            SELECT id, amount, date, remark, created_at FROM payment_records;
                        DROP TABLE payment_records;
                        ALTER TABLE payment_records_new RENAME TO payment_records;
                    ");
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[EnsureTables] payment_records 迁移失败: {ex.Message}");
            }
    }

    /// <summary>
    /// 幂等种子管理员：仅在 users 空表时创建默认 admin 用户 + 角色
    /// </summary>
    private static void SeedDefaultAdmin(IDbConnection db)
    {
        var userCount = db.ExecuteScalar<int>("SELECT COUNT(*) FROM users");
        if (userCount > 0) return;

        var roleCount = db.ExecuteScalar<int>("SELECT COUNT(*) FROM roles");
        if (roleCount == 0)
        {
            var roles = new[] {
                ("admin", "管理员"),
                ("manager", "经理"),
                ("accountant", "财务"),
                ("worker", "工人"),
            };
            var now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
            foreach (var (id, name) in roles)
            {
                var perms = System.Text.Json.JsonSerializer.Serialize(Common.GetDefaultPermissions(id));
                db.Execute(@"INSERT OR IGNORE INTO roles (id, name, permissions, is_system, created_at)
                    VALUES (@Id, @Name, @Perms, 1, @Now)",
                    new { Id = id, Name = name, Perms = perms, Now = now });
            }
        }

        var salt = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(16)).ToLower();
        var hash = Common.HashPassword("admin123", salt, 2);
        var nowStr = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
        db.Execute(@"INSERT INTO users (id, username, password_hash, password_salt, password_hash_version,
            display_name, role_id, status, is_default_password, created_at)
            VALUES (@Id, 'admin', @Hash, @Salt, 2, '管理员', 'admin', 'active', 1, @Now)",
            new { Id = $"user-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}", Hash = hash, Salt = salt, Now = nowStr });

        Console.WriteLine("[Seed] 默认管理员已创建: admin / admin123");
    }
}

