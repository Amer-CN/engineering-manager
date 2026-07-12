# M2 第四轮整改报告

**日期**: 2026-07-10
**编译结果**: 0 错误 0 警告
**测试结果**: ✅ 239 单元测试 + 1 BGE E2E 全部通过

---

## 一、改动文件清单

| # | 文件路径 | 改动类型 | 说明 |
|---|---------|---------|------|
| 1 | `EngineeringManager.Api/Services/KnowledgeBaseService.cs` | 修改 | DB 级幂等（唯一约束捕获）、幂等查询带 created_by |
| 2 | `EngineeringManager.Api/Services/Stt/SttModelManager.cs` | 增强 | 可注入目录/下载器、IsEmbeddingModelAvailable 加大小+vocab 校验、损坏模型自愈 |
| 3 | `EngineeringManager.Api/Services/BgeEmbeddingService.cs` | 修改 | 模型路径通过 SttModelManager 获取（支持测试注入） |
| 4 | `EngineeringManager.Api/Migrations/Scripts/030_AddKnowledgeDocUniqueIndex.sql` | 新增 | 部分唯一索引 (created_by, source_type, source_ref) |
| 5 | `EngineeringManager.Tests/Endpoints/M2FourthRoundTests.cs` | 新增 | 13 个测试：DB 幂等 + 事务故障 + 模型自愈 + 权限 + BGE E2E |
| 6 | `EngineeringManager.Tests/Endpoints/KnowledgeBaseM2Tests.cs` | 修改 | 加 030 唯一索引、删除假事务回滚测试 |
| 7 | `EngineeringManager.Tests/Endpoints/BgeE2ETests.cs` | 删除 | 旧 BGE E2E 已被 M2FourthRoundTests 中的 BgeE2ETestsV2 替代 |

---

## 二、每项整改对应代码位置

### 一、重做真实 BGE 语义验收

**文件**: `M2FourthRoundTests.cs` → `BgeE2ETestsV2`

- **真实产物来源**: 从 `e:\测试\results_06b.json` 读取真实 STT 转写文本
  ```csharp
  private const string ArtifactPath = @"e:\测试\results_06b.json";
  private const string ChenZeweiKey = "通话-[已脱敏]-202606101153(1).wav";
  ```

- **不可跳过**: 模型缺失时 `Assert.Fail` 而非 `return`
  ```csharp
  Assert.True(SttModelManager.IsEmbeddingModelAvailable(), "BGE 嵌入模型不可用。此测试不可跳过。");
  Assert.True(bgeSvc.IsAvailable, "BGE 模型加载失败。此测试不可跳过。");
  ```

- **多 chunk 竞争**: 入库 4 个真实转写文本，产生 5 个 chunks
  ```csharp
  var r1 = await service.IngestAsync(chenZeweiText, ...);  // [已脱敏]通话
  var r2 = await service.IngestAsync(tanJunText, ...);      // [已脱敏]通话（含"进度款"）
  var r3 = await service.IngestAsync(recording3Text, ...);   // 验收工商
  var r4 = await service.IngestAsync(recording4Text, ...);   // 工资纠纷
  ```

- **硬断言**:
  ```csharp
  Assert.Contains("进度款", targetHit.Text);
  Assert.DoesNotContain("付款方式", targetHit.Text);
  Assert.Null(targetHit.FtsRank);
  Assert.NotNull(targetHit.SemanticRank);
  Assert.True(targetHit.SemanticScore.HasValue);
  ```

### 二、STT 入库幂等改数据库级并发安全

**文件**: `030_AddKnowledgeDocUniqueIndex.sql`
```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_doc_unique
ON knowledge_documents(created_by, source_type, source_ref)
WHERE source_type <> 'manual' AND source_ref IS NOT NULL;
```

**文件**: `KnowledgeBaseService.cs`
- 幂等查询带 `created_by`:
  ```csharp
  WHERE created_by = @CreatedBy AND source_type = @SourceType AND source_ref = @SourceRef
  ```
- 捕获唯一约束冲突:
  ```csharp
  catch (SqliteException ex) when (ex.SqliteErrorCode == 19 /* SQLITE_CONSTRAINT */
      && !string.IsNullOrEmpty(sourceRef) && sourceType != "manual")
  {
      transaction.Rollback();
      var existingDocId = _db.QueryFirstOrDefault<long?>(...);
      return new IngestResult { DocumentId = existingDocId.Value, Idempotent = true };
  }
  ```

### 三、真实 IngestAsync 事务故障测试

