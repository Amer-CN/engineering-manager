using System.Data;
using Dapper;
using EngineeringManager.Api.Security;

namespace EngineeringManager.Api;

/// <summary>
/// 合作伙伴 + 监管单位端点
/// </summary>
public static class PartnerEndpoints
{
    public static void RegisterPartnerEndpoints(this WebApplication app)
    {
        var now = () => DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

        // ═══════════════════════════════════════════════════════════
        // 合作伙伴
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/partners", (HttpContext ctx, IDbConnection db) =>
            Common.Ok(db.Query("SELECT * FROM partners ORDER BY name")));

        app.MapPost("/api/partners", async (HttpContext ctx, PartnerDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO partners
                (name,category,contact,phone,email,address,bank_account,bank_name,tax_number,credit_code,
                 registered_address,business_scope,tax_type,project_ids,created_by,created_at,updated_at)
                VALUES (@Name,@Category,@Contact,@Phone,@Email,@Address,@BankAccount,@BankName,@TaxNumber,
                        @CreditCode,@RegisteredAddress,@BusinessScope,@TaxType,@ProjectIds,@CreatedBy,@Now,@Now);
                SELECT last_insert_rowid();",
                new { dto.Name, dto.Category, dto.Contact, dto.Phone, dto.Email, dto.Address,
                      dto.BankAccount, dto.BankName, dto.TaxNumber, dto.CreditCode, dto.RegisteredAddress,
                      dto.BusinessScope, dto.TaxType, ProjectIds = dto.ProjectIds ?? "[]", CreatedBy = uid, Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/partners", async (HttpContext ctx, PartnerDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var affected = await db.ExecuteAsync(@"UPDATE partners SET name=@Name,category=@Category,contact=@Contact,
                phone=@Phone,email=@Email,address=@Address,bank_account=@BankAccount,bank_name=@BankName,
                tax_number=@TaxNumber,credit_code=@CreditCode,registered_address=@RegisteredAddress,
                business_scope=@BusinessScope,tax_type=@TaxType,project_ids=@ProjectIds,updated_at=@Now WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { dto.Id, dto.Name, dto.Category, dto.Contact, dto.Phone, dto.Email, dto.Address,
                      dto.BankAccount, dto.BankName, dto.TaxNumber, dto.CreditCode, dto.RegisteredAddress,
                      dto.BusinessScope, dto.TaxType, ProjectIds = dto.ProjectIds ?? "[]", Uid = uid, IsAdmin = isAdmin, Now = now() });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapDelete("/api/partners/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            return (await db.ExecuteAsync("DELETE FROM partners WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });

        // ═══════════════════════════════════════════════════════════
        // 监管单位
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/supervisors", (HttpContext ctx, IDbConnection db) =>
            Common.Ok(db.Query(@"SELECT s.*, CASE WHEN r.province IS NOT NULL THEN r.province||'-'||r.city||'-'||r.district ELSE '' END as region_name
                          FROM supervisors s LEFT JOIN regions r ON s.region_id=r.id ORDER BY s.created_at DESC")));

        app.MapPost("/api/supervisors", async (HttpContext ctx, SupervisorDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO supervisors
                (region_id,name,category,contact,phone,address,project_ids,remarks,created_by,created_at,updated_at)
                VALUES (@RegionId,@Name,@Category,@Contact,@Phone,@Address,@ProjectIds,@Remarks,@CreatedBy,@Now,@Now);
                SELECT last_insert_rowid();",
                new { dto.RegionId, dto.Name, dto.Category, dto.Contact, dto.Phone, dto.Address,
                      ProjectIds = dto.ProjectIds, dto.Remarks, CreatedBy = uid, Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/supervisors", async (HttpContext ctx, SupervisorDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var affected = await db.ExecuteAsync(@"UPDATE supervisors SET region_id=@RegionId,name=@Name,
                category=@Category,contact=@Contact,phone=@Phone,address=@Address,project_ids=@ProjectIds,
                remarks=@Remarks,updated_at=@Now WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { dto.Id, dto.RegionId, dto.Name, dto.Category, dto.Contact, dto.Phone, dto.Address,
                      ProjectIds = dto.ProjectIds, dto.Remarks, Uid = uid, IsAdmin = isAdmin, Now = now() });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapDelete("/api/supervisors/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            return (await db.ExecuteAsync("DELETE FROM supervisors WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });
    }
}
