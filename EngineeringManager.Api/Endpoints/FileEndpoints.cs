using System.Data;
using System.Diagnostics;
using Dapper;

namespace EngineeringManager.Api;

/// <summary>
/// 文件操作 + 图纸 + 合同文件端点
/// </summary>
public static class FileEndpoints
{
    public static void RegisterFileEndpoints(this WebApplication app)
    {
        var now = () => DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

        // ═══════════════════════════════════════════════════════════
        // 文件操作（简化版）
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/files/save", (FileSaveDto dto) =>
        {
            try
            {
                var baseDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "工程管家", "uploads");
                var dir = Path.Combine(baseDir, dto.Category ?? "未分类");
                Directory.CreateDirectory(dir);
                var filePath = Path.Combine(dir, dto.FileName ?? "file");
                if (!string.IsNullOrEmpty(dto.FileData))
                {
                    var data = dto.FileData;
                    if (data.Contains(",")) data = data.Split(',')[1];
                    File.WriteAllBytes(filePath, Convert.FromBase64String(data));
                }
                return Common.Ok(new { fileName = dto.FileName });
            }
            catch (Exception ex) { return Common.Fail(ex.Message); }
        });

        app.MapGet("/api/files/read", (string category, string fileName, string? projectName) =>
        {
            try
            {
                var baseDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "工程管家", "uploads");
                var paths = new[]
                {
                    Path.Combine(baseDir, projectName ?? "", category, fileName),
                    Path.Combine(baseDir, "未分类", category, fileName),
                    Path.Combine(baseDir, "_common", category, fileName),
                };
                foreach (var p in paths)
                {
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
                return Common.Fail("文件不存在");
            }
            catch (Exception ex) { return Common.Fail(ex.Message); }
        });

        // ═══════════════════════════════════════════════════════════
        // 图纸
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/drawings", (IDbConnection db, long? projectId) =>
        {
            var sql = "SELECT * FROM drawings";
            if (projectId.HasValue) sql += " WHERE project_id=@ProjectId";
            sql += " ORDER BY created_at DESC";
            return Common.Ok(db.Query(sql, new { ProjectId = projectId }));
        });

        app.MapDelete("/api/drawings/{id}", async (long id, IDbConnection db) =>
            (await db.ExecuteAsync("DELETE FROM drawings WHERE id=@Id", new { Id = id })) > 0 ? Common.Ok() : Common.Fail("图纸不存在"));

        // ═══════════════════════════════════════════════════════════
        // 图纸写操作（补全）
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/drawings", async (dynamic dto, IDbConnection db) =>
        {
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO drawings (project_id,name,file_url,file_name,drawing_type,scale,notes,created_at,updated_at)
                VALUES (@ProjectId,@Name,@FileUrl,@FileName,@DrawingType,@Scale,@Notes,@Now,@Now); SELECT last_insert_rowid();",
                new { Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/drawings", async (dynamic dto, IDbConnection db) =>
        {
            var affected = await db.ExecuteAsync("UPDATE drawings SET name=@Name,notes=@Notes,updated_at=@Now WHERE id=@Id",
                new { Now = now() });
            return affected > 0 ? Common.Ok() : Common.Fail("图纸不存在");
        });

        app.MapPut("/api/expenses", async (dynamic dto, IDbConnection db) =>
        {
            var affected = await db.ExecuteAsync(@"UPDATE expenses SET category=@Category,amount=@Amount,date=@Date,description=@Description,vendor=@Vendor,updated_at=@Now WHERE id=@Id",
                new { Now = now() });
            return affected > 0 ? Common.Ok() : Common.Fail("费用不存在");
        });

        app.MapPost("/api/inventory/transactions", async (dynamic dto, IDbConnection db) =>
        {
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO inventory_transactions (item_id,type,quantity,date,notes,operator,created_at)
                VALUES (@ItemId,@Type,@Quantity,@Date,@Notes,@Operator,@Now); SELECT last_insert_rowid();",
                new { Now = now() });
            return Common.Ok(id);
        });

        // ═══════════════════════════════════════════════════════════
        // 文件操作补全
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/files/delete", (dynamic dto) =>
        {
            try
            {
                var baseDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "工程管家", "uploads");
                var dir = Path.Combine(baseDir, (string)(dto.category ?? "未分类"));
                var path = Path.Combine(dir, (string)(dto.fileName ?? ""));
                if (File.Exists(path)) { File.Delete(path); return Common.Ok(); }
                return Common.Fail("文件不存在");
            }
            catch (Exception ex) { return Common.Fail(ex.Message); }
        });

        app.MapPost("/api/files/open-external", (dynamic dto) =>
        {
            try
            {
                var baseDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "工程管家", "uploads");
                var dir = Path.Combine(baseDir, (string)(dto.category ?? "未分类"));
                var path = Path.Combine(dir, (string)(dto.fileName ?? ""));
                if (File.Exists(path)) { Process.Start(new ProcessStartInfo(path) { UseShellExecute = true }); return Common.Ok(); }
                return Common.Fail("文件不存在");
            }
            catch (Exception ex) { return Common.Fail(ex.Message); }
        });

        app.MapGet("/api/contracts/read-file", (string fileName, string subCategory, string? projectName) =>
        {
            try
            {
                var baseDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "工程管家", "uploads");
                var paths = new[]
                {
                    Path.Combine(baseDir, projectName ?? "", "合同", subCategory == "income" ? "收入" : "支出", fileName),
                    Path.Combine(baseDir, "未分类", "合同", subCategory == "income" ? "收入" : "支出", fileName),
                };
                foreach (var p in paths)
                {
                    if (File.Exists(p))
                    {
                        var bytes = File.ReadAllBytes(p);
                        var ext = Path.GetExtension(p).ToLower();
                        var mime = ext switch { ".pdf" => "application/pdf", ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document", _ => "application/octet-stream" };
                        return Common.Ok(new { dataUrl = $"data:{mime};base64,{Convert.ToBase64String(bytes)}", mimeType = mime });
                    }
                }
                return Common.Fail("文件不存在");
            }
            catch (Exception ex) { return Common.Fail(ex.Message); }
        });

        app.MapPost("/api/contracts/save-file", (dynamic dto) =>
        {
            try
            {
                var baseDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "工程管家", "uploads");
                var subDir = (string)(dto.subCategory ?? "income") == "income" ? "收入" : "支出";
                var dir = Path.Combine(baseDir, (string)(dto.projectName ?? "未分类"), "合同", subDir);
                Directory.CreateDirectory(dir);
                var filePath = Path.Combine(dir, (string)(dto.fileName ?? "file"));
                if (!string.IsNullOrEmpty((string)(dto.fileData ?? "")))
                {
                    var data = (string)dto.fileData;
                    if (data.Contains(",")) data = data.Split(',')[1];
                    File.WriteAllBytes(filePath, Convert.FromBase64String(data));
                }
                return Common.Ok(new { fileName = (string)(dto.fileName ?? "") });
            }
            catch (Exception ex) { return Common.Fail(ex.Message); }
        });
    }
}
