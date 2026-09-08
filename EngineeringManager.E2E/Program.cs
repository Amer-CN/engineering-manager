// M2 E2E 验收脚本：真实录音 → STT 转写 → 入库 → 混合检索
// 用法: dotnet run --project EngineeringManager.E2E [--clean] [--semantic-test]
using System.Data;
using System.Text.Json;
using Dapper;
using EngineeringManager.Api.Services;
using EngineeringManager.Api.Services.Stt;
using Microsoft.Data.Sqlite;

// ═══════════════════════════════════════════════════════════
// 1. 连接数据库 + 运行迁移
// ═══════════════════════════════════════════════════════════
var dbPath = Path.Combine("F:\\Company Database", "engineering.db");
Console.WriteLine($"[E2E] 数据库路径: {dbPath}");
if (!File.Exists(dbPath)) { Console.WriteLine("[E2E] 数据库不存在!"); return; }

// 命令行参数
var cleanMode = args.Contains("--clean");
var semanticTestMode = args.Contains("--semantic-test");

// 设置数据路径（ApiConfig 需要读取 config.json）
Environment.SetEnvironmentVariable("ENGINEERING_MANAGER_DATA_PATH", "F:\\Company Database");
var configPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "工程管家", "config.json");
Console.WriteLine($"[E2E] config.json 路径: {configPath}, 存在: {File.Exists(configPath)}");

// 运行迁移
Console.WriteLine("[E2E] 运行数据库迁移...");
EngineeringManager.Api.Migrations.MigrationRunner.Run($"Data Source={dbPath}");
Console.WriteLine("[E2E] 迁移完成");

using var conn = new SqliteConnection($"Data Source={dbPath}");
conn.Open();

// --clean: 删除所有旧数据
if (cleanMode)
{
    Console.WriteLine("[E2E] --clean 模式：删除所有旧 STT/knowledge 数据...");
    conn.Execute("DELETE FROM stt_jobs");
    conn.Execute("DELETE FROM knowledge_documents");
    conn.Execute("DELETE FROM knowledge_chunks");
    conn.Execute("DELETE FROM knowledge_fts");
    Console.WriteLine("[E2E] 清理完成");
}

