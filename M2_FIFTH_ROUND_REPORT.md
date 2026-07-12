# M2 第五轮整改报告

## 一、本轮变更概要

第五轮只完成两个硬收口 + 补真实 HTTP 403 测试，不改动已通过的主体代码。

### 变更文件清单

| # | 文件 | 变更内容 |
|---|------|----------|
| 1 | `EngineeringManager.Tests/Endpoints/M2FourthRoundTests.cs` | BgeE2ETestsV2 锁定[已脱敏]目标块；M2FifthRoundConcurrentTests 真实多连接竞态；M2FifthRoundHttp403Tests 真实 HTTP 403 端点测试；CollectionDefinition 防并行干扰 |
| 2 | `EngineeringManager.Tests/Endpoints/KnowledgeBaseServiceTests.cs` | 添加 `[Collection("M2FifthRound")]` 防并行干扰 |
| 3 | `EngineeringManager.Tests/Endpoints/KnowledgeBaseM2Tests.cs` | 添加 `[Collection("M2FifthRound")]` 防并行干扰 |

---

## 二、硬收口一：BGE 语义验收锁定[已脱敏]目标块

### 测试方法
`BgeE2ETestsV2.E2E_RealBge_SemanticSearch_HitsTargetChunk`

### 关键断言

```csharp
// 前置断言：[已脱敏]文本包含目标短语，不含搜索词
Assert.Contains("每个月百分之八十", chenZeweiText);
Assert.DoesNotContain("付款方式", chenZeweiText);

// 目标块断言
var targetHit = searchResult.Hits.SingleOrDefault(h =>
    h.DocumentId == r1.DocumentId
    && h.Text.Contains("每个月百分之八十"));

Assert.NotNull(targetHit);
Assert.Equal(r1.DocumentId, targetHit.DocumentId);
Assert.Contains("每个月百分之八十", targetHit.Text);
Assert.DoesNotContain("付款方式", targetHit.Text);
Assert.Null(targetHit.FtsRank);
Assert.NotNull(targetHit.SemanticRank);
Assert.True(targetHit.SemanticScore.HasValue);
```

### 测试输出

```
[E2E] === 模型信息 ===
[E2E] 模型路径: E:\测试\asr-engine\embedding/bge-small-zh-v1.5.onnx
[E2E] 模型大小: 94851877 bytes
[E2E] vocab 路径: E:\测试\asr-engine\embedding/vocab.txt
[E2E] vocab 大小: 109540 bytes
[E2E] IsAvailable: True
[E2E] 模型状态: Ready

[E2E] === [已脱敏]文档（真实录音转写纠正文本）===
[E2E] 录音文件: 56f5549ff1672a5b130190f61c865da7.wav
[E2E] 全文 SHA-256: 15a007b9ee827141a8ba612e877511ccb630ac58d4e3295d2f4e1fbf028f44e4
[E2E] 全文长度: 1185 字
[E2E] 全文是否含'每个月百分之八十': True
[E2E] 全文是否含'付款方式': False

[E2E] === 竞争文档 ===
[E2E] [已脱敏]录音: 287 字
[E2E] [已脱敏]通话录音: 687 字
[E2E] 工资纠纷录音: 497 字

[E2E] === 入库结果 ===
[E2E] 文档数: 4
[E2E] chunk 总数: 7
[E2E] 含 embedding 的 chunk: 7
[E2E] r1.DocumentId = 1
[E2E] r1.HasEmbeddings = True
[E2E] embedding BLOB 大小: 2048 bytes (期望 2048 = 512×4)

[E2E] === 搜索 '付款方式' ===
[E2E] 总命中: 7
[E2E] usedSemantic: True

[E2E] === FTS 候选 ===
[E2E] FTS 命中数: 0

[E2E] === 语义候选 ===
  语义 rank=1, score=0.604521, chunkId=3, docId=1
  语义 rank=2, score=0.528689, chunkId=1, docId=1
  语义 rank=3, score=0.527241, chunkId=2, docId=1
  语义 rank=4, score=0.523279, chunkId=4, docId=2
  语义 rank=5, score=0.511330, chunkId=5, docId=3
  语义 rank=6, score=0.507576, chunkId=6, docId=3
  语义 rank=7, score=0.473213, chunkId=7, docId=4
[E2E] 语义命中数: 7

[E2E] === RRF 最终排名 ===
  RRF score=0.016393, ftsRank=, semRank=1, chunkId=3, docId=1
  RRF score=0.016129, ftsRank=, semRank=2, chunkId=1, docId=1
  RRF score=0.015873, ftsRank=, semRank=3, chunkId=2, docId=1
  RRF score=0.015625, ftsRank=, semRank=4, chunkId=4, docId=2
  RRF score=0.015385, ftsRank=, semRank=5, chunkId=5, docId=3
  RRF score=0.015152, ftsRank=, semRank=6, chunkId=6, docId=3
  RRF score=0.014925, ftsRank=, semRank=7, chunkId=7, docId=4

[E2E] === 验收结论 ===
[E2E] [已脱敏] documentId = 1
[E2E] 目标块 documentId = 1
[E2E] 两者是否相等: True
[E2E] 目标块包含'每个月百分之八十': True
[E2E] 目标块不含'付款方式': True
[E2E] FTS rank = null
[E2E] Semantic rank = 2
[E2E] Semantic score = 0.528689
[E2E] RRF score = 0.016129
[E2E] ChunkId = 1
[E2E] ChunkIndex = 0

[E2E] === 最终结论 ===
[E2E] 搜索'付款方式' → 语义命中[已脱敏]文档中含'每个月百分之八十'的块
[E2E] 目标块不含'付款方式'原词 → 证明此为语义检索，非 FTS 原词匹配
[E2E] FTS rank = null → FTS 未命中此块
[E2E] Semantic rank = 2 → 语义检索命中
[E2E] Semantic score = 0.528689 → 真实数值
```

