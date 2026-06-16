using System.Data;
using Dapper;
using Microsoft.AspNetCore.Authorization;

namespace EngineeringManager.Api;

/// <summary>
/// 备份/恢复/诊断端点（公开端点，登录前可用）
/// </summary>
public static class BackupEndpoints
{
    public static void RegisterBackupEndpoints(this WebApplication app)
    {
        app.MapPost("/api/backup", [AllowAnonymous] () =>
        {
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
            catch (Exception ex) { Console.Error.WriteLine($"[ERROR] Backup: {ex.Message}"); return Common.ServerError("Backup", ex); }
        });

        app.MapPost("/api/restore", [AllowAnonymous] () =>
        {
            try
            {
                var desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                var backups = Directory.GetFiles(desktopPath, "工程管家-备份-*.db").OrderByDescending(f => f).ToArray();
                if (backups.Length == 0) return Common.NotFound("桌面上没有找到备份文件");
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
            catch (Exception ex) { Console.Error.WriteLine($"[ERROR] Restore: {ex.Message}"); return Common.ServerError("Restore", ex); }
        });

        app.MapPost("/api/diagnose", [AllowAnonymous] (IDbConnection db) =>
        {
            try
            {
                var result = db.ExecuteScalar<string>("PRAGMA integrity_check");
                var tables = db.Query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").Select(t => (string)t.name).ToList();
                return Common.Ok(new { result, tables });
            }
            catch (Exception ex) { Console.Error.WriteLine($"[ERROR] Diagnose: {ex.Message}"); return Common.ServerError("Diagnose", ex); }
        });
    }
}