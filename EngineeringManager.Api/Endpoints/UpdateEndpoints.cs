using System.Data;
using EngineeringManager.Api.Security;
using EngineeringManager.Api.Services;

namespace EngineeringManager.Api;

public static class UpdateEndpoints
{
    public static void RegisterUpdateEndpoints(this WebApplication app)
    {
        // 检查更新
        app.MapGet("/api/update/check", async (UpdateService svc, CancellationToken ct) =>
        {
            try { return Common.Ok(await svc.CheckAsync(ct)); }
            catch (Exception ex) { return Common.ServerError("检查更新", ex); }
        });

        // 启动后台下载（立即返回，不阻塞）
        app.MapPost("/api/update/download", async (UpdateService svc, CancellationToken ct) =>
        {
            try
            {
                var check = await svc.CheckAsync(ct);
                if (!check.HasUpdate || check.Package == null)
                    return Common.Fail("暂无可用更新");

                // 并发闸：同 id 只允许一个活动下载，重复点击复用进行中的下载
                if (!svc.StartDownload(check.Package, "default"))
                    return Common.Ok(new { accepted = true, alreadyRunning = true });
                return Common.Ok(new { accepted = true });
            }
            catch (Exception ex) { return Common.ServerError("启动下载", ex); }
        });

        // 取消下载
        app.MapPost("/api/update/download/cancel", (UpdateService svc) =>
        {
            try
            {
                svc.CancelDownload("default");
                return Common.Ok(new { cancelled = true });
            }
            catch (Exception ex) { return Common.ServerError("取消下载", ex); }
        });

        // SSE 进度推送
        app.MapGet("/api/update/download/stream", async (HttpContext ctx, UpdateService svc) =>
        {
            ctx.Response.ContentType = "text/event-stream";
            ctx.Response.Headers.Append("Cache-Control", "no-cache");
            ctx.Response.Headers.Append("Connection", "keep-alive");
            ctx.Response.Headers.Append("X-Accel-Buffering", "no");

            var ct = ctx.RequestAborted;
            while (!ct.IsCancellationRequested)
            {
                var progress = svc.GetProgress("default");
                if (progress != null)
                {
                    await WriteSSE(ctx, progress);
                    if (progress.Phase is "done" or "error" or "cancelled")
                        break;
                }
                await Task.Delay(300, ct);
            }
        });

        // 装包 + 重启（不变）
        app.MapPost("/api/update/apply", (HttpContext ctx, IDbConnection db, UpdateService svc, ApplyRequest req) =>
        {
            try
            {
                // 安全表 #1: 安装更新属系统级操作 → settings:update（与 snapshots/backup 同档）
                if (!CurrentUser.HasPermission(ctx, db, "settings:update")) return Results.Forbid();
                if (string.IsNullOrWhiteSpace(req.Path))
                    return Common.Fail("缺少安装包路径");

                // 安全表 #1: 路径锁定——安装包必须位于 UpdatesDir 内，防任意路径 Process.Start
                var updatesDir = Path.GetFullPath(svc.UpdatesDir);
                if (!updatesDir.EndsWith(Path.DirectorySeparatorChar)) updatesDir += Path.DirectorySeparatorChar;
                if (!Path.GetFullPath(req.Path).StartsWith(updatesDir, StringComparison.OrdinalIgnoreCase))
                    return Common.Fail("安装包路径非法");

                svc.ApplyAndExit(req.Path);
                return Common.Ok(new { message = "正在启动安装器..." });
            }
            catch (Exception ex) { return Common.ServerError("安装更新", ex); }
        });
    }

    private static async Task WriteSSE(HttpContext ctx, object data)
    {
        var json = System.Text.Json.JsonSerializer.Serialize(data, new System.Text.Json.JsonSerializerOptions
        {
            PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase,
        });
        await ctx.Response.WriteAsync($"data: {json}\n\n");
        await ctx.Response.Body.FlushAsync();
    }
}

public record ApplyRequest(string Path);