### 结论
- [已脱敏] documentId = 1，目标块 documentId = 1，两者相等 ✅
- 目标块包含"每个月百分之八十" ✅
- 目标块不含"付款方式" ✅
- FTS rank = null（FTS 未命中此块，非原词匹配）✅
- Semantic rank = 2，Semantic score = 0.528689（真实语义命中）✅
- [已脱敏]及其他文档仅作为竞争候选，未作为 targetHit ✅

---

## 三、硬收口二：真实多连接并发幂等测试

### 测试方法
`M2FifthRoundConcurrentTests.Idempotent_RealMultiConnection_10ConcurrentCalls_Only1Doc`

### 测试架构
1. 使用临时文件 SQLite 数据库（`Data Source=<temp>/concurrent.db`）
2. 先用初始化连接执行 029/030 所需表、FTS、触发器和唯一索引
3. 为 10 个并发调用分别创建独立 `SqliteConnection` + 独立 `KnowledgeBaseService`
4. 每个连接设置 `PRAGMA busy_timeout=5000` 避免 SQLITE_BUSY 误判
5. 使用 `Barrier(10)` + `KnowledgeBaseService.PreInsertHook` 让 10 个任务在快速幂等查询后、BeginTransaction 前同时汇合
6. 使用 `Task.Run` 确保各自获得线程池线程
7. 增大 `ThreadPool.SetMinThreads` 防止 Barrier 阻塞导致死锁

### 测试输出

```
[Concurrent] 10 并发调用 → 1 个文档, 1 个 chunks
[Concurrent] Idempotent=false: 1, Idempotent=true: 9
[Concurrent] DocumentId: 1
[Concurrent] knowledge_documents: 1
[Concurrent] knowledge_chunks: 1
[Concurrent] knowledge_fts: 1
```

### 断言验证
- 10 个调用全部成功返回 ✅
- 10 个结果的 DocumentId 完全相同 ✅
- 恰好 1 个 Idempotent=false ✅
- 其余 9 个 Idempotent=true ✅
- knowledge_documents 恰好 1 条 ✅
- knowledge_chunks 只有该文档的一份 ✅
- knowledge_fts 没有重复 ✅
- 至少一个调用走过"唯一约束冲突后返回已有文档"分支 ✅

---

## 四、真实 HTTP 403 端点测试

### 测试方法
1. `M2FifthRoundHttp403Tests.WritePermission_UnauthorizedUser_ReturnsHttp403_DbNotModified`
2. `M2FifthRoundHttp403Tests.WritePermission_AdminUser_CanWrite_Returns200`

### 测试架构
1. 继承 `ApiTestBase` 启动真实测试 API
2. admin 登录获取 JWT token
3. admin 创建项目 A
4. admin 创建 worker 用户
5. worker 登录获取 JWT token
6. worker 尝试 POST `/api/knowledge/documents` 携带无权 projectId
7. 断言 HTTP 403 + 数据库未新增
8. admin POST 确认正常写入

### 测试输出

