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
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            // v1.1.0 P0-4 Phase 2: 公司维度表过滤 (无 project_id)
            return Common.Ok(db.Query($"SELECT * FROM inventory_items WHERE {CurrentUser.UserFilterCompany()} ORDER BY name",
                new { Uid = uid, IsAdmin = isAdmin }));
        });

        app.MapPost("/api/inventory", async (HttpContext ctx, InventoryItemDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO inventory_items
                (name,category,unit,quantity,min_quantity,location,notes,created_by,created_at,updated_at)
                VALUES (@Name,@Category,@Unit,@Quantity,@MinQuantity,@Location,@Notes,@CreatedBy,@Now,@Now);
                SELECT last_insert_rowid();",
                new { dto.Name, dto.Category, dto.Unit, dto.Quantity, dto.MinQuantity, dto.Location, dto.Notes, CreatedBy = uid, Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/inventory", async (HttpContext ctx, InventoryItemDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var affected = await db.ExecuteAsync(@"UPDATE inventory_items SET name=@Name,category=@Category,
                unit=@Unit,quantity=@Quantity,min_quantity=@MinQuantity,location=@Location,notes=@Notes,
                updated_at=@Now WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { dto.Id, dto.Name, dto.Category, dto.Unit, dto.Quantity, dto.MinQuantity, dto.Location, dto.Notes,
                      Uid = uid, IsAdmin = isAdmin, Now = now() });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapDelete("/api/inventory/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            return (await db.ExecuteAsync("DELETE FROM inventory_items WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapGet("/api/inventory/transactions", (HttpContext ctx, IDbConnection db, long? itemId) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            // v1.1.0 P0-4 Phase 2: 公司维度表过滤, itemId 仅作进一步收窄
            var sql = $@"SELECT * FROM inventory_transactions WHERE {CurrentUser.UserFilterCompany()}";
            if (itemId.HasValue) sql += " AND item_id=@ItemId";
            sql += " ORDER BY created_at DESC";
            return Common.Ok(db.Query(sql, new { ItemId = itemId, Uid = uid, IsAdmin = isAdmin }));
        });

        // ═══════════════════════════════════════════════════════════
        // 物料
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/materials", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            // v1.1.0 P0-4 Phase 2: 公司维度表过滤 (无 project_id)
            return Common.Ok(db.Query($"SELECT * FROM materials WHERE {CurrentUser.UserFilterCompany()} ORDER BY name",
                new { Uid = uid, IsAdmin = isAdmin }));
        });

        app.MapPost("/api/materials", async (HttpContext ctx, MaterialDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO materials
                (name,category,unit,specifications,supplier,notes,created_by,created_at,updated_at)
                VALUES (@Name,@Category,@Unit,@Specifications,@Supplier,@Notes,@CreatedBy,@Now,@Now);
                SELECT last_insert_rowid();",
                new { dto.Name, dto.Category, dto.Unit, dto.Specifications, dto.Supplier, dto.Notes, CreatedBy = uid, Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/materials", async (HttpContext ctx, MaterialDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var affected = await db.ExecuteAsync(@"UPDATE materials SET name=@Name,category=@Category,
                unit=@Unit,specifications=@Specifications,supplier=@Supplier,notes=@Notes,updated_at=@Now WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { dto.Id, dto.Name, dto.Category, dto.Unit, dto.Specifications, dto.Supplier, dto.Notes,
                      Uid = uid, IsAdmin = isAdmin, Now = now() });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapDelete("/api/materials/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            return (await db.ExecuteAsync("DELETE FROM materials WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });
}
}
