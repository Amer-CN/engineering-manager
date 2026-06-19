const fs = require("fs")
const path = "E:\\测试\\EngineeringManager.Api\\Endpoints\\PartnerEndpoints.cs"
let c = fs.readFileSync(path, "utf8")

function replaceOnce(c, oldStr, newStr) {
  const idx = c.indexOf(oldStr)
  if (idx < 0) { console.log("NOT FOUND:", oldStr.slice(0, 60).replace(/\n/g, "\\n")); return null }
  return c.slice(0, idx) + newStr + c.slice(idx + oldStr.length)
}

// 1. INSERT partners
const oldInsertPartners = `        app.MapPost("/api/partners", async (HttpContext ctx, PartnerDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO partners
                (name,category,contact,phone,email,address,bank_account,bank_name,tax_number,credit_code,
                 registered_address,business_scope,tax_type,project_ids,created_at,updated_at)
                VALUES (@Name,@Category,@Contact,@Phone,@Email,@Address,@BankAccount,@BankName,@TaxNumber,
                        @CreditCode,@RegisteredAddress,@BusinessScope,@TaxType,@ProjectIds,@Now,@Now);
                SELECT last_insert_rowid();",
                new { dto.Name, dto.Category, dto.Contact, dto.Phone, dto.Email, dto.Address,
                      dto.BankAccount, dto.BankName, dto.TaxNumber, dto.CreditCode, dto.RegisteredAddress,
                      dto.BusinessScope, dto.TaxType, ProjectIds = dto.ProjectIds ?? "[]", Now = now() });
            return Common.Ok(id);
        });`
const newInsertPartners = `        app.MapPost("/api/partners", async (HttpContext ctx, PartnerDto dto, IDbConnection db) =>
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
        });`
const r1 = replaceOnce(c, oldInsertPartners, newInsertPartners)
if (!r1) process.exit(1)
c = r1
console.log("INSERT partners: OK")

// 2. UPDATE partners
const oldUpdatePartners = `        app.MapPut("/api/partners", async (HttpContext ctx, PartnerDto dto, IDbConnection db) =>
        {
            var affected = await db.ExecuteAsync(@"UPDATE partners SET name=@Name,category=@Category,contact=@Contact,
                phone=@Phone,email=@Email,address=@Address,bank_account=@BankAccount,bank_name=@BankName,
                tax_number=@TaxNumber,credit_code=@CreditCode,registered_address=@RegisteredAddress,
                business_scope=@BusinessScope,tax_type=@TaxType,project_ids=@ProjectIds,updated_at=@Now WHERE id=@Id",
                new { dto.Id, dto.Name, dto.Category, dto.Contact, dto.Phone, dto.Email, dto.Address,
                      dto.BankAccount, dto.BankName, dto.TaxNumber, dto.CreditCode, dto.RegisteredAddress,
                      dto.BusinessScope, dto.TaxType, ProjectIds = dto.ProjectIds ?? "[]", Now = now() });
            return affected > 0 ? Common.Ok() : Common.NotFound("合作伙伴不存在");
        });`
const newUpdatePartners = `        app.MapPut("/api/partners", async (HttpContext ctx, PartnerDto dto, IDbConnection db) =>
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
        });`
const r2 = replaceOnce(c, oldUpdatePartners, newUpdatePartners)
if (!r2) process.exit(1)
c = r2
console.log("UPDATE partners: OK")

// 3. DELETE partners
const oldDeletePartners = `        app.MapDelete("/api/partners/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
            (await db.ExecuteAsync("DELETE FROM partners WHERE id=@Id", new { Id = id })) > 0 ? Common.Ok() : Common.NotFound("合作伙伴不存在"));`
const newDeletePartners = `        app.MapDelete("/api/partners/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            return (await db.ExecuteAsync("DELETE FROM partners WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });`
const r3 = replaceOnce(c, oldDeletePartners, newDeletePartners)
if (!r3) process.exit(1)
c = r3
console.log("DELETE partners: OK")

