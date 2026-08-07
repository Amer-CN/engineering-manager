/**
 * KnowledgeFolderEndpoints — 知识库文件夹端点（M3）
 *
 * 权限：读 → knowledge:read；写（POST/PUT/DELETE）→ knowledge:create/update/delete
 * 审计：全部写操作落 audit_logs（失败不影响主流程）
 * 软删：DELETE 在事务内 UPDATE folders SET deleted_at + 显式 UPDATE
 *       documents SET folder_id=NULL WHERE folder_id=@Id——不依赖 PRAGMA foreign_keys
 *       （M3 评审补强 ①，HANDOFF §七-2）
 * 范围：文件夹列表沿用文档侧 scope 语义（admin 全量；非 admin 仅
 *       created_by=uid OR 项目授权——与 BuildScopeFilter 一致，不泄露出别人的文件夹）
 */

using System.Data;
using Dapper;
using EngineeringManager.Api.Security;
using EngineeringManager.Api.Services;
using Microsoft.Data.Sqlite;

namespace EngineeringManager.Api;

public static class KnowledgeFolderEndpoints
{
    public static void RegisterKnowledgeFolderEndpoints(this WebApplication app)
    {
        // ═══════════════════════════════════════════════════════════════
        // GET /api/knowledge/folders — 文件夹列表（?projectId= 筛选，含文档数）
        // 权限: knowledge:read
        // ═══════════════════════════════════════════════════════════════
        app.MapGet("/api/knowledge/folders", (HttpContext ctx, IDbConnection db, int? projectId = null) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx);
            if (!CurrentUser.HasPermission(ctx, db, "knowledge:read"))
                return Results.Json(new { success = false, error = "无权限：需要 knowledge:read" }, statusCode: 403);

            try
            {
                // 与文档侧一致的范围：admin 全量；非 admin 仅自己创建或项目授权
                var scope = isAdmin
                    ? new { Filter = "(1 = 1)", Uid = (string?)null, ProjectId = (int?)projectId }
                    : new
                    {
                        Filter = @"(f.created_by = @Uid
                              OR EXISTS(SELECT 1 FROM project_authorizations pa
                                        WHERE pa.project_id = f.project_id AND pa.user_id = @Uid))",
                        Uid = (string?)uid, ProjectId = (int?)projectId,
                    };

                var folders = db.Query<dynamic>(
                    $@"SELECT f.id, f.name, f.english_name, f.project_id, f.category,
                              f.created_at, f.updated_at, f.created_by,
                              (SELECT COUNT(*) FROM knowledge_documents d
                                WHERE d.folder_id = f.id AND d.deleted_at IS NULL) AS doc_count
                       FROM knowledge_folders f
                       WHERE f.deleted_at IS NULL
                         AND {scope.Filter}
                         {(projectId.HasValue ? "AND f.project_id = @ProjectId" : "")}
                       ORDER BY f.created_at DESC",
                    new { scope.Uid, scope.ProjectId });

                return Common.Ok(folders.Select(f => new
                {
                    id = f.id,
                    name = f.name,
                    englishName = f.english_name,
                    projectId = f.project_id,
                    category = f.category,
                    createdAt = f.created_at,
                    updatedAt = f.updated_at,
                    createdBy = f.created_by,
                    docCount = f.doc_count,
                }));
            }
            catch (Exception ex)
            {
                return Common.ServerError("查询文件夹列表", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════════
        // POST /api/knowledge/folders — 建文件夹
        // 权限: knowledge:create
        // ═══════════════════════════════════════════════════════════════
        app.MapPost("/api/knowledge/folders", async (HttpContext ctx, KnowledgeFolderDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx);
            if (!CurrentUser.HasPermission(ctx, db, "knowledge:create"))
                return Results.Json(new { success = false, error = "无权限：需要 knowledge:create" }, statusCode: 403);

            try
            {
                if (string.IsNullOrWhiteSpace(dto.Name))
                    return Common.Fail("文件夹名称不能为空");

                // 项目权限检查：非 admin 携带 projectId 时必须有项目权限
                if (dto.ProjectId.HasValue && !KnowledgeBaseService.CanAccessProject(db, (int)dto.ProjectId.Value, uid, isAdmin))
                    return Results.Json(new { success = false, error = "无权操作该项目" }, statusCode: 403);

                var now = Common.NowString();
                var id = db.ExecuteScalar<long>(@"
                    INSERT INTO knowledge_folders (name, english_name, project_id, category, created_at, updated_at, created_by)
                    VALUES (@Name, @EnglishName, @ProjectId, @Category, @Now, @Now, @Uid);
                    SELECT last_insert_rowid();",
                    new { dto.Name, dto.EnglishName, dto.ProjectId, dto.Category, Now = now, Uid = uid });

                await WriteAudit(ctx, db, uid, "create", "knowledge_folders", id.ToString(),
                    $"{{\"event\":\"create_folder\",\"name\":\"{dto.Name}\",\"projectId\":{dto.ProjectId?.ToString() ?? "null"}}}");

                return Common.Ok(new { id, name = dto.Name });
            }
            catch (Exception ex)
            {
                return Common.ServerError("创建文件夹", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════════
        // PUT /api/knowledge/folders/{id} — 改文件夹（名称/英文名/项目/分类）
        // 权限: knowledge:update
        // ═══════════════════════════════════════════════════════════════
        app.MapPut("/api/knowledge/folders/{id}", async (HttpContext ctx, long id, KnowledgeFolderDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx);
            if (!CurrentUser.HasPermission(ctx, db, "knowledge:update"))
                return Results.Json(new { success = false, error = "无权限：需要 knowledge:update" }, statusCode: 403);

            try
            {
                if (string.IsNullOrWhiteSpace(dto.Name))
                    return Common.Fail("文件夹名称不能为空");

                // M-FIX8 T2 (G58)：目标文件夹本身必须可访问（created_by 本人或项目已授权），
                // 不能只校验请求里带的新 ProjectId——否则他人文件夹被零范围 UPDATE。
                if (!KnowledgeBaseService.CanAccessFolder(db, id, uid, isAdmin))
                    return Results.Json(new { success = false, error = "无权操作该文件夹" }, statusCode: 403);

                if (dto.ProjectId.HasValue && !KnowledgeBaseService.CanAccessProject(db, (int)dto.ProjectId.Value, uid, isAdmin))
                    return Results.Json(new { success = false, error = "无权操作该项目" }, statusCode: 403);

                var affected = await db.ExecuteAsync(@"
                    UPDATE knowledge_folders
                    SET name = @Name, english_name = @EnglishName, project_id = @ProjectId,
                        category = @Category, updated_at = @Now
                    WHERE id = @Id AND deleted_at IS NULL",
                    new { Id = id, dto.Name, dto.EnglishName, dto.ProjectId, dto.Category, Now = Common.NowString() });

                if (affected == 0)
                    return Common.NotFound("文件夹不存在或已删除");

                await WriteAudit(ctx, db, uid, "update", "knowledge_folders", id.ToString(),
                    $"{{\"event\":\"update_folder\",\"name\":\"{dto.Name}\"}}");

                return Common.Ok();
            }
            catch (Exception ex)
            {
                return Common.ServerError("更新文件夹", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════════
        // DELETE /api/knowledge/folders/{id} — 软删文件夹 + 文档移出
        // 权限: knowledge:delete
        // 事务内：folders.deleted_at + documents.folder_id=NULL（不依赖外键 PRAGMA）
        // ═══════════════════════════════════════════════════════════════
        app.MapDelete("/api/knowledge/folders/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx);
            if (!CurrentUser.HasPermission(ctx, db, "knowledge:delete"))
                return Results.Json(new { success = false, error = "无权限：需要 knowledge:delete" }, statusCode: 403);

            try
            {
                // M-FIX8 T2 (G58)：DELETE 前必须先验证文件夹可访问——必须在 BeginTransaction 之前，
                // 否则他人文件夹被零范围 UPDATE 软删。
                if (!KnowledgeBaseService.CanAccessFolder(db, id, uid, isAdmin))
                    return Results.Json(new { success = false, error = "无权操作该文件夹" }, statusCode: 403);

                using var tx = db.BeginTransaction();
                // 1. 软删文件夹
                var affected = await db.ExecuteAsync(
                    "UPDATE knowledge_folders SET deleted_at = @Now, updated_at = @Now WHERE id = @Id AND deleted_at IS NULL",
                    new { Id = id, Now = Common.NowString() }, transaction: tx);

                if (affected == 0)
                {
                    tx.Rollback();
                    return Common.NotFound("文件夹不存在或已删除");
                }

                // 2. 文档移出该文件夹（显式置 NULL，不依赖 PRAGMA foreign_keys）
                await db.ExecuteAsync(
                    "UPDATE knowledge_documents SET folder_id = NULL, updated_at = @Now WHERE folder_id = @Id",
                    new { Id = id, Now = Common.NowString() }, transaction: tx);

                tx.Commit();

                await WriteAudit(ctx, db, uid, "delete", "knowledge_folders", id.ToString(),
                    "{\"event\":\"soft_delete_folder\"}");

                return Common.Ok();
            }
            catch (Exception ex)
            {
                return Common.ServerError("删除文件夹", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════════
        // GET /api/knowledge/folders/{id}/documents — 文件夹内文档
        // 权限: knowledge:read
        // ═══════════════════════════════════════════════════════════════
        app.MapGet("/api/knowledge/folders/{id}/documents", (
            HttpContext ctx, long id, IDbConnection db, int page = 1, int size = 20) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx);
            if (!CurrentUser.HasPermission(ctx, db, "knowledge:read"))
                return Results.Json(new { success = false, error = "无权限：需要 knowledge:read" }, statusCode: 403);

            try
            {
                // M-FIX8 T2 (G58)：与 PUT/DELETE 共用唯一判定 CanAccessFolder（范围表达式逐字一致）。
                // 文件夹不存在（含已删除）也返回不可访问 → 404 语义不变。
                if (!KnowledgeBaseService.CanAccessFolder(db, id, uid, isAdmin))
                    return Common.NotFound("文件夹不存在或无权访问");

                var offset = (page - 1) * size;
                var docs = db.Query<dynamic>(
                    @"SELECT d.id, d.title, d.source_type, d.source_ref, d.project_id,
                             d.occurred_at, d.created_at, d.created_by,
                             (SELECT COUNT(*) FROM knowledge_chunks WHERE document_id = d.id) AS chunk_count
                      FROM knowledge_documents d
                      WHERE d.folder_id = @Id AND d.deleted_at IS NULL
                      ORDER BY d.created_at DESC
                      LIMIT @Size OFFSET @Offset",
                    new { Id = id, Size = size, Offset = offset });

                var total = db.ExecuteScalar<int>(
                    "SELECT COUNT(*) FROM knowledge_documents WHERE folder_id = @Id AND deleted_at IS NULL",
                    new { Id = id });

                return Common.Ok(new
                {
                    data = docs.Select(d => new
                    {
                        id = d.id,
                        title = d.title,
                        sourceType = d.source_type,
                        sourceRef = d.source_ref,
                        projectId = d.project_id,
                        occurredAt = d.occurred_at,
                        createdAt = d.created_at,
                        createdBy = d.created_by,
                        chunkCount = d.chunk_count,
                    }),
                    total,
                    page,
                    size,
                });
            }
            catch (Exception ex)
            {
                return Common.ServerError("查询文件夹文档", ex);
            }
        });
    }

    /// <summary>审计写入（失败不影响主流程，与既有端点一致）。</summary>
    private static async Task WriteAudit(HttpContext ctx, IDbConnection db, string uid,
        string action, string resource, string resourceId, string details)
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
                    ResourceId = resourceId,
                    Details = details,
                    IpAddress = ctx.Connection.RemoteIpAddress?.ToString() ?? "",
                    CreatedAt = Common.NowString(),
                });
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[Audit] 写入失败: {ex.Message}");
        }
    }
}
