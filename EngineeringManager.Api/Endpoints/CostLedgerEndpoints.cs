using System.Data;
using Dapper;

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

        app.MapGet("/api/cost-ledger", (IDbConnection db, long? projectId) =>
        {
            var sql = "SELECT * FROM cost_ledger";
            if (projectId.HasValue) sql += " WHERE project_id=@ProjectId";
            sql += " ORDER BY date DESC";
            return Common.Ok(db.Query(sql, new { ProjectId = projectId }));
        });

        app.MapGet("/api/cost-ledger/summary", (IDbConnection db, long? projectId) =>
        {
            var w = projectId.HasValue ? " WHERE project_id=@ProjectId" : "";
            object param = projectId.HasValue ? new { ProjectId = projectId.Value } : new { };
            return Common.Ok(new
            {
                totalCount = db.ExecuteScalar<int>($"SELECT COUNT(*) FROM cost_ledger{w}", param),
                totalExpense = db.ExecuteScalar<decimal>($"SELECT COALESCE(SUM(amount),0) FROM cost_ledger{w} AND direction='expense'", param),
                totalIncome = db.ExecuteScalar<decimal>($"SELECT COALESCE(SUM(amount),0) FROM cost_ledger{w} AND direction='income'", param),
            });
        });

        app.MapPost("/api/cost-ledger", async (CostLedgerEntryDto dto, IDbConnection db) =>
        {
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO cost_ledger
                (project_id,batch_id,voucher_no,date,direction,category,amount,counterparty,channel,summary,notes,created_at,updated_at)
                VALUES (@ProjectId,@BatchId,@VoucherNo,@Date,@Direction,@Category,@Amount,@Counterparty,@Channel,@Summary,@Notes,@Now,@Now);
                SELECT last_insert_rowid();",
                new { dto.ProjectId, dto.BatchId, dto.VoucherNo, dto.Date, dto.Direction, dto.Category,
                      dto.Amount, dto.Counterparty, dto.Channel, dto.Summary, dto.Notes, Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/cost-ledger", async (CostLedgerEntryDto dto, IDbConnection db) =>
        {
            var affected = await db.ExecuteAsync(@"UPDATE cost_ledger SET voucher_no=@VoucherNo,date=@Date,direction=@Direction,category=@Category,
                amount=@Amount,counterparty=@Counterparty,channel=@Channel,summary=@Summary,notes=@Notes,updated_at=@Now WHERE id=@Id",
                new { dto.VoucherNo, dto.Date, dto.Direction, dto.Category, dto.Amount,
                      dto.Counterparty, dto.Channel, dto.Summary, dto.Notes, Now = now(), dto.Id });
            return affected > 0 ? Common.Ok() : Common.NotFound("记录不存在");
        });

        app.MapDelete("/api/cost-ledger/{id}", async (long id, IDbConnection db) =>
            (await db.ExecuteAsync("DELETE FROM cost_ledger WHERE id=@Id", new { Id = id })) > 0 ? Common.Ok() : Common.NotFound("记录不存在"));

        app.MapPost("/api/cost-ledger/batch", async (List<CostLedgerEntryDto> entries, IDbConnection db) =>
        {
            var count = 0;
            foreach (var dto in entries)
            {
                await db.ExecuteAsync(@"INSERT INTO cost_ledger (project_id,voucher_no,date,direction,category,amount,counterparty,channel,summary,notes,created_at,updated_at)
                    VALUES (@ProjectId,@VoucherNo,@Date,@Direction,@Category,@Amount,@Counterparty,@Channel,@Summary,@Notes,@Now,@Now)",
                    new { dto.ProjectId, dto.VoucherNo, dto.Date, dto.Direction, dto.Category,
                          dto.Amount, dto.Counterparty, dto.Channel, dto.Summary, dto.Notes, Now = now() });
                count++;
            }
            return Common.Ok(new { count });
        });

        // ═══════════════════════════════════════════════════════════
        // 分类管理
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/cost-ledger/categories", (IDbConnection db) =>
        {
            try
            {
                // 尝试查询，如果表结构不匹配则返回空
                var categories = db.Query("SELECT * FROM cost_ledger_categories").ToList();
                return Common.Ok(categories);
            }
            catch
            {
                // 表结构不兼容，返回空列表
                return Common.Ok(new List<object>());
            }
        });

        app.MapPost("/api/cost-ledger/categories", async (CostLedgerCategoryDto dto, IDbConnection db) =>
        {
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO cost_ledger_categories (name,direction,level1,color,created_at,updated_at)
                VALUES (@Name,@Direction,@Level1,@Color,@Now,@Now); SELECT last_insert_rowid();",
                new { dto.Name, dto.Direction, dto.Level1, dto.Color, Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/cost-ledger/categories", async (CostLedgerCategoryDto dto, IDbConnection db) =>
        {
            var affected = await db.ExecuteAsync(@"UPDATE cost_ledger_categories SET name=@Name,direction=@Direction,level1=@Level1,color=@Color,updated_at=@Now WHERE id=@Id",
                new { dto.Name, dto.Direction, dto.Level1, dto.Color, Now = now(), dto.Id });
            return affected > 0 ? Common.Ok() : Common.NotFound("分类不存在");
        });

        app.MapDelete("/api/cost-ledger/categories/{id}", async (long id, IDbConnection db) =>
            (await db.ExecuteAsync("DELETE FROM cost_ledger_categories WHERE id=@Id", new { Id = id })) > 0 ? Common.Ok() : Common.NotFound("分类不存在"));

        app.MapPost("/api/cost-ledger/categories/reset", (IDbConnection db) =>
        {
            db.Execute("DELETE FROM cost_ledger_categories");
            return Common.Ok();
        });

        // ═══════════════════════════════════════════════════════════
        // 批次管理
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/cost-ledger/batches", (IDbConnection db, long projectId) =>
            Common.Ok(db.Query("SELECT * FROM cost_ledger_batches WHERE project_id=@ProjectId ORDER BY created_at DESC", new { ProjectId = projectId })));

        app.MapPost("/api/cost-ledger/batches", async (CostLedgerBatchDto dto, IDbConnection db) =>
        {
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO cost_ledger_batches (project_id,name,created_at,updated_at)
                VALUES (@ProjectId,@Name,@Now,@Now); SELECT last_insert_rowid();",
                new { dto.ProjectId, dto.Name, Now = now() });
            return Common.Ok(id);
        });

        app.MapPost("/api/cost-ledger/batches/{id}/copy", async (long id, CostLedgerBatchDto dto, IDbConnection db) =>
        {
            var original = db.QueryFirstOrDefault("SELECT * FROM cost_ledger_batches WHERE id=@Id", new { Id = id });
            if (original == null) return Common.NotFound("批次不存在");
            var newId = await db.ExecuteScalarAsync<long>(@"INSERT INTO cost_ledger_batches (project_id,name,created_at,updated_at)
                VALUES (@ProjectId,@Name,@Now,@Now); SELECT last_insert_rowid();",
                new { ProjectId = (long)original.project_id, Name = dto.NewName ?? "", Now = now() });
            return Common.Ok(new { id = newId });
        });

        app.MapPut("/api/cost-ledger/batches/{id}", async (long id, CostLedgerBatchDto dto, IDbConnection db) =>
        {
            var affected = await db.ExecuteAsync("UPDATE cost_ledger_batches SET name=@Name,updated_at=@Now WHERE id=@Id",
                new { Name = dto.NewName ?? "", Now = now(), Id = id });
            return affected > 0 ? Common.Ok() : Common.NotFound("批次不存在");
        });

        app.MapDelete("/api/cost-ledger/batches/{id}", async (long id, IDbConnection db) =>
            (await db.ExecuteAsync("DELETE FROM cost_ledger_batches WHERE id=@Id", new { Id = id })) > 0 ? Common.Ok() : Common.NotFound("批次不存在"));

        // ═══════════════════════════════════════════════════════════
        // 匹配规则
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/cost-ledger/match-rules", (IDbConnection db) =>
            Common.Ok(db.Query("SELECT * FROM cost_ledger_match_rules ORDER BY hit_count DESC")));

        app.MapPost("/api/cost-ledger/match-rules", async (CostLedgerMatchRuleDto dto, IDbConnection db) =>
        {
            await db.ExecuteAsync(@"INSERT OR REPLACE INTO cost_ledger_match_rules (pattern,category,direction,priority,hit_count,created_at,updated_at)
                VALUES (@Pattern,@Category,@Direction,@Priority,COALESCE((SELECT hit_count FROM cost_ledger_match_rules WHERE pattern=@Pattern),0)+1,@Now,@Now)",
                new { dto.Pattern, dto.Category, dto.Direction, dto.Priority, Now = now() });
            return Common.Ok();
        });
    }
}
