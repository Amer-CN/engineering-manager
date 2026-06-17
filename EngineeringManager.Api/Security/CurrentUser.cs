using Microsoft.AspNetCore.Http;

namespace EngineeringManager.Api.Security;

/// <summary>
/// 当前用户上下文辅助（v1.1.0 P0-4 完整版）
/// 从 HttpContext.User 中提取 uid / 角色，用于所有 INSERT 端点写入 created_by，
/// SELECT/DELETE/UPDATE 端点做用户维度过滤。
///
/// 必须在 GlobalAuthMiddleware 之后使用（中间件已校验 JWT）。
/// </summary>
public static class CurrentUser
{
    /// <summary>从 JWT token 中提取用户 ID（uid claim）。未登录返回 null。</summary>
    public static string? GetUserId(HttpContext ctx) =>
        ctx.User?.FindFirst("uid")?.Value;

    /// <summary>当前用户是否为 admin 角色（admin role claim 由登录端点写入）。</summary>
    public static bool IsAdmin(HttpContext ctx) =>
        ctx.User?.IsInRole("admin") ?? false;

    /// <summary>
    /// 构造 SQL WHERE 子句的用户维度过滤片段：
    /// (created_by = @Uid OR @IsAdmin = 1 OR EXISTS(SELECT 1 FROM project_members WHERE project_id = @ProjectId AND user_id = @Uid))
    /// admin 传 isAdmin=1 时短路掉前两个 OR，全表可见。
    /// </summary>
    public const string UserFilterFragment = @"
        (created_by = @Uid
         OR @IsAdmin = 1
         OR EXISTS(SELECT 1 FROM project_members
                   WHERE project_id = @ProjectId AND user_id = @Uid))";
}