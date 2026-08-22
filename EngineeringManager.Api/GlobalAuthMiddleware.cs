using Microsoft.AspNetCore.Http;

namespace EngineeringManager.Api;

/// <summary>
/// P0-2 全局鉴权中间件
/// 规则：除白名单外，所有 /api/* 请求必须有 JWT token
/// 白名单：/api/auth/login（登录本身）、/api/health（健康检查）、/api/ocr/setup/*（首次启动引导）
/// 401 响应：{ "success": false, "error": "未授权：请先登录" }
/// 注意：本中间件必须在 app.UseAuthentication() 之后注册，否则 ctx.User 永远为匿名
/// </summary>
public class GlobalAuthMiddleware
{
    private readonly RequestDelegate _next;

    // 安全表 #2/#8: 精确免鉴权集合（EventSource 不带 Authorization header，stream 必须保留；
    // download 触发本身免鉴权是既有产品语义——useUpdater 启动检查时机可能未登录）
    private static readonly string[] PublicExactPaths = new[]
    {
        "/api/update/download",
        "/api/update/download/stream"
    };

    private static readonly string[] PublicPathPrefixes = new[]
    {
        "/api/auth/login",
        "/api/health",
        "/api/ocr/setup",
        "/api/agent/setup/status"
    };

    public GlobalAuthMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value?.TrimEnd('/') ?? "";

        // 静态文件 / SPA 回退 / 非 API 路径：放行
        if (!path.StartsWith("/api", StringComparison.OrdinalIgnoreCase))
        {
            await _next(context);
            return;
        }

        // 白名单：登录、健康检查、OCR 首次启动引导、Agent setup/status、更新下载（exact: download/stream）
        // M-EDITION1 修复: 精确匹配或路径后接 '/'，避免 /api/healthz、/api/auth/loginx 误放行
        // 安全表 #2/#8: 先查 exact 集合，再查 prefix 集合（prefix 不再含 /api/update/download 宽前缀
        // 与 /api/agent/setup 宽前缀，cancel/save/test 等子路径全部收回鉴权）
        var isPublic = PublicExactPaths.Any(p => path.Equals(p, StringComparison.OrdinalIgnoreCase))
            || PublicPathPrefixes.Any(p =>
                path.Equals(p, StringComparison.OrdinalIgnoreCase) ||
                path.StartsWith(p + "/", StringComparison.OrdinalIgnoreCase));

        // /api/config GET 精确放行（登录设置页面需要读配置），PUT 仍需鉴权
        if (!isPublic && path == "/api/config" && HttpMethods.IsGet(context.Request.Method))
            isPublic = true;

        if (isPublic)
        {
            await _next(context);
            return;
        }

        // 其他 /api/* 必须鉴权
        // 注: 租户隔离在端点 SQL 层 (CurrentUser.UserFilterWithAuthorizedProjects) 完成,
        //     不在中间件层强制 projectId —— 那会误伤跨项目汇总端点 (/api/wages/payment-records,
        //     /api/wages/overdue-stats 等) 且与前端 "projectId 可选" 契约冲突.
        if (context.User.Identity?.IsAuthenticated != true)
        {
            context.Response.StatusCode = 401;
            context.Response.ContentType = "application/json; charset=utf-8";
            await context.Response.WriteAsync(
                "{\"success\":false,\"error\":\"未授权：请先登录\"}");
            return;
        }

        await _next(context);
    }
}
