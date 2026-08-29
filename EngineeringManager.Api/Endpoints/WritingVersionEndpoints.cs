using System.Data;
using System.Globalization;
using System.Text.Json;
using Dapper;
using EngineeringManager.Api.Security;

namespace EngineeringManager.Api;

/// <summary>
/// 写作中心版本历史端点（T2）
///
/// - GET  /api/writing/documents/{id}/versions                     版本列表（分页 size≤50，created_at DESC）
/// - POST /api/writing/documents/{id}/versions/{versionId}/restore 回滚（先快照当前，再 UPDATE）
///
/// 快照语义：PUT documents 保存且 ContentMd 非空时，更新前把库里旧 title/content_md
/// 留档（WritingEndpoints PUT 调用本文件 ShouldSnapshot/InsertSnapshotAsync）；
/// 5min 节流防 2s 防抖自动保存刷爆表（距上一条快照 <5min 跳过，不看内容 diff，
/// 简单可预期）；每文档保留最近 50 条，超出删最旧（同事务）。
/// restore 是显式操作，快照不节流（回滚前的当前内容必留档）。
/// 权限与文档端点一致：versions=writing:read、restore=writing:update；
/// 归属隔离照 WritingEndpoints PUT（admin 全量，本人文档，否则 404）。
/// 审计：restore 写 audit_logs（失败不影响主流程，模式与 WritingEndpoints 一致）。
/// </summary>
public static class WritingVersionEndpoints
{
    /// <summary>每文档保留的版本上限（超出删最旧，PUT/restore 共用）</summary>
    internal const int MaxVersionsPerDoc = 50;

    /// <summary>快照节流窗口：距上一条快照 &lt; 5min 的保存跳过留档</summary>
    internal static readonly TimeSpan SnapshotThrottleWindow = TimeSpan.FromMinutes(5);

