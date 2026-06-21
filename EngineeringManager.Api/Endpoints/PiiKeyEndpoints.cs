using System.Data;
using Dapper;
using EngineeringManager.Api.Security;

namespace EngineeringManager.Api;

/// <summary>
/// v0.76.0 累计待办 #5: PII Key Rotation 管理端点 (admin-only)
/// 提供:
///   GET  /api/admin/pii/keys         - 列出所有 PII keys (key_id, active, created_at, retired_at)
///   POST /api/admin/pii/rotate       - 生成新 active key, 旧 key 标 retired (写 audit log)
///
/// 安全:
///   - 全部 admin-only (IsAdmin 校验)
///   - rotation 写 audit_logs (action=update, resource=pii_keys)
///   - 不暴露 encrypted_key (BLOB 敏感)
/// </summary>
public static class PiiKeyEndpoints
{
    public static void RegisterPiiKeyEndpoints(this WebApplication app)
    {
        // GET /api/admin/pii/keys
        app.MapGet("/api/admin/pii/keys", (HttpContext ctx, IDbConnection db, PiiProtector pii) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid)) return Common.Fail("未登录");
            if (!CurrentUser.IsAdmin(ctx)) return Results.Forbid();

            var keys = pii.ListKeys(db);
            return Common.Ok(new
            {
                keys,
                activeKeyId = pii.ActiveKeyId,
                totalKeys = pii.KeyCount
            });
        });

        // POST /api/admin/pii/rotate
        app.MapPost("/api/admin/pii/rotate", (HttpContext ctx, IDbConnection db, PiiProtector pii) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid)) return Common.Fail("未登录");
            if (!CurrentUser.IsAdmin(ctx)) return Results.Forbid();

            int newKeyId;
            try
            {
                newKeyId = pii.Rotate(db, uid);
            }
            catch (Exception ex)
            {
                return Common.ServerError("PII key rotation", ex);
            }

            // 写 audit log
            try
            {
                db.Execute(@"INSERT INTO audit_logs
                    (action, level, user_id, user_name, resource_type, resource_id, details, ip_address, created_at)
                    VALUES (@Action, @Level, @UserId, @UserName, @Resource, @ResourceId, @Details, @IpAddress, @CreatedAt)",
                    new
                    {
                        Action = "update",
                        Level = "warning",
                        UserId = uid,
                        UserName = uid,
                        Resource = "pii_keys",
                        ResourceId = newKeyId,
                        Details = $"{{\"event\":\"pii_key_rotated\",\"new_key_id\":{newKeyId}}}",
                        IpAddress = ctx.Connection.RemoteIpAddress?.ToString() ?? "",
                        CreatedAt = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
                    });
            }
            catch (Exception ex)
            {
                // audit 失败不阻塞响应, 但要 log
                Console.Error.WriteLine($"[ERROR] PII key rotation audit log failed: {ex.Message}");
            }

            return Common.Ok(new
            {
                newKeyId,
                message = "PII key 已轮换, 旧数据仍可解密, 新数据用新 key 加密"
            });
        });

        // POST /api/admin/pii/reencrypt - 启动后台 re-encrypt worker (admin-only)
        app.MapPost("/api/admin/pii/reencrypt", async (HttpContext ctx, IDbConnection db, PiiReencryptWorker worker) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid)) return Common.Fail("未登录");
            if (!CurrentUser.IsAdmin(ctx)) return Results.Forbid();

            try
            {
                await worker.StartAsync(db, uid);
            }
            catch (InvalidOperationException ex)
            {
                return Results.Json(new { success = false, error = ex.Message }, statusCode: 400);
            }
            catch (Exception ex)
            {
                return Common.ServerError("PII re-encrypt start", ex);
            }

            // 写 audit log (start event)
            try
            {
                db.Execute(@"INSERT INTO audit_logs
                    (action, level, user_id, user_name, resource_type, resource_id, details, ip_address, created_at)
                    VALUES (@Action, @Level, @UserId, @UserName, @Resource, @ResourceId, @Details, @IpAddress, @CreatedAt)",
                    new
                    {
                        Action = "create",
                        Level = "warning",
                        UserId = uid,
                        UserName = uid,
                        Resource = "pii_reencrypt",
                        ResourceId = 1,
                        Details = "{\"event\":\"pii_reencrypt_started\"}",
                        IpAddress = ctx.Connection.RemoteIpAddress?.ToString() ?? "",
                        CreatedAt = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
                    });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[ERROR] PII re-encrypt audit log failed: {ex.Message}");
            }

            return Common.Ok(new
            {
                status = worker.GetStatus(db),
                message = "PII re-encrypt 已启动 (后台异步)"
            });
        });

        // GET /api/admin/pii/reencrypt/status - 查询 re-encrypt 进度 (admin-only)
        app.MapGet("/api/admin/pii/reencrypt/status", (HttpContext ctx, IDbConnection db, PiiReencryptWorker worker) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid)) return Common.Fail("未登录");
            if (!CurrentUser.IsAdmin(ctx)) return Results.Forbid();
            return Common.Ok(worker.GetStatus(db));
        });
    }
}
