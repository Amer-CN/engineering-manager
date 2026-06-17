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
        app.MapGet("/api/templates", (IDbConnection db) =>
            Common.Ok(db.Query("SELECT * FROM templates ORDER BY created_at DESC")));

        app.MapDelete("/api/templates/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            return (await db.ExecuteAsync("DELETE FROM templates WHERE id=@Id", new { Id = id })) > 0 ? Common.Ok() : Results.Forbid();
        });

        // 模板 — 统计 + 创建 + 更新
        app.MapGet("/api/templates/stats", (IDbConnection db) => Common.Ok(new
        {
            total = db.ExecuteScalar<int>("SELECT COUNT(*) FROM templates"),
            byCategory = db.Query("SELECT category, COUNT(*) as count FROM templates GROUP BY category"),
        }));

        app.MapPost("/api/templates", async (HttpContext ctx, dynamic dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO templates (name,category,description,file_name,stored_file_name,file_type,created_at,updated_at)
                VALUES (@Name,@Category,@Description,@FileName,@StoredFileName,@FileType,@Now,@Now); SELECT last_insert_rowid();",
                new { Now = Common.NowString() });
            return Common.Ok(id);
        });

        app.MapPut("/api/templates", async (HttpContext ctx, dynamic dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var affected = await db.ExecuteAsync(@"UPDATE templates SET name=@Name,category=@Category,description=@Description,updated_at=@Now WHERE id=@Id",
                new { Now = Common.NowString() });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });
    }
}
