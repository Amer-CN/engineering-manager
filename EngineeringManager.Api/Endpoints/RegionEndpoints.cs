using System.Data;
using Dapper;
using EngineeringManager.Api.Security;

namespace EngineeringManager.Api;

/// <summary>
/// 区域端点：省市区数据
/// </summary>
public static class RegionEndpoints
{
    public static void RegisterRegionEndpoints(this WebApplication app)
    {
        app.MapGet("/api/regions", (IDbConnection db) =>
            Common.Ok(db.Query("SELECT * FROM regions ORDER BY province, city, district")));

        app.MapPost("/api/regions", async (HttpContext ctx, RegionDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO regions (province,city,district)
                VALUES (@Province,@City,@District); SELECT last_insert_rowid();", dto);
            return Common.Ok(id);
        });

        app.MapDelete("/api/regions/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            return (await db.ExecuteAsync("DELETE FROM regions WHERE id=@Id", new { Id = id })) > 0 ? Common.Ok() : Results.Forbid();
        });
    }
}
