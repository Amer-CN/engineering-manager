using System.Data;
using Dapper;

namespace EngineeringManager.Api;

/// <summary>
/// 合同 + 合同模板 + 结算端点
/// </summary>
public static class ContractEndpoints
{
    public static void RegisterContractEndpoints(this WebApplication app)
    {
        var now = () => DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

        // ═══════════════════════════════════════════════════════════
        // 合同
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/contracts/income", (IDbConnection db, long? projectId) =>
        {
            var sql = "SELECT * FROM income_contracts";
            if (projectId.HasValue) sql += " WHERE project_id=@ProjectId";
            sql += " ORDER BY created_at DESC";
            return Common.Ok(db.Query(sql, new { ProjectId = projectId }));
        });

        app.MapGet("/api/contracts/expense", (IDbConnection db, long? projectId) =>
        {
            var sql = "SELECT * FROM expense_contracts";
            if (projectId.HasValue) sql += " WHERE project_id=@ProjectId";
            sql += " ORDER BY created_at DESC";
            return Common.Ok(db.Query(sql, new { ProjectId = projectId }));
        });

        app.MapGet("/api/contracts/agreement", (IDbConnection db, long? projectId) =>
        {
            var sql = "SELECT * FROM agreement_contracts";
            if (projectId.HasValue) sql += " WHERE project_id=@ProjectId";
            sql += " ORDER BY created_at DESC";
            return Common.Ok(db.Query(sql, new { ProjectId = projectId }));
        });

        app.MapGet("/api/contracts/stats", (IDbConnection db) => Common.Ok(new
        {
            incomeCount = db.ExecuteScalar<int>("SELECT COUNT(*) FROM income_contracts"),
            expenseCount = db.ExecuteScalar<int>("SELECT COUNT(*) FROM expense_contracts"),
            incomeTotal = db.ExecuteScalar<decimal>("SELECT COALESCE(SUM(amount),0) FROM income_contracts"),
            expenseTotal = db.ExecuteScalar<decimal>("SELECT COALESCE(SUM(amount),0) FROM expense_contracts"),
        }));

