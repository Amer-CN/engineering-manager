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
        // 先检查项目是否存在（不存在的项目即使是 admin 也不允许操作）
        var exists = db.ExecuteScalar<int>(
            "SELECT COUNT(*) FROM projects WHERE id = @ProjectId",
            new { ProjectId = projectId });
        if (exists == 0) return false;

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
    /// 可选 entityType/entityId 偏置：提升关联实体文档的排名
    /// </summary>
    public async Task<SearchResult> SearchAsync(
        string query,
        int topK = 10,
        int? projectId = null,
        string? userId = null,
        bool isAdmin = false,
        string? entityType = null,
        long? entityId = null,
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

        // ②.⑤ 实体偏置：收集需要 boost 的 document_id 集合
        HashSet<long>? entityBiasDocIds = null;
        if (!string.IsNullOrEmpty(entityType) && entityId.HasValue)
        {
            var biasDocIds = _db.Query<long>(
                @"SELECT [reference_doc_id] FROM [knowledge_entity_seeds]
                  WHERE [entity_type] = @EntityType AND [entity_id] = @EntityId AND [reference_doc_id] IS NOT NULL",
                new { EntityType = entityType, EntityId = entityId.Value }).ToList();

            // 同项目实体文档也参与偏置
            if (projectId.HasValue)
            {
                var projectDocIds = _db.Query<long>(
                    @"SELECT DISTINCT [reference_doc_id] FROM [knowledge_entity_seeds]
                      WHERE [project_id] = @ProjectId AND [reference_doc_id] IS NOT NULL",
                    new { ProjectId = projectId.Value }).ToList();
                biasDocIds.AddRange(projectDocIds);
            }

            if (biasDocIds.Count > 0)
                entityBiasDocIds = new HashSet<long>(biasDocIds);
        }

        // ③ RRF 融合（含实体偏置）
        var fused = RrfFuse(ftsResults, semanticResults, topK, entityBiasDocIds);

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
    /// entityBiasDocIds: 实体偏置文档集合，匹配文档 RRF 分数 ×1.5
    /// </summary>
    public static List<ChunkMatch> RrfFuse(List<ChunkMatch> ftsResults, List<ChunkMatch> semanticResults, int topK, HashSet<long>? entityBiasDocIds = null)
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
                var score = kvp.Value;
                // 实体偏置：匹配实体文档的 chunk 分数 ×1.5
                if (entityBiasDocIds != null && entityBiasDocIds.Contains(match.DocumentId))
                    score *= 1.5;
                match.RrfScore = score;
                return match;
            })
            .OrderByDescending(m => m.RrfScore)
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
        // R5.4: 手写 project_authorizations 过滤副本迁移到 helper（B6 门禁抓出第三处）。
        // 语义逐位等价：admin → "(1 = 1)"（All）；非 admin → created_by ∨ 关联 d.project_id
        // 的授权 EXISTS（AuthorizedProjects）。注意: EXISTS 必须关联 d.project_id（当前行），
        // 不能用 @ProjectId——helper 的表名限定列正是行级相关子查询。
        var scope = isAdmin ? Security.CurrentUser.DataScope.All : Security.CurrentUser.DataScope.AuthorizedProjects;
        var baseFilter = Security.CurrentUser.UserFilterWithAuthorizedProjects(scope, "d.project_id", "d.created_by");

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
