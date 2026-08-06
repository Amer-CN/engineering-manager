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

    /// <summary>
    /// open-external 端点允许的文件扩展名白名单 (P0-3)。
    /// 仅文档 + 图片,显式排除可执行文件 (.bat/.exe/.cmd/.ps1/.vbs/.js/.scr/.com/.msi 等),
    /// 防止上传的文件被 UseShellExecute 远程执行。
    /// </summary>
    private static readonly HashSet<string> OpenableExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        // 文档
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".csv", ".rtf",
        // 图片
        ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".tif", ".tiff", ".svg",
    };

    private static bool IsOpenableExtension(string path)
    {
        var ext = Path.GetExtension(path);
        return !string.IsNullOrEmpty(ext) && OpenableExtensions.Contains(ext);
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
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.1.0 P0-4 Phase 2: 总加 user-dim
            var conditions = new List<string>();
            if (projectId.HasValue) conditions.Add("project_id=@ProjectId");
            conditions.Add(CurrentUser.UserFilterWithAuthorizedProjects(scope));
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

        app.MapPost("/api/drawings", async (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // 修复: 列名对齐前端契约(Drawing type)与真库 —— category/file_path/remarks/position
            // (原 file_url/drawing_type/scale/notes 是从未与前端匹配的死 schema, 真库/GET/前端均用 file_path)
            using var reader = new System.IO.StreamReader(ctx.Request.Body);
            var bodyText = await reader.ReadToEndAsync();
            var body = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(bodyText);
            var fileName = body.TryGetProperty("fileName", out var fn) ? (fn.GetString() ?? "") : "";
            // 前端发 base64 fileData, 存盘到 uploads/图纸/, file_path 记文件名(与 files/save 范式一致)
            var filePath = fileName;
            if (body.TryGetProperty("fileData", out var fd) && fd.ValueKind == System.Text.Json.JsonValueKind.String && !string.IsNullOrEmpty(fd.GetString()))
            {
                var baseDir = Path.Combine(ApiConfig.ResolveDataPath(), "uploads");
                var dir = Path.Combine(baseDir, "图纸");
                Directory.CreateDirectory(dir);
                var full = Path.Combine(dir, fileName);
                if (IsPathSafe(full, baseDir))
                {
                    var data = fd.GetString()!;
                    if (data.Contains(",")) data = data.Split(',')[1];
                    File.WriteAllBytes(full, Convert.FromBase64String(data));
                }
            }
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO drawings (project_id,name,category,file_path,remarks,position,created_by,created_at, last_modified_at) VALUES (@ProjectId,@Name,@Category,@FilePath,@Remarks,@Position,@CreatedBy,@Now, @Now); SELECT last_insert_rowid();",
                new {
                    ProjectId = body.TryGetProperty("projectId", out var p) && p.ValueKind == System.Text.Json.JsonValueKind.Number ? (long?)p.GetInt64() : null,
                    Name = body.TryGetProperty("name", out var n) ? n.GetString() : null,
                    Category = body.TryGetProperty("category", out var c) ? c.GetString() : null,
                    FilePath = filePath,
                    Remarks = body.TryGetProperty("remarks", out var rm) ? rm.GetString() : null,
                    Position = body.TryGetProperty("position", out var pos) ? pos.GetString() : null,
                    Now = now(), CreatedBy = uid
                });
            return Common.Ok(new { id, filePath });
        });

        app.MapPut("/api/drawings", async (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            // 修复: 列名对齐前端契约; 补 404 语义
            using var reader = new System.IO.StreamReader(ctx.Request.Body);
            var bodyText = await reader.ReadToEndAsync();
            var body = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(bodyText);
            var recordId = body.TryGetProperty("id", out var idProp) ? idProp.GetInt64() : 0;
            var affected = await db.ExecuteAsync("UPDATE drawings SET name=@Name,category=@Category,remarks=@Remarks,position=@Position, version=version+1, last_modified_at=@Now WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { Now = now(), Uid = uid, IsAdmin = isAdmin,
                    Id = recordId,
                    Name = body.TryGetProperty("name", out var n) ? n.GetString() : null,
                    Category = body.TryGetProperty("category", out var c) ? c.GetString() : null,
                    Remarks = body.TryGetProperty("remarks", out var rm) ? rm.GetString() : null,
                    Position = body.TryGetProperty("position", out var pos) ? pos.GetString() : null
                });
            return await Common.WriteResult(affected, db, "drawings", recordId);
        });

        app.MapPost("/api/inventory/transactions", async (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // 修复: 列名对齐前端契约(InventoryTransaction type)与真库 —— transaction_date/unit_price/total_amount/counterparty_id/document_no
            // (原 date/notes/operator 是从未与前端匹配的死 schema, 真库用 transaction_date)
            using var reader = new System.IO.StreamReader(ctx.Request.Body);
            var bodyText = await reader.ReadToEndAsync();
            var body = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(bodyText);
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO inventory_transactions (item_id,type,quantity,unit_price,total_amount,project_id,contract_id,counterparty_id,transaction_date,document_no,remarks,created_by,created_at, last_modified_at) VALUES (@ItemId,@Type,@Quantity,@UnitPrice,@TotalAmount,@ProjectId,@ContractId,@CounterpartyId,@TransactionDate,@DocumentNo,@Remarks,@CreatedBy,@Now, @Now); SELECT last_insert_rowid();",
                new {
                    ItemId = body.TryGetProperty("itemId", out var it) && it.ValueKind == System.Text.Json.JsonValueKind.Number ? (long?)it.GetInt64() : null,
                    Type = body.TryGetProperty("type", out var ty) ? ty.GetString() : null,
                    Quantity = body.TryGetProperty("quantity", out var q) && q.ValueKind == System.Text.Json.JsonValueKind.Number ? (decimal?)q.GetDouble() : null,
                    UnitPrice = body.TryGetProperty("unitPrice", out var up) && up.ValueKind == System.Text.Json.JsonValueKind.Number ? (decimal?)up.GetDouble() : null,
                    TotalAmount = body.TryGetProperty("totalAmount", out var ta) && ta.ValueKind == System.Text.Json.JsonValueKind.Number ? (decimal?)ta.GetDouble() : null,
                    ProjectId = body.TryGetProperty("projectId", out var p) && p.ValueKind == System.Text.Json.JsonValueKind.Number ? (long?)p.GetInt64() : null,
                    ContractId = body.TryGetProperty("contractId", out var ci) && ci.ValueKind == System.Text.Json.JsonValueKind.Number ? (long?)ci.GetInt64() : null,
                    CounterpartyId = body.TryGetProperty("counterpartyId", out var cp) && cp.ValueKind == System.Text.Json.JsonValueKind.Number ? (long?)cp.GetInt64() : null,
                    TransactionDate = body.TryGetProperty("transactionDate", out var td) ? td.GetString() : null,
                    DocumentNo = body.TryGetProperty("documentNo", out var dn) ? dn.GetString() : null,
                    Remarks = body.TryGetProperty("remarks", out var rm) ? rm.GetString() : null,
                    Now = now(), CreatedBy = uid
                });
            return Common.Ok(id);
        });

        // ═══════════════════════════════════════════════════════════
        // 文件操作补全
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/files/delete", async (HttpContext ctx) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                // 修复: 原 dynamic dto 在 Minimal API 不绑 body(运行时必抛) → 改读 body JSON
                using var reader = new System.IO.StreamReader(ctx.Request.Body);
                var body = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(await reader.ReadToEndAsync());
                var category = body.TryGetProperty("category", out var c) ? (c.GetString() ?? "未分类") : "未分类";
                var fileName = body.TryGetProperty("fileName", out var f) ? (f.GetString() ?? "") : "";
                var baseDir = Path.Combine(ApiConfig.ResolveDataPath(), "uploads");
                var dir = Path.Combine(baseDir, category);
                var path = Path.Combine(dir, fileName);
                if (!IsPathSafe(path, baseDir)) return Common.Fail("非法路径");
                if (File.Exists(path)) { File.Delete(path); return Common.Ok(); }
                return Common.NotFound("文件不存在");
            }
            catch (Exception ex) { return Common.Fail(Common.Sanitize(ex.Message)); }
        });

        app.MapPost("/api/files/open-external", async (HttpContext ctx) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                // 修复: 原 dynamic dto 不绑 body → 改读 body JSON
                using var reader = new System.IO.StreamReader(ctx.Request.Body);
                var body = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(await reader.ReadToEndAsync());
                var category = body.TryGetProperty("category", out var c) ? (c.GetString() ?? "未分类") : "未分类";
                var fileName = body.TryGetProperty("fileName", out var f) ? (f.GetString() ?? "") : "";
                var baseDir = Path.Combine(ApiConfig.ResolveDataPath(), "uploads");
                var dir = Path.Combine(baseDir, category);
                var path = Path.Combine(dir, fileName);
                if (!IsPathSafe(path, baseDir)) return Common.Fail("非法路径");
                // P0-3: UseShellExecute=true 会用系统默认程序打开文件,必须限制扩展名,
                // 防止上传 .bat/.exe/.ps1 等可执行文件后被远程执行。
                if (!IsOpenableExtension(path)) return Common.Fail("不支持的文件类型,仅允许文档和图片");
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

        app.MapPost("/api/contracts/save-file", async (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B3: 合同附件上传 → contracts:update
            if (!CurrentUser.HasPermission(ctx, db, "contracts:update")) return Results.Forbid();
            try
            {
                // 修复: 原 dynamic dto 不绑 body → 改读 body JSON
                using var reader = new System.IO.StreamReader(ctx.Request.Body);
                var body = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(await reader.ReadToEndAsync());
                var subCategory = body.TryGetProperty("subCategory", out var sc) ? (sc.GetString() ?? "income") : "income";
                var projectName = body.TryGetProperty("projectName", out var pn) ? (pn.GetString() ?? "未分类") : "未分类";
                var fileName = body.TryGetProperty("fileName", out var fn) ? (fn.GetString() ?? "file") : "file";
                var fileData = body.TryGetProperty("fileData", out var fd) ? (fd.GetString() ?? "") : "";
                var baseDir = Path.Combine(ApiConfig.ResolveDataPath(), "uploads");
                var subDir = subCategory == "income" ? "收入" : "支出";
                var dir = Path.Combine(baseDir, projectName, "合同", subDir);
                Directory.CreateDirectory(dir);
                var filePath = Path.Combine(dir, fileName);
                if (!IsPathSafe(filePath, baseDir)) return Common.Fail("非法路径");
                if (!string.IsNullOrEmpty(fileData))
                {
                    var data = fileData;
                    if (data.Contains(",")) data = data.Split(',')[1];
                    File.WriteAllBytes(filePath, Convert.FromBase64String(data));
                }
                return Common.Ok(new { fileName });
            }
            catch (Exception ex) { return Common.Fail(Common.Sanitize(ex.Message)); }
        });
    }
}
