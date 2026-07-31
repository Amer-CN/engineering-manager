using System.Data;
using EngineeringManager.Api.Security;
using EngineeringManager.Api.Services;

namespace EngineeringManager.Api;

/// <summary>
/// 报告端点 — AI 一键生成日/周/月报
/// </summary>
public static class ReportEndpoints
{
    public static void RegisterReportEndpoints(this WebApplication app)
    {
        // POST /api/reports/generate — 生成报告
        app.MapPost("/api/reports/generate", async (
            HttpContext ctx,
            ReportRequest request,
            IDbConnection db,
            ReportGenerationService reportService) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid))
                return Common.Fail("未登录");

            // 权限校验: reports:create
            if (!CurrentUser.HasPermission(ctx, db, "reports:create"))
                return Results.Json(new { success = false, error = "无权限：需要 reports:create" }, statusCode: 403);

            var isAdmin = CurrentUser.IsAdmin(ctx);
            var (success, markdown, error) = await reportService.GenerateReportAsync(
                db, request, uid, isAdmin);

            if (!success)
                return Common.Fail(error ?? "报告生成失败");

            return Common.Ok(new
            {
                markdown,
                timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
            });
        });
    }
}
