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

    // P0-4 缓解：路径必须带 projectId（粗粒度租户隔离）
    // 注: 排除全局配置子路径 (categories, match-rules, batches)
    //     /api/cost-ledger/categories, /api/cost-ledger/match-rules 不分项目
    private static readonly (string Prefix, string Param)[] ProjectScopedPaths = new[]
    {
        ("/api/contracts/income", "projectId"),
        ("/api/contracts/expense", "projectId"),
        ("/api/contracts/agreement", "projectId"),
        ("/api/wages", "projectId"),
        ("/api/attendances", "projectId"),
        ("/api/expenses", "projectId"),
        ("/api/drawings", "projectId"),
    };
    private static readonly string[] PublicPathPrefixes = new[]
    {
        "/api/auth/login",
        "/api/health",
        "/api/ocr/setup"
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

        // 白名单：登录、健康检查、OCR 首次启动引导
        var isPublic = PublicPathPrefixes.Any(p =>
            path.StartsWith(p, StringComparison.OrdinalIgnoreCase));
        if (isPublic)
        {
            await _next(context);
            return;
        }

        // 其他 /api/* 必须鉴权
        if (context.User.Identity?.IsAuthenticated != true)
        {
            context.Response.StatusCode = 401;
            context.Response.ContentType = "application/json; charset=utf-8";
            await context.Response.WriteAsync(
                "{\"success\":false,\"error\":\"未授权：请先登录\"}");
            return;
        }


        // P0-4 缓解：粗粒度 project_id 强制（防止已登录用户 SELECT * 列举全表）
        // v1.1.0: 只对 GET/DELETE 强制 (POST/PUT 有 body, projectId 在 body 里)
        var method = context.Request.Method;
        if (method == HttpMethods.Get || method == HttpMethods.Delete)
        {
            foreach (var (prefix, param) in ProjectScopedPaths)
            {
                if (path.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)
                    && !context.Request.Query.ContainsKey(param))
                {
                    context.Response.StatusCode = 400;
                    context.Response.ContentType = "application/json; charset=utf-8";
                    await context.Response.WriteAsync(
                        "{\"success\":false,\"error\":\"必须指定 \" + param + \" 参数\"}");
                    return;
                }
            }
        }
        await _next(context);
    }
}
