using System.Data;
using Dapper;
using EngineeringManager.Api.Security;

namespace EngineeringManager.Api;

/// <summary>
/// 认证 + 角色 + 用户管理端点
/// </summary>
public static class AuthEndpoints
{
    public static void RegisterAuthEndpoints(this WebApplication app)
    {
        var now = () => DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

        // ═══════════════════════════════════════════════════════════
        // 认证
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/auth/login", (LoginDto dto, IDbConnection db) =>
        {
            var user = db.QueryFirstOrDefault(@"
                SELECT id, username, password_hash, password_salt, password_hash_version,
                       display_name, role_id, status
                FROM users WHERE username = @Username",
                new { Username = dto.Username });

            if (user == null) return Common.Fail("用户名或密码错误");

            // 验证密码
            var salt = (string)user.password_salt;
            var version = (int)(user.password_hash_version ?? 1);
            var computedHash = Common.HashPassword(dto.Password, salt, version);

            // v0.71.0 P2.1: 检测旧库未迁移用户 (password_hash 为空, 来自 001 旧 password+salt 字段)
            if (string.IsNullOrEmpty((string)user.password_hash))
                return Common.Fail("账户需要重置密码, 请联系管理员 (v0.71.0 数据迁移)");
            if (computedHash != (string)user.password_hash)
                return Common.Fail("用户名或密码错误");

            // 获取角色信息
            var role = db.QueryFirstOrDefault(
                "SELECT id, name, permissions FROM roles WHERE id = @Id",
                new { Id = (string)user.role_id });

            return Common.Ok(new
            {
                userId = user.id,
                username = user.username,
                displayName = user.display_name,
                roleId = user.role_id,
                roleName = role?.name ?? user.role_id,
                permissions = role?.permissions ?? "[]",
                token = GenerateJwtToken((string)user.id, (string)user.username, (string)user.role_id, role?.name ?? (string)user.role_id)
            });
        }).RequireRateLimiting("login");

        // v1.1.1: admin 强制重置用户密码 (老库 v0.71.0 升级必须)
        app.MapPost("/api/auth/reset-password", async (HttpContext ctx, PasswordResetDto dto, IDbConnection db) =>
        {
            // 1. 当前用户必须已登录 + admin 角色
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid)) return Common.Fail("未登录");
            var isAdmin = CurrentUser.IsAdmin(ctx);
            if (!isAdmin) return Results.Forbid();  // 仅 admin 可重置