// 4. INSERT supervisors
const oldInsertSup = `        app.MapPost("/api/supervisors", async (HttpContext ctx, SupervisorDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO supervisors
                (region_id,name,category,contact,phone,address,project_ids,remarks,created_at,updated_at)
                VALUES (@RegionId,@Name,@Category,@Contact,@Phone,@Address,@ProjectIds,@Remarks,@Now,@Now);
                SELECT last_insert_rowid();",
                new { dto.RegionId, dto.Name, dto.Category, dto.Contact, dto.Phone, dto.Address,
                      ProjectIds = dto.ProjectIds, dto.Remarks, Now = now() });
            return Common.Ok(id);
        });`
const newInsertSup = `        app.MapPost("/api/supervisors", async (HttpContext ctx, SupervisorDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO supervisors
                (region_id,name,category,contact,phone,address,project_ids,remarks,created_by,created_at,updated_at)
                VALUES (@RegionId,@Name,@Category,@Contact,@Phone,@Address,@ProjectIds,@Remarks,@CreatedBy,@Now,@Now);
                SELECT last_insert_rowid();",
                new { dto.RegionId, dto.Name, dto.Category, dto.Contact, dto.Phone, dto.Address,
                      ProjectIds = dto.ProjectIds, dto.Remarks, CreatedBy = uid, Now = now() });
            return Common.Ok(id);
        });`
const r4 = replaceOnce(c, oldInsertSup, newInsertSup)
if (!r4) process.exit(1)
c = r4
console.log("INSERT supervisors: OK")

// 5. UPDATE supervisors
const oldUpdateSup = `        app.MapPut("/api/supervisors", async (HttpContext ctx, SupervisorDto dto, IDbConnection db) =>
        {
            var affected = await db.ExecuteAsync(@"UPDATE supervisors SET region_id=@RegionId,name=@Name,
                category=@Category,contact=@Contact,phone=@Phone,address=@Address,project_ids=@ProjectIds,
                remarks=@Remarks,updated_at=@Now WHERE id=@Id",
                new { dto.Id, dto.RegionId, dto.Name, dto.Category, dto.Contact, dto.Phone, dto.Address,
                      ProjectIds = dto.ProjectIds, dto.Remarks, Now = now() });
            return affected > 0 ? Common.Ok() : Common.NotFound("监管单位不存在");
        });`
const newUpdateSup = `        app.MapPut("/api/supervisors", async (HttpContext ctx, SupervisorDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var affected = await db.ExecuteAsync(@"UPDATE supervisors SET region_id=@RegionId,name=@Name,
                category=@Category,contact=@Contact,phone=@Phone,address=@Address,project_ids=@ProjectIds,
                remarks=@Remarks,updated_at=@Now WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { dto.Id, dto.RegionId, dto.Name, dto.Category, dto.Contact, dto.Phone, dto.Address,
                      ProjectIds = dto.ProjectIds, dto.Remarks, Uid = uid, IsAdmin = isAdmin, Now = now() });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });`
const r5 = replaceOnce(c, oldUpdateSup, newUpdateSup)
if (!r5) process.exit(1)
c = r5
console.log("UPDATE supervisors: OK")

// 6. DELETE supervisors
const oldDeleteSup = `        app.MapDelete("/api/supervisors/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
            (await db.ExecuteAsync("DELETE FROM supervisors WHERE id=@Id", new { Id = id })) > 0 ? Common.Ok() : Common.NotFound("监管单位不存在"));`
const newDeleteSup = `        app.MapDelete("/api/supervisors/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            return (await db.ExecuteAsync("DELETE FROM supervisors WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });`
const r6 = replaceOnce(c, oldDeleteSup, newDeleteSup)
if (!r6) process.exit(1)
c = r6
console.log("DELETE supervisors: OK")

fs.writeFileSync(path, c)
console.log("PartnerEndpoints.cs: ALL 6 PATCHES APPLIED")
