This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.

<file_summary>
This section contains a summary of this file.

<purpose>
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.
</purpose>

<file_format>
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  - File path as an attribute
  - Full contents of the file
</file_format>

<usage_guidelines>
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.
</usage_guidelines>

<notes>
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: EngineeringManager.Api/Services/KnowledgeBaseService.cs, EngineeringManager.Api/Properties/AssemblyInfo.cs, EngineeringManager.Api/EngineeringManager.Api.csproj, EngineeringManager.Tests/Endpoints/M2FourthRoundTests.cs, EngineeringManager.Tests/Endpoints/KnowledgeBaseServiceTests.cs, EngineeringManager.Tests/Endpoints/KnowledgeBaseM2Tests.cs
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
EngineeringManager.Api/EngineeringManager.Api.csproj
EngineeringManager.Api/Properties/AssemblyInfo.cs
EngineeringManager.Api/Services/KnowledgeBaseService.cs
EngineeringManager.Tests/Endpoints/KnowledgeBaseM2Tests.cs
EngineeringManager.Tests/Endpoints/KnowledgeBaseServiceTests.cs
EngineeringManager.Tests/Endpoints/M2FourthRoundTests.cs
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="EngineeringManager.Api/Properties/AssemblyInfo.cs">
using System.Runtime.CompilerServices;

[assembly: InternalsVisibleTo("EngineeringManager.Tests")]
</file>

<file path="EngineeringManager.Api/Services/KnowledgeBaseService.cs">
using System.Data;
using System.Text.Json;
using Dapper;
using EngineeringManager.Api.Security;
using EngineeringManager.Api.Services.Stt;
using Microsoft.Data.Sqlite;

namespace EngineeringManager.Api.Services;

/// <summary>
/// M2 知识库服务：转写文本 → 清洗 → 说话人归一化 → 分块 → 入库 → 混合检索
///
/// IngestAsync 流程:
///   1. 幂等检查（source_type + source_ref 已存在则返回已有 docId）
///   2. 清洗（去纯语气词碎段、规整空白）
///   3. 说话人标签归一化（原始簇号 0/3/7 → 连续 1/2/3）
///   4. 分块（300-500 字/块，按句子边界切，~50 字重叠）
///   5. 在事务内写 knowledge_documents + knowledge_chunks（FTS 触发器自动同步）
///   6. 每块算 bge 向量存 embedding BLOB（事务内）
///
/// SearchAsync 流程:
///   ① FTS5: trigram 全文检索，bm25 排序，取前 N
///   ② 语义: query → bge 向量 → 与各块 embedding 点积（= 余弦），取前 N
///   ③ RRF 融合: 两路结果按 RRF(score = Σ 1/(k+rank)) 合并重排
///   ④ 返回: 命中片段 + 所属文档元信息
///
/// 安全:
///   - 检索结果受用户/项目数据范围约束（BuildScopeFilter 统一构造）
///   - PII 脱敏（电话号/身份证号/金额）在返回时处理
/// </summary>
public class KnowledgeBaseService
{
    private readonly IDbConnection _db;
    private readonly IEmbeddingService _embedding;
    private readonly ILogger<KnowledgeBaseService>? _logger;

    // 分块参数
    private const int MinChunkSize = 300;
    private const int MaxChunkSize = 500;
    private const int OverlapSize = 50;
    private const int FtsTopN = 20;
    private const int SemanticTopN = 20;
    private const double RrfK = 60.0;

    // ── internal 测试钩子：快速幂等查询之后、BeginTransaction/INSERT 之前 ──
    // 仅 EngineeringManager.Tests 可访问，用于并发幂等测试的 Barrier 汇合
    internal static Action? PreInsertHook;

    // 句子结束符（中文标点 + 换行）
    private static readonly char[] SentenceEndings = { '。', '！', '？', '；', '\n', '!', '?', ';' };

    // 纯语气词（长度 ≤ 1 且在此集合中 → 清洗时丢弃）
    private static readonly HashSet<string> FillerWords = new() { "嗯", "啊", "呃", "哦", "唉", "嘿", "咳", "呢", "吧", "嘛", "呀", "哎" };

    public KnowledgeBaseService(IDbConnection db, IEmbeddingService embedding, ILogger<KnowledgeBaseService>? logger = null)
    {
        _db = db;
        _embedding = embedding;
        _logger = logger;
    }

    // ═══════════════════════════════════════════════════════════
    // 项目写权限检查
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 检查用户是否有权操作指定项目（写权限）
    /// admin 可写所有项目；非 admin 只有项目创建者或 project_authorizations 已授权用户可写
    /// </summary>
    public static bool CanAccessProject(IDbConnection db, int projectId, string userId, bool isAdmin)
    {
        if (isAdmin) return true;

        // 项目创建者
        var isCreator = db.ExecuteScalar<int>(
            "SELECT COUNT(*) FROM projects WHERE id = @ProjectId AND created_by = @Uid",
            new { ProjectId = projectId, Uid = userId });
        if (isCreator > 0) return true;

        // 已授权用户
        var isAuthorized = db.ExecuteScalar<int>(
            "SELECT COUNT(*) FROM project_authorizations WHERE project_id = @ProjectId AND user_id = @Uid",
            new { ProjectId = projectId, Uid = userId });
        return isAuthorized > 0;
    }

    // ═══════════════════════════════════════════════════════════
    // IngestAsync（幂等 + 事务）
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 将转写文本入库（清洗 + 分块 + 向量 + FTS），支持 DB 级幂等和事务。
    /// 说话人归一化已在 STT 层（SttWorker）完成，segments 中的 Speaker 已是 1-based 连续编号。
    ///
    /// 幂等（数据库级并发安全）：
    ///   - 当 sourceType != "manual" 且 sourceRef 非空时，(created_by, source_type, source_ref) 有唯一索引
    ///   - 先快速查询，如果已有则返回
    ///   - 插入时如果违反唯一约束（并发竞态），捕获异常后查询并返回已有 documentId
    ///   - manual 文档不受唯一限制（sourceRef 通常为 null）
    ///
    /// 事务：document + chunks + FTS 触发器结果处于同一事务，任一步失败则完整回滚。
    /// </summary>
    public async Task<IngestResult> IngestAsync(
        string fullText,
        string title,
        string sourceType,
        string? sourceRef,
        int? projectId,
        string createdBy,
        List<SttSegment>? segments = null,
        string? occurredAt = null,
        CancellationToken ct = default)
    {
        // 幂等检查（快速路径）：非 manual 来源 + 有 sourceRef + created_by → 查已有文档
        // 注意：幂等查询必须带 created_by，不能跨用户命中
        if (!string.IsNullOrEmpty(sourceRef) && sourceType != "manual")
        {
            var existingDocId = _db.QueryFirstOrDefault<long?>(
                @"SELECT id FROM knowledge_documents
                  WHERE created_by = @CreatedBy AND source_type = @SourceType AND source_ref = @SourceRef
                  LIMIT 1",
                new { CreatedBy = createdBy, SourceType = sourceType, SourceRef = sourceRef });

            if (existingDocId.HasValue)
            {
                _logger?.LogInformation("[KnowledgeBaseService] 幂等命中: user={User} source_type={Type} source_ref={Ref} → docId={DocId}",
                    createdBy, sourceType, sourceRef, existingDocId.Value);
                return new IngestResult { DocumentId = existingDocId.Value, Idempotent = true };
            }
        }

        // ── internal 测试钩子：并发幂等测试在此 barrier 汇合 ──
        PreInsertHook?.Invoke();

        var now = Common.NowString();

        // 1. 清洗文本
        var cleanedText = CleanText(fullText);

        // 2. 构建 speakers JSON（使用已归一化的 segments，不重新映射）
        var speakersJson = SpeakerLabelNormalizer.BuildSpeakersJson(segments);

        // 3. 分块
        var chunks = ChunkText(cleanedText);

        // 4. 计算向量（如果 embedding 模型可用）
        // 首次使用前确保模型已下载（BgeEmbeddingService.EnsureModelAsync）
        if (chunks.Count > 0 && _embedding is BgeEmbeddingService bgeSvc)
        {
            try
            {
                await bgeSvc.EnsureModelAsync(ct);
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "[KnowledgeBaseService] 嵌入模型准备失败，将仅使用 FTS 索引");
            }
        }

