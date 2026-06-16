namespace EngineeringManager.Api;

/// <summary>
/// 快照端点：列表 / 创建 / 删除 / 恢复 / 最大数量
/// </summary>
public static class SnapshotEndpoints
{
    public static void RegisterSnapshotEndpoints(this WebApplication app)
    {
        // ═══════════════════════════════════════════════════════════
        // 快照
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/snapshots", () =>
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

        app.MapPost("/api/snapshots", () =>
        {
            var snapshotDir = Path.Combine(ApiConfig.ResolveDataPath(), "db-snapshots");
            Directory.CreateDirectory(snapshotDir);
            var dbPath = Path.Combine(ApiConfig.ResolveDataPath(), "engineering.db");
            var snapshotName = $"snapshot-{DateTime.Now:yyyyMMdd-HHmmss}.db";
            var snapshotPath = Path.Combine(snapshotDir, snapshotName);
            File.Copy(dbPath, snapshotPath);
            return Common.Ok(new { id = Path.GetFileNameWithoutExtension(snapshotName), name = snapshotName });
        });

        app.MapDelete("/api/snapshots/{id}", (string id) =>
        {
            var snapshotDir = Path.Combine(ApiConfig.ResolveDataPath(), "db-snapshots");
            var path = Path.Combine(snapshotDir, $"{id}.db");
            if (File.Exists(path)) { File.Delete(path); return Common.Ok(); }
            return Common.NotFound("快照不存在");
        });

        app.MapGet("/api/snapshots/max-count", () => Common.Ok(200));

        app.MapPost("/api/snapshots/{id}/restore", (string id) =>
        {
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

        app.MapPut("/api/snapshots/max-count", (dynamic dto) => Common.Ok());
    }
}