    public static void RegisterWritingVersionEndpoints(this WebApplication app)
    {
        // ─────────────────────────────────────────────────────────
        // GET /api/writing/documents/{id}/versions — 版本列表
        // 权限: writing:read；归属: 本人文档或 admin（软删文档不可见）
        // ─────────────────────────────────────────────────────────
        app.MapGet("/api/writing/documents/{id}/versions", (
            HttpContext ctx,
            IDbConnection db,
            long id,
            int page = 1,
            int size = 20) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx);
            if (!CurrentUser.HasPermission(ctx, db, "writing:read"))
                return Results.Json(new { success = false, error = "无权限：需要 writing:read" }, statusCode: 403);
            try
            {
                var owned = db.ExecuteScalar<int>(@"
                    SELECT COUNT(*) FROM writing_documents
                    WHERE id = @Id AND deleted_at IS NULL AND (created_by = @Uid OR @IsAdmin = 1)",
                    new { Id = id, Uid = uid, IsAdmin = isAdmin ? 1 : 0 }) > 0;
                if (!owned)
                    return Common.NotFound("文档不存在或无权访问");

                page = Math.Max(page, 1);
                size = Math.Clamp(size, 1, MaxVersionsPerDoc);

                var total = db.ExecuteScalar<int>(
                    "SELECT COUNT(*) FROM writing_document_versions WHERE document_id = @Id", new { Id = id });

                var items = db.Query($@"SELECT v.id, v.title, v.content_md, v.created_by, v.created_at,
                                               COALESCE(NULLIF(u.display_name, ''), v.created_by) AS created_by_name
                                       FROM writing_document_versions v
                                       LEFT JOIN users u ON u.id = v.created_by
                                       WHERE v.document_id = @Id
                                       ORDER BY v.created_at DESC, v.id DESC
                                       LIMIT @Size OFFSET @Offset",
                    new { Id = id, Size = size, Offset = (page - 1) * size }).ToList();

                return Results.Ok(new
                {
                    success = true,
                    data = new
                    {
                        total,
                        page,
                        size,
                        items = items.Select(r => new
                        {
                            id = (long)r.id,
                            r.title,
                            contentMd = r.content_md,
                            createdBy = r.created_by_name,
                            createdAt = r.created_at,
                        }),
                    },
                });
            }
            catch (Exception ex)
            {
                return Common.ServerError("写作中心版本列表", ex);
            }
        });

        // ─────────────────────────────────────────────────────────
        // POST /api/writing/documents/{id}/versions/{versionId}/restore — 回滚
        // 权限: writing:update；归属同 PUT；版本必须属于该文档
        // 事务内：快照当前内容（不节流，回滚必留档）→ UPDATE 文档 title/content_md=版本值
        // ─────────────────────────────────────────────────────────
        app.MapPost("/api/writing/documents/{id}/versions/{versionId}/restore", async (
            HttpContext ctx,
            IDbConnection db,
            long id,
            long versionId) =>
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

                var version = db.QueryFirstOrDefault<dynamic>(@"
                    SELECT id, title, content_md FROM writing_document_versions
                    WHERE id = @VersionId AND document_id = @Id",
                    new { VersionId = versionId, Id = id });
                if (version is null)
                    return Common.NotFound("版本不存在");

                var current = db.QueryFirstOrDefault<dynamic>(
                    "SELECT title, content_md FROM writing_documents WHERE id = @Id", new { Id = id });
                if (current is null)
                    return Common.NotFound("文档不存在或无权操作");
                var now = Common.NowString();

                using var tx = db.BeginTransaction();
                // 回滚是显式操作：当前内容必留档（不走 5min 节流），再写回版本值；同事务失败一起回滚
                await InsertSnapshotAsync(db, tx, id, (string)current.title, (string)current.content_md, uid, now);
                await db.ExecuteAsync(@"
                    UPDATE writing_documents SET title = @Title, content_md = @Content, updated_at = @Now
                    WHERE id = @Id",
                    new { Title = (string)version.title, Content = (string)version.content_md, Now = now, Id = id },
                    transaction: tx);
                tx.Commit();

                await WriteAuditAsync(db, ctx, uid, "update", "writing_documents", id,
                    JsonSerializer.Serialize(new { @event = "restore_version", versionId }));

                return Common.Ok(new { title = (string)version.title, contentMd = (string)version.content_md });
            }
            catch (Exception ex)
            {
                return Common.ServerError("写作中心版本回滚", ex);
            }
        });
    }

    // ─────────────────────────────────────────────────────────────
    // 供 WritingEndpoints PUT 共用的快照帮助
    // ─────────────────────────────────────────────────────────────

    /// <summary>
    /// 是否需要留档：无上一条快照，或上一条距 now ≥ 节流窗口（5min）。
    /// created_at 格式 "yyyy-MM-dd HH:mm:ss"（Common.NowString）；解析失败视为可留档。
    /// </summary>
    internal static bool ShouldSnapshot(string? lastSnapshotCreatedAt)
    {
        if (lastSnapshotCreatedAt is null) return true;
        if (DateTime.TryParseExact(lastSnapshotCreatedAt, "yyyy-MM-dd HH:mm:ss",
                CultureInfo.InvariantCulture, DateTimeStyles.None, out var last)
            && DateTime.Now - last < SnapshotThrottleWindow)
            return false;
        return true;
    }

    /// <summary>
    /// 插入一条快照并裁剪到最近 MaxVersionsPerDoc 条。
    /// 须与文档 UPDATE 同事务调用（失败一起回滚）。
    /// </summary>
    internal static async Task InsertSnapshotAsync(
        IDbConnection db, IDbTransaction tx, long documentId, string title, string contentMd, string uid, string now)
    {
        await db.ExecuteAsync(@"INSERT INTO writing_document_versions
            (document_id, title, content_md, created_by, created_at)
            VALUES (@DocumentId, @Title, @Content, @Uid, @Now)",
            new { DocumentId = documentId, Title = title, Content = contentMd, Uid = uid, Now = now },
            transaction: tx);

        // 上限裁剪：保留最近 50 条（按插入序 id 倒序，created_at 秒级粒度会撞同秒，id 才稳定）
        await db.ExecuteAsync(@"DELETE FROM writing_document_versions WHERE document_id = @DocumentId
            AND id NOT IN (SELECT id FROM writing_document_versions WHERE document_id = @DocumentId
                           ORDER BY id DESC LIMIT @Max)",
            new { DocumentId = documentId, Max = MaxVersionsPerDoc },
            transaction: tx);
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
                    Level = "info",
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