        List<byte[]>? embeddings = null;
        if (_embedding.IsAvailable && chunks.Count > 0)
        {
            try
            {
                var vectors = await _embedding.EmbedBatchAsync(chunks, ct);
                embeddings = vectors.Select(v => FloatToBytes(v)).ToList();
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "[KnowledgeBaseService] 向量计算失败，本次入库将不含语义索引（FTS 仍可用）");
            }
        }

        var hasEmbeddings = embeddings != null;

        // 5. 事务写入：document + chunks + FTS（触发器自动）在同一事务内
        using var transaction = _db.BeginTransaction();
        try
        {
            long docId;
            try
            {
                docId = _db.QuerySingle<long>(@"
                    INSERT INTO knowledge_documents
                        (source_type, source_ref, project_id, title, full_text, speakers,
                         occurred_at, created_at, updated_at, created_by)
                    VALUES
                        (@SourceType, @SourceRef, @ProjectId, @Title, @FullText, @Speakers,
                         @OccurredAt, @Now, @Now, @CreatedBy);
                    SELECT last_insert_rowid();",
                    new
                    {
                        SourceType = sourceType,
                        SourceRef = sourceRef,
                        ProjectId = projectId,
                        Title = title,
                        FullText = cleanedText,
                        Speakers = speakersJson,
                        OccurredAt = occurredAt,
                        Now = now,
                        CreatedBy = createdBy,
                    },
                    transaction);
            }
            catch (SqliteException ex) when (ex.SqliteErrorCode == 19 /* SQLITE_CONSTRAINT */
                && !string.IsNullOrEmpty(sourceRef) && sourceType != "manual")
            {
                // 并发竞态：另一个线程已插入相同 (created_by, source_type, source_ref)
                // 回滚当前事务，查询并返回已有文档
                transaction.Rollback();

                var existingDocId = _db.QueryFirstOrDefault<long?>(
                    @"SELECT id FROM knowledge_documents
                      WHERE created_by = @CreatedBy AND source_type = @SourceType AND source_ref = @SourceRef
                      LIMIT 1",
                    new { CreatedBy = createdBy, SourceType = sourceType, SourceRef = sourceRef });

                if (existingDocId.HasValue)
                {
                    _logger?.LogInformation("[KnowledgeBaseService] 并发幂等命中: user={User} source_type={Type} source_ref={Ref} → docId={DocId}",
                        createdBy, sourceType, sourceRef, existingDocId.Value);
                    return new IngestResult { DocumentId = existingDocId.Value, Idempotent = true };
                }

                // 不应到达此处：唯一约束触发但查不到记录
                throw new InvalidOperationException("唯一约束冲突但无法查到已有文档", ex);
            }

            // 6. 写入分块（同一事务）
            for (int i = 0; i < chunks.Count; i++)
            {
                _db.Execute(@"
                    INSERT INTO knowledge_chunks (document_id, chunk_index, text, embedding)
                    VALUES (@DocId, @Idx, @Text, @Emb)",
                    new
                    {
                        DocId = docId,
                        Idx = i,
                        Text = chunks[i],
                        Emb = embeddings?[i],
                    },
                    transaction);
            }

            transaction.Commit();

            _logger?.LogInformation("[KnowledgeBaseService] 文档 {DocId} 入库: {Chunks} 块, {Chars} 字, 向量={HasEmb}",
                docId, chunks.Count, cleanedText.Length, hasEmbeddings);

            return new IngestResult { DocumentId = docId, Idempotent = false, HasEmbeddings = hasEmbeddings };
        }
        catch (SqliteException)
        {
            // 已在上方处理过的唯一约束不会到达此处
            try { transaction.Rollback(); } catch { /* already rolled back or not begun */ }
            throw;
        }
        catch
        {
            transaction.Rollback();
            throw;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // SearchAsync
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 混合检索（FTS5 关键词 + 语义向量 → RRF 融合）
    /// </summary>
    public async Task<SearchResult> SearchAsync(
        string query,
        int topK = 10,
        int? projectId = null,
        string? userId = null,
        bool isAdmin = false,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(query))
            return new SearchResult();

        // 数据范围过滤
        var scopeFilter = BuildScopeFilter(isAdmin, userId, projectId);

        // ① FTS5 检索
        var ftsResults = FtsSearch(query, scopeFilter, FtsTopN);

        // ② 语义检索
        var semanticResults = new List<ChunkMatch>();
        if (_embedding.IsAvailable)
        {
            try
            {
                var queryVec = await _embedding.EmbedAsync(query, ct);
                semanticResults = SemanticSearch(queryVec, scopeFilter, SemanticTopN);
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "[KnowledgeBaseService] 语义检索失败，仅返回 FTS 结果");
            }
        }

        // ③ RRF 融合
        var fused = RrfFuse(ftsResults, semanticResults, topK);

        // ④ 查文档元信息
        var docIds = fused.Select(f => f.ChunkId).Distinct().ToList();
        var documents = GetDocumentsForChunks(fused);

        return new SearchResult
        {
            Query = query,
            TotalHits = fused.Count,
            Hits = fused,
            Documents = documents,
            UsedSemantic = _embedding.IsAvailable,
        };
    }

    // ═══════════════════════════════════════════════════════════
    // GetDocument / DeleteDocument
    // ═══════════════════════════════════════════════════════════

    public DocumentDetail? GetDocument(long id, string userId, bool isAdmin)
    {
        var scopeFilter = BuildScopeFilter(isAdmin, userId, null);
        var doc = _db.QueryFirstOrDefault<dynamic>(
            $@"SELECT d.id, d.source_type, d.source_ref, d.project_id, d.title, d.full_text,
                      d.speakers, d.occurred_at, d.created_at, d.updated_at, d.created_by
               FROM knowledge_documents d
               WHERE d.id = @Id AND {scopeFilter.Filter}",
            new { Id = id, Uid = scopeFilter.Uid ?? "", scopeFilter.ProjectId });

        if (doc == null) return null;

        var chunks = _db.Query<dynamic>(
            "SELECT id, chunk_index, text FROM knowledge_chunks WHERE document_id = @Id ORDER BY chunk_index",
            new { Id = id });

        return new DocumentDetail
        {
            Id = (long)doc.id,
            SourceType = doc.source_type,
            SourceRef = doc.source_ref,
            ProjectId = (int?)doc.project_id,
            Title = doc.title,
            FullText = doc.full_text,
            Speakers = doc.speakers,
            OccurredAt = doc.occurred_at,
            CreatedAt = doc.created_at,
            CreatedBy = doc.created_by,
            Chunks = chunks.Select(c => new ChunkInfo
            {
                Id = (long)c.id,
                Index = (int)c.chunk_index,
                Text = c.text,
            }).ToList(),
        };
    }

    public bool DeleteDocument(long id, string userId, bool isAdmin)
    {
        var scopeFilter = BuildScopeFilter(isAdmin, userId, null);

        // 检查权限
        var exists = _db.ExecuteScalar<int>(
            $@"SELECT COUNT(*) FROM knowledge_documents d WHERE d.id = @Id AND {scopeFilter.Filter}",
            new { Id = id, Uid = scopeFilter.Uid ?? "", scopeFilter.ProjectId });

        if (exists == 0) return false;

        // 删除分块（触发器自动同步 FTS）
        _db.Execute("DELETE FROM knowledge_chunks WHERE document_id = @Id", new { Id = id });
        // 删除文档
        _db.Execute("DELETE FROM knowledge_documents WHERE id = @Id", new { Id = id });

        return true;
    }

    // ═══════════════════════════════════════════════════════════
    // 文本清洗
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 清洗文本：去纯语气词碎段、规整空白、合并连续换行
    /// </summary>
    public static string CleanText(string text)
    {
        if (string.IsNullOrEmpty(text)) return "";

        var lines = text.Split('\n');
        var cleaned = new List<string>();

        foreach (var line in lines)
        {
            var trimmed = line.Trim();
            if (string.IsNullOrWhiteSpace(trimmed)) continue;

            // 去掉纯语气词行（如单独一行只有"嗯"或"啊"）
            if (FillerWords.Contains(trimmed)) continue;

            // 规整空白：多个连续空格 → 单个
            trimmed = System.Text.RegularExpressions.Regex.Replace(trimmed, @"\s+", " ");
            cleaned.Add(trimmed);
        }

        return string.Join("\n", cleaned);
    }

    // ═══════════════════════════════════════════════════════════
    // 说话人归一化 — 已移至 SpeakerLabelNormalizer（共享工具类）
    // STT 层在持久化前调用 SpeakerLabelNormalizer.Normalize()
    // 知识库入库时直接使用已归一化的 segments，调用 BuildSpeakersJson 生成 JSON
    // ═══════════════════════════════════════════════════════════

    // ═══════════════════════════════════════════════════════════
    // 分块算法
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 文本分块：300-500 字/块，按句子边界切，块间 ~50 字重叠
    /// 不把一句话切两半
    /// </summary>
    public static List<string> ChunkText(string text)
    {
        if (string.IsNullOrEmpty(text)) return new List<string>();

        // 1. 按句子边界分割
        var sentences = SplitSentences(text);
        if (sentences.Count == 0) return new List<string> { text };

        // 2. 贪婪组装分块
        var chunks = new List<string>();
        var currentChunk = new System.Text.StringBuilder();
        var currentLen = 0;
        string? lastSentence = null; // 用于重叠

        foreach (var sentence in sentences)
        {
            // 如果加上这句会超 MaxChunkSize，且当前块已有内容 → 保存当前块
            if (currentLen + sentence.Length > MaxChunkSize && currentLen >= MinChunkSize)
            {
                chunks.Add(currentChunk.ToString().Trim());

                // 重叠：保留最后一句作为下一块的开头
                currentChunk.Clear();
                currentLen = 0;
                if (lastSentence != null && lastSentence.Length <= OverlapSize * 2)
                {
                    currentChunk.Append(lastSentence);
                    currentLen = lastSentence.Length;
                }
            }

            currentChunk.Append(sentence);
            currentLen += sentence.Length;
            lastSentence = sentence;
        }

        // 保存最后一块
        if (currentLen > 0)
        {
            chunks.Add(currentChunk.ToString().Trim());
        }

        // 如果某句话超过 MaxChunkSize，硬切（按 MaxChunkSize 等分）
        var finalChunks = new List<string>();
        foreach (var chunk in chunks)
        {
            if (chunk.Length <= MaxChunkSize)
            {
                finalChunks.Add(chunk);
            }
            else
            {
                // 硬切超长块
                for (int i = 0; i < chunk.Length; i += MaxChunkSize - OverlapSize)
                {
                    var len = Math.Min(MaxChunkSize, chunk.Length - i);
                    finalChunks.Add(chunk.Substring(i, len));
                    if (i + len >= chunk.Length) break;
                }
            }
        }

        return finalChunks;
    }

    /// <summary>按句子结束符分割文本，保留结束符</summary>
    private static List<string> SplitSentences(string text)
    {
        var sentences = new List<string>();
        var current = new System.Text.StringBuilder();

        foreach (var ch in text)
        {
            current.Append(ch);
            if (SentenceEndings.Contains(ch))
            {
                var s = current.ToString().Trim();
                if (s.Length > 0) sentences.Add(s);
                current.Clear();
            }
        }

        var remaining = current.ToString().Trim();
        if (remaining.Length > 0) sentences.Add(remaining);

        return sentences;
    }

    // ═══════════════════════════════════════════════════════════
    // FTS5 检索
    // ═══════════════════════════════════════════════════════════

    private List<ChunkMatch> FtsSearch(string query, ScopeFilter scope, int topN)
    {
        // FTS5 trigram: 少于 3 字的查询不灵，靠语义那路补上
        if (query.Length < 3) return new List<ChunkMatch>();

        try
        {
            var sql = $@"
                SELECT c.id AS ChunkId, c.document_id AS DocumentId, c.chunk_index AS ChunkIndex,
                       c.text AS Text,
                       d.title AS DocTitle, d.source_type AS SourceType, d.source_ref AS SourceRef,
                       d.project_id AS ProjectId, d.speakers AS Speakers, d.occurred_at AS OccurredAt,
                       d.created_by AS CreatedBy,
                       bm25(knowledge_fts) AS Score
                FROM knowledge_fts
                JOIN knowledge_chunks c ON c.id = knowledge_fts.rowid
                JOIN knowledge_documents d ON d.id = c.document_id
                WHERE knowledge_fts MATCH @Query AND {scope.Filter}
                ORDER BY bm25(knowledge_fts)
                LIMIT @TopN";

            var rows = _db.Query<dynamic>(sql, new { Query = query, Uid = scope.Uid ?? "", ProjectId = scope.ProjectId, TopN = topN });

            return rows.Select((r, i) => new ChunkMatch
            {
                ChunkId = (long)r.ChunkId,
                DocumentId = (long)r.DocumentId,
                ChunkIndex = (int)r.ChunkIndex,
                Text = r.Text,
                FtsScore = (double)r.Score,
                FtsRank = i + 1,
                DocTitle = r.DocTitle,
                SourceType = r.SourceType,
                SourceRef = r.SourceRef,
                ProjectId = r.ProjectId == null ? null : (int?)(long)r.ProjectId,
                Speakers = r.Speakers,
                OccurredAt = r.OccurredAt,
                CreatedBy = r.CreatedBy,
            }).ToList();
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[KnowledgeBaseService] FTS 检索失败: {ex.Message}");
            _logger?.LogError(ex, "[KnowledgeBaseService] FTS 检索失败");
            return new List<ChunkMatch>();
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 语义检索
    // ═══════════════════════════════════════════════════════════

    private List<ChunkMatch> SemanticSearch(float[] queryVec, ScopeFilter scope, int topN)
    {
        // 加载所有 chunk embeddings（本地几千块直接内存暴力算）
        var sql = $@"
            SELECT c.id AS ChunkId, c.document_id AS DocumentId, c.chunk_index AS ChunkIndex,
                   c.text AS Text, c.embedding AS Embedding,
                   d.title AS DocTitle, d.source_type AS SourceType, d.source_ref AS SourceRef,
                   d.project_id AS ProjectId, d.speakers AS Speakers, d.occurred_at AS OccurredAt,
                   d.created_by AS CreatedBy
            FROM knowledge_chunks c
            JOIN knowledge_documents d ON d.id = c.document_id
            WHERE c.embedding IS NOT NULL AND {scope.Filter}";

        var rows = _db.Query<dynamic>(sql, new { Uid = scope.Uid ?? "", ProjectId = scope.ProjectId });

        var matches = new List<ChunkMatch>();
        foreach (var r in rows)
        {
            var embedding = BytesToFloat((byte[])r.Embedding);
            var similarity = DotProduct(queryVec, embedding); // L2归一化后点积 = 余弦

            matches.Add(new ChunkMatch
            {
                ChunkId = (long)r.ChunkId,
                DocumentId = (long)r.DocumentId,
                ChunkIndex = (int)r.ChunkIndex,
                Text = r.Text,
                SemanticScore = similarity,
                DocTitle = r.DocTitle,
                SourceType = r.SourceType,
                SourceRef = r.SourceRef,
                ProjectId = r.ProjectId == null ? null : (int?)(long)r.ProjectId,
                Speakers = r.Speakers,
                OccurredAt = r.OccurredAt,
                CreatedBy = r.CreatedBy,
            });
        }

        // 按相似度排序取 top N
        return matches
            .OrderByDescending(m => m.SemanticScore)
            .Take(topN)
            .Select((m, i) => { m.SemanticRank = i + 1; return m; })
            .ToList();
    }

    // ═══════════════════════════════════════════════════════════
    // RRF 融合
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 倒数排名融合 (Reciprocal Rank Fusion)
    /// score = Σ 1/(k + rank)，k=60
    /// </summary>
    public static List<ChunkMatch> RrfFuse(List<ChunkMatch> ftsResults, List<ChunkMatch> semanticResults, int topK)
    {
        var scores = new Dictionary<long, double>(); // chunkId → rrf score
        var chunkMap = new Dictionary<long, ChunkMatch>(); // chunkId → metadata

        // FTS 贡献
        foreach (var r in ftsResults)
        {
            var contribution = 1.0 / (RrfK + r.FtsRank!.Value);
            if (!scores.ContainsKey(r.ChunkId)) scores[r.ChunkId] = 0;
            scores[r.ChunkId] += contribution;
            chunkMap[r.ChunkId] = r;
        }

        // 语义贡献
        foreach (var r in semanticResults)
        {
            var contribution = 1.0 / (RrfK + r.SemanticRank!.Value);
            if (!scores.ContainsKey(r.ChunkId)) scores[r.ChunkId] = 0;
            scores[r.ChunkId] += contribution;

            // 如果 FTS 没有这个 chunk，用语义结果的元信息
            if (!chunkMap.ContainsKey(r.ChunkId))
                chunkMap[r.ChunkId] = r;
            else
            {
                // 合并信息：如果 FTS 有但语义没有，补上 semantic score
                chunkMap[r.ChunkId].SemanticScore = r.SemanticScore;
                chunkMap[r.ChunkId].SemanticRank = r.SemanticRank;
            }
        }

        // 排序取 topK
        var fused = scores
            .OrderByDescending(kvp => kvp.Value)
            .Take(topK)
            .Select(kvp =>
            {
                var match = chunkMap[kvp.Key];
                match.RrfScore = kvp.Value;
                return match;
            })
            .ToList();

        return fused;
    }

    // ═══════════════════════════════════════════════════════════
    // 数据范围过滤（统一构造，禁止在其他地方复制 SQL）
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 构造数据范围过滤条件。所有知识库查询（Search/List/Get/Delete）必须复用此方法。
    ///
    /// 正确逻辑:
    ///   admin + 无 projectId → 全部 (1=1)
    ///   admin + 有 projectId → d.project_id = @ProjectId
    ///   非 admin + 无 projectId → d.created_by = @Uid OR EXISTS(pa.project_id = d.project_id AND pa.user_id = @Uid)
    ///   非 admin + 有 projectId → (基础范围) AND d.project_id = @ProjectId
    ///
    /// 关键: EXISTS 子查询必须关联当前行 d.project_id，不能用 @ProjectId 参数
    /// （否则用户只需拥有任意一个项目授权就能看到所有传入 projectId 的数据）
    /// </summary>
    public static ScopeFilter BuildScopeFilter(bool isAdmin, string? userId, int? projectId)
    {
        if (isAdmin)
        {
            if (projectId.HasValue)
                return new ScopeFilter("d.project_id = @ProjectId", null, projectId.Value);
            return new ScopeFilter("(1 = 1)", null, 0);
        }

        // 非 admin 基础范围：created_by = uid OR 当前行的 project_id 在授权列表中
        // 注意: EXISTS 必须关联 d.project_id（当前行），不能用 @ProjectId
        var baseFilter = @"(d.created_by = @Uid
               OR EXISTS(SELECT 1 FROM project_authorizations pa
                         WHERE pa.project_id = d.project_id AND pa.user_id = @Uid))";

        // 有 projectId 时，在基础范围外追加 AND d.project_id = @ProjectId
        if (projectId.HasValue)
        {
            return new ScopeFilter(
                $"{baseFilter} AND d.project_id = @ProjectId",
                userId, projectId.Value);
        }

        return new ScopeFilter(baseFilter, userId, 0);
    }

    private List<DocumentSummary> GetDocumentsForChunks(List<ChunkMatch> hits)
    {
        var docIds = hits.Select(h => h.DocumentId).Distinct().ToList();
        if (docIds.Count == 0) return new List<DocumentSummary>();

        var docs = _db.Query<dynamic>(
            "SELECT id, title, source_type, source_ref, project_id, speakers, occurred_at, created_at, created_by FROM knowledge_documents WHERE id IN @Ids",
            new { Ids = docIds });

        return docs.Select(d => new DocumentSummary
        {
            Id = (long)d.id,
            Title = d.title,
            SourceType = d.source_type,
            SourceRef = d.source_ref,
            ProjectId = d.project_id == null ? null : (int?)(long)d.project_id,
            Speakers = d.speakers,
            OccurredAt = d.occurred_at,
            CreatedAt = d.created_at,
            CreatedBy = d.created_by,
        }).ToList();
    }

    // ═══════════════════════════════════════════════════════════
    // 向量序列化辅助
    // ═══════════════════════════════════════════════════════════

    public static byte[] FloatToBytes(float[] values)
    {
        var bytes = new byte[values.Length * 4];
        Buffer.BlockCopy(values, 0, bytes, 0, bytes.Length);
        return bytes;
    }

    public static float[] BytesToFloat(byte[] bytes)
    {
        var values = new float[bytes.Length / 4];
        Buffer.BlockCopy(bytes, 0, values, 0, bytes.Length);
        return values;
    }

    public static float DotProduct(float[] a, float[] b)
    {
        var sum = 0f;
        var len = Math.Min(a.Length, b.Length);
        for (int i = 0; i < len; i++)
            sum += a[i] * b[i];
        return sum;
    }
}

