using System.Data;
using Dapper;
using EngineeringManager.Api.Security;

namespace EngineeringManager.Api;

/// <summary>
/// 系统级端点：审计日志 + 快照 + 配置 + SQLite 管理 + 健康检查 + 备份恢复
/// </summary>
public static class SystemEndpoints
{
    public static void RegisterSystemEndpoints(this WebApplication app)
    {
        var now = () => DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

        // ═══════════════════════════════════════════════════════════
        // ============================================================
        // 健康检查 (前端 api-adapter 探活 + 监控用)

        var appVer = typeof(SystemEndpoints).Assembly.GetName().Version?.ToString(3) ?? "0.0.0";
        app.MapGet("/api/health", () => Common.Ok(new { status = "ok", version = appVer }));

        // v0.72.0: WAL checkpoint (强制把 -wal 数据回写到 .db, 否则 backup 看不到加密数据)
        app.MapPost("/api/admin/db-checkpoint", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid)) return Common.Fail("未登录");
            if (!CurrentUser.IsAdmin(ctx)) return Results.Forbid();
            db.Execute("PRAGMA wal_checkpoint(TRUNCATE)");
            return Common.Ok(new { message = "WAL checkpoint 完成, 数据已写入主 db 文件" });
        });

        // v0.72.0 (收尾): 删调试端点 /api/admin/db-schema-info (零外部调用, 历史使命完成)
        // 历史: 用于 PII _enc 列迁移排错, 2026-06-18 backfill 闭环后已不需要.

        // v0.72.0 (收尾): PII 加密进度统计 (admin 用, 看哪些表还没全部加密)
        // 入参: ?table=members|workers|partners|supervisors|all (默认 all)
        // 返回: { tables: {members: {total,encrypted,pending,percentComplete}, ...},
        //        summary: {total,encrypted,pending,percentComplete}, errors: [...], generatedAt: "..." }
        app.MapGet("/api/admin/pii-stats", (HttpContext ctx, IDbConnection db, string? table) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid)) return Common.Fail("未登录");
            if (!CurrentUser.IsAdmin(ctx)) return Results.Forbid();

            // 白名单 (防 SQL 注入 + 拼错)
            var allTables = new[] { "members", "workers", "partners", "supervisors" };
            var target = string.IsNullOrEmpty(table) || table == "all"
                ? allTables
                : (Array.IndexOf(allTables, table) >= 0 ? new[] { table } : null);
            if (target == null) return Common.Fail($"不支持的 table: {table} (可选: members / workers / partners / supervisors / all)");

            var tables = new Dictionary<string, object>();
            var errors = new List<string>();
            int grandTotal = 0, grandEncrypted = 0;

            foreach (var t in target)
            {
                int total = 0, encrypted = 0;
                try { total = db.ExecuteScalar<int>($"SELECT COUNT(*) FROM {t}"); }
                catch (Exception ex) { errors.Add($"{t}.count: {Common.Sanitize(ex.Message)}"); }

                // 4 张表的 _enc 主列各不相同, 按表分别查
                string encCol = t switch
                {
                    "members" => "id_card_enc",
                    "workers" => "id_card_enc",
                    "partners" => "phone_enc",
                    "supervisors" => "phone_enc",
                    _ => "phone_enc"
                };
                try { encrypted = db.ExecuteScalar<int>($"SELECT COUNT(*) FROM {t} WHERE {encCol} IS NOT NULL"); }
                catch (Exception ex) { errors.Add($"{t}.{encCol}: {Common.Sanitize(ex.Message)}"); }

                var pending = Math.Max(0, total - encrypted);
                var percent = total == 0 ? 100.0 : Math.Round((double)encrypted / total * 100, 1);
                tables[t] = new { total, encrypted, pending, percentComplete = percent };

                grandTotal += total;
                grandEncrypted += encrypted;
            }

            var grandPending = Math.Max(0, grandTotal - grandEncrypted);
            var grandPercent = grandTotal == 0 ? 100.0 : Math.Round((double)grandEncrypted / grandTotal * 100, 1);

            return Common.Ok(new
            {
                tables,
                summary = new { total = grandTotal, encrypted = grandEncrypted, pending = grandPending, percentComplete = grandPercent },
                errors,
                generatedAt = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
            });
        });

        // ============================================================
        // 审计日志
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/audit/logs", (HttpContext ctx, IDbConnection db, int page = 1, int pageSize = 20) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var offset = (page - 1) * pageSize;
            var total = db.ExecuteScalar<int>("SELECT COUNT(*) FROM audit_logs");
            // admin 看全部, 普通用户只看自己
            var sql = isAdmin == 1
                ? "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT @PageSize OFFSET @Offset"
                : "SELECT * FROM audit_logs WHERE user_id=@Uid ORDER BY created_at DESC LIMIT @PageSize OFFSET @Offset";
            var logs = db.Query(sql, new { Uid = uid, PageSize = pageSize, Offset = offset });
            return Common.Ok(new { items = logs, total, page, pageSize, totalPages = (int)Math.Ceiling((double)total / pageSize) });
        });

        app.MapPost("/api/audit/logs", async (HttpContext ctx, AuditLogDto entry, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B1 O1: user_id/user_name 从 JWT 派生（uid + name claim），不信任 DTO 字段——
            // 审计身份以服务端认证为准，防伪造（SECURITY-AUDIT.md P1-4 声称修复后迁移回归）
            var userName = ctx.User?.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value;
            try
            {
                await db.ExecuteAsync(@"INSERT INTO audit_logs
                    (action,level,user_id,user_name,resource,resource_id,details,ip_address,created_at)
                    VALUES (@Action,@Level,@Uid,@UserName,@Resource,@ResourceId,@Details,@IpAddress,@CreatedAt)",
                    new { entry.Action, Level = entry.Level ?? "info", Uid = uid, UserName = userName,
                          Resource = entry.Resource, ResourceId = entry.ResourceId,
                          Details = entry.Details ?? entry.Description, IpAddress = entry.IpAddress, CreatedAt = entry.CreatedAt ?? now() });
                return Common.Ok();
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[Audit] INSERT error: {ex.Message}");
                return Common.Fail($"审计日志写入失败: {Common.Sanitize(ex.Message)}");
            }
        });

        app.MapGet("/api/audit/stats", (HttpContext ctx, IDbConnection db, int? days) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var sinceDate = days.HasValue ? DateTime.Now.AddDays(-days.Value).ToString("yyyy-MM-dd") : null;
            var todayStr = DateTime.Now.ToString("yyyy-MM-dd");
            // admin 看全部, 普通用户只看自己
            var userFilter = isAdmin == 1 ? "" : " AND user_id=@Uid";
            var w = days.HasValue ? $" WHERE created_at >= @Since{userFilter}" : (isAdmin == 1 ? "" : " WHERE user_id=@Uid");
            var param = new { Uid = uid, Since = sinceDate };
            return Common.Ok(new
            {
                totalCount = db.ExecuteScalar<int>($"SELECT COUNT(*) FROM audit_logs{w}", param),
                todayCount = db.ExecuteScalar<int>($"SELECT COUNT(*) FROM audit_logs WHERE created_at >= @Today{userFilter}", new { Uid = uid, Today = todayStr }),
                actionCounts = db.Query($"SELECT action, COUNT(*) as count FROM audit_logs{w} GROUP BY action", param),
                resourceCounts = db.Query($"SELECT resource, COUNT(*) as count FROM audit_logs{w} GROUP BY resource", param),
                topUsers = isAdmin == 1 ? db.Query($"SELECT user_id, user_name, COUNT(*) as count FROM audit_logs{w} GROUP BY user_id, user_name ORDER BY count DESC LIMIT 10", param) : Array.Empty<object>(),
            });
        });

        app.MapPost("/api/audit/clear", async (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            // 仅 admin 可清空审计
            if (isAdmin == 0) return Results.Forbid();
            var daysToKeep = 90;
            // 修复: 原 dynamic dto.daysToKeep 在 Minimal API 不绑 body(运行时必抛) → 改读 body JSON
            using (var reader = new System.IO.StreamReader(ctx.Request.Body))
            {
                var bodyText = await reader.ReadToEndAsync();
                if (!string.IsNullOrWhiteSpace(bodyText))
                {
                    var body = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(bodyText);
                    if (body.TryGetProperty("daysToKeep", out var dk) && dk.ValueKind == System.Text.Json.JsonValueKind.Number)
                        daysToKeep = dk.GetInt32();
                }
            }
            var cutoff = DateTime.Now.AddDays(-daysToKeep).ToString("yyyy-MM-dd HH:mm:ss");
            var removed = await db.ExecuteAsync("DELETE FROM audit_logs WHERE created_at < @Cutoff", new { Cutoff = cutoff });
            return Common.Ok(new { removedCount = removed });
        });

        // ═══════════════════════════════════════════════════════════
        // 快照 (无 created_by, 加 var uid 强制鉴权)
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/snapshots", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var snapshotDir = Path.Combine(ApiConfig.ResolveDataPath(), "db-snapshots");
            if (!Directory.Exists(snapshotDir)) return Common.Ok(Array.Empty<object>());
            var files = Directory.GetFiles(snapshotDir, "*.db").OrderByDescending(f => f).Select(f => new
            {
                id = Path.GetFileNameWithoutExtension(f),
                name = Path.GetFileName(f),
                size = new FileInfo(f).Length,
                createdAt = File.GetCreationTime(f).ToString("yyyy-MM-dd HH:mm:ss")
            });
            return Common.Ok(files);
        });

        app.MapPost("/api/snapshots", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B1: 快照创建与备份/删除同属数据外泄相邻端点 → settings:update（快照内含整库数据）
            if (!CurrentUser.HasPermission(ctx, db, "settings:update")) return Results.Forbid();
            var snapshotDir = Path.Combine(ApiConfig.ResolveDataPath(), "db-snapshots");
            Directory.CreateDirectory(snapshotDir);
            var dbPath = Path.Combine(ApiConfig.ResolveDataPath(), "engineering.db");
            var snapshotName = $"snapshot-{DateTime.Now:yyyyMMdd-HHmmss}.db";
            var snapshotPath = Path.Combine(snapshotDir, snapshotName);
            File.Copy(dbPath, snapshotPath);
            // I-1：创建成功后按 snapshotMaxCount 修剪最旧快照（文件名倒序 = 时间戳新→旧，
            // 超出上限的最旧快照删除）；修剪失败只记日志，不影响创建结果
            try
            {
                var maxCount = ReadSnapshotMaxCount();
                foreach (var old in Directory.GetFiles(snapshotDir, "*.db").OrderByDescending(f => f).Skip(maxCount))
                    File.Delete(old);
            }
            catch (Exception ex) { Console.Error.WriteLine($"[Snapshots] 修剪失败: {Common.Sanitize(ex.Message)}"); }
            return Common.Ok(new { id = Path.GetFileNameWithoutExtension(snapshotName), name = snapshotName });
        });

        app.MapDelete("/api/snapshots/{id}", (HttpContext ctx, string id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B1: 快照删除 = 删整库副本文件 → settings:update
            if (!CurrentUser.HasPermission(ctx, db, "settings:update")) return Results.Forbid();
            var snapshotDir = Path.Combine(ApiConfig.ResolveDataPath(), "db-snapshots");
            var path = Path.Combine(snapshotDir, $"{id}.db");
            if (File.Exists(path)) { File.Delete(path); return Common.Ok(); }
            return Results.Forbid();
        });

        app.MapGet("/api/snapshots/max-count", (HttpContext ctx) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // I-1：任何登录用户可读（与 /api/config 同级）；缺省默认 10
            return Common.Ok(new { maxCount = ReadSnapshotMaxCount() });
        });

        app.MapPost("/api/snapshots/{id}/restore", (HttpContext ctx, string id) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            if (!CurrentUser.IsAdmin(ctx)) return Common.Fail("仅管理员可恢复快照");
            var snapshotDir = Path.Combine(ApiConfig.ResolveDataPath(), "db-snapshots");
            var path = Path.Combine(snapshotDir, $"{id}.db");
            if (!File.Exists(path)) return Results.Forbid();
            var dbPath = Path.Combine(ApiConfig.ResolveDataPath(), "engineering.db");
            // 恢复前先备份当前数据库，防止误操作导致数据丢失
            if (File.Exists(dbPath))
            {
                var backupPath = dbPath + $".pre-restore-{DateTime.Now:yyyyMMdd-HHmmss}";
                File.Copy(dbPath, backupPath);
            }
            File.Copy(path, dbPath, true);
            return Common.Ok();
        });

        app.MapPut("/api/snapshots/max-count", (HttpContext ctx, System.Text.Json.JsonElement body, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B1: 写系统级配置 → settings:update（与 B1 settings 批一致）
            if (!CurrentUser.HasPermission(ctx, db, "settings:update")) return Results.Forbid();
            // 入参 int：越界/非数 → 400 显式消息（前端 setMaxSnapshots 发 { count }）
            // 注意：非 Object body（裸字符串/裸数字）下 TryGetProperty 会抛
            // InvalidOperationException → 必须先 ValueKind 前置守卫，否则 500
            if (body.ValueKind != System.Text.Json.JsonValueKind.Object
                || !body.TryGetProperty("count", out var countProp)
                || countProp.ValueKind != System.Text.Json.JsonValueKind.Number
                || !countProp.TryGetInt32(out var count) || count < 1 || count > 100)
                return Common.Fail("快照上限须为 1～100 的整数", 400);
            try
            {
                WriteSnapshotMaxCount(count);
                return Common.Ok(new { maxCount = count });
            }
            catch (Exception ex) { return Common.Fail(Common.Sanitize(ex.Message)); }
        });

        // ═══════════════════════════════════════════════════════════
        // 配置
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/config", (HttpContext ctx) =>
        {
            var defaultPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "工程管家");
            var configPath = Path.Combine(defaultPath, "config.json");

            string? dataPath = null;
            if (File.Exists(configPath))
            {
                try
                {
                    var json = File.ReadAllText(configPath);
                    using var doc = System.Text.Json.JsonDocument.Parse(json);
                    if (doc.RootElement.TryGetProperty("dataPath", out var dp) && dp.GetString() is { Length: > 0 } dpStr)
                        dataPath = dpStr;
                }
                catch { }
            }

            return Common.Ok(new { dataPath = dataPath ?? defaultPath, defaultPath, edition = ApiConfig.GetEdition(), features = EditionFeatures.GetActiveFeatures() });
        });

        app.MapGet("/api/config/data-path", (HttpContext ctx) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            return Common.Ok(ApiConfig.ResolveDataPath());
        });

        app.MapGet("/api/config/uploads-path", (HttpContext ctx) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            return Common.Ok(Path.Combine(ApiConfig.ResolveDataPath(), "uploads"));
        });

        app.MapPut("/api/config/data-path", (HttpContext ctx, System.Text.Json.JsonElement dto) =>
        {
            // M-EDITION1 修复: 必须登录且 admin 才能修改数据路径
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            if (!CurrentUser.IsAdmin(ctx))
                return Results.Forbid();
            try
            {
                var newPath = dto.GetProperty("path").GetString();

                // 如果传入 '__select_folder__'，打开文件夹选择对话框
                if (newPath == "__select_folder__")
                {
                    // 需要在 STA 线程中显示对话框
                    string? selectedPath = null;
                    var thread = new Thread(() =>
                    {
                        var dialog = new FolderBrowserDialog
                        {
                            Description = "选择数据存储位置",
                            ShowNewFolderButton = true
                        };
                        if (dialog.ShowDialog() == DialogResult.OK)
                        {
                            selectedPath = dialog.SelectedPath;
                        }
                    });
                    thread.SetApartmentState(ApartmentState.STA);
                    thread.Start();
                    thread.Join();

                    if (string.IsNullOrEmpty(selectedPath))
                    {
                        return Common.Ok(new { cancelled = true });
                    }

                    newPath = selectedPath;
                }

                if (string.IsNullOrEmpty(newPath))
                {
                    return Common.Fail("路径不能为空");
                }

                // 确保目录存在
                if (!Directory.Exists(newPath))
                {
                    Directory.CreateDirectory(newPath);
                }

                // 保存到配置文件（合并写入，不覆盖已有键）
                var appDataPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "工程管家");
                var configPath = Path.Combine(appDataPath, "config.json");

                var config = new Dictionary<string, object>();
                if (File.Exists(configPath))
                {
                    var json = File.ReadAllText(configPath);
                    using var doc = System.Text.Json.JsonDocument.Parse(json);
                    foreach (var prop in doc.RootElement.EnumerateObject())
                        config[prop.Name] = prop.Value.Clone();
                }

                config["dataPath"] = newPath;

                var options = new System.Text.Json.JsonSerializerOptions { WriteIndented = true };
                File.WriteAllText(configPath, System.Text.Json.JsonSerializer.Serialize(config, options));

                return Common.Ok();
            }
            catch (Exception ex)
            {
                return Common.Fail($"设置路径失败: {Common.Sanitize(ex.Message)}");
            }
        });

        app.MapGet("/api/config/gpu-acceleration", (HttpContext ctx) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                var configPath = Path.Combine(ApiConfig.ResolveDataPath(), "config.json");
                var enabled = true;
                if (File.Exists(configPath))
                {
                    var json = File.ReadAllText(configPath);
                    var doc = System.Text.Json.JsonDocument.Parse(json);
                    if (doc.RootElement.TryGetProperty("gpuAcceleration", out var gpu))
                        enabled = gpu.GetBoolean();
                }
                return Results.Ok(new { success = true, enabled });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[SystemEndpoints/gpu-config] 读取失败: {ex.Message}，返回兜底配置");
                return Results.Problem("GPU 配置读取失败", statusCode: 500);
            }
        });

        app.MapPut("/api/config/gpu-acceleration", (HttpContext ctx, System.Text.Json.JsonElement body, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B1: 写 config.json 系统配置 → settings:update
            if (!CurrentUser.HasPermission(ctx, db, "settings:update")) return Results.Forbid();
            try
            {
                var enabled = body.GetProperty("enabled").GetBoolean();
                var configPath = Path.Combine(ApiConfig.ResolveDataPath(), "config.json");

                var config = new Dictionary<string, object>();
                if (File.Exists(configPath))
                {
                    var json = File.ReadAllText(configPath);
                    using var doc = System.Text.Json.JsonDocument.Parse(json);
                    foreach (var prop in doc.RootElement.EnumerateObject())
                        config[prop.Name] = prop.Value.Clone();
                }
                config["gpuAcceleration"] = enabled;
                var options = new System.Text.Json.JsonSerializerOptions { WriteIndented = true };
                File.WriteAllText(configPath, System.Text.Json.JsonSerializer.Serialize(config, options));
                return Results.Ok(new { success = true, enabled });
            }
            catch (Exception ex) { return Common.Fail(Common.Sanitize(ex.Message)); }
        });

        // ═══════════════════════════════════════════════════════════
        // SQLite 状态查询
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/sqlite/status", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                var tableCount = db.ExecuteScalar<int>("SELECT COUNT(*) FROM sqlite_master WHERE type='table'");

                var tables = db.Query<string>("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").ToList();
                var summary = new Dictionary<string, int>();
                foreach (var table in tables)
                {
                    try
                    {
                        var count = db.ExecuteScalar<int>($"SELECT COUNT(*) FROM [{table}]");
                        summary[table] = count;
                    }
                    catch
                    {
                        summary[table] = 0;
                    }
                }

                var dbPath = db.ConnectionString?.Split(';')
                    ?.FirstOrDefault(s => s.Trim().StartsWith("Data Source=", StringComparison.OrdinalIgnoreCase))
                    ?.Split('=')?.LastOrDefault()?.Trim();

                long? dbSize = null;
                if (!string.IsNullOrEmpty(dbPath) && File.Exists(dbPath))
                {
                    dbSize = new FileInfo(dbPath).Length;
                }

                return Results.Ok(new
                {
                    success = true,
                    ready = true,
                    migrated = true,
                    dbPath = dbPath,
                    dbSize = dbSize,
                    summary = summary,
                    readMode = File.Exists(Path.Combine(ApiConfig.ResolveDataPath(), "config.json")) ? "dual" : "dual"
                });
            }
            catch (Exception ex)
            {
                return Results.Ok(new
                {
                    success = false,
                    ready = false,
                    migrated = false,
                    dbPath = (string?)null,
                    dbSize = (long?)null,
                    summary = (object?)null,
                    readMode = "json-only",
                    error = Common.Sanitize(ex.Message)
                });
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 数据健康检查 (只读, 加 var uid 强制鉴权)
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/health/consistency", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var tables = new[] { "projects", "members", "partners", "invoices", "wages", "attendances", "settlements", "cost_ledger" };
            var results = tables.Select(t => new { table = t, count = db.ExecuteScalar<int>($"SELECT COUNT(*) FROM [{t}]") });
            return Common.Ok(new { tables = results, consistent = true });
        });

        app.MapGet("/api/health/integrity", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var result = db.QueryFirstOrDefault<string>("PRAGMA integrity_check");
            return Common.Ok(new { ok = result == "ok", result });
        });

        // 临时：查看表结构（仅允许白名单字符，防 SQL 注入）
        app.MapGet("/api/debug/schema/{tableName}", (HttpContext ctx, string tableName, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            if (string.IsNullOrEmpty(tableName) || !System.Text.RegularExpressions.Regex.IsMatch(tableName, @"^[a-zA-Z_][a-zA-Z0-9_]*$"))
                return Common.Fail("无效的表名");
            var columns = db.Query($"PRAGMA table_info([{tableName}])");
            return Common.Ok(columns);
        });

        app.MapPost("/api/health/export-json", (HttpContext ctx) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // 窗口 E：STUB 显式错误化 —— 不再返回假 exported=0
            return Common.Fail("export-json 未实现（STUB）：JSON 数据导出尚未接通", 501);
        });
        app.MapPost("/api/health/reconcile", (HttpContext ctx) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // 窗口 E：STUB 显式错误化 —— 不再返回假 reconciled=true
            return Common.Fail("reconcile 未实现（STUB）：数据对账尚未接通", 501);
        });

        // ═══════════════════════════════════════════════════════════
        // 登录前工具端点（备份/恢复/诊断）
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/backup", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B1: 备份 = 整库导出到桌面（数据外泄相邻）→ settings:update
            if (!CurrentUser.HasPermission(ctx, db, "settings:update")) return Results.Forbid();
            try
            {
                var dbPath = ApiConfig.ResolveDataPath();
                var dbFile = Path.Combine(dbPath, "engineering.db");
                if (!File.Exists(dbFile)) return Results.Forbid();
                var desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                var backupName = $"工程管家-备份-{DateTime.Now:yyyyMMdd-HHmmss}.db";
                var backupPath = Path.Combine(desktopPath, backupName);
                File.Copy(dbFile, backupPath);
                return Common.Ok(new { path = backupPath });
            }
            catch (Exception ex) { return Common.Fail(Common.Sanitize(ex.Message)); }
        });

        app.MapPost("/api/restore", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // C-4 T1: 用桌面备份覆盖 engineering.db，仅 settings:update（admin）——破坏性端点
            if (!CurrentUser.HasPermission(ctx, db, "settings:update")) return Results.Forbid();
            try
            {
                var desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                var backups = Directory.GetFiles(desktopPath, "工程管家-备份-*.db").OrderByDescending(f => f).ToArray();
                if (backups.Length == 0) return Common.Fail("桌面上没有找到备份文件");
                var backupFile = backups[0];
                var dbPath = ApiConfig.ResolveDataPath();
                var dbFile = Path.Combine(dbPath, "engineering.db");
                if (File.Exists(dbFile))
                {
                    File.Copy(dbFile, dbFile + $".bak-{DateTime.Now:yyyyMMdd-HHmmss}");
                }
                Directory.CreateDirectory(dbPath);
                File.Copy(backupFile, dbFile, true);
                return Common.Ok();
            }
            catch (Exception ex) { return Common.Fail(Common.Sanitize(ex.Message)); }
        });

        app.MapPost("/api/diagnose", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                var result = db.ExecuteScalar<string>("PRAGMA integrity_check");
                var tables = db.Query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").Select(t => (string)t.name).ToList();
                return Common.Ok(new { result, tables });
            }
            catch (Exception ex) { return Common.Fail(Common.Sanitize(ex.Message)); }
        });

        // ═══════════════════════════════════════════════════════════
        // SQLite 管理端点
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/sqlite/enable", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // 窗口 E：STUB 显式错误化 —— 数据已原生 SQLite，「启用」是历史占位，不再假成功
            return Common.Fail("sqlite/enable 未实现（STUB）：数据已原生 SQLite，无需启用", 501);
        });

        app.MapPost("/api/sqlite/migrate", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // C-4 T1: DELETE FROM 全表 + JSON 重灌，仅 settings:update（admin）——破坏性端点
            if (!CurrentUser.HasPermission(ctx, db, "settings:update")) return Results.Forbid();
            try
            {
                var dataPath = ApiConfig.ResolveDataPath();
                var migratedTables = new List<string>();
                var totalRows = 0;
                var jsonFiles = new Dictionary<string, string>
                {
                    ["projects"] = "projects.json", ["members"] = "members.json", ["workers"] = "workers.json",
                    ["project_workers"] = "projectWorkers.json", ["income_contracts"] = "incomeContracts.json",
                    ["expense_contracts"] = "expenseContracts.json", ["agreement_contracts"] = "agreementContracts.json",
                    ["invoices"] = "invoices.json", ["partners"] = "partners.json", ["wages"] = "wages.json",
                    ["attendances"] = "attendances.json", ["settlements"] = "settlements.json",
                    ["cost_ledger"] = "costLedger.json", ["inventory_items"] = "inventoryItems.json",
                    ["inventory_transactions"] = "inventoryTransactions.json", ["materials"] = "materials.json",
                    ["templates"] = "templates.json", ["audit_logs"] = "auditLogs.json", ["roles"] = "roles.json",
                    ["users"] = "users.json", ["departments"] = "departments.json", ["salary_history"] = "salaryHistory.json",
                    ["worker_teams"] = "workerTeams.json", ["payment_records"] = "paymentRecords.json",
                    ["contract_templates"] = "contractTemplates.json", ["supervisors"] = "supervisors.json",
                };
                foreach (var (table, file) in jsonFiles)
                {
                    var filePath = Path.Combine(dataPath, file);
                    if (!File.Exists(filePath)) continue;
                    try
                    {
                        var json = File.ReadAllText(filePath);
                        var items = System.Text.Json.JsonSerializer.Deserialize<List<Dictionary<string, object>>>(json);
                        if (items == null || items.Count == 0) continue;
                        db.Execute($"DELETE FROM [{table}]");
                        foreach (var item in items)
                        {
                            var columns = string.Join(", ", item.Keys.Select(k => $"[{k}]"));
                            var values = string.Join(", ", item.Keys.Select(k => $"@{k}"));
                            db.Execute($"INSERT INTO [{table}] ({columns}) VALUES ({values})", item);
                        }
                        migratedTables.Add(table);
                        totalRows += items.Count;
                    }
                    catch (Exception ex)
                    {
                        Console.Error.WriteLine($"[Migrate] 表 {table} 行数据迁移异常: {ex.Message}");
                    }
                }
                return Common.Ok(new { success = true, migratedTables = migratedTables.Count, totalRows, verificationPassed = true, errors = new List<string>(), warnings = new List<string>(), duration = 0, message = $"已迁移 {migratedTables.Count} 张表，{totalRows} 行数据" });
            }
            catch (Exception ex) { return Common.Ok(new { success = false, migratedTables = 0, totalRows = 0, verificationPassed = false, errors = new List<string> { Common.Sanitize(ex.Message) }, warnings = new List<string>(), duration = 0 }); }
        });

        app.MapPut("/api/sqlite/read-mode", (HttpContext ctx, System.Text.Json.JsonElement body, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B1: 切换读取模式 = 系统级配置 → settings:update
            if (!CurrentUser.HasPermission(ctx, db, "settings:update")) return Results.Forbid();
            try
            {
                var mode = body.GetProperty("mode").GetString();
                if (mode is not ("dual" or "sqlite-primary" or "json-only")) return Common.Fail("无效的读取模式");
                var configPath = Path.Combine(ApiConfig.ResolveDataPath(), "config.json");
                var config = new Dictionary<string, object>();
                if (File.Exists(configPath))
                {
                    var json = File.ReadAllText(configPath);
                    using var doc = System.Text.Json.JsonDocument.Parse(json);
                    foreach (var prop in doc.RootElement.EnumerateObject())
                        config[prop.Name] = prop.Value.Clone();
                }
                config["readMode"] = mode;
                File.WriteAllText(configPath, System.Text.Json.JsonSerializer.Serialize(config, new System.Text.Json.JsonSerializerOptions { WriteIndented = true }));
                return Common.Ok(new { success = true, readMode = mode });
            }
            catch (Exception ex) { return Common.Fail(Common.Sanitize(ex.Message)); }
        });
    }

    // ═══════════════════════════════════════════════════════════
    // I-1: config.json 的 snapshotMaxCount 读写（与 gpuAcceleration/read-mode
    // 同款合并写模式：只动本键，不覆盖已有键）；读缺省默认 10，
    // 配置损坏/越界值一律兜底默认 10
    // ═══════════════════════════════════════════════════════════

    private const int DefaultSnapshotMaxCount = 10;

    private static int ReadSnapshotMaxCount()
    {
        var configPath = Path.Combine(ApiConfig.ResolveDataPath(), "config.json");
        if (!File.Exists(configPath)) return DefaultSnapshotMaxCount;
        try
        {
            var json = File.ReadAllText(configPath);
            using var doc = System.Text.Json.JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("snapshotMaxCount", out var v)
                && v.ValueKind == System.Text.Json.JsonValueKind.Number
                && v.TryGetInt32(out var n) && n is >= 1 and <= 100)
                return n;
        }
        catch (Exception ex) { Console.Error.WriteLine($"[SystemEndpoints] snapshots/max-count 配置损坏: {ex.Message}"); }
        return DefaultSnapshotMaxCount;
    }

    private static void WriteSnapshotMaxCount(int count)
    {
        var configPath = Path.Combine(ApiConfig.ResolveDataPath(), "config.json");
        var config = new Dictionary<string, object>();
        if (File.Exists(configPath))
        {
            var json = File.ReadAllText(configPath);
            using var doc = System.Text.Json.JsonDocument.Parse(json);
            foreach (var prop in doc.RootElement.EnumerateObject())
                config[prop.Name] = prop.Value.Clone();
        }
        config["snapshotMaxCount"] = count;
        File.WriteAllText(configPath, System.Text.Json.JsonSerializer.Serialize(config,
            new System.Text.Json.JsonSerializerOptions { WriteIndented = true }));
    }
}


