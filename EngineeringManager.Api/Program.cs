using System.Data;
using Microsoft.Data.Sqlite;
using Dapper;
using Microsoft.Extensions.FileProviders;
using EngineeringManager.Api;

// ============ API 配置类（供 EntryPoint.cs 调用） ============

public static class ApiConfig
{
    public static void ConfigureServices(WebApplicationBuilder builder)
    {
        // 强制 API 监听 5048 端口（launchSettings.json 只在 dotnet run 时生效）
        builder.WebHost.UseUrls("http://localhost:5048");

        builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
            p.WithOrigins("http://localhost:5173", "http://localhost:3000", "http://localhost:5048")
             .AllowAnyMethod()
             .AllowAnyHeader()));

                builder.Services.AddScoped<IDbConnection>(_ =>
        {
            var dbPath = Path.Combine(ResolveDataPath(), "engineering.db");
            var dir = Path.GetDirectoryName(dbPath)!;
            if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
            var conn = new SqliteConnection($"Data Source={dbPath}");
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "PRAGMA journal_mode=WAL";
            cmd.ExecuteNonQuery();
            EnsureTables(conn);
            return conn;
        });


        builder.Services.AddAuthentication(Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
            {
                var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET") ?? "dev-only-secret-please-change-in-prod-32bytes";
                options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
                {
                    ValidateIssuer = true, ValidateAudience = true, ValidateLifetime = true, ValidateIssuerSigningKey = true,
                    ValidIssuer = "engineering-manager", ValidAudience = "engineering-manager",
                    IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(jwtSecret))
                };
            });
        builder.Services.AddAuthorization();
        builder.Services.AddHttpClient();

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

            // 1. SPA 默认文件（index.html）
            app.UseDefaultFiles(new DefaultFilesOptions
            {
                FileProvider = new PhysicalFileProvider(distPath)
            });

            // 2. 静态文件服务（JS/CSS/图片 + ocr-config.json 等）
            app.UseStaticFiles(new StaticFileOptions
            {
                FileProvider = new PhysicalFileProvider(distPath)
            });
        }

        app.UseCors();
        app.UseAuthentication();
        app.UseAuthorization();
        app.UseMiddleware<EngineeringManager.Api.GlobalAuthMiddleware>();
        app.UseRateLimiter();
        RegisterEndpoints(app);

        if (IsProduction)
        {
            // 3. SPA 回退：非 /api 路由全部返回 index.html
            app.MapWhen(ctx => !ctx.Request.Path.StartsWithSegments("/api"), spa =>
            {
                spa.Use(async (ctx, next) =>
                {
                    var indexPath = Path.Combine(distPath, "index.html");
                    if (File.Exists(indexPath))
                    {
                        ctx.Response.ContentType = "text/html; charset=utf-8";
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

        // OCR（百度）
        app.RegisterOcrEndpoints();
        OcrSetupWizard.Map(app);

        // 健康检查 + 快照 + 配置 + 审计日志 + 区域 + 费用 + 模板
        app.RegisterSystemEndpoints();
    }
    // ============ P0-1: 从 config.json 读取 dataPath ============
    public static string ResolveDataPath()
    {
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
        catch { }
        return defaultPath;
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
CREATE TABLE IF NOT EXISTS settlements (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, partner_id INTEGER, name TEXT, category TEXT, amount REAL, status TEXT DEFAULT 'pending', date TEXT, remark TEXT, files TEXT, invoice_details TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS cost_ledger (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, batch_id INTEGER, voucher_no TEXT, date TEXT, direction TEXT, category TEXT, amount REAL, counterparty TEXT, channel TEXT, summary TEXT, notes TEXT, attachments TEXT, linked_invoice_id INTEGER, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS cost_ledger_categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, direction TEXT, level1 TEXT, color TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS cost_ledger_match_rules (id INTEGER PRIMARY KEY AUTOINCREMENT, pattern TEXT, category TEXT, direction TEXT, priority INTEGER, created_at TEXT);
CREATE TABLE IF NOT EXISTS inventory_items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT, unit TEXT, quantity REAL DEFAULT 0, min_quantity REAL, location TEXT, notes TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS inventory_transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, item_id INTEGER, project_id INTEGER, type TEXT, quantity REAL, unit_price REAL, date TEXT, remark TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS materials (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT, unit TEXT, specifications TEXT, supplier TEXT, notes TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS templates (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT, category TEXT, content TEXT, variables TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT, level TEXT, user_id TEXT, user_name TEXT, resource TEXT, resource_id TEXT, details TEXT, ip_address TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS roles (id TEXT PRIMARY KEY, name TEXT NOT NULL, permissions TEXT, is_system INTEGER DEFAULT 0, created_at TEXT);
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, salt TEXT, display_name TEXT, role_id TEXT, status TEXT DEFAULT 'active', avatar TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS snapshots (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, size INTEGER, created_at TEXT);
CREATE TABLE IF NOT EXISTS departments (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, manager_id INTEGER, positions TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS salary_history (id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER, effective_date TEXT, base_salary REAL, subsidy REAL, subsidy_note TEXT, note TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS worker_teams (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, project_id INTEGER, leader_id INTEGER, remark TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS project_members (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, member_id INTEGER, joined_at TEXT);
CREATE TABLE IF NOT EXISTS regions (id INTEGER PRIMARY KEY AUTOINCREMENT, province TEXT, city TEXT, district TEXT);
CREATE TABLE IF NOT EXISTS drawings (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, name TEXT, file_url TEXT, file_name TEXT, file_type TEXT, remark TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, category TEXT, amount REAL, date TEXT, description TEXT, vendor TEXT, receipt_url TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS contract_templates (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT, content TEXT, variables TEXT, created_at TEXT, updated_at TEXT);
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
");

            // invoices 表迁移：添加缺失列
            try { db.Execute(@"ALTER TABLE invoices ADD COLUMN seller_id INTEGER"); } catch { }
            try { db.Execute(@"ALTER TABLE invoices ADD COLUMN buyer_id INTEGER"); } catch { }
            try { db.Execute(@"ALTER TABLE invoices ADD COLUMN received_amount REAL DEFAULT 0"); } catch { }
            try { db.Execute(@"ALTER TABLE invoices ADD COLUMN settlement_id INTEGER"); } catch { }

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
            catch { }
    }

}

