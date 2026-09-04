using System.Data;
using Dapper;
using EngineeringManager.Api.Security;

namespace EngineeringManager.Api;

/// <summary>
/// v0.75.0: User Preferences API — 持久化用户偏好设置 (前端 toggle 状态等).
/// 替代 localStorage: 多设备同步 + admin 可控.
///
/// 当前支持的偏好:
///   - pii_mask_enabled: 是否默认 mask PII 字段 (true=mask 默认, false=显示明文)
///   - 默认值: true (保守, 与 v1.2.0 MaskContext 默认一致)
///
/// API 路径:
///   GET  /api/user-preferences       - 当前登录用户的全部偏好
///   PUT  /api/user-preferences       - 更新当前登录用户偏好 (body: { pii_mask_enabled: bool })
///   GET  /api/user-preferences/{key} - 单个偏好
///   PUT  /api/user-preferences/{key} - 更新单个偏好
/// </summary>
public static class UserPreferencesEndpoints
{
    private const string DefaultPiiMask = "true";

    public static void RegisterUserPreferencesEndpoints(this WebApplication app)
    {
        // 获取当前用户所有偏好
        app.MapGet("/api/user-preferences", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid)) return Common.Fail("未登录");
            var prefs = db.Query<(string key, string value)>(
                "SELECT key, value FROM user_preferences WHERE user_id=@Uid", new { Uid = uid })
                .ToDictionary(p => p.key, p => p.value);
            // 默认填充: 未设置的偏好用默认值
            if (!prefs.ContainsKey("pii_mask_enabled"))
                prefs["pii_mask_enabled"] = DefaultPiiMask;
            return Common.Ok(prefs);
        });

        // 批量更新当前用户偏好 (PUT body: { "pii_mask_enabled": "false" })
        app.MapPut("/api/user-preferences", async (HttpContext ctx, HttpRequest req, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid)) return Common.Fail("未登录");

            Dictionary<string, string>? body;
            try
            {
                using var reader = new System.IO.StreamReader(req.Body);
                var bodyText = await reader.ReadToEndAsync();
                body = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(
                    bodyText, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
            catch (Exception ex) { return Common.Fail("参数解析失败: " + Common.Sanitize(ex.Message)); }
            if (body == null || body.Count == 0) return Common.Fail("为空请求体");

            // 逐条 UPSERT
            foreach (var kv in body)
            {
                db.Execute(@"
                    INSERT INTO user_preferences (user_id, key, value, updated_at)
                    VALUES (@Uid, @Key, @Value, @Now)
                    ON CONFLICT(user_id, key) DO UPDATE SET value=@Value, updated_at=@Now",
                    new { Uid = uid, Key = kv.Key, Value = kv.Value, Now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") });
            }
            return Common.Ok(new { updated = body.Count });
        });

        // 获取单个偏好
        app.MapGet("/api/user-preferences/{key}", (HttpContext ctx, string key, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid)) return Common.Fail("未登录");

            var value = db.ExecuteScalar<string?>(
                "SELECT value FROM user_preferences WHERE user_id=@Uid AND key=@Key",
                new { Uid = uid, Key = key });
            // 默认值 fallback
            if (value == null)
            {
                value = key switch
                {
                    "pii_mask_enabled" => DefaultPiiMask,
                    "retention_days"    => "7",
                    _ => null
                };
            }
            return value == null
                ? Common.NotFound("preference '" + key + "' not found")
                : Common.Ok(new { key, value });
        });

        // 更新单个偏好
        app.MapPut("/api/user-preferences/{key}", async (HttpContext ctx, string key, HttpRequest req, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid)) return Common.Fail("未登录");

            PrefValueDto dto;
            try
            {
                using var reader = new System.IO.StreamReader(req.Body);
                var bodyText = await reader.ReadToEndAsync();
                dto = System.Text.Json.JsonSerializer.Deserialize<PrefValueDto>(bodyText,
                    new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new PrefValueDto();
            }
            catch (Exception ex) { return Common.Fail("参数解析失败: " + Common.Sanitize(ex.Message)); }

            db.Execute(@"
                INSERT INTO user_preferences (user_id, key, value, updated_at)
                VALUES (@Uid, @Key, @Value, @Now)
                ON CONFLICT(user_id, key) DO UPDATE SET value=@Value, updated_at=@Now",
                new { Uid = uid, Key = key, Value = dto.Value, Now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") });
            return Common.Ok(new { key, value = dto.Value });
        });
    }

    public class PrefValueDto
    {
        public string Value { get; set; } = "";
    }
}
