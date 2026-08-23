using System.Data;
using System.Text.Json;
using Dapper;
using EngineeringManager.Api.Security;

namespace EngineeringManager.Api;

/// <summary>
/// 写作中心文件夹端点（R3，结构照抄 KnowledgeFolderEndpoints，去掉 project 概念）
///
/// - GET    /api/writing/folders                    文件夹列表（软删过滤，全员可见）
/// - POST   /api/writing/folders                    建文件夹
/// - PUT    /api/writing/folders/{id}               改名
/// - DELETE /api/writing/folders/{id}               软删 + 文档移出（事务）
/// - PUT    /api/writing/documents/{id}/folder      文档移入/移出文件夹
///
/// 权限复用现有 writing:read/create/update/delete 码（不新增）。
/// 文件夹不强制归属隔离：列表全员可见（writing:read）；文档的 created_by
/// 隔离逻辑不变（非 admin 只能动自己的文档）。
/// 审计：写操作落 audit_logs（失败不影响主流程，模式与 WritingEndpoints 一致）。
/// </summary>
public static class WritingFolderEndpoints
{
    public static void RegisterWritingFolderEndpoints(this WebApplication app)
    {
        // ─────────────────────────────────────────────────────────
        // GET /api/writing/folders — 文件夹列表
        // 权限: writing:read（软删过滤；文件夹不挂项目，全员可见）
        // ─────────────────────────────────────────────────────────
        app.MapGet("/api/writing/folders", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            if (!CurrentUser.HasPermission(ctx, db, "writing:read"))
                return Results.Json(new { success = false, error = "无权限：需要 writing:read" }, statusCode: 403);

            try
            {
                var folders = db.Query<dynamic>(@"
                    SELECT id, name, created_at, updated_at
                    FROM writing_folders
                    WHERE deleted_at IS NULL
                    ORDER BY created_at DESC",
                    new { Uid = uid });

                return Common.Ok(folders.Select(f => new
                {
                    id = (long)f.id,
                    name = (string)f.name,
                    createdAt = (string)f.created_at,
                    updatedAt = (string)f.updated_at,
                }));
            }
            catch (Exception ex)
            {
                return Common.ServerError("写作中心文件夹列表", ex);
            }
        });

        // ─────────────────────────────────────────────────────────
        // POST /api/writing/folders — 建文件夹
        // 权限: writing:create
        // ─────────────────────────────────────────────────────────
        app.MapPost("/api/writing/folders", async (HttpContext ctx, WritingFolderDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            if (!CurrentUser.HasPermission(ctx, db, "writing:create"))
                return Results.Json(new { success = false, error = "无权限：需要 writing:create" }, statusCode: 403);

            try
            {
                if (string.IsNullOrWhiteSpace(dto.Name))
                    return Common.Fail("文件夹名称不能为空");

                var name = Common.Sanitize(dto.Name.Trim());
                if (name.Length > 100)
                    return Common.Fail("文件夹名称过长（最多 100 字）");

                var now = Common.NowString();
                var id = await db.ExecuteScalarAsync<long>(@"
                    INSERT INTO writing_folders (name, created_at, updated_at, created_by)
                    VALUES (@Name, @Now, @Now, @Uid);
                    SELECT last_insert_rowid();",
                    new { Name = name, Now = now, Uid = uid });

                await WriteAuditAsync(db, ctx, uid, "create", "writing_folders", id,
                    JsonSerializer.Serialize(new { @event = "create_folder", name = name }));

                return Common.Ok(new { id, name });
            }
            catch (Exception ex)
            {
                return Common.ServerError("写作中心新建文件夹", ex);
            }
        });

        // ─────────────────────────────────────────────────────────
        // PUT /api/writing/folders/{id} — 改名
        // 权限: writing:update
        // ─────────────────────────────────────────────────────────
        app.MapPut("/api/writing/folders/{id}", async (HttpContext ctx, long id, WritingFolderDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            if (!CurrentUser.HasPermission(ctx, db, "writing:update"))
                return Results.Json(new { success = false, error = "无权限：需要 writing:update" }, statusCode: 403);

            try
            {
                if (string.IsNullOrWhiteSpace(dto.Name))
                    return Common.Fail("文件夹名称不能为空");

                var name = Common.Sanitize(dto.Name.Trim());
                if (name.Length > 100)
                    return Common.Fail("文件夹名称过长（最多 100 字）");

                var affected = await db.ExecuteAsync(@"
                    UPDATE writing_folders
                    SET name = @Name, updated_at = @Now
                    WHERE id = @Id AND deleted_at IS NULL",
                    new { Name = name, Now = Common.NowString(), Id = id });

                if (affected == 0)
                    return Common.NotFound("文件夹不存在或已删除");

                await WriteAuditAsync(db, ctx, uid, "update", "writing_folders", id,
                    JsonSerializer.Serialize(new { @event = "rename_folder", name = name }));

                return Common.Ok();
            }
            catch (Exception ex)
            {
                return Common.ServerError("写作中心更新文件夹", ex);
            }
        });