```
[HTTP403] worker POST /api/knowledge/documents → 403
[HTTP403] documents: 0 → 0 (未新增)
[HTTP403] chunks: 0 → 0 (未新增)
[HTTP403] fts: 0 → 0 (未新增)

[HTTP200] admin POST /api/knowledge/documents → 200, docId=1, idempotent=False, hasEmbeddings=True
```

### 断言验证
- worker POST → HTTP 403 Forbidden ✅
- response body: `success=false`, `error` 含"无权" ✅
- 数据库 documents/chunks/fts 均未新增 ✅
- admin POST → HTTP 200 OK ✅
- admin 返回 `documentId > 0` ✅

---

## 五、编译结果

### 后端 API 编译
```
dotnet build EngineeringManager.Api\EngineeringManager.Api.csproj
→ 0 error, 仅有历史 warning (CS86xx nullable / MSB3277 WindowsBase 版本冲突)
→ Exit code: 0 (成功)
```

### 测试项目编译
```
dotnet build EngineeringManager.Tests\EngineeringManager.Tests.csproj
→ 0 error, 仅有历史 warning
→ Exit code: 0 (成功)
```

---

## 六、全套测试结果

```
dotnet test EngineeringManager.Tests\EngineeringManager.Tests.csproj

测试总数: 245
通过数: 243
失败数: 2

失败的 2 个测试（均为 GPU 内存不足，与 M2 无关）:
1. SttE2ETests.E2E_MultiSpeaker_DiarizeAndTranscribe
   → System.Exception: transcribe.exe 批量转写失败 (exit=1):
     ggml_vulkan: Device memory allocation of size 1072890880 failed.
2. SttE2ETests.E2E_SingleSpeaker_Transcribe
   → System.Exception: transcribe.exe 转写失败 (exit=1):
     ggml_vulkan: Device memory allocation of size 1072890880 failed.
```

### M2 相关测试全部通过清单

| 测试类 | 测试方法 | 状态 |
|--------|----------|------|
| BgeE2ETestsV2 | E2E_RealBge_SemanticSearch_HitsTargetChunk | ✅ |
| M2FifthRoundConcurrentTests | Idempotent_RealMultiConnection_10ConcurrentCalls_Only1Doc | ✅ |
| M2FifthRoundHttp403Tests | WritePermission_UnauthorizedUser_ReturnsHttp403_DbNotModified | ✅ |
| M2FifthRoundHttp403Tests | WritePermission_AdminUser_CanWrite_Returns200 | ✅ |
| M2FourthRoundTests | Idempotent_SameUserSameSource_ReturnsExistingDoc | ✅ |
| M2FourthRoundTests | Idempotent_DifferentUsersSameSource_IndependentDocs | ✅ |
| M2FourthRoundTests | Idempotent_ManualDocsNotAffected | ✅ |
| M2FourthRoundTests | Idempotent_Concurrent10Calls_Only1Doc | ✅ |
| M2FourthRoundTests | Ingest_TransactionFailure_TriggerInjection_RollsBackCompletely | ✅ |
| M2FourthRoundTests | Model_MissingModel_StatusUnavailable | ✅ |
| M2FourthRoundTests | Model_ConcurrentEnsure_Only1Download | ✅ |
| M2FourthRoundTests | Model_DownloadInterrupted_NoFinalFile | ✅ |
| M2FourthRoundTests | Model_CorruptModelFile_SelfHealAndRedownload | ✅ |
| M2FourthRoundTests | Model_CorruptVocab_SelfHealAndRedownload | ✅ |
| M2FourthRoundTests | Model_ResidualTmpFile_CleanedBeforeDownload | ✅ |
| M2FourthRoundTests | Model_ResetAfterHeal_EnterReady | ✅ |
| M2FourthRoundTests | WritePermission_UnauthorizedUser_DbNotModified | ✅ |
| M2FourthRoundTests | WritePermission_AuthorizedUser_CanWrite | ✅ |
| KnowledgeBaseM2Tests | Search_CrossProjectIsolation_NonAdminCannotSeeUnauthorizedProject | ✅ |
| KnowledgeBaseM2Tests | Search_CrossProjectIsolation_AdminWithProjectIdOnlyReturnsThatProject | ✅ |
| KnowledgeBaseM2Tests | Search_CrossProjectIsolation_BothFtsAndSemanticRespectScope | ✅ |
| KnowledgeBaseM2Tests | CanAccessProject_AdminCanAccessAll | ✅ |
| KnowledgeBaseM2Tests | CanAccessProject_UnauthorizedUserCannotAccess | ✅ |
| KnowledgeBaseM2Tests | CanAccessProject_AuthorizedUserCanAccess | ✅ |
| KnowledgeBaseM2Tests | CanAccessProject_CreatorCanAccess | ✅ |
| KnowledgeBaseM2Tests | Ingest_Idempotent_SameSourceRefReturnsExistingDoc | ✅ |
| KnowledgeBaseM2Tests | Ingest_ManualDocumentsNotAffectedByIdempotency | ✅ |
| KnowledgeBaseM2Tests | DeleteDocument_NonAdminCannotDeleteOthersProject | ✅ |
| KnowledgeBaseM2Tests | GetDocument_NonAdminCannotAccessOthersProject | ✅ |
| KnowledgeBaseM2Tests | SpeakerFullChain_NormalizedLabelsPersistAcrossAllLayers | ✅ |
| KnowledgeBaseServiceTests | IngestAndSearch_FtsChineseMatch | ✅ |
| KnowledgeBaseServiceTests | IngestAndSearch_SemanticMatch | ✅ |
| KnowledgeBaseServiceTests | ChunkText_SplitsAtSentenceBoundaries | ✅ |
| KnowledgeBaseServiceTests | ChunkText_DoesNotSplitSentence | ✅ |
| KnowledgeBaseServiceTests | ChunkText_EmptyText_ReturnsEmpty | ✅ |
| KnowledgeBaseServiceTests | RrfFuse_BothSourcesRankHigher | ✅ |
| KnowledgeBaseServiceTests | RrfFuse_EmptySemantic_OnlyFts | ✅ |
| KnowledgeBaseServiceTests | DeleteDocument_CascadesChunksAndFts | ✅ |
| KnowledgeBaseServiceTests | GetDocument_ReturnsChunks | ✅ |
| KnowledgeBaseServiceTests | Search_DataScope_NonAdminOnlySeesOwn | ✅ |
| KnowledgeBaseServiceTests | SpeakerLabelNormalizer_NonContiguousBecomesSequential | ✅ |
| KnowledgeBaseServiceTests | SpeakerLabelNormalizer_SingleSpeaker_StaysOne | ✅ |
| KnowledgeBaseServiceTests | SpeakerLabelNormalizer_NullSegments_BuildJsonReturnsNull | ✅ |
| KnowledgeBaseServiceTests | Ingest_WithNormalizedSpeakers_StoredInDatabase | ✅ |

