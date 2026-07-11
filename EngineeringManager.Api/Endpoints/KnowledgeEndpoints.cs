using System.Data;
using Dapper;
using EngineeringManager.Api.Security;
using EngineeringManager.Api.Services;
using EngineeringManager.Api.Services.Stt;

namespace EngineeringManager.Api;

/// <summary>
/// 知识库端点 (M2)
///
/// - POST   /api/knowledge/documents          手动/从转写入库
/// - GET    /api/knowledge/search             混合检索（FTS5 + 语义 + RRF）
/// - GET    /api/knowledge/documents/{id}     文档详情
/// - DELETE /api/knowledge/documents/{id}     删除文档（级联删 chunks + fts）
/// - GET    /api/knowledge/documents          文档列表
///
/// 鉴权沿用 GlobalAuthMiddleware（不在白名单，必须登录）
/// </summary>
public static class KnowledgeEndpoints
{
    public static void RegisterKnowledgeEndpoints(this WebApplication app)
    {
        // ═══════════════════════════════════════════════════════════
        // POST /api/knowledge/documents — 入库
        // ═══════════════════════════════════════════════════════════
        app.MapPost("/api/knowledge/documents", async (
            HttpContext ctx,
            IDbConnection db,
            IEmbeddingService embedding,
            KnowledgeIngestDto dto) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx);
            // 服务端权限检查：必须拥有 knowledge:read 权限
            if (!CurrentUser.HasPermission(ctx, db, "knowledge:read"))
                return Results.Json(new { success = false, error = "无权限：需要 knowledge:read" }, statusCode: 403);
            try
            {
                if (string.IsNullOrWhiteSpace(dto.Text))
                    return Common.Fail("文本内容不能为空");
                if (string.IsNullOrWhiteSpace(dto.Title))
                    return Common.Fail("标题不能为空");

                // 项目写权限检查：非 admin 携带 projectId 时必须有项目权限
                if (dto.ProjectId.HasValue && !KnowledgeBaseService.CanAccessProject(db, dto.ProjectId.Value, uid, isAdmin))
                    return Results.Json(new { success = false, error = "无权操作该项目" }, statusCode: 403);

                var service = new KnowledgeBaseService(db, embedding);
                var result = await service.IngestAsync(
                    fullText: dto.Text,
                    title: dto.Title,
                    sourceType: dto.SourceType ?? "manual",
                    sourceRef: dto.SourceRef,
                    projectId: dto.ProjectId,
                    createdBy: uid,
                    segments: null,
                    occurredAt: dto.OccurredAt);

                return Results.Ok(new
                {
                    success = true,
                    data = new
                    {
                        documentId = result.DocumentId,
                        idempotent = result.Idempotent,
                        hasEmbeddings = result.HasEmbeddings,
                    },
                });
            }
            catch (Exception ex)
            {
                return Common.ServerError("知识库入库", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // GET /api/knowledge/search — 混合检索
        // ═══════════════════════════════════════════════════════════
        app.MapGet("/api/knowledge/search", async (
            HttpContext ctx,
            IDbConnection db,
            IEmbeddingService embedding,
            string q,
            int topK = 10,
            int? projectId = null) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx);
            // 服务端权限检查：必须拥有 knowledge:read 权限
            if (!CurrentUser.HasPermission(ctx, db, "knowledge:read"))
                return Results.Json(new { success = false, error = "无权限：需要 knowledge:read" }, statusCode: 403);
            try
            {
                if (string.IsNullOrWhiteSpace(q))
                    return Common.Fail("搜索关键词不能为空");

                var service = new KnowledgeBaseService(db, embedding);
                var result = await service.SearchAsync(q, topK, projectId, uid, isAdmin);

                return Results.Ok(new
                {
                    success = true,
                    data = new
                    {
                        query = result.Query,
                        totalHits = result.TotalHits,
                        usedSemantic = result.UsedSemantic,
                        hits = result.Hits.Select(h => new
                        {
                            chunkId = h.ChunkId,
                            documentId = h.DocumentId,
                            chunkIndex = h.ChunkIndex,
                            text = h.Text,
                            ftsScore = h.FtsScore,
                            ftsRank = h.FtsRank,
                            semanticScore = h.SemanticScore,
                            semanticRank = h.SemanticRank,
                            rrfScore = h.RrfScore,
                            docTitle = h.DocTitle,
                            sourceType = h.SourceType,
                            sourceRef = h.SourceRef,
                            projectId = h.ProjectId,
                            speakers = h.Speakers,
                            occurredAt = h.OccurredAt,
                        }),
                        documents = result.Documents.Select(d => new
                        {
                            id = d.Id,
                            title = d.Title,
                            sourceType = d.SourceType,
                            sourceRef = d.SourceRef,
                            projectId = d.ProjectId,
                            occurredAt = d.OccurredAt,
                        }),
                    }
                });
            }
            catch (Exception ex)
            {
                return Common.ServerError("知识库检索", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // GET /api/knowledge/documents/{id} — 文档详情
        // ═══════════════════════════════════════════════════════════
        app.MapGet("/api/knowledge/documents/{id}", (
            HttpContext ctx,
            IDbConnection db,
            IEmbeddingService embedding,
            long id) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx);
            // 服务端权限检查：必须拥有 knowledge:read 权限
            if (!CurrentUser.HasPermission(ctx, db, "knowledge:read"))
                return Results.Json(new { success = false, error = "无权限：需要 knowledge:read" }, statusCode: 403);
            try
            {
                var service = new KnowledgeBaseService(db, embedding);
                var doc = service.GetDocument(id, uid, isAdmin);

                if (doc == null)
                    return Common.NotFound("文档不存在或无权访问");

                return Results.Ok(new
                {
                    success = true,
                    data = new
                    {
                        id = doc.Id,
                        sourceType = doc.SourceType,
                        sourceRef = doc.SourceRef,
                        projectId = doc.ProjectId,
                        title = doc.Title,
                        fullText = doc.FullText,
                        speakers = doc.Speakers,
                        occurredAt = doc.OccurredAt,
                        createdAt = doc.CreatedAt,
                        createdBy = doc.CreatedBy,
                        chunks = doc.Chunks.Select(c => new
                        {
                            id = c.Id,
                            index = c.Index,
                            text = c.Text,
                        }),
                    }
                });
            }
            catch (Exception ex)
            {
                return Common.ServerError("获取文档", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // DELETE /api/knowledge/documents/{id} — 删除文档（级联）
        // ═══════════════════════════════════════════════════════════
        app.MapDelete("/api/knowledge/documents/{id}", (
            HttpContext ctx,
            IDbConnection db,
            IEmbeddingService embedding,
            long id) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx);
            // 服务端权限检查：必须拥有 knowledge:read 权限
            if (!CurrentUser.HasPermission(ctx, db, "knowledge:read"))
                return Results.Json(new { success = false, error = "无权限：需要 knowledge:read" }, statusCode: 403);
            try
            {
                var service = new KnowledgeBaseService(db, embedding);
                var deleted = service.DeleteDocument(id, uid, isAdmin);

                if (!deleted)
                    return Common.NotFound("文档不存在或无权删除");

                return Results.Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return Common.ServerError("删除文档", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // GET /api/knowledge/documents — 文档列表
        // 复用 BuildScopeFilter 统一构造数据范围过滤
        // ═══════════════════════════════════════════════════════════
        app.MapGet("/api/knowledge/documents", (
            HttpContext ctx,
            IDbConnection db,
            int page = 1,
            int size = 20,
            int? projectId = null) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx);
            // 服务端权限检查：必须拥有 knowledge:read 权限
            if (!CurrentUser.HasPermission(ctx, db, "knowledge:read"))
                return Results.Json(new { success = false, error = "无权限：需要 knowledge:read" }, statusCode: 403);
            try
            {
                var offset = (page - 1) * size;
                // 复用 BuildScopeFilter，禁止在本端点内复制 SQL
                var scope = KnowledgeBaseService.BuildScopeFilter(isAdmin, uid, projectId);

                var docs = db.Query<dynamic>(
                    $@"SELECT d.id, d.title, d.source_type, d.source_ref, d.project_id,
                              d.speakers, d.occurred_at, d.created_at, d.created_by,
                              (SELECT COUNT(*) FROM knowledge_chunks WHERE document_id = d.id) AS chunk_count
                       FROM knowledge_documents d
                       WHERE {scope.Filter}
                       ORDER BY d.created_at DESC
                       LIMIT @Size OFFSET @Offset",
                    new { scope.Uid, scope.ProjectId, Size = size, Offset = offset });

                var total = db.ExecuteScalar<int>(
                    $@"SELECT COUNT(*) FROM knowledge_documents d WHERE {scope.Filter}",
                    new { scope.Uid, scope.ProjectId });

                return Results.Ok(new
                {
                    success = true,
                    data = new
                    {
                        data = docs.Select(d => new
                        {
                            id = d.id,
                            title = d.title,
                            sourceType = d.source_type,
                            sourceRef = d.source_ref,
                            projectId = d.project_id,
                            speakers = d.speakers,
                            occurredAt = d.occurred_at,
                            createdAt = d.created_at,
                            createdBy = d.created_by,
                            chunkCount = d.chunk_count,
                        }),
                        total,
                        page,
                        size,
                    }
                });
            }
            catch (Exception ex)
            {
                return Common.ServerError("查询文档列表", ex);
            }
        });
    }
}

/// <summary>知识库入库 DTO</summary>
public class KnowledgeIngestDto
{
    public string Text { get; set; } = "";
    public string? Title { get; set; }
    public string? SourceType { get; set; }       // call/meeting/upload/manual
    public string? SourceRef { get; set; }         // 如 stt_job.id
    public int? ProjectId { get; set; }
    public string? OccurredAt { get; set; }
}
