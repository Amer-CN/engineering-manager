using System.Data;
using Dapper;

namespace EngineeringManager.Api;

/// <summary>
/// 审计日志端点：查询 / 写入 / 统计 / 清理
/// </summary>
public static class AuditEndpoints
{
    public static void RegisterAuditEndpoints(this WebApplication app)
    {
        

        // ═══════════════════════════════════════════════════════════
        // 审计日志 — 查询与写入
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/audit/logs", (IDbConnection db, int page = 1, int pageSize = 20) =>
        {
            var offset = (page - 1) * pageSize;
            var total = db.ExecuteScalar<int>("SELECT COUNT(*) FROM audit_logs");
            var logs = db.Query("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT @PageSize OFFSET @Offset",
                new { PageSize = pageSize, Offset = offset });
            return Common.Ok(new { items = logs, total, page, pageSize, totalPages = (int)Math.Ceiling((double)total / pageSize) });
        });

        app.MapPost("/api/audit/logs", async (AuditLogDto entry, IDbConnection db) =>
        {
            try
            {
                await db.ExecuteAsync(@"INSERT INTO audit_logs
                    (action,level,user_id,user_name,resource_type,resource_id,details,ip_address,created_at)
                    VALUES (@Action,@Level,@UserId,@UserName,@Resource,@ResourceId,@Details,@IpAddress,@CreatedAt)",
                    new { entry.Action, Level = entry.Level ?? "info", entry.UserId, entry.UserName,
                          Resource = entry.Resource, ResourceId = entry.ResourceId,
                          Details = entry.Details ?? entry.Description, IpAddress = entry.IpAddress, CreatedAt = entry.CreatedAt ?? Common.NowString() });
                return Common.Ok();
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[Audit] INSERT error: {ex.Message}");
                return Common.ServerError("审计日志写入", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 审计日志 — 统计与清理
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/audit/stats", (IDbConnection db, int? days) =>
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

        app.MapPost("/api/audit/clear", async (AuditClearDto dto, IDbConnection db) =>
        {
            var daysToKeep = dto.DaysToKeep ?? 90;
            var cutoff = DateTime.Now.AddDays(-daysToKeep).ToString("yyyy-MM-dd HH:mm:ss");
            var removed = await db.ExecuteAsync("DELETE FROM audit_logs WHERE created_at < @Cutoff", new { Cutoff = cutoff });
            return Common.Ok(new { removedCount = removed });
        });
    }
}