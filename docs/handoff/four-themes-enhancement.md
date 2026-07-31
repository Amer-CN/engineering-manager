# 四主题完善 · 交接文档

> 生成时间：2026-08-01 00:40（最终更新）· 分支：`feat/folderstack3d-react` · Spec：`工程管家四主题完善_90e01256.md`

---

## 一、总体目标

把 4 个已有但不完善的功能做扎实（不堆新轮子）：
1. **AI 助手会话管理** — 归档/删除/恢复/历史可发现性
2. **知识库业务实体关联** — 合同/供应商/发票/结算/工资等进知识库
3. **成本台账真 Excel** — 嵌入 Univer 电子表格库
4. **富文本 + AI 一键生成日/周/月报** — 基于 audit_logs 操作留痕

四主题相互**无硬依赖**，可并行实现。Spec 文件路径：
```
C:\Users\Admin\AppData\Roaming\Qoder\SharedClientCache\cache\plans\工程管家四主题完善_90e01256.md
```

---

## 二、当前进度

### 主题 1：AI 助手会话管理 — ✅ 实现完成 + 门禁修复完成

**根因结论**（经 Phase 2 复核确认）：
- "聊完没保存" = **纯 UI 可发现性问题**，数据本就正确落库
- 后端建会话/存消息/列表/详情/删除/重命名端点齐全
- 前端 `conversationId` 回传与复用正确
- 历史侧栏被 `hidden lg:block` 限制 → 窄窗口看不到

**已完成的改动**（uncommitted，未 push）：

| 文件 | 类型 | 改动 |
|------|------|------|
| `Migrations/Scripts/032_AddAgentConversationArchive.sql` | 新增 | `archived_at TEXT` 列 + 复合索引 |
| `Services/AgentConversationService.cs` | 改动 | 列表返回 archivedAt；新增 GetDeletedConversationsAsync / ArchiveConversationAsync / UnarchiveConversationAsync / RestoreConversationAsync |
| `Endpoints/AgentEndpoints.cs` | 改动 | GET 列表支持 `?scope=deleted`；新增 3 个 PATCH 端点 (archive/unarchive/restore) |
| `src/services/api-client.ts` | 改动 | 新增 `patch<T>()` 方法 |
| `src/services/agent-client.ts` | 改动 | 新增 archive/unarchive/restore/getDeleted 函数 |
| `src/types/agent.ts` | 改动 | AgentConversation 增 `archivedAt?` / `deletedAt?` |
| `src/components/features/agent/AgentDashboard.tsx` | 改动 | 工具栏新增"新对话"按钮+"历史"按钮补文字；**已拆出 AgentTopBar.tsx (63行)** → 现 374 行 |
| `src/components/features/agent/AgentOverlays.tsx` | 改动 | 抽屉遮罩去掉 `lg:hidden` |
| `src/components/features/agent/ConversationHistory.tsx` | 改动 | 进行中/已归档分组、已归档与最近删除折叠区；**已拆出 ConversationHistoryItem.tsx (154行)** → 现 371 行 |
| `src/components/features/agent/ConversationHistoryItem.tsx` | 新增 | 单条会话卡片渲染（active/archived/deleted 三变体） |
| `src/components/features/agent/AgentTopBar.tsx` | 新增 | 对话态顶部工具栏 |

**代码评审结论**（三维独立评审）：
- **正确性 (Ryan)**：无 Blocker/Major — 鉴权、SQL 参数化、越权防护、归档/删除语义分离、迁移幂等、乐观更新回滚均正确
- **影响面 (Daniel)**：无回归风险 — 新端点/字段/索引均为纯新增、向后兼容，桌面/移动布局无冲突
- **完整性 (Mark)**：返回为空（被取消），后续复审时可补

**门禁自检**（Lee 执行）：
- `tsc --noEmit` ✅ · `dotnet build` ✅ (0 err) · `dotnet test` ✅ (657 pass / 0 fail)
- `npm run check` — 文件行数超限已修复（371/374 行，< 400 限制）
- `npm run check:version` ✅ · `npx vite build` ✅

**待完成**：
- 独立验证门禁（Verify agent 未重跑）
- 浏览器 E2E 会话生命周期验证（Task #6）
- commit + push

---

### 主题 2：知识库业务实体关联 — ✅ 实现完成

