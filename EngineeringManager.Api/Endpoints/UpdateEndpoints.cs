using EngineeringManager.Api.Services;

namespace EngineeringManager.Api;

public static class UpdateEndpoints
{
    public static void RegisterUpdateEndpoints(this WebApplication app)
    {
        // 检查更新（第一环已有）
        app.MapGet("/api/update/check", async (UpdateService svc, CancellationToken ct) =>
        {
            try { return Common.Ok(await svc.CheckAsync(ct)); }
            catch (Exception ex) { return Common.ServerError("检查更新", ex); }
        });

        // 下载安装包 + SHA256 校验
        app.MapPost("/api/update/download", async (UpdateService svc, CancellationToken ct) =>
        {
            try
            {
                var check = await svc.CheckAsync(ct);
                if (!check.HasUpdate || check.Package == null)
                    return Common.Fail("暂无可用更新");

                var path = await svc.DownloadAsync(check.Package, ct);
                return Common.Ok(new { path });
            }
            catch (Exception ex) { return Common.ServerError("下载安装包", ex); }
        });

        // 装包 + 重启
        app.MapPost("/api/update/apply", (UpdateService svc, ApplyRequest req) =>
        {
            try
            {
                if (string.IsNullOrWhiteSpace(req.Path))
                    return Common.Fail("缺少安装包路径");

                svc.ApplyAndExit(req.Path);
                return Common.Ok(new { message = "正在启动安装器..." });
            }
            catch (Exception ex) { return Common.ServerError("安装更新", ex); }
        });
    }
}

public record ApplyRequest(string Path);
