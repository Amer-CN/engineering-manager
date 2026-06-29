using EngineeringManager.Api.Services;

namespace EngineeringManager.Api;

public static class UpdateEndpoints
{
    public static void RegisterUpdateEndpoints(this WebApplication app)
    {
        // 登录用户均可查（沿用全局鉴权中间件）
        app.MapGet("/api/update/check", async (UpdateService svc, CancellationToken ct) =>
        {
            try { return Common.Ok(await svc.CheckAsync(ct)); }
            catch (Exception ex) { return Common.ServerError("检查更新", ex); }
        });
    }
}