**已完成的改动**（uncommitted）：
- `Migrations/Scripts/033_AddKnowledgeEntitySeeds.sql` — 幂等迁移脚本
- `Services/KnowledgeEntityService.cs`（~560 行）— SeedEntitiesAsync / UpsertEntityAsync / GetEntityContextAsync
- `KnowledgeBaseService.cs` — SearchAsync 增 entityType/entityId 偏置
- `KnowledgeEndpoints.cs` — 新增 GET entity-context + POST seed-entities
- 6 处业务端点 fire-and-forget upsert（ContractEndpoints 6 处 / InvoiceEndpoints 2 处 / WageEndpoints 2 处 / PartnerEndpoints 2 处）
- Program.cs 无需改动（沿用直接实例化模式）

---

### 主题 3：成本台账 Univer — ✅ 实现完成

**已完成的改动**（uncommitted）：
- `package.json` — 新增 5 个 @univerjs/* 包（v0.25.1，Apache-2.0）
- `vite.config.ts` — manualChunks 增 vendor-univer 分包
- `src/components/features/costLedger/CostLedgerSpreadsheet.tsx`（389 行）— Shadow DOM 挂载 + React.lazy
- `CostLedgerProjectDetail.tsx` — 工具栏增"电子表格"按钮 + Suspense
- `CostLedgerEndpoints.cs` — GET/POST /api/cost-ledger/{batchId}/sheet
- `Common.cs` — 新增 CostLedgerSheetEntry + CostLedgerSheetDto record
- Program.cs 无变更（已在 RegisterCostLedgerEndpoints 中）
- **门禁期间修复**：createUnit 参数修正、exportCostLedgerList 补参数、Icon style prop 修复

---

### 主题 4：富文本 + AI 汇报 — ✅ 实现完成

**已完成的改动**（uncommitted）：
- `templateMarkup.ts` — 扩展有序/无序列表解析 + 测试（14 用例）
- `Services/ReportGenerationService.cs` — audit_logs 聚合 + KPI + LLM 生成 Markdown（30s 超时）
- `Endpoints/ReportEndpoints.cs` — POST /api/reports/generate（reports:create 鉴权）
- `Program.cs` — RegisterReportEndpoints + ReportGenerationService 注册
- `src/components/features/reports/ReportsIndex.tsx` + `ReportGeneratorModal.tsx` + `ReportResultPanel.tsx`（拆分后 338+188 行）
- `src/services/report-client.ts` — generateReport 客户端
- `src/constants/routes.ts` — 新增 reports 路由
- `src/constants/permissions.ts` + `Common.cs` — reports:create/read 权限
- `App.tsx` — lazy import + case 'reports'
- **门禁期间修复**：ButtonLoader 缺 prop、ReportGeneratorModal 超限拆分、AccountSection useState 超限拆分

---

## 三、文件域隔离表（防并行冲突）

| 主题 | 独占文件域 | 共享（只读） |
|------|-----------|-------------|
| 1 | `src/components/features/agent/*` | api-client.ts, agent-client.ts, types/agent.ts |
| 2 | `EngineeringManager.Api/Services/KnowledgeBase*.cs`、`Endpoints/Knowledge*.cs`、`Migrations/033*` | Program.cs (仅追加注册) |
| 3 | `src/components/features/costLedger/*`、`Endpoints/CostLedger*.cs`、`package.json`、`vite.config.ts`、`tailwind.config.js` | Program.cs (仅追加注册) |
| 4 | `src/components/features/reports/*`、`Services/Report*.cs`、`Endpoints/Report*.cs`、`src/utils/templateMarkup.ts`、`App.tsx`、路由常量、权限定义 | Program.cs (仅追加注册) |

**冲突点**：`Program.cs` 被主题 2/3/4 共享（各自追加端点注册）。若并行写入产生冲突，需手动合并。

---

## 四、调研阶段关键结论（新窗口无需重跑调研）

### 架构现状
- **代码树**：`_wt-expenses` worktree 已删除，仅主树 `e:\测试`（`feat/folderstack3d-react`，领先 master 17 commits）
- **迁移脚本**：001–031 已存在，032 新增（主题1），033 待增（主题2）
- **AI 助手**：后端完整（agent_conversations/messages 表 + AgentConversationService + AgentEndpoints），前端接线完整但 UI 可发现性差
- **知识库**：后端 FTS5 + 本地 BGE 向量(512维) + RRF 融合 + 权限隔离已完整，数据源=STT/上传/手工
- **成本台账**：经典表(HTML table) + 新 Grid(@tanstack/react-table Beta)，无电子表格库
- **审计日志**：audit_logs 表 + 前端埋点覆盖 CRUD/import/export/login/approve/lock/unlock
- **富文本**：仅 templateMarkup.ts 轻量子集（加粗/斜体/标题/变量，无列表/表格）

### 门禁/兼容性
- `scripts/check-rules.cjs` 只扫 `src/**` 源码（不扫 node_modules CSS）
- Univer/Luckysheet **不会触发 check-rules HARD FAIL**
- WebView2 (Chromium 120+) 兼容 Univer (Canvas/WebGL)
- 打包体积 +~1MB 可接受

### 被否决的方案
- 从零重建 AI 会话持久化（已有，问题是 UI）
- 立即拆知识库前端（用户说先不拆）
- sqlite-vec / faiss / Milvus（现有规模够用）
- 物化视图 / CRDT / 微服务（过度设计）
- Luckysheet（社区放缓，Univer 更契合）
- 立即引 Slate/Lexical（先扩展 templateMarkup 支持列表）
- operations_log 业务事件埋点作为汇报前置（audit_logs 够 MVP）

---

## 五、统一门禁验证结果（2026-08-01 00:40）

| # | 命令 | 结论 | 摘要 |
|---|------|------|------|
| 1 | `npx tsc --noEmit` | ✅ PASS | 修复 4 个 TS 错误后通过 |
| 2 | `npm run check` | ✅ PASS | 修复 2 个超限后 0 违规 |
| 3 | `npm run check:version` | ✅ PASS | 全部 0.90.1 |
| 4 | `npx vite build` | ✅ PASS | vendor-univer 8.6MB 独立 chunk |
| 5 | `dotnet build` | ✅ PASS | 0 错误 0 警告 |
| 6 | `dotnet test` | ❌ FAIL | 26 失败 / 631 通过 / 2 跳过 |

### dotnet test 26 失败详情

**A. 24 个 pre-existing（非本次引入）**：
- `ApiConfig._cachedEdition` 是 static 字段，xUnit 并行时竞态缓存 "personal" 导致测试间互相干扰
- 影响：UserDimFilterTests(4)、UserDimPhase2Tests(9)、M4ThirdRoundTests(3+)、M4SttUploadAndIngestTests 等
- **修复建议**：在 `ApiTestBase` 构造器中 `_cachedEdition = null` 重置

**B. 2 个本次引入**：
- `AgentKnowledgeToolTests.cs` L649/L664 — `BuildSystemPrompt()` 签名从 `()` 改为 `(HttpContext ctx, IDbConnection db)`，但测试反射调用仍用 `Invoke(null, null)`
- **修复**：测试传入 HttpContext + IDbConnection 参数

## 六、后续步骤（新窗口接手）

### 立即修复（~30 分钟）
1. 修复 `AgentKnowledgeToolTests` 的 2 个反射测试
2. 修复 `ApiConfig._cachedEdition` 测试隔离（可选，pre-existing）
3. 重跑 `dotnet test` 确认全绿

### 收尾
4. 三维代码评审（完整性/正确性/影响面）
5. 浏览器 E2E 验证（主题 1 会话全流程 + 主题 3 Univer 表格）
6. commit（conventional commits，feat→minor bump）+ push + 停下等审

---

## 七、关键文件路径速查

```
Spec 文件: C:\Users\Admin\AppData\Roaming\Qoder\SharedClientCache\cache\plans\工程管家四主题完善_90e01256.md

后端核心（全部已实现）:
  EngineeringManager.Api/Services/AgentConversationService.cs    (主题1)
  EngineeringManager.Api/Endpoints/AgentEndpoints.cs             (主题1)
  EngineeringManager.Api/Migrations/Scripts/032_*.sql            (主题1)
  EngineeringManager.Api/Services/KnowledgeEntityService.cs      (主题2-新建)
  EngineeringManager.Api/Services/KnowledgeBaseService.cs        (主题2-增强)
  EngineeringManager.Api/Migrations/Scripts/033_*.sql            (主题2)
  EngineeringManager.Api/Endpoints/CostLedgerEndpoints.cs        (主题3)
  EngineeringManager.Api/Services/ReportGenerationService.cs     (主题4-新建)
  EngineeringManager.Api/Endpoints/ReportEndpoints.cs            (主题4-新建)
  EngineeringManager.Api/Common.cs                               (共享-已无冲突)
  EngineeringManager.Api/Program.cs                              (共享-已无冲突)

前端核心（全部已实现）:
  src/components/features/agent/*                                (主题1)
  src/components/features/costLedger/CostLedgerSpreadsheet.tsx   (主题3-新建)
  src/components/features/reports/*                              (主题4-新建)
  src/utils/templateMarkup.ts                                    (主题4-增强)
  src/services/report-client.ts                                  (主题4-新建)
  src/services/agent-client.ts                                   (主题1)

构建配置:
  package.json           (主题3-增 Univer)
  vite.config.ts         (主题3-增 vendor-univer)

待修复测试:
  EngineeringManager.Tests/Endpoints/AgentKnowledgeToolTests.cs  (L649/L664 反射调用需更新)
```
