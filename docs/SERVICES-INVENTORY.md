# 服务层架构盘点（工程管家后端）

> 生成基线：`bbddc22f` · 日期：2026-08-22
> 数据源：`EngineeringManager.Api/Services/` + `EngineeringManager.Api/Security/` + `EngineeringManager.Api/GlobalAuthMiddleware.cs`

## 目录

1. [中间件层](#中间件层)
2. [安全层（Security/）](#安全层security)
3. [Agent AI 服务](#agent-ai-服务)
4. [知识库服务](#知识库服务)
5. [LLM 配置与路由](#llm-配置与路由)
6. [STT 语音转写服务](#stt-语音转写服务)
7. [嵌入服务](#嵌入服务)
8. [其他服务](#其他服务)

---

## 中间件层

### GlobalAuthMiddleware

**文件**：`GlobalAuthMiddleware.cs`

全局鉴权中间件，在 `app.UseAuthentication()` 之后注册。规则：

- 非 `/api/*` 路径（静态文件、SPA 回退）：直接放行
- 白名单路径前缀：`/api/auth/login`、`/api/health`、`/api/ocr/setup`、`/api/agent/setup`、`/api/update/download`
- `/api/config` GET 精确放行（登录页需读配置），PUT 仍需鉴权
- 白名单匹配采用「精确匹配 OR 路径前缀 + `/`」，避免 `/api/healthz`、`/api/auth/loginx` 误放行
- 未认证的 `/api/*` 请求返回 401 + `{ "success": false, "error": "未授权：请先登录" }`

**关键设计**：租户隔离在端点 SQL 层（`CurrentUser.UserFilterWithAuthorizedProjects`）完成，不在中间件层强制 `projectId`，以免误伤跨项目汇总端点。

---

## 安全层（Security/）

### CurrentUser

**文件**：`Security/CurrentUser.cs`

静态工具类，从 `HttpContext.User`（JWT claims）提取用户身份与权限。

#### 身份提取

| 方法 | 返回 | 说明 |
|------|------|------|
| `GetUserId(ctx)` | `string?` | 从 `uid` claim 提取用户 ID |
| `IsAdmin(ctx)` | `bool` | 检查 role claim 为「管理员」或「admin」 |

#### 数据范围枚举

```csharp
public enum DataScope { SelfOnly, AuthorizedProjects, All }
```

- `GetDataScope(ctx)`：个人版单 admin 恒返 `All`；admin → `All`；非 admin → `AuthorizedProjects`
- `UserFilterCompany(scope, createdByCol?)`：公司级表过滤，返回 `"(1 = 1)"`（admin）或 `"({createdByCol} = @Uid)"`（非 admin）
- `UserFilterWithAuthorizedProjects(scope, projectCol, createdByCol?)`：项目级表过滤，返回 `"(created_by=@Uid OR EXISTS(SELECT 1 FROM project_authorizations pa_authz WHERE pa_authz.project_id={projectCol} AND pa_authz.user_id=@Uid))"`（非 admin）

**M-FIX1 F2(b)**：`projectCol` 必须是表限定列（含 `.`），裸列会在 EXISTS 子查询内解析到 `project_authorizations` 自身导致恒真越权。运行时 fail-closed 抛异常。

#### PII 权限分级

```csharp
public enum PiiRole { Admin, Accountant, Manager, Worker, None }
```

| 角色 | 可读明文 PII 字段 |
|------|------------------|
| Admin | 全部（id_card, phone, bank_account, address, id_card_address） |
| Accountant | 全部 |
| Manager | 全部 |
| Worker | 无（全部脱敏） |
| None | 无 |

- `GetPiiAccess(ctx)` 返回 `PiiAccess` 结构体，`CanRead(field)` 判断是否可读明文
- `AllPiiColumns`：`{ "id_card", "phone", "bank_account", "address", "id_card_address" }`

#### 功能权限码检查

`HasPermission(ctx, db, permissionCode)`：
- admin 直接返回 true
- 非 admin 从 `roles.permissions` JSON 字段反序列化后查找权限码
- 兼容中文角色名（管理员/经理/财务/工人 → admin/manager/accountant/worker）

#### 项目级写入门

`CanWriteProject(ctx, db, projectId)`（G75/G76）：
- admin → true
- `projects.created_by == uid` → true
- `EXISTS(project_authorizations WHERE project_id=@P AND user_id=@Uid)` → true
- 否则 → false

### PiiProtector

**文件**：`Security/PiiProtector.cs`

PII 字段加密服务，支持密钥轮换：
- `Encrypt(plaintext)` → 密文（当前 active key 加密）
- `Decrypt(ciphertext)` → 明文（自动选择正确 key_id 解密）
- `Rotate(db, uid)` → 生成新 active key，旧 key 标 retired（仍可解密旧数据）
- `ListKeys(db)` → 列出所有 key（不暴露 encrypted_key BLOB）
- 密钥存储在 `pii_keys` 表，active key 标记 `active=1`

### RowWriteGate

**文件**：`Security/RowWriteGate.cs`

行级写权限裁决器，用于 R9 系列改造的跨人编辑场景。

`Classify(ctx, db, createdBy, projectId)` 返回 `RowWriteOutcome` 枚举：
- `Denied`：无权操作（非创建人 + 非授权项目）
- `Owned`：本人创建的行
- `AllowedViaAuthorization`：非创建人但在授权项目内（跨人修改，需落审计）

### AuditWriter

跨人修改审计写入器，在事务内写入 `audit_logs`，**fail-closed**（审计写失败 → 事务回滚 → 修改不生效）。

`CrossUserEdit(db, tx, ctx, resource, resourceId, action, originalCreatedBy, projectId)`：记录跨人编辑事件。

---

## Agent AI 服务

### AgentToolService

**文件**：`Services/AgentToolService.cs`

注册并管理 15 个 LLM function calling 工具。

#### 工具注册表

| # | 工具名 | 所需权限 | PII 字段 | 说明 |
|---|--------|---------|---------|------|
| 1 | `getDashboardStats` | `dashboard:read` | 无 | 仪表盘统计（项目/成员/工人/发票/结算/收支） |
| 2 | `getProjects` | `projects:read` | 无 | 项目列表（LIMIT 20） |
| 3 | `getProjectDetail` | `projects:read` | 无 | 单项目详情（需 projectId） |
| 4 | `getInvoices` | `invoices:read` | 无 | 发票列表（可选 projectId 筛选，LIMIT 30） |
| 5 | `getPendingInvoices` | `invoices:read` | 无 | 待处理发票 |
| 6 | `getSettlements` | `settlement:read` | 无 | 结算列表（可选 projectId，LIMIT 30） |
| 7 | `getPendingSettlements` | `settlement:read` | 无 | 待处理结算 |
| 8 | `getMembers` | `members:read` | id_card, phone, bank_account | 成员列表（LIMIT 30） |
| 9 | `getWorkers` | `labor:read` | id_card, phone, bank_account, address | 工人列表（LIMIT 30） |
| 10 | `getContracts` | `contracts:read` | 无 | 合同列表（收入+支出，各 LIMIT 15） |
| 11 | `getInventory` | `inventory:read` | 无 | 库存列表（LIMIT 30） |
| 12 | `getCostSummary` | `costLedger:read` | 无 | 成本汇总（按分类统计，可选 projectId） |
| 13 | `getPartners` | `partners:read` | phone, bank_account | 合作伙伴列表（LIMIT 30） |
| 14 | `runSafeQuery` | `safeQuery:read` | 动态（全量 PII 列脱敏） | 受限只读 SQL 查询 |
| 15 | `searchKnowledgeBase` | `knowledge:read` | 无 | 知识库语义检索 |

#### 二次权限校验

```
GetAvailableTools(ctx)  → 按用户权限过滤工具列表（第一次过滤）
ExecuteToolAsync(name)  → 再次校验权限（不信任 LLM 返回的工具名，第二次校验）
```

#### runSafeQuery 执行流程

```
1. 提取 SQL 参数
2. SafeQueryValidator.ValidateAndRewrite(sql, uid, scope)  → 验证 + 改写
   - 仅允许 SELECT
   - 白名单表校验
   - 自动注入数据范围过滤（WHERE 条件）
   - 自动添加 LIMIT 100
3. SafeQueryValidator.DryRun(db, rewrittenSql, params)     → dry-run 预检
4. 执行查询（5 秒超时）
5. PII 脱敏（按角色）
6. SafeQueryValidator.LogAudit(db, uid, sql, rewrittenSql, success, error)  → 审计日志
```

#### PII 脱敏

`MaskPiiInResult(result, piiFields, access)`：
- 遍历结果列表，对指定字段调用 `Common.MaskPiiField` 脱敏
- DapperRow / FastExpando 实现了 `IDictionary<string, object>`，用字典写入而非反射
- 匿名对象 fallback：反射 GetProperties 转为可修改字典

### AgentConversationService

**文件**：`Services/AgentConversationService.cs`

管理 Agent 对话生命周期。

| 方法 | 说明 |
|------|------|
| `CreateConversationAsync` | 创建对话（标题取首条消息前 20 字符） |
| `SaveMessageAsync` | 保存消息（含 tool_calls JSON 序列化） |
| `GetConversationsAsync` | 对话列表（软删过滤 + 消息数 + 最后消息摘要） |
| `GetDeletedConversationsAsync` | 已删除对话列表（供恢复入口） |
| `GetConversationDetailAsync` | 对话详情（含全部消息，校验 user_id 归属） |
| `GetMessagesForLlmAsync` | 最近 N 条消息（LLM 上下文，默认 40 条） |
| `DeleteConversationAsync` | 软删对话（deleted_at = now） |
| `RenameConversationAsync` | 重命名（带所有权校验，软删的不可改） |
| `ArchiveConversationAsync` | 归档（archived_at = now，≠ 删除） |
| `UnarchiveConversationAsync` | 取消归档（archived_at = NULL） |
| `RestoreConversationAsync` | 恢复软删（deleted_at = NULL） |

涉及表：`agent_conversations`、`agent_messages`

---

## 知识库服务

### KnowledgeBaseService

**文件**：`Services/KnowledgeBaseService.cs`

知识库核心服务：转写文本 → 清洗 → 分块 → 入库 → 混合检索。

#### IngestAsync（入库流程）

```
1. 幂等检查（source_type + source_ref + created_by 唯一索引）
   - 非 manual 来源 + 有 sourceRef → 快速查询已有文档
   - 并发竞态：捕获 SQLITE_CONSTRAINT(19) → 回滚 → 查询返回已有 docId
2. 清洗文本（CleanText）
   - 去纯语气词碎段（嗯/啊/呃/哦/唉/嘿/咳/呢/吧/嘛/呀/哎）
   - 规整空白（多个连续空格 → 单个）
   - 合并连续换行
3. 构建 speakers JSON（SpeakerLabelNormalizer.BuildSpeakersJson）
4. 分块（ChunkText）
   - 300-500 字/块，按句子边界切（。！？；\n! ? ;）
   - 块间 ~50 字重叠（保留最后一句）
   - 超长句硬切（按 MaxChunkSize 等分）
5. 计算向量（BgeEmbeddingService）
   - EmbedBatchAsync → float[] → FloatToBytes → byte[] BLOB
   - 模型不可用时跳过（FTS 仍可用）
6. 事务写入（document + chunks + FTS 触发器自动同步）
```

#### SearchAsync（混合检索流程）

```
① FTS5 检索（trigram，bm25 排序，取前 20）
   - 少于 3 字的查询不灵，靠语义那路补上
② 语义检索（query → bge 向量 → 与各块 embedding 点积 = 余弦，取前 20）
③ 实体偏置（可选）
   - entityType + entityId → 查 knowledge_entity_seeds.reference_doc_id
   - 同项目实体文档也参与偏置
④ RRF 融合（Reciprocal Rank Fusion）
   - score = Σ 1/(k + rank)，k=60
   - 实体偏置文档分数 ×1.5
   - 取 topK
⑤ 查文档元信息
```

#### 分块参数

| 参数 | 值 |
|------|-----|
| MinChunkSize | 300 |
| MaxChunkSize | 500 |
| OverlapSize | 50 |
| FtsTopN | 20 |
| SemanticTopN | 20 |
| RrfK | 60.0 |

#### 数据范围过滤（BuildScopeFilter）

```
admin + 无 projectId     → (1 = 1)
admin + 有 projectId     → d.project_id = @ProjectId
非 admin + 无 projectId  → (d.created_by = @Uid OR EXISTS(pa...d.project_id...))
非 admin + 有 projectId  → (基础范围) AND d.project_id = @ProjectId
```

**关键**：EXISTS 子查询必须关联当前行 `d.project_id`，不能用 `@ProjectId` 参数（否则用户有任意授权即全项目可见）。

#### 静态方法

| 方法 | 说明 |
|------|------|
| `CanAccessProject(db, projectId, userId, isAdmin)` | 项目写权限检查（admin/创建者/授权用户） |
| `CanAccessFolder(db, folderId, userId, isAdmin)` | 文件夹访问权限（M-FIX8 T2 G58） |
| `CleanText(text)` | 文本清洗（静态，可独立测试） |
| `ChunkText(text)` | 分块算法（静态，可独立测试） |
| `RrfFuse(fts, semantic, topK, bias?)` | RRF 融合（静态，可独立测试） |
| `BuildScopeFilter(isAdmin, userId, projectId)` | 数据范围过滤条件构造 |

#### 向量序列化

- `FloatToBytes(float[])` → `byte[]`（Buffer.BlockCopy）
- `BytesToFloat(byte[])` → `float[]`
- `DotProduct(a, b)` → `float`（L2 归一化后点积 = 余弦相似度）

### KnowledgeEntityService

实体种子服务，为知识库检索提供实体关联上下文：
- `UpsertEntityAsync(entityType, entityId, entityName, projectId)` → fire-and-forget 调用，写入 `knowledge_entity_seeds`
- `GetEntityContextAsync(entityType, entityId, uid, isAdmin)` → 查关联实体 + 语义 chunks
- `SeedEntitiesAsync()` → 全量扫描业务表生成实体种子（admin 触发）

涉及表：`knowledge_entity_seeds`、`knowledge_documents`、`knowledge_chunks`

---

## LLM 配置与路由

### LlmProviderService

**文件**：`Services/LlmProviderService.cs`

LLM 提供商配置管理：
- `GetConfig()` → 当前 LLM 配置（provider/model/apiKey/baseUrl/temperature/maxTokens）
- `SaveUserConfigAsync(config)` → 保存配置
- `ReloadConfigAsync()` → 热重载
- `TestConnectionAsync(baseUrl, apiKey)` → 测试连接（返回可用模型列表）

配置来源优先级：
1. 内置配置（UseBuiltIn=true）
2. 环境变量
3. 用户自定义配置

### LlmConfigResolver

**文件**：`Services/LlmConfigResolver.cs`

LLM 配置解析器，处理配置来源优先级。

### ModelRoutingService / IModelRouter

模型路由服务，按任务类型选择最优模型。

### ILlmChatService

**文件**：`Services/ILlmChatService.cs`

LLM 聊天服务接口：
- `ChatAsync(messages, tools)` → 非流式对话
- `ChatStreamAsync(messages)` → 流式对话（逐 token 返回）

---

## STT 语音转写服务

**目录**：`Services/Stt/`

### 引擎与模型

| 文件 | 职责 |
|------|------|
| `ISttEngine.cs` | STT 引擎接口 |
| `LlamaCppGgufEngine.cs` | llama.cpp GGUF 引擎（本地推理） |
| `SttEngineSelector.cs` | 引擎选择 + GPU 检测 |
| `SttModelManager.cs` | 模型下载与管理 |
| `SttWorker.cs` | 后台转写 worker（进程管理） |
| `SttMonitorLoop.cs` | 转写监控循环 |
| `SttMutexGuard.cs` | 互斥锁（防并发转写） |
| `SttSafetyChecker.cs` | 安全检查 |
| `AudioPreprocessor.cs` | 音频预处理（ffmpeg 解码） |
| `DiarizationService.cs` | 说话人分离 |
| `SpeakerLabelNormalizer.cs` | 说话人标签归一化 |
| `GpuLogParser.cs` | GPU 日志解析 |
| `StdoutEncodingDecoder.cs` | stdout 编码解码 |
| `SttModels.cs` | 数据模型 |

### SttEngineSelector

GPU 检测与引擎可用性判断：
- `Detect()` → GPU 信息（HasDiscreteGpu / GpuName / VramMb / SupportsVulkan / AllGpus）
- `CanUseLocalStt()` → 本地 STT 是否可用
- `GetUnavailableReason()` → 不可用原因

### SpeakerLabelNormalizer

说话人标签归一化：原始簇号（如 0/3/7）→ 连续编号（1/2/3）。
- `Normalize(segments)` → 归一化 segments
- `BuildSpeakersJson(segments)` → 构建 speakers JSON 元数据

---

## 嵌入服务

### IEmbeddingService

**文件**：`Services/IEmbeddingService.cs`

嵌入服务接口：
- `IsAvailable` → 模型是否可用
- `EmbedAsync(text, ct)` → 单文本嵌入
- `EmbedBatchAsync(texts, ct)` → 批量嵌入
- `EnsureModelAsync(ct)` → 确保模型已下载

### BgeEmbeddingService

**文件**：`Services/BgeEmbeddingService.cs`

BGE 嵌入服务（本地 ONNX 推理）：
- 使用 BGE 中文嵌入模型
- 向量维度：通常 512 或 768（取决于模型）
- 首次使用自动下载模型

---

## 其他服务

### SafeQueryValidator

**文件**：`Services/SafeQueryValidator.cs`

受限只读查询验证器：
- `ValidateAndRewrite(sql, uid, scope)` → 验证 SQL 安全性 + 改写（注入数据范围过滤 + LIMIT）
- `DryRun(db, rewrittenSql, params)` → dry-run 预检
- `LogAudit(db, uid, sql, rewrittenSql, success, error)` → 审计日志

### ReportGenerationService

AI 报告生成服务：
- `GenerateReportAsync(db, request, uid, isAdmin)` → 生成日/周/月报

### WritingSkillService

写作中心服务：
- `GetDocTypes()` → 文体列表
- `GetStyles()` → 风格列表
- `TryGetDocType(code, out type)` → 查文体
- `TryGetStyle(id, out style)` → 查风格
- `StreamDraftAsync(dto)` → SSE 流式起草
- `AssistAsync(dto)` → 行内改写
- `StripProtectedMarkers(text)` → 去除保护标记

### UpdateService

更新管理服务：
- `CheckAsync(ct)` → 检查更新
- `StartDownload(package, id)` → 启动下载（并发闸）
- `CancelDownload(id)` → 取消下载
- `GetProgress(id)` → 获取进度
- `ApplyAndExit(path)` → 装包 + 重启

---

*文档结束。*
