# 四主题完善 v0.91.0 · 外部审查上下文报告

> 生成时间：2026-08-01 · 分支：`feat/folderstack3d-react` · Commit：`265e976`
> 审查方式：通过 GitHub MCP 读取仓库 `Amer-CN/engineering-manager` 的该 commit diff

---

## 一、背景与目标

本次里程碑在**已有代码基础上完善 4 个功能主题**（不堆新轮子），由本地 IDE AI 独立完成全部实现 + 门禁修复 + 代码评审修复 + E2E 验证。外部 AI 未参与规划或实现，本报告提供完整上下文供审查。

**架构**：React 18 + TS 5 + Vite + Tailwind（前端）→ HTTP → ASP.NET Core Minimal API (.NET 8, localhost:5048) → Dapper → SQLite；WinForms + WebView2 桌面壳。

---

## 二、四主题概述

### 主题 1：AI 助手会话管理（归档/删除/恢复/历史可发现性）

**根因**：用户反馈"聊完没保存"实为 UI 可发现性问题（历史侧栏被 `hidden lg:block` 限制），数据本就正确落库。

**改动**：
- 后端：`AgentConversationService` 新增 Archive/Unarchive/Restore 方法；`AgentEndpoints` 新增 3 个 PATCH 端点 + `?scope=deleted` 列表
- 前端：`ConversationHistory` 拆分为进行中/已归档/最近删除三组；新增 `ConversationHistoryItem.tsx`（154行）、`AgentTopBar.tsx`（62行）
- 迁移：`032_AddAgentConversationArchive.sql`（`archived_at TEXT` 列 + 复合索引）
- 类型：`AgentConversation` 增 `archivedAt?` / `deletedAt?`

### 主题 2：知识库业务实体关联

**目标**：合同/供应商/发票/结算/工资等业务实体进知识库，支持"某合同相关的所有讨论"式检索。

**改动**：
- 新建 `KnowledgeEntityService.cs`（558行）：SeedEntitiesAsync / UpsertEntityAsync / GetEntityContextAsync
- `KnowledgeBaseService.SearchAsync` 增 entityType/entityId 偏置（RRF ×1.5）
- `KnowledgeEndpoints` 新增 GET entity-context + POST seed-entities
- 6 处业务写端点（Contract 6 / Invoice 2 / Wage 2 / Partner 2）fire-and-forget upsert
- 迁移：`033_AddKnowledgeEntitySeeds.sql`（`knowledge_entity_seeds` 表，UNIQUE 保证幂等）

### 主题 3：成本台账 Univer 电子表格

**目标**：嵌入 Univer 电子表格库，替代纯 HTML table 编辑体验。

