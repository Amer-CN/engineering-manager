using System.Data;
using Dapper;
using EngineeringManager.Api.Security;
using EngineeringManager.Api.Services;
using EngineeringManager.Api.Services.Stt;
using Microsoft.Extensions.DependencyInjection;

namespace EngineeringManager.Api;

/// <summary>
/// 语音转文字 (STT) 端点
/// 结构参照 OcrEndpoints：文件进→后台处理→出文本
/// 鉴权沿用 GlobalAuthMiddleware（白名单不包含 /api/stt/*，必须登录）
/// </summary>
public static class SttEndpoints
{
    // 允许的音频格式（.webm 为浏览器录音默认格式，ffmpeg 预处理可解码）
    private static readonly HashSet<string> AllowedAudioExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".wav", ".mp3", ".m4a", ".aac", ".flac", ".ogg", ".wma", ".amr", ".opus", ".webm"
    };

    // 音频大小上限：500MB
    private const long MaxAudioSize = 500 * 1024 * 1024;

    public static void RegisterSttEndpoints(this WebApplication app)
    {
        // ═══════════════════════════════════════════════════════════
        // POST /api/stt/upload — multipart/form-data 流式上传音频文件
        // 不使用 base64 JSON，避免大文件内存膨胀
        // ═══════════════════════════════════════════════════════════
        app.MapPost("/api/stt/upload", async (
            HttpContext ctx) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                var form = await ctx.Request.ReadFormAsync(ctx.RequestAborted);
                var file = form.Files.FirstOrDefault(f => f.Name == "file");

                if (file == null || file.Length == 0)
                    return Common.Fail("请选择音频文件");

                if (file.Length > MaxAudioSize)
                    return Common.Fail($"文件过大 ({file.Length / 1024 / 1024}MB)，上限 {MaxAudioSize / 1024 / 1024}MB");

                // 校验扩展名（使用原始文件名的扩展名）
                var originalExt = Path.GetExtension(file.FileName).ToLowerInvariant();
                if (!AllowedAudioExtensions.Contains(originalExt))
                    return Common.Fail($"不支持的音频格式: {originalExt}，支持的格式: {string.Join(", ", AllowedAudioExtensions)}");

                // 构造安全存储路径：uploads/stt/<uid>/<Guid>.<ext>
                var uploadsBase = Path.Combine(ApiConfig.ResolveDataPath(), "uploads");
                var sttDir = Path.Combine(uploadsBase, "stt", uid);
                Directory.CreateDirectory(sttDir);

                var storedName = $"{Guid.NewGuid():N}{originalExt}";
                var tempPath = Path.Combine(sttDir, $"{storedName}.uploading");
                var finalPath = Path.Combine(sttDir, storedName);

                // 路径穿越防护 — 允许根为当前用户的 stt 目录，而非整个 uploads
                if (!IsPathSafe(finalPath, sttDir))
                    return Common.Fail("非法路径");

                // 流式写入 .uploading 临时文件，完成后原子改名
                // H-4（M4 flaky 根治）：用 finally 兜底清理——catch 只删「抛异常」路径，
                // 若 RequestAborted 在 await using 释放与 catch 之间竞态，临时文件会残留。
                // finally 在任何退出路径（成功改名后 temp 已不存在=无操作 / 异常=删除）都执行。
                try
                {
                    await using (var fileStream = File.Create(tempPath))
                    {
                        await file.CopyToAsync(fileStream, ctx.RequestAborted);
                    }
                    File.Move(tempPath, finalPath);
                }
                finally
                {
                    // 成功路径：File.Move 后 tempPath 已不存在，删除是无操作；
                    // 失败/取消路径：删除不完整临时文件。
                    // H-4（M4 flaky 根治）：取消时 CopyToAsync 抛异常，await using 释放
                    // 文件句柄与 finally 删除之间在 Windows 上有竞态——File.Delete 可能抛
                    // 共享冲突（IOException / UnauthorizedAccessException）。最宽兜底 +
                    // 记录异常类型（不静默吞死），重试 5 次×100ms。
                    for (var attempt = 0; attempt < 5 && File.Exists(tempPath); attempt++)
                    {
                        try
                        {
                            File.Delete(tempPath);
                            break;
                        }
                        catch (Exception ex)
                        {
                            if (attempt == 4)
                                Console.Error.WriteLine($"[SttEndpoints] .uploading 清理失败(重试5次仍锁住): {tempPath} — {ex.GetType().Name}: {ex.Message}");
                            await Task.Delay(100);
                        }
                    }
                }

                // 返回相对 uploads/ 的路径，可直接传给 POST /api/stt/transcribe
                var relativePath = $"stt/{uid}/{storedName}";

                return Results.Ok(new
                {
                    success = true,
                    data = new
                    {
                        filePath = relativePath,
                        originalName = file.FileName,
                        size = file.Length,
                        extension = originalExt,
                    }
                });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[SttEndpoints] 上传音频失败: {ex.Message}");
                return Common.ServerError("上传音频", ex);
            }
        }).DisableAntiforgery();

        // ═══════════════════════════════════════════════════════════
        // POST /api/stt/transcribe — 创建转写任务
        // ═══════════════════════════════════════════════════════════
        app.MapPost("/api/stt/transcribe", (HttpContext ctx, IDbConnection db, SttTranscribeDto dto) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                // 验证文件路径（安全检查优先于服务可用性检查）
                if (string.IsNullOrWhiteSpace(dto.FilePath))
                    return Common.Fail("请提供音频文件路径");

                // 安全：FilePath 格式为 stt/<uid>/<file>（相对于 uploads/）
                // 解析时以 uploads/ 为根目录，然后验证结果在当前用户的 stt/<uid>/ 内
                var uploadsBase = Path.Combine(ApiConfig.ResolveDataPath(), "uploads");
                var userSttDir = Path.Combine(uploadsBase, "stt", uid);
                var fullPath = Path.Combine(uploadsBase, dto.FilePath.Replace('\\', '/').TrimStart('/'));
                var resolvedFull = Path.GetFullPath(fullPath);
                var resolvedDir = Path.GetFullPath(userSttDir);

                // 路径穿越防护：解析后的完整路径必须仍在当前用户的 stt 目录内
                if (!resolvedFull.StartsWith(resolvedDir + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
                    return Common.Fail("无权访问该文件路径");

                if (!File.Exists(resolvedFull))
                    return Common.Fail($"音频文件不存在: {dto.FilePath}");

                var ext = Path.GetExtension(resolvedFull);
                if (!AllowedAudioExtensions.Contains(ext))
                    return Common.Fail($"不支持的音频格式: {ext}，支持的格式: {string.Join(", ", AllowedAudioExtensions)}");

                var fileSize = new FileInfo(resolvedFull).Length;
                if (fileSize > MaxAudioSize)
                    return Common.Fail($"音频文件过大 ({fileSize / 1024 / 1024}MB)，上限 {MaxAudioSize / 1024 / 1024}MB");

                // 检查本地转写是否可用（安全检查通过后再检查服务可用性）
                // 返回 503 ServiceUnavailable 而非 400，区分"请求非法"和"服务不可用"
                if (!SttEngineSelector.CanUseLocalStt())
                {
                    return Results.Json(new { success = false, error = $"本地语音转文字不可用: {SttEngineSelector.GetUnavailableReason()}。可使用云端转写（即将推出）。" }, statusCode: 503);
                }

                var now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

                // 创建 job
                var jobId = db.QuerySingle<long>(@"
                    INSERT INTO stt_jobs
                        (source_file, source_path, source_type, engine, status, progress,
                         is_multi_speaker, num_speakers, hotwords,
                         created_at, updated_at, created_by)
                    VALUES
                        (@SourceFile, @SourcePath, 'audio', 'qwen3-asr-1.7b-gguf', 'pending', 0,
                         @IsMulti, @NumSpeakers, @Hotwords,
                         @Now, @Now, @Uid);
                    SELECT last_insert_rowid();",
                    new
                    {
                        SourceFile = Path.GetFileName(dto.FilePath),
                        SourcePath = dto.FilePath, // 存相对路径，worker 用 ResolveDataPath 拼完整路径
                        IsMulti = dto.IsMultiSpeaker ? 1 : 0,
                        NumSpeakers = dto.NumSpeakers,
                        Hotwords = dto.Context,
                        Now = now,
                        Uid = uid,
                    });

                return Results.Ok(new { success = true, data = new { jobId, status = "pending" } });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[SttEndpoints] 创建转写任务失败: {ex.Message}");
                return Common.ServerError("创建转写任务", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // GET /api/stt/jobs/{id} — 查询任务状态/结果
        // ═══════════════════════════════════════════════════════════
        app.MapGet("/api/stt/jobs/{id}", (HttpContext ctx, IDbConnection db, long id) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                var job = db.QueryFirstOrDefault<dynamic>(
                    @"SELECT id, source_file, engine, status, progress, is_multi_speaker,
                             num_speakers, result_text, result_json, duration_sec, elapsed_sec,
                             error, created_at, updated_at
                      FROM stt_jobs WHERE id = @Id AND created_by = @Uid",
                    new { Id = id, Uid = uid });

                if (job == null)
                    return Common.NotFound("转写任务不存在");

                // 解析 result_json 为 segments
                List<object>? segments = null;
                if (job.result_json != null)
                {
                    try
                    {
                        segments = System.Text.Json.JsonSerializer.Deserialize<List<object>>(job.result_json);
                    }
                    catch { }
                }

                return Results.Ok(new
                {
                    success = true,
                    data = new
                    {
                        id = job.id,
                        sourceFile = job.source_file,
                        engine = job.engine,
                        status = job.status,
                        progress = job.progress,
                        isMultiSpeaker = job.is_multi_speaker == 1,
                        numSpeakers = job.num_speakers,
                        text = job.result_text,
                        segments,
                        durationSec = job.duration_sec,
                        elapsedSec = job.elapsed_sec,
                        error = job.error,
                        createdAt = job.created_at,
                        updatedAt = job.updated_at,
                    }
                });
            }
            catch (Exception ex)
            {
                return Common.ServerError("查询转写任务", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // GET /api/stt/jobs/{id}/audio — 流式返回任务源音频（历史任务可回放）
        // 归属校验（created_by）+ IsPathSafe 路径穿越防护 + 按扩展名映射 Content-Type
        // ═══════════════════════════════════════════════════════════
        app.MapGet("/api/stt/jobs/{id}/audio", (HttpContext ctx, IDbConnection db, long id) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                var sourcePath = db.ExecuteScalar<string?>(
                    "SELECT source_path FROM stt_jobs WHERE id = @Id AND created_by = @Uid",
                    new { Id = id, Uid = uid });

                if (sourcePath == null)
                    return Common.NotFound("转写任务不存在");

                var uploadsBase = Path.Combine(ApiConfig.ResolveDataPath(), "uploads");
                var userSttDir = Path.GetFullPath(Path.Combine(uploadsBase, "stt", uid));
                var fullPath = Path.Combine(uploadsBase, sourcePath.Replace('\\', '/').TrimStart('/'));
                var resolvedFull = Path.GetFullPath(fullPath);

                // 路径穿越防护：解析后的完整路径必须仍在当前用户的 stt/<uid>/ 内
                if (!IsPathSafe(resolvedFull, userSttDir))
                    return Common.Fail("非法路径");

                if (!File.Exists(resolvedFull))
                    return Common.NotFound("音频文件不存在");

                var contentType = Path.GetExtension(resolvedFull).ToLowerInvariant() switch
                {
                    ".m4a" => "audio/mp4",
                    ".mp3" => "audio/mpeg",
                    ".wav" => "audio/wav",
                    ".webm" => "audio/webm",
                    _ => "application/octet-stream",
                };

                // 流式返回（Results.Stream 会在响应完成后释放流，不要 using 包裹）
                var fs = new FileStream(resolvedFull, FileMode.Open, FileAccess.Read, FileShare.Read);
                return Results.Stream(fs, contentType);
            }
            catch (Exception ex)
            {
                return Common.ServerError("获取任务音频", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // GET /api/stt/jobs — 当前用户任务列表
        // ═══════════════════════════════════════════════════════════
        app.MapGet("/api/stt/jobs", (HttpContext ctx, IDbConnection db, int page = 1, int size = 20) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                var offset = (page - 1) * size;
                var jobs = db.Query<dynamic>(
                    @"SELECT id, source_file, engine, status, progress, is_multi_speaker,
                             duration_sec, elapsed_sec, error, created_at, updated_at
                      FROM stt_jobs
                      WHERE created_by = @Uid
                      ORDER BY created_at DESC
                      LIMIT @Size OFFSET @Offset",
                    new { Uid = uid, Size = size, Offset = offset });

                var total = db.ExecuteScalar<int>(
                    "SELECT COUNT(*) FROM stt_jobs WHERE created_by = @Uid",
                    new { Uid = uid });

                // 显式映射为 camelCase，与 GET /api/stt/jobs/{id} 响应契约一致
                var mappedJobs = jobs.Select(j => new
                {
                    id = j.id,
                    sourceFile = j.source_file,
                    engine = j.engine,
                    status = j.status,
                    progress = j.progress,
                    isMultiSpeaker = j.is_multi_speaker == 1,
                    durationSec = j.duration_sec,
                    elapsedSec = j.elapsed_sec,
                    error = j.error,
                    createdAt = j.created_at,
                    updatedAt = j.updated_at,
                }).ToList();

                return Results.Ok(new { success = true, data = new { data = mappedJobs, total, page, size } });
            }
            catch (Exception ex)
            {
                return Common.ServerError("查询任务列表", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // GET /api/stt/status — 转写能力检测（前端用来决定是否显示 STT 入口）
        // ═══════════════════════════════════════════════════════════
        app.MapGet("/api/stt/status", (HttpContext ctx) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                var gpu = SttEngineSelector.Detect();
                var asrReady = SttModelManager.IsAsrModelAvailable();
                var diarizationReady = SttModelManager.IsDiarizationModelAvailable();

                return Results.Ok(new
                {
                    success = true,
                    data = new
                    {
                        canTranscribe = SttEngineSelector.CanUseLocalStt() && asrReady,
                        canDiarize = diarizationReady,
                        gpu = new
                        {
                            hasDiscreteGpu = gpu.HasDiscreteGpu,
                            name = gpu.GpuName,
                            vramMb = gpu.VramMb,
                            supportsVulkan = gpu.SupportsVulkan,
                            allGpus = gpu.AllGpus,
                        },
                        asrModelReady = asrReady,
                        diarizationModelReady = diarizationReady,
                        unavailableReason = SttEngineSelector.CanUseLocalStt() ? "" : SttEngineSelector.GetUnavailableReason(),
                    }
                });
            }
            catch (Exception ex)
            {
                return Common.ServerError("检测转写能力", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // POST /api/stt/jobs/{id}/ingest — 把校对后文本送入知识库
        // 支持可选 SttIngestDto：body 为空时兼容旧行为（使用 job.result_text）
        // body.text 有值时使用校对后文本入库
        // ═══════════════════════════════════════════════════════════
        app.MapPost("/api/stt/jobs/{id}/ingest", async (
            HttpContext ctx,
            IDbConnection db,
            IEmbeddingService embedding,
            long id,
            SttIngestDto? dto) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx);
            // 服务端权限检查：入库是写操作，必须拥有 knowledge:create 权限（M3 收严）
            if (!CurrentUser.HasPermission(ctx, db, "knowledge:create"))
                return Results.Json(new { success = false, error = "无权限：需要 knowledge:create" }, statusCode: 403);
            try
            {
                // 1. 查 STT job（含用户维度过滤 — job 必须属于当前用户）
                var job = db.QueryFirstOrDefault<dynamic>(
                    @"SELECT id, source_file, result_text, result_json, duration_sec,
                             is_multi_speaker, created_at, created_by
                      FROM stt_jobs WHERE id = @Id AND created_by = @Uid",
                    new { Id = id, Uid = uid });

                if (job == null)
                    return Common.NotFound("转写任务不存在");

                // 2. 决定入库文本和 segments
                string fullText;
                List<SttSegment>? segments = null;

                // 先尝试从 DB 解析原始 segments（用于保留说话人元数据）
                List<SttSegment>? originalSegments = null;
                if (job.result_json != null)
                {
                    try
                    {
                        var segData = System.Text.Json.JsonSerializer.Deserialize<List<JsonSegment>>(
                            (string)job.result_json);
                        originalSegments = segData?.Select(s => new SttSegment
                        {
                            Speaker = s.Speaker,
                            Start = s.Start,
                            End = s.End,
                            Text = s.Text ?? "",
                        }).ToList();
                    }
                    catch { /* 解析失败不影响入库 */ }
                }

                if (dto != null && dto.Text != null)
                {
                    // 用户显式提供了校对文本 — 必须非空
                    if (string.IsNullOrWhiteSpace(dto.Text))
                        return Common.Fail("校对文本不能为空");

                    // 限制全文长度（100KB）
                    if (dto.Text.Length > 100_000)
                        return Common.Fail("文本内容过长（上限 100KB）");

                    fullText = dto.Text!;

                    // 使用校对后 segments（如有）
                    if (dto.Segments != null && dto.Segments.Count > 0)
                    {
                        // 限制 segments 数量（上限 5000）
                        if (dto.Segments.Count > 5000)
                            return Common.Fail("segments 数量过多（上限 5000）");

                        // 服务端校验 segments 数据合法性
                        var speakerSet = new HashSet<int>();
                        foreach (var s in dto.Segments)
                        {
                            if (s.Speaker < 1)
                                return Common.Fail("segments 中 speaker 必须 >= 1");
                            if (s.Start < 0 || s.End < 0)
                                return Common.Fail("segments 中时间戳不能为负数");
                            if (s.End < s.Start)
                                return Common.Fail("segments 中 end 不能小于 start");
                            if (string.IsNullOrWhiteSpace(s.Text))
                                return Common.Fail("segments 中 text 不能为空");
                            if (s.Text.Length > 10_000)
                                return Common.Fail("segments 中单段 text 过长（上限 10KB）");
                            speakerSet.Add(s.Speaker);
                        }

                        // 校验说话人编号为连续的 1..N
                        var sortedSpeakers = speakerSet.OrderBy(x => x).ToList();
                        for (int idx = 0; idx < sortedSpeakers.Count; idx++)
                        {
                            if (sortedSpeakers[idx] != idx + 1)
                                return Common.Fail($"segments 中说话人编号必须从 1 开始连续，缺失说话人 {idx + 1}");
                        }

                        // 校验 segments 重组文本与 dto.Text 一致
                        // 前端 rebuildFullText 格式：【说话人N】文本（每段一行，用 \n 连接）
                        var recomposed = string.Join("\n",
                            dto.Segments
                               .Where(s => !string.IsNullOrWhiteSpace(s.Text))
                               .Select(s => $"【说话人{s.Speaker}】{s.Text!.Trim()}"));
                        if (!string.Equals(recomposed.Trim(), fullText.Trim(), StringComparison.OrdinalIgnoreCase))
                            return Common.Fail("segments 重组文本与提交的全文不一致，请确保校对后同步修改了 segments 或全文");

                        segments = dto.Segments.Select(s => new SttSegment
                        {
                            Speaker = s.Speaker,
                            Start = s.Start,
                            End = s.End,
                            Text = s.Text ?? "",
                        }).ToList();
                    }
                    else
                    {
                        // 只传校对文本而不传 segments → 保留原始 segments 的说话人元数据
                        segments = originalSegments;
                    }
                }
                else
                {
                    // 兼容旧行为：无 body 或无 text 字段 → 使用数据库原始 result_text
                    if (string.IsNullOrEmpty((string?)job.result_text))
                        return Common.Fail("转写结果为空，无法入库");

                    fullText = job.result_text;
                    segments = originalSegments;
                }

                if (string.IsNullOrWhiteSpace(fullText))
                    return Common.Fail("文本内容不能为空");

                // 3. 项目权限检查
                int? projectId = dto?.ProjectId;
                if (projectId.HasValue && !KnowledgeBaseService.CanAccessProject(db, projectId.Value, uid, isAdmin))
                    return Results.Json(new { success = false, error = "无权操作该项目" }, statusCode: 403);

                // 4. 入库（幂等：同一 stt_job 重复调用返回已有 docId）
                var service = new KnowledgeBaseService(db, embedding);
                var result = await service.IngestAsync(
                    fullText: fullText,
                    title: dto?.Title ?? $"{job.source_file}",
                    sourceType: "call",
                    sourceRef: id.ToString(),
                    projectId: projectId,
                    folderId: dto?.FolderId,
                    createdBy: uid,
                    segments: segments,
                    occurredAt: dto?.OccurredAt ?? (string?)job.created_at);

                return Results.Ok(new
                {
                    success = true,
                    data = new
                    {
                        documentId = result.DocumentId,
                        idempotent = result.Idempotent,
                        hasEmbeddings = result.HasEmbeddings,
                        message = result.Idempotent
                            ? $"转写文本已入库（幂等命中），文档 ID: {result.DocumentId}"
                            : $"转写文本已入库，文档 ID: {result.DocumentId}",
                    }
                });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[SttEndpoints] 入库失败: {ex.Message}");
                return Common.ServerError("转写入库", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // POST /api/stt/jobs/{id}/insights — 智能速览（关键词/全文概要/章节速览）
        // 一次 LLM 调用生成三件套，现算不持久化；提示词组装与 JSON 防御解析在 SttInsightsService
        // ═══════════════════════════════════════════════════════════
        app.MapPost("/api/stt/jobs/{id}/insights", async (HttpContext ctx, IDbConnection db, long id) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // 权限检查：voice 页面路由本身要求 voice:read（App.tsx RequirePermission）
            if (!CurrentUser.HasPermission(ctx, db, "voice:read"))
                return Results.Json(new { success = false, error = "无权限：需要 voice:read" }, statusCode: 403);
            try
            {
                var job = db.QueryFirstOrDefault<dynamic>(
                    @"SELECT result_text, result_json, duration_sec
                      FROM stt_jobs WHERE id = @Id AND created_by = @Uid",
                    new { Id = id, Uid = uid });

                if (job == null)
                    return Common.NotFound("转写任务不存在");
                if (string.IsNullOrWhiteSpace((string?)job.result_text))
                    return Common.Fail("转写结果为空，无法生成速览");

                // 解析 result_json 为 segments（章节 startSec 需要各段 start 秒数）
                List<JsonSegment>? segments = null;
                if (job.result_json != null)
                {
                    try
                    {
                        segments = System.Text.Json.JsonSerializer.Deserialize<List<JsonSegment>>((string)job.result_json);
                    }
                    catch { /* 解析失败退回纯文本，不阻断速览 */ }
                }

                // LLM 服务从 RequestServices 解析；SttInsightsService 不注册 DI（避免改 Program.cs）
                // 注意：(string) 先把 dynamic 转成静态 string —— dynamic 实参会把整个调用
                // 变成运行时绑定，导致返回元组无法 var 解构（CS8130）
                var resultText = (string)job.result_text;
                var llm = ctx.RequestServices.GetRequiredService<ILlmChatService>();
                var service = new SttInsightsService(llm);
                double durationSec = job.duration_sec == null ? 0 : Convert.ToDouble(job.duration_sec);
                var (ok, result, error) = await service.GenerateAsync(resultText, segments, durationSec);
                if (!ok || result == null)
                    return Results.Json(new { success = false, error = error ?? "速览生成失败" }, statusCode: 502);

                return Results.Ok(new
                {
                    success = true,
                    data = new
                    {
                        keywords = result.Keywords,
                        summary = result.Summary,
                        chapters = result.Chapters.Select(c => new { startSec = c.StartSec, title = c.Title }),
                    }
                });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[SttEndpoints] 生成速览失败: {ex.Message}");
                return Common.ServerError("生成速览", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // POST /api/stt/jobs/{id}/cancel — 取消任务
        // 只接受 pending/running/processing；completed/failed/cancelled 拒绝
        // ═══════════════════════════════════════════════════════════
        app.MapPost("/api/stt/jobs/{id}/cancel", (HttpContext ctx, IDbConnection db, long id) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // 权限检查：voice 页面路由本身要求 voice:read（App.tsx RequirePermission）
            if (!CurrentUser.HasPermission(ctx, db, "voice:read"))
                return Results.Json(new { success = false, error = "无权限：需要 voice:read" }, statusCode: 403);
            try
            {
                var status = db.ExecuteScalar<string?>(
                    "SELECT status FROM stt_jobs WHERE id = @Id AND created_by = @Uid",
                    new { Id = id, Uid = uid });

                if (status == null)
                    return Common.NotFound("转写任务不存在");

                if (status != "pending" && status != "running" && status != "processing")
                    return Common.Fail($"任务当前状态为 {status}，无法取消");

                db.Execute(
                    "UPDATE stt_jobs SET status = 'cancelled', updated_at = @Now WHERE id = @Id AND created_by = @Uid",
                    new { Now = Common.NowString(), Id = id, Uid = uid });

                return Results.Ok(new { success = true, data = new { id, status = "cancelled" } });
            }
            catch (Exception ex)
            {
                return Common.ServerError("取消转写任务", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // POST /api/stt/jobs/{id}/retry — 重试失败任务
        // 只接受 failed；重置为 pending 交回 SttWorker 重新排队
        // ═══════════════════════════════════════════════════════════
        app.MapPost("/api/stt/jobs/{id}/retry", (HttpContext ctx, IDbConnection db, long id) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // 权限检查：voice 页面路由本身要求 voice:read（App.tsx RequirePermission）
            if (!CurrentUser.HasPermission(ctx, db, "voice:read"))
                return Results.Json(new { success = false, error = "无权限：需要 voice:read" }, statusCode: 403);
            try
            {
                var status = db.ExecuteScalar<string?>(
                    "SELECT status FROM stt_jobs WHERE id = @Id AND created_by = @Uid",
                    new { Id = id, Uid = uid });

                if (status == null)
                    return Common.NotFound("转写任务不存在");

                if (status != "failed")
                    return Common.Fail($"任务当前状态为 {status}，只有失败的任务可以重试");

                db.Execute(
                    "UPDATE stt_jobs SET status = 'pending', progress = 0, error = NULL, updated_at = @Now WHERE id = @Id AND created_by = @Uid",
                    new { Now = Common.NowString(), Id = id, Uid = uid });

                return Results.Ok(new { success = true, data = new { id, status = "pending" } });
            }
            catch (Exception ex)
            {
                return Common.ServerError("重试转写任务", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // DELETE /api/stt/jobs/{id} — 删除任务记录
        // 只接受 completed/failed/cancelled；进行中的任务先取消再删除
        // ═══════════════════════════════════════════════════════════
        app.MapDelete("/api/stt/jobs/{id}", (HttpContext ctx, IDbConnection db, long id) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // 权限检查：voice 页面路由本身要求 voice:read（App.tsx RequirePermission）
            if (!CurrentUser.HasPermission(ctx, db, "voice:read"))
                return Results.Json(new { success = false, error = "无权限：需要 voice:read" }, statusCode: 403);
            try
            {
                var status = db.ExecuteScalar<string?>(
                    "SELECT status FROM stt_jobs WHERE id = @Id AND created_by = @Uid",
                    new { Id = id, Uid = uid });

                if (status == null)
                    return Common.NotFound("转写任务不存在");

                if (status != "completed" && status != "failed" && status != "cancelled")
                    return Common.Fail($"任务当前状态为 {status}，进行中的任务不能删除");

                db.Execute(
                    "DELETE FROM stt_jobs WHERE id = @Id AND created_by = @Uid",
                    new { Id = id, Uid = uid });

                return Results.Ok(new { success = true, data = new { id } });
            }
            catch (Exception ex)
            {
                return Common.ServerError("删除转写任务", ex);
            }
        });
    }

    // ═══════════════════════════════════════════════════════════
    // 路径穿越防护（与 FileEndpoints 一致）
    // ═══════════════════════════════════════════════════════════
    private static bool IsPathSafe(string fullPath, string allowedBase)
    {
        var resolved = Path.GetFullPath(fullPath);
        var baseResolved = Path.GetFullPath(allowedBase);
        return resolved.StartsWith(baseResolved, StringComparison.OrdinalIgnoreCase);
    }
}

/// <summary>STT 转写请求 DTO</summary>
public class SttTranscribeDto
{
    public string FilePath { get; set; } = "";
    public bool IsMultiSpeaker { get; set; } = false;
    public int? NumSpeakers { get; set; }
    public string? Context { get; set; }
}

/// <summary>STT 入库 DTO — 校对后文本/segments/标题/项目/时间</summary>
public class SttIngestDto
{
    public string? Text { get; set; }
    public List<SttSegmentDto>? Segments { get; set; }
    public string? Title { get; set; }
    public int? ProjectId { get; set; }
    public long? FolderId { get; set; }
    public string? OccurredAt { get; set; }
}

/// <summary>STT segment DTO（前端校对后传回）</summary>
public class SttSegmentDto
{
    public int Speaker { get; set; }
    public double Start { get; set; }
    public double End { get; set; }
    public string? Text { get; set; }
}

/// <summary>用于反序列化 stt_jobs.result_json</summary>
public class JsonSegment
{
    [System.Text.Json.Serialization.JsonPropertyName("speaker")]
    public int Speaker { get; set; }
    [System.Text.Json.Serialization.JsonPropertyName("start")]
    public double Start { get; set; }
    [System.Text.Json.Serialization.JsonPropertyName("end")]
    public double End { get; set; }
    [System.Text.Json.Serialization.JsonPropertyName("text")]
    public string? Text { get; set; }
}
