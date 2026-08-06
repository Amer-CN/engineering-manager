using System.Data;
using Dapper;
using EngineeringManager.Api.Services;
using EngineeringManager.Api.Services.Stt;
using Microsoft.Data.Sqlite;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// M2 知识库服务单元测试
///
/// 测试项:
/// 1. 说话人标签归一化（M1 尾巴）
/// 2. 文本分块正确性
/// 3. FTS5 中文命中
/// 4. 向量命中（使用 FakeEmbeddingService）
/// 5. RRF 融合排序正确
/// 6. 删除级联
/// 7. 入库 + 检索端到端
/// </summary>
[Collection("M2FifthRound")]
public class KnowledgeBaseServiceTests
{
    /// <summary>创建内存数据库并执行 029 迁移</summary>
    private static (SqliteConnection conn, KnowledgeBaseService service) CreateService()
    {
        var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        conn.Execute("PRAGMA journal_mode=WAL");

        // 建表
        conn.Execute(@"
            CREATE TABLE IF NOT EXISTS knowledge_documents (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                source_type TEXT NOT NULL,
                source_ref  TEXT,
                project_id  INTEGER,
                title       TEXT NOT NULL,
                full_text   TEXT NOT NULL,
                speakers    TEXT,
                occurred_at TEXT,
                folder_id   INTEGER,
                created_at  TEXT NOT NULL,
                updated_at  TEXT NOT NULL,
                created_by  TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS knowledge_chunks (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id INTEGER NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
                chunk_index INTEGER NOT NULL,
                text        TEXT NOT NULL,
                embedding   BLOB
            );
            CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_fts USING fts5(
                text, content='knowledge_chunks', content_rowid='id', tokenize='trigram'
            );
            CREATE TRIGGER IF NOT EXISTS knowledge_fts_ai AFTER INSERT ON knowledge_chunks BEGIN
                INSERT INTO knowledge_fts(rowid, text) VALUES (new.id, new.text);
            END;
            CREATE TRIGGER IF NOT EXISTS knowledge_fts_ad AFTER DELETE ON knowledge_chunks BEGIN
                INSERT INTO knowledge_fts(knowledge_fts, rowid, text) VALUES('delete', old.id, old.text);
            END;
            CREATE TRIGGER IF NOT EXISTS knowledge_fts_au AFTER UPDATE ON knowledge_chunks BEGIN
                INSERT INTO knowledge_fts(knowledge_fts, rowid, text) VALUES('delete', old.id, old.text);
                INSERT INTO knowledge_fts(rowid, text) VALUES (new.id, new.text);
            END;
            CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_doc ON knowledge_chunks(document_id);
            CREATE TABLE IF NOT EXISTS project_authorizations (
                project_id INTEGER NOT NULL,
                user_id TEXT NOT NULL,
                PRIMARY KEY (project_id, user_id)
            );
        ");

        var embedding = new FakeEmbeddingService();
        var service = new KnowledgeBaseService(conn, embedding);
        return (conn, service);
    }

    // ═══════════════════════════════════════════════════════════
    // 1. 说话人标签归一化（SpeakerLabelNormalizer）
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void SpeakerLabelNormalizer_NonContiguousBecomesSequential()
    {
        // 原始簇号 0, 3, 7 → 归一化为 1, 2, 3
        var segments = new List<SttSegment>
        {
            new() { Speaker = 0, Start = 0, End = 5 },
            new() { Speaker = 3, Start = 5, End = 10 },
            new() { Speaker = 7, Start = 10, End = 15 },
            new() { Speaker = 0, Start = 15, End = 20 },
        };

        // 归一化（就地修改）
        SpeakerLabelNormalizer.Normalize(segments);

        // 验证 segment 中的 Speaker 已改为 1-based 连续编号
        Assert.Equal(1, segments[0].Speaker); // 原始 0 → 1
        Assert.Equal(2, segments[1].Speaker); // 原始 3 → 2
        Assert.Equal(3, segments[2].Speaker); // 原始 7 → 3
        Assert.Equal(1, segments[3].Speaker); // 原始 0 → 1（与首次出现一致）

        // 验证 OriginalSpeaker 保留了原始簇号
        Assert.Equal(0, segments[0].OriginalSpeaker);
        Assert.Equal(3, segments[1].OriginalSpeaker);
        Assert.Equal(7, segments[2].OriginalSpeaker);
        Assert.Equal(0, segments[3].OriginalSpeaker);

        // 验证 speakers JSON
        var json = SpeakerLabelNormalizer.BuildSpeakersJson(segments);
        Assert.NotNull(json);
        using var doc = System.Text.Json.JsonDocument.Parse(json!);
        var arr = doc.RootElement.EnumerateArray().ToList();
        Assert.Equal(3, arr.Count); // 3 个说话人

        // 第一个说话人 id=1
        Assert.Equal(1, arr[0].GetProperty("id").GetInt32());
        // 第二个说话人 id=2
        Assert.Equal(2, arr[1].GetProperty("id").GetInt32());
        // 第三个说话人 id=3
        Assert.Equal(3, arr[2].GetProperty("id").GetInt32());

        // 说话人 1 有 2 个时间段
        Assert.Equal(2, arr[0].GetProperty("segments").GetArrayLength());
    }

    [Fact]
    public void SpeakerLabelNormalizer_NullSegments_BuildJsonReturnsNull()
    {
        Assert.Null(SpeakerLabelNormalizer.BuildSpeakersJson(null));
        Assert.Null(SpeakerLabelNormalizer.BuildSpeakersJson(new List<SttSegment>()));
    }

    [Fact]
    public void SpeakerLabelNormalizer_SingleSpeaker_StaysOne()
    {
        var segments = new List<SttSegment>
        {
            new() { Speaker = 0, Start = 0, End = 10, Text = "单人录音" },
        };

        SpeakerLabelNormalizer.Normalize(segments);

        Assert.Equal(1, segments[0].Speaker);
        Assert.Equal(0, segments[0].OriginalSpeaker);
    }

    // ═══════════════════════════════════════════════════════════
    // 2. 文本分块
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void ChunkText_SplitsAtSentenceBoundaries()
    {
        // 构建超过 MaxChunkSize 的文本
        var sentences = new List<string>();
        for (int i = 0; i < 30; i++)
            sentences.Add($"这是第{i}句话内容比较多用来测试分块功能。");
        var text = string.Join("", sentences);

        var chunks = KnowledgeBaseService.ChunkText(text);

        Assert.True(chunks.Count > 1, $"应分成多块，实际 {chunks.Count}");
        // 每块不超过 MaxChunkSize
        Assert.All(chunks, c => Assert.True(c.Length <= 500, $"块长度 {c.Length} > 500"));
        // 每块至少 MinChunkSize（最后一块除外）
        for (int i = 0; i < chunks.Count - 1; i++)
            Assert.True(chunks[i].Length >= 300, $"块 {i} 长度 {chunks[i].Length} < 300");
    }

    [Fact]
    public void ChunkText_DoesNotSplitSentence()
    {
        var text = "这是第一句话。这是第二句话。这是第三句话。";
        var chunks = KnowledgeBaseService.ChunkText(text);

        // 短文本应该只有一块
        Assert.Single(chunks);
        Assert.Contains("第一句话", chunks[0]);
        Assert.Contains("第三句话", chunks[0]);
    }

    [Fact]
    public void ChunkText_EmptyText_ReturnsEmpty()
    {
        var chunks = KnowledgeBaseService.ChunkText("");
        Assert.Empty(chunks);
    }

    // ═══════════════════════════════════════════════════════════
    // 3. FTS5 中文命中
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task IngestAndSearch_FtsChineseMatch()
    {
        var (conn, service) = CreateService();
        using var _ = conn;

        await service.IngestAsync(
            fullText: "今天讨论[已脱敏]结账付款进度款的问题。[已脱敏]说的二十七万有点高。",
            title: "会议记录",
            sourceType: "meeting",
            sourceRef: null,
            projectId: null,
            createdBy: "user1");

        var result = await service.SearchAsync("结账付款", topK: 10, userId: "user1", isAdmin: false);

        Assert.True(result.TotalHits > 0, "FTS 应命中");
        Assert.Contains(result.Hits, h => h.Text.Contains("结账付款"));
    }

    // ═══════════════════════════════════════════════════════════
    // 4. 向量命中（FakeEmbeddingService 保证相似文本向量接近）
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task IngestAndSearch_SemanticMatch()
    {
        var (conn, service) = CreateService();
        using var _ = conn;

        // 入库一段关于付款方式的文本
        await service.IngestAsync(
            fullText: "每个月百分之八十的进度款在月底前支付，剩下的二十在竣工验收后付清。",
            title: "付款安排",
            sourceType: "call",
            sourceRef: null,
            projectId: null,
            createdBy: "user1");

        // 搜索"付款方式"——原话没有这四个字，靠语义命中
        var result = await service.SearchAsync("付款方式", topK: 10, userId: "user1", isAdmin: false);

        // FakeEmbeddingService 用字符 n-gram，"付款" 两字在查询和文本中都有
        Assert.True(result.TotalHits > 0, "语义检索应命中");
        Assert.True(result.UsedSemantic, "应使用了语义检索");
    }

    // ═══════════════════════════════════════════════════════════
    // 5. RRF 融合排序
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void RrfFuse_BothSourcesRankHigher()
    {
        // chunk 1: FTS rank=1, semantic rank=2
        // chunk 2: FTS rank=2, semantic rank=1
        // chunk 3: FTS rank=3 only
        var ftsResults = new List<ChunkMatch>
        {
            new() { ChunkId = 1, FtsRank = 1, Text = "chunk1" },
            new() { ChunkId = 2, FtsRank = 2, Text = "chunk2" },
            new() { ChunkId = 3, FtsRank = 3, Text = "chunk3" },
        };
        var semanticResults = new List<ChunkMatch>
        {
            new() { ChunkId = 2, SemanticRank = 1, Text = "chunk2" },
            new() { ChunkId = 1, SemanticRank = 2, Text = "chunk1" },
        };

        var fused = KnowledgeBaseService.RrfFuse(ftsResults, semanticResults, topK: 3);

        Assert.Equal(3, fused.Count);
        // chunk 1 和 chunk 2 两路都命中，应排在 chunk 3 前面
        var top2Ids = fused.Take(2).Select(f => f.ChunkId).ToHashSet();
        Assert.Contains(1L, top2Ids);
        Assert.Contains(2L, top2Ids);
        // chunk 3 只有一路，应排最后
        Assert.Equal(3L, fused.Last().ChunkId);
    }

    [Fact]
    public void RrfFuse_EmptySemantic_OnlyFts()
    {
        var ftsResults = new List<ChunkMatch>
        {
            new() { ChunkId = 1, FtsRank = 1, Text = "chunk1" },
            new() { ChunkId = 2, FtsRank = 2, Text = "chunk2" },
        };

        var fused = KnowledgeBaseService.RrfFuse(ftsResults, new List<ChunkMatch>(), topK: 10);

        Assert.Equal(2, fused.Count);
        Assert.Equal(1L, fused[0].ChunkId);
        Assert.Equal(2L, fused[1].ChunkId);
    }

    // ═══════════════════════════════════════════════════════════
    // 6. 删除级联
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task DeleteDocument_CascadesChunksAndFts()
    {
        var (conn, service) = CreateService();
        using var _ = conn;

        var ingestResult = await service.IngestAsync(
            fullText: "这是一段测试文本用于验证删除级联功能。",
            title: "删除测试",
            sourceType: "manual",
            sourceRef: null,
            projectId: null,
            createdBy: "user1");

        // 确认有 chunks
        var docId = ingestResult.DocumentId;
        var chunkCount = conn.ExecuteScalar<int>(
            "SELECT COUNT(*) FROM knowledge_chunks WHERE document_id = @Id",
            new { Id = docId });
        Assert.True(chunkCount > 0, "应有分块");

        // 确认 FTS 有数据
        var ftsCount = conn.ExecuteScalar<int>(
            "SELECT COUNT(*) FROM knowledge_fts");
        Assert.True(ftsCount > 0, "FTS 应有数据");

        // 删除
        var deleted = service.DeleteDocument(docId, "user1", isAdmin: false);
        Assert.True(deleted, "删除应成功");

        // 验证 chunks 已删除
        var chunkCountAfter = conn.ExecuteScalar<int>(
            "SELECT COUNT(*) FROM knowledge_chunks WHERE document_id = @Id",
            new { Id = docId });
        Assert.Equal(0, chunkCountAfter);

        // 验证 FTS 已删除（触发器同步）
        var ftsCountAfter = conn.ExecuteScalar<int>(
            "SELECT COUNT(*) FROM knowledge_fts");
        Assert.Equal(0, ftsCountAfter);

        // 验证文档已删除
        var docCount = conn.ExecuteScalar<int>(
            "SELECT COUNT(*) FROM knowledge_documents WHERE id = @Id",
            new { Id = docId });
        Assert.Equal(0, docCount);
    }

    // ═══════════════════════════════════════════════════════════
    // 7. 入库 + 检索端到端
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task Ingest_WithNormalizedSpeakers_StoredInDatabase()
    {
        var (conn, service) = CreateService();
        using var _ = conn;

        // 模拟 STT 层已归一化的 segments（Speaker = 1-based 连续编号）
        var segments = new List<SttSegment>
        {
            new() { Speaker = 1, Start = 0, End = 5, Text = "你好" },
            new() { Speaker = 2, Start = 5, End = 10, Text = "你好" },
            new() { Speaker = 1, Start = 10, End = 15, Text = "再见" },
        };

        var ingestResult = await service.IngestAsync(
            fullText: "【说话人1】你好\n【说话人2】你好\n【说话人1】再见",
            title: "通话记录",
            sourceType: "call",
            sourceRef: "42",
            projectId: null,
            createdBy: "user1",
            segments: segments);

        var docId = ingestResult.DocumentId;
        // 验证 speakers JSON 与 STT 归一化结果一致
        var speakers = conn.ExecuteScalar<string>(
            "SELECT speakers FROM knowledge_documents WHERE id = @Id",
            new { Id = docId });

        Assert.NotNull(speakers);
        using var doc = System.Text.Json.JsonDocument.Parse(speakers!);
        var arr = doc.RootElement.EnumerateArray().ToList();
        Assert.Equal(2, arr.Count); // 2 个说话人
        Assert.Equal(1, arr[0].GetProperty("id").GetInt32());
        Assert.Equal(2, arr[1].GetProperty("id").GetInt32());
    }

    [Fact]
    public async Task Search_DataScope_NonAdminOnlySeesOwn()
    {
        var (conn, service) = CreateService();
        using var _ = conn;

        // user1 的文档
        await service.IngestAsync(
            fullText: "用户一的文档内容关于钢筋采购。",
            title: "用户一文档",
            sourceType: "manual",
            sourceRef: null,
            projectId: null,
            createdBy: "user1");

        // user2 的文档
        await service.IngestAsync(
            fullText: "用户二的文档内容关于模板租赁。",
            title: "用户二文档",
            sourceType: "manual",
            sourceRef: null,
            projectId: null,
            createdBy: "user2");

        // user1 搜索：只看到自己的
        var result1 = await service.SearchAsync("文档", topK: 10, userId: "user1", isAdmin: false);
        Assert.All(result1.Hits, h => Assert.Equal("user1", h.CreatedBy));

        // admin 搜索：看到全部
        var resultAdmin = await service.SearchAsync("文档", topK: 10, userId: "admin", isAdmin: true);
        Assert.True(resultAdmin.TotalHits >= 2, $"admin 应看到全部，实际 {resultAdmin.TotalHits}");
    }

    [Fact]
    public async Task GetDocument_ReturnsChunks()
    {
        var (conn, service) = CreateService();
        using var _ = conn;

        var longText = string.Join("", Enumerable.Range(0, 20)
            .Select(i => $"这是第{i}段内容比较长的句子用于测试分块。"));

        var ingestResult = await service.IngestAsync(
            fullText: longText,
            title: "长文本",
            sourceType: "manual",
            sourceRef: null,
            projectId: null,
            createdBy: "user1");

        var doc = service.GetDocument(ingestResult.DocumentId, "user1", isAdmin: false);

        Assert.NotNull(doc);
        Assert.Equal("长文本", doc!.Title);
        Assert.True(doc.Chunks.Count > 0, "应有分块");
    }
}

/// <summary>
/// 测试用假嵌入服务：基于字符 bigram 的简单向量
/// 相同/相似文本 → 相似向量（cosine 接近 1）
/// 完全不同文本 → 向量正交（cosine 接近 0）
/// </summary>
public class FakeEmbeddingService : IEmbeddingService
{
    public int Dimension => 512;
    public bool IsAvailable => true;

    public Task<float[]> EmbedAsync(string text, CancellationToken ct = default)
    {
        return Task.FromResult(ComputeEmbedding(text));
    }

    public Task<List<float[]>> EmbedBatchAsync(List<string> texts, CancellationToken ct = default)
    {
        return Task.FromResult(texts.Select(t => ComputeEmbedding(t)).ToList());
    }

    private static float[] ComputeEmbedding(string text)
    {
        var vec = new float[512];

        // 字符 bigram → hash → 维度
        for (int i = 0; i < text.Length - 1; i++)
        {
            var bigram = text.Substring(i, 2);
            var hash = bigram.GetHashCode();
            var idx = Math.Abs(hash) % 512;
            vec[idx] += 1;
        }

        // 字符 unigram → hash → 维度
        foreach (var ch in text)
        {
            var hash = ch.GetHashCode();
            var idx = Math.Abs(hash) % 512;
            vec[idx] += 0.5f;
        }

        // L2 normalize
        var norm = MathF.Sqrt(vec.Sum(v => v * v));
        if (norm > 0)
            for (int i = 0; i < 512; i++)
                vec[i] /= norm;

        return vec;
    }
}
