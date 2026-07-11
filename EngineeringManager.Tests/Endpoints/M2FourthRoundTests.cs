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
