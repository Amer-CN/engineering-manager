using System.Data;
using Dapper;
using EngineeringManager.Api.Security;

namespace EngineeringManager.Api;

/// <summary>
/// 费用端点：项目费用 CRUD
/// </summary>
public static class ExpenseEndpoints
{
    public static void RegisterExpenseEndpoints(this WebApplication app)
    {
        app.MapGet("/api/expenses", (HttpContext ctx, IDbConnection db, long? projectId) =>
        {
            var sql = "SELECT * FROM expenses";
            if (projectId.HasValue) sql += " WHERE project_id=@ProjectId";
            sql += " ORDER BY created_at DESC";
            return Common.Ok(db.Query(sql, new { ProjectId = projectId }));
        });

        app.MapPost("/api/expenses", async (HttpContext ctx, ExpenseDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO expenses
                (project_id,category,amount,date,description,vendor,receipt_url,created_by,created_at,updated_at)
                VALUES (@ProjectId,@Category,@Amount,@Date,@Description,@Vendor,@ReceiptUrl,@CreatedBy,@Now,@Now);
                SELECT last_insert_rowid();",
                new { dto.ProjectId, dto.Category, dto.Amount, dto.Date, dto.Description, dto.Vendor, dto.ReceiptUrl, CreatedBy = uid, Now = Common.NowString() });
            return Common.Ok(id);
        });

        app.MapDelete("/api/expenses/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            return (await db.ExecuteAsync("DELETE FROM expenses WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });
    }
}