---

## 七、本轮变更文件包

### 变更文件 1: `EngineeringManager.Tests/Endpoints/M2FourthRoundTests.cs`

变更点：
1. **BgeE2ETestsV2** — 在测试方法开头清除 `PreInsertHook` 防并行干扰
2. **M2FifthRoundConcurrentTests** — 真实多连接并发测试（临时文件 SQLite + 独立连接 + Barrier 同步）
3. **M2FifthRoundHttp403Tests** — 真实 HTTP 403 端点测试（修复 JSON 解析：项目创建返回 `data` 为数字、知识文档端点返回扁平结构无 `data` 包装）
4. **CollectionDefinition("M2FifthRound")** — 防止使用 `PreInsertHook` 和 `IngestAsync` 的测试类并行执行导致 `ObjectDisposedException`

### 变更文件 2: `EngineeringManager.Tests/Endpoints/KnowledgeBaseServiceTests.cs`

变更点：
- 添加 `[Collection("M2FifthRound")]` 防止与并发测试的 `PreInsertHook` 产生并行干扰

### 变更文件 3: `EngineeringManager.Tests/Endpoints/KnowledgeBaseM2Tests.cs`

变更点：
- 添加 `[Collection("M2FifthRound")]` 防止与并发测试的 `PreInsertHook` 产生并行干扰

---

## 八、未改动声明

以下已通过的主体代码在本轮**未做任何改动**：
- `KnowledgeBaseService.cs`（P0 范围过滤、写权限、幂等、事务、PreInsertHook）
- `KnowledgeEndpoints.cs`（端点层权限检查、BuildScopeFilter 复用）
- `SttEndpoints.cs`（IngestResult 处理）
- `SttModelManager.cs`（SemaphoreSlim 并发控制、原子下载、自愈、测试注入）
- `BgeEmbeddingService.cs`（ModelStatus 状态机、EnsureModelAsync、验证）
- `029_AddKnowledgeBase.sql` / `030_AddKnowledgeDocUniqueIndex.sql`（迁移脚本）

---

完成。等待审核。不启动 M3。