**文件**: `M2FourthRoundTests.cs` → `Ingest_TransactionFailure_TriggerInjection_RollsBackCompletely`
```csharp
// 安装 BEFORE INSERT 触发器：当 chunk_index = 1 时 ABORT
conn.Execute(@"
    CREATE TRIGGER inject_chunk_failure
    BEFORE INSERT ON knowledge_chunks
    WHEN new.chunk_index = 1
    BEGIN
        SELECT RAISE(ABORT, 'injected chunk failure');
    END;
");

// 构造 > 500 字文本确保至少 2 个 chunks
var longText = string.Join("。", Enumerable.Range(0, 100).Select(i => $"这是第{i}句话..."));

// 调用真实 IngestAsync → 应抛异常
await Assert.ThrowsAsync<SqliteException>(...);

// 断言: 0 条残留
Assert.Equal(docsBefore, docsAfter);
Assert.Equal(chunksBefore, chunksAfter);
Assert.Equal(ftsBefore, ftsAfter);
```

### 四、模型下载和自愈测试

**文件**: `SttModelManager.cs`
- 可注入目录 provider: `SetEngineDirProvider(Func<string>?)`
- 可注入下载器: `SetDownloadDelegate(Func<string, string, CancellationToken, Task>?)`
- 下载计数器: `DownloadCount`
- `IsEmbeddingModelAvailable` 校验: 文件存在 + 大小 ≥ 50MB + vocab 包含 special tokens
- `EnsureEmbeddingModelAsync` 自愈: 损坏模型 → `.corrupt` 隔离 → 重新下载

**文件**: `M2FourthRoundTests.cs` → 7 个模型测试:
1. `Model_MissingModel_StatusUnavailable`
2. `Model_ConcurrentEnsure_Only1Download` — 3 并发 → 下载 2 次（vocab+model）
3. `Model_ResidualTmpFile_CleanedBeforeDownload`
4. `Model_CorruptModelFile_SelfHealAndRedownload` — 损坏 → `.corrupt` + 重新下载 + Ready
5. `Model_CorruptVocab_SelfHealAndRedownload`
6. `Model_ResetAfterHeal_EnterReady`
7. `Model_DownloadInterrupted_NoFinalFile`

### 五、真实端点权限测试

**文件**: `M2FourthRoundTests.cs` → `WritePermission_UnauthorizedUser_DbNotModified`
- `CanAccessProject` 返回 false → 不调用 `IngestAsync`
- 断言 documents/chunks/fts 均未新增

---

## 三、新迁移及唯一索引

**迁移 030** (`030_AddKnowledgeDocUniqueIndex.sql`):
```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_doc_unique
ON knowledge_documents(created_by, source_type, source_ref)
WHERE source_type <> 'manual' AND source_ref IS NOT NULL;
```

- 不修改已发布的 029 迁移
- 部分索引：manual 文档和 source_ref=NULL 的记录不受限制
- 已在测试数据库中同步创建

---

## 四、编译结果

```
cd EngineeringManager.Api && dotnet build
→ 0 个错误, 0 个警告

cd EngineeringManager.Tests && dotnet build
→ 0 个错误
```

---

## 五、全套测试结果

### 单元测试（排除 SttE2E/BgeE2E）
```
dotnet test --filter "FullyQualifiedName!~SttE2ETests&FullyQualifiedName!~BgeE2ETestsV2"
→ 已通过! 失败: 0, 通过: 239, 已跳过: 0, 总计: 239
```

### BGE E2E 测试
```
dotnet test --filter "FullyQualifiedName~BgeE2ETestsV2"
→ 已通过! 失败: 0, 通过: 1, 总计: 1
```

---

## 六、真实 BGE 语义测试完整输出

