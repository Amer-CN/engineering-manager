using System.Data;
using Dapper;
using EngineeringManager.Api.Security;
using EngineeringManager.Api.Services;

namespace EngineeringManager.Api;

/// <summary>
/// 模板端点：查询 / 删除 / 统计 / 创建 / 更新
/// </summary>
public static class TemplateEndpoints
{
    public static void RegisterTemplateEndpoints(this WebApplication app)
    {
        // 模板 — 基础查询 + 删除
        app.MapGet("/api/templates", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            return Common.Ok(db.Query("SELECT * FROM templates ORDER BY created_at DESC"));
        });

        app.MapDelete("/api/templates/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B1: 模板删除 → settings:update
            if (!CurrentUser.HasPermission(ctx, db, "settings:update")) return Results.Forbid();
            return (await db.ExecuteAsync("DELETE FROM templates WHERE id=@Id", new { Id = id })) > 0 ? Common.Ok() : Results.Forbid();
        });

        // 模板 — 统计 + 创建 + 更新
        app.MapGet("/api/templates/stats", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            return Common.Ok(new
            {
                total = db.ExecuteScalar<int>("SELECT COUNT(*) FROM templates"),
                byCategory = db.Query("SELECT category, COUNT(*) as count FROM templates GROUP BY category"),
            });
        });

        app.MapPost("/api/templates", async (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B1: 模板创建 → settings:update
            if (!CurrentUser.HasPermission(ctx, db, "settings:update")) return Results.Forbid();
            // 修复: 原 dynamic dto + 参数只传 Now 导致 6 个占位符全缺参必 500(与 contract-templates bug#10 同根因); 并补 variables 列写入(真库有列而原 SQL 漏写, 变量编辑静默丢)
            using var reader = new System.IO.StreamReader(ctx.Request.Body);
            var bodyText = await reader.ReadToEndAsync();
            var body = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(bodyText);
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO templates (name,category,description,file_name,stored_file_name,file_type,variables,created_at,updated_at)
                VALUES (@Name,@Category,@Description,@FileName,@StoredFileName,@FileType,@Variables,@Now,@Now); SELECT last_insert_rowid();",
                new {
                    Name = body.TryGetProperty("name", out var n) ? n.GetString() : null,
                    Category = body.TryGetProperty("category", out var c) ? c.GetString() : null,
                    Description = body.TryGetProperty("description", out var d) ? d.GetString() : null,
                    FileName = body.TryGetProperty("fileName", out var fn) ? fn.GetString() : null,
                    StoredFileName = body.TryGetProperty("storedFileName", out var sf) ? sf.GetString() : null,
                    FileType = body.TryGetProperty("fileType", out var ft) ? ft.GetString() : null,
                    Variables = body.TryGetProperty("variables", out var v) ? v.GetRawText() : "[]",
                    Now = Common.NowString()
                });
            return Common.Ok(id);
        });

        app.MapPut("/api/templates", async (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B1: 模板更新 → settings:update
            if (!CurrentUser.HasPermission(ctx, db, "settings:update")) return Results.Forbid();
            // 修复: 原 dynamic dto + 参数只传 Now 导致缺参必 500; 并补 variables 列更新与 404 语义
            using var reader = new System.IO.StreamReader(ctx.Request.Body);
            var bodyText = await reader.ReadToEndAsync();
            var body = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(bodyText);
            var recordId = body.TryGetProperty("id", out var idProp) ? idProp.GetInt64() : 0;
            var affected = await db.ExecuteAsync(@"UPDATE templates SET name=@Name,category=@Category,description=@Description,variables=@Variables,updated_at=@Now WHERE id=@Id",
                new {
                    Id = recordId,
                    Name = body.TryGetProperty("name", out var n) ? n.GetString() : null,
                    Category = body.TryGetProperty("category", out var c) ? c.GetString() : null,
                    Description = body.TryGetProperty("description", out var d) ? d.GetString() : null,
                    Variables = body.TryGetProperty("variables", out var v) ? v.GetRawText() : "[]",
                    Now = Common.NowString()
                });
            return await Common.WriteResult(affected, db, "templates", recordId);
        });

        // ── 采集表下发：模板分类 collection 的空表，填 {项目}/{月份}/{班组} 后回 dataUrl（spec S2）──
        app.MapPost("/api/templates/{id}/issue-collection", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            // 与考勤导入同权：下发采集表是考勤流程的起点
            if (!CurrentUser.HasPermission(ctx, db, "wages:create")) return Results.Forbid();
            using var reader = new System.IO.StreamReader(ctx.Request.Body);
            var bodyText = await reader.ReadToEndAsync();
            var body = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(bodyText);
            string? projectName = body.TryGetProperty("projectName", out var pn) ? pn.GetString() : null;
            string? yearMonth = body.TryGetProperty("yearMonth", out var ym) ? ym.GetString() : null;
            string? teamName = body.TryGetProperty("teamName", out var tn) ? tn.GetString() : null;
            var tpl = db.QueryFirstOrDefault("SELECT stored_file_name, file_type FROM templates WHERE id=@Id", new { Id = id });
            if (tpl == null) return Results.NotFound(new { success = false, error = "模板不存在" });
            if ((tpl.file_type as string) != "xlsx") return Results.BadRequest(new { success = false, error = "仅支持 xlsx 采集表模板" });
            var fileName = Path.GetFileName((tpl.stored_file_name as string) ?? "");
            // 路径与前端 FILE_CATEGORIES.TEMPLATE_FILE（category='templates'，落盘 uploads/templates/）绑定，改动需两处同步
            var path = Path.Combine(ApiConfig.ResolveDataPath(), "uploads", "templates", fileName);
            if (!File.Exists(path)) return Results.NotFound(new { success = false, error = "模板文件不存在，请重新上传" });
            var values = new Dictionary<string, string>
            {
                ["{项目}"] = projectName ?? "",
                ["{月份}"] = yearMonth ?? "",
                ["{班组}"] = string.IsNullOrEmpty(teamName) ? "全部班组" : teamName,
            };
            var filled = XlsxTemplateService.FillTitlePlaceholders(await File.ReadAllBytesAsync(path), values);
            return Common.Ok(new { dataUrl = "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64," + Convert.ToBase64String(filled) });
        });
    }
}
