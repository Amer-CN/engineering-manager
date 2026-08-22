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
                       display_name, role_id, status, is_default_password
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

            // P0-5: 停用账户禁止登录 (status 为空/NULL 视为 active, 防误伤老库空值用户)
            var status = user.status as string;
            if (!string.IsNullOrEmpty(status) && status != "active")
                return Common.Fail("账户已被停用，请联系管理员");

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
                passwordIsDefault = ((int)(user.is_default_password ?? 0)) == 1,
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
            // 不变量: 任何写入 password_hash 的 UPDATE 必须同时 is_default_password=0
            var affected = await db.ExecuteAsync(@"UPDATE users SET password_hash=@Hash, password_salt=@Salt, password_hash_version=2, is_default_password=0 WHERE id=@Id",
                new { Hash = hash, Salt = salt, Id = dto.UserId });
            return affected > 0 ? Common.Ok(new { userId = dto.UserId, newHashVersion = 2 }) : Common.Fail("重置失败");
        });

        // v0.83.0: 用户自助修改密码 (校验旧密码 + JWT uid, 任意角色可改自己的密码)
        app.MapPost("/api/auth/change-password", async (HttpContext ctx, ChangePasswordDto dto, IDbConnection db) =>
        {
            // 1. 必须已登录 — uid 取自 JWT, 绝不信任客户端传入的身份 (P1-4)
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid)) return Common.Fail("未登录", 401);

            // 2. 校验新密码 (与 reset-password 一致: 非空且 >= 6 位)
            if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 6)
                return Common.Fail("新密码至少 6 位");

            try
            {
                // 3. 取当前用户
                var user = db.QueryFirstOrDefault(
                    "SELECT id, username, password_hash, password_salt, password_hash_version FROM users WHERE id=@Id",
                    new { Id = uid });
                if (user == null) return Common.NotFound("用户不存在");

                var salt = (string)user.password_salt;
                var version = (int)(user.password_hash_version ?? 1);
                var storedHash = (string)(user.password_hash ?? "");
                if (string.IsNullOrEmpty(storedHash))
                    return Common.Fail("账户需要重置密码, 请联系管理员");

                // 4. 校验旧密码 — P1-5: 固定时间比较防时序攻击
                var oldHash = Common.HashPassword(dto.OldPassword ?? "", salt, version);
                var match = System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(
                    System.Text.Encoding.UTF8.GetBytes(oldHash),
                    System.Text.Encoding.UTF8.GetBytes(storedHash));
                if (!match) return Common.Fail("原密码不正确");

                // 5. 生成新 salt + hash (version=2). 不变量: 写 password_hash 必同置 is_default_password=0
                var newSalt = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(16)).ToLower();
                var newHash = Common.HashPassword(dto.NewPassword, newSalt, 2);
                var affected = await db.ExecuteAsync(
                    "UPDATE users SET password_hash=@Hash, password_salt=@Salt, password_hash_version=2, is_default_password=0 WHERE id=@Id",
                    new { Hash = newHash, Salt = newSalt, Id = uid });
                if (affected == 0) return Common.Fail("修改失败");

                // 6. 写审计日志 — user_id 取自 JWT (P1-4); 失败不影响主流程
                try
                {
                    await db.ExecuteAsync(@"INSERT INTO audit_logs
                        (action, level, user_id, user_name, resource, resource_id, details, ip_address, created_at)
                        VALUES (@Action, @Level, @UserId, @UserName, @Resource, @ResourceId, @Details, @IpAddress, @CreatedAt)",
                        new
                        {
                            Action = "update",
                            Level = "warning",
                            UserId = uid,
                            UserName = (string)(user.username ?? uid),
                            Resource = "users",
                            ResourceId = uid,
                            Details = "{\"event\":\"self_change_password\"}",
                            IpAddress = ctx.Connection.RemoteIpAddress?.ToString() ?? "",
                            CreatedAt = Common.NowString()
                        });
                }
                catch (Exception auditEx)
                {
                    Console.Error.WriteLine($"[ChangePassword] 审计日志写入失败: {auditEx.Message}");
                }

                return Common.Ok(new { changed = true });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[ChangePassword] error: {ex.Message}");
                return Common.Fail($"修改密码失败: {Common.Sanitize(ex.Message)}");
            }
        }).RequireRateLimiting("write");

        static string GenerateJwtToken(string userId, string username, string roleId, string roleName)
        {
            var jwtSecret = JwtSecretProvider.GetOrCreate();
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
        {
            if (!EditionFeatures.Has(EditionFeatures.RoleManagement)) return Results.NotFound();
            return Common.Ok(db.Query("SELECT id, name, permissions FROM roles ORDER BY id"));
        });

        app.MapGet("/api/roles/{id}", (string id, IDbConnection db) =>
        {
            if (!EditionFeatures.Has(EditionFeatures.RoleManagement)) return Results.NotFound();
            var r = db.QueryFirstOrDefault("SELECT id, name, permissions FROM roles WHERE id=@Id", new { Id = id });
            return r is not null ? Common.Ok(r) : Common.NotFound("角色不存在");
        });

        app.MapPut("/api/roles", async (HttpContext ctx, RoleUpdateDto dto, IDbConnection db) =>
        {
            if (!EditionFeatures.Has(EditionFeatures.RoleManagement)) return Results.NotFound();
            // C-4: 服务端权限检查（门禁5；角色权限 JSON 改写，仅 admin）
            if (!CurrentUser.HasPermission(ctx, db, "roles:update")) return Results.Forbid();
            var affected = await db.ExecuteAsync("UPDATE roles SET permissions=@Permissions WHERE id=@Id",
                new { Id = dto.RoleId, Permissions = dto.Permissions });
            return affected > 0 ? Common.Ok() : Common.NotFound("角色不存在");
        });

        app.MapPost("/api/roles/{id}/reset", (HttpContext ctx, string id, IDbConnection db) =>
        {
            if (!EditionFeatures.Has(EditionFeatures.RoleManagement)) return Results.NotFound();
            // C-4: 服务端权限检查（门禁5；角色权限重置，仅 admin）
            if (!CurrentUser.HasPermission(ctx, db, "roles:update")) return Results.Forbid();
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
        {
            if (!EditionFeatures.Has(EditionFeatures.UserManagement)) return Results.NotFound();
            return Common.Ok(db.Query("SELECT id, username, display_name, role_id, status, created_at FROM users ORDER BY created_at DESC"));
        });

        app.MapGet("/api/users/{id}", (string id, IDbConnection db) =>
        {
            if (!EditionFeatures.Has(EditionFeatures.UserManagement)) return Results.NotFound();
            var u = db.QueryFirstOrDefault("SELECT id, username, display_name, role_id, status, created_at FROM users WHERE id=@Id", new { Id = id });
            return u is not null ? Common.Ok(u) : Common.NotFound("用户不存在");
        });

        app.MapPost("/api/users", async (HttpContext ctx, UserDto dto, IDbConnection db) =>
        {
            if (!EditionFeatures.Has(EditionFeatures.UserManagement)) return Results.NotFound();
            // C-4: 服务端权限检查（门禁5；可建任意角色用户，仅 admin）
            if (!CurrentUser.HasPermission(ctx, db, "users:create")) return Results.Forbid();
            var salt = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(16)).ToLower();
            var hash = Common.HashPassword(dto.Password ?? "", salt, 2);
            var id = dto.Id ?? $"user-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
            await db.ExecuteAsync(@"INSERT INTO users (id,username,password_hash,password_salt,password_hash_version,display_name,role_id,status,created_at)
                VALUES (@Id,@Username,@Hash,@Salt,2,@DisplayName,@RoleId,'active',@Now)",
                new { Id = id, Username = dto.Username, Hash = hash, Salt = salt, DisplayName = dto.DisplayName ?? "", RoleId = dto.RoleId ?? "worker", Now = now() });
            return Common.Ok(new { id });
        });

        app.MapPut("/api/users", async (HttpContext ctx, UserDto dto, IDbConnection db) =>
        {
            if (!EditionFeatures.Has(EditionFeatures.UserManagement)) return Results.NotFound();
            // C-4: 服务端权限检查（门禁5；可改任意用户角色/密码，仅 admin）
            if (!CurrentUser.HasPermission(ctx, db, "users:update")) return Results.Forbid();
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
                // 不变量: 任何写入 password_hash 的 UPDATE 必须同时 is_default_password=0
                var affected = await db.ExecuteAsync(@"UPDATE users SET password_hash=@Hash,password_salt=@Salt,display_name=@DisplayName,role_id=@RoleId,status=@Status,is_default_password=0 WHERE id=@Id",
                    new { dto.Id, Hash = hash, Salt = salt, dto.DisplayName, dto.RoleId, dto.Status });
                return affected > 0 ? Common.Ok() : Common.NotFound("用户不存在");
            }
        });

        app.MapDelete("/api/users/{id}", async (HttpContext ctx, string id, IDbConnection db) =>
        {
            if (!EditionFeatures.Has(EditionFeatures.UserManagement)) return Results.NotFound();
            // C-4: 服务端权限检查（门禁5；删任意用户，仅 admin）
            if (!CurrentUser.HasPermission(ctx, db, "users:delete")) return Results.Forbid();
            return (await db.ExecuteAsync("DELETE FROM users WHERE id=@Id", new { Id = id })) > 0 ? Common.Ok() : Common.NotFound("用户不存在");
        });

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
                        catch (Exception ex) { errors.Add($"{table} id={r.id}: {Common.Sanitize(ex.Message)}"); }
                    }
                    return done;
                }
                catch (Exception ex) { errors.Add($"{table} query: {Common.Sanitize(ex.Message)}"); return 0; }
            }

            total += await BackfillTable("members",
                "id_card, id_card_address, phone",
                "UPDATE members SET id_card_enc=@IdCardEnc, id_card_address_enc=@IdCardAddressEnc, phone_enc=@PhoneEnc, version=version+1, last_modified_at=@Now WHERE id=@Id",
                (r, p) => {
                    p["IdCardEnc"] = pii.Encrypt(r.id_card ?? "");
                    p["IdCardAddressEnc"] = pii.Encrypt(r.id_card_address ?? "");
                    p["PhoneEnc"] = pii.Encrypt(r.phone ?? "");
                });
            stats["members"] = stats.GetValueOrDefault("members", 0);

            total += await BackfillTable("workers",
                "id_card, phone, address",
                "UPDATE workers SET id_card_enc=@IdCardEnc, phone_enc=@PhoneEnc, address_enc=@AddressEnc, version=version+1, last_modified_at=@Now WHERE id=@Id",
                (r, p) => {
                    p["IdCardEnc"] = pii.Encrypt(r.id_card ?? "");
                    p["PhoneEnc"] = pii.Encrypt(r.phone ?? "");
                    p["AddressEnc"] = pii.Encrypt(r.address ?? "");
                });
            stats["workers"] = stats.GetValueOrDefault("workers", 0);

            total += await BackfillTable("partners",
                "phone, credit_code, tax_number",
                "UPDATE partners SET phone_enc=@PhoneEnc, credit_code_enc=@CreditCodeEnc, tax_number_enc=@TaxNumberEnc, version=version+1, last_modified_at=@Now WHERE id=@Id",
                (r, p) => {
                    p["PhoneEnc"] = pii.Encrypt(r.phone ?? "");
                    p["CreditCodeEnc"] = pii.Encrypt(r.credit_code ?? "");
                    p["TaxNumberEnc"] = pii.Encrypt(r.tax_number ?? "");
                });
            stats["partners"] = stats.GetValueOrDefault("partners", 0);

            total += await BackfillTable("supervisors",
                "phone",
                "UPDATE supervisors SET phone_enc=@PhoneEnc, version=version+1, last_modified_at=@Now WHERE id=@Id",
                (r, p) => {
                    p["PhoneEnc"] = pii.Encrypt(r.phone ?? "");
                });
            stats["supervisors"] = stats.GetValueOrDefault("supervisors", 0);

            return Common.Ok(new { message = $"PII 回填完成, 共 {total} 条记录", stats = new Dictionary<string, object> { { "total", total } }, errors });
        });

        // v1.1.0 P0-4 Phase 2 终: admin 手动授权管理端点
        // 设计: admin 可在 UI 上把某用户加入某项目, 该用户就能看该项目下的全部记录
        // 配合 project_authorizations 表 (migration 013)
        // - GET 列所有授权 (含 username + project_name 方便 UI 显示)
        // - POST 授权 (project_id + user_id, 幂等)
        // - DELETE 撤销授权

        app.MapGet("/api/admin/project-authorizations", (HttpContext ctx, IDbConnection db) =>
        {
            if (!EditionFeatures.Has(EditionFeatures.ProjectAuthorization)) return Results.NotFound();
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid)) return Common.Fail("未登录");
            if (!CurrentUser.IsAdmin(ctx)) return Results.Forbid();
            return Common.Ok(db.Query(@"SELECT pa.*, u.username, u.display_name as user_display_name,
                                       p.name as project_name
                                FROM project_authorizations pa
                                LEFT JOIN users u ON pa.user_id=u.id
                                LEFT JOIN projects p ON pa.project_id=p.id
                                ORDER BY pa.granted_at DESC"));
        });

        app.MapGet("/api/admin/project-authorizations/by-user/{userId}", (HttpContext ctx, string userId, IDbConnection db) =>
        {
            if (!EditionFeatures.Has(EditionFeatures.ProjectAuthorization)) return Results.NotFound();
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid)) return Common.Fail("未登录");
            if (!CurrentUser.IsAdmin(ctx)) return Results.Forbid();
            return Common.Ok(db.Query(@"SELECT pa.*, p.name as project_name
                                FROM project_authorizations pa
                                LEFT JOIN projects p ON pa.project_id=p.id
                                WHERE pa.user_id=@UserId ORDER BY pa.granted_at DESC", new { UserId = userId }));
        });

        app.MapPost("/api/admin/project-authorizations", async (HttpContext ctx, HttpRequest req, IDbConnection db) =>
        {
            if (!EditionFeatures.Has(EditionFeatures.ProjectAuthorization)) return Results.NotFound();
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid)) return Common.Fail("未登录");
            if (!CurrentUser.IsAdmin(ctx)) return Results.Forbid();

            // 解析 body: { projectId: long, userId: string }
            ProjectAuthDto dto;
            try
            {
                using var reader = new System.IO.StreamReader(req.Body);
                var bodyText = await reader.ReadToEndAsync();
                dto = System.Text.Json.JsonSerializer.Deserialize<ProjectAuthDto>(bodyText, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new ProjectAuthDto();
            }
            catch (Exception ex) { Console.Error.WriteLine($"[Auth] 用户资料更新参数解析失败: {ex.Message}"); return Common.Fail($"参数解析失败: {Common.Sanitize(ex.Message)}"); }
            if (dto.ProjectId <= 0 || string.IsNullOrEmpty(dto.UserId)) return Common.Fail("projectId 与 userId 必填");

            // 幂等插入
            var existing = db.ExecuteScalar<int>("SELECT COUNT(*) FROM project_authorizations WHERE project_id=@ProjectId AND user_id=@UserId",
                new { dto.ProjectId, dto.UserId });
            if (existing > 0) return Common.Ok(new { message = "已存在该授权", idempotent = true });

            db.Execute(@"INSERT INTO project_authorizations (project_id, user_id, granted_by, granted_at)
                VALUES (@ProjectId, @UserId, @GrantedBy, @Now)",
                new { dto.ProjectId, dto.UserId, GrantedBy = uid, Now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") });
            return Common.Ok(new { message = "授权成功", projectId = dto.ProjectId, userId = dto.UserId });
        });

        app.MapDelete("/api/admin/project-authorizations/{projectId}/{userId}", (HttpContext ctx, long projectId, string userId, IDbConnection db) =>
        {
            if (!EditionFeatures.Has(EditionFeatures.ProjectAuthorization)) return Results.NotFound();
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid)) return Common.Fail("未登录");
            if (!CurrentUser.IsAdmin(ctx)) return Results.Forbid();
            var affected = db.ExecuteAsync("DELETE FROM project_authorizations WHERE project_id=@ProjectId AND user_id=@UserId",
                new { ProjectId = projectId, UserId = userId }).Result;
            return affected > 0 ? Common.Ok() : Common.Fail("未找到该授权");
        });

        // v0.74.0 PII Mask toggle: 返回单条记录的 PII 明文.
        // 说明: 后端 INSERT 时将明文 PII 同时写入原列 + _enc 列.
        // 默认 GET 返回过 Common.MaskXxx 的 mask 值.
        // 本端点按 toggle 后 调本端点 拿 _enc 列 Decrypt 后的明文.
        // 只 admin 可调 (严格控制明文读取权).
        app.MapPost("/api/admin/unmask-pii", async (HttpContext ctx, HttpRequest req, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid)) return Common.Fail("未登录");
            if (!CurrentUser.IsAdmin(ctx)) return Results.Forbid();

            UnmaskPiiDto dto;
            try
            {
                using var reader = new System.IO.StreamReader(req.Body);
                var bodyText = await reader.ReadToEndAsync();
                dto = System.Text.Json.JsonSerializer.Deserialize<UnmaskPiiDto>(bodyText, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new UnmaskPiiDto();
            }
            catch (Exception ex) { return Common.Fail($"参数解析失败: {Common.Sanitize(ex.Message)}"); }
            if (dto.Id <= 0 || string.IsNullOrEmpty(dto.Resource)) return Common.Fail("resource 与 id 必填");

            // resource 转换为 SQL 列名 (PiiProtector Decrypt 调用)
            string encCol = dto.Resource.ToLower() switch
            {
                "members_idcard" => "id_card_enc",
                "members_phone" => "phone_enc",
                "members_bank" => "bank_account_enc",
                "workers_idcard" => "id_card_enc",
                "workers_phone" => "phone_enc",
                "workers_bank" => "bank_account_enc",
                "partners_phone" => "phone_enc",
                "partners_bank" => "bank_account_enc",
                _ => ""
            };
            if (string.IsNullOrEmpty(encCol)) return Common.Fail("resource 不支持");

            // 根据 resource 前缀选表
            string table = dto.Resource.Split('_')[0] switch
            {
                "members" => "members",
                "workers" => "workers",
                "partners" => "partners",
                _ => ""
            };
            if (string.IsNullOrEmpty(table)) return Common.Fail("resource 表不支持");

            var cipherText = db.ExecuteScalar<string>($"SELECT {encCol} FROM {table} WHERE id=@Id", new { dto.Id });
            if (string.IsNullOrEmpty(cipherText)) return Common.Fail("记录不存在或 PII 未加密");

            try
            {
                var pii = ctx.RequestServices.GetRequiredService<EngineeringManager.Api.Security.PiiProtector>();
                var plain = pii.Decrypt(cipherText);
                return Common.Ok(new { resource = dto.Resource, id = dto.Id, plain });
            }
            catch (Exception ex)
            {
                return Common.Fail($"Decrypt 失败: {Common.Sanitize(ex.Message)}");
            }
        });

        // ═══════════════════════════════════════════════════════════
        // M-EDITION1: 个人资料（个人版新增字段）
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/user-profile", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid)) return Common.Fail("未登录");
            var row = db.QueryFirstOrDefault(
                @"SELECT display_name, company_name, position, specialty, business_description
                  FROM users WHERE id=@Uid", new { Uid = uid });
            return row is not null ? Common.Ok(row) : Common.NotFound("用户不存在");
        });

        app.MapPut("/api/user-profile", async (HttpContext ctx, HttpRequest req, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid)) return Common.Fail("未登录");
            UserProfileDto dto;
            try
            {
                using var reader = new System.IO.StreamReader(req.Body);
                var bodyText = await reader.ReadToEndAsync();
                dto = System.Text.Json.JsonSerializer.Deserialize<UserProfileDto>(bodyText,
                    new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new UserProfileDto();
            }
            catch (Exception ex) { return Common.Fail($"参数解析失败: {Common.Sanitize(ex.Message)}"); }

            var affected = await db.ExecuteAsync(
                @"UPDATE users SET company_name=@CompanyName, position=@Position,
                  specialty=@Specialty, business_description=@BusinessDescription
                  WHERE id=@Uid",
                new { uid, dto.CompanyName, dto.Position, dto.Specialty, dto.BusinessDescription });
            return affected > 0 ? Common.Ok() : Common.NotFound("用户不存在");
        });
    }

    public class UnmaskPiiDto
    {
        public string Resource { get; set; } = "";
        public long Id { get; set; }
    }

    public class ProjectAuthDto
    {
        public long ProjectId { get; set; }
        public string UserId { get; set; } = "";
    }

    public class UserProfileDto
    {
        public string CompanyName { get; set; } = "";
        public string Position { get; set; } = "";
        public string Specialty { get; set; } = "";
        public string BusinessDescription { get; set; } = "";
    }
}


