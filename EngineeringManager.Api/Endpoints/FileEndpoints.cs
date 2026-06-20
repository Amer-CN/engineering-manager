using System.Data;
using System.Diagnostics;
using Dapper;
using EngineeringManager.Api.Security;

namespace EngineeringManager.Api;

/// <summary>
/// 文件操作 + 图纸 + 合同文件端点
/// </summary>
public static class FileEndpoints
{
    /// <summary>校验路径是否在允许的目录内，防止路径遍历攻击</summary>
    private static bool IsPathSafe(string fullPath, string allowedBase)
    {
        var resolved = Path.GetFullPath(fullPath);
        var baseResolved = Path.GetFullPath(allowedBase);
        return resolved.StartsWith(baseResolved, StringComparison.OrdinalIgnoreCase);
    }

    public static void RegisterFileEndpoints(this WebApplication app)
    {
        var now = () => DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

        // ═══════════════════════════════════════════════════════════
        // 文件操作（简化版）
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/files/save", (HttpContext ctx, FileSaveDto dto) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                var baseDir = Path.Combine(ApiConfig.ResolveDataPath(), "uploads");
                var dir = Path.Combine(baseDir, dto.Category ?? "未分类");
                Directory.CreateDirectory(dir);
                var filePath = Path.Combine(dir, dto.FileName ?? "file");
                if (!IsPathSafe(filePath, baseDir)) return Common.Fail("非法路径");
                if (!string.IsNullOrEmpty(dto.FileData))
                {
                    var data = dto.FileData;
                    if (data.Contains(",")) data = data.Split(',')[1];
                    File.WriteAllBytes(filePath, Convert.FromBase64String(data));
                }
                return Common.Ok(new { fileName = dto.FileName });
            }
            catch (Exception ex) { return Common.Fail(Common.Sanitize(ex.Message)); }
        });

        app.MapGet("/api/files/read", (HttpContext ctx, string category, string fileName, string? projectName) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                var baseDir = Path.Combine(ApiConfig.ResolveDataPath(), "uploads");
                var paths = new[]
                {
                    Path.Combine(baseDir, projectName ?? "", category, fileName),
                    Path.Combine(baseDir, "未分类", category, fileName),
                    Path.Combine(baseDir, "_common", category, fileName),
                };
                foreach (var p in paths)
                {
                    if (!IsPathSafe(p, baseDir)) continue;
                    if (File.Exists(p))
                    {
                        var bytes = File.ReadAllBytes(p);
                        var ext = Path.GetExtension(p).ToLower();
                        var mime = ext switch
                        {
                            ".jpg" or ".jpeg" => "image/jpeg",
                            ".png" => "image/png",
                            ".pdf" => "application/pdf",
                            _ => "application/octet-stream"
                        };
                        return Common.Ok(new { dataUrl = $"data:{mime};base64,{Convert.ToBase64String(bytes)}", mimeType = mime });
                    }
                }
                return Common.NotFound("文件不存在");
            }
            catch (Exception ex) { return Common.Fail(Common.Sanitize(ex.Message)); }
        });

        // ═══════════════════════════════════════════════════════════
        // 图纸
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/drawings", (HttpContext ctx, IDbConnection db, long? projectId) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            // v1.1.0 P0-4 Phase 2: 总加 user-dim
            var conditions = new List<string>();
            if (projectId.HasValue) conditions.Add("project_id=@ProjectId");
            conditions.Add(CurrentUser.UserFilterWithAuthorizedProjects());
            var sql = "SELECT * FROM drawings WHERE " + string.Join(" AND ", conditions) + " ORDER BY created_at DESC";
            return Common.Ok(db.Query(sql, new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId }));
        });

        app.MapDelete("/api/drawings/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            return (await db.ExecuteAsync("DELETE FROM drawings WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });

        // ═══════════════════════════════════════════════════════════
        // 图纸写操作（补全）
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/drawings", async (HttpContext ctx, dynamic dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO drawings (project_id,name,file_url,file_name,drawing_type,scale,notes,created_by,created_at,updated_at, last_modified_at) VALUES (@ProjectId,@Name,@FileUrl,@FileName,@DrawingType,@Scale,@Notes,@CreatedBy,@Now,@Now, @Now); SELECT last_insert_rowid();",
                new { Now = now(), CreatedBy = uid });
            return Common.Ok(id);
        });

        app.MapPut("/api/drawings", async (HttpContext ctx, dynamic dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var affected = await db.ExecuteAsync("UPDATE drawings SET name=@Name,notes=@Notes,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { Now = now(), Uid = uid, IsAdmin = isAdmin });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapPut("/api/expenses", async (HttpContext ctx, dynamic dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var affected = await db.ExecuteAsync(@"UPDATE expenses SET category=@Category,amount=@Amount,date=@Date,description=@Description,vendor=@Vendor,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { Now = now(), Uid = uid, IsAdmin = isAdmin });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapPost("/api/inventory/transactions", async (HttpContext ctx, dynamic dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO inventory_transactions (item_id,type,quantity,date,notes,operator,created_by,created_at, last_modified_at) VALUES (@ItemId,@Type,@Quantity,@Date,@Notes,@Operator,@CreatedBy,@Now, @Now); SELECT last_insert_rowid();",
                new { Now = now(), CreatedBy = uid });
            return Common.Ok(id);
        });

        // ═══════════════════════════════════════════════════════════
        // 文件操作补全
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/files/delete", (HttpContext ctx, dynamic dto) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                var baseDir = Path.Combine(ApiConfig.ResolveDataPath(), "uploads");
                var dir = Path.Combine(baseDir, (string)(dto.category ?? "未分类"));
                var path = Path.Combine(dir, (string)(dto.fileName ?? ""));
                if (!IsPathSafe(path, baseDir)) return Common.Fail("非法路径");
                if (File.Exists(path)) { File.Delete(path); return Common.Ok(); }
                return Common.NotFound("文件不存在");
            }
            catch (Exception ex) { return Common.Fail(Common.Sanitize(ex.Message)); }
        });

        app.MapPost("/api/files/open-external", (HttpContext ctx, dynamic dto) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                var baseDir = Path.Combine(ApiConfig.ResolveDataPath(), "uploads");
                var dir = Path.Combine(baseDir, (string)(dto.category ?? "未分类"));
                var path = Path.Combine(dir, (string)(dto.fileName ?? ""));
                if (!IsPathSafe(path, baseDir)) return Common.Fail("非法路径");
                if (File.Exists(path)) { Process.Start(new ProcessStartInfo(path) { UseShellExecute = true }); return Common.Ok(); }
                return Common.NotFound("文件不存在");
            }
            catch (Exception ex) { return Common.Fail(Common.Sanitize(ex.Message)); }
        });

        app.MapGet("/api/contracts/read-file", (HttpContext ctx, string fileName, string subCategory, string? projectName) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                var baseDir = Path.Combine(ApiConfig.ResolveDataPath(), "uploads");
                var paths = new[]
                {
                    Path.Combine(baseDir, projectName ?? "", "合同", subCategory == "income" ? "收入" : "支出", fileName),
                    Path.Combine(baseDir, "未分类", "合同", subCategory == "income" ? "收入" : "支出", fileName),
                };
                foreach (var p in paths)
                {
                    if (!IsPathSafe(p, baseDir)) continue;
                    if (File.Exists(p))
                    {
                        var bytes = File.ReadAllBytes(p);
                        var ext = Path.GetExtension(p).ToLower();
                        var mime = ext switch { ".pdf" => "application/pdf", ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document", _ => "application/octet-stream" };
                        return Common.Ok(new { dataUrl = $"data:{mime};base64,{Convert.ToBase64String(bytes)}", mimeType = mime });
                    }
                }
                return Common.NotFound("文件不存在");
            }
            catch (Exception ex) { return Common.Fail(Common.Sanitize(ex.Message)); }
        });

        app.MapPost("/api/contracts/save-file", (HttpContext ctx, dynamic dto) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                var baseDir = Path.Combine(ApiConfig.ResolveDataPath(), "uploads");
                var subDir = (string)(dto.subCategory ?? "income") == "income" ? "收入" : "支出";
                var dir = Path.Combine(baseDir, (string)(dto.projectName ?? "未分类"), "合同", subDir);
                Directory.CreateDirectory(dir);
                var filePath = Path.Combine(dir, (string)(dto.fileName ?? "file"));
                if (!IsPathSafe(filePath, baseDir)) return Common.Fail("非法路径");
                if (!string.IsNullOrEmpty((string)(dto.fileData ?? "")))
                {
                    var data = (string)dto.fileData;
                    if (data.Contains(",")) data = data.Split(',')[1];
                    File.WriteAllBytes(filePath, Convert.FromBase64String(data));
                }
                return Common.Ok(new { fileName = (string)(dto.fileName ?? "") });
            }
            catch (Exception ex) { return Common.Fail(Common.Sanitize(ex.Message)); }
        });
    }
}
