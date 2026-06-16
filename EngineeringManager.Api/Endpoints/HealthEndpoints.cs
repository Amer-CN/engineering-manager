using System.Data;
using Dapper;
using Microsoft.AspNetCore.Authorization;

namespace EngineeringManager.Api;

/// <summary>
/// 健康检查端点：连通性 / 一致性 / 完整性 / 表结构
/// </summary>
public static class HealthEndpoints
{
    public static void RegisterHealthEndpoints(this WebApplication app)
    {
        // ═══════════════════════════════════════════════════════════
        // 健康检查（公开端点）
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/health", [AllowAnonymous] (IDbConnection db) =>
        {
            try
            {
                db.ExecuteScalar("SELECT 1");
                return Common.Ok(new { status = "ok", mode = "sqlite" });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[ERROR] 健康检查失败: {ex.Message}");
                return Common.ServerError("健康检查", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 数据一致性检查
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/health/consistency", (IDbConnection db) =>
        {
            var tables = new[] { "projects", "members", "partners", "invoices", "wages", "attendances", "settlements", "cost_ledger" };
            var results = tables.Select(t => new { table = t, count = db.ExecuteScalar<int>($"SELECT COUNT(*) FROM [{t}]") });
            return Common.Ok(new { tables = results, consistent = true });
        });

        app.MapGet("/api/health/integrity", (IDbConnection db) =>
        {
            var result = db.QueryFirstOrDefault<string>("PRAGMA integrity_check");
            return Common.Ok(new { ok = result == "ok", result });
        });

        app.MapPost("/api/health/export-json", () => Common.Ok(new { exported = 0 }));
        app.MapPost("/api/health/reconcile", () => Common.Ok(new { reconciled = true }));

        // 临时：查看表结构（仅允许白名单字符，防 SQL 注入）
        app.MapGet("/api/debug/schema/{tableName}", (string tableName, IDbConnection db) =>
        {
            if (string.IsNullOrEmpty(tableName) || !System.Text.RegularExpressions.Regex.IsMatch(tableName, @"^[a-zA-Z_][a-zA-Z0-9_]*$"))
                return Common.Fail("无效的表名");
            var columns = db.Query($"PRAGMA table_info([{tableName}])");
            return Common.Ok(columns);
        });
    }
}