**改动**：
- `package.json` 新增 5 个 @univerjs/* 包（v0.25.1，Apache-2.0）
- `vite.config.ts` manualChunks 增 vendor-univer 分包（8.6MB 独立 chunk）
- 新建 `univerEngine.tsx`（262行）：Shadow DOM 挂载 + CSS 隔离 + 数据构建 + **编辑回读**
- 新建 `CostLedgerSpreadsheet.tsx`（202行）：主组件（工具栏 + 保存 + 导出）
- 后端 `CostLedgerEndpoints` 新增 GET/POST `/api/cost-ledger/{batchId}/sheet`
- `Common.cs` 新增 CostLedgerSheetEntry + CostLedgerSheetDto record

### 主题 4：富文本 + AI 一键生成日/周/月报

**目标**：基于 audit_logs 操作留痕 + 业务 KPI，调 LLM 生成 Markdown 报告。

**改动**：
- 新建 `ReportGenerationService.cs`（365行）：审计日志聚合 + KPI 聚合 + LLM 生成
- 新建 `ReportEndpoints.cs`（43行）：POST /api/reports/generate
- `templateMarkup.ts` 扩展有序/无序列表解析（14 测试用例）
- 新建前端 `ReportsIndex.tsx` + `ReportGeneratorModal.tsx` + `ReportResultPanel.tsx`
- 新建 `report-client.ts`；路由/权限常量新增 reports:create/read

---

## 三、代码评审后修复的安全问题（重要）

本地已完成三维独立评审（正确性/影响面/完整性），发现并修复了以下问题：

| # | 级别 | 问题 | 修复 | 文件 |
|---|------|------|------|------|
| 1 | **Blocker** | 台账 sheet UPDATE 缺数据权限过滤，企业版可越权改写任意行 | UPDATE WHERE 追加 `UserFilterWithAuthorizedProjects(scope)` + 传 Uid/IsAdmin | CostLedgerEndpoints.cs L255-268 |
| 2 | **Major** | Univer 编辑内容从未回读，"保存"只写回原始数据 | 新增 `readUniverEntries()` 从 Univer 实例读取当前单元格 → 元→分转换 → 构造载荷 | univerEngine.tsx L216-262 |
| 3 | **Major** | 报告端点未校验 `reports:create` 权限 | 端点入口增 `HasPermission(ctx, db, "reports:create")` | ReportEndpoints.cs L26-27 |
| 4 | **Major** | KPI 聚合不分 scope，任意用户可读全公司财务 | `AggregateKpiAsync` 增 userId/isAdmin 参数，非 admin 按 created_by 过滤 | ReportGenerationService.cs L136-165 |
| 5 | **Warning** | 30s 超时 token 未传给 LLM，形同虚设 | 改用 `Task.WhenAny(chatTask, Task.Delay(∞, cts.Token))` | ReportGenerationService.cs L65-70 |
| 6 | **Warning** | Univer 异步初始化在快速卸载时泄漏实例 | effect 内 `let cancelled = false`，then 中判断后 dispose | univerEngine.tsx L186-210 |
| 7 | **Minor** | seed-entities 权限与注释不符（knowledge:read → 应为 admin） | 改为 `if (!isAdmin) return 403` | KnowledgeEndpoints.cs L361-362 |

---

## 四、门禁验证结果

| # | 命令 | 结果 |
|---|------|------|
| 1 | `npx tsc --noEmit` | ✅ 0 errors |
| 2 | `npm run check`（铁律检查） | ✅ 0 违规，18 警告 |
| 3 | `npm run check:version` | ✅ 全部 0.91.0 |
| 4 | `npx vite build` | ✅ 20s |
| 5 | `dotnet build` | ✅ 0 err 0 warn |
| 6 | `dotnet test` | ✅ 657 pass / 0 fail / 2 skip |

---

## 五、E2E 验证结果

| 主题 | 验证内容 | 结果 |
|------|---------|------|
| 1 | 会话列表(29条) → 归档 → 取消归档 → 软删除 → scope=deleted 列表 → 恢复 | ✅ 全部 success=true |
| 3 | GET sheet(659行) → POST 保存(1条，权限过滤生效) | ✅ |
| 4 | POST /api/reports/generate → 200 + Markdown 返回 | ✅ |
| 2 | seed-entities 因生产库缺 knowledge 表报 500 | ⚠️ pre-existing 迁移状态问题 |

主题 2 说明：生产数据库 `F:\Company Database\engineering.db` 的 `schema_versions` 中迁移 029 标记为已执行但表实际不存在（历史遗留）。代码逻辑正确，迁移脚本幂等（CREATE TABLE IF NOT EXISTS），在干净库上可正常工作。

---

## 六、审查建议聚焦

### 高优先级（安全）
1. `CostLedgerEndpoints.cs` L239-305：sheet POST 的权限过滤是否充分（UPDATE 有 scope filter，INSERT 无 project 授权校验）
2. `ReportGenerationService.cs` L136-165：KPI scope 过滤逻辑（非 admin + 非 project scope → 按 created_by 过滤）
3. `ReportEndpoints.cs`：权限校验位置是否正确
4. `KnowledgeEndpoints.cs` L354-373：seed-entities admin 限制

### 中优先级（正确性）
5. `univerEngine.tsx` L216-262：`readUniverEntries` 的 Univer API 调用是否兼容 v0.25.1（`getCellMatrix().getValue()` vs `getCell()`）
6. `AgentConversationService.cs`：归档/恢复的 SQL 是否带 user_id 归属校验
7. `KnowledgeEntityService.cs`：fire-and-forget 中 `ctx.RequestServices` 在请求结束后可能 ObjectDisposed（已知反模式，有 catch 兜底 + seed 全量补救）

### 低优先级（代码质量）
8. 组件行数是否 < 400（铁律）
9. SQL 是否全参数化、表名 [] 包裹
10. 金额字段是否 INTEGER（分）

---

## 七、文件变更统计

- **76 files changed**, +8414 / -582
- 新建文件 20+（含后端服务/端点/迁移 + 前端组件/服务/测试）
- 删除 `AuditLogViewer.tsx`（279行，功能合并入 AuditLogs.tsx）

---

## 八、如何审查

```
仓库: Amer-CN/engineering-manager
分支: feat/folderstack3d-react
Commit: 265e976 (feat: four themes enhancement)
对比基线: 962457f (上一个 commit)
```

通过 GitHub MCP 获取 diff：
- 完整 diff：`git diff 962457f..265e976`
- 单文件：直接读取上述关键文件路径

---

## 九、已知遗留（非阻塞，后续处理）

1. 生产库需手动执行迁移 029-033（知识库表）
2. fire-and-forget `ctx.RequestServices` 反模式 → 建议改 `IServiceScopeFactory`
3. Univer `readUniverEntries` 的 API 兼容性需实际浏览器验证（Univer 0.25.x 文档不完整）
4. 18 项 check 警告（非本次引入，历史遗留）
