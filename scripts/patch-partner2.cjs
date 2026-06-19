const fs = require("fs")
const path = "EngineeringManager.Api/Endpoints/PartnerEndpoints.cs"
let c = fs.readFileSync(path, "utf8")

function readBlock(c, startMarker) {
  const startIdx = c.indexOf(startMarker)
  if (startIdx < 0) { console.log("NOT FOUND:", startMarker.slice(0, 50)); process.exit(1) }
  const endIdx = c.indexOf("        });", startIdx) + "        });".length
  return { start: startIdx, end: endIdx, block: c.slice(startIdx, endIdx) }
}

function replaceBlock(c, startMarker, newBlock) {
  const { start, end, block } = readBlock(c, startMarker)
  if (c.indexOf(block) < 0) { console.log("BLOCK NOT MATCH"); process.exit(1) }
  return c.slice(0, start) + newBlock + c.slice(end)
}

// 1. INSERT partners
c = replaceBlock(c, "        app.MapPost(\"/api/partners\", async (HttpContext ctx, PartnerDto dto, IDbConnection db) =>", `        app.MapPost("/api/partners", async (HttpContext ctx, PartnerDto dto, IDbConnection db) =>
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
        });`)
console.log("INSERT partners replaced")

// 2. UPDATE partners
c = replaceBlock(c, "        app.MapPut(\"/api/partners\", async (HttpContext ctx, PartnerDto dto, IDbConnection db) =>", `        app.MapPut("/api/partners", async (HttpContext ctx, PartnerDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var affected = await db.ExecuteAsync(@"UPDATE partners SET name=@Name,category=@Category,contact=@Contact,
                phone=@Phone,email=@Email,address=@Address,bank_account=@BankAccount,bank_name=@BankName,
                tax_number=@TaxNumber,credit_code=@CreditCode,registered_address=@RegisteredAddress,
                business_scope=@BusinessScope,tax_type=@TaxType,project_ids=@ProjectIds,updated_at=@Now WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { dto.Id, dto.Name, dto.Category, dto.Contact, dto.Phone, dto.Email, dto.Address,
                      dto.BankAccount, dto.BankName, dto.TaxNumber, dto.CreditCode, dto.RegisteredAddress,
                      dto.BusinessScope, dto.TaxType, ProjectIds = dto.ProjectIds ?? "[]", Now = now(),
                      Uid = uid, IsAdmin = isAdmin });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });`)
console.log("UPDATE partners replaced")

// 3. DELETE partners: 单行 DELETE, 找 `;\n` 然后空行
const start3 = c.indexOf("        app.MapDelete(\"/api/partners/{id}\"")
// 找下一个 ; 跟着 \n 然后 \n (空行)
const semi3 = c.indexOf(";\n", start3)
const end3 = semi3 + 1  // include ;
const old3 = c.slice(start3, end3)
console.log("old3 length:", old3.length)
const new3 = `        app.MapDelete("/api/partners/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            return (await db.ExecuteAsync("DELETE FROM partners WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });

`
c = c.slice(0, start3) + new3 + c.slice(end3)
console.log("DELETE partners replaced")

// 4. INSERT supervisors
c = replaceBlock(c, "        app.MapPost(\"/api/supervisors\", async (HttpContext ctx, SupervisorDto dto, IDbConnection db) =>", `        app.MapPost("/api/supervisors", async (HttpContext ctx, SupervisorDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO supervisors
                (region_id,name,category,contact,phone,address,project_ids,remarks,created_by,created_at,updated_at)
                VALUES (@RegionId,@Name,@Category,@Contact,@Phone,@Address,@ProjectIds,@Remarks,@CreatedBy,@Now,@Now);
                SELECT last_insert_rowid();",
                new { dto.RegionId, dto.Name, dto.Category, dto.Contact, dto.Phone, dto.Address,
                      ProjectIds = dto.ProjectIds, dto.Remarks, CreatedBy = uid, Now = now() });
            return Common.Ok(id);
        });`)
console.log("INSERT supervisors replaced")

// 5. UPDATE supervisors
c = replaceBlock(c, "        app.MapPut(\"/api/supervisors\", async (HttpContext ctx, SupervisorDto dto, IDbConnection db) =>", `        app.MapPut("/api/supervisors", async (HttpContext ctx, SupervisorDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var affected = await db.ExecuteAsync(@"UPDATE supervisors SET region_id=@RegionId,name=@Name,
                category=@Category,contact=@Contact,phone=@Phone,address=@Address,project_ids=@ProjectIds,
                remarks=@Remarks,updated_at=@Now WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { dto.Id, dto.RegionId, dto.Name, dto.Category, dto.Contact, dto.Phone, dto.Address,
                      ProjectIds = dto.ProjectIds, dto.Remarks, Now = now(),
                      Uid = uid, IsAdmin = isAdmin });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });`)
console.log("UPDATE supervisors replaced")

// 6. DELETE supervisors
const start6 = c.indexOf("        app.MapDelete(\"/api/supervisors/{id}\"")
const semi6 = c.indexOf(";\n", start6)
const end6 = semi6 + 1
const old6 = c.slice(start6, end6)
console.log("old6 length:", old6.length)
const new6 = `        app.MapDelete("/api/supervisors/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            return (await db.ExecuteAsync("DELETE FROM supervisors WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });

`
c = c.slice(0, start6) + new6 + c.slice(end6)
console.log("DELETE supervisors replaced")

fs.writeFileSync(path, c, "utf8")
console.log("6 partner endpoints SQL patched")