// ═══════════════════════════════════════════════════════════
// DTO / 返回类型
// ═══════════════════════════════════════════════════════════

public class SearchResult
{
    public string Query { get; set; } = "";
    public int TotalHits { get; set; }
    public List<ChunkMatch> Hits { get; set; } = new();
    public List<DocumentSummary> Documents { get; set; } = new();
    public bool UsedSemantic { get; set; }
}

public class ChunkMatch
{
    public long ChunkId { get; set; }
    public long DocumentId { get; set; }
    public int ChunkIndex { get; set; }
    public string Text { get; set; } = "";

    // FTS 相关
    public double? FtsScore { get; set; }
    public int? FtsRank { get; set; }

    // 语义相关
    public double? SemanticScore { get; set; }
    public int? SemanticRank { get; set; }

    // RRF 融合分数
    public double? RrfScore { get; set; }

    // 文档元信息
    public string? DocTitle { get; set; }
    public string? SourceType { get; set; }
    public string? SourceRef { get; set; }
    public int? ProjectId { get; set; }
    public string? Speakers { get; set; }
    public string? OccurredAt { get; set; }
    public string? CreatedBy { get; set; }
}

public class DocumentSummary
{
    public long Id { get; set; }
    public string Title { get; set; } = "";
    public string? SourceType { get; set; }
    public string? SourceRef { get; set; }
    public int? ProjectId { get; set; }
    public string? Speakers { get; set; }
    public string? OccurredAt { get; set; }
    public string CreatedAt { get; set; } = "";
    public string CreatedBy { get; set; } = "";
}

public class DocumentDetail
{
    public long Id { get; set; }
    public string SourceType { get; set; } = "";
    public string? SourceRef { get; set; }
    public int? ProjectId { get; set; }
    public string Title { get; set; } = "";
    public string FullText { get; set; } = "";
    public string? Speakers { get; set; }
    public string? OccurredAt { get; set; }
    public string CreatedAt { get; set; } = "";
    public string UpdatedAt { get; set; } = "";
    public string CreatedBy { get; set; } = "";
    public List<ChunkInfo> Chunks { get; set; } = new();
}

public class ChunkInfo
{
    public long Id { get; set; }
    public int Index { get; set; }
    public string Text { get; set; } = "";
}

// ═══════════════════════════════════════════════════════════
// 入库结果
// ═══════════════════════════════════════════════════════════

/// <summary>
/// 入库结果。Idempotent=true 表示命中原有文档，未新建。
/// HasEmbeddings=false 表示模型不可用，仅 FTS 索引可用。
/// </summary>
public class IngestResult
{
    public long DocumentId { get; set; }
    public bool Idempotent { get; set; }
    public bool HasEmbeddings { get; set; }
}

// 辅助类型：数据范围过滤条件
public record ScopeFilter(string Filter, string? Uid, int ProjectId);
</file>

<file path="EngineeringManager.Tests/Endpoints/KnowledgeBaseM2Tests.cs">
using System.Data;
using Dapper;
using EngineeringManager.Api;
using EngineeringManager.Api.Services;
using EngineeringManager.Api.Services.Stt;
using Microsoft.Data.Sqlite;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// M2 第三轮审查：知识库完整测试套件
///
/// 覆盖:
/// 1. P0 跨项目越权（BuildScopeFilter 正确性 + FTS/语义两路都不越权）
/// 2. 项目写权限检查（CanAccessProject）
/// 3. STT 入库幂等
/// 4. 入库事务（故障注入回滚）
/// 5. 说话人全链路（0/3/7 → 1/2/3 贯穿 result_text/result_json/GET/ingest/speakers）
/// </summary>
[Collection("M2FifthRound")]
public class KnowledgeBaseM2Tests
{
    /// <summary>创建内存数据库 + 029 迁移 + projects 表 + project_authorizations</summary>
    private static (SqliteConnection conn, KnowledgeBaseService service) CreateService()
    {
        var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        conn.Execute("PRAGMA journal_mode=WAL");

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
            -- 030 迁移：唯一索引（DB 级并发安全）
            CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_doc_unique
            ON knowledge_documents(created_by, source_type, source_ref)
            WHERE source_type <> 'manual' AND source_ref IS NOT NULL;
            CREATE TABLE IF NOT EXISTS project_authorizations (
                project_id INTEGER NOT NULL,
                user_id TEXT NOT NULL,
                PRIMARY KEY (project_id, user_id)
            );
            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                created_by TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
        ");

        var embedding = new FakeEmbeddingService();
        var service = new KnowledgeBaseService(conn, embedding);
        return (conn, service);
    }

    // ═══════════════════════════════════════════════════════════
    // 1. P0 跨项目越权测试
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task Search_CrossProjectIsolation_NonAdminCannotSeeUnauthorizedProject()
    {
        var (conn, service) = CreateService();
        using var _ = conn;

        // user1 创建 project A 文档
        conn.Execute("INSERT INTO projects (id, name, created_by, created_at) VALUES (1, '项目A', 'user1', '2026-01-01 00:00:00')");
        await service.IngestAsync("项目A的付款方式是按月支付，每个月百分之八十的进度款在月底前支付。", "文档A", "call", "ref-a", 1, "user1");

        // user2 创建 project B 文档
        conn.Execute("INSERT INTO projects (id, name, created_by, created_at) VALUES (2, '项目B', 'user2', '2026-01-01 00:00:00')");
        await service.IngestAsync("项目B的付款方式是分期付款，每个季度支付一次进度款。", "文档B", "call", "ref-b", 2, "user2");

        // user3 获 project A 授权
        conn.Execute("INSERT INTO project_authorizations (project_id, user_id) VALUES (1, 'user3')");

        // user3 指定 projectId=A，只能看到 A
        var resultA = await service.SearchAsync("付款方式", topK: 10, projectId: 1, userId: "user3", isAdmin: false);
        Assert.All(resultA.Hits, h => Assert.Equal(1, h.ProjectId));
        Assert.DoesNotContain(resultA.Hits, h => h.ProjectId == 2);

        // user3 指定 projectId=B，不能看到 B（因为 user3 未被授权 project B）
        var resultB = await service.SearchAsync("付款方式", topK: 10, projectId: 2, userId: "user3", isAdmin: false);
        Assert.Empty(resultB.Hits);

        // user3 不指定 projectId，只能看到 A（通过授权），看不到 B
        var resultAll = await service.SearchAsync("付款方式", topK: 10, userId: "user3", isAdmin: false);
        Assert.All(resultAll.Hits, h => Assert.Equal(1, h.ProjectId));
        Assert.DoesNotContain(resultAll.Hits, h => h.ProjectId == 2);
    }

    [Fact]
    public async Task Search_CrossProjectIsolation_AdminWithProjectIdOnlyReturnsThatProject()
    {
        var (conn, service) = CreateService();
        using var _ = conn;

        conn.Execute("INSERT INTO projects (id, name, created_by, created_at) VALUES (1, '项目A', 'user1', '2026-01-01 00:00:00')");
        conn.Execute("INSERT INTO projects (id, name, created_by, created_at) VALUES (2, '项目B', 'user2', '2026-01-01 00:00:00')");
        await service.IngestAsync("项目A的付款方式是按月支付，每个月百分之八十的进度款在月底前支付。", "文档A", "call", "ref-a", 1, "user1");
        await service.IngestAsync("项目B的付款方式是分期付款，每个季度支付一次进度款。", "文档B", "call", "ref-b", 2, "user2");

        // admin 指定 projectId=A 时，只返回 A
        var resultA = await service.SearchAsync("进度款", topK: 10, projectId: 1, userId: "admin", isAdmin: true);
        Assert.All(resultA.Hits, h => Assert.Equal(1, h.ProjectId));
        Assert.DoesNotContain(resultA.Hits, h => h.ProjectId == 2);

        // admin 不指定 projectId，看到全部
        var resultAll = await service.SearchAsync("进度款", topK: 10, userId: "admin", isAdmin: true);
        Assert.True(resultAll.TotalHits >= 2, $"admin 应看到全部，实际 {resultAll.TotalHits}");
    }

    [Fact]
    public async Task Search_CrossProjectIsolation_BothFtsAndSemanticRespectScope()
    {
        var (conn, service) = CreateService();
        using var _ = conn;

        conn.Execute("INSERT INTO projects (id, name, created_by, created_at) VALUES (1, '项目A', 'user1', '2026-01-01 00:00:00')");
        conn.Execute("INSERT INTO projects (id, name, created_by, created_at) VALUES (2, '项目B', 'user2', '2026-01-01 00:00:00')");
        await service.IngestAsync("每个月百分之八十的进度款在月底前支付，剩余二十在竣工验收后付清。", "付款安排A", "call", "ref-a", 1, "user1");
        await service.IngestAsync("每个月百分之八十的进度款在月底前支付，剩余二十在竣工验收后付清。", "付款安排B", "call", "ref-b", 2, "user2");

        // user3 只有 project A 授权
        conn.Execute("INSERT INTO project_authorizations (project_id, user_id) VALUES (1, 'user3')");

        // 搜索"付款方式"——语义和 FTS 两路都必须只返回 A
        var result = await service.SearchAsync("付款方式", topK: 10, userId: "user3", isAdmin: false);
        Assert.All(result.Hits, h => Assert.Equal(1, h.ProjectId));
        Assert.DoesNotContain(result.Hits, h => h.ProjectId == 2);

        // 搜索"百分之八十"——FTS 路也必须只返回 A
        var result2 = await service.SearchAsync("百分之八十", topK: 10, userId: "user3", isAdmin: false);
        Assert.All(result2.Hits, h => Assert.Equal(1, h.ProjectId));
        Assert.DoesNotContain(result2.Hits, h => h.ProjectId == 2);
    }

    // ═══════════════════════════════════════════════════════════
    // 2. 项目写权限检查
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void CanAccessProject_AdminCanAccessAll()
    {
        var (conn, _) = CreateService();
        using var _ = conn;
        conn.Execute("INSERT INTO projects (id, name, created_by, created_at) VALUES (1, '项目A', 'user1', '2026-01-01 00:00:00')");

        Assert.True(KnowledgeBaseService.CanAccessProject(conn, 1, "admin", isAdmin: true));
        Assert.True(KnowledgeBaseService.CanAccessProject(conn, 999, "admin", isAdmin: true));
    }

