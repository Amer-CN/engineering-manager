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
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var rows = db.Query("SELECT * FROM partners ORDER BY name").ToList();
            // P0-3-A: API 响应层 PII 脱敏
            var masked = rows.Select(p => new
            {
                id = p.id, name = p.name, category = p.category, contact = p.contact,
                address = p.address, bank_name = p.bank_name, tax_type = p.project_ids, project_ids = p.project_ids,
                created_at = p.created_at, updated_at = p.updated_at,
                phone = Common.MaskPhone(p.phone as string),
                email = p.email,
                bank_account = Common.MaskBankAccount(p.bank_account as string),
                tax_number = Common.MaskBankAccount(p.tax_number as string),
                credit_code = Common.MaskBankAccount(p.credit_code as string),
                registered_address = p.registered_address, business_scope = p.business_scope
            });
            return Common.Ok(masked);
        });

                app.MapPost("/api/partners", async (HttpContext ctx, PartnerDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // v1.2.0: PII 字段加密
            var pii = ctx.RequestServices.GetRequiredService<EngineeringManager.Api.Security.PiiProtector>();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO partners
                (name,category,contact,phone,email,address,bank_account,bank_name,tax_number,credit_code,
                 registered_address,business_scope,tax_type,project_ids,created_by,created_at,
                 phone_enc,bank_account_enc,credit_code_enc,tax_number_enc)
                VALUES (@Name,@Category,@Contact,@Phone,@Email,@Address,@BankAccount,@BankName,@TaxNumber,@CreditCode,
                        @RegisteredAddress,@BusinessScope,@TaxType,@ProjectIds,@CreatedBy,@Now,
                        @PhoneEnc,@BankAccountEnc,@CreditCodeEnc,@TaxNumberEnc);
                SELECT last_insert_rowid();",
                new { dto.Name, dto.Category, dto.Contact, dto.Phone, dto.Email, dto.Address, dto.BankAccount,
                      dto.BankName, dto.TaxNumber, dto.CreditCode, dto.RegisteredAddress,
                      dto.BusinessScope, dto.TaxType, ProjectIds = dto.ProjectIds ?? "[]", CreatedBy = uid, Now = now(),
                      PhoneEnc = pii.Encrypt(dto.Phone ?? ""), BankAccountEnc = pii.Encrypt(dto.BankAccount ?? ""),
                      CreditCodeEnc = pii.Encrypt(dto.CreditCode ?? ""), TaxNumberEnc = pii.Encrypt(dto.TaxNumber ?? "") });
            return Common.Ok(id);
        });
                app.MapPut("/api/partners", async (HttpContext ctx, PartnerDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            // v1.2.0: PII 字段加密
            var pii = ctx.RequestServices.GetRequiredService<EngineeringManager.Api.Security.PiiProtector>();
            var affected = await db.ExecuteAsync(@"UPDATE partners SET name=@Name,category=@Category,contact=@Contact,
                phone=@Phone,email=@Email,address=@Address,bank_account=@BankAccount,bank_name=@BankName,
                tax_number=@TaxNumber,credit_code=@CreditCode,registered_address=@RegisteredAddress,
                business_scope=@BusinessScope,tax_type=@TaxType,project_ids=@ProjectIds,updated_at=@Now,
                phone_enc=@PhoneEnc,bank_account_enc=@BankAccountEnc,credit_code_enc=@CreditCodeEnc,tax_number_enc=@TaxNumberEnc
                WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { dto.Id, dto.Name, dto.Category, dto.Contact, dto.Phone, dto.Email, dto.Address,
                      dto.BankAccount, dto.BankName, dto.TaxNumber, dto.CreditCode, dto.RegisteredAddress,
                      dto.BusinessScope, dto.TaxType, ProjectIds = dto.ProjectIds ?? "[]", Now = now(),
                      Uid = uid, IsAdmin = isAdmin,
                      PhoneEnc = pii.Encrypt(dto.Phone ?? ""), BankAccountEnc = pii.Encrypt(dto.BankAccount ?? ""),
                      CreditCodeEnc = pii.Encrypt(dto.CreditCode ?? ""), TaxNumberEnc = pii.Encrypt(dto.TaxNumber ?? "") });
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
            // v1.2.0: phone 字段加密
            var pii = ctx.RequestServices.GetRequiredService<EngineeringManager.Api.Security.PiiProtector>();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO supervisors
                (region_id,name,category,contact,phone,address,project_ids,remarks,created_by,created_at,
                 phone_enc)
                VALUES (@RegionId,@Name,@Category,@Contact,@Phone,@Address,@ProjectIds,@Remarks,@CreatedBy,@Now,
                        @PhoneEnc);
                SELECT last_insert_rowid();",
                new { dto.RegionId, dto.Name, dto.Category, dto.Contact, dto.Phone, dto.Address,
                      ProjectIds = dto.ProjectIds, dto.Remarks, CreatedBy = uid, Now = now(),
                      PhoneEnc = pii.Encrypt(dto.Phone ?? "") });
            return Common.Ok(id);
        });
                app.MapPut("/api/supervisors", async (HttpContext ctx, SupervisorDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            // v1.2.0: phone 字段加密
            var pii = ctx.RequestServices.GetRequiredService<EngineeringManager.Api.Security.PiiProtector>();
            var affected = await db.ExecuteAsync(@"UPDATE supervisors SET region_id=@RegionId,name=@Name,
                category=@Category,contact=@Contact,phone=@Phone,address=@Address,project_ids=@ProjectIds,
                remarks=@Remarks,updated_at=@Now,phone_enc=@PhoneEnc
                WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { dto.Id, dto.RegionId, dto.Name, dto.Category, dto.Contact, dto.Phone, dto.Address,
                      ProjectIds = dto.ProjectIds, dto.Remarks, Now = now(), Uid = uid, IsAdmin = isAdmin,
                      PhoneEnc = pii.Encrypt(dto.Phone ?? "") });
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
