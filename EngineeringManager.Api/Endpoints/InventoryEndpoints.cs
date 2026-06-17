using System.Data;
using Dapper;
using EngineeringManager.Api.Security;

namespace EngineeringManager.Api;

/// <summary>
/// 库存 + 物料端点
/// </summary>
public static class InventoryEndpoints
{
    public static void RegisterInventoryEndpoints(this WebApplication app)
    {
        var now = () => DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

        // ═══════════════════════════════════════════════════════════
        // 库存
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/inventory", (HttpContext ctx, IDbConnection db) =>
            Common.Ok(db.Query("SELECT * FROM inventory_items ORDER BY name")));

        app.MapPost("/api/inventory", async (HttpContext ctx, InventoryItemDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO inventory_items
                (name,category,unit,quantity,min_quantity,location,notes,created_at,updated_at)
                VALUES (@Name,@Category,@Unit,@Quantity,@MinQuantity,@Location,@Notes,@Now,@Now);
                SELECT last_insert_rowid();",
                new { dto.Name, dto.Category, dto.Unit, dto.Quantity, dto.MinQuantity, dto.Location, dto.Notes, Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/inventory", async (HttpContext ctx, InventoryItemDto dto, IDbConnection db) =>
        {
            var affected = await db.ExecuteAsync(@"UPDATE inventory_items SET name=@Name,category=@Category,
                unit=@Unit,quantity=@Quantity,min_quantity=@MinQuantity,location=@Location,notes=@Notes,
                updated_at=@Now WHERE id=@Id",
                new { dto.Id, dto.Name, dto.Category, dto.Unit, dto.Quantity, dto.MinQuantity, dto.Location, dto.Notes, Now = now() });
            return affected > 0 ? Common.Ok() : Common.NotFound("库存项不存在");
        });

        app.MapDelete("/api/inventory/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
            (await db.ExecuteAsync("DELETE FROM inventory_items WHERE id=@Id", new { Id = id })) > 0 ? Common.Ok() : Common.NotFound("库存项不存在"));

        app.MapGet("/api/inventory/transactions", (HttpContext ctx, IDbConnection db, long? itemId) =>
        {
            var sql = "SELECT * FROM inventory_transactions";
            if (itemId.HasValue) sql += " WHERE item_id=@ItemId";
            sql += " ORDER BY created_at DESC";
            return Common.Ok(db.Query(sql, new { ItemId = itemId }));
        });

        // ═══════════════════════════════════════════════════════════
        // 物料
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/materials", (HttpContext ctx, IDbConnection db) =>
            Common.Ok(db.Query("SELECT * FROM materials ORDER BY name")));

        app.MapPost("/api/materials", async (HttpContext ctx, MaterialDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO materials
                (name,category,unit,specifications,supplier,notes,created_at,updated_at)
                VALUES (@Name,@Category,@Unit,@Specifications,@Supplier,@Notes,@Now,@Now);
                SELECT last_insert_rowid();",
                new { dto.Name, dto.Category, dto.Unit, dto.Specifications, dto.Supplier, dto.Notes, Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/materials", async (HttpContext ctx, MaterialDto dto, IDbConnection db) =>
        {
            var affected = await db.ExecuteAsync(@"UPDATE materials SET name=@Name,category=@Category,
                unit=@Unit,specifications=@Specifications,supplier=@Supplier,notes=@Notes,updated_at=@Now WHERE id=@Id",
                new { dto.Id, dto.Name, dto.Category, dto.Unit, dto.Specifications, dto.Supplier, dto.Notes, Now = now() });
            return affected > 0 ? Common.Ok() : Common.NotFound("物料不存在");
        });

        app.MapDelete("/api/materials/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
            (await db.ExecuteAsync("DELETE FROM materials WHERE id=@Id", new { Id = id })) > 0 ? Common.Ok() : Common.NotFound("物料不存在"));
    }
}
