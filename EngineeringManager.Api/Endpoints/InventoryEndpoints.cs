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
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.1.0 P0-4 Phase 2: 公司维度表过滤 (无 project_id)
            return Common.Ok(db.Query($"SELECT * FROM inventory_items WHERE {CurrentUser.UserFilterCompany(scope)} ORDER BY name",
                new { Uid = uid, IsAdmin = isAdmin }));
        });

        app.MapPost("/api/inventory", async (HttpContext ctx, InventoryItemDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            // 修复: 列名对齐前端契约(InventoryItem type)与真库 —— code/specifications/purchase_price/sale_price/current_stock/min_stock/max_stock/supplier_id/remarks
            // (原 quantity/min_quantity/location/notes 是从未与前端匹配的死 schema)
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO inventory_items (code,name,category,unit,specifications,purchase_price,sale_price,current_stock,min_stock,max_stock,supplier_id,remarks,created_by,created_at,updated_at, last_modified_at) VALUES (@Code,@Name,@Category,@Unit,@Specifications,@PurchasePrice,@SalePrice,@CurrentStock,@MinStock,@MaxStock,@SupplierId,@Remarks,@CreatedBy,@Now,@Now, @Now);
                SELECT last_insert_rowid();",
                new { dto.Code, dto.Name, dto.Category, dto.Unit, dto.Specifications, dto.PurchasePrice, dto.SalePrice, dto.CurrentStock, dto.MinStock, dto.MaxStock, dto.SupplierId, dto.Remarks, CreatedBy = uid, Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/inventory", async (HttpContext ctx, InventoryItemDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            var affected = await db.ExecuteAsync(@"UPDATE inventory_items SET code=@Code,name=@Name,category=@Category,
                unit=@Unit,specifications=@Specifications,purchase_price=@PurchasePrice,sale_price=@SalePrice,current_stock=@CurrentStock,min_stock=@MinStock,max_stock=@MaxStock,supplier_id=@SupplierId,remarks=@Remarks,
                updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { dto.Id, dto.Code, dto.Name, dto.Category, dto.Unit, dto.Specifications, dto.PurchasePrice, dto.SalePrice, dto.CurrentStock, dto.MinStock, dto.MaxStock, dto.SupplierId, dto.Remarks,
                      Uid = uid, IsAdmin = isAdmin, Now = now() });
            return await Common.WriteResult(affected, db, "inventory_items", dto.Id ?? 0);
        });

        app.MapDelete("/api/inventory/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // C-4: 服务端权限检查（门禁5；码经 037 追加，仅 admin）
            if (!CurrentUser.HasPermission(ctx, db, "inventory:delete")) return Results.Forbid();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            return (await db.ExecuteAsync("DELETE FROM inventory_items WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapGet("/api/inventory/transactions", (HttpContext ctx, IDbConnection db, long? itemId) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.1.0 P0-4 Phase 2: 公司维度表过滤, itemId 仅作进一步收窄
            var sql = $@"SELECT * FROM inventory_transactions WHERE {CurrentUser.UserFilterCompany(scope)}";
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
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.1.0 P0-4 Phase 2: 公司维度表过滤 (无 project_id)
            return Common.Ok(db.Query($"SELECT * FROM materials WHERE {CurrentUser.UserFilterCompany(scope)} ORDER BY name",
                new { Uid = uid, IsAdmin = isAdmin }));
        });

        app.MapPost("/api/materials", async (HttpContext ctx, MaterialDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            // 修复: 列名对齐前端契约(Material type)与真库 —— project_id/quantity/price (原 specifications/supplier/notes 是死 schema; 真库 materials 无 updated_at)
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO materials (project_id,name,category,unit,quantity,price,created_by,created_at, last_modified_at) VALUES (@ProjectId,@Name,@Category,@Unit,@Quantity,@Price,@CreatedBy,@Now, @Now);
                SELECT last_insert_rowid();",
                new { dto.ProjectId, dto.Name, dto.Category, dto.Unit, dto.Quantity, dto.Price, CreatedBy = uid, Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/materials", async (HttpContext ctx, MaterialDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            var affected = await db.ExecuteAsync(@"UPDATE materials SET project_id=@ProjectId,name=@Name,category=@Category,
                unit=@Unit,quantity=@Quantity,price=@Price, version=version+1, last_modified_at=@Now WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { dto.Id, dto.ProjectId, dto.Name, dto.Category, dto.Unit, dto.Quantity, dto.Price,
                      Uid = uid, IsAdmin = isAdmin, Now = now() });
            return await Common.WriteResult(affected, db, "materials", dto.Id ?? 0);
        });

        app.MapDelete("/api/materials/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // C-4: 服务端权限检查（门禁5；码经 037 追加，仅 admin）
            if (!CurrentUser.HasPermission(ctx, db, "inventory:delete")) return Results.Forbid();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            return (await db.ExecuteAsync("DELETE FROM materials WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });
}
}