```
[E2E] === 真实转写来源 ===
[E2E] 产物文件: e:\测试\results_06b.json
[E2E] 录音 key: 通话-[已脱敏]-202606101153(1).wav
[E2E] 全文 SHA-256: 05b45547b69b7a261f5571ca6dae2bf09b97d69ecfac7e33cac5434266c6cacb
[E2E] 全文长度: 687 字
[E2E] 全文是否含'付款方式': False

[E2E] === 入库结果 ===
[E2E] 文档数: 4
[E2E] chunk 总数: 5
[E2E] 含 embedding 的 chunk: 5
[E2E] embedding BLOB 大小: 2048 bytes (期望 2048 = 512×4)

[E2E] === 搜索 '付款方式' ===
[E2E] 总命中: 5
[E2E] usedSemantic: True

[E2E] === FTS 候选 ===
[E2E] FTS 命中数: 0

[E2E] === 语义候选 ===
  语义 rank=1, score=0.559279, chunkId=4
  语义 rank=2, score=0.523279, chunkId=3
  语义 rank=3, score=0.511330, chunkId=1
  语义 rank=4, score=0.507576, chunkId=2
  语义 rank=5, score=0.473213, chunkId=5
[E2E] 语义命中数: 5

[E2E] === RRF 最终排名 ===
  RRF score=0.016393, ftsRank=, semRank=1, chunkId=4
  RRF score=0.016129, ftsRank=, semRank=2, chunkId=3
  RRF score=0.015873, ftsRank=, semRank=3, chunkId=1
  RRF score=0.015625, ftsRank=, semRank=4, chunkId=2
  RRF score=0.015385, ftsRank=, semRank=5, chunkId=5

[E2E] === 目标块（含'进度款'）===
[E2E] chunkId: 4
[E2E] RRF score: 0.016393
[E2E] FTS rank: (null)
[E2E] 语义 rank: 1
[E2E] 语义 score: 0.559279

[E2E] === 验收结论 ===
[E2E] 搜索'付款方式' → 语义命中含'进度款'的块
[E2E] 目标块不含'付款方式'原词 → 证明是语义命中，非 FTS 原词匹配
[E2E] FTS rank = null → FTS 未命中此块
[E2E] 语义 rank = 1 → 语义检索命中
[E2E] 语义 score = 0.559279 → 有实际数值
```

---

## 七、真实转写来源信息

| 项 | 值 |
|---|---|
| 产物文件路径 | `e:\测试\results_06b.json` |
| [已脱敏]录音 key | `通话-[已脱敏]-202606101153(1).wav` |
| 全文 SHA-256 | `05b45547b69b7a261f5571ca6dae2bf09b97d69ecfac7e33cac5434266c6cacb` |
| 全文长度 | 687 字 |
| 全文是否含"付款方式" | **False** |
| 入库文档数 | 4 |
| 入库 chunk 总数 | 5 |
| 模型路径 | `E:\测试\asr-engine\embedding\bge-small-zh-v1.5.onnx` |
| 模型状态 | Ready |
| embedding BLOB 大小 | 2048 bytes (512×4) |

---

## 八、新增测试清单

| # | 测试类 | 测试方法 | 验证项 |
|---|-------|---------|-------|
| 1 | M2FourthRoundTests | Idempotent_SameUserSameSource_ReturnsExistingDoc | 同用户同来源幂等 |
| 2 | M2FourthRoundTests | Idempotent_DifferentUsersSameSource_IndependentDocs | 不同用户独立 |
| 3 | M2FourthRoundTests | Idempotent_ManualDocsNotAffected | manual 不受限 |
| 4 | M2FourthRoundTests | Idempotent_Concurrent10Calls_Only1Doc | 10 并发 → 1 文档 |
| 5 | M2FourthRoundTests | Ingest_TransactionFailure_TriggerInjection_RollsBackCompletely | BEFORE INSERT 触发器注入故障 → 完整回滚 |
| 6 | M2FourthRoundTests | Model_MissingModel_StatusUnavailable | 缺模型 → Unavailable |
| 7 | M2FourthRoundTests | Model_ConcurrentEnsure_Only1Download | 3 并发 → 下载 2 次 |
| 8 | M2FourthRoundTests | Model_ResidualTmpFile_CleanedBeforeDownload | 残留 .tmp 清理 |
| 9 | M2FourthRoundTests | Model_CorruptModelFile_SelfHealAndRedownload | 损坏 → .corrupt + 重下载 + Ready |
| 10 | M2FourthRoundTests | Model_CorruptVocab_SelfHealAndRedownload | vocab 损坏 → 重下载 |
| 11 | M2FourthRoundTests | Model_ResetAfterHeal_EnterReady | 补齐后 Reset → Ready |
| 12 | M2FourthRoundTests | Model_DownloadInterrupted_NoFinalFile | 下载中断 → 最终文件不存在 |
| 13 | M2FourthRoundTests | WritePermission_UnauthorizedUser_DbNotModified | 无权用户 → DB 不新增 |
| 14 | M2FourthRoundTests | WritePermission_AuthorizedUser_CanWrite | 授权用户 → 可写入 |
| 15 | BgeE2ETestsV2 | E2E_RealBge_SemanticSearch_HitsTargetChunk | 真实 BGE 语义验收（不可跳过） |

---

**M2 第四轮整改完成。停止 M3 启动，等待审核。**