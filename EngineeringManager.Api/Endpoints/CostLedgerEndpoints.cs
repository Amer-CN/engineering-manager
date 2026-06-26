using System.Data;
using Dapper;
using EngineeringManager.Api.Security;

namespace EngineeringManager.Api;

/// <summary>
/// 成本台账端点（条目 + 分类 + 批次 + 匹配规则）
/// </summary>
public static class CostLedgerEndpoints
{
    public static void RegisterCostLedgerEndpoints(this WebApplication app)
    {
        var now = () => DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

        // ═══════════════════════════════════════════════════════════
        // 台账条目
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/cost-ledger", (HttpContext ctx, IDbConnection db, long? projectId) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            // v1.1.0 P0-4 Phase 2: cost_ledger 表现在有 created_by (migration 014)
            var conditions = new List<string>();
            if (projectId.HasValue) conditions.Add("project_id=@ProjectId");
            conditions.Add(CurrentUser.UserFilterCompany());
            conditions.Add("deleted_at IS NULL");
            var sql = "SELECT * FROM cost_ledger WHERE " + string.Join(" AND ", conditions) + " ORDER BY date DESC";
            return Common.Ok(db.Query(sql, new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId }));
        });

        app.MapGet("/api/cost-ledger/summary", (HttpContext ctx, IDbConnection db, long? projectId) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            // v1.1.0 P0-4 Phase 2: cost_ledger 现在有 created_by
            var projectFilter = projectId.HasValue ? " AND project_id=@ProjectId" : "";
            var userFilter = $" AND {CurrentUser.UserFilterCompany()}";
            return Common.Ok(new
            {
                totalCount = db.ExecuteScalar<int>($"SELECT COUNT(*) FROM cost_ledger WHERE 1=1{projectFilter}{userFilter} AND deleted_at IS NULL", new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId }),
                totalExpense = db.ExecuteScalar<decimal>($"SELECT COALESCE(SUM(amount),0) FROM cost_ledger WHERE direction='expense'{projectFilter}{userFilter} AND deleted_at IS NULL", new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId }),
                totalIncome = db.ExecuteScalar<decimal>($"SELECT COALESCE(SUM(amount),0) FROM cost_ledger WHERE direction='income'{projectFilter}{userFilter} AND deleted_at IS NULL", new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId }),
            });
        });
        app.MapPost("/api/cost-ledger", async (HttpContext ctx, CostLedgerEntryDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO cost_ledger (project_id,batch_id,voucher_no,date,direction,category,amount,counterparty,channel,summary,notes,created_by,created_at,updated_at, last_modified_at) VALUES (@ProjectId,@BatchId,@VoucherNo,@Date,@Direction,@Category,@Amount,@Counterparty,@Channel,@Summary,@Notes,@CreatedBy,@Now,@Now, @Now);
                SELECT last_insert_rowid();",
                new { dto.ProjectId, dto.BatchId, dto.VoucherNo, dto.Date, dto.Direction, dto.Category,
                      dto.Amount, dto.Counterparty, dto.Channel, dto.Summary, dto.Notes, CreatedBy = uid, Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/cost-ledger", async (HttpContext ctx, CostLedgerEntryDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var affected = await db.ExecuteAsync(@"UPDATE cost_ledger SET voucher_no=@VoucherNo,date=@Date,direction=@Direction,category=@Category,
                amount=@Amount,counterparty=@Counterparty,channel=@Channel,summary=@Summary,notes=@Notes,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id",
                new { dto.VoucherNo, dto.Date, dto.Direction, dto.Category, dto.Amount,
                      dto.Counterparty, dto.Channel, dto.Summary, dto.Notes, Now = now(), dto.Id });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapDelete("/api/cost-ledger/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            return (await db.ExecuteAsync("UPDATE cost_ledger SET deleted_at=@Now WHERE id=@Id AND deleted_at IS NULL", new { Id = id, Now = now() })) > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapPost("/api/cost-ledger/batch", async (HttpContext ctx, List<CostLedgerEntryDto> entries, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var count = 0;
            foreach (var dto in entries)
            {
                await db.ExecuteAsync(@"INSERT INTO cost_ledger (project_id,voucher_no,date,direction,category,amount,counterparty,channel,summary,notes,created_by,created_at,updated_at, last_modified_at) VALUES (@ProjectId,@VoucherNo,@Date,@Direction,@Category,@Amount,@Counterparty,@Channel,@Summary,@Notes,@CreatedBy,@Now,@Now, @Now)",
                    new { dto.ProjectId, dto.VoucherNo, dto.Date, dto.Direction, dto.Category,
                          dto.Amount, dto.Counterparty, dto.Channel, dto.Summary, dto.Notes, CreatedBy = uid, Now = now() });
                count++;
            }
            return Common.Ok(new { count });
        });

        // ═══════════════════════════════════════════════════════════
        // 分类管理
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/cost-ledger/categories", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                var categories = db.Query("SELECT * FROM cost_ledger_categories").ToList();
                return Common.Ok(categories);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[CostLedger] categories 查询失败: {ex.Message}");
                return Common.Ok(new List<object>());
            }
        });

        app.MapPost("/api/cost-ledger/categories", async (HttpContext ctx, CostLedgerCategoryDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO cost_ledger_categories (name,direction,level1,color,created_at,updated_at)
                VALUES (@Name,@Direction,@Level1,@Color,@Now,@Now); SELECT last_insert_rowid();",
                new { dto.Name, dto.Direction, dto.Level1, dto.Color, Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/cost-ledger/categories", async (HttpContext ctx, CostLedgerCategoryDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var affected = await db.ExecuteAsync(@"UPDATE cost_ledger_categories SET name=@Name,direction=@Direction,level1=@Level1,color=@Color,updated_at=@Now WHERE id=@Id",
                new { dto.Name, dto.Direction, dto.Level1, dto.Color, Now = now(), dto.Id });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapDelete("/api/cost-ledger/categories/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            return (await db.ExecuteAsync("DELETE FROM cost_ledger_categories WHERE id=@Id", new { Id = id })) > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapPost("/api/cost-ledger/categories/reset", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            db.Execute("DELETE FROM cost_ledger_categories");
            return Common.Ok();
        });

        // ═══════════════════════════════════════════════════════════
        // 批次管理
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/cost-ledger/batches", (HttpContext ctx, IDbConnection db, long projectId) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            // v1.1.0 P0-4 Phase 2: cost_ledger_batches 现在有 created_by (migration 020), 完整 user-dim
            return Common.Ok(db.Query($"SELECT * FROM cost_ledger_batches WHERE project_id=@ProjectId AND {CurrentUser.UserFilterCompany()} ORDER BY created_at DESC", new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId }));
        });

        app.MapPost("/api/cost-ledger/batches", async (HttpContext ctx, CostLedgerBatchDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO cost_ledger_batches (project_id,name,created_by,created_at,updated_at, last_modified_at) VALUES (@ProjectId,@Name,@CreatedBy,@Now,@Now, @Now); SELECT last_insert_rowid();",
                new { dto.ProjectId, dto.Name, Now = now() });
            return Common.Ok(id);
        });

        app.MapPost("/api/cost-ledger/batches/{id}/copy", async (HttpContext ctx, long id, CostLedgerBatchDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var original = db.QueryFirstOrDefault("SELECT * FROM cost_ledger_batches WHERE id=@Id", new { Id = id });
            if (original == null) return Common.NotFound("批次不存在");
            var newId = await db.ExecuteScalarAsync<long>(@"INSERT INTO cost_ledger_batches (project_id,name,created_by,created_at,updated_at, last_modified_at) VALUES (@ProjectId,@Name,@CreatedBy,@Now,@Now, @Now); SELECT last_insert_rowid();",
                new { ProjectId = (long)original.project_id, Name = dto.NewName ?? "", Now = now() });
            return Common.Ok(new { id = newId });
        });

        app.MapPut("/api/cost-ledger/batches/{id}", async (HttpContext ctx, long id, CostLedgerBatchDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var affected = await db.ExecuteAsync("UPDATE cost_ledger_batches SET name=@Name,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id",
                new { Name = dto.NewName ?? "", Now = now(), Id = id });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapDelete("/api/cost-ledger/batches/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            return (await db.ExecuteAsync("DELETE FROM cost_ledger_batches WHERE id=@Id", new { Id = id })) > 0 ? Common.Ok() : Results.Forbid();
        });

        // ═══════════════════════════════════════════════════════════
        // 匹配规则
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/cost-ledger/match-rules", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            return Common.Ok(db.Query("SELECT * FROM cost_ledger_match_rules ORDER BY hit_count DESC"));
        });

        app.MapPost("/api/cost-ledger/match-rules", async (HttpContext ctx, CostLedgerMatchRuleDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            await db.ExecuteAsync(@"INSERT OR REPLACE INTO cost_ledger_match_rules (pattern,category,direction,priority,hit_count,created_at,updated_at)
                VALUES (@Pattern,@Category,@Direction,@Priority,COALESCE((SELECT hit_count FROM cost_ledger_match_rules WHERE pattern=@Pattern),0)+1,@Now,@Now)",
                new { dto.Pattern, dto.Category, dto.Direction, dto.Priority, Now = now() });
            return Common.Ok();
        });
    }
}