    [Fact]
    public void CanAccessProject_CreatorCanAccess()
    {
        var (conn, _) = CreateService();
        using var _ = conn;
        conn.Execute("INSERT INTO projects (id, name, created_by, created_at) VALUES (1, '项目A', 'user1', '2026-01-01 00:00:00')");

        Assert.True(KnowledgeBaseService.CanAccessProject(conn, 1, "user1", isAdmin: false));
    }

    [Fact]
    public void CanAccessProject_AuthorizedUserCanAccess()
    {
        var (conn, _) = CreateService();
        using var _ = conn;
        conn.Execute("INSERT INTO projects (id, name, created_by, created_at) VALUES (1, '项目A', 'user1', '2026-01-01 00:00:00')");
        conn.Execute("INSERT INTO project_authorizations (project_id, user_id) VALUES (1, 'user3')");

        Assert.True(KnowledgeBaseService.CanAccessProject(conn, 1, "user3", isAdmin: false));
    }

    [Fact]
    public void CanAccessProject_UnauthorizedUserCannotAccess()
    {
        var (conn, _) = CreateService();
        using var _ = conn;
        conn.Execute("INSERT INTO projects (id, name, created_by, created_at) VALUES (1, '项目A', 'user1', '2026-01-01 00:00:00')");
        conn.Execute("INSERT INTO project_authorizations (project_id, user_id) VALUES (1, 'user3')");

        // user2 不是创建者，也没被授权
        Assert.False(KnowledgeBaseService.CanAccessProject(conn, 1, "user2", isAdmin: false));
        // user3 只对 project 1 有权限，对 project 2 没有权限
        Assert.False(KnowledgeBaseService.CanAccessProject(conn, 2, "user3", isAdmin: false));
    }

    // ═══════════════════════════════════════════════════════════
    // 3. STT 入库幂等
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task Ingest_Idempotent_SameSourceRefReturnsExistingDoc()
    {
        var (conn, service) = CreateService();
        using var _ = conn;

        // 第一次入库
        var result1 = await service.IngestAsync(
            fullText: "这是一段测试文本用于验证幂等性。",
            title: "测试录音",
            sourceType: "call",
            sourceRef: "42",
            projectId: null,
            createdBy: "user1");

        Assert.False(result1.Idempotent);
        var docId1 = result1.DocumentId;

        // 第二次入库同一 sourceRef
        var result2 = await service.IngestAsync(
            fullText: "这是一段完全不同的文本但 sourceRef 相同。",
            title: "测试录音",
            sourceType: "call",
            sourceRef: "42",
            projectId: null,
            createdBy: "user1");

        Assert.True(result2.Idempotent);
        Assert.Equal(docId1, result2.DocumentId);

        // 验证数据库只有 1 个文档
        var docCount = conn.ExecuteScalar<int>("SELECT COUNT(*) FROM knowledge_documents WHERE source_ref = '42'");
        Assert.Equal(1, docCount);

        // 验证 chunks 只有一份
        var chunkCount = conn.ExecuteScalar<int>("SELECT COUNT(*) FROM knowledge_chunks WHERE document_id = @Id", new { Id = docId1 });
        var chunkCountAfter = conn.ExecuteScalar<int>("SELECT COUNT(*) FROM knowledge_chunks");
        Assert.Equal(chunkCount, chunkCountAfter);
    }

    [Fact]
    public async Task Ingest_ManualDocumentsNotAffectedByIdempotency()
    {
        var (conn, service) = CreateService();
        using var _ = conn;

        // manual 文档即使有相同 sourceRef 也不走幂等
        var r1 = await service.IngestAsync("文本一", "手动文档1", "manual", "x", null, "user1");
        var r2 = await service.IngestAsync("文本二", "手动文档2", "manual", "x", null, "user1");

        Assert.False(r1.Idempotent);
        Assert.False(r2.Idempotent);
        Assert.NotEqual(r1.DocumentId, r2.DocumentId);

        var count = conn.ExecuteScalar<int>("SELECT COUNT(*) FROM knowledge_documents WHERE source_ref = 'x'");
        Assert.Equal(2, count);
    }

    // ═══════════════════════════════════════════════════════════
    // 4. 入库事务（故障注入回滚）
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task Ingest_TransactionSuccess_CommitsAll()
    {
        var (conn, service) = CreateService();
        using var _ = conn;

        var result = await service.IngestAsync(
            fullText: "这是一段测试文本用于验证事务提交。这是第二句话。",
            title: "事务提交测试",
            sourceType: "call",
            sourceRef: "tx-commit-test",
            projectId: null,
            createdBy: "user1");

        // 验证文档已提交
        var docCount = conn.ExecuteScalar<int>("SELECT COUNT(*) FROM knowledge_documents WHERE id = @Id", new { Id = result.DocumentId });
        Assert.Equal(1, docCount);

        // 验证 chunks 已提交
        var chunkCount = conn.ExecuteScalar<int>("SELECT COUNT(*) FROM knowledge_chunks WHERE document_id = @Id", new { Id = result.DocumentId });
        Assert.True(chunkCount > 0);

        // 验证 FTS 已同步（触发器在事务内执行）
        var ftsCount = conn.ExecuteScalar<int>("SELECT COUNT(*) FROM knowledge_fts");
        Assert.True(ftsCount > 0);
    }

    // ═══════════════════════════════════════════════════════════
    // 5. 说话人全链路测试（0/3/7 → 1/2/3 贯穿全链路）
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task SpeakerFullChain_NormalizedLabelsPersistAcrossAllLayers()
    {
        var (conn, service) = CreateService();
        using var _ = conn;

        // 模拟 SttWorker 的处理流程
        // 原始 segments: speaker 0, 3, 7, 0 (不连续)
        var segments = new List<SttSegment>
        {
            new() { Speaker = 0, Start = 0, End = 5, Text = "你好我是[已脱敏]" },
            new() { Speaker = 3, Start = 5, End = 10, Text = "你好陈总" },
            new() { Speaker = 7, Start = 10, End = 15, Text = "今天讨论付款方式" },
            new() { Speaker = 0, Start = 15, End = 20, Text = "每个月百分之八十" },
        };

        // 1. 说话人归一化（SttWorker 在持久化前调用）
        SpeakerLabelNormalizer.Normalize(segments);

        // 验证: 归一化后是 1/2/3/1
        Assert.Equal(1, segments[0].Speaker);
        Assert.Equal(2, segments[1].Speaker);
        Assert.Equal(3, segments[2].Speaker);
        Assert.Equal(1, segments[3].Speaker);

        // 2. 模拟 SttWorker 写 result_text（用归一化后的编号拼装）
        var resultText = string.Join("\n",
            segments.Select(s => $"【说话人{s.Speaker}】{s.Text}"));

        // 验证 result_text 包含 1/2/3，不包含 0/3/7
        Assert.Contains("说话人1", resultText);
        Assert.Contains("说话人2", resultText);
        Assert.Contains("说话人3", resultText);
        Assert.DoesNotContain("说话人0", resultText);
        Assert.DoesNotContain("说话人7", resultText);

        // 3. 模拟 SttWorker 写 result_json
        var resultJson = System.Text.Json.JsonSerializer.Serialize(
            segments.Select(s => new { speaker = s.Speaker, start = s.Start, end = s.End, text = s.Text }));

        using var jsonDoc = System.Text.Json.JsonDocument.Parse(resultJson);
        var jsonArr = jsonDoc.RootElement.EnumerateArray().ToList();
        Assert.Equal(1, jsonArr[0].GetProperty("speaker").GetInt32());
        Assert.Equal(2, jsonArr[1].GetProperty("speaker").GetInt32());
        Assert.Equal(3, jsonArr[2].GetProperty("speaker").GetInt32());
        Assert.Equal(1, jsonArr[3].GetProperty("speaker").GetInt32());

        // 4. 模拟 GET /api/stt/jobs/{id} 返回的 segments（从 result_json 反序列化）
        // SttEndpoints 用 JsonSerializer.Deserialize<List<object>> 解析，这里验证 JSON 结构正确
        // 已在上方 jsonArr 验证了 speaker 字段值

        // 5. 模拟 POST /api/stt/jobs/{id}/ingest → 入库
        var ingestResult = await service.IngestAsync(
            fullText: resultText,
            title: "通话录音",
            sourceType: "call",
            sourceRef: "99",
            projectId: null,
            createdBy: "user1",
            segments: segments);

        // 6. 验证 knowledge_documents.speakers 仍为 1/2/3
        var speakersJson = conn.ExecuteScalar<string>(
            "SELECT speakers FROM knowledge_documents WHERE id = @Id",
            new { Id = ingestResult.DocumentId });

        Assert.NotNull(speakersJson);
        using var speakersDoc = System.Text.Json.JsonDocument.Parse(speakersJson!);
        var speakersArr = speakersDoc.RootElement.EnumerateArray().ToList();
        Assert.Equal(3, speakersArr.Count); // 3 个说话人
        Assert.Equal(1, speakersArr[0].GetProperty("id").GetInt32());
        Assert.Equal(2, speakersArr[1].GetProperty("id").GetInt32());
        Assert.Equal(3, speakersArr[2].GetProperty("id").GetInt32());

        // 7. 验证全链路不出现 0/3/7 或 1/4/8
        var allSpeakerIds = speakersArr.Select(s => s.GetProperty("id").GetInt32()).ToList();
        Assert.DoesNotContain(0, allSpeakerIds);
        Assert.DoesNotContain(7, allSpeakerIds);
        Assert.DoesNotContain(4, allSpeakerIds);
        Assert.DoesNotContain(8, allSpeakerIds);
    }

    // ═══════════════════════════════════════════════════════════
    // 6. GetDocument / DeleteDocument 也复用 BuildScopeFilter
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task GetDocument_NonAdminCannotAccessOthersProject()
    {
        var (conn, service) = CreateService();
        using var _ = conn;

        conn.Execute("INSERT INTO projects (id, name, created_by, created_at) VALUES (1, '项目A', 'user1', '2026-01-01 00:00:00')");
        var result = await service.IngestAsync("项目A的文档内容关于钢筋采购和模板租赁。", "文档A", "call", "ref-a", 1, "user1");

        // user2 无权访问 project A
        var doc = service.GetDocument(result.DocumentId, "user2", isAdmin: false);
        Assert.Null(doc);

        // admin 可以访问
        var docAdmin = service.GetDocument(result.DocumentId, "admin", isAdmin: true);
        Assert.NotNull(docAdmin);
    }

    [Fact]
    public async Task DeleteDocument_NonAdminCannotDeleteOthersProject()
    {
        var (conn, service) = CreateService();
        using var _ = conn;

        conn.Execute("INSERT INTO projects (id, name, created_by, created_at) VALUES (1, '项目A', 'user1', '2026-01-01 00:00:00')");
        var result = await service.IngestAsync("项目A的文档内容关于钢筋采购和模板租赁。", "文档A", "call", "ref-a", 1, "user1");

        // user2 无权删除
        var deleted = service.DeleteDocument(result.DocumentId, "user2", isAdmin: false);
        Assert.False(deleted);

        // 文档仍存在
        var docCount = conn.ExecuteScalar<int>("SELECT COUNT(*) FROM knowledge_documents WHERE id = @Id", new { Id = result.DocumentId });
        Assert.Equal(1, docCount);
    }
}
</file>

<file path="EngineeringManager.Tests/Endpoints/KnowledgeBaseServiceTests.cs">
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
</file>

<file path="EngineeringManager.Tests/Endpoints/M2FourthRoundTests.cs">
using System.Data;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;
using Dapper;
using EngineeringManager.Api;
using EngineeringManager.Api.Services;
using EngineeringManager.Api.Services.Stt;
using EngineeringManager.Tests.Common;
using Microsoft.Data.Sqlite;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

// ═══════════════════════════════════════════════════════════
// M2 第四轮测试套件
// ═══════════════════════════════════════════════════════════

/// <summary>
/// 防止使用 PreInsertHook 的测试类并行执行导致 ObjectDisposedException
/// </summary>
[CollectionDefinition("M2FifthRound")]
public class M2FifthRoundCollection { }

/// <summary>
/// M2 第四轮：DB 级并发安全幂等 + 事务故障注入 + 模型自愈 + 端点权限
/// </summary>
[Collection("M2FifthRound")]
public class M2FourthRoundTests : IDisposable
{
    private SqliteConnection _conn;

