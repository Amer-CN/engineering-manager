using System.Data;
using System.Text.Json;
using Dapper;
using EngineeringManager.Api.Models;
using EngineeringManager.Api.Security;
using EngineeringManager.Api.Services;

namespace EngineeringManager.Api;

/// <summary>
/// 写作中心端点（v0.92.0）
///
/// - GET    /api/writing/doc-types           文体/风格可选项（单源真值）
/// - GET    /api/writing/documents         文档列表（软删过滤 + 归属隔离）
/// - POST   /api/writing/documents         新建文档
/// - GET    /api/writing/documents/{id}    文档详情
/// - PUT    /api/writing/documents/{id}    保存编辑
/// - DELETE /api/writing/documents/{id}    软删
/// - POST   /api/writing/draft             AI 整篇起草（SSE 流式）
/// - POST   /api/writing/assist            AI 行内改写（一次返回）
///
/// 鉴权沿用 GlobalAuthMiddleware；其余端点各自做 CurrentUser.HasPermission 检查。
/// 写操作一律 Dapper 参数化 + 写审计。
/// </summary>
public static class WritingEndpoints
{
    public static void RegisterWritingEndpoints(this WebApplication app)
    {
        // ─────────────────────────────────────────────────────────
        // GET /api/writing/doc-types — 文体与风格可选项
        // ─────────────────────────────────────────────────────────
        app.MapGet("/api/writing/doc-types", (
            HttpContext ctx,
            IDbConnection db,
            WritingSkillService skill) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            if (!CurrentUser.HasPermission(ctx, db, "writing:read"))
                return Results.Json(new { success = false, error = "无权限：需要 writing:read" }, statusCode: 403);
            try
            {
                var docTypes = skill.GetDocTypes()
                    .GroupBy(d => d.Group)
                    .Select(g => new
                    {
                        group = g.Key,
                        types = g.Select(t => new { code = t.Code, label = t.Label }),
                    });
                var styles = skill.GetStyles()
                    .Select(s => new { id = s.Id, name = s.Name, description = s.Description });
                return Results.Ok(new { success = true, data = new { groups = docTypes, styles } });
            }
            catch (Exception ex)
            {
                return Common.ServerError("写作中心选项加载", ex);
            }
        });

