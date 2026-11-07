using System.Data;
using System.Text.Json;
using Dapper;
using EngineeringManager.Api.Security;
using EngineeringManager.Api.Services;
using Microsoft.Data.Sqlite;

namespace EngineeringManager.Api;

/// <summary>
/// 期间锁定（T7c）：admin 锁定/解锁期间并写审计；锁定后由各写端点统一拦截。
/// 边界：只锁期间，不做完整损益结转。
/// </summary>
public static class PeriodLockEndpoints
{
    private sealed class PeriodLockRow
    {
        public string Period { get; set; } = "";
        public string? LockedAt { get; set; }
        public string? LockedBy { get; set; }
        public string? Reason { get; set; }
    }

    public static void RegisterPeriodLockEndpoints(this WebApplication app)
    {
        app.MapGet("/api/period-locks", async (HttpContext ctx, IDbConnection db) =>
        {
            _ = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            if (!CurrentUser.HasPermission(ctx, db, "vouchers:read")) return Results.Forbid();

            var rows = (await db.QueryAsync<PeriodLockRow>(
                @"SELECT [period] AS Period,[locked_at] AS LockedAt,[locked_by] AS LockedBy,[reason] AS Reason
                  FROM [period_locks] ORDER BY [period] DESC")).ToList();
            return Common.Ok(rows.Select(r => new
            {
                period = r.Period,
                lockedAt = r.LockedAt,
                lockedBy = r.LockedBy,
                reason = r.Reason
            }));
        });

        app.MapPost("/api/period-locks/{period}/lock", async (HttpContext ctx, IDbConnection db, string period) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            if (!CurrentUser.IsAdmin(ctx)) return Results.Forbid();
            if (!IsPeriod(period)) return Common.Fail("period 格式应为 YYYYMM", 400);
            var reason = await ReadReasonAsync(ctx);
            if (PeriodLockService.IsLocked(db, period))
                return Common.Fail($"期间 {period} 已锁定", 400);

            using var tx = BeginWriteTransaction(db);
            var now = Common.NowString();
            try
            {
                await db.ExecuteAsync(
                    @"INSERT INTO [period_locks] ([period],[locked_at],[locked_by],[reason])
                      VALUES (@Period,@Now,@Uid,@Reason)",
                    new { Period = period, Now = now, Uid = uid, Reason = reason }, tx);
                await db.ExecuteAsync(
                    @"INSERT INTO [audit_logs]
                        ([action],[level],[user_id],[user_name],[resource],[resource_id],[details],[ip_address],[created_at])
                      VALUES ('period.lock','warning',@UserId,@UserName,'period_locks',@ResourceId,@Details,@Ip,@CreatedAt)",
                    new
                    {
                        UserId = uid,
                        UserName = uid,
                        ResourceId = period,
                        Details = $"period={period}; reason={reason ?? ""}",
                        Ip = ctx.Connection.RemoteIpAddress?.ToString() ?? "",
                        CreatedAt = now
                    }, tx);
                tx.Commit();
                return Common.Ok(new { period, locked = true });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[PeriodLock] lock {period}: {ex.Message}");
                tx.Rollback();
                throw;
            }
        });

        app.MapPost("/api/period-locks/{period}/unlock", async (HttpContext ctx, IDbConnection db, string period) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            if (!CurrentUser.IsAdmin(ctx)) return Results.Forbid();
            if (!IsPeriod(period)) return Common.Fail("period 格式应为 YYYYMM", 400);
            var reason = await ReadReasonAsync(ctx);

            using var tx = BeginWriteTransaction(db);
            var now = Common.NowString();
            try
            {
                var affected = await db.ExecuteAsync(
                    "DELETE FROM [period_locks] WHERE [period]=@Period",
                    new { Period = period }, tx);
                if (affected == 0)
                {
                    tx.Rollback();
                    return Common.Fail($"期间 {period} 未锁定", 400);
                }

                await db.ExecuteAsync(
                    @"INSERT INTO [audit_logs]
                        ([action],[level],[user_id],[user_name],[resource],[resource_id],[details],[ip_address],[created_at])
                      VALUES ('period.unlock','warning',@UserId,@UserName,'period_locks',@ResourceId,@Details,@Ip,@CreatedAt)",
                    new
                    {
                        UserId = uid,
                        UserName = uid,
                        ResourceId = period,
                        Details = $"period={period}; reason={reason ?? ""}",
                        Ip = ctx.Connection.RemoteIpAddress?.ToString() ?? "",
                        CreatedAt = now
                    }, tx);
                tx.Commit();
                return Common.Ok(new { period, locked = false });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[PeriodLock] unlock {period}: {ex.Message}");
                tx.Rollback();
                throw;
            }
        });
    }

    private static async Task<string?> ReadReasonAsync(HttpContext ctx)
    {
        using var reader = new StreamReader(ctx.Request.Body);
        var text = await reader.ReadToEndAsync();
        if (string.IsNullOrWhiteSpace(text)) return null;
        try
        {
            using var doc = JsonDocument.Parse(text);
            if (doc.RootElement.ValueKind != JsonValueKind.Object) return null;
            if (!doc.RootElement.TryGetProperty("reason", out var el) || el.ValueKind != JsonValueKind.String) return null;
            var reason = (el.GetString() ?? "").Trim();
            return reason.Length == 0 ? null : reason;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static bool IsPeriod(string? period) =>
        !string.IsNullOrWhiteSpace(period) && period.Length == 6 && period.All(char.IsDigit);

    private static IDbTransaction BeginWriteTransaction(IDbConnection db) =>
        db is SqliteConnection sqlite ? sqlite.BeginTransaction(deferred: false) : db.BeginTransaction();
}