        app.MapPost("/api/contracts/income", async (dynamic dto, IDbConnection db) =>
        {
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO income_contracts
                (project_id,partner_id,contract_no,name,amount,signed_date,start_date,end_date,status,payment_method,remarks,created_at,updated_at)
                VALUES (@ProjectId,@PartnerId,@ContractNo,@Name,@Amount,@SignedDate,@StartDate,@EndDate,@Status,@PaymentMethod,@Remarks,@Now,@Now);
                SELECT last_insert_rowid();",
                new { Now = now() });
            return Common.Ok(id);
        });

        app.MapPost("/api/contracts/expense", async (dynamic dto, IDbConnection db) =>
        {
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO expense_contracts
                (project_id,partner_id,contract_no,name,amount,signed_date,start_date,end_date,status,payment_method,remarks,created_at,updated_at)
                VALUES (@ProjectId,@PartnerId,@ContractNo,@Name,@Amount,@SignedDate,@StartDate,@EndDate,@Status,@PaymentMethod,@Remarks,@Now,@Now);
                SELECT last_insert_rowid();",
                new { Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/contracts/income", async (dynamic dto, IDbConnection db) =>
        {
            var affected = await db.ExecuteAsync(@"UPDATE income_contracts SET name=@Name,amount=@Amount,status=@Status,remarks=@Remarks,updated_at=@Now WHERE id=@Id",
                new { Now = now() });
            return affected > 0 ? Common.Ok() : Common.Fail("合同不存在");
        });

        app.MapPut("/api/contracts/expense", async (dynamic dto, IDbConnection db) =>
        {
            var affected = await db.ExecuteAsync(@"UPDATE expense_contracts SET name=@Name,amount=@Amount,status=@Status,remarks=@Remarks,updated_at=@Now WHERE id=@Id",
                new { Now = now() });
            return affected > 0 ? Common.Ok() : Common.Fail("合同不存在");
        });

        app.MapDelete("/api/contracts/income/{id}", async (long id, IDbConnection db) =>
            (await db.ExecuteAsync("DELETE FROM income_contracts WHERE id=@Id", new { Id = id })) > 0 ? Common.Ok() : Common.Fail("合同不存在"));

        app.MapDelete("/api/contracts/expense/{id}", async (long id, IDbConnection db) =>
            (await db.ExecuteAsync("DELETE FROM expense_contracts WHERE id=@Id", new { Id = id })) > 0 ? Common.Ok() : Common.Fail("合同不存在"));

        // ═══════════════════════════════════════════════════════════
        // 合同模板
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/contract-templates", (IDbConnection db) =>
            Common.Ok(db.Query("SELECT * FROM contract_templates ORDER BY created_at DESC")));

        app.MapPost("/api/contract-templates", async (ContractTemplateDto dto, IDbConnection db) =>
        {
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO contract_templates
                (name,type,content,variables,created_at,updated_at)
                VALUES (@Name,@Type,@Content,@Variables,@Now,@Now); SELECT last_insert_rowid();",
                new { dto.Name, Type = dto.Type ?? "contract", dto.Content, dto.Variables, Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/contract-templates", async (dynamic dto, IDbConnection db) =>
        {
            var affected = await db.ExecuteAsync(@"UPDATE contract_templates SET name=@Name,type=@Type,content=@Content,variables=@Variables,updated_at=@Now WHERE id=@Id",
                new { Now = now() });
            return affected > 0 ? Common.Ok() : Common.Fail("模板不存在");
        });

        app.MapDelete("/api/contract-templates/{id}", async (long id, IDbConnection db) =>
            (await db.ExecuteAsync("DELETE FROM contract_templates WHERE id=@Id", new { Id = id })) > 0 ? Common.Ok() : Common.Fail("模板不存在"));

        // ═══════════════════════════════════════════════════════════
        // 结算
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/settlements", (IDbConnection db, long? projectId) =>
        {
            var sql = @"SELECT s.*, p.name as project_name
                        FROM settlements s LEFT JOIN projects p ON s.project_id=p.id";
            if (projectId.HasValue) sql += " WHERE s.project_id=@ProjectId";
            sql += " ORDER BY s.created_at DESC";
            return Common.Ok(db.Query(sql, new { ProjectId = projectId }));
        });

        app.MapPost("/api/settlements", async (dynamic dto, IDbConnection db) =>
        {
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO settlements
                (project_id,name,sub_type,status,settlement_no,amount,settler_id,remarks,created_at,updated_at)
                VALUES (@ProjectId,@Name,@SubType,'pending',@SettlementNo,@Amount,@SettlerId,@Remarks,@Now,@Now);
                SELECT last_insert_rowid();",
                new { Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/settlements", async (dynamic dto, IDbConnection db) =>
        {
            var affected = await db.ExecuteAsync(@"UPDATE settlements SET name=@Name,sub_type=@SubType,amount=@Amount,remarks=@Remarks,updated_at=@Now WHERE id=@Id",
                new { Now = now() });
            return affected > 0 ? Common.Ok() : Common.Fail("结算不存在");
        });

        app.MapDelete("/api/settlements/{id}", async (long id, IDbConnection db) =>
            (await db.ExecuteAsync("DELETE FROM settlements WHERE id=@Id", new { Id = id })) > 0 ? Common.Ok() : Common.Fail("结算不存在"));

        app.MapPut("/api/settlements/{id}/process", async (long id, IDbConnection db) =>
        {
            var affected = await db.ExecuteAsync(@"UPDATE settlements SET status='processed',updated_at=@Now WHERE id=@Id",
                new { Id = id, Now = now() });
            return affected > 0 ? Common.Ok() : Common.Fail("结算不存在");
        });

        app.MapPut("/api/settlements/{id}/unarchive", async (long id, IDbConnection db) =>
        {
            var affected = await db.ExecuteAsync(@"UPDATE settlements SET status='pending',updated_at=@Now WHERE id=@Id",
                new { Id = id, Now = now() });
            return affected > 0 ? Common.Ok() : Common.Fail("结算不存在");
        });
    }
}
