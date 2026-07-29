using System.Data;
using Dapper;
using EngineeringManager.Api.Security;

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
    }
}