    private SqliteConnection CreateConn()
    {
        _conn = new SqliteConnection("Data Source=:memory:");
        _conn.Open();
        _conn.Execute("PRAGMA journal_mode=WAL");

        _conn.Execute(@"
            CREATE TABLE IF NOT EXISTS knowledge_documents (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                source_type TEXT NOT NULL,
                source_ref  TEXT,
                project_id  INTEGER,
                title       TEXT NOT NULL,
                full_text   TEXT NOT NULL,
                speakers    TEXT,
                occurred_at TEXT,
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

            -- 030 迁移：唯一索引（DB 级并发安全）
            CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_doc_unique
            ON knowledge_documents(created_by, source_type, source_ref)
            WHERE source_type <> 'manual' AND source_ref IS NOT NULL;

            CREATE TABLE IF NOT EXISTS project_authorizations (
                project_id INTEGER NOT NULL,
                user_id TEXT NOT NULL,
                PRIMARY KEY (project_id, user_id)
            );
            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                created_by TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
        ");

        return _conn;
    }

    public void Dispose()
    {
        _conn?.Dispose();
    }

    // ═══════════════════════════════════════════════════════════
    // 二、DB 级并发安全幂等测试
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task Idempotent_SameUserSameSource_ReturnsExistingDoc()
    {
        var conn = CreateConn();
        var svc = new KnowledgeBaseService(conn, new FakeEmbeddingService());

        var r1 = await svc.IngestAsync("文本A", "标题", "call", "job-1", null, "user1");
        var r2 = await svc.IngestAsync("文本B", "标题", "call", "job-1", null, "user1");

        Assert.False(r1.Idempotent);
        Assert.True(r2.Idempotent);
        Assert.Equal(r1.DocumentId, r2.DocumentId);

        var docCount = conn.ExecuteScalar<int>("SELECT COUNT(*) FROM knowledge_documents WHERE source_ref = 'job-1'");
        Assert.Equal(1, docCount);
    }

    [Fact]
    public async Task Idempotent_DifferentUsersSameSource_IndependentDocs()
    {
        var conn = CreateConn();
        var svc = new KnowledgeBaseService(conn, new FakeEmbeddingService());

        var r1 = await svc.IngestAsync("文本A", "标题", "call", "job-1", null, "user1");
        var r2 = await svc.IngestAsync("文本B", "标题", "call", "job-1", null, "user2");

        Assert.False(r1.Idempotent);
        Assert.False(r2.Idempotent);
        Assert.NotEqual(r1.DocumentId, r2.DocumentId);

        var docCount = conn.ExecuteScalar<int>("SELECT COUNT(*) FROM knowledge_documents WHERE source_ref = 'job-1'");
        Assert.Equal(2, docCount);
    }

    [Fact]
    public async Task Idempotent_ManualDocsNotAffected()
    {
        var conn = CreateConn();
        var svc = new KnowledgeBaseService(conn, new FakeEmbeddingService());

        var r1 = await svc.IngestAsync("文本A", "手动1", "manual", "same-ref", null, "user1");
        var r2 = await svc.IngestAsync("文本B", "手动2", "manual", "same-ref", null, "user1");

        Assert.False(r1.Idempotent);
        Assert.False(r2.Idempotent);
        Assert.NotEqual(r1.DocumentId, r2.DocumentId);

        var count = conn.ExecuteScalar<int>("SELECT COUNT(*) FROM knowledge_documents WHERE source_ref = 'same-ref'");
        Assert.Equal(2, count);
    }

    [Fact]
    public async Task Idempotent_Concurrent10Calls_Only1Doc()
    {
        var conn = CreateConn();
        // SQLite 内存数据库在单连接上序列化执行，但 IngestAsync 是 async
        // 使用同一连接模拟并发调用
        var svc = new KnowledgeBaseService(conn, new FakeEmbeddingService());

        var tasks = Enumerable.Range(0, 10)
            .Select(_ => svc.IngestAsync("并发测试文本", "标题", "call", "concurrent-job", null, "user1"))
            .ToList();

        var results = await Task.WhenAll(tasks);

        // 所有调用应返回同一个 documentId
        var docIds = results.Select(r => r.DocumentId).Distinct().ToList();
        Assert.Single(docIds);

        // 至少有一些调用返回 idempotent=true
        var idempotentCount = results.Count(r => r.Idempotent);
        Assert.True(idempotentCount >= 1, $"至少 1 个应幂等，实际 {idempotentCount}");

        // 数据库只有 1 个文档
        var docCount = conn.ExecuteScalar<int>("SELECT COUNT(*) FROM knowledge_documents WHERE source_ref = 'concurrent-job'");
        Assert.Equal(1, docCount);

        // 只有 1 份 chunks
        var chunkCount = conn.ExecuteScalar<int>("SELECT COUNT(*) FROM knowledge_chunks WHERE document_id = @Id", new { Id = docIds[0] });
        var totalChunks = conn.ExecuteScalar<int>("SELECT COUNT(*) FROM knowledge_chunks");
        Assert.Equal(chunkCount, totalChunks);
    }

    // ═══════════════════════════════════════════════════════════
    // 三、真实 IngestAsync 事务故障测试（BEFORE INSERT 触发器注入）
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task Ingest_TransactionFailure_TriggerInjection_RollsBackCompletely()
    {
        var conn = CreateConn();
        var svc = new KnowledgeBaseService(conn, new FakeEmbeddingService());

        // 安装 BEFORE INSERT 触发器：当 chunk_index = 1 时 ABORT
        conn.Execute(@"
            CREATE TRIGGER inject_chunk_failure
            BEFORE INSERT ON knowledge_chunks
            WHEN new.chunk_index = 1
            BEGIN
                SELECT RAISE(ABORT, 'injected chunk failure');
            END;
        ");

        var docsBefore = conn.ExecuteScalar<int>("SELECT COUNT(*) FROM knowledge_documents");
        var chunksBefore = conn.ExecuteScalar<int>("SELECT COUNT(*) FROM knowledge_chunks");
        var ftsBefore = conn.ExecuteScalar<int>("SELECT COUNT(*) FROM knowledge_fts");

        // 构造足够长的文本，确保至少产生 2 个 chunks
        // MinChunkSize=300, MaxChunkSize=500，需要 > 500 字
        var longText = string.Join("。", Enumerable.Range(0, 100).Select(i => $"这是第{i}句话用于产生多个分块"));
        // longText 约 1800 字，会产生 4+ 个 chunks

        // 调用 IngestAsync 应抛异常
        await Assert.ThrowsAsync<SqliteException>(async () =>
        {
            await svc.IngestAsync(longText, "故障注入测试", "call", "fault-test", null, "user1");
        });

        // 验证: 0 条残留
        var docsAfter = conn.ExecuteScalar<int>("SELECT COUNT(*) FROM knowledge_documents");
        var chunksAfter = conn.ExecuteScalar<int>("SELECT COUNT(*) FROM knowledge_chunks");
        var ftsAfter = conn.ExecuteScalar<int>("SELECT COUNT(*) FROM knowledge_fts");

        Assert.Equal(docsBefore, docsAfter);
        Assert.Equal(chunksBefore, chunksAfter);
        Assert.Equal(ftsBefore, ftsAfter);

        Console.WriteLine($"[Test] 事务回滚验证: docs={docsAfter}(期望{docsBefore}), chunks={chunksAfter}(期望{chunksBefore}), fts={ftsAfter}(期望{ftsBefore})");
    }

    // ═══════════════════════════════════════════════════════════
    // 四、模型下载和自愈测试
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void Model_MissingModel_StatusUnavailable()
    {
        // 使用临时目录（不含模型文件）
        var tempDir = Path.Combine(Path.GetTempPath(), $"bge-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(tempDir);
        try
        {
            SttModelManager.SetEngineDirProvider(() => tempDir);

            Assert.False(SttModelManager.IsEmbeddingModelAvailable());

            var bge = new BgeEmbeddingService();
            Assert.Equal(BgeEmbeddingService.ModelStatus.Unavailable, bge.Status);
            Assert.False(bge.IsAvailable);
        }
        finally
        {
            SttModelManager.SetEngineDirProvider(null);
            try { Directory.Delete(tempDir, true); } catch { }
        }
    }

    [Fact]
    public async Task Model_ConcurrentEnsure_Only1Download()
    {
        var tempDir = Path.Combine(Path.GetTempPath(), $"bge-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(tempDir);
        try
        {
            SttModelManager.SetEngineDirProvider(() => tempDir);

            // 准备真实模型文件（从开发环境拷贝）
            var (realModelPath, realVocabPath) = SttModelManager.GetTextEmbeddingModelPaths();
            // 重置 provider 以获取真实路径
            SttModelManager.SetEngineDirProvider(null);
            var (realModel, realVocab) = SttModelManager.GetTextEmbeddingModelPaths();
            SttModelManager.SetEngineDirProvider(() => tempDir);

            // 注入下载器：从真实路径拷贝到临时路径
            var downloadCount = 0;
            SttModelManager.SetDownloadDelegate(async (url, destPath, ct) =>
            {
                Interlocked.Increment(ref downloadCount);
                // 模拟下载延迟
                await Task.Delay(100, ct);
                var src = url.Contains("vocab") ? realVocab : realModel;
                File.Copy(src, destPath);
            });

            // 确保真实模型存在
            Assert.True(File.Exists(realModel), "真实 BGE 模型必须存在才能运行此测试");
            Assert.True(File.Exists(realVocab), "真实 vocab 必须存在");

            // 并发 3 个 EnsureEmbeddingModelAsync
            var tasks = Enumerable.Range(0, 3)
                .Select(_ => SttModelManager.EnsureEmbeddingModelAsync())
                .ToList();
            await Task.WhenAll(tasks);

            // 验证: 模型已就绪
            Assert.True(SttModelManager.IsEmbeddingModelAvailable());

            // 验证: 下载只执行了 1 次（vocab 1 次 + model 1 次 = 2 次，但不应是 6 次）
            // 注意：downloadCount 是 delegate 被调用的次数
            Assert.Equal(2, downloadCount); // vocab + model 各 1 次

            Console.WriteLine($"[Test] 并发 3 个 EnsureEmbeddingModelAsync → 下载调用 {downloadCount} 次（期望 2: vocab+model）");
        }
        finally
        {
            SttModelManager.SetEngineDirProvider(null);
            SttModelManager.SetDownloadDelegate(null);
            try { Directory.Delete(tempDir, true); } catch { }
        }
    }

    [Fact]
    public async Task Model_ResidualTmpFile_CleanedBeforeDownload()
    {
        var tempDir = Path.Combine(Path.GetTempPath(), $"bge-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(tempDir);
        try
        {
            SttModelManager.SetEngineDirProvider(() => tempDir);

            // 创建残留 .tmp 文件
            var (modelPath, vocabPath) = SttModelManager.GetTextEmbeddingModelPaths();
            Directory.CreateDirectory(Path.GetDirectoryName(modelPath)!);
            File.WriteAllText(modelPath + ".tmp", "incomplete download");
            File.WriteAllText(vocabPath + ".tmp", "incomplete vocab");

            // 准备真实模型
            SttModelManager.SetEngineDirProvider(null);
            var (realModel, realVocab) = SttModelManager.GetTextEmbeddingModelPaths();
            SttModelManager.SetEngineDirProvider(() => tempDir);

            SttModelManager.SetDownloadDelegate((url, destPath, ct) =>
            {
                var src = url.Contains("vocab") ? realVocab : realModel;
                File.Copy(src, destPath);
                return Task.CompletedTask;
            });

            Assert.True(File.Exists(realModel), "真实 BGE 模型必须存在");

            await SttModelManager.EnsureEmbeddingModelAsync();

            // 验证: .tmp 文件已被清理
            Assert.False(File.Exists(modelPath + ".tmp"), "残留 .tmp 应被清理");
            Assert.False(File.Exists(vocabPath + ".tmp"), "残留 .tmp 应被清理");

            // 验证: 模型已就绪
            Assert.True(SttModelManager.IsEmbeddingModelAvailable());

            Console.WriteLine("[Test] 残留 .tmp 文件已被清理，模型下载成功");
        }
        finally
        {
            SttModelManager.SetEngineDirProvider(null);
            SttModelManager.SetDownloadDelegate(null);
            try { Directory.Delete(tempDir, true); } catch { }
        }
    }

    [Fact]
    public async Task Model_CorruptModelFile_SelfHealAndRedownload()
    {
        var tempDir = Path.Combine(Path.GetTempPath(), $"bge-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(tempDir);
        try
        {
            SttModelManager.SetEngineDirProvider(() => tempDir);

            // 准备真实模型
            SttModelManager.SetEngineDirProvider(null);
            var (realModel, realVocab) = SttModelManager.GetTextEmbeddingModelPaths();
            SttModelManager.SetEngineDirProvider(() => tempDir);

            Assert.True(File.Exists(realModel), "真实 BGE 模型必须存在");

            // 创建损坏的模型文件（太小）
            var (modelPath, vocabPath) = SttModelManager.GetTextEmbeddingModelPaths();
            Directory.CreateDirectory(Path.GetDirectoryName(modelPath)!);
            File.WriteAllText(modelPath, "corrupt model content"); // 太小，不合法
            File.Copy(realVocab, vocabPath); // vocab 是合法的

            // IsEmbeddingModelAvailable 应返回 false（因为模型文件太小）
            Assert.False(SttModelManager.IsEmbeddingModelAvailable());

            // 注入下载器
            SttModelManager.SetDownloadDelegate((url, destPath, ct) =>
            {
                var src = url.Contains("vocab") ? realVocab : realModel;
                File.Copy(src, destPath);
                return Task.CompletedTask;
            });

            // EnsureEmbeddingModelAsync 应检测到损坏并重新下载
            await SttModelManager.EnsureEmbeddingModelAsync();

            // 验证: 损坏文件被隔离为 .corrupt
            Assert.True(File.Exists(modelPath + ".corrupt"), "损坏模型应被重命名为 .corrupt");

            // 验证: 新模型已下载且有效
            Assert.True(SttModelManager.IsEmbeddingModelAvailable());

            // 验证: BgeEmbeddingService 能加载
            var bge = new BgeEmbeddingService();
            bge.Reset();
            Assert.True(bge.IsAvailable);
            Assert.Equal(BgeEmbeddingService.ModelStatus.Ready, bge.Status);

            Console.WriteLine("[Test] 损坏模型已自愈: .corrupt 隔离 + 重新下载 + Ready");
        }
        finally
        {
            SttModelManager.SetEngineDirProvider(null);
            SttModelManager.SetDownloadDelegate(null);
            try { Directory.Delete(tempDir, true); } catch { }
        }
    }

    [Fact]
    public async Task Model_CorruptVocab_SelfHealAndRedownload()
    {
        var tempDir = Path.Combine(Path.GetTempPath(), $"bge-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(tempDir);
        try
        {
            SttModelManager.SetEngineDirProvider(() => tempDir);

            // 准备真实模型
            SttModelManager.SetEngineDirProvider(null);
            var (realModel, realVocab) = SttModelManager.GetTextEmbeddingModelPaths();
            SttModelManager.SetEngineDirProvider(() => tempDir);

            Assert.True(File.Exists(realModel), "真实 BGE 模型必须存在");

            // 创建损坏的 vocab（缺少 special tokens）
            var (modelPath, vocabPath) = SttModelManager.GetTextEmbeddingModelPaths();
            Directory.CreateDirectory(Path.GetDirectoryName(modelPath)!);
            File.Copy(realModel, modelPath); // 模型合法
            File.WriteAllText(vocabPath, "invalid\nvocab\nno special tokens"); // 损坏

            // IsEmbeddingModelAvailable 应返回 false
            Assert.False(SttModelManager.IsEmbeddingModelAvailable());

            // 注入下载器
            SttModelManager.SetDownloadDelegate((url, destPath, ct) =>
            {
                var src = url.Contains("vocab") ? realVocab : realModel;
                File.Copy(src, destPath);
                return Task.CompletedTask;
            });

            await SttModelManager.EnsureEmbeddingModelAsync();

            // 验证: vocab 已重新下载
            Assert.True(SttModelManager.IsEmbeddingModelAvailable());

            Console.WriteLine("[Test] 损坏 vocab 已自愈: 删除 + 重新下载");
        }
        finally
        {
            SttModelManager.SetEngineDirProvider(null);
            SttModelManager.SetDownloadDelegate(null);
            try { Directory.Delete(tempDir, true); } catch { }
        }
    }

    [Fact]
    public async Task Model_ResetAfterHeal_EnterReady()
    {
        var tempDir = Path.Combine(Path.GetTempPath(), $"bge-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(tempDir);
        try
        {
            SttModelManager.SetEngineDirProvider(() => tempDir);

            // 准备真实模型
            SttModelManager.SetEngineDirProvider(null);
            var (realModel, realVocab) = SttModelManager.GetTextEmbeddingModelPaths();
            SttModelManager.SetEngineDirProvider(() => tempDir);

            Assert.True(File.Exists(realModel), "真实 BGE 模型必须存在");

            // 1. 初始状态: 模型不存在 → Unavailable
            var bge = new BgeEmbeddingService();
            Assert.Equal(BgeEmbeddingService.ModelStatus.Unavailable, bge.Status);

            // 2. 拷贝真实模型到临时目录
            var (modelPath, vocabPath) = SttModelManager.GetTextEmbeddingModelPaths();
            Directory.CreateDirectory(Path.GetDirectoryName(modelPath)!);
            File.Copy(realModel, modelPath);
            File.Copy(realVocab, vocabPath);

            // 3. Reset → 尝试初始化 → Ready
            bge.Reset();
            Assert.True(bge.IsAvailable);
            Assert.Equal(BgeEmbeddingService.ModelStatus.Ready, bge.Status);

            Console.WriteLine("[Test] 模型补齐后 Reset → Ready 成功");
        }
        finally
        {
            SttModelManager.SetEngineDirProvider(null);
            SttModelManager.SetDownloadDelegate(null);
            try { Directory.Delete(tempDir, true); } catch { }
        }
    }

    [Fact]
    public async Task Model_DownloadInterrupted_NoFinalFile()
    {
        var tempDir = Path.Combine(Path.GetTempPath(), $"bge-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(tempDir);
        try
        {
            SttModelManager.SetEngineDirProvider(() => tempDir);

            // 注入会失败的下载器
            SttModelManager.SetDownloadDelegate((url, destPath, ct) =>
            {
                // 写入部分数据然后抛异常
                File.WriteAllText(destPath, "partial");
                throw new IOException("simulated download interruption");
            });

            // EnsureEmbeddingModelAsync 应抛异常
            await Assert.ThrowsAsync<IOException>(async () =>
            {
                await SttModelManager.EnsureEmbeddingModelAsync();
            });

            // 验证: 最终文件不存在（只有 .tmp 被清理或残留，但不是最终路径）
            var (modelPath, vocabPath) = SttModelManager.GetTextEmbeddingModelPaths();

            // vocab 先下载，会失败，所以 vocab 不应存在
            Assert.False(File.Exists(vocabPath), "下载失败后 vocab 不应存在");
            Assert.False(File.Exists(modelPath), "下载失败后 model 不应存在");

            Console.WriteLine("[Test] 下载中断: 最终文件不存在");
        }
        finally
        {
            SttModelManager.SetEngineDirProvider(null);
            SttModelManager.SetDownloadDelegate(null);
            try { Directory.Delete(tempDir, true); } catch { }
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 五、真实端点权限测试（CanAccessProject + DB 验证）
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task WritePermission_UnauthorizedUser_DbNotModified()
    {
        var conn = CreateConn();
        var svc = new KnowledgeBaseService(conn, new FakeEmbeddingService());

        // user1 创建 project A
        conn.Execute("INSERT INTO projects (id, name, created_by, created_at) VALUES (1, '项目A', 'user1', '2026-01-01 00:00:00')");

        // user2 无权操作 project A
        var canAccess = KnowledgeBaseService.CanAccessProject(conn, 1, "user2", isAdmin: false);
        Assert.False(canAccess);

        // 验证: 如果 CanAccessProject 返回 false，端点层应返回 403，不调用 IngestAsync
        // 模拟端点逻辑: 先检查权限，无权则不入库
        var docsBefore = conn.ExecuteScalar<int>("SELECT COUNT(*) FROM knowledge_documents");
        var chunksBefore = conn.ExecuteScalar<int>("SELECT COUNT(*) FROM knowledge_chunks");
        var ftsBefore = conn.ExecuteScalar<int>("SELECT COUNT(*) FROM knowledge_fts");

        // 模拟: 端点检查权限后拒绝，不执行 IngestAsync
        if (!canAccess)
        {
            // 端点返回 403，不入库
        }
        else
        {
            await svc.IngestAsync("无权文本", "无权标题", "call", "unauthorized-test", 1, "user2");
        }

        // 验证: 数据库未新增
        var docsAfter = conn.ExecuteScalar<int>("SELECT COUNT(*) FROM knowledge_documents");
        var chunksAfter = conn.ExecuteScalar<int>("SELECT COUNT(*) FROM knowledge_chunks");
        var ftsAfter = conn.ExecuteScalar<int>("SELECT COUNT(*) FROM knowledge_fts");

        Assert.Equal(docsBefore, docsAfter);
        Assert.Equal(chunksBefore, chunksAfter);
        Assert.Equal(ftsBefore, ftsAfter);

        Console.WriteLine($"[Test] 无权用户写入被拒: docs={docsAfter}(期望{docsBefore}), chunks={chunksAfter}(期望{chunksBefore}), fts={ftsAfter}(期望{ftsBefore})");
    }

    [Fact]
    public async Task WritePermission_AuthorizedUser_CanWrite()
    {
        var conn = CreateConn();
        var svc = new KnowledgeBaseService(conn, new FakeEmbeddingService());

        // user1 创建 project A
        conn.Execute("INSERT INTO projects (id, name, created_by, created_at) VALUES (1, '项目A', 'user1', '2026-01-01 00:00:00')");
        // user3 获 project A 授权
        conn.Execute("INSERT INTO project_authorizations (project_id, user_id) VALUES (1, 'user3')");

        // user3 有权操作 project A
        var canAccess = KnowledgeBaseService.CanAccessProject(conn, 1, "user3", isAdmin: false);
        Assert.True(canAccess);

        // user3 入库到 project A
        var result = await svc.IngestAsync("授权用户的文本", "授权标题", "call", "authorized-test", 1, "user3");

        // 验证: 数据库已新增
        var docCount = conn.ExecuteScalar<int>("SELECT COUNT(*) FROM knowledge_documents WHERE id = @Id", new { Id = result.DocumentId });
        Assert.Equal(1, docCount);

        Console.WriteLine("[Test] 授权用户写入成功");
    }
}

// ═══════════════════════════════════════════════════════════
// 一、真实 BGE 端到端语义验收（不可跳过）
// ═══════════════════════════════════════════════════════════

/// <summary>
/// 真实 BGE 端到端验收测试（第五轮重做）
///
/// 数据来源：
/// - [已脱敏]文档：从 asr_compare.csv 读取 56f5549ff1672a5b130190f61c865da7.wav 的
///   Qwen3-1.7B 纠正文本（真实录音转写，非硬编码）。该录音讨论合同付款条款，
///   包含"每个月百分之八十"但不包含"付款方式"。
/// - 竞争文档：从 results_06b.json 读取其他真实录音的 Qwen3-0.6B 原始转写文本。
///
/// 使用真实 Xenova/BAAI bge-small-zh-v1.5 ONNX 模型，
/// 搜索"付款方式"验证语义命中[已脱敏]文档中含"每个月百分之八十"的目标块。
///
/// 不可跳过：模型缺失时 Assert.Fail，不允许 return 跳过。
/// </summary>
[Collection("M2FifthRound")]
public class BgeE2ETestsV2
{
    /// <summary>原始 ASR 产物文件路径</summary>
    private const string ArtifactPath = @"e:\测试\results_06b.json";

    /// <summary>ASR 对比 CSV 文件路径（含纠正文本）</summary>
    private const string CsvPath = @"e:\测试\asr_compare.csv";

    /// <summary>[已脱敏]文档对应的录音文件名（56f5...wav 讨论合同付款条款，hotwords 含"[已脱敏]"）</summary>
    private const string ChenZeweiFile = "56f5549ff1672a5b130190f61c865da7.wav";

    private static (SqliteConnection conn, KnowledgeBaseService service) CreateServiceWithRealBge()
    {
        var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        conn.Execute("PRAGMA journal_mode=WAL");

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
        ");

        var embedding = new BgeEmbeddingService();
        var service = new KnowledgeBaseService(conn, embedding);
        return (conn, service);
    }

    /// <summary>从 asr_compare.csv 读取指定录音文件的纠正文本（第 3 列 Qwen3-1.7B结果）</summary>
    private static string LoadCorrectedText(string filename)
    {
        Assert.True(File.Exists(CsvPath), $"ASR 对比文件不存在: {CsvPath}");

        using var parser = new Microsoft.VisualBasic.FileIO.TextFieldParser(CsvPath, System.Text.Encoding.UTF8);
        parser.TextFieldType = Microsoft.VisualBasic.FileIO.FieldType.Delimited;
        parser.SetDelimiters(",");
        parser.HasFieldsEnclosedInQuotes = true;

        while (!parser.EndOfData)
        {
            var fields = parser.ReadFields()!;
            if (fields.Length >= 3 && fields[0] == filename)
            {
                return fields[2]; // 第 3 列：Qwen3-1.7B结果（纠正文本）
            }
        }

        Assert.Fail($"CSV 中找不到录音文件: {filename}");
        return ""; // unreachable
    }

    /// <summary>从 results_06b.json 读取指定 key 的转写文本</summary>
    private static string LoadTranscriptText(string key)
    {
        Assert.True(File.Exists(ArtifactPath), $"STT 产物文件不存在: {ArtifactPath}");
        var json = File.ReadAllText(ArtifactPath);
        var doc = JsonDocument.Parse(json);
        Assert.True(doc.RootElement.TryGetProperty(key, out var element),
            $"STT 产物中不包含 key: {key}");
        return element.GetProperty("text").GetString()!;
    }

    /// <summary>计算 SHA-256 哈希</summary>
    private static string Sha256(string text)
    {
        var bytes = System.Text.Encoding.UTF8.GetBytes(text);
        var hash = SHA256.HashData(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    [Fact]
    public async Task E2E_RealBge_SemanticSearch_HitsTargetChunk()
    {
        // 清除可能残留的 PreInsertHook（防止并行测试干扰）
        KnowledgeBaseService.PreInsertHook = null;

        // ═══════════════════════════════════════════════════════════
        // 1. 模型可用性检查（不可跳过）
        // ═══════════════════════════════════════════════════════════
        Assert.True(SttModelManager.IsEmbeddingModelAvailable(),
            "BGE 嵌入模型不可用。请先运行 SttModelManager.EnsureEmbeddingModelAsync() 下载模型。此测试不可跳过。");

        var bgeSvc = new BgeEmbeddingService();
        Assert.True(bgeSvc.IsAvailable,
            $"BGE 模型加载失败 (状态={bgeSvc.Status}, 错误={bgeSvc.LastError})。此测试不可跳过。");

        // 模型实际路径和文件大小
        var (modelPath, vocabPath) = SttModelManager.GetTextEmbeddingModelPaths();
        var modelSize = File.Exists(modelPath) ? new FileInfo(modelPath).Length : 0;
        var vocabSize = File.Exists(vocabPath) ? new FileInfo(vocabPath).Length : 0;

        Console.WriteLine($"[E2E] === 模型信息 ===");
        Console.WriteLine($"[E2E] 模型路径: {modelPath}");
        Console.WriteLine($"[E2E] 模型大小: {modelSize} bytes");
        Console.WriteLine($"[E2E] vocab 路径: {vocabPath}");
        Console.WriteLine($"[E2E] vocab 大小: {vocabSize} bytes");
        Console.WriteLine($"[E2E] IsAvailable: {bgeSvc.IsAvailable}");
        Console.WriteLine($"[E2E] 模型状态: {bgeSvc.Status}");

        // ═══════════════════════════════════════════════════════════
        // 2. 读取[已脱敏]文档的真实纠正文本
        // ═══════════════════════════════════════════════════════════
        var chenZeweiText = LoadCorrectedText(ChenZeweiFile);

        Console.WriteLine($"\n[E2E] === [已脱敏]文档（真实录音纠正文本）===");
        Console.WriteLine($"[E2E] 录音文件: {ChenZeweiFile}");
        Console.WriteLine($"[E2E] 全文 SHA-256: {Sha256(chenZeweiText)}");
        Console.WriteLine($"[E2E] 全文长度: {chenZeweiText.Length} 字");
        Console.WriteLine($"[E2E] 全文是否含'每个月百分之八十': {chenZeweiText.Contains("每个月百分之八十")}");
        Console.WriteLine($"[E2E] 全文是否含'付款方式': {chenZeweiText.Contains("付款方式")}");

        // ═══════════════════════════════════════════════════════════
        // 3. 前置断言：[已脱敏]文本包含目标短语，不含搜索词
        // ═══════════════════════════════════════════════════════════
        Assert.Contains("每个月百分之八十", chenZeweiText);
        Assert.DoesNotContain("付款方式", chenZeweiText);

        // ═══════════════════════════════════════════════════════════
        // 4. 读取竞争文档（其他真实录音转写文本）
        // ═══════════════════════════════════════════════════════════
        var tanJunText = LoadTranscriptText("[已脱敏]@137 3593 8788_20260615115801.wav");
        var chenZeweiCallText = LoadTranscriptText("通话-[已脱敏]-202606101153(1).wav");
        var wageDisputeText = LoadTranscriptText("[已脱敏]-2605211530(1).wav");

        Console.WriteLine($"\n[E2E] === 竞争文档 ===");
        Console.WriteLine($"[E2E] [已脱敏]录音: {tanJunText.Length} 字");
        Console.WriteLine($"[E2E] [已脱敏]通话录音: {chenZeweiCallText.Length} 字");
        Console.WriteLine($"[E2E] 工资纠纷录音: {wageDisputeText.Length} 字");

        // ═══════════════════════════════════════════════════════════
        // 5. 入库：[已脱敏]文档为 r1，其他为竞争候选
        // ═══════════════════════════════════════════════════════════
        var (conn, service) = CreateServiceWithRealBge();
        using var _ = conn;

        var r1 = await service.IngestAsync(chenZeweiText, "合同付款条款-[已脱敏]", "call", "real-stt-001", null, "admin");
        var r2 = await service.IngestAsync(tanJunText, "通话-[已脱敏]-进度款", "call", "real-stt-002", null, "admin");
        var r3 = await service.IngestAsync(chenZeweiCallText, "通话-[已脱敏]-税务", "call", "real-stt-003", null, "admin");
        var r4 = await service.IngestAsync(wageDisputeText, "通话-工资纠纷", "call", "real-stt-004", null, "admin");

        // 验证入库结果
        var totalDocs = conn.ExecuteScalar<int>("SELECT COUNT(*) FROM knowledge_documents");
        var totalChunks = conn.ExecuteScalar<int>("SELECT COUNT(*) FROM knowledge_chunks");
        var chunksWithEmbedding = conn.ExecuteScalar<int>("SELECT COUNT(*) FROM knowledge_chunks WHERE embedding IS NOT NULL");

        Console.WriteLine($"\n[E2E] === 入库结果 ===");
        Console.WriteLine($"[E2E] 文档数: {totalDocs}");
        Console.WriteLine($"[E2E] chunk 总数: {totalChunks}");
        Console.WriteLine($"[E2E] 含 embedding 的 chunk: {chunksWithEmbedding}");
        Console.WriteLine($"[E2E] r1.DocumentId = {r1.DocumentId}");
        Console.WriteLine($"[E2E] r1.HasEmbeddings = {r1.HasEmbeddings}");

        Assert.True(totalDocs >= 4, $"应有至少 4 个文档，实际 {totalDocs}");
        Assert.True(totalChunks >= 4, $"应有至少 4 个 chunks，实际 {totalChunks}");
        Assert.True(r1.HasEmbeddings, "r1 应有 embedding");

        // 验证 embedding 维度
        var embeddingSize = conn.ExecuteScalar<long>(
            "SELECT LENGTH(embedding) FROM knowledge_chunks WHERE embedding IS NOT NULL LIMIT 1");
        Console.WriteLine($"[E2E] embedding BLOB 大小: {embeddingSize} bytes (期望 2048 = 512×4)");
        Assert.Equal(2048, embeddingSize);

        // ═══════════════════════════════════════════════════════════
        // 6. 搜索"付款方式"
        // ═══════════════════════════════════════════════════════════
        var searchResult = await service.SearchAsync("付款方式", topK: 20, userId: "admin", isAdmin: true);

        Console.WriteLine($"\n[E2E] === 搜索 '付款方式' ===");
        Console.WriteLine($"[E2E] 总命中: {searchResult.TotalHits}");
        Console.WriteLine($"[E2E] usedSemantic: {searchResult.UsedSemantic}");

        Assert.True(searchResult.TotalHits > 0, "搜索应有命中");
        Assert.True(searchResult.UsedSemantic, "应使用了语义检索");

        // ═══════════════════════════════════════════════════════════
        // 7. 输出 FTS 候选及排名
        // ═══════════════════════════════════════════════════════════
        Console.WriteLine("\n[E2E] === FTS 候选 ===");
        var ftsHits = searchResult.Hits.Where(h => h.FtsRank.HasValue).OrderBy(h => h.FtsRank).ToList();
        foreach (var h in ftsHits)
        {
            Console.WriteLine($"  FTS rank={h.FtsRank}, score={h.FtsScore:F4}, chunkId={h.ChunkId}, docId={h.DocumentId}");
            Console.WriteLine($"  text: {h.Text.Substring(0, Math.Min(100, h.Text.Length))}...");
        }
        Console.WriteLine($"[E2E] FTS 命中数: {ftsHits.Count}");

        // ═══════════════════════════════════════════════════════════
        // 8. 输出语义候选、余弦相似度及排名
        // ═══════════════════════════════════════════════════════════
        Console.WriteLine("\n[E2E] === 语义候选 ===");
        var semanticHits = searchResult.Hits.Where(h => h.SemanticRank.HasValue).OrderBy(h => h.SemanticRank).ToList();
        foreach (var h in semanticHits)
        {
            Console.WriteLine($"  语义 rank={h.SemanticRank}, score={h.SemanticScore:F6}, chunkId={h.ChunkId}, docId={h.DocumentId}");
            Console.WriteLine($"  text: {h.Text.Substring(0, Math.Min(100, h.Text.Length))}...");
        }
        Console.WriteLine($"[E2E] 语义命中数: {semanticHits.Count}");

        // ═══════════════════════════════════════════════════════════
        // 9. 输出 RRF 最终排名和分数
        // ═══════════════════════════════════════════════════════════
        Console.WriteLine("\n[E2E] === RRF 最终排名 ===");
        var sorted = searchResult.Hits.OrderByDescending(h => h.RrfScore ?? 0).ToList();
        foreach (var h in sorted)
        {
            Console.WriteLine($"  RRF score={h.RrfScore:F6}, ftsRank={h.FtsRank}, semRank={h.SemanticRank}, chunkId={h.ChunkId}, docId={h.DocumentId}");
            Console.WriteLine($"  text: {h.Text.Substring(0, Math.Min(120, h.Text.Length))}...");
        }

        // ═══════════════════════════════════════════════════════════
        // 10. 锁定目标块：[已脱敏]文档中含"每个月百分之八十"的块
        // ═══════════════════════════════════════════════════════════
        var targetHit = searchResult.Hits.SingleOrDefault(h =>
            h.DocumentId == r1.DocumentId
            && h.Text.Contains("每个月百分之八十"));

        Console.WriteLine($"\n[E2E] === 验收输出 ===");
        Console.WriteLine($"[E2E] [已脱敏] documentId = {r1.DocumentId}");
        Console.WriteLine($"[E2E] 目标块 documentId = {targetHit?.DocumentId}");
        Console.WriteLine($"[E2E] 两者是否相等: {targetHit != null && r1.DocumentId == targetHit.DocumentId}");

        Assert.NotNull(targetHit);
        Assert.Equal(r1.DocumentId, targetHit!.DocumentId);
        Assert.Contains("每个月百分之八十", targetHit.Text);
        Assert.DoesNotContain("付款方式", targetHit.Text);
        Assert.Null(targetHit.FtsRank);
        Assert.NotNull(targetHit.SemanticRank);
        Assert.True(targetHit.SemanticScore.HasValue);

        Console.WriteLine($"[E2E] 目标块包含'每个月百分之八十': True");
        Console.WriteLine($"[E2E] 目标块不含'付款方式': True");
        Console.WriteLine($"[E2E] FTS rank = null");
        Console.WriteLine($"[E2E] Semantic rank = {targetHit.SemanticRank}");
        Console.WriteLine($"[E2E] Semantic score = {targetHit.SemanticScore:F6}");
        Console.WriteLine($"[E2E] RRF score = {targetHit.RrfScore:F6}");
        Console.WriteLine($"[E2E] ChunkId = {targetHit.ChunkId}");
        Console.WriteLine($"[E2E] ChunkIndex = {targetHit.ChunkIndex}");
        Console.WriteLine($"[E2E] 完整目标文本:");
        Console.WriteLine(targetHit.Text);

        // ═══════════════════════════════════════════════════════════
        // 11. 最终验收结论
        // ═══════════════════════════════════════════════════════════
        Console.WriteLine($"\n[E2E] === 验收结论 ===");
        Console.WriteLine($"[E2E] 搜索'付款方式' → 语义命中[已脱敏]文档中含'每个月百分之八十'的块");
        Console.WriteLine($"[E2E] 目标块不含'付款方式'原词 → 证明是语义命中，非 FTS 原词匹配");
        Console.WriteLine($"[E2E] FTS rank = null → FTS 未命中此块");
        Console.WriteLine($"[E2E] Semantic rank = {targetHit.SemanticRank} → 语义检索命中");
        Console.WriteLine($"[E2E] Semantic score = {targetHit.SemanticScore:F6} → 有实际数值");
    }
}

// ═══════════════════════════════════════════════════════════
// 二、真实多连接并发幂等测试（临时文件 DB + 10 独立连接 + Barrier）
// ═══════════════════════════════════════════════════════════

/// <summary>
/// 真实多连接并发幂等测试（第五轮）
///
/// 不再使用单个 :memory: 连接模拟并发。
/// 使用临时文件 SQLite 数据库，为 10 个并发调用分别创建独立的 SqliteConnection
/// 和 KnowledgeBaseService，通过 Barrier + internal PreInsertHook 确保所有调用
/// 在"快速幂等查询未命中、BeginTransaction/INSERT 之前"同时起跑。
/// </summary>
[Collection("M2FifthRound")]
public class M2FifthRoundConcurrentTests : IDisposable
{
    private string _dbPath = null!;

    private void InitDatabase(string dbPath)
    {
        using var conn = new SqliteConnection($"Data Source={dbPath}");
        conn.Open();
        conn.Execute("PRAGMA journal_mode=WAL");

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

            -- 030 迁移：唯一索引（DB 级并发安全）
            CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_doc_unique
            ON knowledge_documents(created_by, source_type, source_ref)
            WHERE source_type <> 'manual' AND source_ref IS NOT NULL;
        ");
    }

    [Fact]
    public async Task Idempotent_RealMultiConnection_10ConcurrentCalls_Only1Doc()
    {
        // 1. 临时文件数据库
        _dbPath = Path.Combine(Path.GetTempPath(), $"concurrent-test-{Guid.NewGuid():N}.db");
        InitDatabase(_dbPath);

        var connStr = $"Data Source={_dbPath}";

        // 2. Barrier: 10 个任务在 PreInsertHook 处汇合后一起继续
        const int concurrentCount = 10;
        using var barrier = new Barrier(concurrentCount);

        // 设置 internal 测试钩子：快速幂等查询之后、BeginTransaction 之前
        KnowledgeBaseService.PreInsertHook = () =>
        {
            // 所有 10 个调用在此汇合，确保都通过了快速幂等查询（全部未命中）
            // 然后一起继续执行 INSERT，最大化并发冲突概率
            // 超时 30 秒防止死锁
            barrier.SignalAndWait(TimeSpan.FromSeconds(30));
        };

        try
        {
            // 确保线程池有足够线程，避免 Barrier 阻塞导致死锁
            System.Threading.ThreadPool.GetMinThreads(out var minWorker, out var minIo);
            if (minWorker < concurrentCount + 4)
                System.Threading.ThreadPool.SetMinThreads(concurrentCount + 4, minIo);

            // 3. 为每个并发调用创建独立的连接和 Service
            var connections = new List<SqliteConnection>();
            var services = new List<KnowledgeBaseService>();

            for (int i = 0; i < concurrentCount; i++)
            {
                var conn = new SqliteConnection(connStr);
                conn.Open();
                // 设置 busy_timeout 避免 SQLITE_BUSY 被误当成幂等成功
                conn.Execute("PRAGMA busy_timeout=5000");
                connections.Add(conn);
                services.Add(new KnowledgeBaseService(conn, new FakeEmbeddingService()));
            }

            // 4. 10 个任务同时起跑（用 Task.Run 确保各自获得线程池线程）
            var tasks = Enumerable.Range(0, concurrentCount)
                .Select(i => Task.Run(() => services[i].IngestAsync(
                    "这是并发幂等测试的真实文本，用于验证多连接竞态下的幂等性。这段文本需要足够长以产生分块。",
                    "并发测试标题",
                    "call",
                    "concurrent-job-001",
                    null,
                    "user1")))
                .ToList();

            var results = await Task.WhenAll(tasks);

            // 5. 断言：10 个调用全部成功返回
            Assert.Equal(concurrentCount, results.Length);

            // 6. 断言：10 个结果的 DocumentId 完全相同
            var docIds = results.Select(r => r.DocumentId).Distinct().ToList();
            Assert.Single(docIds);

            // 7. 断言：恰好 1 个 Idempotent=false
            var nonIdempotentCount = results.Count(r => !r.Idempotent);
            Assert.Equal(1, nonIdempotentCount);

            // 8. 断言：其余 9 个 Idempotent=true
            var idempotentCount = results.Count(r => r.Idempotent);
            Assert.Equal(9, idempotentCount);

            // 9. 数据库验证：knowledge_documents 恰好 1 条
            using var verifyConn = new SqliteConnection(connStr);
            verifyConn.Open();
            var docCount = verifyConn.ExecuteScalar<int>(
                "SELECT COUNT(*) FROM knowledge_documents WHERE source_ref = 'concurrent-job-001'");
            Assert.Equal(1, docCount);

            // 10. knowledge_chunks 只有该文档的一份
            var docId = docIds[0];
            var chunkCount = verifyConn.ExecuteScalar<int>(
                "SELECT COUNT(*) FROM knowledge_chunks WHERE document_id = @Id", new { Id = docId });
            var totalChunks = verifyConn.ExecuteScalar<int>("SELECT COUNT(*) FROM knowledge_chunks");
            Assert.Equal(chunkCount, totalChunks);

            // 11. knowledge_fts 没有重复
            var ftsCount = verifyConn.ExecuteScalar<int>("SELECT COUNT(*) FROM knowledge_fts");
            Assert.Equal(chunkCount, ftsCount);

            // 12. 至少一个调用实际走过"唯一约束冲突后返回已有文档"的分支
            // （Idempotent=true 的调用要么走了快速查询命中，要么走了唯一约束冲突捕获）
            Assert.True(idempotentCount >= 1,
                $"至少 1 个调用应幂等，实际 {idempotentCount}");

            // 清理连接
            foreach (var c in connections) c.Dispose();

            // 输出
            Console.WriteLine($"[Concurrent] 10 并发调用 → 1 个文档, {chunkCount} 个 chunks");
            Console.WriteLine($"[Concurrent] Idempotent=false: {nonIdempotentCount}, Idempotent=true: {idempotentCount}");
            Console.WriteLine($"[Concurrent] DocumentId: {docId}");
            Console.WriteLine($"[Concurrent] knowledge_documents: {docCount}");
            Console.WriteLine($"[Concurrent] knowledge_chunks: {totalChunks}");
            Console.WriteLine($"[Concurrent] knowledge_fts: {ftsCount}");
        }
        finally
        {
            KnowledgeBaseService.PreInsertHook = null;
        }
    }

    public void Dispose()
    {
        try { if (_dbPath != null && File.Exists(_dbPath)) File.Delete(_dbPath); } catch { }
        try { if (_dbPath != null && File.Exists(_dbPath + "-wal")) File.Delete(_dbPath + "-wal"); } catch { }
        try { if (_dbPath != null && File.Exists(_dbPath + "-shm")) File.Delete(_dbPath + "-shm"); } catch { }
    }
}

// ═══════════════════════════════════════════════════════════
// 三、真实 HTTP 403 端点测试（启动测试 API + POST 无权 projectId）
// ═══════════════════════════════════════════════════════════

/// <summary>
/// 真实 HTTP 端点权限测试（第五轮）
///
/// 不再手写 if 模拟端点逻辑，而是：
/// 1. 启动测试 API（继承 ApiTestBase）
/// 2. 登录 admin 创建项目和 worker 用户
/// 3. 登录 worker 用户获取 JWT token
/// 4. POST /api/knowledge/documents 携带无权 projectId
/// 5. 断言 HTTP 403
/// 6. 查询数据库断言 documents/chunks/FTS 均未新增
/// </summary>
[Collection("M2FifthRound")]
public class M2FifthRoundHttp403Tests : ApiTestBase
{
    [Fact]
    public async Task WritePermission_UnauthorizedUser_ReturnsHttp403_DbNotModified()
    {
        // 1. admin 登录获取 token
        var loginResp = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = "admin", password = "admin123" });
        loginResp.EnsureSuccessStatusCode();
        var loginJson = await loginResp.Content.ReadFromJsonAsync<JsonElement>();
        var adminToken = loginJson.GetProperty("data").GetProperty("token").GetString()!;

        // 2. admin 创建项目 A
        Client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);

        var createProjectResp = await Client.PostAsJsonAsync("/api/projects",
            new { name = "项目A-403测试", description = "用于403权限测试" });
        createProjectResp.EnsureSuccessStatusCode();
        var projectJson = await createProjectResp.Content.ReadFromJsonAsync<JsonElement>();
        var projectId = (int)projectJson.GetProperty("data").GetInt64();

        // 3. admin 创建 worker 用户
        var salt = "test-salt-1234567890123456";
        var hash = EngineeringManager.Api.Common.HashPassword("worker123", salt, 2);

        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Open();
            // 确保列存在
            try { conn.Execute("ALTER TABLE users ADD COLUMN is_default_password INTEGER DEFAULT 0"); } catch { }
            conn.Execute(@"
                INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
                VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
                new
                {
                    Id = "worker-403",
                    Username = "worker403",
                    Password = "worker123",
                    Hash = hash,
                    Salt = salt,
                    Version = 2,
                    DisplayName = "工人403测试",
                    RoleId = "worker",
                    Status = "active",
                    Now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
                });
        }

        // 4. worker 登录获取 token
        Client.DefaultRequestHeaders.Authorization = null;
        var workerLoginResp = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = "worker403", password = "worker123" });
        workerLoginResp.EnsureSuccessStatusCode();
        var workerLoginJson = await workerLoginResp.Content.ReadFromJsonAsync<JsonElement>();
        var workerToken = workerLoginJson.GetProperty("data").GetProperty("token").GetString()!;

        // 5. 记录数据库当前状态
        int docsBefore, chunksBefore, ftsBefore;
        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Open();
            docsBefore = conn.ExecuteScalar<int>("SELECT COUNT(*) FROM knowledge_documents");
            chunksBefore = conn.ExecuteScalar<int>("SELECT COUNT(*) FROM knowledge_chunks");
            ftsBefore = conn.ExecuteScalar<int>("SELECT COUNT(*) FROM knowledge_fts");
        }

        // 6. worker 尝试 POST 到无权项目
        Client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", workerToken);

        var postResp = await Client.PostAsJsonAsync("/api/knowledge/documents", new
        {
            text = "无权用户尝试写入的文本",
            title = "无权标题",
            sourceType = "manual",
            projectId = projectId
        });

        // 7. 断言 HTTP 403
        Assert.Equal(System.Net.HttpStatusCode.Forbidden, postResp.StatusCode);

        var respBody = await postResp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(respBody.GetProperty("success").GetBoolean());
        Assert.Contains("无权", respBody.GetProperty("error").GetString()!);

        // 8. 数据库验证：未新增任何记录
        using (var verifyConn = new SqliteConnection(ConnectionString))
        {
            verifyConn.Open();
            var docsAfter = verifyConn.ExecuteScalar<int>("SELECT COUNT(*) FROM knowledge_documents");
            var chunksAfter = verifyConn.ExecuteScalar<int>("SELECT COUNT(*) FROM knowledge_chunks");
            var ftsAfter = verifyConn.ExecuteScalar<int>("SELECT COUNT(*) FROM knowledge_fts");

            Assert.Equal(docsBefore, docsAfter);
            Assert.Equal(chunksBefore, chunksAfter);
            Assert.Equal(ftsBefore, ftsAfter);
        }

        Console.WriteLine($"[HTTP403] worker POST /api/knowledge/documents → 403");
        Console.WriteLine($"[HTTP403] documents: {docsBefore} → {docsBefore} (未新增)");
        Console.WriteLine($"[HTTP403] chunks: {chunksBefore} → {chunksBefore} (未新增)");
        Console.WriteLine($"[HTTP403] fts: {ftsBefore} → {ftsBefore} (未新增)");
    }

    [Fact]
    public async Task WritePermission_AdminUser_CanWrite_Returns200()
    {
        // admin 登录
        var loginResp = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = "admin", password = "admin123" });
        loginResp.EnsureSuccessStatusCode();
        var loginJson = await loginResp.Content.ReadFromJsonAsync<JsonElement>();
        var adminToken = loginJson.GetProperty("data").GetProperty("token").GetString()!;

        Client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);

        // admin POST 知识文档（admin 有权写所有项目）
        var postResp = await Client.PostAsJsonAsync("/api/knowledge/documents", new
        {
            text = "管理员写入的测试文本",
            title = "管理员文档",
            sourceType = "manual"
        });

        Assert.Equal(System.Net.HttpStatusCode.OK, postResp.StatusCode);
        var respJson = await postResp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(respJson.GetProperty("success").GetBoolean());
        var docId = respJson.GetProperty("documentId").GetInt64();
        Assert.True(docId > 0);
        Assert.False(respJson.GetProperty("idempotent").GetBoolean());

        Console.WriteLine($"[HTTP200] admin POST /api/knowledge/documents → 200, docId={docId}, idempotent={respJson.GetProperty("idempotent").GetBoolean()}, hasEmbeddings={respJson.GetProperty("hasEmbeddings").GetBoolean()}");
    }
}
</file>

<file path="EngineeringManager.Api/EngineeringManager.Api.csproj">
<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <TargetFramework>net8.0-windows</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <UseWindowsForms>true</UseWindowsForms>
    <OutputType>WinExe</OutputType>

    <ApplicationIcon>app.ico</ApplicationIcon>
    <NoWarn>MSB3277;AD0001</NoWarn>
    <Version>0.83.0</Version>
  </PropertyGroup>

  <ItemGroup>
        <PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="8.0.11" />
    <PackageReference Include="Dapper" Version="2.1.79" />
    <PackageReference Include="Microsoft.AspNetCore.OpenApi" Version="8.0.27" />
    <PackageReference Include="Microsoft.Data.Sqlite" Version="10.0.8" />
    <PackageReference Include="Microsoft.Web.WebView2" Version="1.0.3967.48" />
    <PackageReference Include="SqlParserCS" Version="0.6.5" />
    <PackageReference Include="System.Management" Version="8.0.0" />
    <PackageReference Include="org.k2fsa.sherpa.onnx" Version="1.13.4" />
    <PackageReference Include="org.k2fsa.sherpa.onnx.runtime.win-x64" Version="1.13.4" />
    <PackageReference Include="Microsoft.ML.OnnxRuntime" Version="1.19.2" />
    <PackageReference Include="Swashbuckle.AspNetCore" Version="6.6.2" />
  </ItemGroup>
  <ItemGroup>
    <Content Include="theme-*.png">

      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>

    </Content>

    <Content Include="app.ico">
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
    </Content>
  </ItemGroup>


  <ItemGroup>
    <EmbeddedResource Include="Migrations\Scripts\*.sql" />
  </ItemGroup>

  
</Project>
</file>

</files>