        // ─────────────────────────────────────────────────────────
        // DELETE /api/writing/folders/{id} — 软删文件夹 + 文档移出
        // 权限: writing:delete
        // 事务内：folders.deleted_at + documents.folder_id=NULL（照 KnowledgeFolder 先例）
        // ─────────────────────────────────────────────────────────
        app.MapDelete("/api/writing/folders/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            if (!CurrentUser.HasPermission(ctx, db, "writing:delete"))
                return Results.Json(new { success = false, error = "无权限：需要 writing:delete" }, statusCode: 403);

            try
            {
                using var tx = db.BeginTransaction();
                // 1. 软删文件夹
                var affected = await db.ExecuteAsync(
                    "UPDATE writing_folders SET deleted_at = @Now, updated_at = @Now WHERE id = @Id AND deleted_at IS NULL",
                    new { Id = id, Now = Common.NowString() }, transaction: tx);

                if (affected == 0)
                {
                    tx.Rollback();
                    return Common.NotFound("文件夹不存在或已删除");
                }

                // 2. 文档移出该文件夹（显式置 NULL，不依赖 PRAGMA foreign_keys）
                await db.ExecuteAsync(
                    "UPDATE writing_documents SET folder_id = NULL, updated_at = @Now WHERE folder_id = @Id",
                    new { Id = id, Now = Common.NowString() }, transaction: tx);

                tx.Commit();

                await WriteAuditAsync(db, ctx, uid, "delete", "writing_folders", id,
                    JsonSerializer.Serialize(new { @event = "soft_delete_folder" }));

                return Common.Ok();
            }
            catch (Exception ex)
            {
                return Common.ServerError("写作中心删除文件夹", ex);
            }
        });

        // ─────────────────────────────────────────────────────────
        // PUT /api/writing/documents/{id}/folder — 文档移入/移出文件夹
        // 权限: writing:update；body { folderId }（null = 移出文件夹）
        // 归属校验与 WritingEndpoints PUT 一致：非 admin 只能动自己 created_by 的文档
        // ─────────────────────────────────────────────────────────
        app.MapPut("/api/writing/documents/{id}/folder", async (HttpContext ctx, long id, WritingDocFolderDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx);
            if (!CurrentUser.HasPermission(ctx, db, "writing:update"))
                return Results.Json(new { success = false, error = "无权限：需要 writing:update" }, statusCode: 403);

            try
            {
                var owned = db.ExecuteScalar<int>(@"
                    SELECT COUNT(*) FROM writing_documents
                    WHERE id = @Id AND deleted_at IS NULL AND (created_by = @Uid OR @IsAdmin = 1)",
                    new { Id = id, Uid = uid, IsAdmin = isAdmin ? 1 : 0 }) > 0;
                if (!owned)
                    return Common.NotFound("文档不存在或无权操作");

                // folderId 非空时必须指向未删除的文件夹
                if (dto.FolderId.HasValue)
                {
                    var folderExists = db.ExecuteScalar<int>(
                        "SELECT COUNT(*) FROM writing_folders WHERE id = @FolderId AND deleted_at IS NULL",
                        new { FolderId = dto.FolderId.Value }) > 0;
                    if (!folderExists)
                        return Common.NotFound("文件夹不存在或已删除");
                }

                var affected = await db.ExecuteAsync(@"
                    UPDATE writing_documents
                    SET folder_id = @FolderId, updated_at = @Now
                    WHERE id = @Id AND deleted_at IS NULL",
                    new { FolderId = dto.FolderId, Now = Common.NowString(), Id = id });

                if (affected == 0)
                    return Common.NotFound("文档不存在或已删除");

                await WriteAuditAsync(db, ctx, uid, "update", "writing_documents", id,
                    JsonSerializer.Serialize(new { @event = "move_folder", folderId = dto.FolderId }));

                return Common.Ok();
            }
            catch (Exception ex)
            {
                return Common.ServerError("写作中心移动文档", ex);
            }
        });
    }

    /// <summary>写操作审计（沿用 WritingEndpoints 模式，失败仅告警不影响主流程）</summary>
    private static async Task WriteAuditAsync(
        IDbConnection db, HttpContext ctx, string uid, string action, string resource, long resourceId, string details)
    {
        try
        {
            var userName = db.ExecuteScalar<string>(
                "SELECT display_name FROM users WHERE id = @Uid", new { Uid = uid }) ?? uid;
            await db.ExecuteAsync(@"INSERT INTO audit_logs
                (action, level, user_id, user_name, resource, resource_id, details, ip_address, created_at)
                VALUES (@Action, @Level, @UserId, @UserName, @Resource, @ResourceId, @Details, @IpAddress, @CreatedAt)",
                new
                {
                    Action = action,
                    Level = action == "delete" ? "warning" : "info",
                    UserId = uid,
                    UserName = userName,
                    Resource = resource,
                    ResourceId = resourceId.ToString(),
                    Details = details,
                    IpAddress = ctx.Connection.RemoteIpAddress?.ToString() ?? "",
                    CreatedAt = Common.NowString(),
                });
        }
        catch (Exception auditEx)
        {
            Console.Error.WriteLine($"[Audit] 写入失败: {auditEx.Message}");
        }
    }
}

// ───────────── 请求 DTO ─────────────

/// <summary>文件夹请求（建/改名，白名单：仅 name）</summary>
public sealed record WritingFolderDto(string? Name);

/// <summary>文档移入/移出文件夹请求（folderId=null 表示移出）</summary>
public sealed record WritingDocFolderDto(int? FolderId);