        // ─────────────────────────────────────────────────────────
        // GET /api/writing/documents — 文档列表
        // ─────────────────────────────────────────────────────────
        app.MapGet("/api/writing/documents", (
            HttpContext ctx,
            IDbConnection db,
            string? docType = null,
            int page = 1,
            int size = 20) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx);
            if (!CurrentUser.HasPermission(ctx, db, "writing:read"))
                return Results.Json(new { success = false, error = "无权限：需要 writing:read" }, statusCode: 403);
            try
            {
                page = Math.Max(page, 1);
                size = Math.Clamp(size, 1, 100);
                var offset = (page - 1) * size;

                var conditions = new List<string> { "[deleted_at] IS NULL" };
                var p = new DynamicParameters();
                if (!isAdmin)
                {
                    conditions.Add("[created_by] = @Uid");
                    p.Add("Uid", uid);
                }
                if (!string.IsNullOrWhiteSpace(docType))
                {
                    conditions.Add("[doc_type] = @DocType");
                    p.Add("DocType", docType);
                }
                var where = string.Join(" AND ", conditions);

                p.Add("Size", size);
                p.Add("Offset", offset);

                var items = db.Query(@"SELECT id, title, doc_type, style_id, project_id, source_type, source_ref,
                                           created_by, created_at, updated_at
                                       FROM [writing_documents]
                                       WHERE " + where + @" ORDER BY [updated_at] DESC LIMIT @Size OFFSET @Offset",
                    (object)p).ToList();

                var total = db.ExecuteScalar<int>($"SELECT COUNT(*) FROM [writing_documents] WHERE {where}", p);

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
                            docType = r.doc_type,
                            styleId = r.style_id,
                            projectId = r.project_id,
                            sourceType = r.source_type,
                            sourceRef = r.source_ref,
                            createdBy = r.created_by,
                            createdAt = r.created_at,
                            updatedAt = r.updated_at,
                        }),
                    },
                });
            }
            catch (Exception ex)
            {
                return Common.ServerError("写作中心文档列表", ex);
            }
        });

        // ─────────────────────────────────────────────────────────
        // POST /api/writing/documents — 新建文档
        // ─────────────────────────────────────────────────────────
        app.MapPost("/api/writing/documents", async (
            HttpContext ctx,
            IDbConnection db,
            WritingSkillService skill,
            WritingCreateDto dto) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx);
            if (!CurrentUser.HasPermission(ctx, db, "writing:create"))
                return Results.Json(new { success = false, error = "无权限：需要 writing:create" }, statusCode: 403);
            try
            {
                if (string.IsNullOrWhiteSpace(dto.Title))
                    return Common.Fail("标题不能为空");
                var title = Common.Sanitize(dto.Title.Trim());
                if (title.Length > 200)
                    return Common.Fail("标题过长（最多 200 字）");

                var sourceType = string.IsNullOrWhiteSpace(dto.SourceType) ? "manual" : dto.SourceType.Trim();
                if (sourceType is not ("manual" or "stt"))
                    return Common.Fail("无效的 sourceType，允许: manual/stt");

                // 文体白名单（草稿阶段可先存后起草，故允许任意已注册文体）
                if (!string.IsNullOrWhiteSpace(dto.DocType) && !skill.TryGetDocType(dto.DocType, out _))
                    return Common.Fail("未知文体类型");

                if (dto.ProjectId.HasValue && !KnowledgeBaseService.CanAccessProject(db, dto.ProjectId.Value, uid, isAdmin))
                    return Results.Json(new { success = false, error = "无权操作该项目" }, statusCode: 403);

                var now = Common.NowString();
                var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO writing_documents
                    (title, doc_type, style_id, content_md, project_id, source_type, source_ref, created_by, created_at, updated_at)
                    VALUES (@Title, @DocType, @StyleId, @Content, @ProjectId, @SourceType, @SourceRef, @Uid, @Now, @Now);
                    SELECT last_insert_rowid();",
                    new
                    {
                        Title = title,
                        DocType = (dto.DocType ?? "").Trim(),
                        StyleId = (dto.StyleId ?? "").Trim(),
                        Content = dto.ContentMd ?? "",
                        ProjectId = dto.ProjectId,
                        SourceType = sourceType,
                        SourceRef = Common.Sanitize(dto.SourceRef ?? ""),
                        Uid = uid,
                        Now = now,
                    });

                await WriteAuditAsync(db, ctx, uid, "create", id, $"{{\"event\":\"create\",\"docType\":\"" + Common.Sanitize(dto.DocType ?? "") + "\"}");

                return Results.Ok(new { success = true, data = new { id, createdAt = now } });
            }
            catch (Exception ex)
            {
                return Common.ServerError("写作中心新建文档", ex);
            }
        });

        // ─────────────────────────────────────────────────────────
        // GET /api/writing/documents/{id} — 文档详情
        // ─────────────────────────────────────────────────────────
        app.MapGet("/api/writing/documents/{id}", (
            HttpContext ctx,
            IDbConnection db,
            long id) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx);
            if (!CurrentUser.HasPermission(ctx, db, "writing:read"))
                return Results.Json(new { success = false, error = "无权限：需要 writing:read" }, statusCode: 403);
            try
            {
                var row = db.QueryFirstOrDefault<dynamic>(@"
                    SELECT id, title, doc_type, style_id, content_md, project_id, source_type, source_ref,
                           created_by, created_at, updated_at
                    FROM writing_documents
                    WHERE id = @Id AND deleted_at IS NULL
                      AND (created_by = @Uid OR @IsAdmin = 1)",
                    new { Id = id, Uid = uid, IsAdmin = isAdmin ? 1 : 0 });
                if (row is null)
                    return Common.NotFound("文档不存在或无权访问");

                return Results.Ok(new
                {
                    success = true,
                    data = new
                    {
                        id = row.id,
                        title = row.title,
                        docType = row.doc_type,
                        styleId = row.style_id,
                        contentMd = row.content_md,
                        projectId = row.project_id,
                        sourceType = row.source_type,
                        sourceRef = row.source_ref,
                        createdBy = row.created_by,
                        createdAt = row.created_at,
                        updatedAt = row.updated_at,
                    },
                });
            }
            catch (Exception ex)
            {
                return Common.ServerError("写作中心文档详情", ex);
            }
        });

        // ─────────────────────────────────────────────────────────
        // PUT /api/writing/documents/{id} — 更新文档
        // 白名单：title / contentMd / projectId；其余字段一律忽略
        // ─────────────────────────────────────────────────────────
        app.MapPut("/api/writing/documents/{id}", async (
            HttpContext ctx,
            IDbConnection db,
            long id,
            WritingUpdateDto dto) =>
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

                var sets = new List<string> { "[updated_at] = @Now" };
                var p = new DynamicParameters();
                p.Add("Id", id);
                p.Add("Now", Common.NowString());

                if (!string.IsNullOrWhiteSpace(dto.Title))
                {
                    var title = Common.Sanitize(dto.Title.Trim());
                    if (title.Length > 200)
                        return Common.Fail("标题过长（最多 200 字）");
                    sets.Add("[title] = @Title");
                    p.Add("Title", title);
                }
                if (dto.ContentMd is not null)
                {
                    sets.Add("[content_md] = @Content");
                    p.Add("Content", dto.ContentMd);
                }
                if (dto.ProjectId.HasValue)
                {
                    if (!KnowledgeBaseService.CanAccessProject(db, dto.ProjectId.Value, uid, isAdmin))
                        return Results.Json(new { success = false, error = "无权操作该项目" }, statusCode: 403);
                    sets.Add("[project_id] = @ProjectId");
                    p.Add("ProjectId", dto.ProjectId.Value);
                }

                await db.ExecuteAsync(
                    $"UPDATE writing_documents SET {string.Join(", ", sets)} WHERE id = @Id", p);

                await WriteAuditAsync(db, ctx, uid, "update", id, "{\"event\":\"update\"}");

                return Common.Ok();
            }
            catch (Exception ex)
            {
                return Common.ServerError("写作中心更新文档", ex);
            }
        });

        // ─────────────────────────────────────────────────────────
        // DELETE /api/writing/documents/{id} — 软删
        // ─────────────────────────────────────────────────────────
        app.MapDelete("/api/writing/documents/{id}", async (
            HttpContext ctx,
            IDbConnection db,
            long id) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx);
            if (!CurrentUser.HasPermission(ctx, db, "writing:delete"))
                return Results.Json(new { success = false, error = "无权限：需要 writing:delete" }, statusCode: 403);
            try
            {
                var affected = await db.ExecuteAsync(@"
                    UPDATE writing_documents SET deleted_at = @Now, updated_at = @Now
                    WHERE id = @Id AND deleted_at IS NULL AND (created_by = @Uid OR @IsAdmin = 1)",
                    new { Id = id, Uid = uid, IsAdmin = isAdmin ? 1 : 0, Now = Common.NowString() });
                if (affected == 0)
                    return Common.NotFound("文档不存在或无权操作");

                await WriteAuditAsync(db, ctx, uid, "delete", id, "{\"event\":\"delete\"}");

                return Common.Ok();
            }
            catch (Exception ex)
            {
                return Common.ServerError("写作中心删除文档", ex);
            }
        });

        // ─────────────────────────────────────────────────────────
        // POST /api/writing/draft — AI 整篇起草（SSE 流式）
        // ─────────────────────────────────────────────────────────
        app.MapPost("/api/writing/draft", async (
            HttpContext ctx,
            IDbConnection db,
            WritingSkillService skill,
            WritingDraftRequest dto) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            if (!CurrentUser.HasPermission(ctx, db, "writing:create"))
            {
                ctx.Response.StatusCode = 403;
                await WriteSseAsync(ctx, new { type = "error", error = "无权限：需要 writing:create" });
                return;
            }

            // 校验
            if (!skill.TryGetDocType(dto.DocType, out _))
            {
                ctx.Response.StatusCode = 400;
                await WriteSseAsync(ctx, new { type = "error", error = "未知文体类型" });
                return;
            }
            if (!skill.TryGetStyle(dto.StyleId, out _))
            {
                ctx.Response.StatusCode = 400;
                await WriteSseAsync(ctx, new { type = "error", error = "未知风格" });
                return;
            }
            if (string.IsNullOrWhiteSpace(dto.Material))
            {
                ctx.Response.StatusCode = 400;
                await WriteSseAsync(ctx, new { type = "error", error = "素材不能为空" });
                return;
            }

            ctx.Response.ContentType = "text/event-stream";
            ctx.Response.Headers.Append("Cache-Control", "no-cache");
            ctx.Response.Headers.Append("Connection", "keep-alive");
            ctx.Response.Headers.Append("X-Accel-Buffering", "no");

            try
            {
                var full = new System.Text.StringBuilder();
                await foreach (var token in skill.StreamDraftAsync(dto))
                {
                    full.Append(token);
                    await WriteSseAsync(ctx, new { type = "content", text = token });
                }

                var content = WritingSkillService.StripProtectedMarkers(full.ToString().Trim());
                await WriteSseAsync(ctx, new { type = "done", content });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[Writing] 起草失败: {ex.Message}");
                await WriteSseAsync(ctx, new { type = "error", error = $"起草失败: {Common.Sanitize(ex.Message)}" });
            }
        });

        // ─────────────────────────────────────────────────────────
        // POST /api/writing/assist — AI 行内改写（一次返回）
        // ─────────────────────────────────────────────────────────
        app.MapPost("/api/writing/assist", async (
            HttpContext ctx,
            IDbConnection db,
            WritingSkillService skill,
            WritingAssistRequest dto) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            if (!CurrentUser.HasPermission(ctx, db, "writing:create"))
                return Results.Json(new { success = false, error = "无权限：需要 writing:create" }, statusCode: 403);
            try
            {
                if (string.IsNullOrWhiteSpace(dto.SelectedText))
                    return Common.Fail("所选文字不能为空");

                var instruction = (dto.Instruction ?? "custom").ToLowerInvariant();
                if (!WritingSkillService.AssistInstructions.Contains(instruction))
                    return Common.Fail("未知指令，允许: rewrite/polish/expand/shorten/custom");
                if (instruction == "custom" && string.IsNullOrWhiteSpace(dto.CustomInstruction))
                    return Common.Fail("自定义指令需提供 customInstruction");

                var (ok, text, error) = await skill.AssistAsync(dto);
                if (!ok)
                    return Common.Fail(error ?? "AI 改写失败");
                return Results.Ok(new { success = true, data = new { text } });
            }
            catch (Exception ex)
            {
                return Common.ServerError("写作中心行内改写", ex);
            }
        });
    }

    // ─────────────────────────────────────────────────────────────
    // 私有帮助
    // ─────────────────────────────────────────────────────────────

    private static async Task WriteSseAsync(HttpContext ctx, object data)
    {
        var json = JsonSerializer.Serialize(data);
        await ctx.Response.WriteAsync($"data: {json}\n\n");
        await ctx.Response.Body.FlushAsync();
    }

    /// <summary>写操作审计（沿用 knowledge 端点模式，失败仅告警不影响主流程）</summary>
    private static async Task WriteAuditAsync(
        IDbConnection db, HttpContext ctx, string uid, string action, long resourceId, string details)
    {
        try
        {
            var userName = db.ExecuteScalar<string>("SELECT display_name FROM users WHERE id = @Uid", new { Uid = uid }) ?? uid;
            await db.ExecuteAsync(@"INSERT INTO audit_logs
                (action, level, user_id, user_name, resource, resource_id, details, ip_address, created_at)
                VALUES (@Action, @Level, @UserId, @UserName, @Resource, @ResourceId, @Details, @IpAddress, @CreatedAt)",
                new
                {
                    Action = action,
                    Level = "info",
                    UserId = uid,
                    UserName = userName,
                    Resource = "writing_documents",
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

/// <summary>新建文档请求（白名单：仅收以下字段）</summary>
public sealed record WritingCreateDto(
    string Title,
    string? DocType,
    string? StyleId,
    string? ContentMd,
    int? ProjectId,
    string? SourceType,
    string? SourceRef);

/// <summary>更新文档请求（白名单：仅收以下字段）</summary>
public sealed record WritingUpdateDto(
    string? Title,
    string? ContentMd,
    int? ProjectId);
