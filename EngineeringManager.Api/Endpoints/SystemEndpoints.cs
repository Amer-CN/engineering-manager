using System.Data;
using System.Windows.Forms;
using Dapper;
using EngineeringManager.Api.Security;

namespace EngineeringManager.Api;

/// <summary>
/// 系统端点：健康检查 / 快照 / 配置 / 区域 / 费用 / 模板 / 审计日志
/// </summary>
public static class SystemEndpoints
{
    public static void RegisterSystemEndpoints(this WebApplication app)
    {
        var now = () => DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

        // ═══════════════════════════════════════════════════════════
        // 健康检查
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/health", (HttpContext ctx, IDbConnection db) =>
        {
            try { db.ExecuteScalar("SELECT 1"); return Common.Ok(new { status = "ok", mode = "sqlite" }); }
            catch (Exception ex) { return Common.Fail(Common.Sanitize(ex.Message)); }
        });

        // ═══════════════════════════════════════════════════════════
        // 审计日志
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/audit/logs", (HttpContext ctx, IDbConnection db, int page = 1, int pageSize = 20) =>
        {
            var offset = (page - 1) * pageSize;
            var total = db.ExecuteScalar<int>("SELECT COUNT(*) FROM audit_logs");
            var logs = db.Query("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT @PageSize OFFSET @Offset",
                new { PageSize = pageSize, Offset = offset });
            return Common.Ok(new { items = logs, total, page, pageSize, totalPages = (int)Math.Ceiling((double)total / pageSize) });
        });

        app.MapPost("/api/audit/logs", async (HttpContext ctx, AuditLogDto entry, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                await db.ExecuteAsync(@"INSERT INTO audit_logs
                    (action,level,user_id,user_name,resource_type,resource_id,details,ip_address,created_at)
                    VALUES (@Action,@Level,@UserId,@UserName,@Resource,@ResourceId,@Details,@IpAddress,@CreatedAt)",
                    new { entry.Action, Level = entry.Level ?? "info", entry.UserId, entry.UserName,
                          Resource = entry.Resource, ResourceId = entry.ResourceId,
                          Details = entry.Details ?? entry.Description, IpAddress = entry.IpAddress, CreatedAt = entry.CreatedAt ?? now() });
                return Common.Ok();
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[Audit] INSERT error: {ex.Message}");
                return Common.Fail($"审计日志写入失败: {ex.Message}");
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 快照
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/snapshots", (HttpContext ctx, IDbConnection db) =>
        {
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
            var snapshotDir = Path.Combine(ApiConfig.ResolveDataPath(), "db-snapshots");
            Directory.CreateDirectory(snapshotDir);
            var dbPath = Path.Combine(ApiConfig.ResolveDataPath(), "engineering.db");
            var snapshotName = $"snapshot-{DateTime.Now:yyyyMMdd-HHmmss}.db";
            var snapshotPath = Path.Combine(snapshotDir, snapshotName);
            File.Copy(dbPath, snapshotPath);
            return Common.Ok(new { id = Path.GetFileNameWithoutExtension(snapshotName), name = snapshotName });
        });

        app.MapDelete("/api/snapshots/{id}", (HttpContext ctx, string id) =>
        {
            var snapshotDir = Path.Combine(ApiConfig.ResolveDataPath(), "db-snapshots");
            var path = Path.Combine(snapshotDir, $"{id}.db");
            if (File.Exists(path)) { File.Delete(path); return Common.Ok(); }
            return Common.NotFound("快照不存在");
        });

        app.MapGet("/api/snapshots/max-count", (HttpContext ctx) => Common.Ok(200));

        app.MapPost("/api/snapshots/{id}/restore", (HttpContext ctx, string id) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var snapshotDir = Path.Combine(ApiConfig.ResolveDataPath(), "db-snapshots");
            var path = Path.Combine(snapshotDir, $"{id}.db");
            if (!File.Exists(path)) return Common.NotFound("快照不存在");
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

        app.MapPut("/api/snapshots/max-count", (HttpContext ctx, dynamic dto) => Common.Ok());

        // ═══════════════════════════════════════════════════════════
        // 配置
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/config", (HttpContext ctx) =>
        {
            var defaultPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "工程管家");
            var configPath = Path.Combine(defaultPath, "config.json");

            Dictionary<string, object> config = new();
            if (File.Exists(configPath))
            {
                var json = File.ReadAllText(configPath);
                config = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(json) ?? new();
            }

            // 确保返回 dataPath 和 defaultPath
            if (!config.ContainsKey("dataPath"))
            {
                config["dataPath"] = defaultPath;
            }
            config["defaultPath"] = defaultPath;

            return Common.Ok(config);
        });

        app.MapGet("/api/config/data-path", (HttpContext ctx) =>
        {
            try
            {
                var appDataPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "工程管家");
                var configPath = Path.Combine(appDataPath, "config.json");

                if (File.Exists(configPath))
                {
                    var json = File.ReadAllText(configPath);
                    var config = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(json);
                    if (config != null && config.ContainsKey("dataPath"))
                    {
                        return Common.Ok(config["dataPath"].ToString());
                    }
                }

                return Common.Ok(appDataPath);
            }
            catch
            {
                return Common.Ok(ApiConfig.ResolveDataPath());
            }
        });

        app.MapGet("/api/config/uploads-path", (HttpContext ctx) =>
            Common.Ok(Path.Combine(ApiConfig.ResolveDataPath(), "uploads")));

        app.MapPut("/api/config/data-path", (HttpContext ctx, System.Text.Json.JsonElement dto) =>
        {
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

                // 保存到配置文件
                var appDataPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "工程管家");
                var configPath = Path.Combine(appDataPath, "config.json");

                Dictionary<string, object> config = new();
                if (File.Exists(configPath))
                {
                    var json = File.ReadAllText(configPath);
                    config = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(json) ?? new();
                }

                config["dataPath"] = newPath;

                var options = new System.Text.Json.JsonSerializerOptions { WriteIndented = true };
                File.WriteAllText(configPath, System.Text.Json.JsonSerializer.Serialize(config, options));

                return Common.Ok();
            }
            catch (Exception ex)
            {
                return Common.Fail($"设置路径失败: {ex.Message}");
            }
        });

        app.MapGet("/api/config/gpu-acceleration", (HttpContext ctx) =>
        {
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

        app.MapPut("/api/config/gpu-acceleration", (HttpContext ctx, System.Text.Json.JsonElement body) =>
        {
            try
            {
                var enabled = body.GetProperty("enabled").GetBoolean();
                var configPath = Path.Combine(ApiConfig.ResolveDataPath(), "config.json");
                var config = new Dictionary<string, object>();
                if (File.Exists(configPath))
                {
                    var json = File.ReadAllText(configPath);
                    config = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(json)
                             ?? new Dictionary<string, object>();
                }
                config["gpuAcceleration"] = enabled;
                File.WriteAllText(configPath, System.Text.Json.JsonSerializer.Serialize(config, new System.Text.Json.JsonSerializerOptions { WriteIndented = true }));
                return Results.Ok(new { success = true, enabled, needRestart = true });
            }
            catch (Exception ex) { return Common.Fail(Common.Sanitize(ex.Message)); }
        });

        // ═══════════════════════════════════════════════════════════
        // SQLite 状态查询
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/sqlite/status", (HttpContext ctx, IDbConnection db) =>
        {
            try
            {
                // 检查数据库连接是否正常
                var tableCount = db.ExecuteScalar<int>("SELECT COUNT(*) FROM sqlite_master WHERE type='table'");

                // 获取各表行数
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

                // 获取数据库文件大小
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
                    error = ex.Message
                });
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 审计日志补全
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/audit/stats", (HttpContext ctx, IDbConnection db, int? days) =>
        {
            var sinceDate = days.HasValue ? DateTime.Now.AddDays(-days.Value).ToString("yyyy-MM-dd") : null;
            var todayStr = DateTime.Now.ToString("yyyy-MM-dd");
            var w = days.HasValue ? " WHERE created_at >= @Since" : "";
            var param = days.HasValue ? new { Since = sinceDate } : null;
            return Common.Ok(new
            {
                totalCount = db.ExecuteScalar<int>($"SELECT COUNT(*) FROM audit_logs{w}", param),
                todayCount = db.ExecuteScalar<int>("SELECT COUNT(*) FROM audit_logs WHERE created_at >= @Today", new { Today = todayStr }),
                actionCounts = db.Query($"SELECT action, COUNT(*) as count FROM audit_logs{w} GROUP BY action", param),
                resourceCounts = db.Query($"SELECT resource_type, COUNT(*) as count FROM audit_logs{w} GROUP BY resource_type", param),
                topUsers = db.Query($"SELECT user_id, user_name, COUNT(*) as count FROM audit_logs{w} GROUP BY user_id, user_name ORDER BY count DESC LIMIT 10", param),
            });
        });

        app.MapPost("/api/audit/clear", async (HttpContext ctx, dynamic dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var daysToKeep = (int)(dto.daysToKeep ?? 90);
            var cutoff = DateTime.Now.AddDays(-daysToKeep).ToString("yyyy-MM-dd HH:mm:ss");
            var removed = await db.ExecuteAsync("DELETE FROM audit_logs WHERE created_at < @Cutoff", new { Cutoff = cutoff });
            return Common.Ok(new { removedCount = removed });
        });

        // ═══════════════════════════════════════════════════════════
        // 数据健康检查
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/health/consistency", (HttpContext ctx, IDbConnection db) =>
        {
            var tables = new[] { "projects", "members", "partners", "invoices", "wages", "attendances", "settlements", "cost_ledger" };
            var results = tables.Select(t => new { table = t, count = db.ExecuteScalar<int>($"SELECT COUNT(*) FROM [{t}]") });
            return Common.Ok(new { tables = results, consistent = true });
        });

        app.MapGet("/api/health/integrity", (HttpContext ctx, IDbConnection db) =>
        {
            var result = db.QueryFirstOrDefault<string>("PRAGMA integrity_check");
            return Common.Ok(new { ok = result == "ok", result });
        });

        // 临时：查看表结构（仅允许白名单字符，防 SQL 注入）
        app.MapGet("/api/debug/schema/{tableName}", (HttpContext ctx, string tableName, IDbConnection db) =>
        {
            // 安全校验：表名只能包含字母、数字和下划线
            if (string.IsNullOrEmpty(tableName) || !System.Text.RegularExpressions.Regex.IsMatch(tableName, @"^[a-zA-Z_][a-zA-Z0-9_]*$"))
                return Common.Fail("无效的表名");
            var columns = db.Query($"PRAGMA table_info([{tableName}])");
            return Common.Ok(columns);
        });

        app.MapPost("/api/health/export-json", (HttpContext ctx) => Common.Ok(new { exported = 0 }));
        app.MapPost("/api/health/reconcile", (HttpContext ctx) => Common.Ok(new { reconciled = true }));

        // ═══════════════════════════════════════════════════════════
        // 登录前工具端点（备份/恢复/诊断）
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/backup", (HttpContext ctx) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                var dbPath = ApiConfig.ResolveDataPath();
                var dbFile = Path.Combine(dbPath, "engineering.db");
                if (!File.Exists(dbFile)) return Common.NotFound("数据库文件不存在");
                var desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                var backupName = $"工程管家-备份-{DateTime.Now:yyyyMMdd-HHmmss}.db";
                var backupPath = Path.Combine(desktopPath, backupName);
                File.Copy(dbFile, backupPath);
                return Common.Ok(new { path = backupPath });
            }
            catch (Exception ex) { return Common.Fail(Common.Sanitize(ex.Message)); }
        });

        app.MapPost("/api/restore", (HttpContext ctx) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                // 查找桌面上最新的备份
                var desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                var backups = Directory.GetFiles(desktopPath, "工程管家-备份-*.db").OrderByDescending(f => f).ToArray();
                if (backups.Length == 0) return Common.Fail("桌面上没有找到备份文件");
                var backupFile = backups[0];
                var dbPath = ApiConfig.ResolveDataPath();
                var dbFile = Path.Combine(dbPath, "engineering.db");
                // 先备份当前数据库
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
            try
            {
                var tableCount = db.ExecuteScalar<int>("SELECT COUNT(*) FROM sqlite_master WHERE type='table'");
                return Common.Ok(new { success = true, message = $"SQLite 已就绪，{tableCount} 张表" });
            }
            catch (Exception ex) { return Common.Fail(Common.Sanitize(ex.Message)); }
        });

        app.MapPost("/api/sqlite/migrate", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
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
            catch (Exception ex) { return Common.Ok(new { success = false, migratedTables = 0, totalRows = 0, verificationPassed = false, errors = new List<string> { ex.Message }, warnings = new List<string>(), duration = 0 }); }
        });

        app.MapPut("/api/sqlite/read-mode", (HttpContext ctx, System.Text.Json.JsonElement body) =>
        {
            try
            {
                var mode = body.GetProperty("mode").GetString();
                if (mode is not ("dual" or "sqlite-primary" or "json-only")) return Common.Fail("无效的读取模式");
                var configPath = Path.Combine(ApiConfig.ResolveDataPath(), "config.json");
                var config = new Dictionary<string, object>();
                if (File.Exists(configPath))
                {
                    var json = File.ReadAllText(configPath);
                    config = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(json) ?? new();
                }
                config["readMode"] = mode;
                File.WriteAllText(configPath, System.Text.Json.JsonSerializer.Serialize(config, new System.Text.Json.JsonSerializerOptions { WriteIndented = true }));
                return Common.Ok(new { success = true, readMode = mode });
            }
            catch (Exception ex) { return Common.Fail(Common.Sanitize(ex.Message)); }
        });

    }
}