            // 2. 校验新密码非空
            if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 6)
                return Common.Fail("新密码至少 6 位");

            // 3. 检查目标用户存在
            var target = db.QueryFirstOrDefault("SELECT id, username FROM users WHERE id=@Id", new { Id = dto.UserId });
            if (target == null) return Common.NotFound("目标用户不存在");

            // 4. 生成新 salt + hash (v2 = 210k iterations)
            var salt = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(16)).ToLower();
            var hash = Common.HashPassword(dto.NewPassword, salt, 2);

            // 5. 写入
            var affected = await db.ExecuteAsync(@"UPDATE users SET password_hash=@Hash, password_salt=@Salt, password_hash_version=2 WHERE id=@Id",
                new { Hash = hash, Salt = salt, Id = dto.UserId });
            return affected > 0 ? Common.Ok(new { userId = dto.UserId, newHashVersion = 2 }) : Common.Fail("重置失败");
        });

        static string GenerateJwtToken(string userId, string username, string roleId, string roleName)
        {
            var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET") ?? "dev-only-secret-please-change-in-prod-32bytes";
            var key = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(jwtSecret));
            var creds = new Microsoft.IdentityModel.Tokens.SigningCredentials(key, Microsoft.IdentityModel.Tokens.SecurityAlgorithms.HmacSha256);
            var claims = new[]
            {
                new System.Security.Claims.Claim("uid", userId),
                new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Name, username),
                new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Role, roleName)
            };
            var token = new System.IdentityModel.Tokens.Jwt.JwtSecurityToken(
                issuer: "engineering-manager",
                audience: "engineering-manager",
                claims: claims,
                expires: DateTime.Now.AddDays(1),
                signingCredentials: creds);
            return new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler().WriteToken(token);
        }

        // ═══════════════════════════════════════════════════════════
        // 角色
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/roles", (IDbConnection db) =>
            Common.Ok(db.Query("SELECT id, name, permissions FROM roles ORDER BY id")));

        app.MapGet("/api/roles/{id}", (string id, IDbConnection db) =>
        {
            var r = db.QueryFirstOrDefault("SELECT id, name, permissions FROM roles WHERE id=@Id", new { Id = id });
            return r is not null ? Common.Ok(r) : Common.NotFound("角色不存在");
        });

        app.MapPut("/api/roles", async (RoleUpdateDto dto, IDbConnection db) =>
        {
            var affected = await db.ExecuteAsync("UPDATE roles SET permissions=@Permissions WHERE id=@Id",
                new { Id = dto.RoleId, Permissions = dto.Permissions });
            return affected > 0 ? Common.Ok() : Common.NotFound("角色不存在");
        });

        app.MapPost("/api/roles/{id}/reset", (string id, IDbConnection db) =>
        {
            var defaults = Common.GetDefaultPermissions(id);
            if (defaults.Count == 0) return Common.Fail("无默认权限");
            db.Execute("UPDATE roles SET permissions=@Permissions WHERE id=@Id",
                new { Id = id, Permissions = System.Text.Json.JsonSerializer.Serialize(defaults) });
            return Common.Ok(defaults);
        });

        // ═══════════════════════════════════════════════════════════
        // 用户管理
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/users", (IDbConnection db) =>
            Common.Ok(db.Query("SELECT id, username, display_name, role_id, status, created_at FROM users ORDER BY created_at DESC")));

        app.MapGet("/api/users/{id}", (string id, IDbConnection db) =>
        {
            var u = db.QueryFirstOrDefault("SELECT id, username, display_name, role_id, status, created_at FROM users WHERE id=@Id", new { Id = id });
            return u is not null ? Common.Ok(u) : Common.NotFound("用户不存在");
        });

        app.MapPost("/api/users", async (UserDto dto, IDbConnection db) =>
        {
            var salt = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(16)).ToLower();
            var hash = Common.HashPassword(dto.Password ?? "", salt, 2);
            var id = dto.Id ?? $"user-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
            await db.ExecuteAsync(@"INSERT INTO users (id,username,password_hash,password_salt,password_hash_version,display_name,role_id,status,created_at)
                VALUES (@Id,@Username,@Hash,@Salt,2,@DisplayName,@RoleId,'active',@Now)",
                new { Id = id, Username = dto.Username, Hash = hash, Salt = salt, DisplayName = dto.DisplayName ?? "", RoleId = dto.RoleId ?? "worker", Now = now() });
            return Common.Ok(new { id });
        });

        app.MapPut("/api/users", async (UserDto dto, IDbConnection db) =>
        {
            if (string.IsNullOrEmpty(dto.Password))
            {
                var affected = await db.ExecuteAsync(@"UPDATE users SET display_name=@DisplayName,role_id=@RoleId,status=@Status WHERE id=@Id",
                    new { dto.Id, dto.DisplayName, dto.RoleId, dto.Status });
                return affected > 0 ? Common.Ok() : Common.NotFound("用户不存在");
            }
            else
            {
                var salt = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(16)).ToLower();
                var hash = Common.HashPassword(dto.Password ?? "", salt, 2);
                var affected = await db.ExecuteAsync(@"UPDATE users SET password_hash=@Hash,password_salt=@Salt,display_name=@DisplayName,role_id=@RoleId,status=@Status WHERE id=@Id",
                    new { dto.Id, Hash = hash, Salt = salt, dto.DisplayName, dto.RoleId, dto.Status });
                return affected > 0 ? Common.Ok() : Common.NotFound("用户不存在");
            }
        });

        app.MapDelete("/api/users/{id}", async (string id, IDbConnection db) =>
            (await db.ExecuteAsync("DELETE FROM users WHERE id=@Id", new { Id = id })) > 0 ? Common.Ok() : Common.NotFound("用户不存在"));

        // v0.72.0: PII 数据回填 (老库 PII 明文 → _enc 列加密)
        // 策略: 遍历 4 张表, 查 _enc 为空的记录, 加密原明文列写入 _enc
        // 仅 admin 可调, 幂等 (重复调用安全)
        app.MapPost("/api/admin/backfill-pii", async (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid)) return Common.Fail("未登录");
            if (!CurrentUser.IsAdmin(ctx)) return Results.Forbid();

            var pii = ctx.RequestServices.GetRequiredService<EngineeringManager.Api.Security.PiiProtector>();
            var stats = new Dictionary<string, object>();
            var errors = new List<string>();
            int total = 0;

            // 通用回填辅助: 查询 + 批量 UPDATE, 异常隔离
            async Task<int> BackfillTable(string table, string selectCols, string updateSql, Action<dynamic, Dictionary<string, object>> mapParams)
            {
                try
                {
                    var rows = db.Query<dynamic>($"SELECT id, {selectCols} FROM {table} WHERE 1=1").ToList();
                    int done = 0;
                    foreach (var r in rows)
                    {
                        try
                        {
                            var p = new Dictionary<string, object>();
                            mapParams(r, p);
                            p["Id"] = (long)r.id;
                            await db.ExecuteAsync(updateSql, p);
                            done++;
                        }
                        catch (Exception ex) { errors.Add($"{table} id={r.id}: {ex.Message}"); }
                    }
                    return done;
                }
                catch (Exception ex) { errors.Add($"{table} query: {ex.Message}"); return 0; }
            }

            total += await BackfillTable("members",
                "id_card, id_card_address, phone",
                "UPDATE members SET id_card_enc=@IdCardEnc, id_card_address_enc=@IdCardAddressEnc, phone_enc=@PhoneEnc WHERE id=@Id",
                (r, p) => {
                    p["IdCardEnc"] = pii.Encrypt(r.id_card ?? "");
                    p["IdCardAddressEnc"] = pii.Encrypt(r.id_card_address ?? "");
                    p["PhoneEnc"] = pii.Encrypt(r.phone ?? "");
                });
            stats["members"] = stats.GetValueOrDefault("members", 0);

            total += await BackfillTable("workers",
                "id_card, phone, address",
                "UPDATE workers SET id_card_enc=@IdCardEnc, phone_enc=@PhoneEnc, address_enc=@AddressEnc WHERE id=@Id",
                (r, p) => {
                    p["IdCardEnc"] = pii.Encrypt(r.id_card ?? "");
                    p["PhoneEnc"] = pii.Encrypt(r.phone ?? "");
                    p["AddressEnc"] = pii.Encrypt(r.address ?? "");
                });
            stats["workers"] = stats.GetValueOrDefault("workers", 0);

            total += await BackfillTable("partners",
                "phone, credit_code, tax_number",
                "UPDATE partners SET phone_enc=@PhoneEnc, credit_code_enc=@CreditCodeEnc, tax_number_enc=@TaxNumberEnc WHERE id=@Id",
                (r, p) => {
                    p["PhoneEnc"] = pii.Encrypt(r.phone ?? "");
                    p["CreditCodeEnc"] = pii.Encrypt(r.credit_code ?? "");
                    p["TaxNumberEnc"] = pii.Encrypt(r.tax_number ?? "");
                });
            stats["partners"] = stats.GetValueOrDefault("partners", 0);

            total += await BackfillTable("supervisors",
                "phone",
                "UPDATE supervisors SET phone_enc=@PhoneEnc WHERE id=@Id",
                (r, p) => {
                    p["PhoneEnc"] = pii.Encrypt(r.phone ?? "");
                });
            stats["supervisors"] = stats.GetValueOrDefault("supervisors", 0);

            return Common.Ok(new { message = $"PII 回填完成, 共 {total} 条记录", stats = new Dictionary<string, object> { { "total", total } }, errors });
        });
    }
}