// ═══════════════════════════════════════════════════════════
// 2a. --semantic-test 模式：用已知中文文本验证 BGE 语义搜索
//     （绕过 GPU 依赖的 STT，直接验证"付款方式"→"百分之八十"语义命中）
// ═══════════════════════════════════════════════════════════
if (semanticTestMode)
{
    Console.WriteLine("\n[E2E] === 语义搜索测试模式 ===");

    // 清理旧知识库
    conn.Execute("DELETE FROM knowledge_documents");
    conn.Execute("DELETE FROM knowledge_chunks");
    conn.Execute("DELETE FROM knowledge_fts");

    // 检查 BGE 模型
    var stEngineDir = SttModelManager.GetEngineDir();
    var bgeModel = Path.Combine(stEngineDir, "embedding", "bge-small-zh-v1.5.onnx");
    var bgeVocab = Path.Combine(stEngineDir, "embedding", "vocab.txt");
    Console.WriteLine($"[E2E] BGE 模型: {bgeModel}, 存在={File.Exists(bgeModel)}");
    Console.WriteLine($"[E2E] BGE vocab: {bgeVocab}, 存在={File.Exists(bgeVocab)}");

    if (!File.Exists(bgeModel) || !File.Exists(bgeVocab))
    {
        Console.WriteLine("[E2E] BGE 模型缺失，正在下载...");
        await SttModelManager.EnsureEmbeddingModelAsync(
            new Progress<string>(msg => Console.WriteLine($"  [下载] {msg}")));
    }

    var emb = new BgeEmbeddingService();
    Console.WriteLine($"[E2E] BGE IsAvailable: {emb.IsAvailable}");
    Console.WriteLine($"[E2E] 维度: {emb.Dimension}");

    // L2 归一化验证
    var tv = await emb.EmbedAsync("测试向量归一化");
    var l2 = Math.Sqrt(tv.Sum(x => (double)x * x));
    Console.WriteLine($"[E2E] L2 范数: {l2:F6} (应≈1.0)");
    Console.WriteLine($"[E2E] 向量长度: {tv.Length} (应=512)");

    // 准备测试 segments（模拟真实通话，包含"百分之八十"）
    var testSegments = new List<SttSegment>
    {
        new() { Speaker = 1, Start = 0, End = 10, Text = "我们这个项目的付款方式是这样的，每个月百分之八十的进度款，年底结清。" },
        new() { Speaker = 2, Start = 10, End = 20, Text = "好的，那税怎么算？是含税还是不含税？" },
        new() { Speaker = 1, Start = 20, End = 30, Text = "含税的，税点是三个点，之前谈好的。" },
        new() { Speaker = 2, Start = 30, End = 40, Text = "行，那就这么定了，明天签合同。" },
        new() { Speaker = 3, Start = 40, End = 50, Text = "我这边也没问题，材料进场时间确认一下。" },
    };
    var testFullText = string.Join("\n", testSegments.Select(s => $"【说话人{s.Speaker}】{s.Text}"));
    var testSpeakersJson = JsonSerializer.Serialize(new[]
    {
        new { id = 1, segments = new[] { new { start = 0.0, end = 10.0 }, new { start = 20.0, end = 30.0 } } },
        new { id = 2, segments = new[] { new { start = 10.0, end = 20.0 }, new { start = 30.0, end = 40.0 } } },
        new { id = 3, segments = new[] { new { start = 40.0, end = 50.0 } } },
    });

    // 入库
    var kb = new KnowledgeBaseService(conn, emb);
    var docId = await kb.IngestAsync(
        fullText: testFullText,
        title: "语义搜索测试-陈泽伟通话",
        sourceType: "call",
        sourceRef: "999",
        projectId: null,
        createdBy: "1",
        segments: testSegments,
        occurredAt: DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"));
    Console.WriteLine($"[E2E] 新文档 ID: {docId}");

    // 数据库验证
    var stChunkCount = conn.ExecuteScalar<int>("SELECT COUNT(*) FROM knowledge_chunks WHERE document_id = @Id", new { Id = docId });
    var embCount = conn.ExecuteScalar<int>("SELECT COUNT(*) FROM knowledge_chunks WHERE document_id = @Id AND embedding IS NOT NULL", new { Id = docId });
    var embSizes = conn.Query<int>("SELECT length(embedding) FROM knowledge_chunks WHERE document_id = @Id AND embedding IS NOT NULL", new { Id = docId }).ToList();
    Console.WriteLine($"[E2E] chunks: {stChunkCount}, 有embedding: {embCount}");
    Console.WriteLine($"[E2E] embedding BLOB: min={embSizes.Min()}, max={embSizes.Max()} (应=2048)");
    Console.WriteLine($"[E2E] 所有BLOB=2048: {embSizes.All(s => s == 2048)}");

    // 说话人验证
    var spJson = conn.ExecuteScalar<string>("SELECT speakers FROM knowledge_documents WHERE id = @Id", new { Id = docId });
    var spIds = JsonSerializer.Deserialize<List<JsonElement>>(spJson)!.Select(s => s.GetProperty("id").GetInt32()).Distinct().OrderBy(x => x).ToList();
    Console.WriteLine($"[E2E] speakers: {string.Join(",", spIds)} (应=1,2,3)");

    // 搜索"付款方式"
    Console.WriteLine("\n[E2E] === 搜索'付款方式' ===");
    var sr = await kb.SearchAsync("付款方式", topK: 10, userId: "1", isAdmin: true);
    Console.WriteLine($"[E2E] 总命中: {sr.TotalHits}, 语义检索: {sr.UsedSemantic}");

    for (int i = 0; i < sr.Hits.Count; i++)
    {
        var h = sr.Hits[i];
        var has80 = h.Text.Contains("百分之八十") ? " ← 含'百分之八十'" : "";
        Console.WriteLine($"  #{i + 1} chunkIdx={h.ChunkIndex} sem={h.SemanticScore:F6} rrf={h.RrfScore:F8}{has80}");
        Console.WriteLine($"    {h.Text}");
    }

    // 验证语义命中"百分之八十"
    var hit80 = sr.Hits.FirstOrDefault(h => h.Text.Contains("百分之八十"));
    if (hit80 != null)
        Console.WriteLine($"\n[E2E] ✓ 语义命中'百分之八十'! chunkIdx={hit80.ChunkIndex} semScore={hit80.SemanticScore:F6}");
    else
        Console.WriteLine("\n[E2E] ✗ 未命中'百分之八十'");

    // 导出结果
    var outPath = "E:\\测试\\semantic-test-result.txt";
    using var sw2 = new StreamWriter(outPath, false, System.Text.Encoding.UTF8);
    sw2.WriteLine("=== BGE 语义搜索验证结果 ===");
    sw2.WriteLine($"BGE IsAvailable: {emb.IsAvailable}");
    sw2.WriteLine($"维度: {emb.Dimension}, L2: {l2:F6}");
    sw2.WriteLine($"\n入库 chunks: {stChunkCount}, embedding BLOB: {embSizes.Min()}/{embSizes.Max()}");
    sw2.WriteLine($"\n搜索'付款方式' → 总命中: {sr.TotalHits}");
    foreach (var h in sr.Hits)
    {
        sw2.WriteLine($"  #{h.ChunkIndex} sem={h.SemanticScore} rrf={h.RrfScore}");
        sw2.WriteLine($"    {h.Text}");
    }
    sw2.WriteLine($"\n命中'百分之八十': {hit80 != null}");
    sw2.Close();
    Console.WriteLine($"[E2E] 结果已导出: {outPath}");
    Console.WriteLine("[E2E] 语义搜索测试完成。");
    return;
}

// ═══════════════════════════════════════════════════════════
// 2b. 检查是否有已完成的真实 stt_job
// ═══════════════════════════════════════════════════════════
var existingJobs = conn.Query<dynamic>(
    "SELECT id, source_file, status, is_multi_speaker, duration_sec, created_at, substr(result_text, 1, 200) as text_preview FROM stt_jobs ORDER BY id").ToList();

Console.WriteLine($"\n[E2E] STT jobs 总数: {existingJobs.Count}");
foreach (var job in existingJobs)
{
    Console.WriteLine($"  id={job.id} file={job.source_file} status={job.status} multi={job.is_multi_speaker} dur={job.duration_sec}s");
    if (job.text_preview != null)
        Console.WriteLine($"    text: {job.text_preview}");
}

dynamic? chenJob = existingJobs.FirstOrDefault(j => ((string?)j.text_preview ?? "").Contains("陈泽伟"));

if (chenJob == null)
{
    // 尝试在 result_text 全文搜索
    chenJob = conn.QueryFirstOrDefault<dynamic>(
        "SELECT id, source_file, status, is_multi_speaker, duration_sec, result_text, result_json, created_by, created_at FROM stt_jobs WHERE status = 'completed' AND result_text LIKE '%陈泽伟%' ORDER BY id LIMIT 1");
}

if (chenJob == null)
{
    // 使用第一个 completed 的 job
    chenJob = conn.QueryFirstOrDefault<dynamic>(
        "SELECT id, source_file, status, is_multi_speaker, duration_sec, result_text, result_json, created_by, created_at FROM stt_jobs WHERE status = 'completed' ORDER BY id LIMIT 1");
}

if (chenJob == null)
{
    // 没有任何 completed 的 job，需要创建并运行 STT 转写
    Console.WriteLine("\n[E2E] 未找到任何已完成的 stt_job，需要创建并运行 STT 转写...");

    // 先把音频文件复制到 uploads 目录
    var audioSourcePath = @"e:\测试\asr-test\audios\通话-陈泽伟-202606101153(1).m4a";
    var uploadsDir = Path.Combine("F:\\Company Database", "uploads");
    if (!Directory.Exists(uploadsDir)) Directory.CreateDirectory(uploadsDir);
    var audioDestPath = Path.Combine(uploadsDir, "通话-陈泽伟-202606101153(1).m4a");

    if (!File.Exists(audioDestPath))
    {
        Console.WriteLine($"[E2E] 复制音频文件到 uploads: {audioSourcePath} → {audioDestPath}");
        File.Copy(audioSourcePath, audioDestPath);
    }

    // 创建 stt_job
    var now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
    var jobId = conn.QuerySingle<long>(@"
        INSERT INTO stt_jobs
            (source_file, source_path, source_type, engine, status, progress,
             is_multi_speaker, num_speakers, hotwords,
             created_at, updated_at, created_by)
        VALUES
            (@SourceFile, @SourcePath, 'audio', 'qwen3-asr-1.7b-gguf', 'pending', 0,
             1, NULL, @Hotwords,
             @Now, @Now, '1');
        SELECT last_insert_rowid();",
        new
        {
            SourceFile = "通话-陈泽伟-202606101153(1).m4a",
            SourcePath = "通话-陈泽伟-202606101153(1).m4a",
            Hotwords = "陈泽伟,进度款,结算,付款方式,百分之八十,叶有亮,温总",
            Now = now,
        });

    Console.WriteLine($"[E2E] 创建 stt_job: id={jobId}");
    Console.WriteLine("[E2E] 开始 STT 转写（预计 5-10 分钟）...");

    // 直接运行 SttWorker.ProcessJobAsync 的逻辑
    // 由于 ProcessJobAsync 是 private 的，我们用反射或直接复制逻辑
    // 更好的方式是：用 SttWorker 的 Poll 方法
    // 但 SttWorker 需要 IServiceScope...

    // 直接调用核心处理逻辑
    await RunSttJobAsync(conn, jobId);

    // 重新查询
    chenJob = conn.QueryFirstOrDefault<dynamic>(
        "SELECT id, source_file, status, is_multi_speaker, duration_sec, result_text, result_json, created_by, created_at FROM stt_jobs WHERE id = @Id",
        new { Id = jobId });

    if (chenJob == null || chenJob.status != "completed")
    {
        Console.WriteLine($"[E2E] STT 转写失败! status={chenJob?.status}, error={chenJob?.error}");
        return;
    }
}
else
{
    Console.WriteLine($"\n[E2E] 找到已完成的 stt_job: id={chenJob.id}");
}

Console.WriteLine($"\n[E2E] 选定 stt_job: id={chenJob.id}, file={chenJob.source_file}, status={chenJob.status}");

// ═══════════════════════════════════════════════════════════
// 3. 验证说话人归一化
// ═══════════════════════════════════════════════════════════
var resultJson = (string?)chenJob.result_json;
var resultText = (string?)chenJob.result_text;

Console.WriteLine($"\n[E2E] result_text 前 300 字: {(resultText ?? "").Substring(0, Math.Min(300, (resultText ?? "").Length))}");

if (resultJson != null)
{
    var segments = JsonSerializer.Deserialize<List<JsonElement>>(resultJson);
    if (segments != null && segments.Count > 0)
    {
        var speakers = segments.Select(s => s.GetProperty("speaker").GetInt32()).Distinct().OrderBy(x => x).ToList();
        Console.WriteLine($"[E2E] speaker 值: {string.Join(", ", speakers)}");
        Console.WriteLine($"[E2E] 是否 1-based 连续: {speakers.SequenceEqual(Enumerable.Range(1, speakers.Count))}");

        // 验证 result_text 中的说话人标签与 result_json 一致
        foreach (var seg in segments.Take(3))
        {
            Console.WriteLine($"  seg: speaker={seg.GetProperty("speaker").GetInt32()} start={seg.GetProperty("start").GetDouble():F1} text={seg.GetProperty("text").GetString()?.Substring(0, Math.Min(50, seg.GetProperty("text").GetString()?.Length ?? 0))}");
        }
    }
}

// ═══════════════════════════════════════════════════════════
// 4. 检查 BGE 模型
// ═══════════════════════════════════════════════════════════
var engineDir = SttModelManager.GetEngineDir();
var modelPath = Path.Combine(engineDir, "embedding", "bge-small-zh-v1.5.onnx");
var vocabPath = Path.Combine(engineDir, "embedding", "vocab.txt");

Console.WriteLine($"\n[E2E] BGE 模型路径: {modelPath}");
Console.WriteLine($"[E2E] BGE vocab 路径: {vocabPath}");
Console.WriteLine($"[E2E] 模型存在: {File.Exists(modelPath)}");
Console.WriteLine($"[E2E] vocab 存在: {File.Exists(vocabPath)}");

if (!File.Exists(modelPath) || !File.Exists(vocabPath))
{
    Console.WriteLine("[E2E] BGE 模型缺失，正在下载...");
    await SttModelManager.EnsureEmbeddingModelAsync(
        new Progress<string>(msg => Console.WriteLine($"  [下载] {msg}")));
    Console.WriteLine($"[E2E] 下载完成: model={File.Exists(modelPath)}, vocab={File.Exists(vocabPath)}");
}

// ═══════════════════════════════════════════════════════════
// 5. 加载 BGE 模型，检查 IsAvailable 和维度
// ═══════════════════════════════════════════════════════════
var embeddingService = new BgeEmbeddingService();
Console.WriteLine($"\n[E2E] IEmbeddingService.IsAvailable: {embeddingService.IsAvailable}");
Console.WriteLine($"[E2E] 向量维度: {embeddingService.Dimension}");

// 验证 L2 归一化：嵌入一个测试文本，检查向量模长
if (embeddingService.IsAvailable)
{
    var testVec = await embeddingService.EmbedAsync("测试向量归一化");
    var norm = Math.Sqrt(testVec.Sum(x => x * x));
    Console.WriteLine($"[E2E] 测试向量 L2 范数: {norm:F6} (应 ≈ 1.0)");
    Console.WriteLine($"[E2E] 向量维度验证: {testVec.Length} (应 = 512)");
}

// ═══════════════════════════════════════════════════════════
// 6. 入库
// ═══════════════════════════════════════════════════════════
Console.WriteLine("\n[E2E] === 入库 ===");

// 清理旧的入库数据
var existingDocs = conn.Query<long>(
    "SELECT id FROM knowledge_documents WHERE source_ref = @Ref",
    new { Ref = chenJob.id.ToString() }).ToList();
if (existingDocs.Count > 0)
{
    Console.WriteLine($"[E2E] 发现 {existingDocs.Count} 条已入库文档，先清理...");
    foreach (var docId in existingDocs)
    {
        conn.Execute("DELETE FROM knowledge_chunks WHERE document_id = @Id", new { Id = docId });
        conn.Execute("DELETE FROM knowledge_documents WHERE id = @Id", new { Id = docId });
    }
}

// 解析 segments
List<SttSegment>? sttSegments = null;
if (resultJson != null)
{
    var segData = JsonSerializer.Deserialize<List<JsonElement>>(resultJson);
    sttSegments = segData?.Select(s => new SttSegment
    {
        Speaker = s.GetProperty("speaker").GetInt32(),
        Start = s.GetProperty("start").GetDouble(),
        End = s.GetProperty("end").GetDouble(),
        Text = s.GetProperty("text").GetString() ?? "",
    }).ToList();
}

var kbService = new KnowledgeBaseService(conn, embeddingService);
var newDocId = await kbService.IngestAsync(
    fullText: resultText ?? "",
    title: (string)chenJob.source_file,
    sourceType: "call",
    sourceRef: chenJob.id.ToString(),
    projectId: null,
    createdBy: (string)chenJob.created_by ?? "1",
    segments: sttSegments,
    occurredAt: (string?)chenJob.created_at);

Console.WriteLine($"[E2E] 新文档 ID: {newDocId}");

// ═══════════════════════════════════════════════════════════
// 7. 验证数据库
// ═══════════════════════════════════════════════════════════
Console.WriteLine("\n[E2E] === 数据库验证 ===");

var docCount = conn.ExecuteScalar<int>(
    "SELECT COUNT(*) FROM knowledge_documents WHERE source_ref = @Ref",
    new { Ref = chenJob.id.ToString() });
Console.WriteLine($"[E2E] knowledge_documents (source_ref={chenJob.id}): {docCount} 条（应为 1）");

var chunkCount = conn.ExecuteScalar<int>(
    "SELECT COUNT(*) FROM knowledge_chunks WHERE document_id = @Id",
    new { Id = newDocId });
Console.WriteLine($"[E2E] knowledge_chunks: {chunkCount} 条");

var chunksWithEmbedding = conn.ExecuteScalar<int>(
    "SELECT COUNT(*) FROM knowledge_chunks WHERE document_id = @Id AND embedding IS NOT NULL",
    new { Id = newDocId });
Console.WriteLine($"[E2E] 有 embedding 的 chunks: {chunksWithEmbedding} 条");

// 检查 embedding BLOB 大小
var embeddingSizes = conn.Query<int>(
    "SELECT length(embedding) FROM knowledge_chunks WHERE document_id = @Id AND embedding IS NOT NULL",
    new { Id = newDocId }).ToList();
if (embeddingSizes.Count > 0)
{
    Console.WriteLine($"[E2E] embedding BLOB 大小: min={embeddingSizes.Min()}, max={embeddingSizes.Max()} (应 = 2048 = 512*4)");
    Console.WriteLine($"[E2E] 所有 BLOB 均为 2048 bytes: {embeddingSizes.All(s => s == 2048)}");
}

// 检查 speakers
var speakersJson = conn.ExecuteScalar<string>(
    "SELECT speakers FROM knowledge_documents WHERE id = @Id",
    new { Id = newDocId });
Console.WriteLine($"[E2E] speakers JSON: {speakersJson}");

// 验证 speakers 与 STT job 一致
if (resultJson != null && speakersJson != null)
{
    var sttSpeakers = JsonSerializer.Deserialize<List<JsonElement>>(resultJson)!
        .Select(s => s.GetProperty("speaker").GetInt32()).Distinct().OrderBy(x => x).ToList();
    var docSpeakers = JsonSerializer.Deserialize<List<JsonElement>>(speakersJson)!
        .Select(s => s.GetProperty("id").GetInt32()).Distinct().OrderBy(x => x).ToList();
    Console.WriteLine($"[E2E] STT job speakers: {string.Join(", ", sttSpeakers)}");
    Console.WriteLine($"[E2E] knowledge doc speakers: {string.Join(", ", docSpeakers)}");
    Console.WriteLine($"[E2E] 编号一致: {sttSpeakers.SequenceEqual(docSpeakers)}");
}

// 检查 source_ref
var sourceRef = conn.ExecuteScalar<string>(
    "SELECT source_ref FROM knowledge_documents WHERE id = @Id",
    new { Id = newDocId });
Console.WriteLine($"[E2E] source_ref: {sourceRef} (应 = stt_job.id={chenJob.id})");

// ═══════════════════════════════════════════════════════════
// 8. 搜索"付款方式"
// ═══════════════════════════════════════════════════════════
Console.WriteLine("\n[E2E] === 搜索'付款方式' ===");

var searchResult = await kbService.SearchAsync("付款方式", topK: 10, userId: (string)chenJob.created_by ?? "1", isAdmin: true);

Console.WriteLine($"[E2E] 总命中: {searchResult.TotalHits}");
Console.WriteLine($"[E2E] 使用语义检索: {searchResult.UsedSemantic}");

Console.WriteLine("\n[E2E] --- 搜索结果 ---");
for (int i = 0; i < Math.Min(10, searchResult.Hits.Count); i++)
{
    var h = searchResult.Hits[i];
    Console.WriteLine($"  #{i + 1} chunkId={h.ChunkId} docId={h.DocumentId} chunkIdx={h.ChunkIndex}");
    Console.WriteLine($"    FTS rank={h.FtsRank} score={h.FtsScore}");
    Console.WriteLine($"    Semantic rank={h.SemanticRank} score={h.SemanticScore}");
    Console.WriteLine($"    RRF score={h.RrfScore}");
    var has80 = h.Text.Contains("百分之八十") ? " ← 含'百分之八十'" : "";
    Console.WriteLine($"    text: {(h.Text.Length > 200 ? h.Text.Substring(0, 200) + "..." : h.Text)}{has80}");
}

// ═══════════════════════════════════════════════════════════
// 9. 验证命中"每个月百分之八十"
// ═══════════════════════════════════════════════════════════
Console.WriteLine("\n[E2E] === 验证命中'每个月百分之八十' ===");

var targetHit = searchResult.Hits.FirstOrDefault(h => h.Text.Contains("百分之八十"));
if (targetHit != null)
{
    Console.WriteLine($"[E2E] ✓ 命中目标块!");
    Console.WriteLine($"  documentId: {targetHit.DocumentId}");
    Console.WriteLine($"  chunkId: {targetHit.ChunkId}");
    Console.WriteLine($"  chunkIndex: {targetHit.ChunkIndex}");
    Console.WriteLine($"  FTS rank: {targetHit.FtsRank}");
    Console.WriteLine($"  Semantic rank: {targetHit.SemanticRank}");
    Console.WriteLine($"  Semantic score (cosine): {targetHit.SemanticScore}");
    Console.WriteLine($"  RRF score: {targetHit.RrfScore}");
    Console.WriteLine($"  完整片段文本:\n  {targetHit.Text}");
}
else
{
    Console.WriteLine("[E2E] ✗ 未命中目标块'每个月百分之八十'");
    Console.WriteLine("[E2E] 所有命中块:");
    foreach (var h in searchResult.Hits)
    {
        var has80 = h.Text.Contains("百分之八十") ? " ← 含'百分之八十'" : "";
        Console.WriteLine($"  chunkId={h.ChunkId} rrf={h.RrfScore} text: {(h.Text.Length > 100 ? h.Text.Substring(0, 100) + "..." : h.Text)}{has80}");
    }
}

// ═══════════════════════════════════════════════════════════
// 10. 全部 chunks 列表
// ═══════════════════════════════════════════════════════════
Console.WriteLine("\n[E2E] === 所有分块 ===");
var allChunks = conn.Query<dynamic>(
    "SELECT id, chunk_index, substr(text, 1, 100) as text_preview, length(embedding) as emb_size FROM knowledge_chunks WHERE document_id = @Id ORDER BY chunk_index",
    new { Id = newDocId }).ToList();
foreach (var c in allChunks)
{
    var has80 = ((string)c.text_preview).Contains("百分之八十") ? " ← 目标块" : "";
    Console.WriteLine($"  chunk {c.chunk_index} (id={c.id}, emb={c.emb_size}B): {c.text_preview}{has80}");
}

Console.WriteLine("\n[E2E] 验收完成。");

// Dump text to UTF-8 file for inspection
var dumpPath = "E:\\测试\\e2e-dump.txt";
using var writer = new StreamWriter(dumpPath, false, System.Text.Encoding.UTF8);
writer.WriteLine($"=== STT Job id={chenJob.id} ===");
writer.WriteLine($"result_text:\n{resultText}");
writer.WriteLine($"\n=== Knowledge Chunks (doc={newDocId}) ===");
foreach (var c in allChunks)
{
    writer.WriteLine($"\n--- Chunk {c.chunk_index} (id={c.id}, emb={c.emb_size}B) ---");
    writer.WriteLine((string?)c.text_full);
}
writer.WriteLine($"\n=== Search Results for '付款方式' ===");
foreach (var h in searchResult.Hits)
{
    writer.WriteLine($"  #{h.ChunkIndex} chunkId={h.ChunkId} semantic={h.SemanticScore} rrf={h.RrfScore}");
    writer.WriteLine($"    {h.Text}");
}
writer.WriteLine($"\n=== Text Analysis ===");
writer.WriteLine($"Contains '百分之八十': {resultText?.Contains("百分之八十")}");
writer.WriteLine($"Contains '八十': {resultText?.Contains("八十")}");
writer.WriteLine($"Contains '付款': {resultText?.Contains("付款")}");
writer.WriteLine($"Contains '进度款': {resultText?.Contains("进度款")}");
writer.WriteLine($"Contains '百分之': {resultText?.Contains("百分之")}");
// Find all occurrences of "八十"
if (resultText != null)
{
    var idx = 0;
    while ((idx = resultText.IndexOf("八十", idx)) != -1)
    {
        var start = Math.Max(0, idx - 40);
        var end = Math.Min(resultText.Length, idx + 40);
        writer.WriteLine($"  '八十' at pos {idx}: ...{resultText.Substring(start, end - start)}...");
        idx++;
    }
}
writer.Close();
Console.WriteLine($"[E2E] Text dump saved to: {dumpPath}");

// Try encoding recovery: garbled UTF-8 → bytes → GBK
System.Text.Encoding.RegisterProvider(System.Text.CodePagesEncodingProvider.Instance);
var gbk = System.Text.Encoding.GetEncoding("gbk");
var utf8 = System.Text.Encoding.UTF8;
if (resultText != null)
{
    var rawBytes = utf8.GetBytes(resultText);
    var recovered = gbk.GetString(rawBytes);
    var recoverPath = "E:\\测试\\e2e-recovered.txt";
    using var rw = new StreamWriter(recoverPath, false, utf8);
    rw.WriteLine("=== Recovered Text (UTF-8 bytes → GBK) ===");
    rw.WriteLine(recovered);
    rw.WriteLine($"\n=== Search in recovered text ===");
    rw.WriteLine($"Contains '百分之八十': {recovered.Contains("百分之八十")}");
    rw.WriteLine($"Contains '八十': {recovered.Contains("八十")}");
    rw.WriteLine($"Contains '付款': {recovered.Contains("付款")}");
    rw.WriteLine($"Contains '进度款': {recovered.Contains("进度款")}");
    rw.WriteLine($"Contains '百分之': {recovered.Contains("百分之")}");
    var ridx = 0;
    while ((ridx = recovered.IndexOf("八十", ridx)) != -1)
    {
        var rstart = Math.Max(0, ridx - 40);
        var rend = Math.Min(recovered.Length, ridx + 40);
        rw.WriteLine($"  '八十' at pos {ridx}: ...{recovered.Substring(rstart, rend - rstart)}...");
        ridx++;
    }
    rw.Close();
    Console.WriteLine($"[E2E] Recovered text saved to: {recoverPath}");
}


// ═══════════════════════════════════════════════════════════
// 辅助方法：直接运行 STT job（复用 SttWorker 核心逻辑）
// ═══════════════════════════════════════════════════════════
async Task RunSttJobAsync(IDbConnection db, long jobId)
{
    var now = () => DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

    // 标记为 processing
    db.Execute("UPDATE stt_jobs SET status = 'processing', updated_at = @Now WHERE id = @Id",
        new { Now = now(), Id = jobId });

    try
    {
        // 检查环境
        if (!SttEngineSelector.CanUseLocalStt())
            throw new InvalidOperationException($"本地转写不可用: {SttEngineSelector.GetUnavailableReason()}");

        var engine = new LlamaCppGgufEngine();
        if (!await engine.IsAvailableAsync())
            throw new InvalidOperationException("ASR 模型文件缺失，请检查 asr-engine/model/ 目录");

        // 1. 音频预处理
        Console.WriteLine("[E2E] 预处理音频...");
        var job = db.QueryFirstOrDefault<dynamic>("SELECT * FROM stt_jobs WHERE id = @Id", new { Id = jobId });
        var sourcePath = Path.Combine("F:\\Company Database", "uploads", (string)job.source_path);
        if (!File.Exists(sourcePath))
        {
            sourcePath = (string)job.source_path;
            if (!File.Exists(sourcePath))
                throw new FileNotFoundException($"音频文件不存在: {job.source_path}");
        }

        var processedWav = await AudioPreprocessor.PreprocessAsync(sourcePath, ct: default);
        var duration = await AudioPreprocessor.GetDurationAsync(processedWav);
        db.Execute("UPDATE stt_jobs SET duration_sec = @Dur, updated_at = @Now WHERE id = @Id",
            new { Dur = duration, Now = now(), Id = jobId });

        Console.WriteLine($"[E2E] 音频时长: {duration:F1}s");

        // 2. 多人录音：分离 → 转写
        Console.WriteLine("[E2E] 加载说话人分离模型...");
        await SttModelManager.EnsureDiarizationModelsAsync();

        Console.WriteLine("[E2E] 说话人分离...");
        var diarization = new DiarizationService();
        var segments = await diarization.DiarizeAsync(processedWav, null, ct: default);

        if (segments.Count == 0)
            throw new Exception("说话人分离未检测到任何语音段");

        Console.WriteLine($"[E2E] 分离出 {segments.Count} 段，切分音频...");

        // 按说话人段切分音频
        var splitFiles = await diarization.SplitAudioBySpeakersAsync(processedWav, segments);

        // 批量转写
        Console.WriteLine($"[E2E] 批量转写 {splitFiles.Count} 段（模型只加载一次）...");
        var sw = System.Diagnostics.Stopwatch.StartNew();

        var wavPaths = splitFiles.Select(s => s.wavPath).ToList();
        var texts = await engine.TranscribeBatchAsync(wavPaths, (string?)job.hotwords, default);

        sw.Stop();
        Console.WriteLine($"[E2E] 批量转写完成，耗时 {sw.Elapsed.TotalSeconds:F1}s");

        // 组装结果（此时 Speaker 仍是原始簇号 0-based）
        var allSegments = new List<SttSegment>();
        for (int i = 0; i < splitFiles.Count; i++)
        {
            var (seg, _) = splitFiles[i];
            seg.Text = texts[i];
            allSegments.Add(seg);
        }

        // ★ 说话人归一化：原始簇号 → 连续 1/2/3
        SpeakerLabelNormalizer.Normalize(allSegments);

        var totalText = allSegments.Select(s => $"【说话人{s.Speaker}】{s.Text}").ToList();

        // 清理临时文件
        DiarizationService.CleanupTempFiles(splitFiles.Select(s => s.wavPath).ToList());

        // 清理预处理临时文件
        try { if (processedWav.StartsWith(Path.GetTempPath())) File.Delete(processedWav); } catch { }

        // 3. 写回结果
        var resultJsonStr = JsonSerializer.Serialize(
            allSegments.Select(s => new { speaker = s.Speaker, start = s.Start, end = s.End, text = s.Text }));

        db.Execute(@"
            UPDATE stt_jobs SET
                status = 'completed', progress = 100,
                result_text = @Text, result_json = @Json,
                elapsed_sec = @Elapsed, updated_at = @Now
            WHERE id = @Id",
            new
            {
                Text = string.Join("\n", totalText),
                Json = resultJsonStr,
                Elapsed = sw.Elapsed.TotalSeconds,
                Now = now(),
                Id = jobId,
            });

        Console.WriteLine($"[E2E] STT 完成: {allSegments.Count} 段, {totalText.Count} 行, 耗时 {sw.Elapsed.TotalSeconds:F1}s");

        // 输出说话人归一化信息
        var speakerIds = allSegments.Select(s => s.Speaker).Distinct().OrderBy(x => x).ToList();
        Console.WriteLine($"[E2E] 归一化后说话人: {string.Join(", ", speakerIds)}");
    }
    catch (Exception ex)
    {
        Console.Error.WriteLine($"[E2E] STT 失败: {ex.Message}");
        Console.Error.WriteLine(ex.StackTrace);
        db.Execute("UPDATE stt_jobs SET status = 'failed', error = @Err, updated_at = @Now WHERE id = @Id",
            new { Err = ex.Message.Length > 500 ? ex.Message.Substring(0, 500) : ex.Message, Now = now(), Id = jobId });
    }
}
